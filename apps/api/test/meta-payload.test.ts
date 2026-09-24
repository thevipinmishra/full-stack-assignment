import { describe, expect, it } from 'vitest'

import { extractMetaLeads } from '../src/leads/meta-payload.js'

describe('webhook payloads', () => {
  it('extracts identifiers from a page notification', () => {
    const leads = extractMetaLeads({
      object: 'page',
      entry: [
        {
          id: 'page-1',
          changes: [
            {
              field: 'leadgen',
              value: {
                leadgen_id: 'lead-1',
                form_id: 'form-1',
                created_time: 1_700_000_000,
              },
            },
          ],
        },
      ],
    })

    expect(leads).toHaveLength(1)
    expect(leads[0]).toMatchObject({
      metaLeadId: 'lead-1',
      pageId: 'page-1',
      formId: 'form-1',
    })
    expect(leads[0].sourceCreatedAt?.toISOString()).toBe(
      '2023-11-14T22:13:20.000Z',
    )
    expect(leads[0].email).toBeUndefined()
  })

  it('extracts synthetic contact enrichment', () => {
    const [lead] = extractMetaLeads({
      leadgen_id: 'lead-1',
      field_data: [
        { name: 'first_name', values: ['Avery'] },
        { name: 'last_name', values: ['Stone'] },
        { name: 'email', values: ['avery@example.com'] },
      ],
    })
    expect(lead.fullName).toBe('Avery Stone')
    expect(lead.email).toBe('avery@example.com')
  })

  it('rejects page notifications without lead changes', () => {
    expect(() =>
      extractMetaLeads({ object: 'page', entry: [{ changes: [] }] }),
    ).toThrow('contains no leadgen changes')
  })
})
