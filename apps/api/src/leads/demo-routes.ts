import { createHmac, randomInt, randomUUID } from 'node:crypto'

import { Type } from '@sinclair/typebox'
import type { FastifyInstance } from 'fastify'

import type { AppConfig } from '../config.js'
import { HttpError } from '../errors.js'
import { ErrorSchema, LeadSchema } from './schemas.js'
import type { IngestedLead } from './service.js'

const sampleNames = [
  'Avery',
  'Casey',
  'Jordan',
  'Taylor',
  'Morgan',
  'Riley',
  'Jamie',
  'Quinn',
]
const sampleSurnames = [
  'Stone',
  'Rivera',
  'Lee',
  'Morgan',
  'Patel',
  'Bennett',
  'Chen',
  'Davis',
]
const sampleCampaigns = [
  'Autumn outreach',
  'Product updates',
  'Partner referrals',
  'Event follow-up',
]
const sampleAds = [
  'Welcome offer',
  'Product guide',
  'Event invite',
  'Consultation',
]

function pick<T>(values: readonly T[]): T {
  return values[randomInt(values.length)]!
}

const DemoDeliverySchema = Type.Object({
  step: Type.Union([
    Type.Literal('notification'),
    Type.Literal('enrichment'),
    Type.Literal('retry'),
  ]),
  action: Type.Union([
    Type.Literal('created'),
    Type.Literal('updated'),
    Type.Literal('unchanged'),
  ]),
})

export function registerDemoRoutes(
  app: FastifyInstance,
  config: AppConfig,
): void {
  app.post(
    '/demo/webhook',
    {
      schema: {
        response: {
          200: Type.Object({
            lead: LeadSchema,
            deliveries: Type.Array(DemoDeliverySchema),
          }),
          503: ErrorSchema,
        },
      },
    },
    async () => {
      const secret = config.webhookSigningSecret
      if (!secret) {
        throw new HttpError(
          503,
          'DEMO_UNAVAILABLE',
          'Set WEBHOOK_SIGNING_SECRET to run the webhook demo',
        )
      }

      const metaLeadId = `demo-${randomUUID()}`
      const fullName = `${pick(sampleNames)} ${pick(sampleSurnames)}`
      const campaignIndex = randomInt(sampleCampaigns.length)
      const campaignName = sampleCampaigns[campaignIndex]!
      const pageId = `demo-page-${randomUUID()}`
      const formId = `demo-form-${randomUUID()}`
      const adId = `demo-ad-${randomUUID()}`
      const createdTime = Math.floor(Date.now() / 1_000) - randomInt(86_400)

      const deliver = async (payload: object): Promise<IngestedLead> => {
        const body = JSON.stringify(payload)
        const signature = createHmac('sha256', secret)
          .update(body)
          .digest('hex')
        const response = await app.inject({
          method: 'POST',
          url: '/webhook/meta-lead',
          headers: {
            'content-type': 'application/json',
            'x-hub-signature-256': `sha256=${signature}`,
          },
          payload: body,
        })

        if (response.statusCode !== 200) {
          app.log.error(
            { statusCode: response.statusCode },
            'Sample webhook delivery failed',
          )
          throw new HttpError(
            503,
            'DEMO_UNAVAILABLE',
            'The sample webhook could not be delivered',
          )
        }

        const result = response.json() as { data: IngestedLead[] }
        const delivery = result.data[0]
        if (!delivery) throw new Error('Sample webhook returned no lead')
        return delivery
      }

      const notification = await deliver({
        object: 'page',
        entry: [
          {
            id: pageId,
            changes: [
              {
                field: 'leadgen',
                value: {
                  leadgen_id: metaLeadId,
                  form_id: formId,
                  ad_id: adId,
                  ad_name: pick(sampleAds),
                  campaign_id: `demo-campaign-${campaignIndex + 1}`,
                  campaign_name: campaignName,
                  created_time: createdTime,
                  field_data: [
                    { name: 'full_name', values: [fullName] },
                    {
                      name: 'email',
                      values: [`sample.${randomUUID()}@example.com`],
                    },
                    {
                      name: 'phone_number',
                      values: [
                        `+120255501${String(randomInt(100)).padStart(2, '0')}`,
                      ],
                    },
                  ],
                },
              },
            ],
          },
        ],
      })
      if (notification.action !== 'created') {
        throw new HttpError(
          503,
          'DEMO_UNAVAILABLE',
          'The sample webhook did not complete as expected',
        )
      }

      return {
        lead: notification.lead,
        deliveries: [{ step: 'notification', action: notification.action }],
      }
    },
  )
}
