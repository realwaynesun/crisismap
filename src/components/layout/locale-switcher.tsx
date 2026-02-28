'use client'

import { useLocale } from '@/lib/locale-context'
import { usePathname, useRouter } from 'next/navigation'
import type { Locale } from '@/lib/i18n'

const labels: Record<Locale, string> = {
  en: 'EN',
  'zh-TW': '\u7E41',
}

export function LocaleSwitcher() {
  const { locale } = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  const switchTo: Locale = locale === 'en' ? 'zh-TW' : 'en'

  const handleSwitch = () => {
    const segments = pathname.split('/')
    segments[1] = switchTo
    router.push(segments.join('/'))
  }

  return (
    <button
      onClick={handleSwitch}
      className="shrink-0 px-2 py-1 rounded-md text-[10px] font-semibold text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      title={switchTo === 'zh-TW' ? '\u5207\u63DB\u81F3\u7E41\u9AD4\u4E2D\u6587' : 'Switch to English'}
    >
      {labels[switchTo]}
    </button>
  )
}
