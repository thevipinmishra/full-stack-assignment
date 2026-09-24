import { queryOptions } from '@tanstack/react-query'
import { getLead, getLeads } from './api'
import type { LeadSearch } from './search'

export function leadListQueryOptions(search: LeadSearch) {
  return queryOptions({
    queryKey: ['leads', search] as const,
    queryFn: () => getLeads(search),
    staleTime: 10_000,
  })
}

export function leadDetailQueryOptions(leadId: string) {
  return queryOptions({
    queryKey: ['lead', leadId] as const,
    queryFn: () => getLead(leadId),
  })
}
