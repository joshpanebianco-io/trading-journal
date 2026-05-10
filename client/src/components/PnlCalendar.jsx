import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const pad = n => String(n).padStart(2, '0')

export default function PnlCalendar({ byDate }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const navigate = useNavigate()

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const totalDays = new Date(year, month + 1, 0).getDate()
  const startDay = new Date(year, month, 1).getDay()

  const monthlyPnl = Object.entries(byDate ?? {}).reduce((sum, [date, info]) => {
    const [y, m] = date.split('-').map(Number)
    return y === year && m === month + 1 ? sum + info.pnl : sum
  }, 0)
  const monthlyPnlFmt = `${monthlyPnl >= 0 ? '+' : '-'}$${Math.abs(monthlyPnl).toFixed(2)}`

  const cells = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>P&L Calendar</CardTitle>
            {monthlyPnl !== 0 && (
              <span className={cn('text-sm font-bold tabular-nums', monthlyPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {monthlyPnlFmt}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={prev} className="h-7 w-7">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-foreground w-36 text-center">{MONTHS[month]} {year}</span>
            <Button variant="ghost" size="icon" onClick={next} className="h-7 w-7">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs text-muted-foreground py-1 font-medium">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} className="min-h-[52px]" />
            const key = `${year}-${pad(month + 1)}-${pad(day)}`
            const info = byDate?.[key]
            const isToday = key === `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
            return (
              <div
                key={key}
                onClick={() => info && navigate(`/trades?from=${key}&to=${key}`)}
                className={cn(
                  'min-h-[52px] rounded-md p-1.5 relative flex items-center justify-center text-xs border transition-colors',
                  info
                    ? info.pnl > 0
                      ? 'bg-emerald-500/10 border-emerald-500/20 cursor-pointer hover:bg-emerald-500/20'
                      : 'bg-red-500/10 border-red-500/20 cursor-pointer hover:bg-red-500/20'
                    : 'bg-muted/30 border-transparent',
                  isToday && !info && 'border-primary/30'
                )}
              >
                <span className={cn('absolute top-1.5 left-1.5 font-medium leading-none', isToday ? 'text-primary' : 'text-muted-foreground')}>
                  {day}
                </span>
                {info && (
                  <>
                    <span className={cn('font-semibold tabular-nums text-center', info.pnl > 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {info.pnl > 0 ? '+' : '-'}${Math.abs(info.pnl)}
                    </span>
                    <span className="absolute bottom-1.5 right-1.5 text-[10px] text-muted-foreground leading-none">{info.trades}t</span>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
