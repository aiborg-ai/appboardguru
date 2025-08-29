import { createStore, createSelectors } from './store-config'
import { UserWithProfile, LoadingState, ErrorState, StoreSlice } from './types'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import type { User as SupabaseUser, Session, AuthError } from '@supabase/supabase-js'

// Auth state interface
export interface AuthState extends StoreSlice {
  // Core auth data
  user: UserWithProfile | null
  session: Session | null
  isAuthenticated: boolean
  
  // Loading states
  loading: LoadingState
  
  // Error states
  errors: ErrorState
  
  // Profile and preferences
  profile: UserWithProfile['profile'] | null
  preferences: UserWithProfile['preferences'] | null
  
  // Auth flow state
  isLoading: boolean
  isInitialized: boolean
  lastActivity: number
  sessionExpiry: number | null
  
  // Actions
  signIn: (email: string, password: string) => Promise<{ user: SupabaseUser; session: Session } | null>
  signUp: (email: string, password: string, metadata?: any) => Promise<{ user: SupabaseUser; session: Session } | null>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserWithProfile['profile']>) => Promise<void>
  updatePreferences: (updates: Partial<UserWithProfile['preferences']>) => Promise<void>
  refreshSession: () => Promise<Session | null>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  deleteAccount: () => Promise<void>
  
  // Internal actions
  setUser: (user: UserWithProfile | null) => void
  setSession: (session: Session | null) => void
  setLoading: (key: string, loading: boolean) => void
  setError: (key: string, error: string | null) => void
  initialize: () => Promise<void>
  cleanup: () => void
}

// Default preferences
const DEFAULT_PREFERENCES: UserWithProfile['preferences'] = {
  theme: 'system',
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  email_notifications: true,
  push_notifications: true,
  desktop_notifications: true,
  notification_frequency: 'real_time',
  auto_save: true,
  default_view: 'grid'
}

