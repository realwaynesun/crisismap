import type { DataSource, FetchOptions, CrisisEvent, EventCategory } from '@/types'
import { geocode } from '@/lib/geocoder'
import { scoreThreatLevel } from '@/lib/scorer'

const API_BASE = 'https://api.gdeltproject.org/api/v2/doc/doc'
const DEFAULT_QUERY = 'crisis OR conflict OR military OR attack'

interface GdeltArticle {
  url: string
  title: string
  seendate: string
  socialimage?: string
  domain: string
  language: string
  sourcecountry?: string
}

interface GdeltResponse {
  articles?: GdeltArticle[]
}

const THEME_TO_CATEGORY: Record<string, EventCategory> = {
  MILITARY: 'military',
  ARMED_CONFLICT: 'conflict',
  TERROR: 'terrorism',
  PROTEST: 'conflict',
  DIPLOMACY: 'diplomatic',
  ECON: 'economic',
  NATURAL_DISASTER: 'disaster',
  EARTHQUAKE: 'earthquake',
}

function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(36)
}

function detectCategory(title: string): EventCategory {
  const lower = title.toLowerCase()
  const patterns: [RegExp, EventCategory][] = [
    [/nuclear|missile|troops|military|army|navy|air\s?force|pentagon|defense/i, 'military'],
    [/attack|war|combat|battle|fighting|clash|killed|casualties/i, 'conflict'],
    [/terror|isis|al.?qaeda|bomb|explosion|hostage/i, 'terrorism'],
    [/earthquake|tsunami|hurricane|flood|volcano|wildfire/i, 'disaster'],
    [/diplomat|embassy|treaty|summit|negotiate|un\s|united\snations/i, 'diplomatic'],
    [/sanction|tariff|trade\swar|market|economy|inflation|oil\sprice/i, 'economic'],
    [/statement|says|warns|announces|declares|condemns|urges/i, 'statement'],
  ]
  for (const [pattern, category] of patterns) {
    if (pattern.test(lower)) return category
  }
  return 'statement'
}

function buildUrl(options?: FetchOptions): string {
  const query = options?.query ?? DEFAULT_QUERY
  const limit = Math.min(options?.limit ?? 50, 250)
  const params = new URLSearchParams({
    query,
    mode: 'ArtList',
    maxrecords: String(limit),
    format: 'json',
    timespan: '60min',
  })
  return `${API_BASE}?${params.toString()}`
}

function mapArticle(article: GdeltArticle): CrisisEvent {
  const category = detectCategory(article.title)
  const summary = article.title
  const level = scoreThreatLevel(article.title, summary, category)
  const location = geocode(article.title)
    ?? (article.sourcecountry ? geocode(article.sourcecountry) : undefined)

  return {
    id: `gdelt:${hashString(article.url)}`,
    title: article.title,
    summary,
    category,
    level,
    location,
    timestamp: parseGdeltDate(article.seendate),
    source: 'GDELT',
    sourceTier: 'public',
    url: article.url,
  }
}

function parseGdeltDate(raw: string): string {
  const cleaned = raw.replace(/T/, ' ').replace(/Z$/, '')
  const d = new Date(cleaned)
  if (isNaN(d.getTime())) return new Date().toISOString()
  return d.toISOString()
}

export const gdeltSource: DataSource = {
  id: 'gdelt',
  name: 'GDELT Project',
  tier: 'public',

  async fetch(options?: FetchOptions): Promise<CrisisEvent[]> {
    const url = buildUrl(options)
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`GDELT fetch failed: ${res.status}`)
    }
    const data = (await res.json()) as GdeltResponse
    if (!data.articles?.length) return []
    return data.articles.map(mapArticle)
  },

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(buildUrl({ limit: 1 }))
      return res.ok
    } catch {
      return false
    }
  },
}
