# Tradelytics.io

A trading journal and analytics app for futures traders. Import fills from your broker, tag setups, attach screenshots, and watch your edge develop over time through a clean, focused dashboard.

Multi-user out of the box: sign up with **email + password** or **Google**, and each account gets its own private journal backed by **Supabase** (hosted Postgres + Auth + Storage). See **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** to get a project running in a few minutes.

![Dashboard](readme-screenshots/Screenshot%202026-05-16%20131944.png)

---

## Why this exists

Most trading journals are either heavyweight web apps that hold your data hostage behind a subscription, or barebones spreadsheets that don't show you anything useful. Tradelytics aims to sit in the middle:

- **Quick to use.** Drop in a Tradovate (or similar) CSV and the trades are normalised, deduped, and instantly visible.
- **Honest stats.** Win rate, profit factor, R-multiples, streaks, session/time-of-day breakdowns — the numbers that actually tell you whether you have an edge.
- **Yours.** Your own private account, isolated by row-level security so no one else can see your trades. Export to CSV any time.

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
- `@supabase/supabase-js` (auth, data, storage), PapaParse (client-side CSV import)

**Backend (Supabase)**
- Supabase Auth — email/password + Google OAuth
- Postgres with row-level security (each user sees only their own `trades`)
- Supabase Storage — private per-user bucket for chart screenshots

No custom server to run or host — the React app talks to Supabase directly. (The legacy `server/` Express + SQLite code is kept in the repo for reference only.)

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm
- A Supabase project — follow **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** first (create project, run the SQL, enable Google sign-in, copy your keys into `client/.env.local`).

### Install
```bash
git clone <your-fork-url>
cd Trading.ai
cd client && npm install && cd ..
```

### Run (development)
```bash
npm run dev
```
This starts the Vite client at `localhost:5173`. There is no separate API server — the app connects to Supabase using the keys in `client/.env.local`.

On Windows you can also double-click `start.bat`, which launches the client and opens the app in your default browser.

### Build for production
```bash
cd client && npm run build
```
Produces a static site in `client/dist`, deployable to Vercel/Netlify/etc. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your host, and add the deployed URL to Supabase's Auth → URL Configuration.

### Build the client
```bash
cd client
npm run build
```

---

## Project Structure

```
Trading.ai/
├── client/                # React + Vite frontend (the whole app)
│   ├── src/
│   │   ├── pages/         # Login, Dashboard, TradeLog, Import, Settings
│   │   ├── components/    # Sidebar, StatCard, EquityCurve, PnlCalendar, TradeModal, ...
│   │   ├── context/       # AuthContext (session), SettingsContext (timezone)
│   │   └── lib/           # supabase client, api (data layer), calculations, stats, csv, timezone
│   ├── .env.example       # copy to .env.local with your Supabase keys
│   └── ...
├── supabase/
│   └── schema.sql         # tables, row-level-security policies, storage bucket
├── scripts/
│   └── migrate-to-supabase.mjs   # one-time import of old trading.db data
├── server/                # legacy Express + SQLite API (kept for reference, unused)
├── readme-screenshots/    # images used in this README
├── SUPABASE_SETUP.md      # setup walkthrough
└── start.bat              # Windows launcher (client only)
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

## Data layer

There's no REST API anymore — `client/src/lib/api.js` is the single data layer and calls Supabase directly. Every call runs as the signed-in user and is restricted to their own rows by Postgres row-level security. The functions it exposes:

| Function | Purpose |
|----------|---------|
| `getTrades(filters)` | List the user's trades (symbol/direction/setup/session/date filters) |
| `getTradeFilters()` | Distinct symbols and setup tags |
| `addTrade(data)` / `updateTrade(id, data)` | Create / update a trade (derived fields computed client-side) |
| `deleteTrade(id)` / `clearAllTrades()` | Delete one / all (also removes screenshots) |
| `uploadScreenshot(id, file)` / `deleteScreenshot(id)` / `getScreenshotUrl(path)` | Private-bucket screenshot upload, delete, signed-URL fetch |
| `previewCSV(file)` / `importCSV(file)` | Parse + import a broker CSV in the browser (deduped by import hash) |
| `getStats(params)` | Aggregated dashboard stats, computed client-side |
| `getSettings()` / `updateSetting(key, value)` | Per-user settings (display timezone) |

---

## Roadmap Ideas

- Per-setup analytics breakdown
- Drawdown / MAR / Sharpe view
- Tag-based filtering and saved views
- Replay scrub against TradingView screenshots

---

## License

MIT — do whatever you want, no warranty.
