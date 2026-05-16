# Tradelytics.io

A local-first trading journal and analytics app for futures traders. Import fills from your broker, tag setups, attach screenshots, and watch your edge develop over time through a clean, focused dashboard.

Built as a self-hosted single-user app — your data lives in a local SQLite file on disk, nothing leaves your machine.

![Dashboard](readme-screenshots/Screenshot%202026-05-16%20131944.png)

---

## Why this exists

Most trading journals are either heavyweight web apps that hold your data hostage behind a subscription, or barebones spreadsheets that don't show you anything useful. Tradelytics aims to sit in the middle:

- **Quick to use.** Drop in a Tradovate (or similar) CSV and the trades are normalised, deduped, and instantly visible.
- **Honest stats.** Win rate, profit factor, R-multiples, streaks, session/time-of-day breakdowns — the numbers that actually tell you whether you have an edge.
- **Yours.** SQLite file on disk. Export to CSV any time. No accounts, no cloud.

---

## Features

### Dashboard
A snapshot of performance across any time range, filterable by symbol, direction, setup, and session.

- 12 stat cards — Total P&L, Win Rate, Profit Factor, Avg R:R, Total R, Total Trades, Best/Worst Trade, Avg Win/Loss, Best/Worst Streak, Avg Duration
- Live equity curve
- Performance by day-of-week (toggle between Win % and P&L)
- P&L calendar with daily totals and trade counts
- Quick ranges (1W / 1M / 3M / 6M / YTD) plus custom date range
- Current streak badge

### Trade Log
Every trade in one paginated table with the same filter set as the dashboard. Click any row to open the trade editor; export the filtered view to CSV with one click.

![Trade Log](readme-screenshots/Screenshot%202026-05-16%20132021.png)

### Trade Editor
Click any trade (or use **+ Add Trade**) to edit it in detail. Each trade supports:

- Symbol, direction, qty
- Entry/exit price and time, stop loss
- Setup tag, session (auto-derived from entry time)
- 1–5 star rating
- A chart screenshot (drag-drop)
- Free-form notes

![Edit Trade Modal](readme-screenshots/Screenshot%202026-05-16%20132122.png)

### CSV Import
Drop a CSV exported from your broker and Tradelytics will:

- Auto-detect columns across common naming variations (Tradovate, NinjaTrader, generic)
- Parse mixed timestamp formats and normalise to UTC
- Infer direction from entry/exit timestamps when no side column is present
- Deduplicate by import hash so re-imports are safe
- Compute derived fields (session, day-of-week, hour, points, R-multiple)

![Import](readme-screenshots/Screenshot%202026-05-16%20132046.png)

### Settings
All timestamps are stored as UTC internally. Set your display timezone once and every chart, table, and import respects it.

![Settings](readme-screenshots/Screenshot%202026-05-16%20132102.png)

---

## Tech Stack

**Frontend**
- React 18 + Vite
- Tailwind CSS + Radix UI primitives (shadcn-style components)
- Recharts (equity curve, day chart)
- React Router, Sonner (toasts), Lucide icons

**Backend**
- Node.js + Express
- sql.js (SQLite, file-backed via `trading.db`)
- multer (screenshot uploads)
- csv-parse (broker imports)

**Storage**
- `trading.db` — SQLite database (single file)
- `screenshots/` — uploaded chart images

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Install
```bash
git clone <your-fork-url>
cd Trading.ai
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
```

### Run (development)
```bash
npm run dev
```
This boots both the API (`localhost:3001`) and the Vite client (`localhost:5173`) concurrently.

On Windows you can also double-click `start.bat`, which launches both processes in separate consoles and opens the app in your default browser.

### Build the client
```bash
cd client
npm run build
```

---

## Project Structure

```
Trading.ai/
├── client/                # React + Vite frontend
│   ├── src/
│   │   ├── pages/         # Dashboard, TradeLog, Import, Settings
│   │   ├── components/    # StatCard, EquityCurve, DayChart, PnlCalendar, TradeModal, ...
│   │   ├── context/       # SettingsContext (timezone)
│   │   └── lib/           # api client, timezone helpers
│   └── ...
├── server/                # Express API
│   ├── routes/            # trades, upload, stats, settings
│   ├── utils/             # calculations (R, session, points), timezone
│   ├── db.js              # sql.js wrapper
│   └── index.js
├── screenshots/           # uploaded trade screenshots
├── readme-screenshots/    # images used in this README
├── trading.db             # SQLite database (created on first run)
└── start.bat              # Windows one-click launcher
```

---

## CSV Import Format

The importer tries multiple common column names so most broker exports work out of the box. The fields it understands are:

| Concept    | Accepted column names (any of) |
|------------|-------------------------------|
| Symbol     | `symbol`, `Symbol`, `Contract`, `Instrument` |
| Quantity   | `qty`, `Qty`, `Quantity`, `Fill Qty`, `Size` |
| Entry price| `buyPrice`, `Buy Price`, `EntryPrice`, `Fill Price`, `Avg Price`, `Entry`, `Open Price` |
| Exit price | `sellPrice`, `Sell Price`, `ExitPrice`, `Close Price`, `Exit` |
| P&L        | `pnl`, `PnL`, `P&L`, `Profit`, `Realized P/L`, `Net P/L`, `Net Profit` |
| Entry time | `boughtTimestamp`, `EntryTime`, `Open Time`, `Date/Time`, `timestamp`, `Date` |
| Exit time  | `soldTimestamp`, `ExitTime`, `Close Time` |
| Direction  | `direction`, `Side`, `Action`, `Buy/Sell`, `B/S` (optional — inferred from timestamps if omitted) |

Numbers are tolerant of `$`, `,`, and accounting `(123.45)` notation. Timestamps support `MM/DD/YYYY HH:MM:SS` (Tradovate style) and ISO formats.

---

## API Reference

All endpoints are served at `http://localhost:3001`.

| Method | Path                      | Purpose                                  |
|--------|---------------------------|------------------------------------------|
| GET    | `/api/trades`             | List trades (supports filters)           |
| GET    | `/api/trades/filters`     | Distinct symbols and setup tags          |
| GET    | `/api/trades/:id`         | Single trade                             |
| POST   | `/api/trades`             | Create trade                             |
| PUT    | `/api/trades/:id`         | Update trade                             |
| DELETE | `/api/trades/:id`         | Delete trade                             |
| DELETE | `/api/trades/all`         | Wipe all trades (danger zone)            |
| POST   | `/api/upload`             | Import CSV                               |
| GET    | `/api/stats`              | Aggregated dashboard stats               |
| GET    | `/api/settings`           | Read settings                            |
| PUT    | `/api/settings`           | Update settings (e.g. timezone)          |

---

## Roadmap Ideas

- Per-setup analytics breakdown
- Drawdown / MAR / Sharpe view
- Tag-based filtering and saved views
- Multi-account support
- Replay scrub against TradingView screenshots

---

## License

MIT — do whatever you want, no warranty.
