export const leadStatuses = [
  'new',
  'contacted',
  'qualified',
  'disqualified',
  'converted',
] as const

export type LeadStatus = (typeof leadStatuses)[number]

export interface Lead {
  id: string
  metaLeadId: string
  fullName: string | null
  email: string | null
  phone: string | null
  status: LeadStatus
  campaignId: string | null
  campaignName: string | null
  adId: string | null
  adName: string | null
  formId: string | null
  pageId: string | null
  sourceCreatedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Activity {
  id: string
  leadId: string
  type: 'lead_created' | 'lead_updated' | 'status_changed'
  source: 'meta_webhook' | 'api'
  description: string
  changes: Record<string, { from: string | null; to: string | null }>
  createdAt: string
}

export interface LeadListResponse {
  data: Lead[]
  pagination: {
    limit: number
    page: number
    total: number
    totalPages: number
  }
}

export interface LeadDetailResponse {
  lead: Lead
  activities: Activity[]
}

export interface WebhookDemoResponse {
  lead: Lead
  deliveries: Array<{
    step: 'notification' | 'enrichment' | 'retry'
    action: 'created' | 'updated' | 'unchanged'
  }>
}

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response
  const headers = new Headers(options?.headers)
  if (options?.body) headers.set('Content-Type', 'application/json')

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers,
    })
  } catch {
    throw new Error(
      'Unable to reach the API. Check your connection and try again.',
    )
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    const message =
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof body.error === 'object' &&
      body.error !== null &&
      'message' in body.error &&
      typeof body.error.message === 'string'
        ? body.error.message
        : 'The request failed. Try again.'
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export function getLeads(options: {
  page: number
  limit: 10 | 20 | 50
  campaign?: string[]
  search?: string
  sortBy: 'createdAt' | 'fullName' | 'campaignName' | 'status'
  sortDirection: 'asc' | 'desc'
  status?: LeadStatus[]
}): Promise<LeadListResponse> {
  const params = new URLSearchParams({
    page: String(options.page),
    limit: String(options.limit),
    sortBy: options.sortBy,
    sortDirection: options.sortDirection,
  })
  options.campaign?.forEach((campaign) => params.append('campaign', campaign))
  if (options.search) params.set('search', options.search)
  options.status?.forEach((status) => params.append('status', status))
  return request(`/leads?${params}`)
}

export function getCampaigns(): Promise<string[]> {
  return request('/leads/campaigns')
}

export function getLead(id: string): Promise<LeadDetailResponse> {
  return request(`/leads/${encodeURIComponent(id)}`)
}

export function sendSampleWebhook(): Promise<WebhookDemoResponse> {
  return request('/demo/webhook', { method: 'POST', body: '{}' })
}

export function updateLeadStatus(
  id: string,
  status: LeadStatus,
): Promise<{ changed: boolean; lead: Lead }> {
  return request(`/leads/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}
