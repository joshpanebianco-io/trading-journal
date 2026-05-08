import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const colorMap = {
  green: 'text-emerald-400',
  red: 'text-red-400',
  blue: 'text-blue-400',
  yellow: 'text-yellow-400',
  purple: 'text-purple-400',
  slate: 'text-foreground',
}

export default function StatCard({ label, value, sub, color = 'slate' }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{label}</p>
        <p className={cn('text-2xl font-bold tabular-nums leading-none', colorMap[color] ?? 'text-foreground')}>
          {value}
        </p>
        {sub && <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}
