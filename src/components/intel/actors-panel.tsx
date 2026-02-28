'use client'

import useSWR from 'swr'
import type { ActorStatus } from '@/types'
import { useLocale } from '@/lib/locale-context'
import { ActorCard } from './actor-card'

const fetcher = async (url: string) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`API ${r.status}`)
  const j = await r.json()
  if (!j.success) throw new Error(j.error ?? 'API error')
  return j.data ?? []
}

export function ActorsPanel() {
  const { data, error, isLoading } = useSWR<ActorStatus[]>('/api/actors', fetcher, {
    refreshInterval: 300_000,
  })
  const { dict } = useLocale()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-[var(--text-secondary)]">
        {dict.actors.loading}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-[var(--accent-red)]">
        {dict.actors.error}: {String(error.message ?? error)}
      </div>
    )
  }

  const actors = data ?? []

  if (!actors.length) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-[var(--text-secondary)]">
        {dict.actors.empty}
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
