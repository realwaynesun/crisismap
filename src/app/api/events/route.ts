import { NextResponse } from 'next/server'
import { fetchAllEvents } from '@/lib/aggregator'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const events = await fetchAllEvents()
    return NextResponse.json({ success: true, data: events })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[/api/events]', message)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}
