import { createFileRoute } from '@tanstack/react-router'
import { LeadListPage } from '../features/leads/lead-list-page'
import { leadListQueryOptions } from '../features/leads/queries'
import { parseLeadSearch } from '../features/leads/search'

export const Route = createFileRoute('/')({
  validateSearch: parseLeadSearch,
  loaderDeps: ({ search: { page, limit, campaign, search, sortBy, sortDirection, status } }) => ({
    page,
    limit,
    campaign,
    search,
    sortBy,
    sortDirection,
    status,
  }),
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(leadListQueryOptions(deps))
  },
  component: LeadListPage,
})
