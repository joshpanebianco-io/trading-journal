// Broker CSV parsing, ported from the old Express server (server/routes/upload.js)
// to run in the browser. Column auto-detection, number/timestamp normalisation,
// direction inference and the import-hash dedupe key all match the server exactly,
// so re-importing a file that was previously imported server-side stays idempotent.

import Papa from 'papaparse'
import { getSession, getDayOfWeek, getHourOfDay, getPoints, calculateRMultiple, makeImportHash } from './calculations'
import { localToUtc } from './timezone'

// Strip $, commas; handle -$110.00 and accounting (5.00) notation
function parseNum(val, fallback = 0) {
  if (val == null || val === '') return fallback
  const s = String(val).trim()
  if (s.startsWith('(') && s.endsWith(')')) {
    const n = parseFloat(s.slice(1, -1).replace(/[$,]/g, ''))
    return isNaN(n) ? fallback : -n
  }
  const n = parseFloat(s.replace(/[$,]/g, ''))
  return isNaN(n) ? fallback : n
}

// Pick first truthy value from a list of possible column names
function pick(row, ...keys) {
  for (const k of keys) if (row[k] != null && row[k] !== '') return row[k]
  return undefined
}

// Convert Tradovate MM/DD/YYYY HH:MM:SS → ISO YYYY-MM-DDTHH:MM:SS
function parseTimestamp(val) {
  if (!val) return ''
  const s = String(val).trim()
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/)
  if (m) {
    const [, mm, dd, yyyy, hh, min, sec] = m
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${hh}:${min}:${sec}`
  }
  return s
}

function parseRow(row, timezone) {
  const symbol = (pick(row, 'symbol', 'Symbol', 'Contract', 'contractName', 'Instrument', 'instrument') || '').toUpperCase()
  const qty = parseNum(pick(row, 'qty', 'Qty', 'Quantity', 'quantity', 'Fill Qty', 'fillQty', 'Size', 'size'), 1) || 1

  const buyPrice = parseNum(pick(row, 'buyPrice', 'Buy Price', 'buy_price', 'EntryPrice', 'entry_price', 'Fill Price', 'fillPrice', 'Avg Price', 'avgPrice', 'Average Price', 'Entry', 'Open Price'))
  const sellPrice = parseNum(pick(row, 'sellPrice', 'Sell Price', 'sell_price', 'ExitPrice', 'exit_price', 'Close Price', 'Exit', 'closePrice'))
  const pnl = parseNum(pick(row, 'pnl', 'PnL', 'P&L', 'Profit', 'profit', 'Realized P/L', 'Realized PnL', 'realizedPL', 'Net P/L', 'Net PnL', 'netPnL', 'P/L', 'pl', 'Net Profit', 'netProfit'), null)

  const rawBoughtTs = pick(row, 'boughtTimestamp', 'Bought Timestamp', 'bought_timestamp', 'EntryTime', 'entry_time', 'Entry Time', 'Open Time', 'Date/Time', 'timestamp', 'Timestamp', 'Date', 'date', 'Time') || ''
  const rawSoldTs = pick(row, 'soldTimestamp', 'Sold Timestamp', 'sold_timestamp', 'ExitTime', 'exit_time', 'Exit Time', 'Close Time', 'Close Date') || ''

  const boughtTs = localToUtc(parseTimestamp(rawBoughtTs), timezone)
  const soldTs   = localToUtc(parseTimestamp(rawSoldTs),   timezone)

  // Infer direction from timestamps if no explicit column:
  // boughtTimestamp < soldTimestamp → bought first → LONG
  // soldTimestamp < boughtTimestamp → sold first → SHORT
  const dirRaw = pick(row, 'direction', 'Direction', 'Side', 'side', 'Action', 'action', 'Buy/Sell', 'B/S', 'TradeType')
  let direction
  if (dirRaw) {
    const d = String(dirRaw).toLowerCase()
    direction = d.includes('sell') || d === 'short' || d === 's' ? 'short' : 'long'
  } else if (boughtTs && soldTs) {
    direction = new Date(soldTs) < new Date(boughtTs) ? 'short' : 'long'
  } else {
    direction = 'long'
  }

  const stopLoss = parseNum(pick(row, 'stopLoss', 'Stop Loss', 'stop_loss', 'StopLoss', 'Stop'), null)
  const setupTag = pick(row, 'setupTag', 'setup_tag', 'Setup', 'setup') || ''
  const notes = pick(row, 'notes', 'Notes') || ''

  // Use the broker's provided duration if available, otherwise calculate
  const providedDuration = pick(row, 'duration', 'Duration') || ''
  let duration = providedDuration
  if (!duration && boughtTs && soldTs) {
    const diff = (new Date(soldTs) - new Date(boughtTs)) / 1000
    if (diff > 0) {
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      duration = h > 0 ? `${h}h ${m}m` : `${m}m`
    }
  }

  const points = getPoints(direction, buyPrice, sellPrice)
  const session = getSession(boughtTs)
  const dayOfWeek = getDayOfWeek(boughtTs)
  const hourOfDay = getHourOfDay(boughtTs)
  const rMultiple = calculateRMultiple(direction, buyPrice, sellPrice, stopLoss)

  // Use Tradovate fill IDs as unique hash when available
  const buyFillId = pick(row, 'buyFillId')
  const sellFillId = pick(row, 'sellFillId')
  const import_hash = (buyFillId && sellFillId)
    ? `fill:${buyFillId}|${sellFillId}`
    : makeImportHash({ symbol, direction, buy_price: buyPrice, sell_price: sellPrice, bought_timestamp: boughtTs, pnl })

  return {
    symbol,
    qty,
    direction,
    buy_price: buyPrice,
    sell_price: sellPrice,
    pnl,
    bought_timestamp: boughtTs,
    sold_timestamp: soldTs,
    duration,
    points,
    session,
    day_of_week: dayOfWeek,
    hour_of_day: hourOfDay,
    stop_loss: stopLoss,
    r_multiple: rMultiple,
    setup_tag: setupTag,
    notes,
    rating: null,
    import_hash,
  }
}

// Parse a File (from an <input type=file>) into normalised trade rows.
// Returns { trades, columns } — columns are the raw header names for the
// "some fields weren't recognised" hint in the import UI.
export async function parseCsvFile(file, timezone) {
  const text = await file.text()
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
    transform: v => (typeof v === 'string' ? v.trim() : v),
  })
  if (result.errors && result.errors.length) {
    const fatal = result.errors.find(e => e.code !== 'TooFewFields' && e.code !== 'TooManyFields')
    if (fatal && (!result.data || result.data.length === 0)) {
      throw new Error(`CSV parse error: ${fatal.message}`)
    }
  }
  const records = result.data || []
  const columns = result.meta?.fields || (records.length > 0 ? Object.keys(records[0]) : [])
  const trades = records.map(r => parseRow(r, timezone))
  return { trades, columns }
}
