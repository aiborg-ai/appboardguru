import { createEnhancedStore } from './middleware'
import { withComputedProperties } from './computed-store'
import { withOptimisticUpdates } from './optimistic-store'
import { withSynchronization } from './sync-manager'
import { UserWithProfile, LoadingState, ErrorState, StoreSlice } from './types'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import type { User as SupabaseUser, Session, AuthError } from '@supabase/supabase-js'

// Enhanced auth state with advanced patterns
export interface EnhancedAuthState extends StoreSlice {
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
  
  // Enhanced features
  loginAttempts: number
  lastLoginAttempt: number
  lockoutUntil: number | null
  deviceFingerprint: string | null
  biometricEnabled: boolean
  
  // Security monitoring
  securityEvents: Array<{
    id: string
    type: 'login' | 'logout' | 'failed_login' | 'password_change' | 'suspicious_activity'
    timestamp: number
    metadata?: Record<string, any>
  }>
  
  // Session management
  sessionHistory: Array<{
    id: string
    startTime: number
    endTime?: number
    device?: string
    location?: string
  }>
  
  // Actions
  signIn: (email: string, password: string, options?: { 
    rememberMe?: boolean
    deviceTrust?: boolean 
  }) => Promise<{ user: SupabaseUser; session: Session } | null>
  
  signUp: (email: string, password: string, metadata?: any) => Promise<{ user: SupabaseUser; session: Session } | null>
  
  signOut: (allDevices?: boolean) => Promise<void>
  
  updateProfile: (updates: Partial<UserWithProfile['profile']>) => Promise<void>
  
  updatePreferences: (updates: Partial<UserWithProfile['preferences']>) => Promise<void>
  
  refreshSession: () => Promise<Session | null>
  
  resetPassword: (email: string) => Promise<void>
  
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>
  
  deleteAccount: (confirmation: string) => Promise<void>
  
  // Enhanced security actions
  enableBiometric: () => Promise<boolean>
  disableBiometric: () => Promise<void>
  authenticateBiometric: () => Promise<boolean>
  
  // Session management
  getActiveSessions: () => Promise<any[]>
  terminateSession: (sessionId: string) => Promise<void>
  terminateAllSessions: () => Promise<void>
  
  // Security monitoring
  addSecurityEvent: (type: string, metadata?: Record<string, any>) => void
  getSecurityEvents: (limit?: number) => Array<any>
  clearSecurityEvents: () => void
  
  // Account lockout
  checkAccountLockout: () => boolean
  clearLockout: () => void
  
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

// Device fingerprinting utility
const generateDeviceFingerprint = (): string => {
  if (typeof window === 'undefined') return 'server'
  
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx?.fillText('fingerprint', 2, 2)
  
  return btoa(JSON.stringify({
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    canvas: canvas.toDataURL()
  })).substring(0, 32)
}

// Biometric authentication utility
const biometricAuth = {
  isSupported: (): boolean => {
    return typeof window !== 'undefined' && 
           'credentials' in navigator && 
           'create' in navigator.credentials &&
           'get' in navigator.credentials
  },
  
  async register(): Promise<boolean> {
    if (!biometricAuth.isSupported()) return false
    
    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: 'AppBoardGuru' },
          user: {
            id: new Uint8Array(32),
            name: 'user@example.com',
            displayName: 'User'
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required'
          }
        }
      } as any)
      
      return !!credential
    } catch (error) {
      console.error('[BiometricAuth] Registration failed:', error)
      return false
    }
  },
  
  async authenticate(): Promise<boolean> {
    if (!biometricAuth.isSupported()) return false
    
    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          userVerification: 'required'
        }
      } as any)
      
      return !!credential
    } catch (error) {
      console.error('[BiometricAuth] Authentication failed:', error)
      return false
    }
  }
}

