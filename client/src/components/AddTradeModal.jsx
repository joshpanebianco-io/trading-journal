import { useState } from 'react'
import { Plus, ImagePlus, Trash2, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { addTrade, uploadScreenshot } from '@/lib/api'
import { useSettings } from '@/context/SettingsContext'
import { localToUtc } from '@/lib/timezone'

const SESSIONS = ['Asia', 'London', 'Pre-Market', 'NY Open', 'NY Lunch', 'NY PM', 'Other']
const SETUPS = ['9EMA Pullback', 'VWAP Reclaim', 'VWAP Rejection', 'POC Bounce', 'VAH Break', 'VAL Break', 'iFVG', 'CISD']

const EMPTY = {
  symbol: '', qty: '', direction: 'long', buy_price: '', sell_price: '',
  pnl: '', bought_timestamp: '', sold_timestamp: '', stop_loss: '',
  setup_tag: '', session: '', notes: '', rating: '',
}

function calcDuration(bought, sold) {
  if (!bought || !sold) return ''
  const diff = (new Date(sold) - new Date(bought)) / 1000
  if (diff <= 0) return ''
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export default function AddTradeModal({ open, onOpenChange, onSaved }) {
  const { timezone } = useSettings()
  const [form, setForm] = useState(EMPTY)
  const [screenshot, setScreenshot] = useState(null)
  const [screenshotPreview, setScreenshotPreview] = useState(null)
  const [lightbox, setLightbox] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.symbol || !form.buy_price || !form.sell_price) {
      setError('Symbol, entry price, and exit price are required.')
      return
    }
    setSaving(true); setError('')
    try {
      const boughtUtc = localToUtc(form.bought_timestamp, timezone)
      const soldUtc   = localToUtc(form.sold_timestamp,   timezone)
      const trade = await addTrade({
        ...form,
        bought_timestamp: boughtUtc,
        sold_timestamp:   soldUtc,
        qty: form.qty ? parseFloat(form.qty) : null,
        buy_price: parseFloat(form.buy_price),
        sell_price: parseFloat(form.sell_price),
        pnl: form.pnl ? parseFloat(form.pnl) : null,
        stop_loss: form.stop_loss ? parseFloat(form.stop_loss) : null,
        rating: form.rating ? parseInt(form.rating) : null,
        duration: calcDuration(form.bought_timestamp, form.sold_timestamp),
      })
      if (screenshot && trade.id) await uploadScreenshot(trade.id, screenshot)
      setForm(EMPTY); setScreenshot(null); setScreenshotPreview(null); setLightbox(null)
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightbox}
            alt="Screenshot"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

    <Dialog open={open} onOpenChange={v => { if (lightbox) { setLightbox(null); return; } onOpenChange(v) }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Trade</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Symbol *">
                <Input value={form.symbol} onChange={e => set('symbol', e.target.value.toUpperCase())} placeholder="ES, NQ, SPY…" />
              </Field>
              <Field label="Direction">
                <Select value={form.direction} onValueChange={v => set('direction', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="long">Long</SelectItem>
                    <SelectItem value="short">Short</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Entry Price *">
                <Input type="number" step="any" value={form.buy_price} onChange={e => set('buy_price', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Exit Price *">
                <Input type="number" step="any" value={form.sell_price} onChange={e => set('sell_price', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Qty">
                <Input type="number" step="any" value={form.qty} onChange={e => set('qty', e.target.value)} placeholder="1" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="P&L ($)">
                <Input type="number" step="any" value={form.pnl} onChange={e => set('pnl', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Stop Loss">
                <Input type="number" step="any" value={form.stop_loss} onChange={e => set('stop_loss', e.target.value)} placeholder="0.00" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Entry Time">
                <Input type="datetime-local" value={form.bought_timestamp} onChange={e => set('bought_timestamp', e.target.value)} />
              </Field>
              <Field label="Exit Time">
                <Input type="datetime-local" value={form.sold_timestamp} onChange={e => set('sold_timestamp', e.target.value)} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Setup">
                <Select value={form.setup_tag || '_none'} onValueChange={v => set('setup_tag', v === '_none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">—</SelectItem>
                    {SETUPS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Session">
                <Select value={form.session || '_none'} onValueChange={v => set('session', v === '_none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">—</SelectItem>
                    {SESSIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Rating (1–5)">
              <Select value={form.rating || '_none'} onValueChange={v => set('rating', v === '_none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">—</SelectItem>
                  {[1,2,3,4,5].map(r => <SelectItem key={r} value={String(r)}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Screenshot">
              {screenshot ? (
                <div className="space-y-2">
                  <img
                    src={screenshotPreview}
                    alt="Preview"
                    className="w-full rounded-lg object-contain border border-border cursor-zoom-in hover:opacity-90 transition-opacity max-h-48"
                    onClick={() => setLightbox(screenshotPreview)}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground truncate flex-1">{screenshot.name}</span>
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-red-400 hover:text-red-300" onClick={() => { setScreenshot(null); setScreenshotPreview(null) }}>
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <label
                  className={`flex flex-col h-20 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border-2 border-dashed text-sm transition-colors ${dragging ? 'border-primary bg-primary/5 text-primary' : 'border-input text-muted-foreground hover:border-muted-foreground/50 hover:bg-accent'}`}
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) { setScreenshot(f); setScreenshotPreview(URL.createObjectURL(f)) } }}
                >
                  <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (f) { setScreenshot(f); setScreenshotPreview(URL.createObjectURL(f)) } }} className="hidden" />
                  <ImagePlus className="h-5 w-5" />
                  <span>Drop image or click to browse</span>
                </label>
              )}
            </Field>

            <Field label="Notes">
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Trade notes…" rows={2} />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              <Plus className="h-4 w-4" />
              {saving ? 'Saving…' : 'Add Trade'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
