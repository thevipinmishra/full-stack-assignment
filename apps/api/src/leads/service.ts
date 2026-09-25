import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  or,
  sql,
  type SQL,
} from 'drizzle-orm'

import type { Database } from '../db/client.js'
import {
  leadActivities,
  leads,
  type ActivityChanges,
  type ActivityRecord,
  type LeadRecord,
  type LeadStatus,
} from '../db/schema.js'
import { NotFoundError } from '../errors.js'
import type { IncomingMetaLead } from './meta-payload.js'
import { containsPattern } from './search-pattern.js'

const mutableLeadFields = [
  'fullName',
  'email',
  'phone',
  'campaignId',
  'campaignName',
  'adId',
  'adName',
  'formId',
  'pageId',
  'sourceCreatedAt',
] as const

type MutableLeadField = (typeof mutableLeadFields)[number]

export interface SerializedLead extends Omit<
  LeadRecord,
  'createdAt' | 'rawPayload' | 'sourceCreatedAt' | 'updatedAt'
> {
  createdAt: string
  sourceCreatedAt: string | null
  updatedAt: string
}

export interface SerializedActivity extends Omit<ActivityRecord, 'createdAt'> {
  createdAt: string
}

export interface IngestedLead {
  action: 'created' | 'updated' | 'unchanged'
  lead: SerializedLead
}

export interface ListLeadOptions {
  campaign?: string[]
  limit: number
  page: number
  search?: string
  sortBy: 'createdAt' | 'fullName' | 'campaignName' | 'status'
  sortDirection: 'asc' | 'desc'
  status?: LeadStatus[]
}

function serializeLead(lead: LeadRecord): SerializedLead {
  const { rawPayload: _rawPayload, ...publicLead } = lead

  return {
    ...publicLead,
    createdAt: lead.createdAt.toISOString(),
    sourceCreatedAt: lead.sourceCreatedAt?.toISOString() ?? null,
    updatedAt: lead.updatedAt.toISOString(),
  }
}

function serializeActivity(activity: ActivityRecord): SerializedActivity {
  return {
    ...activity,
    createdAt: activity.createdAt.toISOString(),
  }
}

function comparableValue(
  value: Date | string | null | undefined,
): string | null {
  if (value instanceof Date) return value.toISOString()
  return value ?? null
}

function changedLeadValues(
  current: LeadRecord,
  incoming: IncomingMetaLead,
): {
  changes: ActivityChanges
  update: Partial<Pick<LeadRecord, MutableLeadField>>
} {
  const changes: ActivityChanges = {}
  const update: Partial<Pick<LeadRecord, MutableLeadField>> = {}

  for (const field of mutableLeadFields) {
    const nextValue = incoming[field]
    if (nextValue === undefined) continue

    const currentValue = current[field]
    if (comparableValue(currentValue) === comparableValue(nextValue)) continue

    update[field] = nextValue as never
    changes[field] = {
      from: comparableValue(currentValue),
      to: comparableValue(nextValue),
    }
  }

  return { changes, update }
}

export class LeadService {
  constructor(private readonly db: Database) {}

  async ingestMetaLeads(
    incomingLeads: IncomingMetaLead[],
  ): Promise<IngestedLead[]> {
    return this.db.transaction(async (transaction) => {
      const results: IngestedLead[] = []

      for (const incoming of incomingLeads) {
        // The unique key serializes concurrent deliveries for one Meta lead.
        const [created] = await transaction
          .insert(leads)
          .values({
            adId: incoming.adId,
            adName: incoming.adName,
            campaignId: incoming.campaignId,
            campaignName: incoming.campaignName,
            email: incoming.email,
            formId: incoming.formId,
            fullName: incoming.fullName,
            metaLeadId: incoming.metaLeadId,
            pageId: incoming.pageId,
            phone: incoming.phone,
            rawPayload: incoming.rawPayload,
            sourceCreatedAt: incoming.sourceCreatedAt,
          })
          .onConflictDoNothing({ target: leads.metaLeadId })
          .returning()

        if (created) {
          await transaction.insert(leadActivities).values({
            changes: {},
            description: 'Lead received from webhook',
            leadId: created.id,
            source: 'meta_webhook',
            type: 'lead_created',
          })
          results.push({ action: 'created', lead: serializeLead(created) })
          continue
        }

        const [current] = await transaction
          .select()
          .from(leads)
          .where(eq(leads.metaLeadId, incoming.metaLeadId))
          .limit(1)
          .for('update')

        if (!current) {
          throw new Error(
            `Lead ${incoming.metaLeadId} disappeared during ingestion`,
          )
        }

        const { changes, update } = changedLeadValues(current, incoming)
        if (Object.keys(changes).length === 0) {
          results.push({ action: 'unchanged', lead: serializeLead(current) })
          continue
        }

        const [updated] = await transaction
          .update(leads)
          .set({
            ...update,
            rawPayload: incoming.rawPayload,
            updatedAt: new Date(),
          })
          .where(eq(leads.id, current.id))
          .returning()

        await transaction.insert(leadActivities).values({
          changes,
          description: 'Lead details updated from webhook',
          leadId: current.id,
          source: 'meta_webhook',
          type: 'lead_updated',
        })
        results.push({ action: 'updated', lead: serializeLead(updated) })
      }

      return results
    })
  }

