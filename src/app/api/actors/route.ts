import { NextResponse } from 'next/server'
import { fetchAllEvents } from '@/lib/aggregator'
import { extractActors } from '@/lib/actors'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const events = await fetchAllEvents()
    const actors = extractActors(events)
    return NextResponse.json({ success: true, data: actors }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
