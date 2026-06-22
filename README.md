# Tradelytics.io

A trading journal and analytics app for futures traders. Import fills from your broker, tag setups, attach screenshots, and watch your edge develop over time through a clean, focused dashboard.

Multi-user out of the box: sign up with **email + password** or **Google**, and each account gets its own private journal backed by **Supabase** (hosted Postgres + Auth + Storage). See **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** to get a project running in a few minutes.

Try it out: https://tradelytics-io.vercel.app/

![Dashboard](readme-screenshots/Screenshot%202026-05-16%20131944.png)

---

## Try it out

Want to see the app in action without hand-entering trades? I've included a sample CSV of dummy data — **183 trades (~71% win rate, weekdays only)** — at **[`sample-data/sample-trades.csv`](./sample-data/sample-trades.csv)**.

1. Sign up with email or Google (locally, or on the live demo at **https://tradelytics-io.vercel.app**).
2. Open **Import** and drop in `sample-data/sample-trades.csv`.
3. The Dashboard, Trade Log, and calendar fill instantly — explore the stats, equity curve, and filters with realistic data.

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



MIT — do whatever you want, no warranty.
