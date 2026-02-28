import { NextResponse } from 'next/server'
import { getCached, setCache } from '@/lib/cache'
import type { MarketIndicator } from '@/types'

export const dynamic = 'force-dynamic'

const CACHE_KEY = 'indicators'
const CACHE_TTL = 300_000

const YAHOO_SYMBOLS = [
  { symbol: 'CL=F', name: 'WTI Oil' },
  { symbol: 'GC=F', name: 'Gold' },
  { symbol: '^VIX', name: 'VIX' },
  { symbol: '^GSPC', name: 'S&P 500' },
]

async function fetchQuote(symbol: string, name: string): Promise<MarketIndicator | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!res.ok) return null

    const json = await res.json()
    const result = json.chart?.result?.[0]
    if (!result) return null

    const closes = result.indicators?.quote?.[0]?.close ?? []
    const prev = closes[closes.length - 2] ?? closes[closes.length - 1]
    const current = closes[closes.length - 1]
    if (!current || !prev) return null

    return {
      symbol,
      name,
      price: Math.round(current * 100) / 100,
      change: Math.round((current - prev) * 100) / 100,
      changePercent: Math.round(((current - prev) / prev) * 10000) / 100,
      timestamp: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

async function fetchBTC(): Promise<MarketIndicator | null> {
  // Try Binance first, fallback to CoinGecko (Binance blocked from US IPs)
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', {
      signal: AbortSignal.timeout(3000),
    })
    if (res.ok) {
      const data = await res.json()
      return {
        symbol: 'BTCUSDT',
        name: 'BTC',
        price: Math.round(parseFloat(data.lastPrice) * 100) / 100,
        change: Math.round(parseFloat(data.priceChange) * 100) / 100,
        changePercent: Math.round(parseFloat(data.priceChangePercent) * 100) / 100,
        timestamp: new Date(data.closeTime).toISOString(),
      }
    }
  } catch { /* fall through */ }

  // Fallback: CoinGecko (works from US)
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
      { signal: AbortSignal.timeout(5000) },
    )
    if (!res.ok) return null
    const data = await res.json()
    const price = data.bitcoin?.usd
    const changePct = data.bitcoin?.usd_24h_change
    if (!price) return null

    return {
      symbol: 'BTCUSDT',
      name: 'BTC',
      price: Math.round(price * 100) / 100,
      change: Math.round((price * changePct / 100) * 100) / 100,
      changePercent: Math.round(changePct * 100) / 100,
      timestamp: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const cached = getCached<MarketIndicator[]>(CACHE_KEY)
    if (cached) {
      return NextResponse.json({ success: true, data: cached }, {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
      })
    }

    const results = await Promise.allSettled([
      ...YAHOO_SYMBOLS.map(s => fetchQuote(s.symbol, s.name)),
      fetchBTC(),
    ])

    const indicators = results
      .map(r => r.status === 'fulfilled' ? r.value : null)
      .filter((v): v is MarketIndicator => v !== null)

    setCache(CACHE_KEY, indicators, CACHE_TTL)
    return NextResponse.json({ success: true, data: indicators }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
