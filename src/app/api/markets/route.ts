import { NextResponse } from 'next/server'
import { getCached, setCache } from '@/lib/cache'
import type { PolymarketContract } from '@/types'

export const dynamic = 'force-dynamic'

const CACHE_KEY = 'polymarket'
const CACHE_TTL = 300_000

const CRISIS_KEYWORDS = [
  'iran', 'nuclear', 'war powers', 'military attack',
  'hezbollah', 'houthi', 'hormuz',
]

function isCrisisMarket(question: string): boolean {
  const q = question.toLowerCase()
  if (!CRISIS_KEYWORDS.some(kw => q.includes(kw))) return false
  // Exclude obvious non-crisis matches
  const exclude = ['academy', 'nhl', 'nba', 'nfl', 'fifa', 'gta', 'oscar']
  return !exclude.some(x => q.includes(x))
}

function parseMarket(m: Record<string, unknown>): PolymarketContract {
  let prob = 0
  try {
    const raw = m.outcomePrices
    const prices = typeof raw === 'string' ? JSON.parse(raw) : raw
    prob = Array.isArray(prices) ? Number(prices[0]) : Number(m.bestAsk ?? 0)
  } catch {
    prob = Number(m.bestAsk ?? 0)
  }
  return {
    id: String(m.id ?? m.conditionId ?? ''),
    question: String(m.question ?? ''),
    probability: Math.round(prob * 100),
    volume: Number(m.volume ?? m.volumeNum ?? 0),
    url: m.slug ? `https://polymarket.com/event/${m.slug}` : undefined,
  }
}

export async function GET() {
  try {
    const cached = getCached<PolymarketContract[]>(CACHE_KEY)
    if (cached) {
      return NextResponse.json({ success: true, data: cached }, {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
      })
    }

    const res = await fetch(
      'https://gamma-api.polymarket.com/markets?closed=false&limit=200&order=volume&ascending=false',
      { signal: AbortSignal.timeout(10000) },
    )
    if (!res.ok) {
      return NextResponse.json({ success: true, data: [] })
    }

    const markets = await res.json()
    const contracts = (Array.isArray(markets) ? markets : [])
      .filter((m: Record<string, unknown>) => isCrisisMarket(String(m.question ?? '')))
      .slice(0, 20)
      .map(parseMarket)

    setCache(CACHE_KEY, contracts, CACHE_TTL)
    return NextResponse.json({ success: true, data: contracts }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
