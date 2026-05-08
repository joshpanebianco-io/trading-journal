import { useState, useEffect } from 'react'
import { Plus, ChevronLeft, ChevronRight, Trash2, X, Download } from 'lucide-react'
import { getTrades, getTradeFilters, deleteTrade } from '@/lib/api'
import { useSettings } from '@/context/SettingsContext'
import { utcToLocal, dateToUtcStart, dateToUtcEnd } from '@/lib/timezone'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import AddTradeModal from '@/components/AddTradeModal'
import TradeModal from '@/components/TradeModal'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10
const SESSIONS = ['Asia', 'London', 'Pre-Market', 'NY Open', 'NY Lunch', 'NY PM', 'Other']

export default function TradeLog() {
  const [trades, setTrades] = useState([])
  const [filters, setFilters] = useState({ symbols: [], setups: [] })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState(null)
  const [symbol, setSymbol] = useState('')
  const [direction, setDirection] = useState('')
  const [setup, setSetup] = useState('')
  const [session, setSession] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { timezone } = useSettings()

  const load = async (sym = symbol, dir = direction, stp = setup, ses = session, fr = from, t = to) => {
    setLoading(true)
    try {
      const data = await getTrades({
        symbol: sym || undefined, direction: dir || undefined,
        setup: stp || undefined, session: ses || undefined,
        from: fr ? dateToUtcStart(fr, timezone) : undefined,
        to:   t  ? dateToUtcEnd(t, timezone)    : undefined,
      })
      setTrades(data); setPage(1)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    getTradeFilters().then(setFilters).catch(() => {})
    load()
  }, [])

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this trade?')) return
    await deleteTrade(id); load()
  }

  const handleFilter = (setter, val, sym, dir, stp, ses) => { setter(val); load(sym, dir, stp, ses, from, to) }

  const handleDateChange = (setter, val, fr, t) => {
    setter(val)
    load(symbol, direction, setup, session, fr, t)
  }

  const hasFilter = symbol || direction || setup || session || from || to
  const clear = () => {
    setSymbol(''); setDirection(''); setSetup(''); setSession(''); setFrom(''); setTo('')
    load('', '', '', '', '', '')
  }

  const exportCsv = () => {
    const headers = ['Date', 'Symbol', 'Direction', 'Setup', 'Session', 'Entry Price', 'Exit Price', 'Qty', 'Stop Loss', 'Points', 'R:R', 'P&L', 'Duration', 'Rating', 'Notes']
    const rows = trades.map(t => {
      const local = t.bought_timestamp ? utcToLocal(t.bought_timestamp, timezone) : ''
      return [
        local ? `${local.slice(8,10)}-${local.slice(5,7)}-${local.slice(0,4)} ${local.slice(11,16)}` : '',
        t.symbol ?? '',
        t.direction ?? '',
        t.setup_tag ?? '',
        t.session ?? '',
        t.buy_price ?? '',
        t.sell_price ?? '',
        t.qty ?? '',
        t.stop_loss ?? '',
        t.points ?? '',
        t.r_multiple ?? '',
        t.pnl ?? '',
        t.duration ?? '',
        t.rating ?? '',
        `"${(t.notes ?? '').replace(/"/g, '""')}"`,
      ]
    })
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trades-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.max(1, Math.ceil(trades.length / PAGE_SIZE))
  const paginated = trades.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Trade Log</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={trades.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Add Trade
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={symbol || '_all'} onValueChange={v => { const val = v === '_all' ? '' : v; handleFilter(setSymbol, val, val, direction, setup, session) }}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Symbols</SelectItem>
            {filters.symbols.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={direction || '_all'} onValueChange={v => { const val = v === '_all' ? '' : v; handleFilter(setDirection, val, symbol, val, setup, session) }}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Directions</SelectItem>
            <SelectItem value="long">Long</SelectItem>
            <SelectItem value="short">Short</SelectItem>
          </SelectContent>
        </Select>

        <Select value={setup || '_all'} onValueChange={v => { const val = v === '_all' ? '' : v; handleFilter(setSetup, val, symbol, direction, val, session) }}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Setups</SelectItem>
            {filters.setups.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={session || '_all'} onValueChange={v => { const val = v === '_all' ? '' : v; handleFilter(setSession, val, symbol, direction, setup, val) }}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Sessions</SelectItem>
            {SESSIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="w-px h-5 bg-border" />

        {/* Custom date range */}
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={from}
            onChange={e => handleDateChange(setFrom, e.target.value, e.target.value, to)}
            className="w-[130px] h-9 text-xs px-2"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            type="date"
            value={to}
            onChange={e => handleDateChange(setTo, e.target.value, from, e.target.value)}
            className="w-[130px] h-9 text-xs px-2"
          />
        </div>

        {hasFilter && (
          <Button variant="ghost" size="sm" onClick={clear} className="h-9 gap-1 text-xs text-muted-foreground px-2">
            <X className="h-3 w-3" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Setup</TableHead>
              <TableHead>Session</TableHead>
              <TableHead className="text-right">Points</TableHead>
              <TableHead className="text-right">R:R</TableHead>
              <TableHead className="text-right">P&L</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : paginated.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No trades found</TableCell></TableRow>
            ) : paginated.map(trade => (
              <TableRow key={trade.id} onClick={() => setSelected(trade)} className="cursor-pointer">
                <TableCell className="text-muted-foreground text-xs">
                  {trade.bought_timestamp ? (() => {
                    const local = utcToLocal(trade.bought_timestamp, timezone)
                    return (
                      <div className="leading-tight">
                        <div>{local.slice(8, 10)}-{local.slice(5, 7)}-{local.slice(0, 4)}</div>
                        <div className="text-[10px] text-muted-foreground/70">{local.slice(11, 16)} {timezone}</div>
                      </div>
                    )
                  })() : '—'}
                </TableCell>
                <TableCell className="font-medium">{trade.symbol}</TableCell>
                <TableCell>
                  <Badge variant={trade.direction === 'long' ? 'success' : 'danger'}>{trade.direction}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{trade.setup_tag || '—'}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{trade.session || '—'}</TableCell>
                <TableCell className={cn('text-right text-sm tabular-nums', (trade.points ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {trade.points != null ? trade.points.toFixed(2) : '—'}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                  {trade.r_multiple != null ? `${trade.r_multiple}R` : '—'}
                </TableCell>
                <TableCell className={cn('text-right text-sm font-semibold tabular-nums', (trade.pnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {(trade.pnl ?? 0) >= 0 ? '+' : '-'}${Math.abs(trade.pnl ?? 0).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:text-red-400"
                    onClick={e => handleDelete(trade.id, e)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{trades.length} trade{trades.length !== 1 ? 's' : ''}</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs">Page {page} of {totalPages}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <AddTradeModal open={showAdd} onOpenChange={setShowAdd} onSaved={() => { setShowAdd(false); load() }} />
      {selected && (
        <TradeModal trade={selected} open={!!selected} onOpenChange={v => { if (!v) setSelected(null) }} onSaved={() => { setSelected(null); load() }} />
      )}
    </div>
  )
}
