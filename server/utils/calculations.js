function nthSunday(month, n, year) {
  const d = new Date(Date.UTC(year, month - 1, 1))
  const dow = d.getUTCDay()
  const firstSunday = dow === 0 ? 1 : 8 - dow
  return new Date(Date.UTC(year, month - 1, firstSunday + (n - 1) * 7))
}

function getEtOffset(date) {
  const y = date.getUTCFullYear()
  const start = nthSunday(3, 2, y)   // 2nd Sunday Mar
  const end   = nthSunday(11, 1, y)  // 1st Sunday Nov
  return (date >= start && date < end) ? -4 : -5
}

// All timestamps are stored as UTC. Sessions are based on US Eastern time.
function getSession(utcStr) {
  if (!utcStr) return 'Other'
  const d = new Date(utcStr.endsWith('Z') ? utcStr : utcStr + 'Z')
  if (isNaN(d.getTime())) return 'Other'
  const etOffset = getEtOffset(d)
  const etMs = d.getTime() + etOffset * 3600000
  const et = new Date(etMs)
  const total = et.getUTCHours() * 60 + et.getUTCMinutes()
  if (total >= 20 * 60 || total < 4 * 60) return 'Asia'
  if (total < 8 * 60) return 'London'
  if (total < 9 * 60 + 30) return 'Pre-Market'
  if (total < 12 * 60) return 'NY Open'
  if (total < 13 * 60) return 'NY Lunch'
  if (total < 16 * 60) return 'NY PM'
  return 'Other'
}

function getDayOfWeek(utcStr) {
  if (!utcStr) return null
  const d = new Date(utcStr.endsWith('Z') ? utcStr : utcStr + 'Z')
  if (isNaN(d.getTime())) return null
  // Use ET day since that's the relevant trading day
  const etOffset = getEtOffset(d)
  const et = new Date(d.getTime() + etOffset * 3600000)
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][et.getUTCDay()]
}

function getHourOfDay(utcStr) {
  if (!utcStr) return null
  const d = new Date(utcStr.endsWith('Z') ? utcStr : utcStr + 'Z')
  if (isNaN(d.getTime())) return null
  const etOffset = getEtOffset(d)
  return new Date(d.getTime() + etOffset * 3600000).getUTCHours()
}

function getPoints(direction, buyPrice, sellPrice) {
  if (!direction || buyPrice == null || sellPrice == null) return null
  const diff = direction === 'long'
    ? parseFloat(sellPrice) - parseFloat(buyPrice)
    : parseFloat(buyPrice) - parseFloat(sellPrice)
  return parseFloat(diff.toFixed(4))
}

function calculateRMultiple(pnl, stopLoss, buyPrice, qty, direction) {
  if (stopLoss == null || !buyPrice || !pnl) return null
  const riskPerUnit = Math.abs(parseFloat(buyPrice) - parseFloat(stopLoss))
  if (riskPerUnit === 0) return null
  const riskTotal = riskPerUnit * (parseFloat(qty) || 1)
  return parseFloat((pnl / riskTotal).toFixed(2))
}

function makeImportHash(row) {
  const str = `${row.symbol}|${row.direction}|${row.buy_price}|${row.sell_price}|${row.bought_timestamp}|${row.pnl}`
  return Buffer.from(str).toString('base64')
}

module.exports = { getSession, getDayOfWeek, getHourOfDay, getPoints, calculateRMultiple, makeImportHash }
