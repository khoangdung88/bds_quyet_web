import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

export type Profile = {
  id: string
  full_name: string | null
  user_type: string | null
}

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>
  signUpWithEmail: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      setLoading(false)
    }
    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.user) { setProfile(null); return }
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, user_type')
        .eq('id', session.user.id)
        .maybeSingle()
      if (error) {
        // eslint-disable-next-line no-console
        console.warn('Không tải được profile:', error.message)
        setProfile(null)
        return
      }
      setProfile(data as Profile)
    }
    fetchProfile()
  }, [session?.user?.id])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    async signInWithEmail(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error }
    },
    async signUpWithEmail(email, password) {
      const { error } = await supabase.auth.signUp({ email, password })
      return { error }
    },
    async signOut() {
      const { error } = await supabase.auth.signOut()
      return { error }
    }
  }), [session, profile, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
