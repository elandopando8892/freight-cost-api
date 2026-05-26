import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const TILES = [
  {
    href: '/assumptions',
    title: 'Assumptions',
    desc: 'Edit your cost cards, factors and high-level assumptions. Recommended values, range warnings, reset.',
  },
  {
    href: '/quote',
    title: 'Quote by route',
    desc: 'Price a lane by ZIP/metro. MX + USA legs, sell tiers, ReferenceKey, flags. (coming)',
  },
  {
    href: '/fuel',
    title: 'Fuel & FSC',
    desc: 'Current diesel by region, USA state FSC, historical trend. (coming)',
  },
]

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((t) => (
          <Link key={t.href} href={t.href} className="block">
            <Card className="h-full transition hover:border-foreground/40">
              <CardHeader>
                <CardTitle>{t.title}</CardTitle>
                <CardDescription>{t.desc}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>
    </main>
  )
}
