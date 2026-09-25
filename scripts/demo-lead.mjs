import assert from 'node:assert/strict'
import { createHmac, randomInt, randomUUID } from 'node:crypto'

const baseUrl = (process.argv[2] ?? 'http://localhost:3001').replace(/\/$/, '')
const hostname = new URL(baseUrl).hostname
const secret =
  process.env.WEBHOOK_SIGNING_SECRET ??
  (hostname === 'localhost' || hostname === '127.0.0.1'
    ? 'local-demo-secret'
    : undefined)
if (!secret)
  throw new Error('Set WEBHOOK_SIGNING_SECRET to run against a public API')
const metaLeadId = `demo-${randomUUID()}`
const createdTime = Math.floor(Date.now() / 1_000) - randomInt(86_400)
const firstNames = ['Avery', 'Casey', 'Jordan', 'Taylor', 'Morgan', 'Riley']
const lastNames = ['Stone', 'Rivera', 'Lee', 'Patel', 'Bennett', 'Chen']
const campaigns = [
  'Autumn outreach',
  'Product updates',
  'Partner referrals',
  'Event follow-up',
]
const adNames = [
  'Welcome offer',
  'Product guide',
  'Event invite',
  'Consultation',
]
const fullName = `${firstNames[randomInt(firstNames.length)]} ${lastNames[randomInt(lastNames.length)]}`
const campaignIndex = randomInt(campaigns.length)
const pageId = `demo-page-${randomUUID()}`
const formId = `demo-form-${randomUUID()}`
const adId = `demo-ad-${randomUUID()}`

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    signal: AbortSignal.timeout(15_000),
  })
  const body = await response.json()

  if (!response.ok) {
    throw new Error(
      `${options.method ?? 'GET'} ${path}: ${response.status} ${JSON.stringify(body)}`,
    )
  }

  return body
}

async function postWebhook(payload) {
  const body = JSON.stringify(payload)
  const headers = { 'content-type': 'application/json' }

  headers['x-hub-signature-256'] =
    `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`

  return request('/webhook/meta-lead', {
    method: 'POST',
    headers,
    body,
  })
}

const notification = {
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
            created_time: createdTime,
          },
        },
      ],
    },
  ],
}

const enriched = {
  leadgen_id: metaLeadId,
  campaign_id: `demo-campaign-${campaignIndex + 1}`,
  campaign_name: campaigns[campaignIndex],
  ad_id: adId,
  ad_name: adNames[randomInt(adNames.length)],
  form_id: formId,
  page_id: pageId,
  created_time: createdTime,
  field_data: [
    { name: 'full_name', values: [fullName] },
    { name: 'email', values: [`sample.${randomUUID()}@example.com`] },
    {
      name: 'phone_number',
      values: [`+120255501${String(randomInt(100)).padStart(2, '0')}`],
    },
  ],
}

const created = await postWebhook(notification)
assert.equal(created.data[0]?.action, 'created')

const updated = await postWebhook(enriched)
assert.equal(updated.data[0]?.action, 'updated')

const retry = await postWebhook(enriched)
assert.equal(retry.data[0]?.action, 'unchanged')

const leadId = created.data[0].lead.id
const status = await request(`/leads/${leadId}/status`, {
  method: 'PATCH',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ status: 'contacted' }),
})
assert.equal(status.changed, true)

const detail = await request(`/leads/${leadId}`)
assert.equal(detail.lead.metaLeadId, metaLeadId)
assert.equal(detail.lead.fullName, fullName)
assert.equal(detail.lead.campaignName, campaigns[campaignIndex])
assert.deepEqual(detail.activities.map((activity) => activity.type).sort(), [
  'lead_created',
  'lead_updated',
  'status_changed',
])

console.log(`Demo lead: ${metaLeadId}`)
console.log(`Lead ID: ${leadId}`)
console.log(
  `Verified: create, enrich, idempotent retry, status change, and three activity records`,
)
