'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { createSupabaseBrowser } from '@/lib/supabase'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: string
  is_active: boolean
  subscription_expires_at?: string | null
  created_at: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>
  signInWithGoogle: () => Promise<{ error: any }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileFetched, setProfileFetched] = useState(false)

  // Use SSR-compatible browser client
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {

        // Race getSession with a short timeout to avoid hanging the UI
        const sessionResult: any = await Promise.race([
          supabase.auth.getSession(),
          new Promise((resolve) => setTimeout(() => resolve({ __timeout: true }), 1500)),
        ])

        if (sessionResult?.__timeout) {
          console.warn('getSession timed out (~1.5s); proceeding without session')
          setUser(null)
          setLoading(false)
          return
        }

        const { data: { session }, error } = sessionResult

        if (error) {
          console.error('Session error, clearing invalid session:', error)
          // Clear any invalid session data
          await supabase.auth.signOut()
          setUser(null)
          setProfile(null)
          setProfileFetched(false)
          setLoading(false)
          return
        }

        setUser(session?.user ?? null)
        // End loading immediately after session is known
        setLoading(false)

        // Fetch profile once per session if not already fetched
        if (session?.user && !profileFetched) {
          const isAuthRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/auth')
          if (!isAuthRoute) {
            fetchProfileViaApi(session.user.id).catch((e) => {
              console.error('Background profile fetch failed:', e)
            })
          }
        }
      } catch (error) {
        console.error('Auth initialization error, clearing session:', error)
        // Clear any corrupted session state
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
        setProfileFetched(false)
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {

      try {
        setUser(session?.user ?? null)
        // End loading immediately; do not block on profile
        setLoading(false)

        if (event === 'SIGNED_IN' && session?.user && !profileFetched) {
          // Only fetch profile on fresh sign-in, not on token refresh
          fetchProfileViaApi(session.user.id).catch((e) => {
            console.error('Profile fetch on sign-in failed:', e)
          })
        } else if (event === 'SIGNED_OUT') {
          setProfile(null)
          setProfileFetched(false) // Reset for next session
        }
      } catch (error) {
        console.error('Error handling auth state change:', error)
        setUser(null)
        setProfile(null)
        setProfileFetched(false)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const inFlightProfileFetch = useRef<Promise<void> | null>(null)

  const fetchProfileViaApi = async (userId: string) => {
    if (inFlightProfileFetch.current) {
      await inFlightProfileFetch.current
      return
    }
    inFlightProfileFetch.current = (async () => {
      try {
        const res = await fetch(`/api/auth/get-profile?userId=${encodeURIComponent(userId)}`)
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.error || `Failed to fetch profile: ${res.status}`)
        }
        const json = await res.json()
        if (json?.profile) {
          setProfile(json.profile)
          setProfileFetched(true) // Mark as fetched for this session
        } else {
          setProfile(null)
          setProfileFetched(true) // Still mark as fetched to avoid retries
        }
      } catch (error) {
        console.error('AuthContext: fetchProfileViaApi error:', error)
        // Don't set profile to null on error - keep existing profile to prevent redirect loops
      } finally {
        inFlightProfileFetch.current = null
      }
    })()

    await inFlightProfileFetch.current
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    return { error }
  }

  const signInWithGoogle = async () => {
    // Dynamically determine the redirect URL based on environment
    const getRedirectUrl = () => {
      const origin = window.location.origin

      // For localhost development
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return `${origin}/auth/callback`
      }

      // For production - use the actual domain
      return `${origin}/auth/callback`
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getRedirectUrl(),
      },
    })
    return { error }
  }

  const signOut = async () => {
    
    // Reset profile state immediately
    setProfile(null)
    setProfileFetched(false)
    setUser(null)

    // Use server-side logout endpoint to properly clear session
    try {

      // Make a POST request to logout endpoint which will handle server-side signOut and redirect
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin', // Include cookies
      })

      // If the endpoint returns a redirect, follow it
      if (response.redirected) {
        window.location.href = response.url
      } else {
        // Fallback redirect
        window.location.href = '/auth/signin'
      }
    } catch (error) {
      console.error('AuthContext: Logout endpoint error, using fallback:', error)
      // Fallback to direct redirect
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/signin'
      }
    }
  }

  const refreshProfile = async () => {
    if (user) {
      setProfileFetched(false) // Allow refetch
      await fetchProfileViaApi(user.id)
    }
  }

  const isAdmin = profile?.role === 'ADMIN'

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshProfile,
    isAdmin,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}