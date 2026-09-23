import { eq } from 'drizzle-orm'

import type { Database } from '../db/client.js'
import {
  leadActivities,
  leads,
  type ActivityChanges,
  type LeadRecord,
} from '../db/schema.js'
import type { IncomingMetaLead } from './meta-payload.js'

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

export interface IngestedLead {
  action: 'created' | 'updated' | 'unchanged'
  lead: SerializedLead
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
            description: 'Lead received from Meta',
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
          description: 'Lead details updated from Meta',
          leadId: current.id,
          source: 'meta_webhook',
          type: 'lead_updated',
        })
        results.push({ action: 'updated', lead: serializeLead(updated) })
      }

      return results
    })
  }
}
