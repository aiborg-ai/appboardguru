/**
 * Upload API Endpoint Integration Tests
 * Comprehensive testing of /api/assets/upload endpoint
 * Following CLAUDE.md patterns for API testing with Result pattern integration
 */

import { NextRequest } from 'next/server'
import { jest } from '@jest/globals'

import { POST } from '@/app/api/assets/upload/route'
import { AssetFactory, TEST_FILE_TYPES, TEST_CONSTANTS } from '../factories/asset.factory'
import { MockAssetService } from '../mocks/asset-service.mock'
import { MockSupabaseClient, createMockSupabaseClient } from '../mocks/supabase.mock'
import { 
  ResultTestHelpers, 
  FileTestHelpers, 
  AsyncTestHelpers, 
  ErrorTestHelpers,
  TestEnvironmentHelpers 
} from '../utils/test-helpers'

// Mock dependencies
jest.mock('@/lib/supabase-typed', () => ({
  createTypedSupabaseClient: jest.fn(),
  getAuthenticatedUser: jest.fn()
}))

jest.mock('@/lib/services/asset.service', () => ({
  AssetService: jest.fn()
}))

jest.mock('@/lib/repositories/asset.repository.enhanced', () => ({
  AssetRepository: jest.fn()
}))

// Import mocked modules
import { createTypedSupabaseClient, getAuthenticatedUser } from '@/lib/supabase-typed'
import { AssetService } from '@/lib/services/asset.service'
import { AssetRepository } from '@/lib/repositories/asset.repository.enhanced'

const mockCreateTypedSupabaseClient = createTypedSupabaseClient as jest.MockedFunction<typeof createTypedSupabaseClient>
const mockGetAuthenticatedUser = getAuthenticatedUser as jest.MockedFunction<typeof getAuthenticatedUser>
const MockAssetServiceClass = AssetService as jest.MockedClass<typeof AssetService>
const MockAssetRepositoryClass = AssetRepository as jest.MockedClass<typeof AssetRepository>

