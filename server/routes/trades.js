const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const db = require('../db')
const { getSession, getDayOfWeek, getHourOfDay, getPoints, calculateRMultiple } = require('../utils/calculations')

const screenshotDir = path.join(__dirname, '..', '..', 'screenshots')
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true })

const upload = multer({ dest: screenshotDir })

// GET /api/trades/filters  — must come before /:id
router.get('/filters', (req, res) => {
  try {
    const symbols = db.prepare(
      "SELECT DISTINCT symbol FROM trades WHERE symbol IS NOT NULL ORDER BY symbol"
    ).all().map(r => r.symbol)
    const setups = db.prepare(
      "SELECT DISTINCT setup_tag FROM trades WHERE setup_tag IS NOT NULL AND setup_tag != '' ORDER BY setup_tag"
    ).all().map(r => r.setup_tag)
    res.json({ symbols, setups })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/trades/all  — must come before /:id
router.delete('/all', (req, res) => {
  try {
    db.prepare('DELETE FROM trades').run()
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/trades
router.get('/', (req, res) => {
  try {
    const { symbol, direction, setup, session, from, to } = req.query
    const conditions = ['1=1']
    const params = []
    if (symbol) { conditions.push('symbol = ?'); params.push(symbol) }
    if (direction) { conditions.push('direction = ?'); params.push(direction) }
    if (setup) { conditions.push('setup_tag = ?'); params.push(setup) }
    if (session) { conditions.push('session = ?'); params.push(session) }
    if (from) { conditions.push("bought_timestamp >= ?"); params.push(from) }
    if (to) { conditions.push("bought_timestamp <= ?"); params.push(to) }
    const sql = `SELECT * FROM trades WHERE ${conditions.join(' AND ')} ORDER BY bought_timestamp DESC`
    res.json(db.prepare(sql).all(...params))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/trades
router.post('/', (req, res) => {
  try {
    const { symbol, qty, direction, buy_price, sell_price, pnl, bought_timestamp, sold_timestamp, duration, stop_loss, r_multiple, setup_tag, session, notes, rating } = req.body
    const points = getPoints(direction, buy_price, sell_price)
    const sess = session || getSession(bought_timestamp)
    const dayOfWeek = getDayOfWeek(bought_timestamp)
    const hourOfDay = getHourOfDay(bought_timestamp)
    const rMult = r_multiple != null ? r_multiple : calculateRMultiple(pnl, stop_loss, buy_price, qty, direction)

    const result = db.prepare(`
      INSERT INTO trades
        (symbol, qty, direction, buy_price, sell_price, pnl, bought_timestamp, sold_timestamp,
         duration, points, session, day_of_week, hour_of_day, stop_loss, r_multiple, setup_tag, notes, rating)
      VALUES
        (@symbol, @qty, @direction, @buy_price, @sell_price, @pnl, @bought_timestamp, @sold_timestamp,
         @duration, @points, @session, @day_of_week, @hour_of_day, @stop_loss, @r_multiple, @setup_tag, @notes, @rating)
    `).run({ symbol, qty, direction, buy_price, sell_price, pnl: pnl ?? 0, bought_timestamp, sold_timestamp, duration, points, session: sess, day_of_week: dayOfWeek, hour_of_day: hourOfDay, stop_loss, r_multiple: rMult, setup_tag, notes, rating })

    const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(result.lastInsertRowid)
    if (!trade) return res.status(500).json({ error: 'Insert failed' })
    res.json(trade)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/trades/:id
router.put('/:id', (req, res) => {
  try {
    const { symbol, qty, direction, buy_price, sell_price, pnl, bought_timestamp, sold_timestamp, duration, stop_loss, setup_tag, session, notes, rating } = req.body
    const points = getPoints(direction, buy_price, sell_price)
    const sess = session || getSession(bought_timestamp)
    const dayOfWeek = getDayOfWeek(bought_timestamp)
    const hourOfDay = getHourOfDay(bought_timestamp)
    const rMult = calculateRMultiple(pnl, stop_loss, buy_price, qty, direction)

    db.prepare(`
      UPDATE trades SET
        symbol = @symbol, qty = @qty, direction = @direction, buy_price = @buy_price, sell_price = @sell_price,
        pnl = @pnl, bought_timestamp = @bought_timestamp, sold_timestamp = @sold_timestamp, duration = @duration,
        points = @points, session = @session, day_of_week = @day_of_week, hour_of_day = @hour_of_day,
        stop_loss = @stop_loss, r_multiple = @r_multiple, setup_tag = @setup_tag, notes = @notes, rating = @rating
      WHERE id = @id
    `).run({ symbol, qty, direction, buy_price, sell_price, pnl: pnl ?? 0, bought_timestamp, sold_timestamp, duration,
             points, session: sess, day_of_week: dayOfWeek, hour_of_day: hourOfDay, stop_loss, r_multiple: rMult,
             setup_tag, notes, rating, id: req.params.id })

    const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id)
    res.json(trade)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/trades/:id
router.delete('/:id', (req, res) => {
  try {
    const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id)
    if (trade?.screenshot_path) {
      const fp = path.join(__dirname, '..', '..', trade.screenshot_path)
      if (fs.existsSync(fp)) fs.unlinkSync(fp)
    }
    db.prepare('DELETE FROM trades WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/trades/:id/screenshot
router.post('/:id/screenshot', upload.single('screenshot'), (req, res) => {
  try {
    const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id)
    if (!trade) {
      if (req.file) fs.unlinkSync(req.file.path)
      return res.status(404).json({ error: 'Trade not found' })
    }
    if (trade.screenshot_path) {
      const old = path.join(__dirname, '..', '..', trade.screenshot_path)
      if (fs.existsSync(old)) fs.unlinkSync(old)
    }
    const ext = path.extname(req.file.originalname) || '.png'
    const newName = `${req.params.id}_${Date.now()}${ext}`
    const newPath = path.join(screenshotDir, newName)
    fs.renameSync(req.file.path, newPath)
    const relPath = `screenshots/${newName}`
    db.prepare('UPDATE trades SET screenshot_path = ? WHERE id = ?').run(relPath, req.params.id)
    res.json({ screenshot_path: relPath })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/trades/:id/screenshot
router.delete('/:id/screenshot', (req, res) => {
  try {
    const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id)
    if (trade?.screenshot_path) {
      const fp = path.join(__dirname, '..', '..', trade.screenshot_path)
      if (fs.existsSync(fp)) fs.unlinkSync(fp)
      db.prepare('UPDATE trades SET screenshot_path = NULL WHERE id = ?').run(req.params.id)
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
