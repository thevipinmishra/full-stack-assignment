import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const leadStatusValues = [
  'new',
  'contacted',
  'qualified',
  'disqualified',
  'converted',
] as const

export const activityTypeValues = [
  'lead_created',
  'lead_updated',
  'status_changed',
] as const

export const activitySourceValues = ['meta_webhook', 'api'] as const

export const leadStatus = pgEnum('lead_status', leadStatusValues)
export const activityType = pgEnum('activity_type', activityTypeValues)
export const activitySource = pgEnum('activity_source', activitySourceValues)

export type LeadStatus = (typeof leadStatusValues)[number]
export type ActivityType = (typeof activityTypeValues)[number]
export type ActivitySource = (typeof activitySourceValues)[number]
export type ActivityChanges = Record<
  string,
  { from: string | null; to: string | null }
>

export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    metaLeadId: varchar('meta_lead_id', { length: 255 }).notNull(),
    fullName: text('full_name'),
    email: text('email'),
    phone: text('phone'),
    status: leadStatus('status').notNull().default('new'),
    campaignId: varchar('campaign_id', { length: 255 }),
    campaignName: text('campaign_name'),
    adId: varchar('ad_id', { length: 255 }),
    adName: text('ad_name'),
    formId: varchar('form_id', { length: 255 }),
    pageId: varchar('page_id', { length: 255 }),
    sourceCreatedAt: timestamp('source_created_at', {
      mode: 'date',
      withTimezone: true,
    }),
    rawPayload: jsonb('raw_payload').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('leads_meta_lead_id_unique').on(table.metaLeadId),
    index('leads_created_at_index').on(table.createdAt),
    index('leads_status_created_at_index').on(table.status, table.createdAt),
  ],
)

export const leadActivities = pgTable(
  'lead_activities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    type: activityType('type').notNull(),
    source: activitySource('source').notNull(),
    description: text('description').notNull(),
    changes: jsonb('changes').$type<ActivityChanges>().notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('lead_activities_lead_id_created_at_index').on(
      table.leadId,
      table.createdAt,
    ),
  ],
)

export type LeadRecord = typeof leads.$inferSelect
export type ActivityRecord = typeof leadActivities.$inferSelect
