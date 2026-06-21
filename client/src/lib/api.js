// Data layer. Previously this hit a local Express/SQLite API over fetch; it now
// talks to Supabase directly (Postgres + Storage), scoped to the signed-in user
// by row-level security. The exported function names and return shapes are kept
// identical to the old API so the pages/components didn't need rewiring.

import { supabase, SCREENSHOT_BUCKET } from './supabase'
import { getSession, getDayOfWeek, getHourOfDay, getPoints, calculateRMultiple } from './calculations'
import { computeStats } from './stats'
import { parseCsvFile } from './csv'

async function currentUserId() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) return session.user.id
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')
  return user.id
}

// ── Trades ────────────────────────────────────────────────────────────────

export async function getTrades(filters = {}) {
  const { symbol, direction, setup, session, from, to } = filters
  let q = supabase
    .from('trades')
    .select('*')
    .order('bought_timestamp', { ascending: false, nullsFirst: false })
  if (symbol) q = q.eq('symbol', symbol)
  if (direction) q = q.eq('direction', direction)
  if (setup) q = q.eq('setup_tag', setup)
  if (session) q = q.eq('session', session)
  if (from) q = q.gte('bought_timestamp', from)
  if (to) q = q.lte('bought_timestamp', to)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data
}

export async function getTradeFilters() {
  const { data, error } = await supabase.from('trades').select('symbol, setup_tag')
  if (error) throw new Error(error.message)
  const symbols = [...new Set(data.map(r => r.symbol).filter(Boolean))].sort()
  const setups = [...new Set(data.map(r => r.setup_tag).filter(s => s && s !== ''))].sort()
  return { symbols, setups }
}

export async function addTrade(data) {
  const user_id = await currentUserId()
  const {
    symbol, qty, direction, buy_price, sell_price, pnl,
    bought_timestamp, sold_timestamp, duration, stop_loss,
    r_multiple, setup_tag, session, notes, rating,
  } = data
  const points = getPoints(direction, buy_price, sell_price)
  const sess = session || getSession(bought_timestamp)
  const day_of_week = getDayOfWeek(bought_timestamp)
  const hour_of_day = getHourOfDay(bought_timestamp)
  const r_mult = r_multiple != null ? r_multiple : calculateRMultiple(direction, buy_price, sell_price, stop_loss)

  const row = {
    user_id, symbol, qty, direction, buy_price, sell_price, pnl: pnl ?? 0,
    bought_timestamp, sold_timestamp, duration, points, session: sess,
    day_of_week, hour_of_day, stop_loss, r_multiple: r_mult, setup_tag, notes, rating,
  }
  const { data: inserted, error } = await supabase.from('trades').insert(row).select().single()
  if (error) throw new Error(error.message)
  return inserted
}

export async function updateTrade(id, data) {
  const {
    symbol, qty, direction, buy_price, sell_price, pnl,
    bought_timestamp, sold_timestamp, duration, stop_loss,
    setup_tag, session, notes, rating,
  } = data
  const points = getPoints(direction, buy_price, sell_price)
  const sess = session || getSession(bought_timestamp)
  const day_of_week = getDayOfWeek(bought_timestamp)
  const hour_of_day = getHourOfDay(bought_timestamp)
  const r_multiple = calculateRMultiple(direction, buy_price, sell_price, stop_loss)

  const row = {
    symbol, qty, direction, buy_price, sell_price, pnl: pnl ?? 0,
    bought_timestamp, sold_timestamp, duration, points, session: sess,
    day_of_week, hour_of_day, stop_loss, r_multiple, setup_tag, notes, rating,
  }
  const { data: updated, error } = await supabase.from('trades').update(row).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return updated
}

export async function deleteTrade(id) {
  const { data: trade } = await supabase.from('trades').select('screenshot_path').eq('id', id).single()
  if (trade?.screenshot_path) {
    await supabase.storage.from(SCREENSHOT_BUCKET).remove([trade.screenshot_path])
  }
  const { error } = await supabase.from('trades').delete().eq('id', id)
  if (error) throw new Error(error.message)
  return { success: true }
}

