import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Surfaced early so a missing .env.local is obvious rather than a cryptic auth failure later.
  throw new Error(
    'Missing Supabase config. Copy client/.env.example to client/.env.local and set ' +
    'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see SUPABASE_SETUP.md).'
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const SCREENSHOT_BUCKET = 'screenshots'
