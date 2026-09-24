import { leadStatuses } from './api'
import type { LeadStatus } from './api'

export type LeadSearch = {
  page: number
  limit: 10 | 20 | 50
  campaign?: string[]
  search?: string
  sortBy: 'createdAt' | 'fullName' | 'campaignName' | 'status'
  sortDirection: 'asc' | 'desc'
  status?: LeadStatus[]
}

function parseStringList(value: unknown): string[] | undefined {
  const values = (Array.isArray(value) ? value : [value])
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
  return values.length ? [...new Set(values)] : undefined
}

export function parseLeadSearch(search: Record<string, unknown>): LeadSearch {
  const page = Number(search.page)
  const limit = Number(search.limit)
  const statuses = parseStringList(search.status)?.filter(
    (value): value is LeadStatus =>
      leadStatuses.some((status) => status === value),
  )
  const sortBy = ['createdAt', 'fullName', 'campaignName', 'status'].find(
    (value) => value === search.sortBy,
  ) as LeadSearch['sortBy'] | undefined
  return {
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    limit: limit === 10 || limit === 50 ? limit : 20,
    campaign: parseStringList(search.campaign),
    search:
      typeof search.search === 'string' && search.search.trim()
        ? search.search.trim()
        : undefined,
    sortBy: sortBy ?? 'createdAt',
    sortDirection: search.sortDirection === 'asc' ? 'asc' : 'desc',
    status: statuses?.length ? statuses : undefined,
  }
}
