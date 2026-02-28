import { readFile } from 'fs/promises'
import { join } from 'path'
import type { DataSource, CrisisEvent, FetchOptions } from '@/types'
import { geocode } from '@/lib/geocoder'
import { scoreThreatLevel } from '@/lib/scorer'

interface DigestEntry {
  title: string
  summary?: string
  url?: string
  time?: string
  source: string
}

function hash(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

const DIGEST_DIR = join(process.cwd(), 'private', 'digests')

const DIGEST_FILES = ['wsj.json', 'nikkei.json']

async function readDigestFile(filename: string): Promise<DigestEntry[]> {
  try {
    const raw = await readFile(join(DIGEST_DIR, filename), 'utf-8')
    const entries = JSON.parse(raw)
    return Array.isArray(entries) ? entries : []
  } catch {
    return []
  }
}

function entryToEvent(entry: DigestEntry): CrisisEvent {
  const category = detectCategory(entry.title)
  const summary = entry.summary ?? entry.title
  const level = scoreThreatLevel(entry.title, summary, category)
  const location = geocode(entry.title)

  return {
    id: `digest:${hash(entry.url ?? entry.title)}`,
    title: entry.title,
    summary,
    category,
    level,
    location,
    timestamp: entry.time ?? new Date().toISOString(),
    source: entry.source,
    sourceTier: 'private',
    url: entry.url,
  }
}

function detectCategory(text: string): CrisisEvent['category'] {
  const t = text.toLowerCase()
  if (t.includes('strike') || t.includes('attack') || t.includes('war')) return 'conflict'
  if (t.includes('military') || t.includes('missile') || t.includes('troops')) return 'military'
  if (t.includes('sanction') || t.includes('oil') || t.includes('market') || t.includes('tariff')) return 'economic'
  if (t.includes('diplomat') || t.includes('talks') || t.includes('summit')) return 'diplomatic'
  if (t.includes('says') || t.includes('warns') || t.includes('statement')) return 'statement'
  return 'statement'
}

export const digestSource: DataSource = {
  id: 'digest',
  name: 'News Digests (WSJ/Nikkei)',
  tier: 'private',

  async fetch(options?: FetchOptions): Promise<CrisisEvent[]> {
    const all = await Promise.all(DIGEST_FILES.map(readDigestFile))
    let events = all.flat().map(entryToEvent)

    if (options?.query) {
      const q = options.query.toLowerCase()
      events = events.filter(
        (e) => e.title.toLowerCase().includes(q) || e.summary.toLowerCase().includes(q),
      )
    }

    return events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, options?.limit ?? 50)
  },

  async healthCheck(): Promise<boolean> {
    const entries = await Promise.all(DIGEST_FILES.map(readDigestFile))
    return entries.some((e) => e.length > 0)
  },
}
