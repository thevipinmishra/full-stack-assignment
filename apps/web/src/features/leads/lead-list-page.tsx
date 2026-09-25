import { useEffect, useRef, useState } from 'react'
import { Button } from '@base-ui/react/button'
import { Input } from '@base-ui/react/input'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import {
  columnFilteringFeature,
  columnVisibilityFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Magnifier,
  Sort,
  SortAsc,
  SortDesc,
  X,
} from 'reicon-react'
import { ColumnMenu } from '../../components/column-menu'
import { SelectField } from '../../components/select-field'
import { MultiSelectField } from '../../components/multi-select-field'
import { getCampaigns, leadStatuses } from './api'
import type { Lead } from './api'
import {
  formatDate,
  getErrorMessage,
  getLeadName,
  statusLabels,
} from './display'
import { LeadStatusBadge } from './lead-status-badge'
import { leadListQueryOptions } from './queries'
import type { LeadSearch } from './search'
import { cardClass, pageClass, secondaryButtonClass } from './ui'
import { WebhookDemo } from './webhook-demo'

const routeApi = getRouteApi('/')
const features = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
})
const emptyLeads: Lead[] = []
const statusOptions = leadStatuses.map((value) => ({
  label: statusLabels[value],
  value,
}))
const pageSizeOptions = [10, 20, 50].map((value) => ({
  label: String(value),
  value: String(value),
}))
const columnLabels: Record<string, string> = {
  fullName: 'Lead',
  campaignName: 'Campaign',
  status: 'Status',
  createdAt: 'Received',
  metaLeadId: 'Meta ID',
}

