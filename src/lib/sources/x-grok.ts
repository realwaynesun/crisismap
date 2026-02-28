import type { DataSource, CrisisEvent, FetchOptions } from '@/types'
import { geocode } from '@/lib/geocoder'
import { scoreThreatLevel } from '@/lib/scorer'

function hash(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

const ACCOUNTS = ['DeItaone', 'BNONews', 'disclosetv']
const KEYWORDS = 'Iran OR strike OR nuclear OR military OR missile OR conflict'

interface Tweet {
  text: string
  author: string
  time: string
  url: string
}

async function fetchViaXApi(): Promise<Tweet[]> {
  const token = process.env.X_BEARER_TOKEN
  if (!token) return []

  const query = ACCOUNTS.map(a => `from:${a}`).join(' OR ') + ` (${KEYWORDS})`
  const params = new URLSearchParams({
    query,
    max_results: '10',
    'tweet.fields': 'created_at,author_id',
    'expansions': 'author_id',
  })

  const res = await fetch(`https://api.x.com/2/tweets/search/recent?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) return []

  const json = await res.json()
  const users = new Map<string, string>()
  for (const u of json.includes?.users ?? []) {
    users.set(u.id, u.username)
  }

  return (json.data ?? []).map((t: { id: string; text: string; created_at: string; author_id: string }) => ({
    text: t.text,
    author: `@${users.get(t.author_id) ?? 'unknown'}`,
    time: t.created_at,
    url: `https://x.com/i/status/${t.id}`,
  }))
}

async function fetchViaGrok(query: string): Promise<Tweet[]> {
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) return []

  const res = await fetch('https://api.x.ai/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-4-1-fast-reasoning',
      tools: [{ type: 'x_search' }],
      input: [{
        role: 'user',
        content: `Search X/Twitter for: ${query}\n\nReturn ONLY a JSON array of the 10 most recent results. Each object must have: {"text": "full tweet", "author": "@handle", "time": "ISO 8601", "url": "tweet url"}\n\nNo explanation, just the JSON array.`,
      }],
    }),
    signal: AbortSignal.timeout(20000),
  })

  if (!res.ok) return []

  const json = await res.json()
  const content = extractContent(json)

  try {
    const match = content.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch {
    return []
  }
}

function extractContent(json: Record<string, unknown>): string {
  const output = json.output as Array<Record<string, unknown>> | undefined
  if (!output) return ''
  for (const item of output) {
    if (item.type === 'message' && Array.isArray(item.content)) {
      for (const c of item.content as Array<Record<string, unknown>>) {
        if (c.type === 'output_text') return String(c.text ?? '')
      }
    }
  }
  return ''
}

function detectCategory(text: string): CrisisEvent['category'] {
  const t = text.toLowerCase()
  if (t.includes('strike') || t.includes('attack') || t.includes('bomb')) return 'conflict'
  if (t.includes('military') || t.includes('troops') || t.includes('missile')) return 'military'
  if (t.includes('says') || t.includes('statement') || t.includes('warns')) return 'statement'
  if (t.includes('sanction') || t.includes('oil') || t.includes('market')) return 'economic'
  if (t.includes('diplomat') || t.includes('talks') || t.includes('negotiate')) return 'diplomatic'
  return 'conflict'
}

function extractActor(text: string): string | undefined {
  const actors = ['Biden', 'Trump', 'Netanyahu', 'Khamenei', 'IRGC', 'IDF', 'Pentagon', 'NATO', 'Hezbollah', 'Hamas']
  return actors.find(a => text.includes(a))
}

function tweetsToEvents(tweets: Tweet[], limit: number): CrisisEvent[] {
  return tweets.slice(0, limit).map(t => {
    const category = detectCategory(t.text)
    const level = scoreThreatLevel(t.text, '', category)
    const location = geocode(t.text)
    return {
      id: `x-grok:${hash(t.url || t.text)}`,
      title: t.text.slice(0, 120),
      summary: t.text,
      category,
      level,
      location,
      timestamp: t.time || new Date().toISOString(),
      source: `x:${t.author}`,
      sourceTier: 'private' as const,
      url: t.url,
      actor: extractActor(t.text),
    }
  })
}

const CRISIS_QUERY = 'Iran strike OR nuclear OR military attack OR conflict OR missile from:DeItaone OR from:BNONews OR from:disclosetv'

export const xGrokSource: DataSource = {
  id: 'x-grok',
  name: 'X/Grok',
  tier: 'private',

  async fetch(options?: FetchOptions): Promise<CrisisEvent[]> {
    const limit = options?.limit ?? 10

    // Try X API v2 first (fast, ~1-2s)
    const xTweets = await fetchViaXApi()
    if (xTweets.length > 0) return tweetsToEvents(xTweets, limit)

    // Fallback to Grok x_search (slower, ~15s)
    const query = options?.query ?? CRISIS_QUERY
    const grokTweets = await fetchViaGrok(query)
    return tweetsToEvents(grokTweets, limit)
  },

  async healthCheck(): Promise<boolean> {
    return !!process.env.X_BEARER_TOKEN || !!process.env.XAI_API_KEY
  },
}
