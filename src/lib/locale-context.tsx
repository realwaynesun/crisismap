'use client'

import { createContext, useContext } from 'react'
import type { Locale, Dict } from './i18n'
import { dictionaries, localeConfig } from './i18n'

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
  return (
    <LocaleContext.Provider
      value={{ locale, dict: dictionaries[locale], timezone: cfg.timezone, dateLocale: cfg.dateLocale }}
    >
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
