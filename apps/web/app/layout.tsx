import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

const DESCRIPTION =
  'MARKSMAN Freight Cost Model — estructura, calcula y gobierna tarifas con precisión operativa.'

export const metadata: Metadata = {
  metadataBase: new URL('https://freight-cost-web.vercel.app'),
  title: {
    default: 'MARKSMAN · Freight Cost Model',
    template: '%s · MARKSMAN Freight Cost Model',
  },
  description: DESCRIPTION,
  applicationName: 'MARKSMAN Freight Cost Model',
  openGraph: {
    title: 'MARKSMAN · Freight Cost Model',
    description: DESCRIPTION,
    type: 'website',
    siteName: 'MARKSMAN Freight Cost Model',
  },
  robots: { index: false, follow: false }, // private carrier app
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
