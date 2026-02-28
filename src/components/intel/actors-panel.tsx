'use client'

import useSWR from 'swr'
import type { ActorStatus } from '@/types'
import { ActorCard } from './actor-card'

const fetcher = (url: string) =>
  fetch(url).then((r) => r.json()).then((j) => j.data ?? [])

export function ActorsPanel() {
  const { data, isLoading } = useSWR<ActorStatus[]>('/api/actors', fetcher, {
    refreshInterval: 300_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-[var(--text-secondary)]">
        Loading actors...
      </div>
    )
  }

  const actors = data ?? []

  if (!actors.length) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-[var(--text-secondary)]">
        No actor data available
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1">
      {actors.map((a) => (
        <ActorCard key={a.name} actor={a} />
      ))}
    </div>
  )
}