// Create the auth store
export const authStore = createStore<AuthState>(
  (set, get) => ({
    // Initial state
    user: null,
    session: null,
    isAuthenticated: false,
    loading: {},
    errors: {},
    profile: null,
    preferences: DEFAULT_PREFERENCES,
    isLoading: false,
    isInitialized: false,
    lastActivity: Date.now(),
    sessionExpiry: null,

    // Sign in action
    signIn: async (email: string, password: string) => {
      const supabase = createSupabaseBrowserClient()
      
      set(draft => {
        draft.loading.signIn = true
        draft.errors.signIn = null
      })

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (error) throw error

        if (data.user && data.session) {
          // Fetch user profile
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .single()

          // Fetch user preferences
          const { data: preferences } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', data.user.id)
            .single()

          const userWithProfile: UserWithProfile = {
            id: data.user.id,
            email: data.user.email!,
            full_name: data.user.user_metadata?.full_name,
            avatar_url: data.user.user_metadata?.avatar_url,
            created_at: data.user.created_at!,
            updated_at: data.user.updated_at!,
            profile: profile || undefined,
            preferences: preferences || DEFAULT_PREFERENCES
          }

          set(draft => {
            draft.user = userWithProfile
            draft.session = data.session
            draft.isAuthenticated = true
            draft.profile = userWithProfile.profile || null
            draft.preferences = userWithProfile.preferences || DEFAULT_PREFERENCES
            draft.lastActivity = Date.now()
            draft.sessionExpiry = data.session.expires_at ? new Date(data.session.expires_at * 1000).getTime() : null
            draft.loading.signIn = false
          })

          return { user: data.user, session: data.session }
        }

        return null
      } catch (error) {
        set(draft => {
          draft.loading.signIn = false
          draft.errors.signIn = error instanceof Error ? error.message : 'Sign in failed'
        })
        return null
      }
    },

    // Sign up action
    signUp: async (email: string, password: string, metadata = {}) => {
      const supabase = createSupabaseBrowserClient()
      
      set(draft => {
        draft.loading.signUp = true
        draft.errors.signUp = null
      })

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: metadata
          }
        })

        if (error) throw error

        if (data.user && data.session) {
          const userWithProfile: UserWithProfile = {
            id: data.user.id,
            email: data.user.email!,
            full_name: data.user.user_metadata?.full_name,
            avatar_url: data.user.user_metadata?.avatar_url,
            created_at: data.user.created_at!,
            updated_at: data.user.updated_at!,
            profile: undefined,
            preferences: DEFAULT_PREFERENCES
          }

          set(draft => {
            draft.user = userWithProfile
            draft.session = data.session
            draft.isAuthenticated = true
            draft.profile = null
            draft.preferences = DEFAULT_PREFERENCES
            draft.lastActivity = Date.now()
            draft.sessionExpiry = data.session.expires_at ? new Date(data.session.expires_at * 1000).getTime() : null
            draft.loading.signUp = false
          })

          return { user: data.user, session: data.session }
        }

        return null
      } catch (error) {
        set(draft => {
          draft.loading.signUp = false
          draft.errors.signUp = error instanceof Error ? error.message : 'Sign up failed'
        })
        return null
      }
    },

    // Sign out action
    signOut: async () => {
      const supabase = createSupabaseBrowserClient()
      
      set(draft => {
        draft.loading.signOut = true
        draft.errors.signOut = null
      })

      try {
        await supabase.auth.signOut()
        
        set(draft => {
          draft.user = null
          draft.session = null
          draft.isAuthenticated = false
          draft.profile = null
          draft.preferences = DEFAULT_PREFERENCES
          draft.lastActivity = Date.now()
          draft.sessionExpiry = null
          draft.loading.signOut = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.signOut = false
          draft.errors.signOut = error instanceof Error ? error.message : 'Sign out failed'
        })
      }
    },

    // Update profile action
    updateProfile: async (updates: Partial<UserWithProfile['profile']>) => {
      const { user } = get()
      if (!user) throw new Error('User not authenticated')

      const supabase = createSupabaseBrowserClient()
      
      set(draft => {
        draft.loading.updateProfile = true
        draft.errors.updateProfile = null
      })

      try {
        const { error } = await supabase
          .from('user_profiles')
          .upsert({
            user_id: user.id,
            ...updates,
            updated_at: new Date().toISOString()
          })

        if (error) throw error

        set(draft => {
          draft.profile = { ...draft.profile, ...updates }
          if (draft.user) {
            draft.user.profile = { ...draft.user.profile, ...updates }
          }
          draft.loading.updateProfile = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.updateProfile = false
          draft.errors.updateProfile = error instanceof Error ? error.message : 'Profile update failed'
        })
      }
    },

    // Update preferences action
    updatePreferences: async (updates: Partial<UserWithProfile['preferences']>) => {
      const { user } = get()
      if (!user) throw new Error('User not authenticated')

      const supabase = createSupabaseBrowserClient()
      
      set(draft => {
        draft.loading.updatePreferences = true
        draft.errors.updatePreferences = null
      })

      try {
        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            ...updates,
            updated_at: new Date().toISOString()
          })

        if (error) throw error

        set(draft => {
          draft.preferences = { ...draft.preferences, ...updates }
          if (draft.user) {
            draft.user.preferences = { ...draft.user.preferences, ...updates }
          }
          draft.loading.updatePreferences = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.updatePreferences = false
          draft.errors.updatePreferences = error instanceof Error ? error.message : 'Preferences update failed'
        })
      }
    },

    // Refresh session action
    refreshSession: async () => {
      const supabase = createSupabaseBrowserClient()
      
      try {
        const { data, error } = await supabase.auth.refreshSession()
        
        if (error) throw error
        
        if (data.session) {
          set(draft => {
            draft.session = data.session
            draft.sessionExpiry = data.session.expires_at ? new Date(data.session.expires_at * 1000).getTime() : null
            draft.lastActivity = Date.now()
          })
          
          return data.session
        }
        
        return null
      } catch (error) {
        console.error('Session refresh failed:', error)
        return null
      }
    },

    // Reset password action
    resetPassword: async (email: string) => {
      const supabase = createSupabaseBrowserClient()
      
      set(draft => {
        draft.loading.resetPassword = true
        draft.errors.resetPassword = null
      })

      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`
        })

        if (error) throw error

        set(draft => {
          draft.loading.resetPassword = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.resetPassword = false
          draft.errors.resetPassword = error instanceof Error ? error.message : 'Password reset failed'
        })
      }
    },

    // Update password action
    updatePassword: async (password: string) => {
      const supabase = createSupabaseBrowserClient()
      
      set(draft => {
        draft.loading.updatePassword = true
        draft.errors.updatePassword = null
      })

      try {
        const { error } = await supabase.auth.updateUser({ password })

        if (error) throw error

        set(draft => {
          draft.loading.updatePassword = false
        })
      } catch (error) {
        set(draft => {
          draft.loading.updatePassword = false
          draft.errors.updatePassword = error instanceof Error ? error.message : 'Password update failed'
        })
      }
    },

    // Delete account action
    deleteAccount: async () => {
      const { user } = get()
      if (!user) throw new Error('User not authenticated')

      set(draft => {
        draft.loading.deleteAccount = true
        draft.errors.deleteAccount = null
      })

      try {
        // Call API to delete account (this should handle cascade deletion)
        const response = await fetch('/api/user/delete-account', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        })

        if (!response.ok) {
          throw new Error('Account deletion failed')
        }

        // Sign out after successful deletion
        await get().signOut()
      } catch (error) {
        set(draft => {
          draft.loading.deleteAccount = false
          draft.errors.deleteAccount = error instanceof Error ? error.message : 'Account deletion failed'
        })
      }
    },

    // Internal actions
    setUser: (user: UserWithProfile | null) => {
      set(draft => {
        draft.user = user
        draft.isAuthenticated = !!user
        draft.profile = user?.profile || null
        draft.preferences = user?.preferences || DEFAULT_PREFERENCES
      })
    },

    setSession: (session: Session | null) => {
      set(draft => {
        draft.session = session
        draft.sessionExpiry = session?.expires_at ? new Date(session.expires_at * 1000).getTime() : null
      })
    },

    setLoading: (key: string, loading: boolean) => {
      set(draft => {
        draft.loading[key] = loading
        draft.isLoading = Object.values(draft.loading).some(Boolean)
      })
    },

    setError: (key: string, error: string | null) => {
      set(draft => {
        draft.errors[key] = error
      })
    },

    // Initialize auth state
    initialize: async () => {
      const supabase = createSupabaseBrowserClient()
      
      set(draft => {
        draft.loading.initialize = true
      })

      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          // Fetch user profile and preferences
          const [profileRes, preferencesRes] = await Promise.all([
            supabase.from('user_profiles').select('*').eq('user_id', session.user.id).single(),
            supabase.from('user_preferences').select('*').eq('user_id', session.user.id).single()
          ])

          const userWithProfile: UserWithProfile = {
            id: session.user.id,
            email: session.user.email!,
            full_name: session.user.user_metadata?.full_name,
            avatar_url: session.user.user_metadata?.avatar_url,
            created_at: session.user.created_at!,
            updated_at: session.user.updated_at!,
            profile: profileRes.data || undefined,
            preferences: preferencesRes.data || DEFAULT_PREFERENCES
          }

          set(draft => {
            draft.user = userWithProfile
            draft.session = session
            draft.isAuthenticated = true
            draft.profile = userWithProfile.profile || null
            draft.preferences = userWithProfile.preferences || DEFAULT_PREFERENCES
            draft.sessionExpiry = session.expires_at ? new Date(session.expires_at * 1000).getTime() : null
          })
        }

        set(draft => {
          draft.isInitialized = true
          draft.loading.initialize = false
        })

        // Set up auth state change listener
        supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_OUT' || !session) {
            get().setUser(null)
            get().setSession(null)
          } else if (event === 'SIGNED_IN' && session) {
            get().setSession(session)
            // User data will be updated by sign in action
          }
        })
      } catch (error) {
        set(draft => {
          draft.isInitialized = true
          draft.loading.initialize = false
          draft.errors.initialize = error instanceof Error ? error.message : 'Initialization failed'
        })
      }
    },

    cleanup: () => {
      set(draft => {
        draft.user = null
        draft.session = null
        draft.isAuthenticated = false
        draft.loading = {}
        draft.errors = {}
        draft.profile = null
        draft.preferences = DEFAULT_PREFERENCES
        draft.isInitialized = false
        draft.lastActivity = Date.now()
        draft.sessionExpiry = null
      })
    },

    _meta: {
      version: 1,
      lastUpdated: Date.now(),
      hydrated: false
    }
  }),
  {
    name: 'auth',
    version: 1,
    partialize: (state) => ({
      preferences: state.preferences,
      lastActivity: state.lastActivity,
      // Don't persist sensitive auth data
      _meta: state._meta
    })
  }
)

// Create selectors for better performance
export const authSelectors = createSelectors(authStore)

// Utility hooks and functions
export const useAuth = () => authStore()
export const useAuthStore = () => authStore()  // Alternative name for compatibility
export const useUser = () => authStore(state => state.user)
export const useIsAuthenticated = () => authStore(state => state.isAuthenticated)
export const useAuthLoading = () => authStore(state => state.isLoading)
export const useProfile = () => authStore(state => state.profile)
export const usePreferences = () => authStore(state => state.preferences)

// Initialize auth store on app start
if (typeof window !== 'undefined') {
  authStore.getState().initialize()
}