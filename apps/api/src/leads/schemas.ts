import { Type } from '@sinclair/typebox'

import { leadStatusValues } from '../db/schema.js'

const NullableString = Type.Union([Type.String(), Type.Null()])

export const LeadStatusSchema = Type.Union([
  Type.Literal(leadStatusValues[0]),
  Type.Literal(leadStatusValues[1]),
  Type.Literal(leadStatusValues[2]),
  Type.Literal(leadStatusValues[3]),
  Type.Literal(leadStatusValues[4]),
])

export const LeadSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  metaLeadId: Type.String(),
  fullName: NullableString,
  email: NullableString,
  phone: NullableString,
  status: LeadStatusSchema,
  campaignId: NullableString,
  campaignName: NullableString,
  adId: NullableString,
  adName: NullableString,
  formId: NullableString,
  pageId: NullableString,
  sourceCreatedAt: Type.Union([
    Type.String({ format: 'date-time' }),
    Type.Null(),
  ]),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
})

export const ErrorSchema = Type.Object({
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
  }),
})

export const MetaWebhookBodySchema = Type.Record(
  Type.String(),
  Type.Unknown(),
  {
    description:
      'A Meta page webhook envelope or an enriched lead with metaLeadId/leadgen_id',
    minProperties: 1,
  },
)
