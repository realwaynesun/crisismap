import type { DataSource, CrisisEvent, FetchOptions } from '@/types'
import { scoreThreatLevel } from '@/lib/scorer'

const API_BASE = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv'

// Middle East + South Asia bounding box
const BBOX = {
  west: 25,
  south: 12,
  east: 75,
  north: 42,
}

function hash(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

interface FireHotspot {
  latitude: number
  longitude: number
  brightness: number
  confidence: string
  acq_date: string
  acq_time: string
  satellite: string
  frp: number
}

function parseCsv(csv: string): FireHotspot[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',')
  const idx = (name: string) => headers.indexOf(name)

  return lines.slice(1).map(line => {
    const cols = line.split(',')
    return {
      latitude: Number(cols[idx('latitude')]),
      longitude: Number(cols[idx('longitude')]),
      brightness: Number(cols[idx('bright_ti4')] || cols[idx('brightness')]),
      confidence: cols[idx('confidence')] ?? '',
      acq_date: cols[idx('acq_date')] ?? '',
      acq_time: cols[idx('acq_time')] ?? '',
      satellite: cols[idx('satellite')] ?? '',
      frp: Number(cols[idx('frp')] || 0),
    }
  })
}

function hotspotToEvent(h: FireHotspot): CrisisEvent {
  const title = `Fire/hotspot detected (${h.satellite}, FRP ${h.frp}MW)`
  const level = h.frp > 100 ? 'high' : h.frp > 30 ? 'medium' : 'low'
  const time = h.acq_time.padStart(4, '0')

  return {
    id: `firms:${hash(`${h.latitude}:${h.longitude}:${h.acq_date}`)}`,
    title,
    summary: `Satellite: ${h.satellite}, Brightness: ${h.brightness}, Confidence: ${h.confidence}, FRP: ${h.frp}MW`,
    category: 'military',
    level,
    location: {
      lat: h.latitude,
      lng: h.longitude,
      name: `${h.latitude.toFixed(2)}°N, ${h.longitude.toFixed(2)}°E`,
    },
    timestamp: `${h.acq_date}T${time.slice(0, 2)}:${time.slice(2)}:00Z`,
    source: 'NASA FIRMS',
    sourceTier: 'public',
  }
}

export const firmsSource: DataSource = {
  id: 'firms',
  name: 'NASA FIRMS',
  tier: 'public',

  async fetch(options?: FetchOptions): Promise<CrisisEvent[]> {
    const key = process.env.FIRMS_MAP_KEY
    if (!key) return []

    const url = `${API_BASE}/${key}/VIIRS_SNPP_NRT/${BBOX.west},${BBOX.south},${BBOX.east},${BBOX.north}/1`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) {
      throw new Error(`FIRMS API ${res.status}`)
    }

    const csv = await res.text()
    const hotspots = parseCsv(csv)

    // Only high-confidence detections
    const filtered = hotspots
      .filter(h => h.confidence === 'high' || h.confidence === 'h' || Number(h.confidence) >= 80)
      .filter(h => h.frp > 10)

    const limit = options?.limit ?? 30
    return filtered
      .sort((a, b) => b.frp - a.frp)
      .slice(0, limit)
      .map(hotspotToEvent)
  },

  async healthCheck(): Promise<boolean> {
    return !!process.env.FIRMS_MAP_KEY
  },
}
