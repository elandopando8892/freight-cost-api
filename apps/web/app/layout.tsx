import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

const DESCRIPTION =
  'Cross-border MX–US freight pricing — cost buildup, risk-adjusted tariffs, and commercial sell tiers per lane.'

export const metadata: Metadata = {
  metadataBase: new URL('https://freight-cost-web.vercel.app'),
  title: {
    default: 'Freight Cost Model',
    template: '%s · Freight Cost Model',
  },
  description: DESCRIPTION,
  applicationName: 'Freight Cost Model',
  openGraph: {
    title: 'Freight Cost Model',
    description: DESCRIPTION,
    type: 'website',
    siteName: 'Freight Cost Model',
  },
  robots: { index: false, follow: false }, // private carrier app
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