  async listLeads(options: ListLeadOptions): Promise<{
    data: SerializedLead[]
    pagination: {
      limit: number
      page: number
      total: number
      totalPages: number
    }
  }> {
    const filters: SQL[] = []

    if (options.status?.length) {
      filters.push(inArray(leads.status, options.status))
    }
    if (options.campaign?.length) {
      filters.push(inArray(leads.campaignName, options.campaign))
    }
    if (options.search) {
      const search = containsPattern(options.search)
      const searchFilter = or(
        ilike(leads.fullName, search),
        ilike(leads.email, search),
        ilike(leads.phone, search),
        ilike(leads.metaLeadId, search),
        ilike(leads.campaignName, search),
      )
      if (searchFilter) filters.push(searchFilter)
    }

    const where = filters.length > 0 ? and(...filters) : undefined
    const offset = (options.page - 1) * options.limit
    const sortColumns = {
      createdAt: leads.createdAt,
      fullName: leads.fullName,
      campaignName: leads.campaignName,
      status: leads.status,
    }
    const sortColumn = sortColumns[options.sortBy]
    const sort =
      options.sortDirection === 'asc' ? asc(sortColumn) : desc(sortColumn)
    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(leads)
        .where(where)
        .orderBy(sql`${sort} nulls last`, desc(leads.createdAt), desc(leads.id))
        .limit(options.limit)
        .offset(offset),
      this.db.select({ value: count() }).from(leads).where(where),
    ])
    const total = totalRows[0]?.value ?? 0

    return {
      data: rows.map(serializeLead),
      pagination: {
        limit: options.limit,
        page: options.page,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / options.limit),
      },
    }
  }

  async listCampaigns(): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ name: leads.campaignName })
      .from(leads)
      .where(isNotNull(leads.campaignName))
      .orderBy(asc(leads.campaignName))

    return rows.flatMap(({ name }) => (name ? [name] : []))
  }

  async getLead(id: string): Promise<{
    activities: SerializedActivity[]
    lead: SerializedLead
  }> {
    const [lead] = await this.db
      .select()
      .from(leads)
      .where(eq(leads.id, id))
      .limit(1)

    if (!lead) throw new NotFoundError('Lead not found')

    const activities = await this.db
      .select()
      .from(leadActivities)
      .where(eq(leadActivities.leadId, id))
      .orderBy(desc(leadActivities.createdAt))

    return {
      activities: activities.map(serializeActivity),
      lead: serializeLead(lead),
    }
  }

  async updateStatus(
    id: string,
    status: LeadStatus,
  ): Promise<{ changed: boolean; lead: SerializedLead }> {
    return this.db.transaction(async (transaction) => {
      const [current] = await transaction
        .select()
        .from(leads)
        .where(eq(leads.id, id))
        .limit(1)
        .for('update')

      if (!current) throw new NotFoundError('Lead not found')
      if (current.status === status) {
        return { changed: false, lead: serializeLead(current) }
      }

      const [updated] = await transaction
        .update(leads)
        .set({ status, updatedAt: new Date() })
        .where(eq(leads.id, id))
        .returning()

      await transaction.insert(leadActivities).values({
        changes: { status: { from: current.status, to: status } },
        description: `Status changed from ${current.status} to ${status}`,
        leadId: id,
        source: 'api',
        type: 'status_changed',
      })

      return { changed: true, lead: serializeLead(updated) }
    })
  }
}
