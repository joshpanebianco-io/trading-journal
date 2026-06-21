// One-time migration: copy trades + screenshots out of the old local SQLite
// database (trading.db) into Supabase, owned by a single user account.
//
// Prerequisites:
//   1. You've created your Supabase project and run supabase/schema.sql.
//   2. You've signed up in the app at least once (email/password or Google) so
//      the account exists. Migrated data is attached to that account.
//   3. cd scripts && npm install
//   4. Copy scripts/.env.example to scripts/.env and fill in the three values.
//
// Run:  cd scripts && node migrate-to-supabase.mjs
//
// Re-runnable: trades already present (matched by import_hash, or by a
// symbol/time/price/pnl signature for manually-added trades) are skipped.

import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import initSqlJs from 'sql.js'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const DB_PATH = path.join(ROOT, 'trading.db')
const SCREENSHOT_DIR = path.join(ROOT, 'screenshots')
const BUCKET = 'screenshots'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MIGRATE_USER_EMAIL } = process.env

function fail(msg) { console.error(`\n✗ ${msg}\n`); process.exit(1) }

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !MIGRATE_USER_EMAIL) {
  fail('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and MIGRATE_USER_EMAIL in scripts/.env')
}
if (!fs.existsSync(DB_PATH)) {
  fail(`No trading.db found at ${DB_PATH} — nothing to migrate.`)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Resolve target user by email (paged admin lookup) ───────────────────────
async function findUserId(email) {
  const target = email.trim().toLowerCase()
  // GoTrue clamps perPage server-side (max ~50), so don't infer "last page" from
  // the requested size — just page until the server returns an empty list.
  for (let page = 1; page <= 1000; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) fail(`Could not list users: ${error.message}`)
    const match = data.users.find(u => (u.email || '').toLowerCase() === target)
    if (match) return match.id
    if (data.users.length === 0) break
  }
  fail(`No Supabase user with email "${email}". Sign up in the app first, then re-run.`)
}

// ── Read trades out of SQLite ────────────────────────────────────────────────
function readLocalTrades() {
  return initSqlJs().then(SQL => {
    const db = new SQL.Database(fs.readFileSync(DB_PATH))
    let result
    try {
      result = db.exec('SELECT * FROM trades')
    } catch {
      return []
    }
    if (!result.length) return []
    const { columns, values } = result[0]
    return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])))
  })
}

const TRADE_COLUMNS = [
  'import_hash', 'symbol', 'qty', 'direction', 'buy_price', 'sell_price', 'pnl',
  'bought_timestamp', 'sold_timestamp', 'duration', 'points', 'session',
  'day_of_week', 'hour_of_day', 'stop_loss', 'r_multiple', 'setup_tag', 'notes', 'rating',
]

const sig = t => `${t.symbol}|${t.bought_timestamp}|${t.buy_price}|${t.sell_price}|${t.pnl}`

async function main() {
  console.log('→ Resolving target user…')
  const userId = await findUserId(MIGRATE_USER_EMAIL)
  console.log(`  user_id = ${userId}`)

  const localTrades = await readLocalTrades()
  console.log(`→ Found ${localTrades.length} trade(s) in trading.db`)
  if (!localTrades.length) { console.log('Nothing to do.'); return }

  // Existing rows for this user → skip duplicates
  const { data: existing, error: exErr } = await supabase
    .from('trades').select('import_hash, symbol, bought_timestamp, buy_price, sell_price, pnl')
    .eq('user_id', userId)
  if (exErr) fail(`Could not read existing trades: ${exErr.message}`)
  const seenHashes = new Set((existing || []).map(r => r.import_hash).filter(Boolean))
  const seenSigs = new Set((existing || []).map(sig))

  let inserted = 0, skipped = 0, shots = 0, shotsMissing = 0

  for (const t of localTrades) {
    if (t.import_hash && seenHashes.has(t.import_hash)) { skipped++; continue }
    if (!t.import_hash && seenSigs.has(sig(t))) { skipped++; continue }

    const row = { user_id: userId }
    for (const c of TRADE_COLUMNS) row[c] = t[c] ?? null

    // Move the screenshot into the user's storage folder, if the file exists.
    let storagePath = null
    if (t.screenshot_path) {
      const base = path.basename(t.screenshot_path)
      const localFile = path.join(SCREENSHOT_DIR, base)
      if (fs.existsSync(localFile)) {
        const dest = `${userId}/${base}`
        const ext = (path.extname(base).slice(1) || 'png').toLowerCase()
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(
          dest, fs.readFileSync(localFile),
          { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`, upsert: true },
        )
        if (upErr) console.warn(`  ! screenshot upload failed for ${base}: ${upErr.message}`)
        else { storagePath = dest; shots++ }
      } else {
        shotsMissing++
      }
    }
    row.screenshot_path = storagePath

    const { error } = await supabase.from('trades').insert(row)
    if (error) { console.warn(`  ! insert failed (${t.symbol} ${t.bought_timestamp}): ${error.message}`); continue }
    inserted++
    if (t.import_hash) seenHashes.add(t.import_hash)
    seenSigs.add(sig(t))
  }

  console.log('\n✓ Migration complete')
  console.log(`  trades inserted : ${inserted}`)
  console.log(`  trades skipped  : ${skipped} (already present)`)
  console.log(`  screenshots     : ${shots} uploaded${shotsMissing ? `, ${shotsMissing} missing file(s)` : ''}`)
}

main().catch(err => fail(err.message || String(err)))
