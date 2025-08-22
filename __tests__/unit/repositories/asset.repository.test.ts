/**
 * @jest-environment jsdom
 */
import { AssetRepository } from '@/lib/repositories/asset.repository'
import { createSupabaseAdminClient } from '@/config/database.config'
import { testDb } from '../../../tests/utils/test-database'
import { AssetFactory } from '../../factories'
import { testAssertions, dbHelpers } from '../../utils/test-helpers'

// Mock Supabase client
jest.mock('@/config/database.config', () => ({
  createSupabaseAdminClient: jest.fn(),
}))

describe('AssetRepository', () => {
  let assetRepository: AssetRepository
  let mockSupabase: any
  let testUser: any
  let testOrganization: any
  let testVault: any
  let testAsset: any

  beforeAll(async () => {
    await testDb.setup()
  })

  afterAll(async () => {
    await testDb.cleanup()
  })

  beforeEach(async () => {
    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      single: jest.fn(),
      storage: {
        from: jest.fn().mockReturnThis(),
        upload: jest.fn(),
        download: jest.fn(),
        remove: jest.fn(),
        getPublicUrl: jest.fn(),
      },
    }

    ;(createSupabaseAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    assetRepository = new AssetRepository(mockSupabase)

    // Create test data
    testUser = await testDb.createUser({
      email: 'test@example.com',
      full_name: 'Test User',
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

    testAsset = await testDb.createAsset({
      vault_id: testVault.id,
      created_by: testUser.id,
      name: 'Test Document.pdf',
      file_type: 'application/pdf',
    })
  })

  afterEach(async () => {
    jest.clearAllMocks()
  })

  describe('findById', () => {
    it('should return asset when found', async () => {
      const expectedAsset = AssetFactory.build({ id: testAsset.id })
      
      mockSupabase.single.mockResolvedValue({
        data: expectedAsset,
        error: null,
      })

      const result = await assetRepository.findById(testAsset.id)

      expect(mockSupabase.from).toHaveBeenCalledWith('assets')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', testAsset.id)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(expectedAsset)
      }
    })

    it('should return failure when asset not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      })

      const result = await assetRepository.findById('non-existent-id')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND')
      }
    })
  })

  describe('create', () => {
    it('should create new asset successfully', async () => {
      const assetData = AssetFactory.build({
        vault_id: testVault.id,
        created_by: testUser.id,
        name: 'New Document.pdf',
      })
      const expectedAsset = { ...assetData, created_at: expect.any(String) }
      
      mockSupabase.single.mockResolvedValue({
        data: expectedAsset,
        error: null,
      })

      const result = await assetRepository.create(assetData)

      expect(mockSupabase.from).toHaveBeenCalledWith('assets')
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        ...assetData,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      }))
      expect(result.success).toBe(true)
    })

    it('should handle validation errors', async () => {
      const invalidAssetData = AssetFactory.build({ name: '' })
      
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Name cannot be empty', code: '23514' },
      })

      const result = await assetRepository.create(invalidAssetData)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Name cannot be empty')
      }
    })
  })

  describe('uploadFile', () => {
    it('should upload file to storage successfully', async () => {
      const fileBuffer = Buffer.from('test file content')
      const filePath = 'test/document.pdf'
      const contentType = 'application/pdf'

      mockSupabase.storage.upload.mockResolvedValue({
        data: { path: filePath },
        error: null,
      })

      const result = await assetRepository.uploadFile(filePath, fileBuffer, {
        contentType,
        upsert: false,
      })

      expect(mockSupabase.storage.from).toHaveBeenCalledWith('assets')
      expect(mockSupabase.storage.upload).toHaveBeenCalledWith(
        filePath,
        fileBuffer,
        { contentType, upsert: false }
      )
      expect(result.success).toBe(true)
    })

    it('should handle storage errors', async () => {
      const fileBuffer = Buffer.from('test')
      const filePath = 'invalid/path.pdf'

      mockSupabase.storage.upload.mockResolvedValue({
        data: null,
        error: { message: 'Storage quota exceeded' },
      })

      const result = await assetRepository.uploadFile(filePath, fileBuffer)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Storage quota exceeded')
      }
    })
  })

  describe('findByVault', () => {
    it('should return assets for vault', async () => {
      const expectedAssets = AssetFactory.buildList(3)
      
      mockSupabase.mockResolvedValue({
        data: expectedAssets,
        error: null,
      })

      const result = await assetRepository.findByVault(testVault.id)

      expect(mockSupabase.from).toHaveBeenCalledWith('assets')
      expect(mockSupabase.eq).toHaveBeenCalledWith('vault_id', testVault.id)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(expectedAssets)
      }
    })

    it('should filter by file type when specified', async () => {
      const pdfAssets = AssetFactory.buildList(2, { file_type: 'application/pdf' })
      
      mockSupabase.mockResolvedValue({
        data: pdfAssets,
        error: null,
      })

      const result = await assetRepository.findByVault(testVault.id, {
        fileType: 'application/pdf',
      })

      expect(mockSupabase.eq).toHaveBeenCalledWith('file_type', 'application/pdf')
      expect(result.success).toBe(true)
    })
  })

  describe('search', () => {
    it('should search assets by name and content', async () => {
      const expectedAssets = AssetFactory.buildList(2)
      
      mockSupabase.mockResolvedValue({
        data: expectedAssets,
        error: null,
      })

      const result = await assetRepository.search('contract', {
        limit: 10,
        offset: 0,
      })

      expect(mockSupabase.select).toHaveBeenCalled()
      expect(mockSupabase.or).toHaveBeenCalledWith(
        expect.stringContaining('name.ilike.%contract%')
      )
      expect(result.success).toBe(true)
    })

    it('should handle pagination parameters', async () => {
      const result = await assetRepository.search('test', {
        limit: 5,
        offset: 10,
      })

      expect(mockSupabase.range).toHaveBeenCalledWith(10, 14)
    })
  })

  describe('updateAnnotations', () => {
    it('should update asset annotation count', async () => {
      const updatedAsset = { ...AssetFactory.build(), annotation_count: 5 }
      
      mockSupabase.single.mockResolvedValue({
        data: updatedAsset,
        error: null,
      })

      const result = await assetRepository.updateAnnotations(testAsset.id, 5)

      expect(mockSupabase.update).toHaveBeenCalledWith({
        annotation_count: 5,
        updated_at: expect.any(String),
      })
      expect(result.success).toBe(true)
    })
  })

  describe('delete', () => {
    it('should soft delete asset', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: testAsset.id, deleted_at: new Date().toISOString() },
        error: null,
      })

      const result = await assetRepository.delete(testAsset.id)

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_at: expect.any(String),
          is_active: false,
        })
      )
      expect(result.success).toBe(true)
    })
  })

  describe('getDownloadUrl', () => {
    it('should generate signed download URL', async () => {
      const expectedUrl = 'https://storage.supabase.co/signed-url'
      
      mockSupabase.storage.download.mockResolvedValue({
        data: new Blob(['file content']),
        error: null,
      })
      
      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: expectedUrl },
      })

      const result = await assetRepository.getDownloadUrl(testAsset.id)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(expectedUrl)
      }
    })
  })

  describe('performance tests', () => {
    it('should handle bulk asset operations efficiently', async () => {
      const assets = AssetFactory.buildList(50)
      
      mockSupabase.mockResolvedValue({
        data: assets,
        error: null,
      })

      const startTime = Date.now()
      const result = await assetRepository.createBulk(assets)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(3000) // Should complete in under 3 seconds
      expect(result.success).toBe(true)
    })

    it('should efficiently search through large asset collections', async () => {
      const expectedAssets = AssetFactory.buildList(20)
      
      mockSupabase.mockResolvedValue({
        data: expectedAssets,
        error: null,
      })

      const startTime = Date.now()
      const result = await assetRepository.search('document', { limit: 20 })
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(1000)
      expect(result.success).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle corrupted file uploads', async () => {
      mockSupabase.storage.upload.mockResolvedValue({
        data: null,
        error: { message: 'File corrupted during upload' },
      })

      const result = await assetRepository.uploadFile(
        'test.pdf',
        Buffer.from('corrupted data')
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('File corrupted')
      }
    })

    it('should handle storage quota limits', async () => {
      mockSupabase.storage.upload.mockResolvedValue({
        data: null,
        error: { message: 'Storage quota exceeded', code: 'STORAGE_LIMIT' },
      })

      const result = await assetRepository.uploadFile(
        'large-file.pdf',
        Buffer.alloc(1024 * 1024 * 100) // 100MB file
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('STORAGE_LIMIT')
      }
    })
  })

  describe('data validation', () => {
    it('should validate asset data before saving', async () => {
      const assetData = AssetFactory.build()
      
      expect(testAssertions.hasRequiredFields(assetData, [
        'name', 'file_type', 'vault_id', 'created_by'
      ])).toBe(true)
      
      expect(testAssertions.isValidFileType(assetData.file_type)).toBe(true)
    })

    it('should validate file size limits', async () => {
      const largeFile = Buffer.alloc(1024 * 1024 * 500) // 500MB
      
      const result = await assetRepository.validateFileSize(largeFile, 'premium')
      
      expect(result.success).toBe(true) // Premium allows large files
    })

    it('should validate file types against organization policy', async () => {
      const result = await assetRepository.validateFileType(
        'application/exe',
        testOrganization.id
      )
      
      expect(result.success).toBe(false) // Executable files not allowed
    })
  })
})
