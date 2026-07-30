import { z } from 'zod';

export const IssuerSchema = z.object({
  name: z.string().min(1),
  country: z.string().length(2).optional(),
});
export const IssuersFileSchema = z.array(IssuerSchema);

export const ProgrammeSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['bank_currency', 'airline', 'hotel', 'other']),
  issuerName: z.string().nullable(),
});
export const ProgrammesFileSchema = z.array(ProgrammeSchema);

export const CardProductSchema = z.object({
  issuerName: z.string().min(1),
  name: z.string().min(1),
  network: z.string().min(1).optional(),
  annualFee: z.number().min(0),
  currency: z.string().length(3),
  earnProgrammeName: z.string().min(1),
  affiliateLink: z.string().url().optional(),
  tagline: z.string().max(140).nullable().optional(),
  feeWaiverNote: z.string().max(140).nullable().optional(),
});
export const CardProductsFileSchema = z.array(CardProductSchema);

export const MccRuleSchema = z.object({
  issuerName: z.string().min(1),
  cardName: z.string().min(1),
  mccCode: z.string().min(1),
  mccLabel: z.string().min(1),
  rewardRate: z.number().min(0),
  rewardType: z.enum(['cashback_pct', 'points_per_unit']),
});
export const MccRulesFileSchema = z.array(MccRuleSchema);

export const TransferEdgeSchema = z.object({
  toProgrammeName: z.string().min(1),
  ratioFrom: z.number().int().positive(),
  ratioTo: z.number().int().positive(),
  transferTimeLabel: z.string().min(1),
  transferTimeMaxDays: z.number().int().min(0),
  minTransfer: z.number().int().positive().nullable().optional(),
  sourceUrl: z.string().url(),
  // Must be an actual past/present date, not a placeholder — catches the
  // easy copy-paste mistake of forgetting to update this field.
  lastVerified: z.string().refine((d) => !Number.isNaN(Date.parse(d)) && new Date(d) <= new Date(), {
    message: 'lastVerified must be a valid, non-future date',
  }),
});
export const TransferPartnerFileSchema = z.object({
  fromProgrammeName: z.string().min(1),
  edges: z.array(TransferEdgeSchema).min(1),
});

export const AwardChartEntrySchema = z.object({
  originRegion: z.string().min(1),
  destRegion: z.string().min(1),
  cabin: z.enum(['economy', 'premium_economy', 'business', 'first']),
  pointsCost: z.number().int().positive(),
  sourceNote: z.string().min(1),
  sourceUrl: z.string().url(),
  lastVerified: z.string().refine((d) => !Number.isNaN(Date.parse(d)) && new Date(d) <= new Date(), {
    message: 'lastVerified must be a valid, non-future date',
  }),
});
export const AwardChartFileSchema = z.object({
  programmeName: z.string().min(1),
  entries: z.array(AwardChartEntrySchema).min(1),
});

export const AwardRouteEntrySchema = z.object({
  fromAirport: z.string().length(3),
  toAirport: z.string().length(3),
  city: z.string().min(1),
  country: z.string().min(1),
  cabin: z.enum(['economy', 'premium_economy', 'business', 'first']).default('economy'),
  pointsOnward: z.number().int().positive(),
  taxesOnward: z.number().min(0),
  pointsReturn: z.number().int().positive(),
  taxesReturn: z.number().min(0),
});
export const AwardRouteChartFileSchema = z.object({
  programmeName: z.string().min(1),
  sourceNote: z.string().min(1),
  // Unlike the region-based award-charts pipeline, sourceUrl is optional
  // here — this data can come from a screenshot/manual transcription
  // without a citable URL. lastVerified is still required so staleness
  // tracking still applies.
  sourceUrl: z.string().url().optional(),
  lastVerified: z.string().refine((d) => !Number.isNaN(Date.parse(d)) && new Date(d) <= new Date(), {
    message: 'lastVerified must be a valid, non-future date',
  }),
  routes: z.array(AwardRouteEntrySchema).min(1),
});