// Create enhanced auth store
const authStoreInitializer = (set: any, get: any) => ({
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
  
  // Enhanced security state
  loginAttempts: 0,
  lastLoginAttempt: 0,
  lockoutUntil: null,
  deviceFingerprint: generateDeviceFingerprint(),
  biometricEnabled: false,
  securityEvents: [],
  sessionHistory: [],

  // Enhanced sign in with security features
  signIn: async (email: string, password: string, options: { 
    rememberMe?: boolean
    deviceTrust?: boolean 
  } = {}) => {
    const state = get()
    
    // Check account lockout
    if (state.checkAccountLockout()) {
      const lockoutTime = Math.ceil((state.lockoutUntil - Date.now()) / 60000)
      set((draft: any) => {
        draft.errors.signIn = `Account locked. Try again in ${lockoutTime} minutes.`
      })
      return null
    }

    const supabase = createSupabaseBrowserClient()
    
    set((draft: any) => {
      draft.loading.signIn = true
      draft.errors.signIn = null
      draft.lastLoginAttempt = Date.now()
    })

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      if (data.user && data.session) {
        // Fetch user profile and preferences
        const [profileRes, preferencesRes] = await Promise.all([
          supabase.from('user_profiles').select('*').eq('user_id', data.user.id).single(),
          supabase.from('user_preferences').select('*').eq('user_id', data.user.id).single()
        ])

        const userWithProfile: UserWithProfile = {
          id: data.user.id,
          email: data.user.email!,
          full_name: data.user.user_metadata?.full_name,
          avatar_url: data.user.user_metadata?.avatar_url,
          created_at: data.user.created_at!,
          updated_at: data.user.updated_at!,
          profile: profileRes.data || undefined,
          preferences: preferencesRes.data || DEFAULT_PREFERENCES
        }

        set((draft: any) => {
          draft.user = userWithProfile
          draft.session = data.session
          draft.isAuthenticated = true
          draft.profile = userWithProfile.profile || null
          draft.preferences = userWithProfile.preferences || DEFAULT_PREFERENCES
          draft.lastActivity = Date.now()
          draft.sessionExpiry = data.session.expires_at ? new Date(data.session.expires_at * 1000).getTime() : null
          draft.loading.signIn = false
          draft.loginAttempts = 0 // Reset on successful login
          draft.lockoutUntil = null
        })

        // Add security event
        state.addSecurityEvent('login', {
          deviceFingerprint: state.deviceFingerprint,
          rememberMe: options.rememberMe,
          deviceTrust: options.deviceTrust
        })

        // Add session to history
        set((draft: any) => {
          draft.sessionHistory.push({
            id: data.session.access_token.substring(0, 16),
            startTime: Date.now(),
            device: navigator.userAgent,
            location: 'Unknown' // Would integrate with geolocation
          })
        })

        return { user: data.user, session: data.session }
      }

      return null
    } catch (error) {
      // Handle failed login attempt
      set((draft: any) => {
        draft.loading.signIn = false
        draft.errors.signIn = error instanceof Error ? error.message : 'Sign in failed'
        draft.loginAttempts++
        
        // Implement progressive lockout
        if (draft.loginAttempts >= 5) {
          draft.lockoutUntil = Date.now() + (15 * 60 * 1000) // 15 minutes
        } else if (draft.loginAttempts >= 3) {
          draft.lockoutUntil = Date.now() + (5 * 60 * 1000) // 5 minutes
        }
      })

      // Add security event for failed login
      state.addSecurityEvent('failed_login', {
        email,
        deviceFingerprint: state.deviceFingerprint,
        attempt: state.loginAttempts + 1
      })

      return null
    }
  },

  // Enhanced sign up
  signUp: async (email: string, password: string, metadata = {}) => {
    const supabase = createSupabaseBrowserClient()
    
    set((draft: any) => {
      draft.loading.signUp = true
      draft.errors.signUp = null
    })

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            ...metadata,
            deviceFingerprint: get().deviceFingerprint
          }
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

        set((draft: any) => {
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
      set((draft: any) => {
        draft.loading.signUp = false
        draft.errors.signUp = error instanceof Error ? error.message : 'Sign up failed'
      })
      return null
    }
  },

  // Enhanced sign out
  signOut: async (allDevices = false) => {
    const supabase = createSupabaseBrowserClient()
    const state = get()
    
    set((draft: any) => {
      draft.loading.signOut = true
      draft.errors.signOut = null
    })

    try {
      if (allDevices) {
        // Sign out from all devices
        await supabase.auth.signOut({ scope: 'global' })
      } else {
        await supabase.auth.signOut()
      }
      
      // Add security event
      state.addSecurityEvent('logout', { allDevices })
      
      // End current session in history
      set((draft: any) => {
        const currentSession = draft.sessionHistory[draft.sessionHistory.length - 1]
        if (currentSession && !currentSession.endTime) {
          currentSession.endTime = Date.now()
        }
      })
      
      set((draft: any) => {
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
      set((draft: any) => {
        draft.loading.signOut = false
        draft.errors.signOut = error instanceof Error ? error.message : 'Sign out failed'
      })
    }
  },

  // Enhanced password update with current password verification
  updatePassword: async (currentPassword: string, newPassword: string) => {
    const { user } = get()
    if (!user) throw new Error('User not authenticated')

    const supabase = createSupabaseBrowserClient()
    
    set((draft: any) => {
      draft.loading.updatePassword = true
      draft.errors.updatePassword = null
    })

    try {
      // First verify current password
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      })

      if (verifyError) throw new Error('Current password is incorrect')

      // Update password
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) throw error

      // Add security event
      get().addSecurityEvent('password_change', {
        timestamp: Date.now()
      })

      set((draft: any) => {
        draft.loading.updatePassword = false
      })
    } catch (error) {
      set((draft: any) => {
        draft.loading.updatePassword = false
        draft.errors.updatePassword = error instanceof Error ? error.message : 'Password update failed'
      })
    }
  },

  // Enhanced account deletion with confirmation
  deleteAccount: async (confirmation: string) => {
    const { user } = get()
    if (!user) throw new Error('User not authenticated')

    if (confirmation !== 'DELETE') {
      throw new Error('Invalid confirmation. Please type "DELETE" to confirm.')
    }

    set((draft: any) => {
      draft.loading.deleteAccount = true
      draft.errors.deleteAccount = null
    })

    try {
      // Call API to delete account
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation })
      })

      if (!response.ok) {
        throw new Error('Account deletion failed')
      }

      // Sign out after successful deletion
      await get().signOut()
    } catch (error) {
      set((draft: any) => {
        draft.loading.deleteAccount = false
        draft.errors.deleteAccount = error instanceof Error ? error.message : 'Account deletion failed'
      })
    }
  },

  // Biometric authentication methods
  enableBiometric: async () => {
    if (!biometricAuth.isSupported()) {
      set((draft: any) => {
        draft.errors.biometric = 'Biometric authentication not supported'
      })
      return false
    }

    try {
      const success = await biometricAuth.register()
      if (success) {
        set((draft: any) => {
          draft.biometricEnabled = true
          draft.errors.biometric = null
        })
        
        get().addSecurityEvent('biometric_enabled')
      }
      return success
    } catch (error) {
      set((draft: any) => {
        draft.errors.biometric = error instanceof Error ? error.message : 'Biometric setup failed'
      })
      return false
    }
  },

  disableBiometric: async () => {
    set((draft: any) => {
      draft.biometricEnabled = false
    })
    
    get().addSecurityEvent('biometric_disabled')
  },

  authenticateBiometric: async () => {
    if (!get().biometricEnabled) return false
    
    try {
      const success = await biometricAuth.authenticate()
      if (success) {
        get().addSecurityEvent('biometric_login')
      }
      return success
    } catch (error) {
      console.error('[BiometricAuth] Authentication failed:', error)
      return false
    }
  },

  // Session management
  getActiveSessions: async () => {
    // This would integrate with Supabase sessions API
    return get().sessionHistory.filter((session: any) => !session.endTime)
  },

  terminateSession: async (sessionId: string) => {
    // Implementation would call Supabase API to terminate specific session
    set((draft: any) => {
      const session = draft.sessionHistory.find((s: any) => s.id === sessionId)
      if (session) {
        session.endTime = Date.now()
      }
    })
  },

  terminateAllSessions: async () => {
    await get().signOut(true)
  },

  // Security monitoring
  addSecurityEvent: (type: string, metadata = {}) => {
    const event = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: Date.now(),
      metadata
    }

    set((draft: any) => {
      draft.securityEvents.push(event)
      
      // Keep only last 100 events
      if (draft.securityEvents.length > 100) {
        draft.securityEvents = draft.securityEvents.slice(-100)
      }
    })

    console.log(`[AuthStore] Security event: ${type}`, metadata)
  },

  getSecurityEvents: (limit = 20) => {
    return get().securityEvents.slice(-limit).reverse()
  },

  clearSecurityEvents: () => {
    set((draft: any) => {
      draft.securityEvents = []
    })
  },

  // Account lockout management
  checkAccountLockout: () => {
    const { lockoutUntil } = get()
    return lockoutUntil ? Date.now() < lockoutUntil : false
  },

  clearLockout: () => {
    set((draft: any) => {
      draft.lockoutUntil = null
      draft.loginAttempts = 0
    })
  },

  // Standard methods (keeping existing implementations)
  updateProfile: async (updates: Partial<UserWithProfile['profile']>) => {
    // Implementation from original auth-store.ts
    const { user } = get()
    if (!user) throw new Error('User not authenticated')

    const supabase = createSupabaseBrowserClient()
    
    set((draft: any) => {
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

      set((draft: any) => {
        draft.profile = { ...draft.profile, ...updates }
        if (draft.user) {
          draft.user.profile = { ...draft.user.profile, ...updates }
        }
        draft.loading.updateProfile = false
      })
    } catch (error) {
      set((draft: any) => {
        draft.loading.updateProfile = false
        draft.errors.updateProfile = error instanceof Error ? error.message : 'Profile update failed'
      })
    }
  },

  updatePreferences: async (updates: Partial<UserWithProfile['preferences']>) => {
    // Implementation from original auth-store.ts
    const { user } = get()
    if (!user) throw new Error('User not authenticated')

    const supabase = createSupabaseBrowserClient()
    
    set((draft: any) => {
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

      set((draft: any) => {
        draft.preferences = { ...draft.preferences, ...updates }
        if (draft.user) {
          draft.user.preferences = { ...draft.user.preferences, ...updates }
        }
        draft.loading.updatePreferences = false
      })
    } catch (error) {
      set((draft: any) => {
        draft.loading.updatePreferences = false
        draft.errors.updatePreferences = error instanceof Error ? error.message : 'Preferences update failed'
      })
    }
  },

  refreshSession: async () => {
    // Implementation from original auth-store.ts
    const supabase = createSupabaseBrowserClient()
    
    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) throw error
      
      if (data.session) {
        set((draft: any) => {
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

  resetPassword: async (email: string) => {
    // Implementation from original auth-store.ts
    const supabase = createSupabaseBrowserClient()
    
    set((draft: any) => {
      draft.loading.resetPassword = true
      draft.errors.resetPassword = null
    })

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })

      if (error) throw error

      set((draft: any) => {
        draft.loading.resetPassword = false
      })
    } catch (error) {
      set((draft: any) => {
        draft.loading.resetPassword = false
        draft.errors.resetPassword = error instanceof Error ? error.message : 'Password reset failed'
      })
    }
  },

  // Internal actions (keeping existing implementations)
  setUser: (user: UserWithProfile | null) => {
    set((draft: any) => {
      draft.user = user
      draft.isAuthenticated = !!user
      draft.profile = user?.profile || null
      draft.preferences = user?.preferences || DEFAULT_PREFERENCES
    })
  },

  setSession: (session: Session | null) => {
    set((draft: any) => {
      draft.session = session
      draft.sessionExpiry = session?.expires_at ? new Date(session.expires_at * 1000).getTime() : null
    })
  },

  setLoading: (key: string, loading: boolean) => {
    set((draft: any) => {
      draft.loading[key] = loading
      draft.isLoading = Object.values(draft.loading).some(Boolean)
    })
  },

  setError: (key: string, error: string | null) => {
    set((draft: any) => {
      draft.errors[key] = error
    })
  },

  initialize: async () => {
    // Implementation from original auth-store.ts with enhancements
    const supabase = createSupabaseBrowserClient()
    
    set((draft: any) => {
      draft.loading.initialize = true
    })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
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

        set((draft: any) => {
          draft.user = userWithProfile
          draft.session = session
          draft.isAuthenticated = true
          draft.profile = userWithProfile.profile || null
          draft.preferences = userWithProfile.preferences || DEFAULT_PREFERENCES
          draft.sessionExpiry = session.expires_at ? new Date(session.expires_at * 1000).getTime() : null
        })
      }

      set((draft: any) => {
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
        }
      })
    } catch (error) {
      set((draft: any) => {
        draft.isInitialized = true
        draft.loading.initialize = false
        draft.errors.initialize = error instanceof Error ? error.message : 'Initialization failed'
      })
    }
  },

  cleanup: () => {
    set((draft: any) => {
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
      draft.securityEvents = []
      draft.sessionHistory = []
    })
  },

  _meta: {
    version: 1,
    lastUpdated: Date.now(),
    hydrated: false
  }
})

