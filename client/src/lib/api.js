const BASE = '/api'

async function request(url, options = {}) {
  const res = await fetch(BASE + url, options)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export const getTrades = (filters = {}) => {
  const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)))
  return request(`/trades?${params}`)
}

export const getTradeFilters = () => request('/trades/filters')

export const addTrade = (data) =>
  request('/trades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })

export const updateTrade = (id, data) =>
  request(`/trades/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })

export const deleteTrade = (id) => request(`/trades/${id}`, { method: 'DELETE' })

export const clearAllTrades = () => request('/trades/all', { method: 'DELETE' })

export const previewCSV = (file) => {
  const form = new FormData()
  form.append('file', file)
  return request('/upload/preview', { method: 'POST', body: form })
}

export const importCSV = (file) => {
  const form = new FormData()
  form.append('file', file)
  return request('/upload', { method: 'POST', body: form })
}

export const uploadScreenshot = (id, file) => {
  const form = new FormData()
  form.append('screenshot', file)
  return request(`/trades/${id}/screenshot`, { method: 'POST', body: form })
}

export const deleteScreenshot = (id) => request(`/trades/${id}/screenshot`, { method: 'DELETE' })

export const getSettings = () => request('/settings')

export const updateSetting = (key, value) =>
  request('/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) })

export const getStats = ({ from, to, symbol, direction, setup, session, timezone } = {}) => {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (symbol) params.set('symbol', symbol)
  if (direction) params.set('direction', direction)
  if (setup) params.set('setup', setup)
  if (session) params.set('session', session)
  if (timezone) params.set('timezone', timezone)
  const qs = params.toString()
  return request(`/stats${qs ? `?${qs}` : ''}`)
}
