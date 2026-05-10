import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, ChevronLeft, ChevronRight, Trash2, X, Download, Star } from 'lucide-react'
import { toast } from 'sonner'
import { getTrades, getTradeFilters, deleteTrade } from '@/lib/api'
import { useSettings } from '@/context/SettingsContext'
import { utcToLocal, dateToUtcStart, dateToUtcEnd } from '@/lib/timezone'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import AddTradeModal from '@/components/AddTradeModal'
import TradeModal from '@/components/TradeModal'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 15
const SESSIONS = ['Asia', 'London', 'Pre-Market', 'NY Open', 'NY Lunch', 'NY PM', 'Other']
const QUICK_RANGES = ['1W', '1M', '3M', '6M', 'YTD']

export default function TradeLog() {
  const [searchParams] = useSearchParams()
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
  const [from, setFrom] = useState(searchParams.get('from') || '')
  const [to, setTo] = useState(searchParams.get('to') || '')
  const [activeRange, setActiveRange] = useState(searchParams.get('from') || searchParams.get('to') ? 'Custom' : null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

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

  const handleDelete = (id, e) => {
    e.stopPropagation()
    setDeleteConfirm(id)
  }

  const confirmDelete = async () => {
    try {
      await deleteTrade(deleteConfirm)
      toast.success('Trade deleted')
      load()
    } catch {
      toast.error('Failed to delete trade')
    } finally {
      setDeleteConfirm(null)
    }
  }

  const handleFilter = (setter, val, sym, dir, stp, ses) => { setter(val); load(sym, dir, stp, ses, from, to) }

  const handleDateChange = (setter, val, fr, t) => {
    setter(val); setActiveRange('Custom')
    load(symbol, direction, setup, session, fr, t)
  }

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
    load(symbol, direction, setup, session, f, t)
  }

  const hasFilter = symbol || direction || setup || session || from || to
  const clear = () => {
    setSymbol(''); setDirection(''); setSetup(''); setSession(''); setFrom(''); setTo(''); setActiveRange(null)
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
        {/* Combined filter control */}
        <div className="flex items-center h-9 rounded-md border border-border bg-muted/40">
          <Select value={symbol || '_all'} onValueChange={v => { const val = v === '_all' ? '' : v; handleFilter(setSymbol, val, val, direction, setup, session) }}>
            <SelectTrigger className="border-0 shadow-none rounded-none focus:ring-0 h-full text-xs px-3 w-[120px] bg-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Symbols</SelectItem>
              {filters.symbols.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="w-px h-5 bg-border shrink-0" />

          <Select value={direction || '_all'} onValueChange={v => { const val = v === '_all' ? '' : v; handleFilter(setDirection, val, symbol, val, setup, session) }}>
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

          <Select value={setup || '_all'} onValueChange={v => { const val = v === '_all' ? '' : v; handleFilter(setSetup, val, symbol, direction, val, session) }}>
            <SelectTrigger className="border-0 shadow-none rounded-none focus:ring-0 h-full text-xs px-3 w-[120px] bg-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Setups</SelectItem>
              {filters.setups.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="w-px h-5 bg-border shrink-0" />

          <Select value={session || '_all'} onValueChange={v => { const val = v === '_all' ? '' : v; handleFilter(setSession, val, symbol, direction, setup, val) }}>
            <SelectTrigger className="border-0 shadow-none rounded-none focus:ring-0 h-full text-xs px-3 w-[120px] bg-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Sessions</SelectItem>
              {SESSIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="w-px h-5 bg-border" />

        {/* Quick ranges */}
        <div className="flex items-center h-9 rounded-md border border-border bg-muted/40 px-0.5 gap-0.5">
          {[...QUICK_RANGES, 'Custom'].map(r => (
            <button
              key={r}
              onClick={() => r === 'Custom' ? setActiveRange('Custom') : applyQuickRange(r)}
              className={cn(
                'px-3 h-7 text-xs font-medium rounded transition-colors',
                activeRange === r ? 'bg-secondary text-secondary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
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
        )}

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
              <TableHead>Session</TableHead>
              <TableHead>Setup</TableHead>
              <TableHead className="whitespace-nowrap pl-6">Duration</TableHead>
              <TableHead className="whitespace-nowrap pl-6">Rating</TableHead>
              <TableHead className="whitespace-nowrap pl-6">Points</TableHead>
              <TableHead className="whitespace-nowrap pl-6">R:R</TableHead>
              <TableHead className="whitespace-nowrap pl-6">P&L</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={11} className="text-center py-12 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : paginated.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center py-12 text-muted-foreground">No trades found</TableCell></TableRow>
            ) : paginated.map(trade => (
              <TableRow key={trade.id} onClick={() => setSelected(trade)} className="cursor-pointer group">
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
                <TableCell className="text-muted-foreground text-sm">{trade.session || '—'}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{trade.setup_tag || '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap pl-6">
                  {trade.duration || '—'}
                </TableCell>
                <TableCell className="whitespace-nowrap pl-6">
                  {trade.rating != null ? (
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={cn('h-3 w-3', trade.rating >= s ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/20')} />
                      ))}
                    </div>
                  ) : '—'}
                </TableCell>
                <TableCell className={cn('text-sm tabular-nums whitespace-nowrap pl-6', (trade.points ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {trade.points != null ? trade.points.toFixed(2) : '—'}
                </TableCell>
                <TableCell className={cn('text-sm tabular-nums whitespace-nowrap pl-6',
                  trade.r_multiple == null ? 'text-muted-foreground' : trade.r_multiple >= 1 ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {trade.r_multiple != null ? `${trade.r_multiple}R` : '—'}
                </TableCell>
                <TableCell className={cn('text-sm font-semibold tabular-nums whitespace-nowrap pl-6', (trade.pnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
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

      <Dialog open={!!deleteConfirm} onOpenChange={v => { if (!v) setDeleteConfirm(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Trade</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
