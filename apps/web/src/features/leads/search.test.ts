import { describe, expect, it } from 'vitest'

import { parseLeadSearch } from './search'

describe('lead table URL state', () => {
  it('uses safe defaults for invalid query parameters', () => {
    expect(
      parseLeadSearch({
        page: -4,
        limit: 999,
        sortBy: 'rawPayload',
        sortDirection: 'up',
      }),
    ).toEqual({
      page: 1,
      limit: 20,
      campaign: undefined,
      search: undefined,
      sortBy: 'createdAt',
      sortDirection: 'desc',
      status: undefined,
    })
  })

  it('preserves supported filters and sort settings', () => {
    expect(
      parseLeadSearch({
        page: '3',
        limit: '50',
        campaign: ['  Autumn  ', 'Product updates', 'Autumn'],
        search: '  Avery  ',
        sortBy: 'fullName',
        sortDirection: 'asc',
        status: ['qualified', 'contacted', 'invalid'],
      }),
    ).toMatchObject({
      page: 3,
      limit: 50,
      campaign: ['Autumn', 'Product updates'],
      search: 'Avery',
      sortBy: 'fullName',
      sortDirection: 'asc',
      status: ['qualified', 'contacted'],
    })
  })
})
