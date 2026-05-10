import { useState, useEffect, useCallback } from 'react'
import { getStats, getTradeFilters } from '@/lib/api'
import { useSettings } from '@/context/SettingsContext'
import { dateToUtcStart, dateToUtcEnd } from '@/lib/timezone'
import StatCard from '@/components/StatCard'
import EquityCurve from '@/components/EquityCurve'
import DayChart from '@/components/DayChart'
import PnlCalendar from '@/components/PnlCalendar'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const SESSIONS = ['Asia', 'London', 'Pre-Market', 'NY Open', 'NY Lunch', 'NY PM', 'Other']
const QUICK_RANGES = ['1W', '1M', '3M', '6M', 'YTD']

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ symbols: [], setups: [] })
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [symbol, setSymbol] = useState('')
  const [direction, setDirection] = useState('')
  const [setup, setSetup] = useState('')
  const [session, setSession] = useState('')
  const [dayMode, setDayMode] = useState('winrate')
  const [streakMode, setStreakMode] = useState('win')
  const [activeRange, setActiveRange] = useState(null)

  const { timezone } = useSettings()

  const fetchStats = useCallback(async (fr, to_, sym, dir, stp, ses) => {
    try {
      const data = await getStats({
        from: fr ? dateToUtcStart(fr, timezone) : null,
        to:   to_ ? dateToUtcEnd(to_, timezone) : null,
        symbol: sym || null, direction: dir || null, setup: stp || null, session: ses || null,
        timezone,
      })
      setStats(data)
    } catch { /* server error shown as empty */ }
    finally { setLoading(false) }
  }, [timezone])

  useEffect(() => {
    getTradeFilters().then(setFilters).catch(() => {})
    fetchStats('', '', '', '', '', '')
  }, [fetchStats])

  const applyQuickRange = (range) => {
    const now = new Date()
    let start = new Date()
    if (range === '1W') start.setDate(now.getDate() - 7)
    else if (range === '1M') start.setMonth(now.getMonth() - 1)
    else if (range === '3M') start.setMonth(now.getMonth() - 3)
    else if (range === '6M') start.setMonth(now.getMonth() - 6)
    else if (range === 'YTD') start = new Date(now.getFullYear(), 0, 1)
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const f = fmt(start), t = fmt(now)
    setFrom(f); setTo(t); setActiveRange(range)
    fetchStats(f, t, symbol, direction, setup, session)
  }

  const handleDateChange = (setter, val, fr, to_, sym, dir, stp, ses) => {
    setter(val); setActiveRange('Custom')
    fetchStats(fr, to_, sym, dir, stp, ses)
  }

  const hasFilter = from || to || symbol || direction || setup || session
  const clear = () => {
    setFrom(''); setTo(''); setSymbol(''); setDirection(''); setSetup(''); setSession(''); setActiveRange(null)
    fetchStats('', '', '', '', '', '')
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Loading…</div>
  if (!stats) return null

  const { summary, equityCurve, byDay, byDate } = stats
  const pnlPos = summary.totalPnl >= 0
  const pnlFmt = v => `${v >= 0 ? '+' : '-'}$${Math.abs(v).toFixed(2)}`

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl mx-auto pt-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
          {/* Combined filter control */}
          <div className="flex items-center h-9 rounded-md border border-border bg-muted/40">
            <Select value={symbol || '_all'} onValueChange={v => { const val = v === '_all' ? '' : v; setSymbol(val); fetchStats(from, to, val, direction, setup, session) }}>
              <SelectTrigger className="border-0 shadow-none rounded-none focus:ring-0 h-full text-xs px-3 w-[120px] bg-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Symbols</SelectItem>
                {filters.symbols.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="w-px h-5 bg-border shrink-0" />

            <Select value={direction || '_all'} onValueChange={v => { const val = v === '_all' ? '' : v; setDirection(val); fetchStats(from, to, symbol, val, setup, session) }}>
              <SelectTrigger className="border-0 shadow-none rounded-none focus:ring-0 h-full text-xs px-3 w-[120px] bg-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Directions</SelectItem>
                <SelectItem value="long">Long</SelectItem>
                <SelectItem value="short">Short</SelectItem>
              </SelectContent>
            </Select>

            <div className="w-px h-5 bg-border shrink-0" />

            <Select value={setup || '_all'} onValueChange={v => { const val = v === '_all' ? '' : v; setSetup(val); fetchStats(from, to, symbol, direction, val, session) }}>
              <SelectTrigger className="border-0 shadow-none rounded-none focus:ring-0 h-full text-xs px-3 w-[120px] bg-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Setups</SelectItem>
                {filters.setups.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="w-px h-5 bg-border shrink-0" />

            <Select value={session || '_all'} onValueChange={v => { const val = v === '_all' ? '' : v; setSession(val); fetchStats(from, to, symbol, direction, setup, val) }}>
              <SelectTrigger className="border-0 shadow-none rounded-none focus:ring-0 h-full text-xs px-3 w-[120px] bg-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Sessions</SelectItem>
                {SESSIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Vertical separator */}
          <div className="w-px h-5 bg-border" />

          {/* Quick range toggles */}
          <div className="flex items-center h-9 rounded-md border border-border bg-muted/40 px-0.5 gap-0.5">
            {[...QUICK_RANGES, 'Custom'].map(r => (
              <button
                key={r}
                onClick={() => r === 'Custom' ? setActiveRange('Custom') : applyQuickRange(r)}
                className={cn(
                  'px-3 h-7 text-xs font-medium rounded transition-colors',
                  activeRange === r
                    ? 'bg-secondary text-secondary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Custom date range — only shown when Custom is active */}
          {activeRange === 'Custom' && (
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={from}
                onChange={e => handleDateChange(setFrom, e.target.value, e.target.value, to, symbol, direction, setup, session)}
                className="w-[130px] h-9 text-xs px-2"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <Input
                type="date"
                value={to}
                onChange={e => handleDateChange(setTo, e.target.value, from, e.target.value, symbol, direction, setup, session)}
                className="w-[130px] h-9 text-xs px-2"
              />
            </div>
          )}

          {hasFilter && (
            <Button variant="ghost" size="sm" onClick={clear} className="h-9 gap-1 text-xs text-muted-foreground px-2">
              <X className="h-3 w-3" /> Clear
            </Button>
          )}
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 !mt-4">
        <StatCard label="Total P&L" value={summary.totalPnl === 0 ? '—' : pnlFmt(summary.totalPnl)} color={summary.totalPnl === 0 ? 'blue' : pnlPos ? 'green' : 'red'} />
        <StatCard label="Win Rate" value={summary.winRate === 0 ? '—' : `${summary.winRate}%`} color={summary.winRate === 0 ? 'blue' : summary.winRate >= 50 ? 'green' : 'red'} />
        <StatCard label="Profit Factor" value={summary.profitFactor === 0 ? '—' : summary.profitFactor} color={summary.profitFactor === 0 ? 'blue' : summary.profitFactor >= 1.5 ? 'green' : summary.profitFactor >= 1 ? 'yellow' : 'red'} />
        <StatCard label="Avg R:R" value={summary.avgRR != null ? `${summary.avgRR}R` : '—'} color={summary.avgRR == null ? 'blue' : summary.avgRR >= 1 ? 'green' : 'red'} />
        <StatCard label="Total R" value={summary.totalR != null ? `${summary.totalR}R` : '—'} color={summary.totalR == null ? 'blue' : summary.totalR >= 1 ? 'green' : 'red'} />
        <StatCard label="Total Trades" value={summary.totalTrades} sub={`${summary.wins}W / ${summary.losses}L`} color="blue" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Best Trade" value={summary.bestTrade === 0 ? '—' : `+$${summary.bestTrade}`} color={summary.bestTrade === 0 ? 'blue' : 'green'} />
        <StatCard label="Worst Trade" value={summary.worstTrade === 0 ? '—' : `-$${Math.abs(summary.worstTrade).toFixed(2)}`} color={summary.worstTrade === 0 ? 'blue' : 'red'} />
        <StatCard label="Avg Win" value={summary.avgWin === 0 ? '—' : `+$${summary.avgWin}`} color={summary.avgWin === 0 ? 'blue' : 'green'} />
        <StatCard label="Avg Loss" value={summary.avgLoss === 0 ? '—' : `-$${summary.avgLoss}`} color={summary.avgLoss === 0 ? 'blue' : 'red'} />
        <Card>
          <CardContent className="p-4 relative">
            <div className="absolute top-3 right-3 flex items-center rounded border border-border bg-muted/40 p-0.5 gap-0.5">
              {['win', 'loss'].map(m => (
                <button key={m} onClick={() => setStreakMode(m)}
                  className={cn('px-2 py-0.5 text-[10px] font-medium rounded transition-colors',
                    streakMode === m ? 'bg-secondary text-secondary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}>
                  {m === 'win' ? 'W' : 'L'}
                </button>
              ))}
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{streakMode === 'win' ? 'Best Streak' : 'Worst Streak'}</p>
            <p className={cn('text-2xl font-bold tabular-nums leading-none',
              (streakMode === 'win' ? summary.maxWinStreak : summary.maxLossStreak) === 0
                ? 'text-blue-400'
                : streakMode === 'win' ? 'text-emerald-400' : 'text-red-400'
            )}>
              {streakMode === 'win'
                ? (summary.maxWinStreak === 0 ? '—' : summary.maxWinStreak)
                : (summary.maxLossStreak === 0 ? '—' : summary.maxLossStreak)}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground uppercase">{streakMode === 'win' ? 'win streak' : 'loss streak'}</p>
          </CardContent>
        </Card>
        <StatCard label="Avg Duration" value={summary.avgDuration ?? '—'} color="blue" />
      </div>

      {/* Streak badge */}
      {summary.currentStreak > 0 && (
        <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${summary.currentStreakType === 'win' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
          {summary.currentStreakType === 'win' ? '🔥' : '❄️'} {summary.currentStreak} {summary.currentStreakType} streak
        </div>
      )}

      <EquityCurve data={equityCurve} />
      <DayChart data={byDay} mode={dayMode} onModeChange={setDayMode} />
      <PnlCalendar byDate={byDate} />
    </div>
  )
}
