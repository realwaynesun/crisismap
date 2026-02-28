import type { CrisisEvent, DataSource, FetchOptions, ThreatLevel } from '@/types'

const ENDPOINT = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_hour.geojson'

function hash(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0
  return Math.abs(h).toString(36)
}

interface UsgsFeature {
  id: string
  properties: {
    mag: number
    place: string
    time: number
    url: string
    title: string
    tsunami: number
  }
  geometry: {
    coordinates: [number, number, number]
  }
}

interface UsgsResponse {
  features: UsgsFeature[]
}

function magnitudeToLevel(mag: number): ThreatLevel {
  if (mag >= 6) return 'critical'
  if (mag >= 5) return 'high'
  if (mag >= 4) return 'medium'
  if (mag >= 3) return 'low'
  return 'info'
}

function featureToEvent(feature: UsgsFeature): CrisisEvent {
  const { properties, geometry } = feature
  const [lng, lat] = geometry.coordinates
  const level = magnitudeToLevel(properties.mag)
  const tsunami = properties.tsunami ? ' (tsunami warning)' : ''

  return {
    id: `usgs:${feature.id}`,
    title: properties.title,
    summary: `M${properties.mag} earthquake at ${properties.place}${tsunami}`,
    category: 'earthquake',
    level,
    location: {
      lat,
      lng,
      name: properties.place,
    },
    timestamp: new Date(properties.time).toISOString(),
    source: 'USGS',
    sourceTier: 'public',
    url: properties.url,
  }
}

async function fetchEvents(options?: FetchOptions): Promise<CrisisEvent[]> {
  const res = await fetch(ENDPOINT, { next: { revalidate: 120 } })
  if (!res.ok) throw new Error(`USGS API returned ${res.status}`)

  const data: UsgsResponse = await res.json()
  let events = data.features.map(featureToEvent)

  if (options?.query) {
    const q = options.query.toLowerCase()
    events = events.filter(
      (e) => e.title.toLowerCase().includes(q) || e.summary.toLowerCase().includes(q),
    )
  }

  if (options?.since) {
    const cutoff = new Date(options.since).getTime()
    events = events.filter((e) => new Date(e.timestamp).getTime() >= cutoff)
  }

  if (options?.limit) {
    events = events.slice(0, options.limit)
  }

  return events
}

async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(ENDPOINT, { method: 'HEAD' })
    return res.ok
  } catch {
    return false
  }
}

export const usgs: DataSource = {
  id: `usgs:${hash('usgs-earthquake')}`,
  name: 'USGS Earthquakes',
  tier: 'public',
  fetch: fetchEvents,
  healthCheck,
}
