import { BadRequestError } from '../errors.js'

type JsonObject = Record<string, unknown>

export interface IncomingMetaLead {
  adId?: string
  adName?: string
  campaignId?: string
  campaignName?: string
  email?: string
  formId?: string
  fullName?: string
  metaLeadId: string
  pageId?: string
  phone?: string
  rawPayload: JsonObject
  sourceCreatedAt?: Date
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(
  source: JsonObject,
  ...keys: readonly string[]
): string | undefined {
  for (const key of keys) {
    const value = source[key]

    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim()
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value)
    }
  }

  return undefined
}

function readSourceDate(source: JsonObject): Date | undefined {
  const value =
    source.sourceCreatedAt ?? source.createdTime ?? source.created_time

  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined
  }

  const date =
    typeof value === 'number' || /^\d+$/.test(value)
      ? new Date(Number(value) * 1_000)
      : new Date(value)

  return Number.isNaN(date.getTime()) ? undefined : date
}

function readFieldData(source: JsonObject): Record<string, string> {
  const candidate = source.field_data ?? source.fieldData
  if (!Array.isArray(candidate)) return {}

  const entries = candidate
  const fields: Record<string, string> = {}

  for (const entry of entries) {
    if (!isObject(entry)) continue

    const name = readString(entry, 'name')
    const values = entry.values

    if (!name || !Array.isArray(values) || values.length === 0) continue

    const firstValue = values[0]
    if (typeof firstValue === 'string' || typeof firstValue === 'number') {
      fields[name] = String(firstValue).trim()
    }
  }

  return fields
}

function normalizeLead(
  source: JsonObject,
  fallbackPageId?: string,
): IncomingMetaLead {
  const fields = readFieldData(source)
  const firstName = fields.first_name
  const lastName = fields.last_name
  const joinedName =
    [firstName, lastName].filter(Boolean).join(' ') || undefined
  const metaLeadId = readString(source, 'metaLeadId', 'leadgen_id', 'id')

  if (!metaLeadId) {
    throw new BadRequestError(
      'Each Meta lead must include a leadgen_id or metaLeadId',
    )
  }

  return {
    adId: readString(source, 'adId', 'ad_id'),
    adName: readString(source, 'adName', 'ad_name'),
    campaignId: readString(source, 'campaignId', 'campaign_id'),
    campaignName: readString(source, 'campaignName', 'campaign_name'),
    email: readString(source, 'email') ?? fields.email,
    formId: readString(source, 'formId', 'form_id'),
    fullName:
      readString(source, 'fullName', 'full_name', 'name') ??
      fields.full_name ??
      joinedName,
    metaLeadId,
    pageId: readString(source, 'pageId', 'page_id') ?? fallbackPageId,
    phone:
      readString(source, 'phone', 'phoneNumber', 'phone_number') ??
      fields.phone_number ??
      fields.phone,
    rawPayload: source,
    sourceCreatedAt: readSourceDate(source),
  }
}

function extractEnvelope(body: JsonObject): IncomingMetaLead[] {
  if (!Array.isArray(body.entry)) {
    throw new BadRequestError('A Meta page webhook must include an entry array')
  }

  const leads: IncomingMetaLead[] = []

  for (const entry of body.entry) {
    if (!isObject(entry) || !Array.isArray(entry.changes)) continue

    const pageId = readString(entry, 'id')

    for (const change of entry.changes) {
      if (
        !isObject(change) ||
        change.field !== 'leadgen' ||
        !isObject(change.value)
      ) {
        continue
      }

      leads.push(normalizeLead(change.value, pageId))
    }
  }

  if (leads.length === 0) {
    throw new BadRequestError('The webhook contains no leadgen changes')
  }

  return leads
}

export function extractMetaLeads(body: unknown): IncomingMetaLead[] {
  if (!isObject(body)) {
    throw new BadRequestError('The webhook body must be a JSON object')
  }

  if (body.object === 'page' || 'entry' in body) {
    return extractEnvelope(body)
  }

  return [normalizeLead(body)]
}
