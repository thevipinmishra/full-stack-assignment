import type { LeadStatus } from './api'
import { statusLabels } from './display'

const statusStyles: Record<LeadStatus, string> = {
  new: 'bg-[#e5f2eb] text-[#276f5c]',
  contacted: 'bg-[#f1edfa] text-[#6b5b9a]',
  qualified: 'bg-[#fbf2dd] text-[#865d16]',
  disqualified: 'bg-[#f9eaea] text-[#8c5050]',
  converted: 'bg-[#e4f2f8] text-[#246d89]',
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex min-h-7 items-center gap-2 rounded-md px-2.5 py-1 text-xs font-bold whitespace-nowrap ${statusStyles[status]}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {statusLabels[status]}
    </span>
  )
}