// Create the enhanced auth store with all advanced features
export const enhancedAuthStore = createEnhancedStore(
  authStoreInitializer,
  'enhanced-auth',
  {
    persistence: {
      name: 'enhanced-auth',
      storage: 'localStorage',
      partialize: (state: any) => ({
        preferences: state.preferences,
        deviceFingerprint: state.deviceFingerprint,
        biometricEnabled: state.biometricEnabled,
        sessionHistory: state.sessionHistory.slice(-10), // Keep last 10 sessions
        lastActivity: state.lastActivity,
        _meta: state._meta
      }),
      encryption: {
        enabled: true
      },
      sync: {
        crossTab: true,
        conflictResolution: 'timestamp_wins'
      }
    },
    devtools: {
      enabled: true,
      name: 'Enhanced Auth Store',
      timeTravel: {
        enabled: true,
        maxSnapshots: 30
      }
    }
  }
)

// Add computed properties
const enhancedAuthWithComputed = withComputedProperties(enhancedAuthStore)
const enhancedAuthWithOptimistic = withOptimisticUpdates(enhancedAuthWithComputed)
const enhancedAuthWithSync = withSynchronization(enhancedAuthWithOptimistic, 'enhanced-auth')

// Define computed properties
enhancedAuthWithSync.defineComputed(
  'isSessionExpiringSoon',
  (state: any) => state.sessionExpiry && state.sessionExpiry - Date.now() < 300000, // 5 minutes
  ['sessionExpiry']
)

