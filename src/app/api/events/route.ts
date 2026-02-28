import { NextRequest, NextResponse } from 'next/server'
import { fetchAllEvents } from '@/lib/aggregator'
import { translateBatch } from '@/lib/translate'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const locale = request.nextUrl.searchParams.get('locale')
    const events = await fetchAllEvents()

    if (locale === 'zh-TW' && events.length > 0) {
      const items = events.map(e => ({ title: e.title, summary: e.summary }))
      const translated = await translateBatch(items)
      const localizedEvents = events.map((e, i) => ({
        ...e,
        title: translated[i].title,
        summary: translated[i].summary,
      }))
      return NextResponse.json({ success: true, data: localizedEvents }, {
        headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=10' },
      })
    }

    return NextResponse.json({ success: true, data: events }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=10' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[/api/events]', message)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}
