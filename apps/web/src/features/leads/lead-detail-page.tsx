import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@base-ui/react/button'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { ArrowLeft2 } from 'reicon-react'
import { FeedbackToast } from '../../components/feedback-toast'
import { useFeedbackToast } from '../../components/use-feedback-toast'
import { SelectField } from '../../components/select-field'
import { ActivityTimeline } from './activity-timeline'
import { leadStatuses, updateLeadStatus } from './api'
import type { LeadStatus } from './api'
import {
  formatDateTime,
  getErrorMessage,
  getLeadName,
  statusLabels,
} from './display'
import { leadDetailQueryOptions } from './queries'
import { cardClass, pageClass, secondaryButtonClass } from './ui'

const routeApi = getRouteApi('/leads/$leadId')
const statusOptions = leadStatuses.map((value) => ({
  label: statusLabels[value],
  value,
}))

function InfoField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0">
      <dt className="mb-1.5 text-xs font-bold text-[#839088]">{label}</dt>
      <dd className="min-w-0 text-sm leading-6 font-semibold text-[#34443c] wrap-anywhere">
        {children}
      </dd>
    </div>
  )
}

export function LeadDetailPage() {
  const { leadId } = routeApi.useParams()
  const queryClient = useQueryClient()
  const leadQuery = useQuery(leadDetailQueryOptions(leadId))
  const [statusDraft, setStatusDraft] = useState<LeadStatus>('new')
  const { toast, showToast, dismissToast } = useFeedbackToast()
  const statusMutation = useMutation({
    mutationFn: (status: LeadStatus) => updateLeadStatus(leadId, status),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['lead', leadId] }),
        queryClient.invalidateQueries({ queryKey: ['leads'] }),
      ])
      showToast({
        kind: 'success',
        title: result.changed ? 'Status updated' : 'Status unchanged',
      })
    },
    onError: (error) => {
      setStatusDraft(leadQuery.data?.lead.status ?? 'new')
      showToast({
        kind: 'error',
        title: 'Unable to save status',
        description: getErrorMessage(error),
      })
    },
  })

  useEffect(() => {
    if (leadQuery.data?.lead.status) setStatusDraft(leadQuery.data.lead.status)
  }, [leadQuery.data?.lead.status])

  const backLink = (
    <Link
      className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold text-[#3c6252] hover:text-[#176c5b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c5b]"
      to="/"
      search={{
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      }}
    >
      <span className="inline-flex size-8 items-center justify-center rounded-full border border-[#dce5df] bg-white">
        <ArrowLeft2 size={16} aria-hidden="true" />
      </span>
      Leads
    </Link>
  )

  if (leadQuery.isPending) {
    return (
      <div className={pageClass}>
        {backLink}
        <div
          className={`${cardClass} flex min-h-64 items-center justify-center p-8`}
          role="status"
        >
          <h1 className="text-base font-bold">Loading lead…</h1>
        </div>
      </div>
    )
  }

  if (leadQuery.isError) {
    return (
      <div className={pageClass}>
        {backLink}
        <div
          className={`${cardClass} flex min-h-64 flex-col items-center justify-center p-8 text-center`}
          role="alert"
        >
          <h1 className="text-lg font-bold">Unable to load lead</h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[#687774]">
            {getErrorMessage(leadQuery.error)}
          </p>
          <Button
            className={`${secondaryButtonClass} mt-5`}
            type="button"
            onClick={() => void leadQuery.refetch()}
          >
            Try again
          </Button>
        </div>
      </div>
    )
  }

  const { lead, activities } = leadQuery.data

  return (
    <div className={pageClass}>
      {backLink}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-[clamp(1.9rem,4vw,2.5rem)] leading-[1.12] font-extrabold tracking-[-0.055em] wrap-anywhere">
            {getLeadName(lead.fullName)}
          </h1>
          <p className="mt-2 text-xs leading-5 text-[#687774] sm:text-sm">
            Received{' '}
            <time dateTime={lead.createdAt}>
              {formatDateTime(lead.createdAt)}
            </time>
          </p>
        </div>
        <div className="w-full sm:w-44">
          <SelectField
            label="Status"
            name="status"
            options={statusOptions}
            value={statusDraft}
            loading={statusMutation.isPending}
            onChange={(value) => {
              const nextStatus = value as LeadStatus
              if (nextStatus === statusDraft) return
              setStatusDraft(nextStatus)
              dismissToast()
              statusMutation.mutate(nextStatus)
            }}
          />
          <span className="sr-only" role="status">
            {statusMutation.isPending ? 'Updating status' : ''}
          </span>
        </div>
      </header>

      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
        <div className="grid min-w-0 content-start gap-5">
          <section
            className={`${cardClass} p-5 sm:p-7`}
            aria-labelledby="contact-heading"
          >
            <h2
              id="contact-heading"
              className="mb-5 text-base font-bold tracking-[-0.025em]"
            >
              Contact
            </h2>
            <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              {lead.email && (
                <InfoField label="Email address">
                  <a
                    className="text-[#176c5b] underline underline-offset-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c5b]"
                    href={`mailto:${lead.email}`}
                  >
                    {lead.email}
                  </a>
                </InfoField>
              )}
              {lead.phone && (
                <InfoField label="Phone number">
                  <a
                    className="text-[#176c5b] underline underline-offset-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c5b]"
                    href={`tel:${lead.phone}`}
                  >
                    {lead.phone}
                  </a>
                </InfoField>
              )}
            </dl>
            {!lead.email && !lead.phone && (
              <p className="text-sm text-[#687774]">Contact details pending.</p>
            )}
          </section>

          <section
            className={`${cardClass} p-5 sm:p-7`}
            aria-labelledby="source-heading"
          >
            <h2
              id="source-heading"
              className="mb-5 text-base font-bold tracking-[-0.025em]"
            >
              Source
            </h2>
            <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              {lead.campaignName && (
                <InfoField label="Campaign">{lead.campaignName}</InfoField>
              )}
              {lead.adName && <InfoField label="Ad">{lead.adName}</InfoField>}
              {lead.campaignId && (
                <InfoField label="Campaign ID">
                  <bdi>{lead.campaignId}</bdi>
                </InfoField>
              )}
              {lead.adId && (
                <InfoField label="Ad ID">
                  <bdi>{lead.adId}</bdi>
                </InfoField>
              )}
              {lead.formId && (
                <InfoField label="Form ID">
                  <bdi>{lead.formId}</bdi>
                </InfoField>
              )}
              {lead.pageId && (
                <InfoField label="Page ID">
                  <bdi>{lead.pageId}</bdi>
                </InfoField>
              )}
              {lead.sourceCreatedAt && (
                <InfoField label="Source created">
                  {formatDateTime(lead.sourceCreatedAt)}
                </InfoField>
              )}
              <InfoField label="Last updated">
                {formatDateTime(lead.updatedAt)}
              </InfoField>
              <InfoField label="Meta ID">
                <bdi>{lead.metaLeadId}</bdi>
              </InfoField>
            </dl>
          </section>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-4 lg:h-[calc(100dvh-2rem)]">
          <ActivityTimeline activities={activities} />
        </aside>
      </div>
      <FeedbackToast toast={toast} onDismiss={dismissToast} />
    </div>
  )
}
