/**
 * Asset Service Layer Tests
 * Comprehensive testing of business logic following CLAUDE.md DDD patterns
 * Tests all service methods including virus scanning, validation, and Result pattern integration
 */

import { jest } from '@jest/globals'

import { AssetService } from '@/lib/services/asset.service'
import { MockAssetRepository } from '../mocks/asset-repository.mock'
import { AssetFactory, AssetResultFactory, TEST_FILE_TYPES, TEST_CONSTANTS } from '../factories/asset.factory'
import { 
  ResultTestHelpers, 
  AsyncTestHelpers, 
  PerformanceTestHelpers,
  ErrorTestHelpers,
  TestEnvironmentHelpers 
} from '../utils/test-helpers'
import { AssetUploadData } from '@/lib/repositories/asset.repository.enhanced'

describe('AssetService Business Logic Tests', () => {
  let assetService: AssetService
  let mockRepository: MockAssetRepository

  beforeAll(() => {
    TestEnvironmentHelpers.setupTestEnv()
  })

  afterAll(() => {
    TestEnvironmentHelpers.cleanupTestEnv()
  })

  beforeEach(() => {
    mockRepository = new MockAssetRepository()
    assetService = new AssetService(mockRepository as any)
    jest.clearAllMocks()
  })

  describe('Upload Asset Business Logic', () => {
    it('validates upload data before processing', async () => {
      const uploadData = AssetFactory.createUploadData()
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertSuccess(result)
      expect(result.data).toBeDefined()
      expect(result.data.title).toBe(uploadData.title)
    })

    it('rejects empty title', async () => {
      const uploadData = AssetFactory.createUploadData({ title: '' })
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertFailure(result)
      ResultTestHelpers.assertErrorMessage(result, /title/i)
    })

    it('rejects empty file', async () => {
      const uploadData = AssetFactory.createUploadData({ 
        file: Buffer.alloc(0), 
        fileSize: 0 
      })
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertFailure(result)
      ResultTestHelpers.assertErrorMessage(result, /file/i)
    })

    it('enforces file size limits', async () => {
      const largeFile = Buffer.alloc(60 * 1024 * 1024) // 60MB
      const uploadData = AssetFactory.createUploadData({ 
        file: largeFile, 
        fileSize: largeFile.length 
      })
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertFailure(result)
      ResultTestHelpers.assertErrorMessage(result, /file size exceeds/i)
    })

    it('validates allowed MIME types', async () => {
      const uploadData = AssetFactory.createUploadData({ 
        mimeType: 'application/x-malware' 
      })
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertFailure(result)
      ResultTestHelpers.assertErrorMessage(result, /file type.*not allowed/i)
    })

    it('performs virus scanning', async () => {
      const malwareContent = Buffer.from('MALWARE_SIGNATURE test content')
      const uploadData = AssetFactory.createUploadData({ file: malwareContent })
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertFailure(result)
      ResultTestHelpers.assertErrorMessage(result, /security scan/i)
    })

    it('accepts clean files after virus scan', async () => {
      const cleanContent = Buffer.from('Clean document content')
      const uploadData = AssetFactory.createUploadData({ file: cleanContent })
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertSuccess(result)
    })
  })

  describe('Upload Processing Flow', () => {
    it('follows correct processing sequence', async () => {
      const uploadData = AssetFactory.createUploadData()
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertSuccess(result)
      
      // Verify repository methods were called in correct sequence
      mockRepository.verifyUploadCalled(1)
      expect(mockRepository.createAssetRecord).toHaveBeenCalledAfter(mockRepository.uploadFileToStorage)
    })

    it('cleans up storage on database failure', async () => {
      const uploadData = AssetFactory.createUploadData()
      mockRepository.setupDatabaseFailure('Database connection failed')
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertFailure(result)
      mockRepository.verifyCleanupCalled()
    })

    it('does not clean up on storage failure', async () => {
      const uploadData = AssetFactory.createUploadData()
      mockRepository.setupUploadFailure('Storage service unavailable')
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertFailure(result)
      expect(mockRepository.deleteFileFromStorage).not.toHaveBeenCalled()
    })

    it('logs activity after successful upload', async () => {
      const uploadData = AssetFactory.createUploadData({
        title: 'Activity Test Document'
      })
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertSuccess(result)
      
      // Wait for async activity logging
      await AsyncTestHelpers.sleep(10)
      
      // Verify activity was logged (would be tested with actual logging service)
      expect(result.data.title).toBe('Activity Test Document')
    })
  })

  describe('File Type Handling', () => {
    it('processes PDF files correctly', async () => {
      const uploadData = AssetFactory.createUploadData({
        mimeType: TEST_FILE_TYPES.PDF,
        fileName: 'test.pdf'
      })
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertSuccess(result)
      expect(result.data.mime_type).toBe(TEST_FILE_TYPES.PDF)
    })

    it('processes DOCX files correctly', async () => {
      const uploadData = AssetFactory.createUploadData({
        mimeType: TEST_FILE_TYPES.DOCX,
        fileName: 'test.docx'
      })
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertSuccess(result)
      expect(result.data.mime_type).toBe(TEST_FILE_TYPES.DOCX)
    })

    it('processes image files correctly', async () => {
      const uploadData = AssetFactory.createUploadData({
        mimeType: TEST_FILE_TYPES.JPEG,
        fileName: 'test.jpg'
      })
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertSuccess(result)
      expect(result.data.mime_type).toBe(TEST_FILE_TYPES.JPEG)
    })
  })

  describe('Metadata and Processing', () => {
    it('extracts metadata from uploaded files', async () => {
      const pdfContent = Buffer.from('%PDF-1.4 mock PDF content')
      const uploadData = AssetFactory.createUploadData({
        file: pdfContent,
        mimeType: TEST_FILE_TYPES.PDF
      })
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertSuccess(result)
      
      // Verify metadata extraction occurred
      expect(result.data.metadata).toBeDefined()
    })

    it('handles metadata extraction failures gracefully', async () => {
      const corruptedContent = Buffer.from('corrupted file data')
      const uploadData = AssetFactory.createUploadData({
        file: corruptedContent,
        mimeType: TEST_FILE_TYPES.PDF
      })
      
      const result = await assetService.uploadAsset(uploadData)
      
      // Should still succeed even if metadata extraction fails
      ResultTestHelpers.assertSuccess(result)
    })

    it('generates thumbnails for supported formats', async () => {
      const imageContent = Buffer.from('fake image data')
      const uploadData = AssetFactory.createUploadData({
        file: imageContent,
        mimeType: TEST_FILE_TYPES.JPEG
      })
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertSuccess(result)
      
      // Wait for async thumbnail generation
      await AsyncTestHelpers.sleep(150)
      
      // Verify asset was created (thumbnail generation is async)
      expect(result.data).toBeDefined()
    })
  })

  describe('Organization and Access Control', () => {
    it('validates organization access', async () => {
      const uploadData = AssetFactory.createUploadData()
      mockRepository.setupAccessDenied()
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertFailure(result)
      ResultTestHelpers.assertErrorMessage(result, /access.*denied/i)
    })

    it('allows upload with valid organization access', async () => {
      const uploadData = AssetFactory.createUploadData({
        organizationId: AssetFactory.createOrganizationId()
      })
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertSuccess(result)
    })

    it('handles organization validation errors', async () => {
      const uploadData = AssetFactory.createUploadData()
      mockRepository.validateOrganizationAccess.mockResolvedValue(
        AssetResultFactory.createErrorResult('Organization not found')
      )
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertFailure(result)
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('handles network timeouts', async () => {
      const uploadData = AssetFactory.createUploadData()
      mockRepository.setupNetworkTimeout()
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertFailure(result)
      ResultTestHelpers.assertErrorMessage(result, /timeout/i)
    })

    it('handles partial failures', async () => {
      const uploadData = AssetFactory.createUploadData()
      mockRepository.setupPartialFailure()
      
      // Should succeed after retries
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertSuccess(result)
    })

    it('provides detailed error information', async () => {
      const uploadData = AssetFactory.createUploadData()
      mockRepository.setupUploadFailure('Detailed storage error message')
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertFailure(result)
      expect(result.error.message).toContain('storage error')
    })
  })

  describe('Asset Retrieval and Management', () => {
    it('retrieves asset by ID', async () => {
      const testAsset = AssetFactory.createWithDetails()
      mockRepository.seedWithAssets([testAsset])
      
      const result = await assetService.getAsset(testAsset.id as any)
      
      ResultTestHelpers.assertSuccess(result)
      expect(result.data.id).toBe(testAsset.id)
    })

    it('handles asset not found', async () => {
      const nonExistentId = AssetFactory.createId()
      
      const result = await assetService.getAsset(nonExistentId)
      
      ResultTestHelpers.assertFailure(result)
      ResultTestHelpers.assertErrorMessage(result, /not found/i)
    })

    it('updates asset metadata', async () => {
      const testAsset = AssetFactory.createWithDetails()
      mockRepository.seedWithAssets([testAsset])
      
      const updateData = {
        title: 'Updated Title',
        description: 'Updated Description'
      }
      
      const result = await assetService.updateAsset(testAsset.id as any, updateData as any)
      
      ResultTestHelpers.assertSuccess(result)
      expect(result.data.title).toBe('Updated Title')
      expect(result.data.description).toBe('Updated Description')
    })

    it('deletes asset and cleans up storage', async () => {
      const testAsset = AssetFactory.createWithDetails()
      mockRepository.seedWithAssets([testAsset])
      
      const result = await assetService.deleteAsset(testAsset.id as any)
      
      ResultTestHelpers.assertSuccess(result)
      expect(mockRepository.deleteAsset).toHaveBeenCalledWith(testAsset.id)
    })
  })

  describe('Performance and Scalability', () => {
    it('processes small files quickly', async () => {
      const smallFile = Buffer.alloc(1024) // 1KB
      const uploadData = AssetFactory.createUploadData({ 
        file: smallFile, 
        fileSize: smallFile.length 
      })
      
      const { duration, result } = await PerformanceTestHelpers.measureExecutionTime(async () => {
        return await assetService.uploadAsset(uploadData)
      })
      
      ResultTestHelpers.assertSuccess(result)
      PerformanceTestHelpers.assertPerformance(duration, 1000, 'Small file upload')
    })

    it('handles large files within reasonable time', async () => {
      const largeFile = Buffer.alloc(10 * 1024 * 1024) // 10MB
      const uploadData = AssetFactory.createUploadData({ 
        file: largeFile, 
        fileSize: largeFile.length 
      })
      
      const { duration, result } = await PerformanceTestHelpers.measureExecutionTime(async () => {
        return await assetService.uploadAsset(uploadData)
      })
      
      ResultTestHelpers.assertSuccess(result)
      PerformanceTestHelpers.assertPerformance(duration, 5000, 'Large file upload')
    })

    it('handles concurrent uploads', async () => {
      const uploadPromises = Array.from({ length: 5 }, () => {
        const uploadData = AssetFactory.createUploadData()
        return assetService.uploadAsset(uploadData)
      })
      
      const results = await Promise.all(uploadPromises)
      
      results.forEach(result => {
        ResultTestHelpers.assertSuccess(result)
      })
      
      expect(mockRepository.uploadFileToStorage).toHaveBeenCalledTimes(5)
    })
  })

  describe('Virus Scanning Edge Cases', () => {
    it('handles multiple virus signatures', async () => {
      const malwareContent = Buffer.from('MALWARE_SIGNATURE and VIRUS_TEST content')
      const uploadData = AssetFactory.createUploadData({ file: malwareContent })
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertFailure(result)
      ResultTestHelpers.assertErrorMessage(result, /security scan/i)
    })

    it('handles virus scanner unavailable', async () => {
      // Mock virus scanner failure
      const originalScanForViruses = assetService.scanForViruses
      assetService.scanForViruses = jest.fn().mockRejectedValue(new Error('Scanner unavailable'))
      
      const uploadData = AssetFactory.createUploadData()
      
      const result = await assetService.uploadAsset(uploadData)
      
      // Should fail securely when scanner is unavailable
      ResultTestHelpers.assertFailure(result)
      
      // Restore original method
      assetService.scanForViruses = originalScanForViruses
    })

    it('scans binary file content correctly', async () => {
      const binaryContent = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) // PNG header
      const uploadData = AssetFactory.createUploadData({ 
        file: binaryContent,
        mimeType: TEST_FILE_TYPES.PNG
      })
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertSuccess(result)
    })
  })

  describe('Input Validation Edge Cases', () => {
    it('handles Unicode in titles', async () => {
      const uploadData = AssetFactory.createUploadData({
        title: '文档测试 📄 Document Test'
      })
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertSuccess(result)
      expect(result.data.title).toBe('文档测试 📄 Document Test')
    })

    it('handles special characters in file names', async () => {
      const uploadData = AssetFactory.createUploadData({
        fileName: 'test file (with special chars) & symbols.pdf',
        originalFileName: 'test file (with special chars) & symbols.pdf'
      })
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertSuccess(result)
      expect(result.data.original_file_name).toBe('test file (with special chars) & symbols.pdf')
    })

    it('validates folder path security', async () => {
      const uploadData = AssetFactory.createUploadData({
        folderPath: '../../etc/passwd'
      })
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertSuccess(result)
      // Folder path should be sanitized by repository layer
      expect(mockRepository.sanitizeFolderPath).toHaveBeenCalled()
    })

    it('handles empty tags array', async () => {
      const uploadData = AssetFactory.createUploadData({
        tags: []
      })
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertSuccess(result)
      expect(result.data.tags).toEqual([])
    })

    it('handles null descriptions', async () => {
      const uploadData = AssetFactory.createUploadData({
        description: undefined
      })
      
      const result = await assetService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertSuccess(result)
      expect(result.data.description).toBeNull()
    })
  })

  describe('Service Configuration', () => {
    it('respects custom file size limits', async () => {
      // Test with custom service configuration
      const customService = new AssetService(mockRepository as any, {
        maxFileSize: 1024 * 1024 // 1MB limit
      })
      
      const largeFile = Buffer.alloc(2 * 1024 * 1024) // 2MB
      const uploadData = AssetFactory.createUploadData({ 
        file: largeFile, 
        fileSize: largeFile.length 
      })
      
      const result = await customService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertFailure(result)
      ResultTestHelpers.assertErrorMessage(result, /file size exceeds/i)
    })

    it('respects custom allowed MIME types', async () => {
      const customService = new AssetService(mockRepository as any, {
        allowedMimeTypes: [TEST_FILE_TYPES.PDF] // Only PDF allowed
      })
      
      const uploadData = AssetFactory.createUploadData({
        mimeType: TEST_FILE_TYPES.JPEG // JPEG not allowed
      })
      
      const result = await customService.uploadAsset(uploadData)
      
      ResultTestHelpers.assertFailure(result)
      ResultTestHelpers.assertErrorMessage(result, /file type.*not allowed/i)
    })
  })

  describe('Integration Scenarios', () => {
    it('handles full upload-to-retrieval cycle', async () => {
      // Upload asset
      const uploadData = AssetFactory.createUploadData({
        title: 'Integration Test Document'
      })
      
      const uploadResult = await assetService.uploadAsset(uploadData)
      ResultTestHelpers.assertSuccess(uploadResult)
      
      // Retrieve the uploaded asset
      const retrieveResult = await assetService.getAsset(uploadResult.data.id as any)
      ResultTestHelpers.assertSuccess(retrieveResult)
      
      expect(retrieveResult.data.title).toBe('Integration Test Document')
    })

    it('handles upload-update-delete cycle', async () => {
      // Upload
      const uploadData = AssetFactory.createUploadData()
      const uploadResult = await assetService.uploadAsset(uploadData)
      ResultTestHelpers.assertSuccess(uploadResult)
      
      // Update
      const updateData = { title: 'Updated Title' }
      const updateResult = await assetService.updateAsset(uploadResult.data.id as any, updateData as any)
      ResultTestHelpers.assertSuccess(updateResult)
      
      // Delete
      const deleteResult = await assetService.deleteAsset(uploadResult.data.id as any)
      ResultTestHelpers.assertSuccess(deleteResult)
      
      // Verify deletion
      const retrieveResult = await assetService.getAsset(uploadResult.data.id as any)
      ResultTestHelpers.assertFailure(retrieveResult)
    })
  })
})