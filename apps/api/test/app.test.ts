import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildApp } from '../src/app.js'
import { loadConfig } from '../src/config.js'
import { LeadService } from '../src/leads/service.js'
import { verifyWebhookSignature } from '../src/leads/webhook-signature.js'

describe('webhook security', () => {
  let app: ReturnType<typeof buildApp>

  beforeEach(() => {
    app = buildApp(
      {},
      {
        config: {
          databaseUrl:
            'postgres://postgres:postgres@localhost:5432/lead_intake',
          metaVerifyToken: 'test-verify-token',
          webhookSigningSecret: 'test-secret',
          port: 3001,
        },
      },
    )
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await app.close()
  })

  it('rejects unsigned webhook requests', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/webhook/meta-lead',
      payload: { leadgen_id: 'lead-1' },
    })
    expect(response.statusCode).toBe(401)
  })

  it('accepts the Meta signature header over the raw request body', async () => {
    const ingest = vi
      .spyOn(LeadService.prototype, 'ingestMetaLeads')
      .mockResolvedValue([])
    const body = '{"leadgen_id":"lead-1"}'
    const signature = `sha256=${createHmac('sha256', 'test-secret').update(body).digest('hex')}`
    const response = await app.inject({
      method: 'POST',
      url: '/webhook/meta-lead',
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': signature,
      },
      payload: body,
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ data: [], received: 0 })
    expect(ingest).toHaveBeenCalledWith([
      expect.objectContaining({ metaLeadId: 'lead-1' }),
    ])
  })

  it('answers a valid Meta subscription challenge as plain text', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/webhook/meta-lead?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=challenge-123',
    })
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('text/plain')
    expect(response.body).toBe('challenge-123')
  })

  it('rejects a subscription challenge with the wrong token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/webhook/meta-lead?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=challenge-123',
    })
    expect(response.statusCode).toBe(403)
    expect(response.json().error.code).toBe('INVALID_VERIFICATION_TOKEN')
  })

  it('rejects unknown sort fields before querying the database', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/leads?sortBy=rawPayload',
    })
    expect(response.statusCode).toBe(400)
  })

  it('accepts multiple campaign and status values', async () => {
    const listLeads = vi
      .spyOn(LeadService.prototype, 'listLeads')
      .mockResolvedValue({
        data: [],
        pagination: { limit: 20, page: 1, total: 0, totalPages: 0 },
      })
    const response = await app.inject({
      method: 'GET',
      url: '/leads?campaign=Autumn&campaign=Spring&status=new&status=qualified',
    })

    expect(response.statusCode).toBe(200)
    expect(listLeads).toHaveBeenCalledWith(
      expect.objectContaining({
        campaign: ['Autumn', 'Spring'],
        status: ['new', 'qualified'],
      }),
    )
  })

  it('lists campaign names for the filter', async () => {
    vi.spyOn(LeadService.prototype, 'listCampaigns').mockResolvedValue([
      'Autumn outreach',
      'Product updates',
    ])
    const response = await app.inject({
      method: 'GET',
      url: '/leads/campaigns',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual(['Autumn outreach', 'Product updates'])
  })

  it('accepts only a valid signature over the original bytes', () => {
    const body = Buffer.from('{"leadgen_id":"lead-1"}')
    const signature = `sha256=${createHmac('sha256', 'test-secret').update(body).digest('hex')}`
    expect(() =>
      verifyWebhookSignature(body, signature, 'test-secret'),
    ).not.toThrow()
    expect(() =>
      verifyWebhookSignature(Buffer.from('changed'), signature, 'test-secret'),
    ).toThrow()
    expect(() =>
      verifyWebhookSignature(body, undefined, 'test-secret'),
    ).toThrow()
  })

  it('requires a signing secret in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(
      'WEBHOOK_SIGNING_SECRET',
    )
  })

  it('rejects a port with trailing characters', () => {
    expect(() => loadConfig({ PORT: '3001abc' })).toThrow('PORT')
  })
})
