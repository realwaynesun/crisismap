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

const CRISIS_QUERY = 'Iran strike OR nuclear OR military attack OR conflict OR missile from:DeItaone OR from:BNONews OR from:disclosetv'

export const xGrokSource: DataSource = {
  id: 'x-grok',
  name: 'X/Grok',
  tier: 'private',

  async fetch(options?: FetchOptions): Promise<CrisisEvent[]> {
    const apiKey = process.env.XAI_API_KEY
    if (!apiKey) return []

    const query = options?.query ?? CRISIS_QUERY

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
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) {
      console.error(`[x-grok] API error: ${res.status}`)
      return []
    }

    const json = await res.json()
    const content = extractContent(json)

    let tweets: Array<{ text: string; author: string; time: string; url: string }>
    try {
      const match = content.match(/\[[\s\S]*\]/)
      tweets = match ? JSON.parse(match[0]) : []
    } catch {
      return []
    }

    return tweets.slice(0, options?.limit ?? 10).map(t => {
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
  },

  async healthCheck(): Promise<boolean> {
    return !!process.env.XAI_API_KEY
  },
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
