import { z } from 'zod'

export const EventCategory = z.enum([
  'conflict', 'statement', 'military', 'diplomatic',
  'economic', 'terrorism', 'disaster', 'prediction', 'earthquake',
])
export type EventCategory = z.infer<typeof EventCategory>

export const ThreatLevel = z.enum(['critical', 'high', 'medium', 'low', 'info'])
export type ThreatLevel = z.infer<typeof ThreatLevel>

export const SourceTier = z.enum(['public', 'private'])
export type SourceTier = z.infer<typeof SourceTier>

export const LocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  name: z.string(),
  country: z.string().optional(),
})
export type Location = z.infer<typeof LocationSchema>

export const CrisisEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  category: EventCategory,
  level: ThreatLevel,
  location: LocationSchema.optional(),
  timestamp: z.string(),
  source: z.string(),
  sourceTier: SourceTier,
  url: z.string().optional(),
  actor: z.string().optional(),
  entities: z.array(z.string()).optional(),
})
export type CrisisEvent = z.infer<typeof CrisisEventSchema>

export const MarketIndicator = z.object({
  symbol: z.string(),
  name: z.string(),
  price: z.number(),
  change: z.number(),
  changePercent: z.number(),
  timestamp: z.string(),
})
export type MarketIndicator = z.infer<typeof MarketIndicator>

export const PolymarketContract = z.object({
  id: z.string(),
  question: z.string(),
  probability: z.number(),
  volume: z.number(),
  url: z.string().optional(),
})
export type PolymarketContract = z.infer<typeof PolymarketContract>

export const ActorStatus = z.object({
  name: z.string(),
  flag: z.string(),
  role: z.string(),
  lastStatement: z.string().optional(),
  lastStatementTime: z.string().optional(),
  eventCount: z.number(),
})
export type ActorStatus = z.infer<typeof ActorStatus>

export interface DataSource {
  id: string
  name: string
  tier: SourceTier
  fetch(options?: FetchOptions): Promise<CrisisEvent[]>
  healthCheck(): Promise<boolean>
}

export interface FetchOptions {
  query?: string
  since?: string
  limit?: number
}

export type SidebarTab = 'feed' | 'timeline' | 'intel'

export interface FilterState {
  categories: EventCategory[]
  levels: ThreatLevel[]
  sources: string[]
  search: string
}
