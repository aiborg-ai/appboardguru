import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { act } from '@testing-library/react'
import {
  createTestStore,
  StoreActionTester,
  StoreSnapshot,
  MockAPIClient,
  storeAssertions,
  testDataGenerators,
  waitForStoreUpdate
} from './store-test-utils'
import { enhancedAuthStore } from '../enhanced-auth-store'

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    updateUser: jest.fn(),
    refreshSession: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    getUser: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(() => () => {}) // Return unsubscribe function
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    upsert: jest.fn(),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn()
    }))
  }))
}

// Mock the Supabase module
jest.mock('@/lib/supabase', () => ({
  createSupabaseBrowserClient: () => mockSupabaseClient
}))

// Mock navigator for device fingerprinting
Object.defineProperty(global.navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Test Browser)',
  writable: true
})

Object.defineProperty(global.navigator, 'language', {
  value: 'en-US',
  writable: true
})

Object.defineProperty(global.navigator, 'platform', {
  value: 'Test Platform',
  writable: true
})

// Mock screen for device fingerprinting
Object.defineProperty(global.screen, 'width', {
  value: 1920,
  writable: true
})

Object.defineProperty(global.screen, 'height', {
  value: 1080,
  writable: true
})

// Mock performance API
Object.defineProperty(global.performance, 'now', {
  value: jest.fn(() => Date.now()),
  writable: true
})

// Mock fetch for API calls
global.fetch = jest.fn()

