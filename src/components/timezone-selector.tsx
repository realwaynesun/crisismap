'use client'

import { useState, useEffect } from 'react'
import { useEventStore } from '@/stores/event-store'
import { getTimezoneOffsetLabel } from '@/lib/format-time'

const TIMEZONE_GROUPS = [
  {
    label: 'UTC',
    zones: [{ value: 'UTC', city: 'UTC' }],
  },
  {
    label: 'Americas',
    zones: [
      { value: 'America/New_York', city: 'New York' },
      { value: 'America/Chicago', city: 'Chicago' },
      { value: 'America/Denver', city: 'Denver' },
      { value: 'America/Los_Angeles', city: 'Los Angeles' },
    ],
  },
  {
    label: 'Europe',
    zones: [
      { value: 'Europe/London', city: 'London' },
      { value: 'Europe/Paris', city: 'Paris' },
      { value: 'Europe/Berlin', city: 'Berlin' },
    ],
  },
  {
    label: 'Asia-Pacific',
    zones: [
      { value: 'Asia/Kolkata', city: 'Kolkata' },
      { value: 'Asia/Shanghai', city: 'Shanghai' },
      { value: 'Asia/Taipei', city: 'Taipei' },
      { value: 'Asia/Tokyo', city: 'Tokyo' },
      { value: 'Australia/Sydney', city: 'Sydney' },
    ],
  },
  {
    label: 'Africa / Middle East',
    zones: [
      { value: 'Africa/Cairo', city: 'Cairo' },
      { value: 'Asia/Dubai', city: 'Dubai' },
      { value: 'Africa/Johannesburg', city: 'Johannesburg' },
    ],
  },
]

const ALL_VALUES = new Set(
  TIMEZONE_GROUPS.flatMap((g) => g.zones.map((z) => z.value)),
)

function getCityName(tz: string): string {
  const parts = tz.split('/')
  return parts[parts.length - 1].replace(/_/g, ' ')
}

export function TimezoneSelector() {
  const [mounted, setMounted] = useState(false)
  const timezone = useEventStore((s) => s.timezone)
  const setTimezone = useEventStore((s) => s.setTimezone)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div className="shrink-0 w-24 h-[26px] bg-[var(--bg-tertiary)] rounded-md animate-pulse" />
    )
  }

  const tz = timezone || 'UTC'
  const showLocal = tz !== 'UTC' && !ALL_VALUES.has(tz)

  return (
    <div className="shrink-0 relative">
      <select
        value={tz}
        onChange={(e) => setTimezone(e.target.value)}
        className="appearance-none bg-transparent text-[10px] font-semibold text-[var(--text-secondary)] border border-[var(--border)] rounded-md px-2 py-1 pr-5 hover:border-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        aria-label="Select timezone"
        title="Select timezone"
      >
        {showLocal && (
          <optgroup label="Local">
            <option value={tz}>
              {getTimezoneOffsetLabel(tz)} {getCityName(tz)}
            </option>
          </optgroup>
        )}
        {TIMEZONE_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.zones.map((z) => (
              <option key={z.value} value={z.value}>
                {getTimezoneOffsetLabel(z.value)} {z.city}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-[8px]">
        ▼
      </span>
    </div>
  )
}
