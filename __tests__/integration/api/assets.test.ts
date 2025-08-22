/**
 * @jest-environment node
 */
import { createMocks } from 'node-mocks-http'
import handler from '@/app/api/assets/route'
import { createSupabaseAdminClient } from '@/config/database.config'
import { testDb } from '../../utils/test-database'
import { AssetFactory, UserFactory, VaultFactory } from '../../factories'

// Mock Supabase
jest.mock('@/config/database.config')

describe('/api/assets', () => {
  let mockSupabase: any
  let testUser: any
  let testOrganization: any
  let testVault: any

  beforeAll(async () => {
    await testDb.setup()
    
    // Create test data
    testUser = await testDb.createUser({
      email: 'test@example.com',
      role: 'director',
    })
    
    testOrganization = await testDb.createOrganization({
      created_by: testUser.id,
      name: 'Test Organization',
    })
    
    testVault = await testDb.createVault({
      organization_id: testOrganization.id,
      created_by: testUser.id,
      name: 'Test Vault',
    })
  })

  beforeEach(() => {
    // Reset mock
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
      auth: {
        getUser: jest.fn().mockResolvedValue({ 
          data: { user: testUser }, 
          error: null 
        }),
      },
      storage: {
        from: jest.fn().mockReturnThis(),
        upload: jest.fn(),
        download: jest.fn(),
        remove: jest.fn(),
      },
    }
    
    ;(createSupabaseAdminClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  afterAll(async () => {
    await testDb.cleanup()
  })

  describe('GET /api/assets', () => {
    it('should return list of assets for authenticated user', async () => {
      const expectedAssets = AssetFactory.buildList(3, {
        vault_id: testVault.id,
      })
      
      mockSupabase.mockResolvedValue({
        data: expectedAssets,
        error: null,
        count: expectedAssets.length,
      })

      const { req, res } = createMocks({
        method: 'GET',
        query: { vault_id: testVault.id, limit: '10', offset: '0' },
        headers: {
          'authorization': `Bearer mock-jwt-token`,
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const responseData = JSON.parse(res._getData())
      expect(responseData.success).toBe(true)
      expect(responseData.data.assets).toHaveLength(3)
      expect(responseData.data.pagination).toEqual(expect.objectContaining({
        total: 3,
        limit: 10,
        offset: 0,
      }))
    })

    it('should handle search queries', async () => {
      const searchResults = AssetFactory.buildList(2)
      
      mockSupabase.mockResolvedValue({
        data: searchResults,
        error: null,
      })

      const { req, res } = createMocks({
        method: 'GET',
        query: { 
          search: 'contract',
          vault_id: testVault.id,
        },
        headers: { authorization: 'Bearer mock-jwt-token' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(mockSupabase.or).toHaveBeenCalledWith(
        expect.stringContaining('name.ilike.%contract%')
      )
    })

    it('should return 401 for unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ 
        data: { user: null }, 
        error: new Error('No user found') 
      })

      const { req, res } = createMocks({
        method: 'GET',
        query: { vault_id: testVault.id },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(401)
      const responseData = JSON.parse(res._getData())
      expect(responseData.success).toBe(false)
      expect(responseData.error.message).toContain('Authentication required')
    })

    it('should validate vault access permissions', async () => {
      // Mock user without access to vault
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'vault_members') {
          return {
            ...mockSupabase,
            single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }
        }
        return mockSupabase
      })

      const { req, res } = createMocks({
        method: 'GET',
        query: { vault_id: 'unauthorized-vault' },
        headers: { authorization: 'Bearer mock-jwt-token' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(403)
      const responseData = JSON.parse(res._getData())
      expect(responseData.error.message).toContain('Access denied')
    })

    it('should handle pagination parameters', async () => {
      const assets = AssetFactory.buildList(5)
      
      mockSupabase.mockResolvedValue({
        data: assets,
        error: null,
        count: 25,
      })

      const { req, res } = createMocks({
        method: 'GET',
        query: { 
          vault_id: testVault.id,
          limit: '5',
          offset: '10',
        },
        headers: { authorization: 'Bearer mock-jwt-token' },
      })

      await handler(req, res)

      expect(mockSupabase.range).toHaveBeenCalledWith(10, 14)
      expect(res._getStatusCode()).toBe(200)
      const responseData = JSON.parse(res._getData())
      expect(responseData.data.pagination).toEqual(expect.objectContaining({
        total: 25,
        limit: 5,
        offset: 10,
        page: 3,
      }))
    })

    it('should filter by file type', async () => {
      const pdfAssets = AssetFactory.buildList(3, { file_type: 'application/pdf' })
      
      mockSupabase.mockResolvedValue({
        data: pdfAssets,
        error: null,
      })

      const { req, res } = createMocks({
        method: 'GET',
        query: { 
          vault_id: testVault.id,
          file_type: 'application/pdf',
        },
        headers: { authorization: 'Bearer mock-jwt-token' },
      })

      await handler(req, res)

      expect(mockSupabase.eq).toHaveBeenCalledWith('file_type', 'application/pdf')
      expect(res._getStatusCode()).toBe(200)
    })
  })

  describe('POST /api/assets', () => {
    it('should create new asset successfully', async () => {
      const assetData = {
        name: 'New Document.pdf',
        file_type: 'application/pdf',
        vault_id: testVault.id,
        description: 'Test document',
        file_size: 1024,
      }
      
      const expectedAsset = AssetFactory.build({
        ...assetData,
        created_by: testUser.id,
      })

      // Mock vault access validation
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'vault_members') {
          return {
            ...mockSupabase,
            single: jest.fn().mockResolvedValue({ 
              data: { role: 'editor', permissions: ['read', 'write'] }, 
              error: null 
            }),
          }
        }
        if (table === 'assets') {
          return {
            ...mockSupabase,
            single: jest.fn().mockResolvedValue({ data: expectedAsset, error: null }),
          }
        }
        return mockSupabase
      })

      const { req, res } = createMocks({
        method: 'POST',
        headers: { 
          'authorization': 'Bearer mock-jwt-token',
          'content-type': 'application/json',
        },
        body: assetData,
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(201)
      const responseData = JSON.parse(res._getData())
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual(expect.objectContaining({
        name: assetData.name,
        file_type: assetData.file_type,
        vault_id: assetData.vault_id,
      }))
    })

    it('should validate required fields', async () => {
      const invalidData = {
        name: '', // Empty name
        vault_id: testVault.id,
        // Missing file_type
      }

      const { req, res } = createMocks({
        method: 'POST',
        headers: { 
          'authorization': 'Bearer mock-jwt-token',
          'content-type': 'application/json',
        },
        body: invalidData,
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const responseData = JSON.parse(res._getData())
      expect(responseData.success).toBe(false)
      expect(responseData.error.message).toContain('validation')
    })

    it('should check vault write permissions', async () => {
      // Mock user with only read access
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'vault_members') {
          return {
            ...mockSupabase,
            single: jest.fn().mockResolvedValue({ 
              data: { role: 'viewer', permissions: ['read'] }, 
              error: null 
            }),
          }
        }
        return mockSupabase
      })

      const { req, res } = createMocks({
        method: 'POST',
        headers: { 
          'authorization': 'Bearer mock-jwt-token',
          'content-type': 'application/json',
        },
        body: {
          name: 'Test Document.pdf',
          file_type: 'application/pdf',
          vault_id: testVault.id,
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(403)
      const responseData = JSON.parse(res._getData())
      expect(responseData.error.message).toContain('write permission')
    })

    it('should handle database errors', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'vault_members') {
          return {
            ...mockSupabase,
            single: jest.fn().mockResolvedValue({ 
              data: { role: 'editor', permissions: ['read', 'write'] }, 
              error: null 
            }),
          }
        }
        if (table === 'assets') {
          return {
            ...mockSupabase,
            single: jest.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Database connection failed' } 
            }),
          }
        }
        return mockSupabase
      })

      const { req, res } = createMocks({
        method: 'POST',
        headers: { 
          'authorization': 'Bearer mock-jwt-token',
          'content-type': 'application/json',
        },
        body: {
          name: 'Test Document.pdf',
          file_type: 'application/pdf',
          vault_id: testVault.id,
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(500)
      const responseData = JSON.parse(res._getData())
      expect(responseData.error.message).toContain('Database connection failed')
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limits for asset creation', async () => {
      // Simulate multiple rapid requests
      const requests = Array.from({ length: 15 }, () => 
        createMocks({
          method: 'POST',
          headers: { 
            'authorization': 'Bearer mock-jwt-token',
            'content-type': 'application/json',
          },
          body: {
            name: 'Test Document.pdf',
            file_type: 'application/pdf',
            vault_id: testVault.id,
          },
        })
      )

      // Execute requests rapidly
      const responses = await Promise.all(
        requests.map(({ req, res }) => handler(req, res).then(() => res._getStatusCode()))
      )

      // Should have some rate-limited responses (429)
      const rateLimitedCount = responses.filter(status => status === 429).length
      expect(rateLimitedCount).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 
          'authorization': 'Bearer mock-jwt-token',
          'content-type': 'application/json',
        },
        body: 'invalid json',
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const responseData = JSON.parse(res._getData())
      expect(responseData.error.message).toContain('Invalid JSON')
    })

    it('should handle unsupported HTTP methods', async () => {
      const { req, res } = createMocks({
        method: 'PATCH',
        headers: { authorization: 'Bearer mock-jwt-token' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(405)
      expect(res._getHeaders()['allow']).toBe('GET, POST')
    })
  })

  describe('Performance Tests', () => {
    it('should handle large result sets efficiently', async () => {
      const largeAssetList = AssetFactory.buildList(1000)
      
      mockSupabase.mockResolvedValue({
        data: largeAssetList.slice(0, 100), // Paginated
        error: null,
        count: 1000,
      })

      const { req, res } = createMocks({
        method: 'GET',
        query: { 
          vault_id: testVault.id,
          limit: '100',
        },
        headers: { authorization: 'Bearer mock-jwt-token' },
      })

      const startTime = Date.now()
      await handler(req, res)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(1000) // Should complete in under 1 second
      expect(res._getStatusCode()).toBe(200)
    })

    it('should handle concurrent requests properly', async () => {
      const assets = AssetFactory.buildList(5)
      mockSupabase.mockResolvedValue({ data: assets, error: null })

      // Create 10 concurrent requests
      const concurrentRequests = Array.from({ length: 10 }, () => {
        const { req, res } = createMocks({
          method: 'GET',
          query: { vault_id: testVault.id },
          headers: { authorization: 'Bearer mock-jwt-token' },
        })
        return handler(req, res).then(() => res._getStatusCode())
      })

      const startTime = Date.now()
      const results = await Promise.all(concurrentRequests)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(3000) // All requests should complete in under 3 seconds
      expect(results.every(status => status === 200)).toBe(true)
    })
  })

  describe('Data Validation', () => {
    it('should validate file type against organization policies', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 
          'authorization': 'Bearer mock-jwt-token',
          'content-type': 'application/json',
        },
        body: {
          name: 'malware.exe',
          file_type: 'application/exe',
          vault_id: testVault.id,
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const responseData = JSON.parse(res._getData())
      expect(responseData.error.message).toContain('file type not allowed')
    })

    it('should validate asset name length and characters', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { 
          'authorization': 'Bearer mock-jwt-token',
          'content-type': 'application/json',
        },
        body: {
          name: 'a'.repeat(256), // Too long
          file_type: 'application/pdf',
          vault_id: testVault.id,
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const responseData = JSON.parse(res._getData())
      expect(responseData.error.message).toContain('name too long')
    })
  })
})
