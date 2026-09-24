import Fastify from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'

import { registerDemoRoutes } from '../src/leads/demo-routes.js'
import { extractMetaLeads } from '../src/leads/meta-payload.js'
import { verifyWebhookSignature } from '../src/leads/webhook-signature.js'

describe('webhook demo', () => {
  const app = Fastify()

  afterEach(async () => {
    await app.close()
  })

  it('submits one signed webhook with fresh contact and campaign details', async () => {
    const received: ReturnType<typeof extractMetaLeads>[number][] = []

    app.post('/webhook/meta-lead', async (request) => {
      verifyWebhookSignature(
        Buffer.from(JSON.stringify(request.body)),
        request.headers['x-webhook-signature-256'],
        'test-secret',
      )

      const lead = extractMetaLeads(request.body)[0]
      received.push(lead)

      return {
        data: [
          {
            action: 'created',
            lead: {
              id: '7e312502-91c4-4fee-9305-8a8ce7d90e86',
              metaLeadId: lead.metaLeadId,
              fullName: lead.fullName ?? null,
              email: lead.email ?? null,
              phone: lead.phone ?? null,
              status: 'new',
              campaignId: null,
              campaignName: lead.campaignName ?? null,
              adId: null,
              adName: null,
              formId: null,
              pageId: null,
              sourceCreatedAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        ],
      }
    })
    registerDemoRoutes(app, {
      databaseUrl: '',
      port: 3001,
      webhookSigningSecret: 'test-secret',
    })

    const response = await app.inject({ method: 'POST', url: '/demo/webhook' })
    const secondResponse = await app.inject({
      method: 'POST',
      url: '/demo/webhook',
    })

    expect(response.statusCode).toBe(200)
    expect(secondResponse.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      lead: { metaLeadId: received[0]?.metaLeadId },
      deliveries: [{ step: 'notification', action: 'created' }],
    })
    expect(received).toHaveLength(2)
    expect(received[0]?.metaLeadId).toMatch(/^demo-/)
    expect(received[0]?.metaLeadId).not.toBe(received[1]?.metaLeadId)
    expect(received[0]?.email).toMatch(/^sample\..+@example\.com$/)
    expect(received[0]?.phone).toMatch(/^\+120255501\d{2}$/)
    expect(received[0]?.campaignName).toBeTruthy()
    expect(received[0]?.campaignId).toBeTruthy()
    expect(received[0]?.adId).toBeTruthy()
    expect(received[0]?.adName).toBeTruthy()
    expect(received[0]?.formId).toBeTruthy()
    expect(received[0]?.pageId).toBeTruthy()
  })
})
