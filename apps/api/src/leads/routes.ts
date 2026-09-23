import { createHmac, timingSafeEqual } from 'node:crypto'

import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import type { FastifyInstance, FastifyRequest } from 'fastify'

import type { AppConfig } from '../config.js'
import type { Database } from '../db/client.js'
import { UnauthorizedError } from '../errors.js'
import { extractMetaLeads } from './meta-payload.js'
import {
  ErrorSchema,
  LeadSchema,
  MetaWebhookBodySchema,
} from './schemas.js'
import { LeadService } from './service.js'

function verifyMetaSignature(
  request: FastifyRequest,
  appSecret?: string,
): void {
  if (!appSecret) return

  const received = request.headers['x-hub-signature-256']
  if (typeof received !== 'string' || !request.rawBody) {
    throw new UnauthorizedError(
      'A valid X-Hub-Signature-256 header is required',
    )
  }

  const expected = `sha256=${createHmac('sha256', appSecret)
    .update(request.rawBody)
    .digest('hex')}`
  const receivedBuffer = Buffer.from(received)
  const expectedBuffer = Buffer.from(expected)

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    throw new UnauthorizedError('The Meta webhook signature is invalid')
  }
}

export function registerLeadRoutes(
  app: FastifyInstance,
  database: Database,
  config: AppConfig,
): void {
  const server = app.withTypeProvider<TypeBoxTypeProvider>()
  const service = new LeadService(database)

  server.get(
    '/webhook/meta-lead',
    {
      schema: {
        querystring: Type.Object({
          'hub.challenge': Type.String(),
          'hub.mode': Type.String(),
          'hub.verify_token': Type.String(),
        }),
        response: {
          200: Type.String(),
          403: ErrorSchema,
          503: ErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const query = request.query

      if (!config.metaVerifyToken) {
        return reply.status(503).send({
          error: {
            code: 'WEBHOOK_NOT_CONFIGURED',
            message: 'META_VERIFY_TOKEN is not configured',
          },
        })
      }

      if (
        query['hub.mode'] !== 'subscribe' ||
        query['hub.verify_token'] !== config.metaVerifyToken
      ) {
        return reply.status(403).send({
          error: {
            code: 'INVALID_VERIFY_TOKEN',
            message: 'The Meta webhook verification token is invalid',
          },
        })
      }

      return reply.type('text/plain').send(query['hub.challenge'])
    },
  )

  server.post(
    '/webhook/meta-lead',
    {
      schema: {
        body: MetaWebhookBodySchema,
        response: {
          200: Type.Object({
            data: Type.Array(
              Type.Object({
                action: Type.Union([
                  Type.Literal('created'),
                  Type.Literal('updated'),
                  Type.Literal('unchanged'),
                ]),
                lead: LeadSchema,
              }),
            ),
            received: Type.Integer(),
          }),
          400: ErrorSchema,
          401: ErrorSchema,
        },
      },
    },
    async (request) => {
      verifyMetaSignature(request, config.metaAppSecret)
      const incoming = extractMetaLeads(request.body)
      const data = await service.ingestMetaLeads(incoming)

      return { data, received: data.length }
    },
  )
}
