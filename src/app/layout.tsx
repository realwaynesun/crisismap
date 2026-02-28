import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CrisisMap — Real-Time Geopolitical Intelligence',
  description: 'Live geopolitical crisis tracking with multi-source intelligence',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  )
}
