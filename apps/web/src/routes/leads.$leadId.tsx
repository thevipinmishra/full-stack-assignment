import { createFileRoute } from '@tanstack/react-router'
import { LeadDetailPage } from '../features/leads/lead-detail-page'
import { leadDetailQueryOptions } from '../features/leads/queries'

export const Route = createFileRoute('/leads/$leadId')({
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(
      leadDetailQueryOptions(params.leadId),
    )
  },
  component: LeadDetailPage,
})
