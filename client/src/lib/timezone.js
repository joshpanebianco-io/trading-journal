export const TIMEZONE_OPTIONS = [
  { value: 'AEST', label: 'AEST (UTC+10)' },
  { value: 'AEDT', label: 'AEDT (UTC+11)' },
  { value: 'AET',  label: 'AET (Auto DST)' },
  { value: 'EST',  label: 'EST (UTC−5)' },
  { value: 'EDT',  label: 'EDT (UTC−4)' },
  { value: 'ET',   label: 'ET (Auto DST)' },
  { value: 'JST',  label: 'JST (UTC+9)' },
  { value: 'UTC',  label: 'UTC' },
]

function nthSunday(month, n, year) {
  const d = new Date(Date.UTC(year, month - 1, 1))
  const dow = d.getUTCDay()
  const firstSunday = dow === 0 ? 1 : 8 - dow
  return new Date(Date.UTC(year, month - 1, firstSunday + (n - 1) * 7))
}

export function getOffsetHours(timezone, date) {
  switch (timezone) {
    case 'AEST': return 10
    case 'AEDT': return 11
    case 'AET': {
      const y = date.getUTCFullYear()
      const start = nthSunday(10, 1, y)
      const end   = nthSunday(4,  1, y)
      return (date >= start || date < end) ? 11 : 10
    }
    case 'EST': return -5
    case 'EDT': return -4
    case 'ET': {
      const y = date.getUTCFullYear()
      const start = nthSunday(3,  2, y)
      const end   = nthSunday(11, 1, y)
      return (date >= start && date < end) ? -4 : -5
    }
    case 'JST': return 9
    default: return 0  // UTC
  }
}

// UTC string → local datetime string (YYYY-MM-DDTHH:MM:SS) in selected timezone
export function utcToLocal(utcStr, timezone) {
  if (!utcStr) return ''
  const d = new Date(utcStr.endsWith('Z') ? utcStr : utcStr + 'Z')
  if (isNaN(d.getTime())) return utcStr
  const offset = getOffsetHours(timezone, d)
  return new Date(d.getTime() + offset * 3600000).toISOString().slice(0, 19)
}

// Local datetime string (from datetime-local input) → UTC string
export function localToUtc(localStr, timezone) {
  if (!localStr) return ''
  const normalised = localStr.length === 16 ? localStr + ':00' : localStr
  const d = new Date(normalised + 'Z')
  if (isNaN(d.getTime())) return localStr
  const offset = getOffsetHours(timezone, d)
  return new Date(d.getTime() - offset * 3600000).toISOString().slice(0, 19)
}

// Date string (YYYY-MM-DD) → UTC start of that day in timezone
export function dateToUtcStart(dateStr, timezone) {
  return localToUtc(dateStr + 'T00:00:00', timezone)
}

// Date string (YYYY-MM-DD) → UTC end of that day in timezone
export function dateToUtcEnd(dateStr, timezone) {
  return localToUtc(dateStr + 'T23:59:59', timezone)
}
