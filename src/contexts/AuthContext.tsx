'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { User, Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    // Check active session on mount
    checkSession()

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] Auth state changed:', event, {
        userId: session?.user?.id,
        email: session?.user?.email
      })
      
      if (session) {
        setSession(session)
        setUser(session.user)
        setLoading(false)
      } else {
        setSession(null)
        setUser(null)
        setLoading(false)
      }

      // Handle specific auth events
      if (event === 'SIGNED_OUT') {
        router.push('/auth/signin')
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('[AuthContext] Token refreshed successfully')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const checkSession = async () => {
    try {
      setLoading(true)
      
      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('[AuthContext] Session check error:', error)
      }
      
      if (session) {
        console.log('[AuthContext] Session found:', {
          userId: session.user.id,
          email: session.user.email,
          expiresAt: session.expires_at
        })
        setSession(session)
        setUser(session.user)
      } else {
        console.log('[AuthContext] No active session')
      }
    } catch (error) {
      console.error('[AuthContext] Error checking session:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshSession = async () => {
    try {
      console.log('[AuthContext] Refreshing session...')
      const { data: { session }, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('[AuthContext] Session refresh error:', error)
        return
      }
      
      if (session) {
        console.log('[AuthContext] Session refreshed successfully')
        setSession(session)
        setUser(session.user)
      }
    } catch (error) {
      console.error('[AuthContext] Error refreshing session:', error)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('[AuthContext] Sign out error:', error)
      }
      setUser(null)
      setSession(null)
      router.push('/auth/signin')
    } catch (error) {
      console.error('[AuthContext] Error signing out:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}