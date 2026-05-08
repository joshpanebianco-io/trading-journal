import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const fmtDate = (d) => {
  if (!d) return ''
  const [y, m, dd] = d.split('-')
  return `${dd}-${m}-${y}`
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="text-muted-foreground mb-1">{fmtDate(label)}</p>
      <p className="font-semibold text-foreground">${payload[0]?.value?.toFixed(2)}</p>
    </div>
  )
}

export default function EquityCurve({ data }) {
  if (!data || data.length === 0) return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Equity Curve</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
          No trade data yet
        </div>
      </CardContent>
    </Card>
  )

  // Collapse to one point per trading day (last trade of the day = end-of-day P&L)
  const dailyMap = {}
  data.forEach(p => { if (p.date) dailyMap[p.date] = p.cumulative })
  const daily = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cumulative]) => ({ date, cumulative }))

  const isPositive = (daily[daily.length - 1]?.cumulative ?? 0) >= 0
  const color = isPositive ? '#34d399' : '#f87171'

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Equity Curve</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={daily} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              tickFormatter={fmtDate}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `$${v}`}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="cumulative" stroke={color} strokeWidth={2} fill="url(#equityGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
