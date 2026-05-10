import { useState } from 'react'
import { Upload, FileText, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { previewCSV, importCSV, clearAllTrades } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function Import() {
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [clearConfirm, setClearConfirm] = useState(false)

  const handleFile = async (f) => {
    setFile(f); setError(''); setResult(null); setPreview(null)
    try {
      const data = await previewCSV(f)
      setPreview(data)
    } catch (err) { setError(err.message) }
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true); setError('')
    try {
      const data = await importCSV(file)
      setResult(data); setPreview(null); setFile(null)
      toast.success(`Imported ${data.imported} of ${data.total} trades`)
    } catch (err) {
      setError(err.message)
      toast.error('Import failed')
    }
    finally { setImporting(false) }
  }

  const handleClearAll = async () => {
    try {
      await clearAllTrades()
      setResult({ cleared: true })
      toast.success('All trades deleted')
    } catch (err) {
      setError(err.message)
      toast.error('Failed to clear trades')
    } finally {
      setClearConfirm(false)
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold">Import Trades</h1>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg px-8 py-12 text-center transition-colors cursor-pointer',
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50'
        )}
        onClick={() => document.getElementById('csv-file-input').click()}
      >
        <input id="csv-file-input" type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]) }} />
        <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground mb-1">Drop a CSV file here</p>
        <p className="text-xs text-muted-foreground">or click to browse</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {result && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {result.cleared ? 'All trades deleted.' : `Imported ${result.imported} of ${result.total} trades.`}
        </div>
      )}

      {preview && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">{file?.name}</CardTitle>
                <Badge variant="secondary" className="text-xs">{preview.count} trades</Badge>
              </div>
              <Button size="sm" onClick={handleImport} disabled={importing}>
                {importing ? 'Importing…' : 'Import All'}
              </Button>
            </div>
            {preview.hasUnmappedData && (
              <div className="mt-2 flex items-start gap-2 rounded-md bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 text-xs text-yellow-400">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Some fields weren't recognised.</p>
                  <p className="text-yellow-600 mt-0.5">Detected columns: {preview.columns.join(', ')}</p>
                </div>
              </div>
            )}
          </CardHeader>
          <div className="max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Dir</TableHead>
                  <TableHead className="text-right">P&L</TableHead>
                  <TableHead>Session</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.trades.map((t, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs text-muted-foreground">{t.bought_timestamp?.slice(0, 10) || '—'}</TableCell>
                    <TableCell className="font-medium text-sm">{t.symbol || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={t.direction === 'long' ? 'success' : 'danger'} className="text-xs">{t.direction}</Badge>
                    </TableCell>
                    <TableCell className={cn('text-right text-sm tabular-nums', (t.pnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {(t.pnl ?? 0) >= 0 ? '+' : '-'}${Math.abs(t.pnl ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.session}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-sm text-red-400">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Permanently deletes all trade data from the database.</p>
          <Button variant="destructive" size="sm" onClick={() => setClearConfirm(true)}>
            <Trash2 className="h-4 w-4" /> Clear All Trades
          </Button>
        </CardContent>
      </Card>
      <Dialog open={clearConfirm} onOpenChange={v => { if (!v) setClearConfirm(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Clear All Trades</DialogTitle>
            <DialogDescription>This will permanently delete all trade data. This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setClearConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleClearAll}>Delete All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
