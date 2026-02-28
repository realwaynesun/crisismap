import { NextResponse } from 'next/server'
import { getCached, setCache } from '@/lib/cache'
import type { PolymarketContract } from '@/types'

export const dynamic = 'force-dynamic'

const CACHE_KEY = 'polymarket'
const CACHE_TTL = 300_000

// Each entry: ALL terms must appear in the question
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

export async function GET() {
  try {
    const cached = getCached<PolymarketContract[]>(CACHE_KEY)
    if (cached) return NextResponse.json({ success: true, data: cached })

    const res = await fetch(
      'https://gamma-api.polymarket.com/markets?closed=false&limit=50',
      { signal: AbortSignal.timeout(10000) },
    )
    if (!res.ok) {
      return NextResponse.json({ success: true, data: [] })
    }

    const markets = await res.json()
    const contracts: PolymarketContract[] = (Array.isArray(markets) ? markets : [])
      .filter((m: Record<string, unknown>) => {
        const q = String(m.question ?? '').toLowerCase()
        return CRISIS_FILTERS.some(terms => terms.every(t => q.includes(t)))
      })
      .slice(0, 20)
      .map((m: Record<string, unknown>) => {
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
      })

    setCache(CACHE_KEY, contracts, CACHE_TTL)
    return NextResponse.json({ success: true, data: contracts })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