describe('/api/assets/upload API Integration Tests', () => {
  let mockSupabaseClient: MockSupabaseClient
  let mockAssetService: MockAssetService
  let mockAssetRepository: any

  const testUser = {
    id: TEST_CONSTANTS.TEST_USER_ID,
    email: 'test@example.com',
    user_metadata: { full_name: 'Test User' }
  }

  beforeAll(() => {
    TestEnvironmentHelpers.setupTestEnv()
  })

  afterAll(() => {
    TestEnvironmentHelpers.cleanupTestEnv()
  })

  beforeEach(() => {
    // Setup mocks
    mockSupabaseClient = createMockSupabaseClient()
    mockAssetService = new MockAssetService()
    mockAssetRepository = {}

    // Setup mock implementations
    mockCreateTypedSupabaseClient.mockResolvedValue(mockSupabaseClient as any)
    mockGetAuthenticatedUser.mockResolvedValue(testUser)
    MockAssetServiceClass.mockImplementation(() => mockAssetService as any)
    MockAssetRepositoryClass.mockImplementation(() => mockAssetRepository)

    jest.clearAllMocks()
  })

  describe('Authentication and Authorization', () => {
    it('requires authenticated user', async () => {
      mockGetAuthenticatedUser.mockRejectedValue(new Error('User not authenticated'))
      
      const formData = new FormData()
      formData.append('file', AssetFactory.createTestFile('PDF', 'medium'))
      formData.append('title', 'Test Document')
      formData.append('organizationId', TEST_CONSTANTS.TEST_ORGANIZATION_ID)
      
      const request = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
      
      const body = await response.json()
      expect(body.error).toBeDefined()
    })

    it('validates organization access', async () => {
      mockAssetService.setupAccessDenied()
      
      const formData = new FormData()
      formData.append('file', AssetFactory.createTestFile('PDF', 'medium'))
      formData.append('title', 'Test Document')
      formData.append('organizationId', 'unauthorized-org-id')
      
      const request = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
      
      const body = await response.json()
      expect(body.code).toBe('UPLOAD_FAILED')
    })
  })

  describe('Request Validation', () => {
    it('requires file parameter', async () => {
      const formData = new FormData()
      formData.append('title', 'Test Document')
      formData.append('organizationId', TEST_CONSTANTS.TEST_ORGANIZATION_ID)
      
      const request = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const body = await response.json()
      expect(body.error).toBe('No file provided')
      expect(body.code).toBe('FILE_REQUIRED')
    })

    it('requires title parameter', async () => {
      const formData = new FormData()
      formData.append('file', AssetFactory.createTestFile('PDF', 'medium'))
      formData.append('organizationId', TEST_CONSTANTS.TEST_ORGANIZATION_ID)
      // No title provided
      
      const request = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const body = await response.json()
      expect(body.error).toBe('Title is required')
      expect(body.code).toBe('TITLE_REQUIRED')
    })

    it('requires organizationId parameter', async () => {
      const formData = new FormData()
      formData.append('file', AssetFactory.createTestFile('PDF', 'medium'))
      formData.append('title', 'Test Document')
      // No organizationId provided
      
      const request = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const body = await response.json()
      expect(body.error).toBe('Organization ID is required')
      expect(body.code).toBe('ORGANIZATION_REQUIRED')
    })

    it('rejects empty title', async () => {
      const formData = new FormData()
      formData.append('file', AssetFactory.createTestFile('PDF', 'medium'))
      formData.append('title', '   ') // Empty/whitespace title
      formData.append('organizationId', TEST_CONSTANTS.TEST_ORGANIZATION_ID)
      
      const request = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const body = await response.json()
      expect(body.error).toBe('Title is required')
      expect(body.code).toBe('TITLE_REQUIRED')
    })
  })

  describe('File Validation', () => {
    it('rejects oversized files', async () => {
      const largeFile = AssetFactory.createTestFile('PDF', 'xlarge') // 60MB
      
      const formData = new FormData()
      formData.append('file', largeFile)
      formData.append('title', 'Large Document')
      formData.append('organizationId', TEST_CONSTANTS.TEST_ORGANIZATION_ID)
      
      const request = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const body = await response.json()
      expect(body.error).toMatch(/File size exceeds.*MB limit/)
      expect(body.code).toBe('FILE_TOO_LARGE')
    })

    it('rejects invalid file types', async () => {
      const invalidFile = AssetFactory.createTestFile('INVALID', 'medium')
      
      const formData = new FormData()
      formData.append('file', invalidFile)
      formData.append('title', 'Invalid Document')
      formData.append('organizationId', TEST_CONSTANTS.TEST_ORGANIZATION_ID)
      
      const request = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const body = await response.json()
      expect(body.error).toMatch(/File type.*is not allowed/)
      expect(body.code).toBe('INVALID_FILE_TYPE')
    })

    it('accepts valid file types', async () => {
      const validTypes = ['PDF', 'DOCX', 'JPEG', 'PNG', 'TXT'] as const
      
      for (const fileType of validTypes) {
        const file = AssetFactory.createTestFile(fileType, 'medium')
        
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', `Test ${fileType} Document`)
        formData.append('organizationId', TEST_CONSTANTS.TEST_ORGANIZATION_ID)
        
        const request = new NextRequest('http://localhost/api/assets/upload', {
          method: 'POST',
          body: formData
        })

        const response = await POST(request)
        expect(response.status).toBe(201)
        
        const body = await response.json()
        expect(body.success).toBe(true)
        expect(body.asset).toBeDefined()
      }
    })
  })

  describe('Input Sanitization', () => {
    it('sanitizes title input', async () => {
      const formData = new FormData()
      formData.append('file', AssetFactory.createTestFile('PDF', 'medium'))
      formData.append('title', 'Test <script>alert("xss")</script> Document')
      formData.append('organizationId', TEST_CONSTANTS.TEST_ORGANIZATION_ID)
      
      const request = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
      
      // Verify that XSS content was sanitized in the service call
      expect(mockAssetService.uploadAsset).toHaveBeenCalled()
      const uploadCall = mockAssetService.getLastCallArgs('uploadAsset')
      expect(uploadCall?.[0]?.title).not.toContain('<script>')
      expect(uploadCall?.[0]?.title).not.toContain('</script>')
    })

    it('sanitizes description input', async () => {
      const formData = new FormData()
      formData.append('file', AssetFactory.createTestFile('PDF', 'medium'))
      formData.append('title', 'Test Document')
      formData.append('description', 'Description with <img src="x" onerror="alert(1)">')
      formData.append('organizationId', TEST_CONSTANTS.TEST_ORGANIZATION_ID)
      
      const request = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
      
      const uploadCall = mockAssetService.getLastCallArgs('uploadAsset')
      expect(uploadCall?.[0]?.description).not.toContain('<img')
      expect(uploadCall?.[0]?.description).not.toContain('onerror')
    })

    it('sanitizes folder path', async () => {
      const formData = new FormData()
      formData.append('file', AssetFactory.createTestFile('PDF', 'medium'))
      formData.append('title', 'Test Document')
      formData.append('folderPath', '/../../../etc/passwd')
      formData.append('organizationId', TEST_CONSTANTS.TEST_ORGANIZATION_ID)
      
      const request = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
      
      const uploadCall = mockAssetService.getLastCallArgs('uploadAsset')
      const folderPath = uploadCall?.[0]?.folderPath
      expect(folderPath).not.toContain('../')
      expect(folderPath).not.toContain('/etc/')
    })

    it('limits tags count', async () => {
      const formData = new FormData()
      formData.append('file', AssetFactory.createTestFile('PDF', 'medium'))
      formData.append('title', 'Test Document')
      // 15 tags (more than the 10 limit)
      formData.append('tags', Array.from({length: 15}, (_, i) => `tag${i}`).join(','))
      formData.append('organizationId', TEST_CONSTANTS.TEST_ORGANIZATION_ID)
      
      const request = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
      
      const uploadCall = mockAssetService.getLastCallArgs('uploadAsset')
      expect(uploadCall?.[0]?.tags.length).toBeLessThanOrEqual(10)
    })

    it('validates input lengths', async () => {
      const longTitle = 'x'.repeat(300) // Over 255 character limit
      
      const formData = new FormData()
      formData.append('file', AssetFactory.createTestFile('PDF', 'medium'))
      formData.append('title', longTitle)
      formData.append('organizationId', TEST_CONSTANTS.TEST_ORGANIZATION_ID)
      
      const request = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const body = await response.json()
      expect(body.error).toBe('Title must be less than 255 characters')
      expect(body.code).toBe('TITLE_TOO_LONG')
    })
  })

  describe('Successful Upload Flow', () => {
    it('processes complete upload successfully', async () => {
      const file = AssetFactory.createTestFile('PDF', 'medium')
      const testAsset = AssetFactory.createWithDetails({
        title: 'Test Document',
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type
      })
      
      // Setup successful upload
      mockAssetService.uploadAsset.mockResolvedValue({
        success: true,
        data: testAsset
      } as any)
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', 'Test Document')
      formData.append('description', 'Test description')
      formData.append('category', 'board-documents')
      formData.append('folderPath', '/board-meetings')
      formData.append('tags', 'important,confidential')
      formData.append('organizationId', TEST_CONSTANTS.TEST_ORGANIZATION_ID)
      formData.append('vaultId', TEST_CONSTANTS.TEST_VAULT_ID)
      
      const request = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
      
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.asset).toBeDefined()
      expect(body.asset.title).toBe('Test Document')
      expect(body.asset.fileName).toBe(file.name)
      expect(body.asset.fileSize).toBe(file.size)
      expect(body.asset.category).toBe('board-documents')
      expect(body.asset.folderPath).toBe('/board-meetings')
      expect(body.asset.tags).toEqual(['important', 'confidential'])
      expect(body.message).toBe('File uploaded successfully')
    })

    it('handles optional parameters correctly', async () => {
      const file = AssetFactory.createTestFile('PDF', 'medium')
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', 'Minimal Document')
      formData.append('organizationId', TEST_CONSTANTS.TEST_ORGANIZATION_ID)
      // No optional parameters
      
      const request = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
      
      // Verify service was called with default values
      expect(mockAssetService.uploadAsset).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Minimal Document',
          description: undefined,
          category: 'general',
          folderPath: '/',
          tags: [],
          vaultId: undefined
        })
      )
    })

    it('includes user and organization info in response', async () => {
      const file = AssetFactory.createTestFile('PDF', 'medium')
      const testAsset = AssetFactory.createWithDetails({
        uploaded_by_user: {
          id: testUser.id,
          full_name: 'Test User',
          email: testUser.email,
          avatar_url: 'https://example.com/avatar.jpg'
        },
        organization: {
          id: TEST_CONSTANTS.TEST_ORGANIZATION_ID,
          name: 'Test Organization',
          slug: 'test-org'
        }
      })
      
      mockAssetService.uploadAsset.mockResolvedValue({
        success: true,
        data: testAsset
      } as any)
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', 'Test Document')
      formData.append('organizationId', TEST_CONSTANTS.TEST_ORGANIZATION_ID)
      
      const request = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
      
      const body = await response.json()
      expect(body.asset.owner).toEqual({
        id: testUser.id,
        name: 'Test User',
        email: testUser.email
      })
      expect(body.asset.organization).toBeDefined()
    })
  })

  describe('Service Layer Integration', () => {
    it('handles service validation failures', async () => {
      mockAssetService.setupValidationFailure('title', 'Title validation failed')
      
      const formData = new FormData()
      formData.append('file', AssetFactory.createTestFile('PDF', 'medium'))
      formData.append('title', '')
      formData.append('organizationId', TEST_CONSTANTS.TEST_ORGANIZATION_ID)
      
      const request = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
      
      const body = await response.json()
      expect(body.code).toBe('UPLOAD_FAILED')
    })

    it('handles virus detection', async () => {
      mockAssetService.setupVirusDetection('Test.Malware.Detected')
      
      const formData = new FormData()
      formData.append('file', AssetFactory.createTestFile('PDF', 'medium'))
      formData.append('title', 'Infected Document')
      formData.append('organizationId', TEST_CONSTANTS.TEST_ORGANIZATION_ID)
      
      const request = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
      
      const body = await response.json()
      expect(body.code).toBe('UPLOAD_FAILED')
    })

    it('handles storage service failures', async () => {
      mockAssetService.setupProcessingFailure('Storage service unavailable')
      
      const formData = new FormData()
      formData.append('file', AssetFactory.createTestFile('PDF', 'medium'))
      formData.append('title', 'Test Document')
      formData.append('organizationId', TEST_CONSTANTS.TEST_ORGANIZATION_ID)
      
      const request = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
      
      const body = await response.json()
      expect(body.error).toBe('Storage service unavailable')
      expect(body.code).toBe('UPLOAD_FAILED')
    })
  })

  describe('Error Handling and Logging', () => {
    it('logs detailed error information', async () => {
      const consoleSpy = jest.spyOn(console, 'log')
      const consoleErrorSpy = jest.spyOn(console, 'error')
      
      mockAssetService.setupProcessingFailure('Detailed error for logging')
      
      const formData = new FormData()
      formData.append('file', AssetFactory.createTestFile('PDF', 'medium'))
      formData.append('title', 'Test Document')
      formData.append('organizationId', TEST_CONSTANTS.TEST_ORGANIZATION_ID)
      
      const request = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      await POST(request)
      
      // Verify logging occurred
      expect(consoleSpy).toHaveBeenCalledWith('Starting upload with data:', expect.any(Object))
      expect(consoleErrorSpy).toHaveBeenCalledWith('Upload failed:', expect.any(Error))
      
      consoleSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })

    it('handles unexpected errors gracefully', async () => {
      mockAssetService.uploadAsset.mockRejectedValue(new Error('Unexpected system error'))
      
      const formData = new FormData()
      formData.append('file', AssetFactory.createTestFile('PDF', 'medium'))
      formData.append('title', 'Test Document')
      formData.append('organizationId', TEST_CONSTANTS.TEST_ORGANIZATION_ID)
      
      const request = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
      
      const body = await response.json()
      expect(body.error).toBe('Internal server error')
      expect(body.code).toBe('INTERNAL_ERROR')
    })

    it('provides detailed error information in development', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      mockAssetService.setupProcessingFailure('Development error details')
      
      const formData = new FormData()
      formData.append('file', AssetFactory.createTestFile('PDF', 'medium'))
      formData.append('title', 'Test Document')
      formData.append('organizationId', TEST_CONSTANTS.TEST_ORGANIZATION_ID)
      
      const request = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
      
      const body = await response.json()
      expect(body.details).toBeDefined()
      
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Branded Types Validation', () => {
    it('validates branded type creation', async () => {
      const formData = new FormData()
      formData.append('file', AssetFactory.createTestFile('PDF', 'medium'))
      formData.append('title', 'Test Document')
      formData.append('organizationId', 'invalid-uuid-format')
      
      const request = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const body = await response.json()
      expect(body.error).toBe('Invalid organization ID')
      expect(body.code).toBe('INVALID_ORGANIZATION_ID')
    })

    it('handles user ID validation', async () => {
      // Mock invalid user ID
      mockGetAuthenticatedUser.mockResolvedValue({
        id: 'invalid-user-id-format',
        email: 'test@example.com',
        user_metadata: {}
      })
      
      const formData = new FormData()
      formData.append('file', AssetFactory.createTestFile('PDF', 'medium'))
      formData.append('title', 'Test Document')
      formData.append('organizationId', TEST_CONSTANTS.TEST_ORGANIZATION_ID)
      
      const request = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const body = await response.json()
      expect(body.error).toBe('Invalid user ID')
      expect(body.code).toBe('INVALID_USER_ID')
    })
  })

  describe('Performance and Monitoring', () => {
    it('completes upload within acceptable time', async () => {
      const file = AssetFactory.createTestFile('PDF', 'large')
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', 'Large Document')
      formData.append('organizationId', TEST_CONSTANTS.TEST_ORGANIZATION_ID)
      
      const request = new NextRequest('http://localhost/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      const startTime = performance.now()
      const response = await POST(request)
      const endTime = performance.now()
      
      expect(response.status).toBe(201)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('handles concurrent uploads', async () => {
      const uploadPromises = Array.from({ length: 5 }, (_, i) => {
        const formData = new FormData()
        formData.append('file', AssetFactory.createTestFile('PDF', 'medium'))
        formData.append('title', `Concurrent Document ${i}`)
        formData.append('organizationId', TEST_CONSTANTS.TEST_ORGANIZATION_ID)
        
        const request = new NextRequest('http://localhost/api/assets/upload', {
          method: 'POST',
          body: formData
        })

        return POST(request)
      })

      const responses = await Promise.all(uploadPromises)
      
      // All uploads should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201)
      })
      
      // Verify service was called for each upload
      expect(mockAssetService.uploadAsset).toHaveBeenCalledTimes(5)
    })
  })
})