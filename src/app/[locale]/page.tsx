import type { Locale } from '@/lib/i18n'
import { Dashboard } from '@/components/layout/dashboard'
import { LocaleProvider } from '@/lib/locale-context'
import { ThemeProvider } from '@/components/layout/theme-provider'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function Home({ params }: Props) {
  const { locale } = await params
  return (
    <ThemeProvider>
      <LocaleProvider locale={locale as Locale}>
        <Dashboard />
      </LocaleProvider>
    </ThemeProvider>
  )
}
