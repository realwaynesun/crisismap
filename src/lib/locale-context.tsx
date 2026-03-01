'use client'

import { createContext, useContext, useEffect } from 'react'
import type { Locale, Dict } from './i18n'
import { dictionaries, localeConfig } from './i18n'
import { useEventStore } from '@/stores/event-store'

interface LocaleCtx {
  locale: Locale
  dict: Dict
  timezone: string
  dateLocale: string
}

const LocaleContext = createContext<LocaleCtx>({
  locale: 'en',
  dict: dictionaries.en,
  timezone: 'UTC',
  dateLocale: 'en-US',
})

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  const cfg = localeConfig[locale]
  const storeTimezone = useEventStore((s) => s.timezone)

  useEffect(() => {
    const current = useEventStore.getState().timezone
    if (current) return
    try {
      const stored = localStorage.getItem('crisismap-timezone')
      const candidate = stored ?? Intl.DateTimeFormat().resolvedOptions().timeZone
      Intl.DateTimeFormat(undefined, { timeZone: candidate })
      useEventStore.getState().setTimezone(candidate)
    } catch {
      useEventStore.getState().setTimezone(cfg.timezone)
    }
  }, [cfg.timezone])

  return (
    <LocaleContext.Provider
      value={{
        locale,
        dict: dictionaries[locale],
        timezone: storeTimezone || cfg.timezone,
        dateLocale: cfg.dateLocale,
      }}
    >
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