const columns: Array<ColumnDef<typeof features, Lead>> = [
  {
    accessorKey: 'fullName',
    header: 'Lead',
    enableHiding: false,
    cell: ({ row }) => (
      <div className="min-w-0">
        <Link
          to="/leads/$leadId"
          params={{ leadId: row.original.id }}
          title={getLeadName(row.original.fullName)}
          aria-label={
            row.original.fullName?.trim()
              ? undefined
              : `Unnamed lead, Meta ID ${row.original.metaLeadId}`
          }
          className="group/lead inline-flex max-w-full items-center gap-1.5 rounded-sm font-bold text-[#213231] hover:text-[#176c5b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c5b]"
        >
          <span className="truncate">{getLeadName(row.original.fullName)}</span>
          <ArrowRight
            size={14}
            className="shrink-0 opacity-40 group-hover/lead:opacity-100"
            aria-hidden="true"
          />
        </Link>
        <div
          className="truncate text-xs leading-5 text-[#60736a]"
          title={
            row.original.email || row.original.phone || row.original.metaLeadId
          }
        >
          {row.original.email || row.original.phone || row.original.metaLeadId}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'campaignName',
    header: 'Campaign',
    cell: ({ row }) =>
      row.original.campaignName ? (
        <span
          className="block max-w-56 truncate"
          title={row.original.campaignName}
        >
          {row.original.campaignName}
        </span>
      ) : (
        <span className="text-[#617268]">No campaign</span>
      ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <LeadStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Received',
    cell: ({ row }) => (
      <time dateTime={row.original.createdAt} className="tabular-nums">
        {formatDate(row.original.createdAt)}
      </time>
    ),
  },
  {
    accessorKey: 'metaLeadId',
    header: 'Meta ID',
    enableSorting: false,
    cell: ({ row }) => (
      <span
        className="block max-w-44 truncate font-mono text-xs"
        title={row.original.metaLeadId}
      >
        <bdi>{row.original.metaLeadId}</bdi>
      </span>
    ),
  },
]

function FilterChip({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
  return (
    <Button
      type="button"
      aria-label={`Remove ${label} filter`}
      onClick={onRemove}
      className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border border-[#d6e5da] bg-white px-2.5 text-xs font-semibold text-[#3c5f4f] hover:border-[#a4c5ad] hover:bg-[#f4faf5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c5b]"
    >
      <span className="truncate">{label}</span>
      <X size={13} className="shrink-0" aria-hidden="true" />
    </Button>
  )
}

export function LeadListPage() {
  const filters = routeApi.useSearch()
  const navigate = useNavigate({ from: '/' })
  const [searchDraft, setSearchDraft] = useState(filters.search ?? '')
  const lastSearchSent = useRef(filters.search)
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({
    metaLeadId: false,
  })
  const leadsQuery = useQuery(leadListQueryOptions(filters))
  const campaignsQuery = useQuery({
    queryKey: ['campaigns'],
    queryFn: getCampaigns,
    staleTime: 30_000,
  })
  const pagination = leadsQuery.data?.pagination
  const hasFilters = Boolean(
    filters.search || filters.campaign?.length || filters.status?.length,
  )

  useEffect(() => {
    if (filters.search !== lastSearchSent.current) {
      setSearchDraft(filters.search ?? '')
      lastSearchSent.current = filters.search
    }
  }, [filters.search])
  useEffect(() => {
    const search = searchDraft.trim() || undefined
    if (search === filters.search) return
    const timeout = window.setTimeout(() => {
      lastSearchSent.current = search
      void navigate({
        replace: true,
        search: (previous) => ({ ...previous, page: 1, search }),
      })
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [searchDraft, filters.search, navigate])
  useEffect(() => {
    if (pagination && filters.page > Math.max(1, pagination.totalPages)) {
      void navigate({
        replace: true,
        search: (previous) => ({
          ...previous,
          page: Math.max(1, pagination.totalPages),
        }),
      })
    }
  }, [filters.page, navigate, pagination])

  const table = useTable({
    features,
    columns,
    data: leadsQuery.data?.data ?? emptyLeads,
    getRowId: (lead) => lead.id,
    rowCount: pagination?.total ?? 0,
    manualFiltering: true,
    manualSorting: true,
    manualPagination: true,
    state: {
      columnFilters: [
        ...(filters.campaign?.length
          ? [{ id: 'campaignName', value: filters.campaign }]
          : []),
        ...(filters.status?.length
          ? [{ id: 'status', value: filters.status }]
          : []),
      ],
      globalFilter: filters.search ?? '',
      sorting: [{ id: filters.sortBy, desc: filters.sortDirection === 'desc' }],
      pagination: { pageIndex: filters.page - 1, pageSize: filters.limit },
      columnVisibility,
    },
    onColumnVisibilityChange: setColumnVisibility,
  })

  function clearFilters() {
    setSearchDraft('')
    lastSearchSent.current = undefined
    void navigate({
      search: (previous) => ({
        ...previous,
        page: 1,
        search: undefined,
        campaign: undefined,
        status: undefined,
      }),
    })
  }

  function removeFilter(key: 'search' | 'campaign' | 'status', value?: string) {
    if (key === 'search') {
      setSearchDraft('')
      lastSearchSent.current = undefined
    }
    void navigate({
      search: (previous) => ({
        ...previous,
        page: 1,
        search: key === 'search' ? undefined : previous.search,
        campaign:
          key === 'campaign'
            ? previous.campaign?.filter((item) => item !== value)
            : previous.campaign,
        status:
          key === 'status'
            ? previous.status?.filter((item) => item !== value)
            : previous.status,
      }),
    })
  }

  function changeSort(columnId: string) {
    const sortBy = columnId as LeadSearch['sortBy']
    const sortDirection =
      filters.sortBy === sortBy
        ? filters.sortDirection === 'asc'
          ? 'desc'
          : 'asc'
        : sortBy === 'createdAt'
          ? 'desc'
          : 'asc'
    void navigate({
      search: (previous) => ({ ...previous, page: 1, sortBy, sortDirection }),
    })
  }

  return (
    <div className={pageClass}>
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="text-[clamp(2rem,4vw,2.5rem)] leading-tight font-extrabold tracking-[-0.05em]">
            Leads
          </h1>
          {pagination && (
            <span
              className="rounded-full bg-[#e7f0e9] px-2.5 py-1 text-xs font-bold text-[#3a6854] tabular-nums"
            >
              {pagination.total}
              <span className="sr-only"> leads</span>
            </span>
          )}
        </div>
        <WebhookDemo />
      </header>

      <div className="mb-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1.5fr)_minmax(10rem,1fr)_minmax(10rem,0.8fr)_auto] lg:items-end">
          <div role="search">
            <label
              htmlFor="lead-search"
              className="mb-1.5 block text-xs font-semibold text-[#455953]"
            >
              Search leads
            </label>
            <div className="flex min-h-11 items-center gap-2 rounded-lg border border-[#dce5df] bg-white px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#176c5b]">
              <Magnifier
                size={17}
                className="shrink-0 text-[#7b8d82]"
                aria-hidden="true"
              />
              <Input
                id="lead-search"
                type="search"
                name="search"
                placeholder="Name, email or ID"
                value={searchDraft}
                onValueChange={setSearchDraft}
                className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:text-[#617268] sm:text-sm"
              />
            </div>
          </div>
          <MultiSelectField
            label="Campaigns"
            emptyLabel="All campaigns"
            emptyMessage={
              campaignsQuery.isPending
                ? 'Loading campaigns...'
                : campaignsQuery.isError
                  ? 'Unable to load campaigns. Refresh to try again.'
                  : 'No campaigns yet'
            }
            options={(campaignsQuery.data ?? []).map((name) => ({
              label: name,
              value: name,
            }))}
            value={filters.campaign ?? []}
            onToggle={(campaign) =>
              void navigate({
                search: (previous) => {
                  const selected = previous.campaign ?? []
                  return {
                    ...previous,
                    page: 1,
                    campaign: selected.includes(campaign)
                      ? selected.filter((item) => item !== campaign)
                      : [...selected, campaign],
                  }
                },
              })
            }
          />
          <MultiSelectField
            label="Status"
            emptyLabel="All statuses"
            options={statusOptions}
            value={filters.status ?? []}
            onToggle={(status) =>
              void navigate({
                search: (previous) => {
                  const selected = previous.status ?? []
                  return {
                    ...previous,
                    page: 1,
                    status: selected.includes(status)
                      ? selected.filter((item) => item !== status)
                      : [...selected, status],
                  }
                },
              })
            }
          />
          <ColumnMenu
            options={table
              .getAllLeafColumns()
              .filter((column) => column.getCanHide())
              .map((column) => ({
                id: column.id,
                label: columnLabels[column.id],
                checked: column.getIsVisible(),
                onCheckedChange: (checked: boolean) =>
                  column.toggleVisibility(checked),
              }))}
          />
        </div>
        {hasFilters && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {filters.search && (
              <FilterChip
                label={`Search: ${filters.search}`}
                onRemove={() => removeFilter('search')}
              />
            )}
            {filters.campaign?.map((campaign) => (
              <FilterChip
                key={`campaign-${campaign}`}
                label={`Campaign: ${campaign}`}
                onRemove={() => removeFilter('campaign', campaign)}
              />
            ))}
            {filters.status?.map((status) => (
              <FilterChip
                key={`status-${status}`}
                label={`Status: ${statusLabels[status]}`}
                onRemove={() => removeFilter('status', status)}
              />
            ))}
            <Button
              type="button"
              className="min-h-8 rounded-md px-2 text-xs font-bold text-[#176c5b] hover:bg-[#eaf2eb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c5b]"
              onClick={clearFilters}
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      <section className={cardClass} aria-labelledby="leads-table-heading">
        <h2 id="leads-table-heading" className="sr-only">
          Leads
        </h2>
        <span className="sr-only" role="status">
          {leadsQuery.isPending
            ? 'Loading leads'
            : pagination
              ? `${pagination.total} leads found. Page ${filters.page} of ${Math.max(1, pagination.totalPages)}.`
              : ''}
        </span>
        <p className="px-4 pb-2 text-xs text-[#687774] sm:hidden">
          Scroll sideways to see all columns.
        </p>
        <div
          className="w-full overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#176c5b]"
          role="region"
          aria-label="Lead results, scrollable on small screens"
          tabIndex={0}
        >
          <table className="w-full min-w-[700px] border-collapse text-left text-sm">
            <thead className="border-y border-[#e5ece6] bg-[#f7faf7] text-[11px] tracking-[0.055em] text-[#52695d] uppercase">
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        !header.column.getCanSort()
                          ? undefined
                          : header.column.getIsSorted() === 'asc'
                            ? 'ascending'
                            : header.column.getIsSorted() === 'desc'
                              ? 'descending'
                              : 'none'
                      }
                      className={`px-5 py-2.5 font-bold sm:px-6 ${header.column.id === 'fullName' ? 'w-[32%]' : header.column.id === 'campaignName' ? 'w-[26%]' : ''}`}
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <Button
                          type="button"
                          onClick={() => changeSort(header.column.id)}
                          className="inline-flex min-h-8 items-center gap-1.5 rounded text-left hover:text-[#176c5b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176c5b]"
                          aria-label={`Sort by ${columnLabels[header.column.id]}, ${header.column.getIsSorted() === 'asc' ? 'ascending' : header.column.getIsSorted() === 'desc' ? 'descending' : 'not sorted'}`}
                        >
                          <table.FlexRender header={header} />
                          {header.column.getIsSorted() === 'asc' ? (
                            <SortAsc size={14} aria-hidden="true" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <SortDesc size={14} aria-hidden="true" />
                          ) : (
                            <Sort size={14} aria-hidden="true" />
                          )}
                        </Button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody aria-busy={leadsQuery.isPending}>
              {leadsQuery.isPending ? (
                Array.from({ length: 5 }, (_, index) => (
                  <tr
                    key={index}
                    className="border-b border-[#edf1ed] last:border-0"
                    aria-hidden="true"
                  >
                    {table.getVisibleLeafColumns().map((column) => (
                      <td key={column.id} className="px-5 py-4 sm:px-6">
                        <span
                          className={`lead-skeleton block h-4 rounded-full bg-[#e8eee9] ${column.id === 'fullName' ? 'w-2/3' : column.id === 'status' ? 'w-20' : 'w-3/4'}`}
                        />
                        {column.id === 'fullName' && (
                          <span className="lead-skeleton mt-2 block h-3 w-1/2 rounded-full bg-[#eef2ee]" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : leadsQuery.isError ||
                table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={table.getVisibleLeafColumns().length}
                    className="px-5 py-16 text-center text-sm text-[#687774]"
                  >
                    {leadsQuery.isError ? (
                      <div
                        className="flex flex-col items-center gap-3"
                        role="alert"
                      >
                        <span className="font-bold text-[#34443c]">
                          Unable to load leads
                        </span>
                        <span>{getErrorMessage(leadsQuery.error)}</span>
                        <Button
                          type="button"
                          className={secondaryButtonClass}
                          onClick={() => void leadsQuery.refetch()}
                        >
                          Try again
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <span className="font-bold text-[#34443c]">
                          {hasFilters ? 'No matching leads' : 'No leads yet'}
                        </span>
                        <span className="max-w-sm leading-6">
                          {hasFilters
                            ? 'Try a different search or remove a filter.'
                            : 'Send a sample webhook to see the lead workflow in action.'}
                        </span>
                        {hasFilters && (
                          <Button
                            type="button"
                            className={`${secondaryButtonClass} mt-2`}
                            onClick={clearFilters}
                          >
                            Clear filters
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-[#edf1ed] last:border-0 hover:bg-[#f8faf8] focus-within:bg-[#f8faf8]"
                    onClick={(event) => {
                      if (
                        event.defaultPrevented ||
                        (event.target instanceof Element &&
                          event.target.closest('a, button'))
                      )
                        return
                      void navigate({
                        to: '/leads/$leadId',
                        params: { leadId: row.original.id },
                      })
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="max-w-72 px-5 py-4 align-middle text-[#455953] sm:px-6"
                      >
                        <table.FlexRender cell={cell} />
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-[#e4eae6] px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
            <div className="w-28">
              <SelectField
                label="Rows per page"
                name="limit"
                options={pageSizeOptions}
                value={String(filters.limit)}
                onChange={(value) =>
                  void navigate({
                    search: (previous) => ({
                      ...previous,
                      page: 1,
                      limit: Number(value) as LeadSearch['limit'],
                    }),
                  })
                }
              />
            </div>
            {pagination && pagination.total > 0 && (
              <p className="pb-2.5 text-xs font-semibold text-[#617268] tabular-nums">
                Showing {(filters.page - 1) * filters.limit + 1}–
                {Math.min(filters.page * filters.limit, pagination.total)} of{' '}
                {pagination.total}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#65766c]">
            <span className="mr-1 whitespace-nowrap tabular-nums">
              Page {filters.page} of {Math.max(1, pagination?.totalPages ?? 1)}
            </span>
            <Button
              type="button"
              aria-label="Previous page"
              className={secondaryButtonClass}
              disabled={filters.page <= 1 || leadsQuery.isPending}
              onClick={() =>
                void navigate({
                  search: (previous) => ({
                    ...previous,
                    page: previous.page - 1,
                  }),
                })
              }
            >
              <ChevronLeft size={17} aria-hidden="true" />
            </Button>
            <Button
              type="button"
              aria-label="Next page"
              className={secondaryButtonClass}
              disabled={
                !pagination ||
                filters.page >= pagination.totalPages ||
                leadsQuery.isPending
              }
              onClick={() =>
                void navigate({
                  search: (previous) => ({
                    ...previous,
                    page: previous.page + 1,
                  }),
                })
              }
            >
              <ChevronRight size={17} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
