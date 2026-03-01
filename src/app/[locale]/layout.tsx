import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { locales, getDict } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'
import '../globals.css'

interface Props {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

const themeScript = `(function(){try{var d=document.documentElement;var s=JSON.parse(localStorage.getItem('crisismap-theme'));var t=s&&s.state&&s.state.theme;if(!t){t=matchMedia('(prefers-color-scheme:light)').matches?'light':'dark'}d.classList.remove('light','dark');d.classList.add(t)}catch(e){document.documentElement.classList.add('dark')}})();`

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
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
