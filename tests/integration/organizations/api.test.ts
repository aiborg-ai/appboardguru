import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'

/**
 * Integration Tests for Organizations API Endpoints
 * 
 * Tests API endpoints used in the organizations page enhancements:
 * - GET /api/organizations - List organizations with filtering/sorting
 * - GET /api/organizations/analytics - Analytics data aggregation
 * - POST /api/organizations/bulk-actions - Bulk operations
 * - GET /api/organizations/search - Advanced search functionality
 * - WebSocket /ws/organizations - Real-time updates
 */

// Test configuration
const TEST_API_URL = process.env.TEST_API_URL || 'http://localhost:3000'
const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || ''
const TEST_SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || ''

// Mock test data
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  access_token: 'mock-jwt-token'
}

const mockOrganization = {
  id: 'test-org-id',
  name: 'Test Organization',
  description: 'A test organization for integration testing',
  member_count: 5,
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

// Test utilities
const makeAuthenticatedRequest = async (endpoint: string, options: RequestInit = {}) => {
  return fetch(`${TEST_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${mockUser.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  })
}

const waitForWebSocketMessage = (ws: WebSocket, timeout = 5000): Promise<any> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('WebSocket message timeout'))
    }, timeout)

    ws.onmessage = (event) => {
      clearTimeout(timer)
      resolve(JSON.parse(event.data))
    }

    ws.onerror = (error) => {
      clearTimeout(timer)
      reject(error)
    }
  })
}

describe('Organizations API Integration Tests', () => {
  let supabase: ReturnType<typeof createClient>
  let testOrganizationId: string

  beforeAll(async () => {
    // Skip integration tests if not in test environment
    if (process.env.NODE_ENV !== 'test') {
      console.log('Skipping integration tests - not in test environment')
      return
    }

    // Initialize Supabase client for test database
    if (TEST_SUPABASE_URL && TEST_SUPABASE_ANON_KEY) {
      supabase = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY)
    }

    // Create test organization for integration tests
    try {
      const response = await makeAuthenticatedRequest('/api/organizations', {
        method: 'POST',
        body: JSON.stringify(mockOrganization)
      })

      if (response.ok) {
        const created = await response.json()
        testOrganizationId = created.id
      }
    } catch (error) {
      console.warn('Could not create test organization:', error)
    }
  })

  afterAll(async () => {
    // Clean up test data
    if (testOrganizationId) {
      try {
        await makeAuthenticatedRequest(`/api/organizations/${testOrganizationId}`, {
          method: 'DELETE'
        })
      } catch (error) {
        console.warn('Could not clean up test organization:', error)
      }
    }
  })

  describe('GET /api/organizations', () => {
    it('should return list of organizations', async () => {
      const response = await makeAuthenticatedRequest('/api/organizations')
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
      
      // Verify organization structure
      const org = data[0]
      expect(org).toHaveProperty('id')
      expect(org).toHaveProperty('name')
      expect(org).toHaveProperty('member_count')
      expect(org).toHaveProperty('status')
    })

    it('should support pagination', async () => {
      const page1 = await makeAuthenticatedRequest('/api/organizations?page=1&limit=2')
      const page2 = await makeAuthenticatedRequest('/api/organizations?page=2&limit=2')
      
      expect(page1.status).toBe(200)
      expect(page2.status).toBe(200)
      
      const data1 = await page1.json()
      const data2 = await page2.json()
      
      expect(data1.length).toBeLessThanOrEqual(2)
      expect(data2.length).toBeLessThanOrEqual(2)
      
      // Verify different results
      if (data1.length > 0 && data2.length > 0) {
        expect(data1[0].id).not.toBe(data2[0].id)
      }
    })

    it('should support filtering by role', async () => {
      const response = await makeAuthenticatedRequest('/api/organizations?role=owner')
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
      
      // All returned organizations should have owner role for current user
      if (data.length > 0) {
        data.forEach((org: any) => {
          expect(org.user_role).toBe('owner')
        })
      }
    })

    it('should support filtering by status', async () => {
      const response = await makeAuthenticatedRequest('/api/organizations?status=active')
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
      
      // All returned organizations should be active
      if (data.length > 0) {
        data.forEach((org: any) => {
          expect(org.status).toBe('active')
        })
      }
    })

    it('should support sorting', async () => {
      const nameAsc = await makeAuthenticatedRequest('/api/organizations?sort=name&order=asc')
      const nameDesc = await makeAuthenticatedRequest('/api/organizations?sort=name&order=desc')
      
      expect(nameAsc.status).toBe(200)
      expect(nameDesc.status).toBe(200)
      
      const ascData = await nameAsc.json()
      const descData = await nameDesc.json()
      
      if (ascData.length > 1) {
        expect(ascData[0].name.localeCompare(ascData[1].name)).toBeLessThanOrEqual(0)
      }
      
      if (descData.length > 1) {
        expect(descData[0].name.localeCompare(descData[1].name)).toBeGreaterThanOrEqual(0)
      }
    })

    it('should handle search queries', async () => {
      const response = await makeAuthenticatedRequest('/api/organizations?search=test')
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
      
      // All results should match search term
      if (data.length > 0) {
        data.forEach((org: any) => {
          const matchesSearch = org.name.toLowerCase().includes('test') || 
                               org.description?.toLowerCase().includes('test')
          expect(matchesSearch).toBe(true)
        })
      }
    })

    it('should return 401 for unauthenticated requests', async () => {
      const response = await fetch(`${TEST_API_URL}/api/organizations`)
      expect(response.status).toBe(401)
    })

    it('should handle invalid query parameters', async () => {
      const response = await makeAuthenticatedRequest('/api/organizations?invalid=param')
      
      // Should still return valid response, ignoring invalid params
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe('GET /api/organizations/analytics', () => {
    it('should return analytics overview', async () => {
      const response = await makeAuthenticatedRequest('/api/organizations/analytics')
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('totalOrganizations')
      expect(data).toHaveProperty('activeMembers')
      expect(data).toHaveProperty('totalActivities')
      expect(data).toHaveProperty('memberActivity')
      expect(data).toHaveProperty('engagementTrends')
      
      // Verify data types
      expect(typeof data.totalOrganizations).toBe('number')
      expect(typeof data.activeMembers).toBe('number')
      expect(Array.isArray(data.memberActivity)).toBe(true)
    })

    it('should support date range filtering', async () => {
      const startDate = '2024-01-01'
      const endDate = '2024-01-31'
      
      const response = await makeAuthenticatedRequest(
        `/api/organizations/analytics?startDate=${startDate}&endDate=${endDate}`
      )
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('memberActivity')
      
      // Verify date range in activity data
      if (data.memberActivity.length > 0) {
        data.memberActivity.forEach((activity: any) => {
          const activityDate = new Date(activity.date)
          expect(activityDate >= new Date(startDate)).toBe(true)
          expect(activityDate <= new Date(endDate)).toBe(true)
        })
      }
    })

    it('should return organization-specific analytics', async () => {
      if (!testOrganizationId) return

      const response = await makeAuthenticatedRequest(
        `/api/organizations/${testOrganizationId}/analytics`
      )
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('organizationId', testOrganizationId)
      expect(data).toHaveProperty('memberCount')
      expect(data).toHaveProperty('activityScore')
    })

    it('should handle analytics for non-existent organization', async () => {
      const response = await makeAuthenticatedRequest('/api/organizations/non-existent/analytics')
      
      expect(response.status).toBe(404)
    })

    it('should return proper error for invalid date ranges', async () => {
      const response = await makeAuthenticatedRequest(
        '/api/organizations/analytics?startDate=invalid&endDate=also-invalid'
      )
      
      expect(response.status).toBe(400)
      
      const error = await response.json()
      expect(error).toHaveProperty('error')
      expect(error.error).toContain('date')
    })
  })

  describe('POST /api/organizations/bulk-actions', () => {
    let testOrgIds: string[] = []

    beforeEach(async () => {
      // Create test organizations for bulk operations
      try {
        const org1Response = await makeAuthenticatedRequest('/api/organizations', {
          method: 'POST',
          body: JSON.stringify({ ...mockOrganization, name: 'Bulk Test Org 1' })
        })
        
        const org2Response = await makeAuthenticatedRequest('/api/organizations', {
          method: 'POST',
          body: JSON.stringify({ ...mockOrganization, name: 'Bulk Test Org 2' })
        })
        
        if (org1Response.ok && org2Response.ok) {
          const org1 = await org1Response.json()
          const org2 = await org2Response.json()
          testOrgIds = [org1.id, org2.id]
        }
      } catch (error) {
        console.warn('Could not create test organizations for bulk operations:', error)
      }
    })

    afterEach(async () => {
      // Clean up test organizations
      for (const id of testOrgIds) {
        try {
          await makeAuthenticatedRequest(`/api/organizations/${id}`, {
            method: 'DELETE'
          })
        } catch (error) {
          console.warn('Could not clean up test organization:', error)
        }
      }
      testOrgIds = []
    })

    it('should export organizations as CSV', async () => {
      if (testOrgIds.length === 0) return

      const response = await makeAuthenticatedRequest('/api/organizations/bulk-actions', {
        method: 'POST',
        body: JSON.stringify({
          action: 'export',
          format: 'csv',
          organizationIds: testOrgIds
        })
      })
      
      expect(response.status).toBe(200)
      
      const contentType = response.headers.get('content-type')
      expect(contentType).toContain('text/csv')
      
      const csvContent = await response.text()
      expect(csvContent).toContain('Name,Members,Role,Status')
      expect(csvContent).toContain('Bulk Test Org 1')
      expect(csvContent).toContain('Bulk Test Org 2')
    })

    it('should handle bulk archive operations', async () => {
      if (testOrgIds.length === 0) return

      const response = await makeAuthenticatedRequest('/api/organizations/bulk-actions', {
        method: 'POST',
        body: JSON.stringify({
          action: 'archive',
          organizationIds: testOrgIds
        })
      })
      
      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result).toHaveProperty('success', true)
      expect(result).toHaveProperty('archivedCount', testOrgIds.length)
      
      // Verify organizations are archived
      for (const id of testOrgIds) {
        const orgResponse = await makeAuthenticatedRequest(`/api/organizations/${id}`)
        if (orgResponse.ok) {
          const org = await orgResponse.json()
          expect(org.status).toBe('archived')
        }
      }
    })

    it('should handle bulk share operations', async () => {
      if (testOrgIds.length === 0) return

      const response = await makeAuthenticatedRequest('/api/organizations/bulk-actions', {
        method: 'POST',
        body: JSON.stringify({
          action: 'share',
          organizationIds: testOrgIds,
          emails: ['colleague@example.com'],
          permission: 'viewer'
        })
      })
      
      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result).toHaveProperty('success', true)
      expect(result).toHaveProperty('sharedCount', testOrgIds.length)
      expect(result).toHaveProperty('invitationsSent', 1)
    })

    it('should validate bulk action permissions', async () => {
      if (testOrgIds.length === 0) return

      // Try to delete organizations without proper permissions
      const response = await makeAuthenticatedRequest('/api/organizations/bulk-actions', {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
          organizationIds: testOrgIds
        })
      })
      
      // Should succeed if user has permission, or return 403 if not
      expect([200, 403]).toContain(response.status)
      
      if (response.status === 403) {
        const error = await response.json()
        expect(error).toHaveProperty('error')
        expect(error.error).toContain('permission')
      }
    })

    it('should handle invalid bulk actions', async () => {
      const response = await makeAuthenticatedRequest('/api/organizations/bulk-actions', {
        method: 'POST',
        body: JSON.stringify({
          action: 'invalid-action',
          organizationIds: ['org-1']
        })
      })
      
      expect(response.status).toBe(400)
      
      const error = await response.json()
      expect(error).toHaveProperty('error')
    })

    it('should handle empty organization list', async () => {
      const response = await makeAuthenticatedRequest('/api/organizations/bulk-actions', {
        method: 'POST',
        body: JSON.stringify({
          action: 'export',
          organizationIds: []
        })
      })
      
      expect(response.status).toBe(400)
      
      const error = await response.json()
      expect(error).toHaveProperty('error')
      expect(error.error).toContain('empty')
    })
  })

  describe('GET /api/organizations/search', () => {
    it('should perform advanced search', async () => {
      const response = await makeAuthenticatedRequest('/api/organizations/search?q=test')
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('results')
      expect(data).toHaveProperty('totalCount')
      expect(data).toHaveProperty('searchTime')
      expect(Array.isArray(data.results)).toBe(true)
    })

    it('should support faceted search', async () => {
      const response = await makeAuthenticatedRequest(
        '/api/organizations/search?q=test&facets=status,role,industry'
      )
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('facets')
      expect(data.facets).toHaveProperty('status')
      expect(data.facets).toHaveProperty('role')
    })

    it('should support search filters', async () => {
      const response = await makeAuthenticatedRequest(
        '/api/organizations/search?q=test&filters[status]=active&filters[memberCount][min]=10'
      )
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(Array.isArray(data.results)).toBe(true)
      
      // Results should match filters
      data.results.forEach((org: any) => {
        expect(org.status).toBe('active')
        expect(org.member_count).toBeGreaterThanOrEqual(10)
      })
    })

    it('should handle search suggestions', async () => {
      const response = await makeAuthenticatedRequest('/api/organizations/search/suggest?q=te')
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('suggestions')
      expect(Array.isArray(data.suggestions)).toBe(true)
      
      // Suggestions should contain the search term
      data.suggestions.forEach((suggestion: string) => {
        expect(suggestion.toLowerCase()).toContain('te')
      })
    })

    it('should handle empty search queries', async () => {
      const response = await makeAuthenticatedRequest('/api/organizations/search?q=')
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('results')
      expect(data.results.length).toBe(0)
    })
  })

  describe('WebSocket /ws/organizations', () => {
    let ws: WebSocket

    afterEach(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    })

    it('should establish WebSocket connection', async () => {
      return new Promise<void>((resolve, reject) => {
        ws = new WebSocket(`ws://localhost:3000/ws/organizations?token=${mockUser.access_token}`)
        
        ws.onopen = () => {
          expect(ws.readyState).toBe(WebSocket.OPEN)
          resolve()
        }
        
        ws.onerror = (error) => {
          reject(error)
        }
        
        setTimeout(() => {
          reject(new Error('WebSocket connection timeout'))
        }, 5000)
      })
    })

    it('should receive real-time organization updates', async () => {
      if (!testOrganizationId) return

      return new Promise<void>(async (resolve, reject) => {
        ws = new WebSocket(`ws://localhost:3000/ws/organizations?token=${mockUser.access_token}`)
        
        ws.onopen = async () => {
          // Subscribe to organization updates
          ws.send(JSON.stringify({
            type: 'subscribe',
            channel: 'organizations'
          }))
          
          // Update the test organization to trigger WebSocket message
          await makeAuthenticatedRequest(`/api/organizations/${testOrganizationId}`, {
            method: 'PATCH',
            body: JSON.stringify({
              description: 'Updated via WebSocket test'
            })
          })
        }
        
        ws.onmessage = (event) => {
          const message = JSON.parse(event.data)
          
          if (message.type === 'organization_updated') {
            expect(message.data).toHaveProperty('id', testOrganizationId)
            expect(message.data.description).toBe('Updated via WebSocket test')
            resolve()
          }
        }
        
        ws.onerror = (error) => {
          reject(error)
        }
        
        setTimeout(() => {
          reject(new Error('WebSocket message timeout'))
        }, 10000)
      })
    })

    it('should handle WebSocket authentication', async () => {
      return new Promise<void>((resolve, reject) => {
        // Try to connect without valid token
        ws = new WebSocket('ws://localhost:3000/ws/organizations')
        
        ws.onclose = (event) => {
          // Should close with authentication error
          expect(event.code).toBe(1008) // Policy violation
          resolve()
        }
        
        ws.onopen = () => {
          // Should not open without authentication
          reject(new Error('WebSocket opened without authentication'))
        }
        
        setTimeout(() => {
          reject(new Error('WebSocket authentication test timeout'))
        }, 5000)
      })
    })

    it('should handle WebSocket subscription management', async () => {
      return new Promise<void>((resolve, reject) => {
        ws = new WebSocket(`ws://localhost:3000/ws/organizations?token=${mockUser.access_token}`)
        
        ws.onopen = () => {
          // Subscribe to specific organization
          ws.send(JSON.stringify({
            type: 'subscribe',
            channel: 'organization',
            organizationId: testOrganizationId
          }))
        }
        
        ws.onmessage = (event) => {
          const message = JSON.parse(event.data)
          
          if (message.type === 'subscription_confirmed') {
            expect(message.channel).toBe('organization')
            expect(message.organizationId).toBe(testOrganizationId)
            resolve()
          }
        }
        
        ws.onerror = (error) => {
          reject(error)
        }
        
        setTimeout(() => {
          reject(new Error('WebSocket subscription timeout'))
        }, 5000)
      })
    })
  })

  describe('API Error Handling', () => {
    it('should handle rate limiting', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const requests = Array(20).fill(null).map(() =>
        makeAuthenticatedRequest('/api/organizations')
      )
      
      const responses = await Promise.all(requests)
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429)
      
      if (rateLimitedResponses.length > 0) {
        const rateLimitResponse = rateLimitedResponses[0]
        expect(rateLimitResponse.headers.get('retry-after')).toBeTruthy()
      }
    })

    it('should handle malformed JSON requests', async () => {
      const response = await makeAuthenticatedRequest('/api/organizations/bulk-actions', {
        method: 'POST',
        body: '{ invalid json'
      })
      
      expect(response.status).toBe(400)
      
      const error = await response.json()
      expect(error).toHaveProperty('error')
      expect(error.error).toContain('JSON')
    })

    it('should handle missing required parameters', async () => {
      const response = await makeAuthenticatedRequest('/api/organizations/bulk-actions', {
        method: 'POST',
        body: JSON.stringify({
          // Missing action and organizationIds
        })
      })
      
      expect(response.status).toBe(400)
      
      const error = await response.json()
      expect(error).toHaveProperty('error')
      expect(error.error).toContain('required')
    })

    it('should handle server errors gracefully', async () => {
      // This would require mocking the database or service layer
      // For now, we test that the API returns proper error format
      
      const response = await makeAuthenticatedRequest('/api/organizations/non-existent-endpoint')
      
      expect(response.status).toBe(404)
    })
  })

  describe('API Performance', () => {
    it('should respond within acceptable time limits', async () => {
      const start = Date.now()
      
      const response = await makeAuthenticatedRequest('/api/organizations')
      
      const duration = Date.now() - start
      
      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(2000) // Should respond within 2 seconds
    })

    it('should handle concurrent requests efficiently', async () => {
      const start = Date.now()
      
      // Make 10 concurrent requests
      const requests = Array(10).fill(null).map(() =>
        makeAuthenticatedRequest('/api/organizations')
      )
      
      const responses = await Promise.all(requests)
      
      const duration = Date.now() - start
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
      
      // Should handle concurrent requests efficiently
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should cache repeated requests appropriately', async () => {
      // Make the same request twice
      const start1 = Date.now()
      const response1 = await makeAuthenticatedRequest('/api/organizations/analytics')
      const duration1 = Date.now() - start1
      
      const start2 = Date.now()
      const response2 = await makeAuthenticatedRequest('/api/organizations/analytics')
      const duration2 = Date.now() - start2
      
      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
      
      // Second request should be faster due to caching (if implemented)
      // This is optional depending on caching strategy
      console.log(`First request: ${duration1}ms, Second request: ${duration2}ms`)
    })
  })
})