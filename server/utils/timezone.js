function nthSunday(month, n, year) {
  const d = new Date(Date.UTC(year, month - 1, 1))
  const dow = d.getUTCDay()
  const firstSunday = dow === 0 ? 1 : 8 - dow
  return new Date(Date.UTC(year, month - 1, firstSunday + (n - 1) * 7))
}

function getOffsetHours(timezone, date) {
  switch (timezone) {
    case 'AEST': return 10
    case 'AEDT': return 11
    case 'AET': {
      const y = date.getUTCFullYear()
      const start = nthSunday(10, 1, y)   // 1st Sunday Oct → AEDT starts
      const end   = nthSunday(4,  1, y)   // 1st Sunday Apr → AEDT ends
      return (date >= start || date < end) ? 11 : 10
    }
    case 'EST': return -5
    case 'EDT': return -4
    case 'ET': {
      const y = date.getUTCFullYear()
      const start = nthSunday(3,  2, y)   // 2nd Sunday Mar → EDT starts
      const end   = nthSunday(11, 1, y)   // 1st Sunday Nov → EDT ends
      return (date >= start && date < end) ? -4 : -5
    }
    case 'UTC': return 0
    default: return 10
  }
}

// Convert local timestamp string (YYYY-MM-DDTHH:MM:SS or YYYY-MM-DDTHH:MM) to UTC
function localToUtc(localStr, timezone) {
  if (!localStr) return ''
  const normalised = localStr.length === 16 ? localStr + ':00' : localStr
  const d = new Date(normalised + 'Z')
  if (isNaN(d.getTime())) return localStr
  const offset = getOffsetHours(timezone, d)
  return new Date(d.getTime() - offset * 3600000).toISOString().slice(0, 19)
}

// Convert UTC timestamp string to local timezone string
function utcToLocal(utcStr, timezone) {
  if (!utcStr) return ''
  const d = new Date(utcStr.endsWith('Z') ? utcStr : utcStr + 'Z')
  if (isNaN(d.getTime())) return utcStr
  const offset = getOffsetHours(timezone, d)
  return new Date(d.getTime() + offset * 3600000).toISOString().slice(0, 19)
}

module.exports = { getOffsetHours, localToUtc, utcToLocal }
