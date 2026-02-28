import { GoogleGenerativeAI } from '@google/generative-ai'

const cache = new Map<string, { text: string; ts: number }>()
const CACHE_TTL = 600_000 // 10 min

function getCached(key: string): string | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return entry.text
}

export async function translateBatch(
  items: { title: string; summary: string }[],
): Promise<{ title: string; summary: string }[]> {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey || items.length === 0) return items

  // Check cache for all items
  const results: { title: string; summary: string }[] = []
  const uncached: { index: number; title: string; summary: string }[] = []

  for (let i = 0; i < items.length; i++) {
    const cachedTitle = getCached(`t:${items[i].title}`)
    const cachedSummary = getCached(`s:${items[i].summary}`)
    if (cachedTitle && cachedSummary) {
      results[i] = { title: cachedTitle, summary: cachedSummary }
    } else {
      uncached.push({ index: i, ...items[i] })
      results[i] = items[i] // placeholder
    }
  }

  if (uncached.length === 0) return results

  // Batch translate uncached items via Gemini Flash
  const prompt = uncached.map((u, i) =>
    `[${i}] TITLE: ${u.title}\nSUMMARY: ${u.summary}`
  ).join('\n---\n')

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const res = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `Translate the following news items to Traditional Chinese (繁體中文). Keep the format exactly. Return ONLY the translations, no explanation.\n\n${prompt}`,
        }],
      }],
    })

    const text = res.response.text()
    const blocks = text.split(/---|\n\[\d+\]/).filter(Boolean)

    for (let i = 0; i < uncached.length && i < blocks.length; i++) {
      const block = blocks[i]
      const titleMatch = block.match(/TITLE:\s*(.+)/i)
      const summaryMatch = block.match(/SUMMARY:\s*([\s\S]+?)$/i)

      if (titleMatch && summaryMatch) {
        const title = titleMatch[1].trim()
        const summary = summaryMatch[1].trim()
        results[uncached[i].index] = { title, summary }
        cache.set(`t:${uncached[i].title}`, { text: title, ts: Date.now() })
        cache.set(`s:${uncached[i].summary}`, { text: summary, ts: Date.now() })
      }
    }
  } catch (err) {
    console.error('[translate] Gemini failed:', err)
  }

  return results
}
