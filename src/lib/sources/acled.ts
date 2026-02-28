import type { DataSource, CrisisEvent, FetchOptions } from '@/types'
import { scoreThreatLevel } from '@/lib/scorer'

function hash(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

export const acledSource: DataSource = {
  id: 'acled',
  name: 'ACLED',
  tier: 'public',

  async fetch(options?: FetchOptions): Promise<CrisisEvent[]> {
    const key = process.env.ACLED_API_KEY
    const email = process.env.ACLED_EMAIL
    if (!key || !email) return []

    const since = options?.since ?? new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    const limit = options?.limit ?? 50
    const url = `https://api.acleddata.com/acled/read?key=${key}&email=${email}&event_date=${since}|&event_date_where=>%3D&limit=${limit}&fields=event_id_cnty|event_date|event_type|sub_event_type|actor1|country|admin1|latitude|longitude|notes|source`

    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return []

    const json = await res.json()
    const items = json.data ?? []

    return items.map((item: Record<string, string>) => {
      const category = mapCategory(item.event_type)
      const title = `${item.event_type}: ${item.sub_event_type ?? ''} in ${item.admin1 ?? item.country}`
      const summary = (item.notes ?? '').slice(0, 300)
      const level = scoreThreatLevel(title, summary, category)

      return {
        id: `acled:${hash(item.event_id_cnty)}`,
        title,
        summary,
        category,
        level,
        location: item.latitude && item.longitude ? {
          lat: parseFloat(item.latitude),
          lng: parseFloat(item.longitude),
          name: item.admin1 ?? item.country,
          country: item.country,
        } : undefined,
        timestamp: new Date(item.event_date).toISOString(),
        source: 'acled',
        sourceTier: 'public' as const,
        actor: item.actor1,
      }
    })
  },

  async healthCheck(): Promise<boolean> {
    return !!(process.env.ACLED_API_KEY && process.env.ACLED_EMAIL)
  },
}

function mapCategory(eventType: string): CrisisEvent['category'] {
  const t = (eventType ?? '').toLowerCase()
  if (t.includes('battle')) return 'conflict'
  if (t.includes('explosion') || t.includes('remote violence')) return 'military'
  if (t.includes('protest') || t.includes('riot')) return 'disaster'
  if (t.includes('violence against civilians')) return 'terrorism'
  if (t.includes('strategic')) return 'diplomatic'
  return 'conflict'
}
