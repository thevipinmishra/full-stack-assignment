import { createHmac, timingSafeEqual } from 'node:crypto'

import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import type { FastifyInstance, FastifyRequest } from 'fastify'

import type { AppConfig } from '../config.js'
import type { Database } from '../db/client.js'
import { UnauthorizedError } from '../errors.js'
import { extractMetaLeads } from './meta-payload.js'
import {
  ActivitySchema,
  ErrorSchema,
  LeadSchema,
  LeadStatusSchema,
  MetaWebhookBodySchema,
} from './schemas.js'
import { LeadService } from './service.js'

const IdParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
})

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

  server.get(
    '/leads',
    {
      schema: {
        querystring: Type.Object({
          limit: Type.Optional(
            Type.Integer({ default: 20, maximum: 100, minimum: 1 }),
          ),
          page: Type.Optional(Type.Integer({ default: 1, minimum: 1 })),
          search: Type.Optional(Type.String({ minLength: 1 })),
          status: Type.Optional(LeadStatusSchema),
        }),
        response: {
          200: Type.Object({
            data: Type.Array(LeadSchema),
            pagination: Type.Object({
              limit: Type.Integer(),
              page: Type.Integer(),
              total: Type.Integer(),
              totalPages: Type.Integer(),
            }),
          }),
          400: ErrorSchema,
        },
      },
    },
    async (request) => {
      return service.listLeads({
        limit: request.query.limit ?? 20,
        page: request.query.page ?? 1,
        search: request.query.search,
        status: request.query.status,
      })
    },
  )

  server.get(
    '/leads/:id',
    {
      schema: {
        params: IdParamsSchema,
        response: {
          200: Type.Object({
            activities: Type.Array(ActivitySchema),
            lead: LeadSchema,
          }),
          400: ErrorSchema,
          404: ErrorSchema,
        },
      },
    },
    async (request) => service.getLead(request.params.id),
  )

  server.patch(
    '/leads/:id/status',
    {
      schema: {
        body: Type.Object(
          { status: LeadStatusSchema },
          { additionalProperties: false },
        ),
        params: IdParamsSchema,
        response: {
          200: Type.Object({
            changed: Type.Boolean(),
            lead: LeadSchema,
          }),
          400: ErrorSchema,
          404: ErrorSchema,
        },
      },
    },
    async (request) =>
      service.updateStatus(request.params.id, request.body.status),
  )
}
