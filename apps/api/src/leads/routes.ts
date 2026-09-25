import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import type { FastifyInstance } from 'fastify'

import type { AppConfig } from '../config.js'
import type { Database } from '../db/client.js'
import { HttpError } from '../errors.js'
import { extractMetaLeads } from './meta-payload.js'
import {
  ActivitySchema,
  ErrorSchema,
  LeadSchema,
  LeadStatusSchema,
  MetaWebhookBodySchema,
} from './schemas.js'
import { LeadService } from './service.js'
import { verifyWebhookSignature } from './webhook-signature.js'

const IdParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
})

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
          'hub.mode': Type.String(),
          'hub.verify_token': Type.String(),
          'hub.challenge': Type.String(),
        }),
      },
    },
    async (request, reply) => {
      if (
        !config.metaVerifyToken ||
        request.query['hub.mode'] !== 'subscribe' ||
        request.query['hub.verify_token'] !== config.metaVerifyToken
      ) {
        throw new HttpError(
          403,
          'INVALID_VERIFICATION_TOKEN',
          'Webhook verification failed',
        )
      }

      return reply.type('text/plain').send(request.query['hub.challenge'])
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
      verifyWebhookSignature(
        request.rawBody,
        request.headers['x-hub-signature-256'],
        config.webhookSigningSecret,
      )
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
          campaign: Type.Optional(
            Type.Union([
              Type.String({ minLength: 1 }),
              Type.Array(Type.String({ minLength: 1 })),
            ]),
          ),
          search: Type.Optional(Type.String({ minLength: 1 })),
          sortBy: Type.Optional(
            Type.Union([
              Type.Literal('createdAt'),
              Type.Literal('fullName'),
              Type.Literal('campaignName'),
              Type.Literal('status'),
            ]),
          ),
          sortDirection: Type.Optional(
            Type.Union([Type.Literal('asc'), Type.Literal('desc')]),
          ),
          status: Type.Optional(
            Type.Union([LeadStatusSchema, Type.Array(LeadStatusSchema)]),
          ),
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
        campaign: request.query.campaign
          ? Array.isArray(request.query.campaign)
            ? request.query.campaign
            : [request.query.campaign]
          : undefined,
        search: request.query.search,
        sortBy: request.query.sortBy ?? 'createdAt',
        sortDirection: request.query.sortDirection ?? 'desc',
        status: request.query.status
          ? Array.isArray(request.query.status)
            ? request.query.status
            : [request.query.status]
          : undefined,
      })
    },
  )

  server.get(
    '/leads/campaigns',
    {
      schema: {
        response: { 200: Type.Array(Type.String()) },
      },
    },
    async () => service.listCampaigns(),
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
