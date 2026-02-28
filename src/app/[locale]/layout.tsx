import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { locales, getDict } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'
import '../globals.css'

interface Props {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const dict = getDict(locale as Locale)
  return {
    title: dict.meta.title,
    description: dict.meta.description,
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  if (!locales.includes(locale as Locale)) notFound()

  return (
    <html lang={locale} className="dark">
      <body className="antialiased">{children}</body>
    </html>
  )
}
