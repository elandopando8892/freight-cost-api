'use client'

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'

/** Mini bar chart of saved-quote volume per day. Buckets are computed server-side. */
export function QuotesChart({ data }: { data: { label: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: 'rgba(127,127,127,0.12)' }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(127,127,127,0.25)' }}
          labelStyle={{ fontWeight: 600 }}
        />
        <Bar dataKey="count" name="Quotes" fill="#6366f1" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
