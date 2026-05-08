import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const CustomTooltip = ({ active, payload, label, mode }) => {
  if (!active || !payload?.length) return null
  const v = payload[0]?.value
  const fmt = mode === 'pnl' ? `$${v?.toFixed(2)}` : `${v}%`
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="font-semibold text-foreground">{fmt}</p>
    </div>
  )
}

const CustomCursor = ({ x, y, width, height }) => {
  const barW = width * 0.75
  return <rect x={x + (width - barW) / 2} y={y} width={barW} height={height} fill="rgba(255,255,255,0.05)" rx={3} />
}

export default function DayChart({ data, mode, onModeChange }) {
  if (!data || data.length === 0) return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Performance By Day</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
          No trade data yet
        </div>
      </CardContent>
    </Card>
  )

  const enriched = data.map(d => ({
    ...d,
    winrate: d.trades > 0 ? parseFloat(((d.wins / d.trades) * 100).toFixed(1)) : 0,
  }))

  const key = mode === 'pnl' ? 'pnl' : 'winrate'
  const fmt = mode === 'pnl' ? v => `$${v}` : v => `${v}%`
  const color = (d) => {
    if (mode === 'pnl') return d.pnl >= 0 ? '#34d399' : '#f87171'
    return d.winrate >= 50 ? '#34d399' : '#f87171'
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Performance By Day</CardTitle>
          <div className="flex gap-1">
            {[['winrate', 'Win %'], ['pnl', 'P&L']].map(([m, lbl]) => (
              <Button key={m} size="sm" variant={mode === m ? 'secondary' : 'ghost'} onClick={() => onModeChange(m)} className="h-7 px-2.5 text-xs">
                {lbl}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={enriched} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={d => d.slice(0, 3)}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmt}
              width={45}
            />
            <Tooltip cursor={<CustomCursor />} content={<CustomTooltip mode={mode} />} />
            <Bar dataKey={key} radius={[4, 4, 0, 0]}>
              {enriched.map((d, i) => (
                <Cell key={i} fill={color(d)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
