import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { routeTree } from '../../routeTree.gen'
import type { Activity, Lead } from './api'

const leadId = '7e312502-91c4-4fee-9305-8a8ce7d90e86'
const createdAt = '2026-09-25T10:00:00.000Z'

function makeLead(status: Lead['status']): Lead {
  return {
    id: leadId,
    metaLeadId: 'meta-123',
    fullName: 'Avery Stone',
    email: 'avery@example.com',
    phone: '+12025550123',
    status,
    campaignId: 'campaign-1',
    campaignName: 'Autumn outreach',
    adId: 'ad-1',
    adName: 'Welcome offer',
    formId: 'form-1',
    pageId: 'page-1',
    sourceCreatedAt: createdAt,
    createdAt,
    updatedAt: createdAt,
  }
}

function makeActivities(status: Lead['status']): Activity[] {
  const created: Activity = {
    id: 'activity-created',
    leadId,
    type: 'lead_created',
    source: 'meta_webhook',
    description: 'Lead received from webhook',
    changes: {},
    createdAt,
  }
  if (status === 'new') return [created]
  return [
    {
      id: 'activity-status',
      leadId,
      type: 'status_changed',
      source: 'api',
      description: 'Status changed from new to qualified',
      changes: { status: { from: 'new', to: status } },
      createdAt: '2026-09-25T10:05:00.000Z',
    },
    created,
  ]
}

afterEach(() => vi.unstubAllGlobals())

describe('lead management flow', () => {
  it('opens a lead from the list, shows its timeline, and updates its status', async () => {
    vi.stubGlobal('scrollTo', vi.fn())
    let status: Lead['status'] = 'new'
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, options?: RequestInit) => {
        const url = new URL(String(input), 'http://localhost')
        const method = options?.method ?? 'GET'

        if (url.pathname === '/api/leads/campaigns') {
          return Response.json(['Autumn outreach'])
        }
        if (url.pathname === '/api/leads' && method === 'GET') {
          return Response.json({
            data: [makeLead(status)],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          })
        }
        if (url.pathname === `/api/leads/${leadId}` && method === 'GET') {
          return Response.json({
            lead: makeLead(status),
            activities: makeActivities(status),
          })
        }
        if (
          url.pathname === `/api/leads/${leadId}/status` &&
          method === 'PATCH'
        ) {
          status = JSON.parse(String(options?.body)).status as Lead['status']
          return Response.json({ changed: true, lead: makeLead(status) })
        }
        return Response.json(
          { error: { message: 'Unexpected request' } },
          { status: 404 },
        )
      },
    )
    vi.stubGlobal('fetch', fetchMock)

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const router = createRouter({
      routeTree,
      context: { queryClient },
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    const leadLink = await screen.findByRole('link', { name: /Avery Stone/ })
    expect(screen.getByRole('table')).toBeTruthy()
    await user.click(leadLink)

    expect(
      await screen.findByRole('heading', { name: 'Avery Stone' }),
    ).toBeTruthy()
    expect(screen.getByText('avery@example.com')).toBeTruthy()
    const timeline = screen.getByRole('region', { name: 'Audit trail' })
    expect(within(timeline).getByText('Lead created')).toBeTruthy()

    await user.click(screen.getByRole('combobox', { name: 'Status' }))
    await user.click(await screen.findByRole('option', { name: 'Qualified' }))

    expect(await within(timeline).findByText('Status changed')).toBeTruthy()
    expect(status).toBe('qualified')
    expect(
      fetchMock.mock.calls.some(
        ([url, options]) =>
          String(url) === `/api/leads/${leadId}/status` &&
          options?.method === 'PATCH',
      ),
    ).toBe(true)
  })
})
