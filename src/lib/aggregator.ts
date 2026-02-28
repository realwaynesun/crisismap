import type { CrisisEvent, FetchOptions } from '@/types'
import { getSources } from './sources/registry'
import { getCached, setCache } from './cache'

const CACHE_TTL = 30_000
const MAX_EVENTS = 200

function cacheKey(options?: FetchOptions): string {
  const q = options?.query ?? ''
  const s = options?.since ?? ''
  const l = options?.limit ?? MAX_EVENTS
  if (!q && !s && l === MAX_EVENTS) return 'aggregator:events'
  return `aggregator:${q}:${s}:${l}`
}

export async function fetchAllEvents(options?: FetchOptions): Promise<CrisisEvent[]> {
  const key = cacheKey(options)
  const cached = getCached<CrisisEvent[]>(key)
  if (cached) return cached

  const sources = getSources()
  const results = await Promise.allSettled(
    sources.map(s =>
      s.fetch(options).catch(err => {
        console.error(`[${s.id}] fetch failed:`, err.message)
        return [] as CrisisEvent[]
      })
    )
  )

  const events: CrisisEvent[] = []
  const seen = new Set<string>()

  for (const result of results) {
    const items = result.status === 'fulfilled' ? result.value : []
    for (const event of items) {
      if (seen.has(event.id)) continue
      seen.add(event.id)
      events.push(event)
    }
  }

  const limit = options?.limit ?? MAX_EVENTS
  const sorted = events
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)

  setCache(key, sorted, CACHE_TTL)
  return sorted
}
