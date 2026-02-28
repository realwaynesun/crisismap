import type { DataSource, CrisisEvent, FetchOptions } from '@/types'
import { geocode } from '@/lib/geocoder'

const FEED_URL = 'https://safeairspace.net'

function hash(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

interface AirspaceEntry {
  country: string
  level: number
  summary: string
}

function parseLevel(levelStr: string): number {
  const n = Number(levelStr)
  return isNaN(n) ? 0 : n
}

function levelToThreat(level: number): CrisisEvent['level'] {
  if (level === 1) return 'critical'
  if (level === 2) return 'high'
  if (level === 3) return 'medium'
  return 'info'
}

async function scrapeEntries(): Promise<AirspaceEntry[]> {
  const res = await fetch(FEED_URL, {
    signal: AbortSignal.timeout(10000),
    headers: { 'User-Agent': 'CrisisMap/1.0' },
  })
  if (!res.ok) throw new Error(`Safe Airspace ${res.status}`)

  const html = await res.text()
  const entries: AirspaceEntry[] = []

  // Match feed items: <div class="feed-item feed-item-level-N" data-feed-item-country="X">
  const itemRegex = /feed-item-level-(\d+)"[^>]*data-feed-item-country="([^"]+)"/g
  let match: RegExpExecArray | null

  const seen = new Map<string, AirspaceEntry>()

  while ((match = itemRegex.exec(html)) !== null) {
    const level = parseLevel(match[1])
    const country = match[2]
    if (level === 0 || level > 2) continue
    // Keep highest risk level per country
    const existing = seen.get(country)
    if (!existing || level < existing.level) {
      seen.set(country, {
        country,
        level,
        summary: level === 1
          ? `${country}: DO NOT FLY — airspace closed or extreme conflict risk`
          : level === 2
            ? `${country}: Exercise caution — elevated airspace risk`
            : `${country}: Advisory — check NOTAMs before flight`,
      })
    }
  }

  return Array.from(seen.values())
}

function entryToEvent(entry: AirspaceEntry): CrisisEvent {
  const location = geocode(entry.country)

  return {
    id: `airspace:${hash(entry.country)}`,
    title: `Airspace Alert: ${entry.country}`,
    summary: entry.summary,
    category: 'military',
    level: levelToThreat(entry.level),
    location,
    timestamp: new Date().toISOString(),
    source: 'Safe Airspace',
    sourceTier: 'public',
    url: `${FEED_URL}/${entry.country.toLowerCase().replace(/\s+/g, '-')}/`,
  }
}

export const safeAirspaceSource: DataSource = {
  id: 'safe-airspace',
  name: 'Safe Airspace',
  tier: 'public',

  async fetch(options?: FetchOptions): Promise<CrisisEvent[]> {
    const entries = await scrapeEntries()
    let events = entries.map(entryToEvent)

    if (options?.query) {
      const q = options.query.toLowerCase()
      events = events.filter(e =>
        e.title.toLowerCase().includes(q) || e.summary.toLowerCase().includes(q),
      )
    }

    return events.slice(0, options?.limit ?? 50)
  },

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(FEED_URL, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      })
      return res.ok
    } catch {
      return false
    }
  },
}
