import type { CrisisEvent, DataSource, FetchOptions, ThreatLevel } from '@/types'
import type { PolymarketContract } from '@/types'

const ENDPOINT = 'https://gamma-api.polymarket.com/markets'

const CRISIS_FILTERS = [
  ['iran'],
  ['israel', 'attack'],
  ['israel', 'iran'],
  ['nuclear', 'strike'],
  ['nuclear', 'war'],
  ['military', 'strike'],
  ['oil', 'price'],
  ['oil', 'embargo'],
  ['sanction', 'iran'],
  ['strait', 'hormuz'],
  ['world war'],
  ['nato', 'war'],
  ['hezbollah'],
  ['houthi'],
]

function hash(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0
  return Math.abs(h).toString(36)
}

interface GammaMarket {
  id: string
  question: string
  outcomePrices: string
  volume: string
  active: boolean
  closed: boolean
  slug: string
}

function probabilityToLevel(prob: number): ThreatLevel {
  if (prob >= 80) return 'critical'
  if (prob >= 60) return 'high'
  if (prob >= 40) return 'medium'
  if (prob >= 20) return 'low'
  return 'info'
}

function isGeopolitical(question: string): boolean {
  const lower = question.toLowerCase()
  return CRISIS_FILTERS.some(terms => terms.every(t => lower.includes(t)))
}

function parseOutcomePrice(raw: string): number {
  try {
    const prices: number[] = JSON.parse(raw)
    return prices[0] ?? 0
  } catch {
    return 0
  }
}

function marketToContract(market: GammaMarket): PolymarketContract {
  return {
    id: market.id,
    question: market.question,
    probability: Math.round(parseOutcomePrice(market.outcomePrices) * 100),
    volume: Number(market.volume) || 0,
    url: `https://polymarket.com/event/${market.slug}`,
  }
}

function contractToEvent(contract: PolymarketContract): CrisisEvent {
  return {
    id: `polymarket:${contract.id}`,
    title: contract.question,
    summary: `Prediction market: ${contract.probability}% probability. Volume: $${contract.volume.toLocaleString()}`,
    category: 'prediction',
    level: probabilityToLevel(contract.probability),
    timestamp: new Date().toISOString(),
    source: 'Polymarket',
    sourceTier: 'public',
    url: contract.url,
  }
}

async function fetchRawMarkets(): Promise<GammaMarket[]> {
  const params = new URLSearchParams({
    closed: 'false',
    limit: '20',
  })

  const res = await fetch(`${ENDPOINT}?${params}`, { next: { revalidate: 300 } })
  if (!res.ok) throw new Error(`Polymarket API returned ${res.status}`)

  const markets: GammaMarket[] = await res.json()
  return markets.filter((m) => isGeopolitical(m.question))
}

export async function fetchContracts(): Promise<PolymarketContract[]> {
  const markets = await fetchRawMarkets()
  return markets.map(marketToContract)
}

async function fetchEvents(options?: FetchOptions): Promise<CrisisEvent[]> {
  const contracts = await fetchContracts()
  let events = contracts.map(contractToEvent)

  if (options?.query) {
    const q = options.query.toLowerCase()
    events = events.filter(
      (e) => e.title.toLowerCase().includes(q) || e.summary.toLowerCase().includes(q),
    )
  }

  if (options?.limit) {
    events = events.slice(0, options.limit)
  }

  return events
}

async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${ENDPOINT}?limit=1`)
    return res.ok
  } catch {
    return false
  }
}

export const polymarket: DataSource = {
  id: `polymarket:${hash('polymarket-prediction')}`,
  name: 'Polymarket Predictions',
  tier: 'public',
  fetch: fetchEvents,
  healthCheck,
}
