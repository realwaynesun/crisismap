import type { Dict } from './i18n'

interface FormatOpts {
  dict?: Dict
  timezone?: string
  dateLocale?: string
}

export function timeAgo(timestamp: string, opts?: FormatOpts): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const minutes = Math.floor(diff / 60_000)
  const t = opts?.dict?.time

  if (minutes < 1) return t?.now ?? 'now'
  if (minutes < 60) return (t?.mAgo ?? '{n}m ago').replace('{n}', String(minutes))
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return (t?.hAgo ?? '{n}h ago').replace('{n}', String(hours))
  const days = Math.floor(hours / 24)
  return (t?.dAgo ?? '{n}d ago').replace('{n}', String(days))
}

export function formatHour(timestamp: string, opts?: FormatOpts): string {
  return new Date(timestamp).toLocaleTimeString(opts?.dateLocale ?? 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: opts?.timezone ?? 'UTC',
  })
}

export function formatDateTime(timestamp: string, opts?: FormatOpts): string {
  return new Date(timestamp).toLocaleString(opts?.dateLocale ?? 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: opts?.timezone ?? 'UTC',
  })
}
