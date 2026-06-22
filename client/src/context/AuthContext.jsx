import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setLoading(false)
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [])

  const signInWithPassword = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUpWithPassword = (email, password) =>
    supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        // Always show Google's account chooser instead of silently reusing
        // the one already signed in to the browser.
        queryParams: { prompt: 'select_account' },
      },
    })

  const signOut = () => supabase.auth.signOut()

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
