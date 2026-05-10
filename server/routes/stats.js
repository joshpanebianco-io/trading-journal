const express = require('express')
const router = express.Router()
const db = require('../db')

const IANA = {
  AEST: 'Australia/Sydney', AEDT: 'Australia/Sydney', AET: 'Australia/Sydney',
  EST: 'America/New_York',  EDT: 'America/New_York',  ET:  'America/New_York',
  UTC: 'UTC',
}

function utcToLocalDate(utcStr, timezone) {
  const iana = IANA[timezone] || 'UTC'
  const d = new Date(utcStr.endsWith('Z') ? utcStr : utcStr + 'Z')
  return d.toLocaleDateString('en-CA', { timeZone: iana })
}

router.get('/', (req, res) => {
  const allTrades = db.prepare('SELECT * FROM trades ORDER BY bought_timestamp ASC').all()
  const { from, to, symbol, direction, setup, session, timezone } = req.query

  const baseFiltered = allTrades.filter(t => {
    if (symbol && t.symbol !== symbol) return false
    if (direction && t.direction !== direction) return false
    if (setup && t.setup_tag !== setup) return false
    if (session && t.session !== session) return false
    return true
  })

  const trades = baseFiltered.filter(t => {
    if (!t.bought_timestamp) return true
    if (from && t.bought_timestamp < from) return false
    if (to && t.bought_timestamp > to) return false
    return true
  })

  const wins = trades.filter(t => t.pnl > 0)
  const losses = trades.filter(t => t.pnl < 0)
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0)
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0
  const avgWin = wins.length > 0 ? grossProfit / wins.length : 0
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0

  const rMultiples = trades.map(t => t.r_multiple).filter(r => r != null)
  const avgRR = rMultiples.length > 0 ? rMultiples.reduce((s, r) => s + r, 0) / rMultiples.length : null
  const totalR = rMultiples.length > 0 ? parseFloat(rMultiples.reduce((s, r) => s + r, 0).toFixed(2)) : null

  const pnls = trades.map(t => t.pnl)
  const bestTrade = pnls.length > 0 ? Math.max(...pnls) : 0
  const worstTrade = pnls.length > 0 ? Math.min(...pnls) : 0

  // Avg duration
  const tradesWithTs = trades.filter(t => t.bought_timestamp && t.sold_timestamp && t.sold_timestamp !== '')
  let avgDuration = null
  if (tradesWithTs.length > 0) {
    const totalSec = tradesWithTs.reduce((sum, t) => {
      const diff = (new Date(t.sold_timestamp) - new Date(t.bought_timestamp)) / 1000
      return sum + (diff > 0 ? diff : 0)
    }, 0)
    const avg = totalSec / tradesWithTs.length
    const h = Math.floor(avg / 3600)
    const m = Math.floor((avg % 3600) / 60)
    const parts = []
    if (h > 0) parts.push(`${h}hr`)
    parts.push(`${m}min`)
    avgDuration = parts.join(' ')
  }

  // Streaks
  let maxWinStreak = 0, maxLossStreak = 0, curWin = 0, curLoss = 0
  trades.forEach(t => {
    if (t.pnl > 0) { curWin++; curLoss = 0; maxWinStreak = Math.max(maxWinStreak, curWin) }
    else { curLoss++; curWin = 0; maxLossStreak = Math.max(maxLossStreak, curLoss) }
  })

  let currentStreak = 0, currentStreakType = 'none'
  for (let i = trades.length - 1; i >= 0; i--) {
    const isWin = trades[i].pnl > 0
    if (i === trades.length - 1) { currentStreakType = isWin ? 'win' : 'loss'; currentStreak = 1 }
    else if ((isWin && currentStreakType === 'win') || (!isWin && currentStreakType === 'loss')) currentStreak++
    else break
  }

  // Equity curve
  let cumPnl = 0
  const equityCurve = trades.map(t => {
    const pnl = t.pnl ?? 0
    cumPnl += pnl
    return {
      date: t.bought_timestamp ? t.bought_timestamp.slice(0, 10) : '',
      tradePnl: parseFloat(pnl.toFixed(2)),
      cumulative: parseFloat(cumPnl.toFixed(2)),
    }
  })

  // By day
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const byDayMap = {}
  dayOrder.forEach(d => { byDayMap[d] = { day: d, pnl: 0, trades: 0, wins: 0 } })
  trades.forEach(t => {
    if (byDayMap[t.day_of_week]) {
      byDayMap[t.day_of_week].pnl += t.pnl
      byDayMap[t.day_of_week].trades++
      if (t.pnl > 0) byDayMap[t.day_of_week].wins++
    }
  })

  // By session
  const sessionOrder = ['Asia', 'London', 'Pre-Market', 'NY Open', 'NY Lunch', 'NY PM', 'Other']
  const bySessionMap = {}
  sessionOrder.forEach(s => { bySessionMap[s] = { session: s, pnl: 0, trades: 0, wins: 0 } })
  trades.forEach(t => {
    if (bySessionMap[t.session]) {
      bySessionMap[t.session].pnl += t.pnl
      bySessionMap[t.session].trades++
      if (t.pnl > 0) bySessionMap[t.session].wins++
    }
  })

  // By calendar date — group by local date so calendar matches the trade log filter
  const byDate = {}
  baseFiltered.forEach(t => {
    if (!t.bought_timestamp) return
    const date = timezone ? utcToLocalDate(t.bought_timestamp, timezone) : t.bought_timestamp.slice(0, 10)
    if (!byDate[date]) byDate[date] = { pnl: 0, trades: 0, wins: 0 }
    byDate[date].pnl = parseFloat((byDate[date].pnl + t.pnl).toFixed(2))
    byDate[date].trades++
    if (t.pnl > 0) byDate[date].wins++
  })

  res.json({
    summary: {
      totalTrades: trades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: parseFloat(winRate.toFixed(1)),
      totalPnl: parseFloat(totalPnl.toFixed(2)),
      grossProfit: parseFloat(grossProfit.toFixed(2)),
      grossLoss: parseFloat(grossLoss.toFixed(2)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      avgWin: parseFloat(avgWin.toFixed(2)),
      avgLoss: parseFloat(avgLoss.toFixed(2)),
      bestTrade: parseFloat(bestTrade.toFixed(2)),
      worstTrade: parseFloat(worstTrade.toFixed(2)),
      avgRR: avgRR !== null ? parseFloat(avgRR.toFixed(2)) : null,
      totalR,
      maxWinStreak,
      maxLossStreak,
      currentStreak,
      currentStreakType,
      avgDuration,
    },
    equityCurve,
    byDay: dayOrder.map(d => ({ ...byDayMap[d], pnl: parseFloat(byDayMap[d].pnl.toFixed(2)) })),
    bySession: sessionOrder
      .filter(s => bySessionMap[s].trades > 0)
      .map(s => ({ ...bySessionMap[s], pnl: parseFloat(bySessionMap[s].pnl.toFixed(2)) })),
    byDate,
  })
})

module.exports = router
