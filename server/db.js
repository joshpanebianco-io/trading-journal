const initSqlJs = require('sql.js')
const path = require('path')
const fs = require('fs')

const DB_PATH = path.join(__dirname, '..', 'trading.db')
let _db = null
let _inTransaction = false

function save() {
  if (_db && !_inTransaction) {
    const data = _db.export()
    fs.writeFileSync(DB_PATH, Buffer.from(data))
  }
}

// Convert positional/named args to what sql.js expects
// Named: {key: val} -> {'@key': val}  (for SQL using @name syntax)
// Positional: (a, b, c) -> [a, b, c]
function normalizeParams(args) {
  if (args.length === 0) return undefined
  if (args.length === 1 && args[0] !== null && typeof args[0] === 'object' && !Array.isArray(args[0])) {
    const result = {}
    for (const [k, v] of Object.entries(args[0])) {
      result[`@${k}`] = v !== undefined ? v : null
    }
    return result
  }
  return args.map(v => (v !== undefined ? v : null))
}

class Statement {
  constructor(sql) {
    this._sql = sql
  }

  run(...args) {
    const params = normalizeParams(args)
    const stmt = _db.prepare(this._sql)
    stmt.run(params)
    stmt.free()
    const rowsModified = _db.getRowsModified()
    // Read rowid before save() to avoid any interference
    const idStmt = _db.prepare('SELECT last_insert_rowid() as id')
    idStmt.step()
    const lastInsertRowid = idStmt.getAsObject()['id'] ?? null
    idStmt.free()
    save()
    return { changes: rowsModified, lastInsertRowid }
  }

  get(...args) {
    const params = normalizeParams(args)
    const stmt = _db.prepare(this._sql)
    if (params !== undefined) stmt.bind(params)
    let row = undefined
    if (stmt.step()) row = stmt.getAsObject()
    stmt.free()
    return row
  }

  all(...args) {
    const params = normalizeParams(args)
    const stmt = _db.prepare(this._sql)
    if (params !== undefined) stmt.bind(params)
    const rows = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()
    return rows
  }
}

function transaction(fn) {
  return (...args) => {
    _db.run('BEGIN')
    _inTransaction = true
    try {
      const result = fn(...args)
      _db.run('COMMIT')
      _inTransaction = false
      save()
      return result
    } catch (err) {
      try { _db.run('ROLLBACK') } catch {}
      _inTransaction = false
      throw err
    }
  }
}

module.exports = {
  async init() {
    const SQL = await initSqlJs()
    const data = fs.existsSync(DB_PATH) ? fs.readFileSync(DB_PATH) : null
    _db = data ? new SQL.Database(data) : new SQL.Database()
    _db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `)
    _db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('timezone', 'AEST')`)
    _db.run(`
      CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        import_hash TEXT UNIQUE,
        symbol TEXT NOT NULL,
        qty REAL,
        direction TEXT NOT NULL,
        buy_price REAL NOT NULL,
        sell_price REAL NOT NULL,
        pnl REAL DEFAULT 0,
        bought_timestamp TEXT,
        sold_timestamp TEXT,
        duration TEXT,
        points REAL,
        session TEXT,
        day_of_week TEXT,
        hour_of_day INTEGER,
        stop_loss REAL,
        r_multiple REAL,
        setup_tag TEXT,
        notes TEXT,
        rating INTEGER,
        screenshot_path TEXT
      )
    `)
    save()
  },
  prepare(sql) { return new Statement(sql) },
  transaction,
}
