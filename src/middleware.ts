import { NextRequest, NextResponse } from 'next/server'
import { locales, defaultLocale } from '@/lib/i18n'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip API routes and static assets
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next()
  }

  // Check if path already has a locale prefix
  const hasLocale = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  )
  if (hasLocale) return NextResponse.next()

  // Detect preferred locale from Accept-Language header
  const acceptLang = request.headers.get('accept-language') ?? ''
  const preferred = acceptLang.includes('zh') ? 'zh-TW' : defaultLocale

  const url = request.nextUrl.clone()
  url.pathname = `/${preferred}${pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
