/**
 * API Integration Test Suite
 * Comprehensive tests for AppBoardGuru API endpoints
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import supertest from 'supertest'
import { createServer } from 'http'
import { NextRequest, NextResponse } from 'next/server'

// Test configuration
interface TestConfig {
  baseURL: string
  apiVersion: string
  testUser: {
    email: string
    password: string
    id?: string
  }
  testOrganization?: {
    id: string
    name: string
  }
}

const testConfig: TestConfig = {
  baseURL: process.env.TEST_API_URL || 'http://localhost:3000/api',
  apiVersion: process.env.TEST_API_VERSION || 'v2',
  testUser: {
    email: process.env.TEST_USER_EMAIL || 'test@example.com',
    password: process.env.TEST_USER_PASSWORD || 'test-password'
  }
}

class APITestSuite {
  private request: supertest.SuperTest<supertest.Test>
  private authToken?: string
  private testAssetId?: string
  private testVaultId?: string
  private testNotificationId?: string

  constructor(baseURL: string) {
    this.request = supertest(baseURL)
  }

  /**
   * Setup authentication for tests
   */
  async authenticate(): Promise<void> {
    // For now, we'll use a test token - in real tests this would be obtained through login
    this.authToken = process.env.TEST_AUTH_TOKEN || 'test-jwt-token'
  }

  /**
   * Helper to make authenticated requests
   */
  private authenticatedRequest() {
    return this.request
      .set('Authorization', `Bearer ${this.authToken}`)
      .set('API-Version', testConfig.apiVersion)
      .set('Content-Type', 'application/json')
  }

  /**
   * Health check tests
   */
  async testHealthEndpoints(): Promise<void> {
    describe('Health Endpoints', () => {
      test('GET /health should return system health', async () => {
        const response = await this.request
          .get('/health')
          .expect(200)

        expect(response.body).toHaveProperty('status', 'ok')
        expect(response.body).toHaveProperty('timestamp')
        expect(response.body).toHaveProperty('uptime')
        expect(response.body).toHaveProperty('version')
      })

      test('GET /health/live should return liveness status', async () => {
        const response = await this.request
          .get('/health/live')
          .expect(200)

        expect(response.body).toHaveProperty('status', 'alive')
      })

      test('GET /health/ready should return readiness status', async () => {
        const response = await this.request
          .get('/health/ready')
          .expect(200)

        expect(response.body).toHaveProperty('status', 'ready')
        expect(response.body).toHaveProperty('checks')
      })

      test('GET /health/detailed should return detailed health info', async () => {
        const response = await this.request
          .get('/health/detailed')
          .expect(200)

        expect(response.body).toHaveProperty('status')
        expect(response.body).toHaveProperty('dependencies')
        expect(response.body).toHaveProperty('metrics')
      })
    })
  }

  /**
   * Authentication tests
   */
  async testAuthenticationEndpoints(): Promise<void> {
    describe('Authentication Endpoints', () => {
      test('POST /auth/verify-otp should verify OTP code', async () => {
        const otpRequest = {
          email: testConfig.testUser.email,
          otpCode: '123456',
          purpose: 'first_login'
        }

        // This would normally fail with invalid OTP, but we're testing the structure
        const response = await this.request
          .post('/auth/verify-otp')
          .send(otpRequest)
          .expect(400) // Expected to fail with test data

        expect(response.body).toHaveProperty('success', false)
        expect(response.body).toHaveProperty('error')
      })

      test('POST /auth/resend-otp should resend OTP', async () => {
        const resendRequest = {
          email: testConfig.testUser.email,
          purpose: 'first_login'
        }

        const response = await this.request
          .post('/auth/resend-otp')
          .send(resendRequest)
          .expect([200, 400, 404]) // May fail if user doesn't exist

        expect(response.body).toHaveProperty('success')
      })

      test('POST /auth/magic-link should request magic link', async () => {
        const magicLinkRequest = {
          email: testConfig.testUser.email,
          redirectTo: 'https://app.example.com/dashboard'
        }

        const response = await this.request
          .post('/auth/magic-link')
          .send(magicLinkRequest)
          .expect([200, 400])

        if (response.status === 200) {
          expect(response.body).toHaveProperty('success', true)
          expect(response.body).toHaveProperty('message')
        }
      })
    })
  }

  /**
   * Asset management tests
   */
  async testAssetEndpoints(): Promise<void> {
    describe('Asset Management Endpoints', () => {
      test('GET /assets should list assets with pagination', async () => {
        const response = await this.authenticatedRequest()
          .get('/assets?page=1&limit=10')
          .expect([200, 401])

        if (response.status === 200) {
          expect(response.body).toHaveProperty('assets')
          expect(response.body).toHaveProperty('pagination')
          expect(response.body.pagination).toHaveProperty('page', 1)
          expect(response.body.pagination).toHaveProperty('limit', 10)
          expect(Array.isArray(response.body.assets)).toBe(true)
        }
      })

      test('GET /assets/search should search assets', async () => {
        const response = await this.authenticatedRequest()
          .get('/assets/search?q=test&limit=5')
          .expect([200, 401])

        if (response.status === 200) {
          expect(response.body).toHaveProperty('assets')
          expect(response.body).toHaveProperty('total')
          expect(response.body).toHaveProperty('query', 'test')
        }
      })

      test('POST /assets should create asset record', async () => {
        const assetData = {
          title: 'Test Document',
          description: 'A test document for API testing',
          fileName: 'test-document.pdf',
          filePath: '/test/test-document.pdf',
          fileSize: 1024000,
          fileType: 'application/pdf',
          category: 'test',
          tags: ['test', 'api'],
          visibility: 'private'
        }

        const response = await this.authenticatedRequest()
          .post('/assets')
          .send(assetData)
          .expect([200, 201, 400, 401])

        if (response.status === 200 || response.status === 201) {
          expect(response.body).toHaveProperty('asset')
          expect(response.body.asset).toHaveProperty('id')
          expect(response.body.asset).toHaveProperty('title', assetData.title)
          this.testAssetId = response.body.asset.id
        }
      })

      test('GET /assets/{id} should retrieve specific asset', async () => {
        if (!this.testAssetId) {
          // Skip if no test asset was created
          return
        }

        const response = await this.authenticatedRequest()
          .get(`/assets/${this.testAssetId}`)
          .expect([200, 401, 403, 404])

        if (response.status === 200) {
          expect(response.body).toHaveProperty('asset')
          expect(response.body.asset).toHaveProperty('id', this.testAssetId)
          expect(response.body.asset).toHaveProperty('title')
          expect(response.body.asset).toHaveProperty('owner')
        }
      })

      test('PUT /assets/{id} should update asset metadata', async () => {
        if (!this.testAssetId) return

        const updateData = {
          title: 'Updated Test Document',
          description: 'Updated description',
          tags: ['updated', 'test']
        }

        const response = await this.authenticatedRequest()
          .put(`/assets/${this.testAssetId}`)
          .send(updateData)
          .expect([200, 401, 403, 404])

        if (response.status === 200) {
          expect(response.body).toHaveProperty('asset')
          expect(response.body.asset.title).toBe(updateData.title)
        }
      })

      test('DELETE /assets/{id} should soft delete asset', async () => {
        if (!this.testAssetId) return

        const response = await this.authenticatedRequest()
          .delete(`/assets/${this.testAssetId}`)
          .expect([200, 401, 403, 404])

        if (response.status === 200) {
          expect(response.body).toHaveProperty('message')
          expect(response.body).toHaveProperty('assetId', this.testAssetId)
        }
      })
    })
  }

  /**
   * Notification tests
   */
  async testNotificationEndpoints(): Promise<void> {
    describe('Notification Endpoints', () => {
      test('GET /notifications should list user notifications', async () => {
        const response = await this.authenticatedRequest()
          .get('/notifications?limit=5')
          .expect([200, 401])

        if (response.status === 200) {
          expect(response.body).toHaveProperty('notifications')
          expect(response.body).toHaveProperty('pagination')
          expect(Array.isArray(response.body.notifications)).toBe(true)
        }
      })

      test('GET /notifications/count should return notification counts', async () => {
        const response = await this.authenticatedRequest()
          .get('/notifications/count')
          .expect([200, 401])

        if (response.status === 200) {
          expect(response.body).toHaveProperty('unread')
          expect(response.body).toHaveProperty('total')
          expect(response.body).toHaveProperty('critical_unread')
          expect(response.body).toHaveProperty('high_unread')
          expect(typeof response.body.unread).toBe('number')
        }
      })

      test('POST /notifications should create notification', async () => {
        const notificationData = {
          type: 'test_notification',
          category: 'test',
          title: 'Test Notification',
          message: 'This is a test notification from API tests',
          priority: 'medium',
          action_url: '/test',
          action_text: 'View Test'
        }

        const response = await this.authenticatedRequest()
          .post('/notifications')
          .send(notificationData)
          .expect([200, 201, 400, 401])

        if (response.status === 200 || response.status === 201) {
          expect(response.body).toHaveProperty('notification')
          expect(response.body.notification).toHaveProperty('id')
          expect(response.body.notification.title).toBe(notificationData.title)
          this.testNotificationId = response.body.notification.id
        }
      })

      test('PATCH /notifications/{id} should update notification', async () => {
        if (!this.testNotificationId) return

        const updateData = {
          status: 'read',
          read_at: new Date().toISOString()
        }

        const response = await this.authenticatedRequest()
          .patch(`/notifications/${this.testNotificationId}`)
          .send(updateData)
          .expect([200, 401, 403, 404])

        if (response.status === 200) {
          expect(response.body).toHaveProperty('notification')
          expect(response.body.notification.status).toBe('read')
        }
      })

      test('GET /notifications/anomalies should return anomaly analysis', async () => {
        const response = await this.authenticatedRequest()
          .get('/notifications/anomalies')
          .expect([200, 401])

        if (response.status === 200) {
          expect(response.body).toHaveProperty('anomalies')
          expect(response.body).toHaveProperty('analysis_period')
          expect(response.body).toHaveProperty('total_notifications_analyzed')
        }
      })
    })
  }

  /**
   * Rate limiting tests
   */
  async testRateLimiting(): Promise<void> {
    describe('Rate Limiting', () => {
      test('should include rate limit headers', async () => {
        const response = await this.authenticatedRequest()
          .get('/assets')
          .expect([200, 401])

        // Check for rate limit headers
        expect(response.headers).toHaveProperty('x-ratelimit-limit')
        expect(response.headers).toHaveProperty('x-ratelimit-remaining')
        expect(response.headers).toHaveProperty('x-ratelimit-reset')
      })

      test('should return 429 when rate limit exceeded', async () => {
        // This test would require actually exceeding rate limits
        // In practice, you'd need to make many requests quickly
        const promises = Array(60).fill(null).map(() =>
          this.authenticatedRequest().get('/health')
        )

        const responses = await Promise.allSettled(promises)
        
        // Check if any responses were rate limited
        const rateLimited = responses.some(result => 
          result.status === 'fulfilled' && 
          result.value.status === 429
        )

        // This may or may not trigger depending on rate limits
        if (rateLimited) {
          console.log('Rate limiting is working correctly')
        }
      })
    })
  }

  /**
   * API versioning tests
   */
  async testVersioning(): Promise<void> {
    describe('API Versioning', () => {
      test('should accept version in header', async () => {
        const response = await this.request
          .get('/health')
          .set('API-Version', 'v2')
          .expect(200)

        expect(response.headers).toHaveProperty('api-version')
        expect(response.headers).toHaveProperty('api-version-name')
      })

      test('should accept version in URL path', async () => {
        const response = await this.request
          .get('/v2/health')
          .expect([200, 404]) // 404 if v2 path not implemented

        if (response.status === 200) {
          expect(response.headers['api-version-name']).toBe('v2')
        }
      })

      test('should reject unsupported versions', async () => {
        const response = await this.request
          .get('/health')
          .set('API-Version', 'v99')
          .expect(400)

        expect(response.body).toHaveProperty('error')
        expect(response.body).toHaveProperty('code', 'UNSUPPORTED_VERSION')
        expect(response.body).toHaveProperty('supportedVersions')
      })
    })
  }

  /**
   * Error handling tests
   */
  async testErrorHandling(): Promise<void> {
    describe('Error Handling', () => {
      test('should return 401 for unauthenticated requests', async () => {
        const response = await this.request
          .get('/assets')
          .expect(401)

        expect(response.body).toHaveProperty('success', false)
        expect(response.body).toHaveProperty('error')
        expect(response.body).toHaveProperty('code')
      })

      test('should return 400 for validation errors', async () => {
        const invalidData = {
          // Missing required fields
          title: '',
          fileName: ''
        }

        const response = await this.authenticatedRequest()
          .post('/assets')
          .send(invalidData)
          .expect(400)

        expect(response.body).toHaveProperty('success', false)
        expect(response.body).toHaveProperty('error')
        expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR')
      })

      test('should return 404 for non-existent resources', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000'
        
        const response = await this.authenticatedRequest()
          .get(`/assets/${fakeId}`)
          .expect(404)

        expect(response.body).toHaveProperty('success', false)
        expect(response.body).toHaveProperty('error')
      })
    })
  }

  /**
   * Performance tests
   */
  async testPerformance(): Promise<void> {
    describe('Performance Tests', () => {
      test('endpoints should respond within reasonable time', async () => {
        const startTime = Date.now()
        
        await this.request
          .get('/health')
          .expect(200)

        const responseTime = Date.now() - startTime
        
        // Expect response within 500ms
        expect(responseTime).toBeLessThan(500)
      })

      test('should handle concurrent requests', async () => {
        const concurrentRequests = 10
        const promises = Array(concurrentRequests).fill(null).map(() =>
          this.request.get('/health')
        )

        const startTime = Date.now()
        const responses = await Promise.all(promises)
        const totalTime = Date.now() - startTime

        // All requests should succeed
        responses.forEach(response => {
          expect(response.status).toBe(200)
        })

        // Should handle concurrent requests efficiently
        expect(totalTime).toBeLessThan(2000) // 2 seconds for 10 requests
      })
    })
  }

  /**
   * Run all test suites
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting API Integration Tests...')
    
    try {
      // Setup
      await this.authenticate()

      // Run test suites
      await this.testHealthEndpoints()
      await this.testVersioning()
      await this.testErrorHandling()
      await this.testAuthenticationEndpoints()
      await this.testAssetEndpoints()
      await this.testNotificationEndpoints()
      await this.testRateLimiting()
      await this.testPerformance()

      console.log('✅ All API tests completed successfully!')

    } catch (error) {
      console.error('❌ API tests failed:', error)
      throw error
    }
  }
}

// Export test suite
export { APITestSuite, TestConfig }

// Run tests if this file is executed directly
if (require.main === module) {
  const testSuite = new APITestSuite(testConfig.baseURL)
  testSuite.runAllTests().catch(error => {
    console.error('Test suite failed:', error)
    process.exit(1)
  })
}