describe('Enhanced Auth Store', () => {
  let store: any
  let actionTester: StoreActionTester<any>
  let snapshot: StoreSnapshot<any>
  let mockAPI: MockAPIClient

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Create fresh store instance for each test
    store = enhancedAuthStore
    actionTester = new StoreActionTester(store)
    snapshot = new StoreSnapshot(store)
    mockAPI = new MockAPIClient()

    // Reset store to initial state
    store.getState().cleanup()
  })

  afterEach(() => {
    actionTester?.destroy()
    snapshot?.destroy()
    mockAPI?.reset()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = store.getState()
      
      expect(storeAssertions.propertyEquals(state, 'user', null)).toBe(true)
      expect(storeAssertions.propertyEquals(state, 'session', null)).toBe(true)
      expect(storeAssertions.propertyEquals(state, 'isAuthenticated', false)).toBe(true)
      expect(storeAssertions.propertyEquals(state, 'loginAttempts', 0)).toBe(true)
      expect(storeAssertions.propertyEquals(state, 'lockoutUntil', null)).toBe(true)
      expect(storeAssertions.propertyEquals(state, 'biometricEnabled', false)).toBe(true)
      expect(storeAssertions.arrayHasLength(state, 'securityEvents', 0)).toBe(true)
      expect(storeAssertions.arrayHasLength(state, 'sessionHistory', 0)).toBe(true)
    })

    it('should generate device fingerprint on initialization', () => {
      const state = store.getState()
      expect(state.deviceFingerprint).toBeDefined()
      expect(typeof state.deviceFingerprint).toBe('string')
      expect(state.deviceFingerprint.length).toBeGreaterThan(0)
    })
  })

  describe('Sign In', () => {
    it('should successfully sign in with valid credentials', async () => {
      const mockUser = testDataGenerators.user()
      const mockSession = {
        access_token: 'mock_token',
        expires_at: Math.floor((Date.now() + 3600000) / 1000),
        user: mockUser
      }

      // Mock successful authentication
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      })

      // Mock profile and preferences queries
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn()
              .mockResolvedValueOnce({ data: { display_name: 'Test User' }, error: null })
              .mockResolvedValueOnce({ data: { theme: 'dark' }, error: null })
          }))
        }))
      })

      const result = await actionTester.testAction('signIn', ['test@example.com', 'password123'], {
        shouldChangeState: true,
        stateValidator: (state) => state.isAuthenticated === true
      })

      expect(result.success).toBe(true)
      expect(result.stateAfter.user).toEqual(expect.objectContaining({
        id: mockUser.id,
        email: mockUser.email
      }))
      expect(result.stateAfter.isAuthenticated).toBe(true)
      expect(result.stateAfter.loginAttempts).toBe(0)
      expect(result.stateAfter.lockoutUntil).toBe(null)
    })

    it('should handle failed sign in attempts', async () => {
      const error = new Error('Invalid credentials')
      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(error)

      const result = await actionTester.testAction('signIn', ['test@example.com', 'wrongpassword'], {
        shouldChangeState: true,
        stateValidator: (state) => state.loginAttempts > 0 && !state.isAuthenticated
      })

      expect(result.success).toBe(true)
      expect(result.stateAfter.isAuthenticated).toBe(false)
      expect(result.stateAfter.loginAttempts).toBe(1)
      expect(result.stateAfter.errors.signIn).toBe('Invalid credentials')
    })

    it('should lock account after multiple failed attempts', async () => {
      const error = new Error('Invalid credentials')
      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(error)

      // Simulate 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await store.getState().signIn('test@example.com', 'wrongpassword')
        })
      }

      const state = store.getState()
      expect(state.lockoutUntil).not.toBe(null)
      expect(state.lockoutUntil).toBeGreaterThan(Date.now())
      expect(state.loginAttempts).toBe(5)
    })

    it('should prevent sign in during lockout period', async () => {
      // Set lockout state
      await act(async () => {
        store.setState({
          loginAttempts: 5,
          lockoutUntil: Date.now() + 60000 // 1 minute from now
        })
      })

      const result = await actionTester.testAction('signIn', ['test@example.com', 'password123'], {
        shouldChangeState: true,
        stateValidator: (state) => state.errors.signIn?.includes('Account locked')
      })

      expect(result.success).toBe(true)
      expect(result.stateAfter.errors.signIn).toContain('Account locked')
      expect(result.stateAfter.isAuthenticated).toBe(false)
    })

    it('should add security event on successful sign in', async () => {
      const mockUser = testDataGenerators.user()
      const mockSession = { access_token: 'token', user: mockUser }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: null, error: null })
          }))
        }))
      })

      await act(async () => {
        await store.getState().signIn('test@example.com', 'password123')
      })

      const state = store.getState()
      const loginEvent = state.securityEvents.find((event: any) => event.type === 'login')
      
      expect(loginEvent).toBeDefined()
      expect(loginEvent.metadata.deviceFingerprint).toBeDefined()
    })
  })

  describe('Sign Up', () => {
    it('should successfully sign up new user', async () => {
      const mockUser = testDataGenerators.user()
      const mockSession = { access_token: 'token', user: mockUser }

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      })

      const result = await actionTester.testAction('signUp', [
        'newuser@example.com',
        'password123',
        { full_name: 'New User' }
      ], {
        shouldChangeState: true,
        stateValidator: (state) => state.isAuthenticated === true
      })

      expect(result.success).toBe(true)
      expect(result.stateAfter.user).toEqual(expect.objectContaining({
        id: mockUser.id,
        email: mockUser.email
      }))
      expect(result.stateAfter.isAuthenticated).toBe(true)
    })

    it('should handle sign up errors', async () => {
      const error = new Error('Email already registered')
      mockSupabaseClient.auth.signUp.mockRejectedValue(error)

      const result = await actionTester.testAction('signUp', [
        'existing@example.com',
        'password123'
      ], {
        shouldChangeState: true,
        stateValidator: (state) => state.errors.signUp === 'Email already registered'
      })

      expect(result.success).toBe(true)
      expect(result.stateAfter.isAuthenticated).toBe(false)
      expect(result.stateAfter.errors.signUp).toBe('Email already registered')
    })
  })

  describe('Sign Out', () => {
    beforeEach(async () => {
      // Set authenticated state
      const mockUser = testDataGenerators.user()
      await act(async () => {
        store.setState({
          user: mockUser,
          session: { access_token: 'token', user: mockUser },
          isAuthenticated: true,
          sessionHistory: [{
            id: 'session_1',
            startTime: Date.now() - 3600000,
            device: 'Test Device'
          }]
        })
      })
    })

    it('should successfully sign out', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null })

      const result = await actionTester.testAction('signOut', [], {
        shouldChangeState: true,
        stateValidator: (state) => !state.isAuthenticated && state.user === null
      })

      expect(result.success).toBe(true)
      expect(result.stateAfter.isAuthenticated).toBe(false)
      expect(result.stateAfter.user).toBe(null)
      expect(result.stateAfter.session).toBe(null)
    })

    it('should add logout security event', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null })

      await act(async () => {
        await store.getState().signOut()
      })

      const state = store.getState()
      const logoutEvent = state.securityEvents.find((event: any) => event.type === 'logout')
      
      expect(logoutEvent).toBeDefined()
      expect(logoutEvent.metadata.allDevices).toBe(false)
    })

    it('should end current session in history', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null })

      await act(async () => {
        await store.getState().signOut()
      })

      const state = store.getState()
      const lastSession = state.sessionHistory[state.sessionHistory.length - 1]
      
      expect(lastSession.endTime).toBeDefined()
      expect(lastSession.endTime).toBeGreaterThan(lastSession.startTime)
    })

    it('should sign out from all devices when requested', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null })

      const result = await actionTester.testAction('signOut', [true], {
        shouldChangeState: true
      })

      expect(result.success).toBe(true)
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalledWith({ scope: 'global' })
    })
  })

  describe('Password Management', () => {
    beforeEach(async () => {
      // Set authenticated state
      const mockUser = testDataGenerators.user()
      await act(async () => {
        store.setState({
          user: mockUser,
          isAuthenticated: true
        })
      })
    })

    it('should update password with current password verification', async () => {
      // Mock current password verification
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: {}, session: {} },
        error: null
      })

      // Mock password update
      mockSupabaseClient.auth.updateUser.mockResolvedValue({ error: null })

      const result = await actionTester.testAction('updatePassword', [
        'currentpassword',
        'newpassword123'
      ], {
        shouldChangeState: true,
        stateValidator: (state) => !state.loading.updatePassword && !state.errors.updatePassword
      })

      expect(result.success).toBe(true)
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: expect.any(String),
        password: 'currentpassword'
      })
      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        password: 'newpassword123'
      })
    })

    it('should reject password update with incorrect current password', async () => {
      // Mock failed current password verification
      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(
        new Error('Invalid credentials')
      )

      const result = await actionTester.testAction('updatePassword', [
        'wrongpassword',
        'newpassword123'
      ], {
        shouldChangeState: true,
        stateValidator: (state) => state.errors.updatePassword === 'Current password is incorrect'
      })

      expect(result.success).toBe(true)
      expect(result.stateAfter.errors.updatePassword).toBe('Current password is incorrect')
      expect(mockSupabaseClient.auth.updateUser).not.toHaveBeenCalled()
    })

    it('should add security event on password change', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: {}, session: {} },
        error: null
      })
      mockSupabaseClient.auth.updateUser.mockResolvedValue({ error: null })

      await act(async () => {
        await store.getState().updatePassword('current', 'new')
      })

      const state = store.getState()
      const passwordChangeEvent = state.securityEvents.find(
        (event: any) => event.type === 'password_change'
      )
      
      expect(passwordChangeEvent).toBeDefined()
    })
  })

  describe('Biometric Authentication', () => {
    beforeEach(() => {
      // Mock WebAuthn API
      global.navigator.credentials = {
        create: jest.fn(),
        get: jest.fn()
      } as any
    })

    it('should enable biometric authentication when supported', async () => {
      (global.navigator.credentials.create as jest.Mock).mockResolvedValue({
        id: 'credential-id',
        type: 'public-key'
      })

      const result = await actionTester.testAction('enableBiometric', [], {
        shouldChangeState: true,
        stateValidator: (state) => state.biometricEnabled === true
      })

      expect(result.success).toBe(true)
      expect(result.stateAfter.biometricEnabled).toBe(true)
      expect(global.navigator.credentials.create).toHaveBeenCalled()
    })

    it('should fail to enable biometric when not supported', async () => {
      // Remove WebAuthn support
      delete (global.navigator as any).credentials

      const result = await actionTester.testAction('enableBiometric', [], {
        shouldChangeState: true,
        stateValidator: (state) => state.errors.biometric?.includes('not supported')
      })

      expect(result.success).toBe(true)
      expect(result.stateAfter.biometricEnabled).toBe(false)
      expect(result.stateAfter.errors.biometric).toContain('not supported')
    })

    it('should authenticate with biometrics', async () => {
      // Set biometric enabled
      await act(async () => {
        store.setState({ biometricEnabled: true })
      })

      ;(global.navigator.credentials.get as jest.Mock).mockResolvedValue({
        id: 'credential-id',
        type: 'public-key'
      })

      const result = await actionTester.testAction('authenticateBiometric', [], {
        shouldChangeState: false // This action doesn't change store state directly
      })

      expect(result.success).toBe(true)
      expect(global.navigator.credentials.get).toHaveBeenCalled()
    })

    it('should disable biometric authentication', async () => {
      // Set biometric enabled first
      await act(async () => {
        store.setState({ biometricEnabled: true })
      })

      const result = await actionTester.testAction('disableBiometric', [], {
        shouldChangeState: true,
        stateValidator: (state) => state.biometricEnabled === false
      })

      expect(result.success).toBe(true)
      expect(result.stateAfter.biometricEnabled).toBe(false)
    })
  })

  describe('Security Events', () => {
    it('should add security events', async () => {
      const result = await actionTester.testAction('addSecurityEvent', [
        'test_event',
        { detail: 'test data' }
      ], {
        shouldChangeState: true,
        stateValidator: (state) => state.securityEvents.length > 0
      })

      expect(result.success).toBe(true)
      
      const event = result.stateAfter.securityEvents[0]
      expect(event.type).toBe('test_event')
      expect(event.metadata.detail).toBe('test data')
      expect(event.timestamp).toBeDefined()
      expect(event.id).toBeDefined()
    })

    it('should limit security events to 100 entries', async () => {
      // Add 105 events
      for (let i = 0; i < 105; i++) {
        await act(async () => {
          store.getState().addSecurityEvent(`event_${i}`)
        })
      }

      const state = store.getState()
      expect(state.securityEvents.length).toBe(100)
      
      // Should keep the most recent events
      const lastEvent = state.securityEvents[state.securityEvents.length - 1]
      expect(lastEvent.type).toBe('event_104')
    })

    it('should get recent security events', async () => {
      // Add multiple events
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          store.getState().addSecurityEvent(`event_${i}`)
        })
      }

      const recentEvents = store.getState().getSecurityEvents(5)
      expect(recentEvents.length).toBe(5)
      
      // Should be in reverse chronological order (most recent first)
      expect(recentEvents[0].type).toBe('event_9')
      expect(recentEvents[4].type).toBe('event_5')
    })

    it('should clear security events', async () => {
      // Add events first
      await act(async () => {
        store.getState().addSecurityEvent('test_event')
      })

      expect(store.getState().securityEvents.length).toBe(1)

      const result = await actionTester.testAction('clearSecurityEvents', [], {
        shouldChangeState: true,
        stateValidator: (state) => state.securityEvents.length === 0
      })

      expect(result.success).toBe(true)
      expect(result.stateAfter.securityEvents.length).toBe(0)
    })
  })

  describe('Account Lockout', () => {
    it('should check account lockout status', async () => {
      // Set lockout in the future
      await act(async () => {
        store.setState({
          lockoutUntil: Date.now() + 60000 // 1 minute from now
        })
      })

      const isLocked = store.getState().checkAccountLockout()
      expect(isLocked).toBe(true)
    })

    it('should return false for expired lockout', async () => {
      // Set lockout in the past
      await act(async () => {
        store.setState({
          lockoutUntil: Date.now() - 60000 // 1 minute ago
        })
      })

      const isLocked = store.getState().checkAccountLockout()
      expect(isLocked).toBe(false)
    })

    it('should clear lockout state', async () => {
      // Set lockout state
      await act(async () => {
        store.setState({
          lockoutUntil: Date.now() + 60000,
          loginAttempts: 5
        })
      })

      const result = await actionTester.testAction('clearLockout', [], {
        shouldChangeState: true,
        stateValidator: (state) => state.lockoutUntil === null && state.loginAttempts === 0
      })

      expect(result.success).toBe(true)
      expect(result.stateAfter.lockoutUntil).toBe(null)
      expect(result.stateAfter.loginAttempts).toBe(0)
    })
  })

  describe('Computed Properties', () => {
    it('should calculate security score', async () => {
      // Set up state that affects security score
      await act(async () => {
        store.setState({
          user: testDataGenerators.user(),
          biometricEnabled: true,
          preferences: { email_notifications: true },
          sessionHistory: [{ id: 'session1', startTime: Date.now() }],
          loginAttempts: 0
        })
      })

      const securityScore = store.getComputedValue('securityScore')
      expect(securityScore).toBe(100) // Max score with all security features
    })

    it('should detect high-risk session', async () => {
      // Add multiple failed login events
      await act(async () => {
        const events = Array.from({ length: 4 }, (_, i) => ({
          id: `event_${i}`,
          type: 'failed_login',
          timestamp: Date.now() - (i * 1000),
          metadata: {}
        }))
        
        store.setState({
          securityEvents: events,
          loginAttempts: 3
        })
      })

      const isHighRisk = store.getComputedValue('isHighRiskSession')
      expect(isHighRisk).toBe(true)
    })

    it('should detect session expiring soon', async () => {
      // Set session expiring in 4 minutes (less than 5 minute threshold)
      await act(async () => {
        store.setState({
          sessionExpiry: Date.now() + (4 * 60 * 1000)
        })
      })

      const isExpiringSoon = store.getComputedValue('isSessionExpiringSoon')
      expect(isExpiringSoon).toBe(true)
    })
  })

  describe('Store Performance', () => {
    it('should handle rapid successive sign in attempts', async () => {
      const startTime = performance.now()
      
      // Mock failed authentication
      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(
        new Error('Rate limited')
      )

      // Make 10 rapid sign in attempts
      const promises = Array.from({ length: 10 }, () => 
        store.getState().signIn('test@example.com', 'password')
      )

      await Promise.allSettled(promises)
      
      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000)
      
      const state = store.getState()
      expect(state.loginAttempts).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(
        new Error('Network error')
      )

      const result = await actionTester.testAction('signIn', [
        'test@example.com',
        'password123'
      ], {
        shouldChangeState: true,
        stateValidator: (state) => state.errors.signIn === 'Network error'
      })

      expect(result.success).toBe(true)
      expect(result.stateAfter.errors.signIn).toBe('Network error')
      expect(result.stateAfter.isAuthenticated).toBe(false)
    })

    it('should handle Supabase API errors', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' }
      })

      const result = await actionTester.testAction('signIn', [
        'test@example.com',
        'wrongpassword'
      ], {
        shouldChangeState: true,
        stateValidator: (state) => state.errors.signIn === 'Invalid login credentials'
      })

      expect(result.success).toBe(true)
      expect(result.stateAfter.errors.signIn).toBe('Invalid login credentials')
    })
  })

  describe('Store Integration', () => {
    it('should work with optimistic updates', async () => {
      // This test verifies the store works with the optimistic updates system
      const optimistic = store.optimistic
      expect(optimistic).toBeDefined()
      expect(typeof optimistic.add).toBe('function')
    })

    it('should work with synchronization', async () => {
      // This test verifies the store works with the sync system
      const sync = store.sync
      expect(sync).toBeDefined()
      expect(typeof sync.enable).toBe('function')
      expect(typeof sync.disable).toBe('function')
    })

    it('should work with computed properties', async () => {
      // Test that computed properties are properly defined
      expect(typeof store.defineComputed).toBe('function')
      expect(typeof store.getComputedValue).toBe('function')
      
      // Test existing computed properties
      const securityScore = store.getComputedValue('securityScore')
      expect(typeof securityScore).toBe('number')
    })
  })
})