export async function clearAllTrades() {
  const user_id = await currentUserId()
  // Drain the user's screenshot folder in pages — list() is capped (~1000), and
  // each removal shrinks the folder, so re-listing from the top eventually empties it.
  const PAGE = 1000
  for (let guard = 0; guard < 1000; guard++) {
    const { data: objects, error: listErr } = await supabase.storage
      .from(SCREENSHOT_BUCKET)
      .list(user_id, { limit: PAGE })
    if (listErr || !objects || objects.length === 0) break
    const { error: rmErr } = await supabase.storage
      .from(SCREENSHOT_BUCKET)
      .remove(objects.map(o => `${user_id}/${o.name}`))
    if (rmErr || objects.length < PAGE) break
  }
  const { error } = await supabase.from('trades').delete().eq('user_id', user_id)
  if (error) throw new Error(error.message)
  return { success: true }
}

// ── Screenshots (Supabase Storage) ──────────────────────────────────────────

export async function uploadScreenshot(id, file) {
  const user_id = await currentUserId()
  const { data: existing } = await supabase.from('trades').select('screenshot_path').eq('id', id).single()
  if (existing?.screenshot_path) {
    await supabase.storage.from(SCREENSHOT_BUCKET).remove([existing.screenshot_path])
  }
  const extMatch = /\.([a-zA-Z0-9]+)$/.exec(file.name || '')
  const ext = extMatch ? extMatch[1].toLowerCase() : 'png'
  const path = `${user_id}/${id}-${Date.now()}.${ext}`
  const { error: upErr } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .upload(path, file, { contentType: file.type || 'image/png', upsert: true })
  if (upErr) throw new Error(upErr.message)
  const { error } = await supabase.from('trades').update({ screenshot_path: path }).eq('id', id)
  if (error) throw new Error(error.message)
  return { screenshot_path: path }
}

export async function deleteScreenshot(id) {
  const { data: trade } = await supabase.from('trades').select('screenshot_path').eq('id', id).single()
  if (trade?.screenshot_path) {
    await supabase.storage.from(SCREENSHOT_BUCKET).remove([trade.screenshot_path])
    const { error } = await supabase.from('trades').update({ screenshot_path: null }).eq('id', id)
    if (error) throw new Error(error.message)
  }
  return { success: true }
}

// Screenshots live in a private bucket; resolve a short-lived signed URL on demand.
export async function getScreenshotUrl(path) {
  if (!path) return null
  const { data, error } = await supabase.storage.from(SCREENSHOT_BUCKET).createSignedUrl(path, 3600)
  if (error) return null
  return data.signedUrl
}

// ── CSV import (parsed in the browser) ──────────────────────────────────────

export async function previewCSV(file) {
  const { timezone } = await getSettings()
  const { trades, columns } = await parseCsvFile(file, timezone)
  // "Unrecognised" = no pnl column matched (null, not a real 0) AND no prices —
  // so a legitimate breakeven trade (pnl === 0) doesn't trip the warning.
  const unmapped = trades.filter(t => t.pnl == null && !t.buy_price && !t.sell_price)
  return { trades, count: trades.length, columns, hasUnmappedData: unmapped.length > 0 }
}

export async function importCSV(file) {
  const user_id = await currentUserId()
  const { timezone } = await getSettings()
  const { trades } = await parseCsvFile(file, timezone)
  const total = trades.length

  // Dedupe rows that repeat within this file, then let the database skip rows
  // that already exist via ON CONFLICT (user_id, import_hash) DO NOTHING. This
  // restores the old server's "INSERT OR IGNORE" semantics without an all-or-
  // nothing batch failure, and without a client-side read that PostgREST caps.
  const seen = new Set()
  const toInsert = []
  for (const t of trades) {
    if (t.import_hash && seen.has(t.import_hash)) continue
    if (t.import_hash) seen.add(t.import_hash)
    toInsert.push({ ...t, user_id })
  }

  let imported = 0
  if (toInsert.length) {
    const { data: ins, error } = await supabase
      .from('trades')
      .upsert(toInsert, { onConflict: 'user_id,import_hash', ignoreDuplicates: true })
      .select('id')
    if (error) throw new Error(error.message)
    imported = ins.length // only rows actually inserted are returned
  }
  return { imported, total }
}

// ── Per-user settings ───────────────────────────────────────────────────────

export async function getSettings() {
  const user_id = await currentUserId()
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user_id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return { timezone: data?.timezone || 'AEST' }
}

export async function updateSetting(key, value) {
  const user_id = await currentUserId()
  const row = { user_id, [key]: value, updated_at: new Date().toISOString() }
  const { error } = await supabase.from('user_settings').upsert(row, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
  return { ok: true }
}

// ── Stats (computed client-side from the user's trades) ──────────────────────

export async function getStats(params = {}) {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .order('bought_timestamp', { ascending: true, nullsFirst: true })
  if (error) throw new Error(error.message)
  return computeStats(data, params)
}
