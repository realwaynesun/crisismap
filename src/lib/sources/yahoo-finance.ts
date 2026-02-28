import type { CrisisEvent, DataSource, FetchOptions, ThreatLevel } from '@/types'
import type { MarketIndicator } from '@/types'

const BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart'

const SYMBOLS: Record<string, string> = {
  'CL=F': 'WTI Oil',
  'GC=F': 'Gold',
  '^VIX': 'VIX',
  '^GSPC': 'S&P 500',
}

const BIG_MOVE_THRESHOLDS: Record<string, number> = {
  'CL=F': 5,
  'GC=F': 3,
  '^VIX': 15,
  '^GSPC': 3,
}

function hash(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0
  return Math.abs(h).toString(36)
}

interface YahooChartResult {
  meta: {
    symbol: string
    regularMarketPrice: number
    chartPreviousClose: number
    regularMarketTime: number
  }
}

interface YahooResponse {
  chart: {
    result: YahooChartResult[] | null
    error: { code: string; description: string } | null
  }
}

function changeToLevel(symbol: string, absPercent: number): ThreatLevel {
  const threshold = BIG_MOVE_THRESHOLDS[symbol] ?? 5
  if (absPercent >= threshold * 2) return 'critical'
  if (absPercent >= threshold) return 'high'
  if (absPercent >= threshold * 0.6) return 'medium'
  if (absPercent >= threshold * 0.3) return 'low'
  return 'info'
}

async function fetchSymbol(symbol: string): Promise<MarketIndicator | null> {
  const encoded = encodeURIComponent(symbol)
  const url = `${BASE_URL}/${encoded}?interval=1d&range=2d`

  const res = await fetch(url, { next: { revalidate: 300 } })
  if (!res.ok) return null

  const data: YahooResponse = await res.json()
  const result = data.chart.result?.[0]
  if (!result) return null

  const { meta } = result
  const price = meta.regularMarketPrice
  const prevClose = meta.chartPreviousClose
  const change = price - prevClose
  const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0

  return {
    symbol,
    name: SYMBOLS[symbol] ?? symbol,
    price,
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    timestamp: new Date(meta.regularMarketTime * 1000).toISOString(),
  }
}

export async function fetchIndicators(): Promise<MarketIndicator[]> {
  const results = await Promise.allSettled(
    Object.keys(SYMBOLS).map(fetchSymbol),
  )

  return results
    .filter(
      (r): r is PromiseFulfilledResult<MarketIndicator> =>
        r.status === 'fulfilled' && r.value !== null,
    )
    .map((r) => r.value)
}

function indicatorToEvent(indicator: MarketIndicator): CrisisEvent | null {
  const threshold = BIG_MOVE_THRESHOLDS[indicator.symbol] ?? 5
  const absPercent = Math.abs(indicator.changePercent)

  if (absPercent < threshold * 0.3) return null

  const direction = indicator.change >= 0 ? 'up' : 'down'
  const sign = indicator.change >= 0 ? '+' : ''

  return {
    id: `yahoo:${indicator.symbol}:${hash(indicator.timestamp)}`,
    title: `${indicator.name} ${direction} ${sign}${indicator.changePercent}%`,
    summary: `${indicator.name} at $${indicator.price} (${sign}${indicator.change}). ${absPercent >= threshold ? 'Significant market move.' : 'Notable movement.'}`,
    category: 'economic',
    level: changeToLevel(indicator.symbol, absPercent),
    timestamp: indicator.timestamp,
    source: 'Yahoo Finance',
    sourceTier: 'public',
  }
}

async function fetchEvents(options?: FetchOptions): Promise<CrisisEvent[]> {
  const indicators = await fetchIndicators()
  let events = indicators
    .map(indicatorToEvent)
    .filter((e): e is CrisisEvent => e !== null)

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
    const res = await fetch(`${BASE_URL}/%5EGSPC?interval=1d&range=1d`)
    return res.ok
  } catch {
    return false
  }
}

export const yahooFinance: DataSource = {
  id: `yahoo:${hash('yahoo-finance')}`,
  name: 'Yahoo Finance',
  tier: 'public',
  fetch: fetchEvents,
  healthCheck,
}
