import { ArrowRight } from 'reicon-react'
import type { Activity, LeadStatus } from './api'
import { formatDateTime, statusLabels } from './display'
import { cardClass } from './ui'

const fieldLabels: Record<string, string> = {
  fullName: 'Name',
  email: 'Email',
  phone: 'Phone',
  campaignId: 'Campaign ID',
  campaignName: 'Campaign',
  adId: 'Ad ID',
  adName: 'Ad',
  formId: 'Form ID',
  pageId: 'Page ID',
  sourceCreatedAt: 'Source created',
  status: 'Status',
}

function changeValue(value: string | null, field: string): string {
  if (!value) return 'Removed'
  if (field === 'status' && value in statusLabels)
    return statusLabels[value as LeadStatus]
  if (field === 'sourceCreatedAt') return formatDateTime(value)
  return value
}

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
  return (
    <section
      className={`${cardClass} min-w-0 p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c5b] sm:p-6 lg:h-full lg:overflow-y-auto lg:overscroll-contain`}
      aria-labelledby="activity-heading"
      tabIndex={0}
      style={{ scrollbarGutter: 'stable' }}
    >
      <h2
        id="activity-heading"
        className="text-base font-bold tracking-[-0.025em]"
      >
        Audit trail
      </h2>
      {activities.length === 0 ? (
        <p className="mt-4 text-sm text-[#687774]">No activity yet.</p>
      ) : (
        <ol className="mt-5">
          {activities.map((activity, index) => {
            const statusChange =
              activity.type === 'status_changed'
                ? activity.changes.status
                : undefined
            const otherChanges = Object.entries(activity.changes).filter(
              ([field]) => field !== 'status' || !statusChange,
            )

            return (
              <li
                key={activity.id}
                className={`relative pl-5 ${index < activities.length - 1 ? 'border-s border-[#dce8dc] pb-5' : ''}`}
              >
                <span
                  className={`absolute top-1 -start-[5px] size-2.5 rounded-full ring-4 ring-white ${activity.type === 'status_changed' ? 'bg-[#5d81a1]' : 'bg-[#41866a]'}`}
                  aria-hidden="true"
                />
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <h3 className="text-sm font-bold text-[#2d4035]">
                    {activity.type === 'lead_created'
                      ? 'Lead created'
                      : activity.type === 'lead_updated'
                        ? 'Details updated'
                        : 'Status changed'}
                  </h3>
                  <time
                    className="text-[11px] text-[#687774] tabular-nums"
                    dateTime={activity.createdAt}
                  >
                    {formatDateTime(activity.createdAt)}
                  </time>
                </div>
                {statusChange && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className="rounded-md bg-[#edf1f2] px-2 py-1 text-[#53616a]">
                      {changeValue(statusChange.from, 'status')}
                    </span>
                    <ArrowRight
                      size={14}
                      className="text-[#8a9b92]"
                      aria-hidden="true"
                    />
                    <span className="rounded-md bg-[#e5f2eb] px-2 py-1 text-[#276f5c]">
                      {changeValue(statusChange.to, 'status')}
                    </span>
                  </div>
                )}
                {otherChanges.length > 0 && (
                  <ul className="mt-2 divide-y divide-[#eef1ee]">
                    {otherChanges.map(([field, change]) => (
                      <li
                        key={field}
                        className="grid min-w-0 grid-cols-[minmax(5.5rem,0.4fr)_minmax(0,1fr)] gap-2 py-1.5 text-xs leading-5"
                      >
                        <span className="font-semibold text-[#687774]">
                          {fieldLabels[field] ?? field}
                        </span>
                        <span className="min-w-0 wrap-anywhere text-[#34443c]">
                          {change.from && (
                            <>
                              <span className="text-[#829087] line-through">
                                {changeValue(change.from, field)}
                              </span>{' '}
                              <span aria-hidden="true">→</span>{' '}
                            </>
                          )}
                          <strong className="font-semibold">
                            {changeValue(change.to, field)}
                          </strong>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <span className="mt-1 block text-[11px] text-[#7a8a80]">
                  {activity.source === 'meta_webhook' ? 'Webhook' : 'API'}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