enhancedAuthWithSync.defineComputed(
  'securityScore',
  (state: any) => {
    let score = 0
    if (state.user) score += 20
    if (state.biometricEnabled) score += 30
    if (state.preferences?.email_notifications) score += 10
    if (state.sessionHistory.length > 0) score += 20
    if (state.loginAttempts === 0) score += 20
    return Math.min(score, 100)
  },
  ['user', 'biometricEnabled', 'preferences', 'sessionHistory', 'loginAttempts']
)

enhancedAuthWithSync.defineComputed(
  'isHighRiskSession',
  (state: any) => {
    const recentFailedLogins = state.securityEvents
      .filter((event: any) => event.type === 'failed_login' && Date.now() - event.timestamp < 3600000)
      .length
    return recentFailedLogins >= 3 || state.loginAttempts >= 2
  },
  ['securityEvents', 'loginAttempts']
)

// Create selectors for better performance
export const enhancedAuthSelectors = {
  user: (state: any) => state.user,
  isAuthenticated: (state: any) => state.isAuthenticated,
  loading: (state: any) => state.loading,
  errors: (state: any) => state.errors,
  preferences: (state: any) => state.preferences,
  securityScore: (state: any) => state.getComputedValue('securityScore'),
  isSessionExpiringSoon: (state: any) => state.getComputedValue('isSessionExpiringSoon'),
  isHighRiskSession: (state: any) => state.getComputedValue('isHighRiskSession'),
  securityEvents: (state: any) => state.getSecurityEvents(),
  activeSessions: (state: any) => state.sessionHistory.filter((s: any) => !s.endTime)
}

// Utility hooks
export const useEnhancedAuth = () => enhancedAuthWithSync()
export const useUser = () => enhancedAuthWithSync(enhancedAuthSelectors.user)
export const useIsAuthenticated = () => enhancedAuthWithSync(enhancedAuthSelectors.isAuthenticated)
export const useAuthLoading = () => enhancedAuthWithSync(enhancedAuthSelectors.loading)
export const usePreferences = () => enhancedAuthWithSync(enhancedAuthSelectors.preferences)
export const useSecurityScore = () => enhancedAuthWithSync(enhancedAuthSelectors.securityScore)
export const useSecurityEvents = () => enhancedAuthWithSync(enhancedAuthSelectors.securityEvents)

// Initialize enhanced auth store on app start
if (typeof window !== 'undefined') {
  enhancedAuthWithSync.getState().initialize()
}

// Export the final enhanced store
export { enhancedAuthWithSync as enhancedAuthStore }