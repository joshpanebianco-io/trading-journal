# Supabase Setup Guide

Tradelytics now stores trades in **Supabase** (hosted Postgres + Auth + Storage) instead of a local SQLite file, so multiple people can each sign up and keep their own private trading journal. Sign-in works with **email + password** or **Google**.

This guide walks you through the one-time setup. You only do steps 1–6 once; everyone else just signs up in the app.

> You'll need: a free [supabase.com](https://supabase.com) account, and (for Google sign-in) a Google account.

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Pick a name, a strong database password (save it somewhere), and a region close to you.
3. Wait ~2 minutes for it to provision.

## 2. Create the database tables, policies, and storage bucket

1. In your project, open **SQL Editor** (left sidebar) → **New query**.
2. Open the file [`supabase/schema.sql`](./supabase/schema.sql) from this repo, copy its entire contents, paste into the editor.
3. Click **Run**. You should see "Success. No rows returned."

This creates the `trades` and `user_settings` tables with **row-level security** (every user can only ever see their own rows), plus a private `screenshots` storage bucket with matching per-user access rules.

## 3. Get your API keys into the app

1. In Supabase, go to **Project Settings → API**.
2. Copy two values:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **anon public** key (under "Project API keys")
3. In this repo, copy `client/.env.example` to `client/.env.local`:
   ```bash
   cp client/.env.example client/.env.local
   ```
   (On Windows PowerShell: `Copy-Item client/.env.example client/.env.local`)
4. Edit `client/.env.local` and paste your values:
   ```
   VITE_SUPABASE_URL=https://abcd1234.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...your-anon-key...
   ```

> The anon key is **meant** to live in the browser — row-level security is what protects the data, not key secrecy. Never put the **service_role** key here, though.

## 4. Email + password sign-in

This works out of the box. One choice to make:

- **Project Settings → Authentication → Providers → Email** is enabled by default.
- By default Supabase sends a **confirmation email** before a new account can sign in. For personal/small use you can turn this off at **Authentication → Sign In / Providers → Email → "Confirm email"** (toggle off) so sign-up is instant. Leave it on if you want verified emails.

## 5. Google sign-in (optional but you asked for it)

You need a Google OAuth client, then paste its ID/secret into Supabase.

**A. In Supabase**, open **Authentication → Sign In / Providers → Google** and note the **Callback URL** shown there (looks like `https://abcd1234.supabase.co/auth/v1/callback`). Keep this tab open.

**B. In [Google Cloud Console](https://console.cloud.google.com/):**
1. Create (or pick) a project.
2. **APIs & Services → OAuth consent screen** → choose **External** → fill in app name + your email → save. Add yourself under **Test users** (or publish the app).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
4. Application type: **Web application**.
5. Under **Authorized redirect URIs**, paste the **Callback URL** from Supabase (step A).
6. Create → copy the **Client ID** and **Client secret**.

**C. Back in Supabase** (Google provider page): paste the **Client ID** and **Client secret**, toggle the provider **on**, and **Save**.

**D. Redirect URLs.** In Supabase **Authentication → URL Configuration**:
- Set **Site URL** to `http://localhost:5173` for local dev.
- Add any deploy URL (e.g. your Vercel domain) under **Redirect URLs** when you go live.

## 6. Install and run

```bash
# from the repo root
cd client && npm install && cd ..
npm run dev
```

Open http://localhost:5173, click **Sign Up**, create an account (or use **Continue with Google**), and you're in. Each person who signs up gets their own private journal.

---

## 7. Bring your existing trades across (optional)

You already have trades in `trading.db` and screenshots on disk. To copy them into your new Supabase account:

1. **Sign up / sign in once** in the app with the email you want to own the data (this creates the account in Supabase).
2. Get your **service_role** key: **Project Settings → API → service_role** (secret — handle carefully).
3. Set up and run the migration:
   ```bash
   cd scripts
   npm install
   cp .env.example .env        # PowerShell: Copy-Item .env.example .env
   ```
   Edit `scripts/.env`:
   ```
   SUPABASE_URL=https://abcd1234.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...service-role-key...
   MIGRATE_USER_EMAIL=you@example.com
   ```
   Then:
   ```bash
   node migrate-to-supabase.mjs
   ```
4. It prints how many trades and screenshots were copied. It's safe to re-run — already-imported trades are skipped.
5. Delete `scripts/.env` when you're done (it holds a powerful secret).

---

## Notes

- **The old Node/Express server is no longer used.** The app now talks to Supabase directly from the browser. The `server/` folder is left in the repo for reference and can be deleted.
- **Security model:** every query runs as the signed-in user and Postgres row-level security restricts it to `user_id = auth.uid()`. Screenshots are in a private bucket, namespaced per user, served via short-lived signed URLs.
- **Deploying:** this is now a static site — `cd client && npm run build` produces `client/dist`, deployable to Vercel/Netlify/etc. Set the two `VITE_SUPABASE_*` env vars in your host, and add the production URL to Supabase's Site URL / Redirect URLs.
