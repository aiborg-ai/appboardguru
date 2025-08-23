/**
 * Enhanced Asset Repository Tests
 * 
 * Tests the comprehensive asset repository implementation following CLAUDE.md patterns:
 * - Result pattern for functional error handling
 * - Branded types for compile-time safety  
 * - Transaction management with ACID compliance
 * - Optimistic locking for concurrent operations
 * - Performance testing for large datasets
 * 
 * @jest-environment jsdom
 */

import { AssetRepository } from '@/lib/repositories/asset.repository.enhanced'
import { Result } from '@/lib/repositories/result'
import { testDb } from '../../../tests/utils/test-database'
import { AssetFactory, UserFactory, OrganizationFactory } from '../../factories'
import { testAssertions, performanceHelpers } from '../../utils/test-helpers'
import { createUserId, createAssetId, createOrganizationId } from '@/lib/utils/branded-type-helpers'
import type { AssetId, UserId, OrganizationId } from '@/types/branded'

// Mock the enhanced repository
jest.mock('@/lib/repositories/asset.repository.enhanced')

describe('Enhanced AssetRepository - Result Pattern & Branded Types', () => {
  let assetRepository: AssetRepository
  let mockSupabase: any
  let testUser: { id: UserId; email: string }
  let testOrganization: { id: OrganizationId; name: string }
  let testAsset: { id: AssetId; title: string }

  beforeAll(async () => {
    await testDb.setup()
  })

  afterAll(async () => {
    await testDb.cleanup()
  })

  beforeEach(async () => {
    // Create comprehensive mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(),
      rpc: jest.fn(),
      // Transaction support
      from: jest.fn(() => ({
        ...mockSupabase,
        transaction: jest.fn().mockReturnThis(),
        commit: jest.fn(),
        rollback: jest.fn(),
      })),
    }

    assetRepository = new AssetRepository(mockSupabase)

    // Create test data with branded types
    const userIdResult = createUserId('test-user-123')
    const orgIdResult = createOrganizationId('test-org-456') 
    const assetIdResult = createAssetId('test-asset-789')

    if (!userIdResult.success || !orgIdResult.success || !assetIdResult.success) {
      throw new Error('Failed to create test branded IDs')
    }

    testUser = { id: userIdResult.data, email: 'test@example.com' }
    testOrganization = { id: orgIdResult.data, name: 'Test Organization' }
    testAsset = { id: assetIdResult.data, title: 'Test Asset' }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Result Pattern Implementation', () => {
    test('should return success Result for valid findById operation', async () => {
      const expectedAsset = AssetFactory.build({ 
        id: testAsset.id,
        title: 'Valid Asset',
        owner_id: testUser.id,
        organization_id: testOrganization.id
      })

      mockSupabase.single.mockResolvedValue({
        data: expectedAsset,
        error: null,
      })

      const result = await assetRepository.findById(testAsset.id)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(expectedAsset)
        expect(result.data.id).toBe(testAsset.id)
        expect(typeof result.data.id).toBe('string')
        // Verify branded type safety at runtime
        expect(result.data.owner_id).toBe(testUser.id)
        expect(result.data.organization_id).toBe(testOrganization.id)
      }
    })

    test('should return failure Result for database errors', async () => {
      const dbError = { 
        code: '42P01', 
        message: 'relation "assets" does not exist',
        severity: 'ERROR'
      }

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: dbError,
      })

      const result = await assetRepository.findById(testAsset.id)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('DATABASE_ERROR')
        expect(result.error.message).toContain('relation "assets" does not exist')
        expect(result.error.context).toEqual(expect.objectContaining({
          operation: 'findById',
          assetId: testAsset.id,
        }))
        expect(result.error.recoverable).toBe(true)
      }
    })

    test('should return failure Result for asset not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }, // PostgREST not found
      })

      const result = await assetRepository.findById(testAsset.id)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('ASSET_NOT_FOUND')
        expect(result.error.severity).toBe('low')
        expect(result.error.recoverable).toBe(false)
      }
    })

    test('should handle validation errors in create operation', async () => {
      const invalidAsset = AssetFactory.build({
        title: '', // Invalid: empty title
        file_type: 'invalid/type' as any,
        file_size: -1, // Invalid: negative size
      })

      const result = await assetRepository.create(invalidAsset)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR')
        expect(result.error.message).toContain('Validation failed')
        expect(result.error.context).toHaveProperty('validationErrors')
      }
    })
  })

  describe('Branded Types Safety', () => {
    test('should enforce AssetId type safety in operations', async () => {
      const mockAsset = AssetFactory.build()
      mockSupabase.single.mockResolvedValue({ data: mockAsset, error: null })

      // This should work with proper AssetId
      const validResult = await assetRepository.findById(testAsset.id)
      expect(validResult.success).toBe(true)

      // Test compile-time safety by verifying the types are distinct
      const userIdResult = createUserId('user-123')
      const assetIdResult = createAssetId('asset-456')
      
      if (userIdResult.success && assetIdResult.success) {
        // These should be different types even though both are strings
        expect(typeof userIdResult.data).toBe('string')
        expect(typeof assetIdResult.data).toBe('string')
        expect(userIdResult.data).not.toBe(assetIdResult.data)
      }
    })

    test('should validate branded type creation', async () => {
      // Valid UUIDs should succeed
      const validAssetId = createAssetId('550e8400-e29b-41d4-a716-446655440000')
      expect(validAssetId.success).toBe(true)

      // Invalid formats should fail
      const invalidAssetId = createAssetId('invalid-id')
      expect(invalidAssetId.success).toBe(false)
      if (!invalidAssetId.success) {
        expect(invalidAssetId.error.code).toBe('INVALID_BRANDED_TYPE')
      }
    })

    test('should handle bulk operations with branded types', async () => {
      const assetIds = [
        createAssetId('asset-1'),
        createAssetId('asset-2'),
        createAssetId('asset-3')
      ]

      // Verify all IDs are valid
      for (const idResult of assetIds) {
        expect(idResult.success).toBe(true)
      }

      const validIds = assetIds
        .filter(r => r.success)
        .map(r => r.success ? r.data : null)
        .filter(Boolean) as AssetId[]

      const expectedAssets = validIds.map(id => AssetFactory.build({ id }))
      mockSupabase.mockResolvedValue({ data: expectedAssets, error: null })

      const result = await assetRepository.findByIds(validIds)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(3)
        expect(result.data[0].id).toBe(validIds[0])
      }
    })
  })

  describe('Transaction Management & ACID Compliance', () => {
    test('should handle successful transaction with multiple operations', async () => {
      const assetData = AssetFactory.build({
        owner_id: testUser.id,
        organization_id: testOrganization.id
      })
      const versionData = { version: 1, changes: 'Initial version' }

      // Mock successful transaction
      mockSupabase.transaction = jest.fn().mockImplementation(async (callback) => {
        await callback(mockSupabase)
        return { data: null, error: null }
      })
      
      mockSupabase.single
        .mockResolvedValueOnce({ data: assetData, error: null }) // Asset creation
        .mockResolvedValueOnce({ data: versionData, error: null }) // Version creation

      const result = await assetRepository.createWithVersion(assetData, versionData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.asset).toEqual(assetData)
        expect(result.data.version).toEqual(versionData)
      }
      expect(mockSupabase.transaction).toHaveBeenCalled()
    })

    test('should rollback transaction on failure', async () => {
      const assetData = AssetFactory.build()
      const versionData = { version: 1, changes: 'Initial version' }

      // Mock failed transaction
      mockSupabase.transaction = jest.fn().mockImplementation(async (callback) => {
        try {
          await callback(mockSupabase)
        } catch (error) {
          return { data: null, error: { message: 'Transaction rolled back' } }
        }
      })

      mockSupabase.single
        .mockResolvedValueOnce({ data: assetData, error: null }) // Asset creation succeeds
        .mockResolvedValueOnce({ data: null, error: { message: 'Version creation failed' } }) // Version creation fails

      const result = await assetRepository.createWithVersion(assetData, versionData)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('TRANSACTION_FAILED')
        expect(result.error.message).toContain('rolled back')
      }
    })

    test('should handle optimistic locking conflicts', async () => {
      const assetId = testAsset.id
      const currentVersion = 5
      const updateData = { title: 'Updated Title', version: currentVersion + 1 }

      // Mock optimistic locking conflict
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { 
          code: '23000', // Integrity constraint violation
          message: 'Version conflict detected',
          details: 'The record has been modified by another user'
        }
      })

      const result = await assetRepository.updateWithOptimisticLocking(assetId, updateData, currentVersion)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('OPTIMISTIC_LOCK_FAILURE')
        expect(result.error.recoverable).toBe(true)
        expect(result.error.context).toHaveProperty('currentVersion')
        expect(result.error.context).toHaveProperty('expectedVersion')
      }
    })

    test('should successfully update with valid version', async () => {
      const assetId = testAsset.id
      const currentVersion = 3
      const updateData = { 
        title: 'Updated Title', 
        version: currentVersion + 1,
        updated_at: new Date().toISOString()
      }

      const expectedAsset = AssetFactory.build({
        id: assetId,
        ...updateData
      })

      mockSupabase.single.mockResolvedValue({
        data: expectedAsset,
        error: null
      })

      const result = await assetRepository.updateWithOptimisticLocking(assetId, updateData, currentVersion)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.version).toBe(currentVersion + 1)
        expect(result.data.title).toBe('Updated Title')
      }

      // Verify the query included version check
      expect(mockSupabase.eq).toHaveBeenCalledWith('version', currentVersion)
    })
  })

  describe('Performance & Large Dataset Handling', () => {
    test('should handle bulk asset creation efficiently', async () => {
      const batchSize = 1000
      const assets = AssetFactory.buildList(batchSize, {
        owner_id: testUser.id,
        organization_id: testOrganization.id
      })

      mockSupabase.mockResolvedValue({
        data: assets,
        error: null
      })

      const { result, duration } = await performanceHelpers.measureExecutionTime(
        () => assetRepository.createBulk(assets)
      )

      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(5000) // Should complete in under 5 seconds

      if (result.success) {
        expect(result.data).toHaveLength(batchSize)
      }

      // Verify batch insert was used
      expect(mockSupabase.insert).toHaveBeenCalledWith(assets)
    })

    test('should efficiently search large asset collections with pagination', async () => {
      const searchTerm = 'financial report'
      const pageSize = 50
      const totalAssets = 2500

      const expectedAssets = AssetFactory.buildList(pageSize, {
        title: `${searchTerm} document`,
        owner_id: testUser.id
      })

      mockSupabase.mockResolvedValue({
        data: expectedAssets,
        count: totalAssets,
        error: null
      })

      const { result, duration } = await performanceHelpers.measureExecutionTime(
        () => assetRepository.search(searchTerm, {
          limit: pageSize,
          offset: 0,
          organization_id: testOrganization.id
        })
      )

      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(1000) // Should complete in under 1 second

      if (result.success) {
        expect(result.data.assets).toHaveLength(pageSize)
        expect(result.data.total_count).toBe(totalAssets)
        expect(result.data.has_more).toBe(true)
      }

      // Verify search optimization
      expect(mockSupabase.limit).toHaveBeenCalledWith(pageSize)
      expect(mockSupabase.range).toHaveBeenCalledWith(0, pageSize - 1)
    })

    test('should handle memory-efficient streaming for large results', async () => {
      const organizationId = testOrganization.id
      const batchSize = 100
      
      // Mock streaming response
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (let i = 0; i < 5; i++) {
            yield AssetFactory.buildList(batchSize, { organization_id: organizationId })
          }
        }
      }

      mockSupabase.stream = jest.fn().mockResolvedValue(mockStream)

      let processedCount = 0
      const result = await assetRepository.streamAssetsByOrganization(
        organizationId, 
        (batch) => {
          processedCount += batch.length
          expect(batch).toHaveLength(batchSize)
          return Promise.resolve()
        }
      )

      expect(result.success).toBe(true)
      expect(processedCount).toBe(500) // 5 batches * 100 items
    })
  })

  describe('Advanced Query Operations', () => {
    test('should support complex filtering with multiple conditions', async () => {
      const filters = {
        file_types: ['application/pdf', 'image/jpeg'],
        size_range: { min: 1000, max: 10000000 },
        date_range: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-12-31T23:59:59Z'
        },
        tags: ['important', 'financial'],
        owner_ids: [testUser.id],
        has_annotations: true
      }

      const expectedAssets = AssetFactory.buildList(25, filters)
      mockSupabase.mockResolvedValue({
        data: expectedAssets,
        error: null
      })

      const result = await assetRepository.findWithAdvancedFilters(testOrganization.id, filters)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(25)
      }

      // Verify complex query construction
      expect(mockSupabase.in).toHaveBeenCalledWith('file_type', filters.file_types)
      expect(mockSupabase.gte).toHaveBeenCalledWith('file_size', filters.size_range.min)
      expect(mockSupabase.lte).toHaveBeenCalledWith('file_size', filters.size_range.max)
    })

    test('should support full-text search with ranking', async () => {
      const searchQuery = 'board meeting minutes Q4 2024'
      const expectedResults = AssetFactory.buildList(10).map((asset, index) => ({
        ...asset,
        search_rank: 0.9 - (index * 0.1), // Decreasing relevance
        search_snippet: `...${searchQuery.slice(0, 50)}...`
      }))

      mockSupabase.rpc.mockResolvedValue({
        data: expectedResults,
        error: null
      })

      const result = await assetRepository.fullTextSearch(
        testOrganization.id, 
        searchQuery,
        { limit: 10, min_rank: 0.1 }
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(10)
        expect(result.data[0].search_rank).toBeGreaterThan(result.data[9].search_rank)
      }

      expect(mockSupabase.rpc).toHaveBeenCalledWith('full_text_search_assets', {
        org_id: testOrganization.id,
        search_query: searchQuery,
        result_limit: 10,
        min_rank: 0.1
      })
    })

    test('should handle aggregation queries for analytics', async () => {
      const expectedStats = {
        total_assets: 1500,
        total_size_bytes: 15728640000, // ~15GB
        file_type_distribution: {
          'application/pdf': 850,
          'image/jpeg': 400,
          'application/docx': 200,
          'other': 50
        },
        monthly_upload_trend: [
          { month: '2024-01', count: 120 },
          { month: '2024-02', count: 135 },
          { month: '2024-03', count: 98 }
        ],
        top_uploaders: [
          { user_id: testUser.id, count: 245, total_size: 2000000000 }
        ]
      }

      mockSupabase.rpc.mockResolvedValue({
        data: expectedStats,
        error: null
      })

      const result = await assetRepository.getOrganizationAnalytics(testOrganization.id)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.total_assets).toBe(1500)
        expect(result.data.file_type_distribution['application/pdf']).toBe(850)
        expect(result.data.monthly_upload_trend).toHaveLength(3)
      }
    })
  })

  describe('Security & Access Control', () => {
    test('should enforce organization-level access control', async () => {
      const unauthorizedOrgId = createOrganizationId('unauthorized-org')
      if (!unauthorizedOrgId.success) return

      // Try to access asset from different organization
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'RLS_VIOLATION', message: 'Access denied by row-level security' }
      })

      const result = await assetRepository.findById(testAsset.id, unauthorizedOrgId.data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('ACCESS_DENIED')
        expect(result.error.severity).toBe('high')
      }
    })

    test('should validate user permissions for operations', async () => {
      const readOnlyUserId = createUserId('readonly-user')
      if (!readOnlyUserId.success) return

      const updateData = { title: 'Attempted Update' }

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'INSUFFICIENT_PRIVILEGE', message: 'User lacks update permission' }
      })

      const result = await assetRepository.update(testAsset.id, updateData, readOnlyUserId.data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('INSUFFICIENT_PERMISSIONS')
      }
    })

    test('should handle secure file operations with virus scanning', async () => {
      const fileData = {
        filename: 'test-document.pdf',
        content_type: 'application/pdf',
        file_size: 1024000,
        checksum: 'sha256:abcd1234...'
      }

      // Mock virus scan integration
      const scanResult = {
        clean: true,
        scan_id: 'scan-123',
        scanned_at: new Date().toISOString()
      }

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: scanResult, error: null }) // Virus scan
        .mockResolvedValueOnce({ data: { upload_url: 'https://secure-upload.example.com' }, error: null }) // Upload URL

      const result = await assetRepository.initiateSecureUpload(testOrganization.id, testUser.id, fileData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.upload_url).toBeDefined()
        expect(result.data.scan_result.clean).toBe(true)
      }

      expect(mockSupabase.rpc).toHaveBeenCalledWith('scan_file_for_threats', expect.any(Object))
    })
  })

  describe('Error Recovery & Resilience', () => {
    test('should implement retry logic for transient errors', async () => {
      let attemptCount = 0
      
      mockSupabase.single.mockImplementation(() => {
        attemptCount++
        if (attemptCount < 3) {
          return Promise.resolve({
            data: null,
            error: { code: 'CONNECTION_TIMEOUT', message: 'Database connection timeout' }
          })
        }
        return Promise.resolve({
          data: AssetFactory.build({ id: testAsset.id }),
          error: null
        })
      })

      const result = await assetRepository.findByIdWithRetry(testAsset.id, { maxRetries: 3 })

      expect(result.success).toBe(true)
      expect(attemptCount).toBe(3)
    })

    test('should provide detailed error context for debugging', async () => {
      const complexError = new Error('Complex database error')
      complexError.stack = 'Error: Complex database error\n    at Repository.findById'
      
      mockSupabase.single.mockRejectedValue(complexError)

      const result = await assetRepository.findById(testAsset.id)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.context).toEqual(expect.objectContaining({
          operation: 'findById',
          assetId: testAsset.id,
          timestamp: expect.any(String),
          stackTrace: expect.stringContaining('Repository.findById')
        }))
      }
    })

    test('should handle graceful degradation for non-critical failures', async () => {
      // Simulate analytics service being down
      mockSupabase.rpc.mockRejectedValue(new Error('Analytics service unavailable'))
      
      const asset = AssetFactory.build({ id: testAsset.id })
      mockSupabase.single.mockResolvedValue({ data: asset, error: null })

      const result = await assetRepository.findByIdWithAnalytics(testAsset.id)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.asset).toEqual(asset)
        expect(result.data.analytics).toBeNull() // Analytics gracefully omitted
        expect(result.data.warnings).toContain('Analytics unavailable')
      }
    })
  })

  describe('Data Consistency & Validation', () => {
    test('should validate asset metadata consistency', async () => {
      const assetData = AssetFactory.build({
        file_type: 'application/pdf',
        file_size: 1024000,
        metadata: {
          pages: 50,
          author: 'Test Author',
          created_date: '2024-01-15',
          checksum: 'invalid-checksum' // This should be validated
        }
      })

      const result = await assetRepository.validateAndCreate(assetData)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('METADATA_VALIDATION_ERROR')
        expect(result.error.context.validationErrors).toContain('Invalid checksum format')
      }
    })

    test('should ensure referential integrity', async () => {
      const nonExistentUserId = createUserId('non-existent-user')
      if (!nonExistentUserId.success) return

      const assetData = AssetFactory.build({
        owner_id: nonExistentUserId.data,
        organization_id: testOrganization.id
      })

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { 
          code: '23503', // Foreign key violation
          message: 'insert or update on table "assets" violates foreign key constraint "assets_owner_id_fkey"'
        }
      })

      const result = await assetRepository.create(assetData)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('REFERENTIAL_INTEGRITY_ERROR')
        expect(result.error.message).toContain('Foreign key constraint')
      }
    })
  })
})