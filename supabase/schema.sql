-- Tradelytics.io — Supabase schema
-- Run this once in your project's SQL Editor (Dashboard → SQL Editor → New query → paste → Run).
-- Safe to re-run: it drops and recreates the row-level-security policies each time.

-- ─────────────────────────────────────────────────────────────────────────────
-- TRADES
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.trades (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references auth.users (id) on delete cascade,
  import_hash       text,
  symbol            text not null,
  qty               real,
  direction         text not null,
  buy_price         real not null,
  sell_price        real not null,
  pnl               real default 0,
  bought_timestamp  text,
  sold_timestamp    text,
  duration          text,
  points            real,
  session           text,
  day_of_week       text,
  hour_of_day       integer,
  stop_loss         real,
  r_multiple        real,
  setup_tag         text,
  notes             text,
  rating            integer,
  screenshot_path   text,
  created_at        timestamptz not null default now()
);

create index if not exists trades_user_id_idx on public.trades (user_id);

-- Dedupe imported trades per user. Manual trades have a NULL import_hash and are
-- naturally exempt (NULLs are distinct in a unique index, so many are allowed).
-- Kept non-partial so it can serve as the ON CONFLICT target for idempotent CSV
-- re-imports (a partial index can't be targeted by PostgREST's upsert).
create unique index if not exists trades_user_import_hash_key
  on public.trades (user_id, import_hash);

alter table public.trades enable row level security;

drop policy if exists "trades_select_own" on public.trades;
drop policy if exists "trades_insert_own" on public.trades;
drop policy if exists "trades_update_own" on public.trades;
drop policy if exists "trades_delete_own" on public.trades;

create policy "trades_select_own" on public.trades
  for select to authenticated using (auth.uid() = user_id);
create policy "trades_insert_own" on public.trades
  for insert to authenticated with check (auth.uid() = user_id);
create policy "trades_update_own" on public.trades
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "trades_delete_own" on public.trades
  for delete to authenticated using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- PER-USER SETTINGS (currently just the display timezone)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.user_settings (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  timezone   text not null default 'AEST',
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "settings_select_own" on public.user_settings;
drop policy if exists "settings_insert_own" on public.user_settings;
drop policy if exists "settings_update_own" on public.user_settings;

create policy "settings_select_own" on public.user_settings
  for select to authenticated using (auth.uid() = user_id);
create policy "settings_insert_own" on public.user_settings
  for insert to authenticated with check (auth.uid() = user_id);
create policy "settings_update_own" on public.user_settings
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- SCREENSHOTS — private storage bucket, one folder per user (path = {user_id}/...)
-- ─────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', false)
on conflict (id) do nothing;

drop policy if exists "screenshots_select_own" on storage.objects;
drop policy if exists "screenshots_insert_own" on storage.objects;
drop policy if exists "screenshots_update_own" on storage.objects;
drop policy if exists "screenshots_delete_own" on storage.objects;

create policy "screenshots_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "screenshots_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "screenshots_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "screenshots_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
