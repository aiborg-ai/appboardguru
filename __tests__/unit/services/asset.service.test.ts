/**
 * @jest-environment jsdom
 */
import { AssetService } from '@/lib/services/asset.service'
import { AssetRepository } from '@/lib/repositories/asset.repository'
import { VaultRepository } from '@/lib/repositories/vault.repository'
import { testDb } from '../../../tests/utils/test-database'
import { AssetFactory, VaultFactory } from '../../factories'
import { testAssertions, mockServices, performanceHelpers } from '../../utils/test-helpers'

// Mock repositories
jest.mock('@/lib/repositories/asset.repository')
jest.mock('@/lib/repositories/vault.repository')

describe('AssetService', () => {
  let assetService: AssetService
  let mockAssetRepository: jest.Mocked<AssetRepository>
  let mockVaultRepository: jest.Mocked<VaultRepository>
  let testUser: any
  let testVault: any
  let testAsset: any

  beforeAll(async () => {
    await testDb.setup()
  })

  afterAll(async () => {
    await testDb.cleanup()
  })

  beforeEach(async () => {
    // Create mock repositories
    mockAssetRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByVault: jest.fn(),
      search: jest.fn(),
      uploadFile: jest.fn(),
      getDownloadUrl: jest.fn(),
      updateAnnotations: jest.fn(),
      validateFileType: jest.fn(),
      validateFileSize: jest.fn(),
      createBulk: jest.fn(),
    } as any

    mockVaultRepository = {
      findById: jest.fn(),
      validateMemberAccess: jest.fn(),
      getStats: jest.fn(),
    } as any

    assetService = new AssetService(mockAssetRepository, mockVaultRepository)

    // Create test data
    testUser = await testDb.createUser({
      email: 'test@example.com',
      role: 'director',
    })

    testVault = VaultFactory.build({
      id: 'vault-123',
      name: 'Test Vault',
    })

    testAsset = AssetFactory.build({
      id: 'asset-123',
      vault_id: testVault.id,
      created_by: testUser.id,
      name: 'Test Document.pdf',
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('uploadAsset', () => {
    it('should upload asset successfully with validation', async () => {
      const fileBuffer = Buffer.from('test file content')
      const uploadData = {
        name: 'Test Document.pdf',
        file_type: 'application/pdf',
        vault_id: testVault.id!,
        description: 'Test document for upload',
      }

      // Mock validations
      mockVaultRepository.validateMemberAccess.mockResolvedValue({ success: true, data: true })
      mockAssetRepository.validateFileType.mockResolvedValue({ success: true, data: true })
      mockAssetRepository.validateFileSize.mockResolvedValue({ success: true, data: true })
      
      // Mock file upload and asset creation
      mockAssetRepository.uploadFile.mockResolvedValue({ 
        success: true, 
        data: { path: 'assets/test-document.pdf' } 
      })
      mockAssetRepository.create.mockResolvedValue({ success: true, data: testAsset })

      const result = await assetService.uploadAsset(testUser.id, uploadData, fileBuffer)

      expect(mockVaultRepository.validateMemberAccess).toHaveBeenCalledWith(
        testVault.id,
        testUser.id,
        'write'
      )
      expect(mockAssetRepository.validateFileType).toHaveBeenCalled()
      expect(mockAssetRepository.validateFileSize).toHaveBeenCalled()
      expect(mockAssetRepository.uploadFile).toHaveBeenCalled()
      expect(mockAssetRepository.create).toHaveBeenCalled()
      expect(result.success).toBe(true)
    })

    it('should reject upload if user lacks vault write access', async () => {
      mockVaultRepository.validateMemberAccess.mockResolvedValue({ 
        success: false, 
        error: new Error('Insufficient permissions') 
      })

      const result = await assetService.uploadAsset(
        testUser.id,
        { name: 'test.pdf', file_type: 'application/pdf', vault_id: testVault.id! },
        Buffer.from('test')
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Insufficient permissions')
      }
    })

    it('should reject upload for invalid file types', async () => {
      mockVaultRepository.validateMemberAccess.mockResolvedValue({ success: true, data: true })
      mockAssetRepository.validateFileType.mockResolvedValue({ 
        success: false, 
        error: new Error('File type not allowed') 
      })

      const result = await assetService.uploadAsset(
        testUser.id,
        { name: 'malware.exe', file_type: 'application/exe', vault_id: testVault.id! },
        Buffer.from('malware')
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('File type not allowed')
      }
    })

    it('should reject upload if file size exceeds limits', async () => {
      mockVaultRepository.validateMemberAccess.mockResolvedValue({ success: true, data: true })
      mockAssetRepository.validateFileType.mockResolvedValue({ success: true, data: true })
      mockAssetRepository.validateFileSize.mockResolvedValue({ 
        success: false, 
        error: new Error('File too large') 
      })

      const result = await assetService.uploadAsset(
        testUser.id,
        { name: 'huge-file.pdf', file_type: 'application/pdf', vault_id: testVault.id! },
        Buffer.alloc(1024 * 1024 * 1000) // 1GB file
      )

      expect(result.success).toBe(false)
    })
  })

  describe('getAsset', () => {
    it('should return asset with access validation', async () => {
      mockAssetRepository.findById.mockResolvedValue({ success: true, data: testAsset })
      mockVaultRepository.validateMemberAccess.mockResolvedValue({ success: true, data: true })

      const result = await assetService.getAsset(testAsset.id!, testUser.id)

      expect(mockAssetRepository.findById).toHaveBeenCalledWith(testAsset.id)
      expect(mockVaultRepository.validateMemberAccess).toHaveBeenCalledWith(
        testAsset.vault_id,
        testUser.id,
        'read'
      )
      expect(result.success).toBe(true)
    })

    it('should deny access if user cannot read vault', async () => {
      mockAssetRepository.findById.mockResolvedValue({ success: true, data: testAsset })
      mockVaultRepository.validateMemberAccess.mockResolvedValue({ 
        success: false, 
        error: new Error('Access denied') 
      })

      const result = await assetService.getAsset(testAsset.id!, 'unauthorized-user')

      expect(result.success).toBe(false)
    })
  })

  describe('updateAsset', () => {
    it('should update asset with validation', async () => {
      const updateData = {
        name: 'Updated Document.pdf',
        description: 'Updated description',
      }

      const updatedAsset = { ...testAsset, ...updateData }

      mockAssetRepository.findById.mockResolvedValue({ success: true, data: testAsset })
      mockVaultRepository.validateMemberAccess.mockResolvedValue({ success: true, data: true })
      mockAssetRepository.update.mockResolvedValue({ success: true, data: updatedAsset })

      const result = await assetService.updateAsset(testAsset.id!, testUser.id, updateData)

      expect(mockVaultRepository.validateMemberAccess).toHaveBeenCalledWith(
        testAsset.vault_id,
        testUser.id,
        'write'
      )
      expect(mockAssetRepository.update).toHaveBeenCalledWith(testAsset.id, updateData)
      expect(result.success).toBe(true)
    })

    it('should prevent updating file-related fields', async () => {
      const invalidUpdate = {
        file_type: 'text/plain',
        file_size: 12345,
        storage_path: '/new/path',
      }

      mockAssetRepository.findById.mockResolvedValue({ success: true, data: testAsset })
      mockVaultRepository.validateMemberAccess.mockResolvedValue({ success: true, data: true })

      const result = await assetService.updateAsset(testAsset.id!, testUser.id, invalidUpdate)

      expect(mockAssetRepository.update).toHaveBeenCalledWith(
        testAsset.id,
        expect.not.objectContaining({
          file_type: expect.any(String),
          file_size: expect.any(Number),
          storage_path: expect.any(String),
        })
      )
    })
  })

  describe('deleteAsset', () => {
    it('should soft delete asset with proper access validation', async () => {
      mockAssetRepository.findById.mockResolvedValue({ success: true, data: testAsset })
      mockVaultRepository.validateMemberAccess.mockResolvedValue({ success: true, data: true })
      mockAssetRepository.delete.mockResolvedValue({ success: true, data: true })

      const result = await assetService.deleteAsset(testAsset.id!, testUser.id)

      expect(mockVaultRepository.validateMemberAccess).toHaveBeenCalledWith(
        testAsset.vault_id,
        testUser.id,
        'write'
      )
      expect(mockAssetRepository.delete).toHaveBeenCalledWith(testAsset.id)
      expect(result.success).toBe(true)
    })

    it('should only allow owners and admins to delete assets', async () => {
      mockAssetRepository.findById.mockResolvedValue({ success: true, data: testAsset })
      mockVaultRepository.validateMemberAccess.mockResolvedValue({ 
        success: false, 
        error: new Error('Only owners and admins can delete assets') 
      })

      const result = await assetService.deleteAsset(testAsset.id!, 'viewer-user')

      expect(result.success).toBe(false)
    })
  })

  describe('generateDownloadUrl', () => {
    it('should generate signed download URL with access validation', async () => {
      const expectedUrl = 'https://storage.supabase.co/signed-url'
      
      mockAssetRepository.findById.mockResolvedValue({ success: true, data: testAsset })
      mockVaultRepository.validateMemberAccess.mockResolvedValue({ success: true, data: true })
      mockAssetRepository.getDownloadUrl.mockResolvedValue({ success: true, data: expectedUrl })

      const result = await assetService.generateDownloadUrl(testAsset.id!, testUser.id)

      expect(mockAssetRepository.getDownloadUrl).toHaveBeenCalledWith(testAsset.id)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(expectedUrl)
      }
    })

    it('should track download activity', async () => {
      const expectedUrl = 'https://storage.supabase.co/signed-url'
      
      mockAssetRepository.findById.mockResolvedValue({ success: true, data: testAsset })
      mockVaultRepository.validateMemberAccess.mockResolvedValue({ success: true, data: true })
      mockAssetRepository.getDownloadUrl.mockResolvedValue({ success: true, data: expectedUrl })

      await assetService.generateDownloadUrl(testAsset.id!, testUser.id)

      // Verify activity logging was called
      expect(mockServices.activityLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'download',
          resource_type: 'asset',
          resource_id: testAsset.id,
          user_id: testUser.id,
        })
      )
    })
  })

  describe('searchAssets', () => {
    it('should search assets with vault access filtering', async () => {
      const searchResults = AssetFactory.buildList(5)
      const userVaults = ['vault-1', 'vault-2', 'vault-3']

      mockAssetRepository.search.mockResolvedValue({ success: true, data: searchResults })

      const result = await assetService.searchAssets(testUser.id, 'contract', {
        limit: 10,
        vaultIds: userVaults,
      })

      expect(mockAssetRepository.search).toHaveBeenCalledWith('contract', expect.objectContaining({
        limit: 10,
        filters: expect.objectContaining({
          vault_id: userVaults,
        }),
      }))
      expect(result.success).toBe(true)
    })

    it('should filter results by file type when specified', async () => {
      const result = await assetService.searchAssets(testUser.id, 'document', {
        fileTypes: ['application/pdf', 'application/docx'],
      })

      expect(mockAssetRepository.search).toHaveBeenCalledWith('document', expect.objectContaining({
        filters: expect.objectContaining({
          file_type: ['application/pdf', 'application/docx'],
        }),
      }))
    })
  })

  describe('bulkUpload', () => {
    it('should handle multiple file uploads with progress tracking', async () => {
      const files = [
        { name: 'doc1.pdf', buffer: Buffer.from('content1'), type: 'application/pdf' },
        { name: 'doc2.pdf', buffer: Buffer.from('content2'), type: 'application/pdf' },
        { name: 'doc3.pdf', buffer: Buffer.from('content3'), type: 'application/pdf' },
      ]

      mockVaultRepository.validateMemberAccess.mockResolvedValue({ success: true, data: true })
      mockAssetRepository.validateFileType.mockResolvedValue({ success: true, data: true })
      mockAssetRepository.validateFileSize.mockResolvedValue({ success: true, data: true })
      
      files.forEach((_, index) => {
        mockAssetRepository.uploadFile.mockResolvedValueOnce({ 
          success: true, 
          data: { path: `assets/doc${index + 1}.pdf` } 
        })
        mockAssetRepository.create.mockResolvedValueOnce({ 
          success: true, 
          data: AssetFactory.build({ name: `doc${index + 1}.pdf` }) 
        })
      })

      const progressCallback = jest.fn()
      const result = await assetService.bulkUpload(
        testUser.id,
        testVault.id!,
        files,
        progressCallback
      )

      expect(result.success).toBe(true)
      expect(progressCallback).toHaveBeenCalledTimes(files.length)
      expect(progressCallback).toHaveBeenLastCalledWith({
        completed: 3,
        total: 3,
        currentFile: 'doc3.pdf',
        percentage: 100,
      })
    })

    it('should handle partial failures in bulk upload', async () => {
      const files = [
        { name: 'doc1.pdf', buffer: Buffer.from('content1'), type: 'application/pdf' },
        { name: 'invalid.exe', buffer: Buffer.from('malware'), type: 'application/exe' },
        { name: 'doc3.pdf', buffer: Buffer.from('content3'), type: 'application/pdf' },
      ]

      mockVaultRepository.validateMemberAccess.mockResolvedValue({ success: true, data: true })
      mockAssetRepository.validateFileType
        .mockResolvedValueOnce({ success: true, data: true })
        .mockResolvedValueOnce({ success: false, error: new Error('Invalid file type') })
        .mockResolvedValueOnce({ success: true, data: true })

      const result = await assetService.bulkUpload(testUser.id, testVault.id!, files)

      expect(result.success).toBe(true) // Partial success
      if (result.success) {
        expect(result.data.successful).toHaveLength(2)
        expect(result.data.failed).toHaveLength(1)
        expect(result.data.failed[0].filename).toBe('invalid.exe')
      }
    })
  })

  describe('getAssetAnnotations', () => {
    it('should return annotations with proper access control', async () => {
      const annotations = [
        { id: 'ann1', content: 'First annotation', page: 1 },
        { id: 'ann2', content: 'Second annotation', page: 2 },
      ]

      mockAssetRepository.findById.mockResolvedValue({ success: true, data: testAsset })
      mockVaultRepository.validateMemberAccess.mockResolvedValue({ success: true, data: true })
      mockAssetRepository.getAnnotations.mockResolvedValue({ success: true, data: annotations })

      const result = await assetService.getAssetAnnotations(testAsset.id!, testUser.id)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(annotations)
      }
    })
  })

  describe('performance tests', () => {
    it('should efficiently process large file uploads', async () => {
      const largeFile = Buffer.alloc(1024 * 1024 * 50) // 50MB file
      const uploadData = {
        name: 'large-document.pdf',
        file_type: 'application/pdf',
        vault_id: testVault.id!,
      }

      mockVaultRepository.validateMemberAccess.mockResolvedValue({ success: true, data: true })
      mockAssetRepository.validateFileType.mockResolvedValue({ success: true, data: true })
      mockAssetRepository.validateFileSize.mockResolvedValue({ success: true, data: true })
      mockAssetRepository.uploadFile.mockResolvedValue({ 
        success: true, 
        data: { path: 'assets/large-document.pdf' } 
      })
      mockAssetRepository.create.mockResolvedValue({ success: true, data: testAsset })

      const { result, duration } = await performanceHelpers.measureExecutionTime(
        () => assetService.uploadAsset(testUser.id, uploadData, largeFile)
      )

      expect(duration).toBeLessThan(10000) // Should complete in under 10 seconds
      expect(result.success).toBe(true)
    })

    it('should efficiently search through large asset collections', async () => {
      const searchResults = AssetFactory.buildList(100)
      
      mockAssetRepository.search.mockResolvedValue({ success: true, data: searchResults })

      const { result, duration } = await performanceHelpers.measureExecutionTime(
        () => assetService.searchAssets(testUser.id, 'document', { limit: 100 })
      )

      expect(duration).toBeLessThan(2000) // Should complete in under 2 seconds
      expect(result.success).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should handle repository errors gracefully', async () => {
      mockAssetRepository.findById.mockResolvedValue({
        success: false,
        error: new Error('Database connection failed'),
      })

      const result = await assetService.getAsset(testAsset.id!, testUser.id)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Database connection failed')
      }
    })

    it('should rollback file upload on asset creation failure', async () => {
      mockVaultRepository.validateMemberAccess.mockResolvedValue({ success: true, data: true })
      mockAssetRepository.validateFileType.mockResolvedValue({ success: true, data: true })
      mockAssetRepository.validateFileSize.mockResolvedValue({ success: true, data: true })
      mockAssetRepository.uploadFile.mockResolvedValue({ 
        success: true, 
        data: { path: 'assets/test.pdf' } 
      })
      mockAssetRepository.create.mockResolvedValue({
        success: false,
        error: new Error('Asset creation failed'),
      })

      const result = await assetService.uploadAsset(
        testUser.id,
        { name: 'test.pdf', file_type: 'application/pdf', vault_id: testVault.id! },
        Buffer.from('test')
      )

      expect(result.success).toBe(false)
      // Verify cleanup was attempted
      expect(mockAssetRepository.deleteFile).toHaveBeenCalledWith('assets/test.pdf')
    })
  })

  describe('data validation', () => {
    it('should validate asset metadata before processing', async () => {
      const invalidAsset = {
        name: '', // Invalid: empty name
        file_type: 'invalid/type', // Invalid: non-standard MIME type
        vault_id: 'invalid-vault-id',
      }

      const result = await assetService.uploadAsset(
        testUser.id,
        invalidAsset,
        Buffer.from('test')
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('validation')
      }
    })
  })
})
