import { afterEach, describe, expect, it, vi } from 'vitest'

import { getLeads, sendSampleWebhook } from './api'

afterEach(() => vi.unstubAllGlobals())

describe('lead table requests', () => {
  it('sends filters, sorting, and pagination to the server', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [],
          pagination: {
            page: 2,
            limit: 50,
            total: 0,
            totalPages: 0,
          },
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await getLeads({
      page: 2,
      limit: 50,
      campaign: ['Autumn', 'Product updates'],
      search: 'Avery',
      sortBy: 'fullName',
      sortDirection: 'asc',
      status: ['qualified', 'contacted'],
    })

    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost')
    expect(url.pathname).toBe('/api/leads')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      page: '2',
      limit: '50',
      search: 'Avery',
      sortBy: 'fullName',
      sortDirection: 'asc',
    })
    expect(url.searchParams.getAll('campaign')).toEqual([
      'Autumn',
      'Product updates',
    ])
    expect(url.searchParams.getAll('status')).toEqual([
      'qualified',
      'contacted',
    ])
  })
})

describe('webhook demo request', () => {
  it('sends JSON to the demo endpoint', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ lead: {}, deliveries: [] }), {
          status: 200,
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await sendSampleWebhook()

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/demo/webhook')
    expect(options.method).toBe('POST')
    expect(options.body).toBe('{}')
    expect(new Headers(options.headers).get('Content-Type')).toBe(
      'application/json',
    )
  })
})
