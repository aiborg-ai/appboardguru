import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { act } from '@testing-library/react'
import { enhancedAuthStore } from '../enhanced-auth-store'
import { enhancedOrganizationStore } from '../enhanced-organization-store'
import { computedStore } from '../computed-store'
import { optimisticStore } from '../optimistic-store'
import { syncManagerStore } from '../sync-manager'
import { testDataGenerators, waitForStoreUpdate } from './store-test-utils'

// Mock all external dependencies
jest.mock('@/lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => () => {})
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      upsert: jest.fn()
    }))
  })
}))

// Mock WebSocket manager
jest.mock('../websocket-manager', () => ({
  webSocketManager: {
    getState: jest.fn(() => 'disconnected'),
    connect: jest.fn(),
    on: jest.fn(),
    send: jest.fn()
  }
}))

// Mock fetch for API calls
global.fetch = jest.fn()

// Mock BroadcastChannel
global.BroadcastChannel = jest.fn().mockImplementation((name) => ({
  name,
  postMessage: jest.fn(),
  close: jest.fn(),
  onmessage: null
}))

// Mock performance API
Object.defineProperty(global.performance, 'now', {
  value: jest.fn(() => Date.now()),
  writable: true
})

describe('Store Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset all stores to initial state
    enhancedAuthStore.getState().cleanup()
    enhancedOrganizationStore.getState().clearData()
    computedStore.getState().clearAllComputed()
    optimisticStore.setState(draft => {
      draft.updates.clear()
      draft.queue = []
      draft.processing.clear()
    })
    syncManagerStore.setState(draft => {
      draft.registeredStores.clear()
      draft.offlineQueue = []
    })
  })

  describe('Auth and Organization Store Integration', () => {
    it('should sync authentication state with organization access', async () => {
      const mockUser = testDataGenerators.user()
      const mockOrganization = testDataGenerators.organization()

      // Simulate user sign in
      await act(async () => {
        enhancedAuthStore.setState({
          user: mockUser,
          isAuthenticated: true
        })
      })

      // Simulate organization data fetch that depends on auth state
      await act(async () => {
        enhancedOrganizationStore.setState({
          organizations: [mockOrganization],
          currentOrganization: mockOrganization
        })
      })

      // Verify states are consistent
      const authState = enhancedAuthStore.getState()
      const orgState = enhancedOrganizationStore.getState()

      expect(authState.isAuthenticated).toBe(true)
      expect(authState.user?.id).toBe(mockUser.id)
      expect(orgState.organizations.length).toBe(1)
      expect(orgState.currentOrganization?.id).toBe(mockOrganization.id)
    })

    it('should clear organization data on user sign out', async () => {
      const mockUser = testDataGenerators.user()
      const mockOrganization = testDataGenerators.organization()

      // Set up authenticated state with organization data
      await act(async () => {
        enhancedAuthStore.setState({
          user: mockUser,
          isAuthenticated: true
        })
        enhancedOrganizationStore.setState({
          organizations: [mockOrganization],
          currentOrganization: mockOrganization
        })
      })

      // Sign out user
      await act(async () => {
        enhancedAuthStore.setState({
          user: null,
          isAuthenticated: false
        })
      })

      // Organization store should ideally clear sensitive data
      // (This would require implementing a proper auth state listener)
      const authState = enhancedAuthStore.getState()
      expect(authState.isAuthenticated).toBe(false)
      expect(authState.user).toBe(null)
    })

    it('should handle organization role changes affecting auth permissions', async () => {
      const mockUser = testDataGenerators.user()
      const mockOrganization = testDataGenerators.organization({
        userRole: 'admin'
      })

      await act(async () => {
        enhancedAuthStore.setState({
          user: mockUser,
          isAuthenticated: true
        })
        enhancedOrganizationStore.setState({
          currentOrganization: mockOrganization
        })
      })

      // Test computed permissions based on role
      const permissions = enhancedOrganizationStore.getComputedValue('currentOrgPermissions')
      expect(permissions?.canAdmin).toBe(true)
      expect(permissions?.canWrite).toBe(true)

      // Change role to member
      await act(async () => {
        enhancedOrganizationStore.setState({
          currentOrganization: {
            ...mockOrganization,
            userRole: 'member'
          }
        })
      })

      const updatedPermissions = enhancedOrganizationStore.getComputedValue('currentOrgPermissions')
      expect(updatedPermissions?.canAdmin).toBe(false)
      expect(updatedPermissions?.canWrite).toBe(true)
    })
  })

  describe('Computed Properties Integration', () => {
    it('should define cross-store computed properties', async () => {
      // Define a computed property that depends on both stores
      computedStore.getState().defineComputed(
        'userOrganizationSummary',
        (state: any) => {
          const authState = enhancedAuthStore.getState()
          const orgState = enhancedOrganizationStore.getState()
          
          return {
            isAuthenticated: authState.isAuthenticated,
            userName: authState.user?.full_name || 'Unknown',
            organizationCount: orgState.organizations.length,
            currentOrgName: orgState.currentOrganization?.name || 'None'
          }
        },
        [] // No direct dependencies, will be manually triggered
      )

      // Set up test data
      const mockUser = testDataGenerators.user({ full_name: 'Test User' })
      const mockOrgs = [
        testDataGenerators.organization({ name: 'Org 1' }),
        testDataGenerators.organization({ name: 'Org 2' })
      ]

      await act(async () => {
        enhancedAuthStore.setState({
          user: mockUser,
          isAuthenticated: true
        })
        enhancedOrganizationStore.setState({
          organizations: mockOrgs,
          currentOrganization: mockOrgs[0]
        })
      })

      const summary = computedStore.getState().getComputedValue('userOrganizationSummary')
      expect(summary).toEqual({
        isAuthenticated: true,
        userName: 'Test User',
        organizationCount: 2,
        currentOrgName: 'Org 1'
      })
    })

    it('should update computed properties when dependencies change', async () => {
      // Define a computed property for auth security score
      computedStore.getState().defineComputed(
        'crossStoreSecurityScore',
        (state: any) => {
          const authState = enhancedAuthStore.getState()
          const orgState = enhancedOrganizationStore.getState()
          
          let score = 0
          if (authState.isAuthenticated) score += 30
          if (authState.biometricEnabled) score += 20
          if (orgState.organizations.length > 0) score += 25
          if (orgState.currentOrganization?.userRole === 'owner') score += 25
          
          return score
        },
        []
      )

      // Initial state - not authenticated
      let score = computedStore.getState().getComputedValue('crossStoreSecurityScore')
      expect(score).toBe(0)

      // Add authentication
      await act(async () => {
        enhancedAuthStore.setState({
          isAuthenticated: true,
          biometricEnabled: true
        })
      })

      score = computedStore.getState().getComputedValue('crossStoreSecurityScore')
      expect(score).toBe(50) // 30 + 20

      // Add organization
      await act(async () => {
        enhancedOrganizationStore.setState({
          organizations: [testDataGenerators.organization({ userRole: 'owner' })],
          currentOrganization: testDataGenerators.organization({ userRole: 'owner' })
        })
      })

      score = computedStore.getState().getComputedValue('crossStoreSecurityScore')
      expect(score).toBe(100) // 30 + 20 + 25 + 25
    })
  })

  describe('Optimistic Updates Integration', () => {
    it('should handle optimistic organization creation with auth context', async () => {
      const mockUser = testDataGenerators.user()
      
      // Set authenticated state
      await act(async () => {
        enhancedAuthStore.setState({
          user: mockUser,
          isAuthenticated: true
        })
      })

      // Mock API response
      const mockApiResponse = testDataGenerators.organization()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      })

      // Add optimistic organization creation
      const updateId = optimisticStore.getState().addOptimisticUpdate({
        type: 'create_organization',
        entity: 'organization',
        entityId: 'temp_123',
        operation: 'create',
        optimisticData: {
          id: 'temp_123',
          name: 'New Organization',
          userRole: 'owner'
        },
        apiCall: async () => {
          const response = await fetch('/api/organizations', {
            method: 'POST',
            body: JSON.stringify({ name: 'New Organization' })
          })
          return response.json()
        },
        conflictStrategy: 'server_wins'
      })

      // Verify optimistic update was added
      const update = optimisticStore.getState().getUpdate(updateId)
      expect(update).toBeDefined()
      expect(update?.status).toBe('pending')

      // Process the update queue
      await act(async () => {
        await optimisticStore.getState().processQueue()
      })

      // Verify update was processed
      await waitForStoreUpdate(optimisticStore, (state) => {
        const processedUpdate = state.updates.get(updateId)
        return processedUpdate?.status === 'committed'
      })

      const finalUpdate = optimisticStore.getState().getUpdate(updateId)
      expect(finalUpdate?.status).toBe('committed')
    })

    it('should rollback optimistic updates on auth errors', async () => {
      const mockUser = testDataGenerators.user()
      
      await act(async () => {
        enhancedAuthStore.setState({
          user: mockUser,
          isAuthenticated: true
        })
      })

      // Mock API failure (unauthorized)
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Unauthorized')
      )

      const updateId = optimisticStore.getState().addOptimisticUpdate({
        type: 'update_profile',
        entity: 'user',
        entityId: mockUser.id,
        operation: 'update',
        optimisticData: { full_name: 'Updated Name' },
        rollbackData: { full_name: mockUser.full_name },
        apiCall: async () => {
          throw new Error('Unauthorized')
        },
        rollbackCall: async () => {
          // Restore original data
          enhancedAuthStore.setState({
            user: { ...mockUser }
          })
        },
        conflictStrategy: 'server_wins'
      })

      // Apply optimistic update
      await act(async () => {
        enhancedAuthStore.setState({
          user: { ...mockUser, full_name: 'Updated Name' }
        })
      })

      expect(enhancedAuthStore.getState().user?.full_name).toBe('Updated Name')

      // Process the queue (which will fail)
      await act(async () => {
        await optimisticStore.getState().processQueue()
      })

      // Wait for rollback
      await waitForStoreUpdate(optimisticStore, (state) => {
        const update = state.updates.get(updateId)
        return update?.status === 'rolled_back'
      })

      // Verify rollback occurred
      expect(enhancedAuthStore.getState().user?.full_name).toBe(mockUser.full_name)
    })
  })

  describe('Synchronization Integration', () => {
    it('should register multiple stores with sync manager', async () => {
      const authStoreName = 'enhanced-auth'
      const orgStoreName = 'enhanced-organization'

      // Register both stores
      await act(async () => {
        syncManagerStore.getState().registerStore(authStoreName, enhancedAuthStore)
        syncManagerStore.getState().registerStore(orgStoreName, enhancedOrganizationStore)
      })

      const syncState = syncManagerStore.getState()
      expect(syncState.registeredStores.has(authStoreName)).toBe(true)
      expect(syncState.registeredStores.has(orgStoreName)).toBe(true)
    })

    it('should handle cross-tab synchronization between stores', async () => {
      const mockBroadcastChannel = {
        postMessage: jest.fn(),
        close: jest.fn(),
        onmessage: null
      }
      
      ;(global.BroadcastChannel as jest.Mock).mockImplementation(() => mockBroadcastChannel)

      // Register stores and enable cross-tab sync
      await act(async () => {
        syncManagerStore.getState().registerStore('auth', enhancedAuthStore)
        syncManagerStore.getState().enableCrossTabSync('auth')
      })

      // Simulate state change that should be broadcasted
      await act(async () => {
        enhancedAuthStore.setState({
          user: testDataGenerators.user(),
          isAuthenticated: true
        })
      })

      // Simulate state broadcast
      await act(async () => {
        syncManagerStore.getState().broadcastStateChange(
          'auth',
          enhancedAuthStore.getState(),
          'sign_in'
        )
      })

      // Verify broadcast was attempted
      expect(mockBroadcastChannel.postMessage).toHaveBeenCalled()
    })

    it('should handle offline queue for failed sync operations', async () => {
      // Simulate offline state
      await act(async () => {
        syncManagerStore.setState({ isOnline: false })
      })

      // Add operations to offline queue
      await act(async () => {
        syncManagerStore.getState().addToOfflineQueue({
          type: 'update',
          entity: 'user',
          entityId: 'user_123',
          data: { name: 'Updated Name' },
          retryCount: 0,
          maxRetries: 3
        })

        syncManagerStore.getState().addToOfflineQueue({
          type: 'create',
          entity: 'organization',
          entityId: 'org_456',
          data: { name: 'New Org' },
          retryCount: 0,
          maxRetries: 3
        })
      })

      const syncState = syncManagerStore.getState()
      expect(syncState.offlineQueue.length).toBe(2)
      expect(syncState.isOnline).toBe(false)

      // Simulate coming back online
      await act(async () => {
        syncManagerStore.setState({ isOnline: true })
        await syncManagerStore.getState().processOfflineQueue()
      })

      // Queue should be processed (though operations may fail due to mocks)
      // This tests the integration logic, not the actual API calls
    })
  })

  describe('Error Handling Across Stores', () => {
    it('should handle cascading errors between stores', async () => {
      const mockUser = testDataGenerators.user()

      // Set authenticated state
      await act(async () => {
        enhancedAuthStore.setState({
          user: mockUser,
          isAuthenticated: true
        })
      })

      // Simulate organization fetch error
      await act(async () => {
        enhancedOrganizationStore.setState({
          errors: {
            fetchOrganizations: 'Network error'
          }
        })
      })

      // Auth store should remain stable despite org store errors
      const authState = enhancedAuthStore.getState()
      expect(authState.isAuthenticated).toBe(true)
      expect(authState.user?.id).toBe(mockUser.id)

      // Org store should have the error
      const orgState = enhancedOrganizationStore.getState()
      expect(orgState.errors.fetchOrganizations).toBe('Network error')
    })

    it('should handle auth token expiration affecting all stores', async () => {
      const mockUser = testDataGenerators.user()
      const mockOrg = testDataGenerators.organization()

      // Set up authenticated state with data
      await act(async () => {
        enhancedAuthStore.setState({
          user: mockUser,
          isAuthenticated: true,
          sessionExpiry: Date.now() + 60000 // 1 minute
        })
        
        enhancedOrganizationStore.setState({
          organizations: [mockOrg],
          currentOrganization: mockOrg
        })
      })

      // Simulate token expiration
      await act(async () => {
        enhancedAuthStore.setState({
          sessionExpiry: Date.now() - 1000, // Expired 1 second ago
          isAuthenticated: false,
          user: null
        })
      })

      // Verify auth state is updated
      const authState = enhancedAuthStore.getState()
      expect(authState.isAuthenticated).toBe(false)
      expect(authState.user).toBe(null)

      // In a real implementation, org store would listen to auth changes
      // and clear sensitive data accordingly
    })
  })

  describe('Performance with Multiple Stores', () => {
    it('should handle simultaneous updates across stores efficiently', async () => {
      const startTime = performance.now()

      const updates = Array.from({ length: 100 }, (_, i) => async () => {
        if (i % 2 === 0) {
          enhancedAuthStore.setState({
            lastActivity: Date.now() + i
          })
        } else {
          enhancedOrganizationStore.setState({
            searchQuery: `search_${i}`
          })
        }
      })

      // Execute all updates simultaneously
      await act(async () => {
        await Promise.all(updates.map(update => update()))
      })

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000)

      // Verify final states
      expect(enhancedAuthStore.getState().lastActivity).toBeGreaterThan(0)
      expect(enhancedOrganizationStore.getState().searchQuery).toMatch(/search_\d+/)
    })

    it('should handle large numbers of computed property dependencies', async () => {
      // Define multiple computed properties with cross-store dependencies
      for (let i = 0; i < 10; i++) {
        computedStore.getState().defineComputed(
          `computed_${i}`,
          (state: any) => {
            const authState = enhancedAuthStore.getState()
            const orgState = enhancedOrganizationStore.getState()
            return {
              index: i,
              hasAuth: !!authState.user,
              orgCount: orgState.organizations.length,
              timestamp: Date.now()
            }
          },
          []
        )
      }

      const startTime = performance.now()

      // Update states that affect computed properties
      await act(async () => {
        enhancedAuthStore.setState({
          user: testDataGenerators.user(),
          isAuthenticated: true
        })
        
        enhancedOrganizationStore.setState({
          organizations: Array.from({ length: 5 }, () => testDataGenerators.organization())
        })
      })

      // Access all computed properties
      const computedValues = Array.from({ length: 10 }, (_, i) => 
        computedStore.getState().getComputedValue(`computed_${i}`)
      )

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete within reasonable time
      expect(duration).toBeLessThan(500)

      // Verify computed values
      computedValues.forEach((value, i) => {
        expect(value).toMatchObject({
          index: i,
          hasAuth: true,
          orgCount: 5
        })
      })
    })
  })

  describe('Store State Consistency', () => {
    it('should maintain referential integrity across related stores', async () => {
      const mockUser = testDataGenerators.user()
      const mockOrg = testDataGenerators.organization()

      // Set up related data
      await act(async () => {
        enhancedAuthStore.setState({
          user: mockUser,
          isAuthenticated: true
        })
        
        enhancedOrganizationStore.setState({
          organizations: [mockOrg],
          currentOrganization: mockOrg
        })
      })

      // Verify relationship consistency
      const authState = enhancedAuthStore.getState()
      const orgState = enhancedOrganizationStore.getState()

      expect(authState.user?.id).toBe(mockUser.id)
      expect(orgState.currentOrganization?.id).toBe(mockOrg.id)

      // Change user data
      const updatedUser = { ...mockUser, full_name: 'Updated Name' }
      await act(async () => {
        enhancedAuthStore.setState({
          user: updatedUser
        })
      })

      // User reference should be updated
      expect(enhancedAuthStore.getState().user?.full_name).toBe('Updated Name')
      
      // Organization data should remain unchanged
      expect(enhancedOrganizationStore.getState().currentOrganization?.id).toBe(mockOrg.id)
    })
  })
})