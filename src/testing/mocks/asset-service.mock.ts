/**
 * Asset Service Mock Implementation
 * Following CLAUDE.md DDD patterns with comprehensive service layer mocking
 */

import { jest } from '@jest/globals'
import { Result } from '@/lib/repositories/result'
import { AssetService, IAssetService, UploadAssetData } from '@/lib/services/asset.service'
import { AssetWithDetails, AssetUploadData } from '@/lib/repositories/asset.repository.enhanced'
import { AssetFactory, AssetResultFactory } from '../factories/asset.factory'
import { AssetId, UserId, OrganizationId, VaultId } from '@/types/branded'

export class MockAssetService implements IAssetService {
  // Mock method implementations
  uploadAsset = jest.fn<(data: AssetUploadData) => Promise<Result<AssetWithDetails>>>()
  getAsset = jest.fn<(assetId: AssetId) => Promise<Result<any>>>()
  updateAsset = jest.fn<(assetId: AssetId, data: any) => Promise<Result<any>>>()
  deleteAsset = jest.fn<(assetId: AssetId) => Promise<Result<void>>>()
  getAssetVersions = jest.fn<(assetId: AssetId) => Promise<Result<any[]>>>()
  downloadAsset = jest.fn<(assetId: AssetId, versionId?: string) => Promise<Result<any>>>()
  searchAssets = jest.fn<(criteria: any) => Promise<Result<any[]>>>()
  processDocument = jest.fn<(assetId: AssetId) => Promise<Result<any>>>()

  // Additional service methods for comprehensive testing
  validateUploadData = jest.fn<(data: AssetUploadData) => Result<boolean>>()
  scanForViruses = jest.fn<(file: Buffer) => Promise<{ clean: boolean; threats?: string[] }>>()
  getAllowedMimeTypes = jest.fn<() => string[]>()
  formatFileSize = jest.fn<(bytes: number) => string>()
  logAssetActivity = jest.fn<(userId: UserId, orgId: OrganizationId, action: string, assetId: string, details?: string) => Promise<void>>()
  generateThumbnail = jest.fn<(assetId: AssetId) => Promise<Result<string>>>()
  extractMetadata = jest.fn<(file: Buffer, mimeType: string) => Promise<any>>()

  // Test tracking
  private uploadedAssets: AssetWithDetails[] = []
  private callHistory: { method: string; args: any[]; timestamp: number }[] = []

  constructor() {
    this.setupDefaultBehaviors()
  }

  private setupDefaultBehaviors() {
    // Successful upload flow
    this.uploadAsset.mockImplementation(async (data: AssetUploadData) => {
      this.trackCall('uploadAsset', [data])
      
      // Simulate validation
      const validation = this.validateUploadData(data)
      if (!validation.success) {
        return validation as Result<AssetWithDetails>
      }

      // Simulate virus scan
      const virusScan = await this.scanForViruses(data.file)
      if (!virusScan.clean) {
        return AssetResultFactory.createErrorResult('File failed security scan')
      }

      // Create successful result
      const asset = AssetFactory.createWithDetails({
        title: data.title,
        description: data.description,
        file_name: data.fileName,
        original_file_name: data.originalFileName,
        file_size: data.fileSize,
        mime_type: data.mimeType,
        category: data.category,
        folder_path: data.folderPath,
        tags: data.tags,
        uploaded_by: data.uploadedBy as string,
        organization_id: data.organizationId as string,
        vault_id: data.vaultId as string || null
      })

      this.uploadedAssets.push(asset)
      
      // Simulate async operations
      setTimeout(() => {
        this.logAssetActivity(data.uploadedBy, data.organizationId, 'uploaded', asset.id, data.title)
        this.generateThumbnail(asset.id as AssetId)
      }, 0)

      return AssetResultFactory.createSuccessResult(asset)
    })

    this.validateUploadData.mockImplementation((data: AssetUploadData) => {
      // Basic validation logic
      if (!data.title?.trim()) {
        return AssetResultFactory.createErrorResult('Title is required')
      }
      if (!data.file || data.fileSize === 0) {
        return AssetResultFactory.createErrorResult('File is required')
      }
      if (data.fileSize > 50 * 1024 * 1024) {
        return AssetResultFactory.createErrorResult('File too large')
      }
      
      const allowedTypes = this.getAllowedMimeTypes()
      if (!allowedTypes.includes(data.mimeType)) {
        return AssetResultFactory.createErrorResult('Invalid file type')
      }

      return AssetResultFactory.createSuccessResult(true)
    })

    this.scanForViruses.mockImplementation(async (file: Buffer) => {
      // Simulate virus scanning delay
      await new Promise(resolve => setTimeout(resolve, 10))
      
      // Check for test malware patterns
      const content = file.toString('utf8', 0, Math.min(1000, file.length))
      const threats = []
      
      if (content.includes('MALWARE_SIGNATURE')) threats.push('Test.Malware.Signature')
      if (content.includes('VIRUS_TEST')) threats.push('Test.Virus.Generic')
      
      return { clean: threats.length === 0, threats: threats.length > 0 ? threats : undefined }
    })

    this.getAllowedMimeTypes.mockReturnValue([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'text/plain'
    ])

    this.formatFileSize.mockImplementation((bytes: number) => {
      const units = ['B', 'KB', 'MB', 'GB']
      let size = bytes
      let unitIndex = 0
      
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024
        unitIndex++
      }
      
      return `${size.toFixed(1)} ${units[unitIndex]}`
    })

    this.getAsset.mockImplementation(async (assetId: AssetId) => {
      this.trackCall('getAsset', [assetId])
      const asset = this.uploadedAssets.find(a => a.id === assetId)
      if (!asset) {
        return AssetResultFactory.createErrorResult('Asset not found')
      }
      return AssetResultFactory.createSuccessResult(asset)
    })

    this.logAssetActivity.mockImplementation(async (userId, orgId, action, assetId, details) => {
      this.trackCall('logAssetActivity', [userId, orgId, action, assetId, details])
      // Simulate logging delay
      await new Promise(resolve => setTimeout(resolve, 5))
    })

    this.generateThumbnail.mockImplementation(async (assetId: AssetId) => {
      this.trackCall('generateThumbnail', [assetId])
      // Simulate thumbnail generation
      await new Promise(resolve => setTimeout(resolve, 100))
      const thumbnailUrl = `https://thumbnails.example.com/${assetId}.jpg`
      return AssetResultFactory.createSuccessResult(thumbnailUrl)
    })

    this.extractMetadata.mockImplementation(async (file: Buffer, mimeType: string) => {
      this.trackCall('extractMetadata', [file, mimeType])
      
      const metadata: any = {
        size: file.length,
        checksum: 'mock_checksum_' + Math.random().toString(36),
        extracted_at: new Date().toISOString()
      }

      if (mimeType === 'application/pdf') {
        metadata.page_count = Math.floor(Math.random() * 50) + 1
        metadata.has_text = true
        metadata.has_images = Math.random() > 0.5
      }

      if (mimeType.startsWith('image/')) {
        metadata.width = 1920
        metadata.height = 1080
        metadata.color_space = 'RGB'
      }

      return metadata
    })
  }

  private trackCall(method: string, args: any[]) {
    this.callHistory.push({
      method,
      args,
      timestamp: Date.now()
    })
  }

  // Error scenario setups
  setupValidationFailure(field: keyof AssetUploadData, error: string) {
    this.validateUploadData.mockImplementation((data) => {
      if (!data[field] || (typeof data[field] === 'string' && !(data[field] as string).trim())) {
        return AssetResultFactory.createErrorResult(error)
      }
      return AssetResultFactory.createSuccessResult(true)
    })
  }

  setupVirusDetection(virusName: string = 'Test.Malware') {
    this.scanForViruses.mockImplementation(async () => ({
      clean: false,
      threats: [virusName]
    }))
  }

  setupProcessingFailure(error: string = 'Processing failed') {
    this.uploadAsset.mockImplementation(async () => {
      return AssetResultFactory.createErrorResult(error)
    })
  }

  setupSlowProcessing(delay: number = 5000) {
    this.uploadAsset.mockImplementation(async (data) => {
      await new Promise(resolve => setTimeout(resolve, delay))
      return AssetResultFactory.createSuccessResult(AssetFactory.createWithDetails())
    })
  }

  setupPartialSuccess() {
    let attempts = 0
    this.uploadAsset.mockImplementation(async (data) => {
      attempts++
      if (attempts === 1) {
        return AssetResultFactory.createErrorResult('Network timeout')
      }
      if (attempts === 2) {
        return AssetResultFactory.createErrorResult('Storage full')
      }
      // Third attempt succeeds
      return AssetResultFactory.createSuccessResult(AssetFactory.createWithDetails())
    })
  }

  setupThumbnailFailure() {
    this.generateThumbnail.mockImplementation(async () => {
      return AssetResultFactory.createErrorResult('Thumbnail generation failed')
    })
  }

  // Test utilities
  clearUploads() {
    this.uploadedAssets = []
    this.callHistory = []
  }

  getUploadedAssets(): AssetWithDetails[] {
    return [...this.uploadedAssets]
  }

  getCallHistory(): { method: string; args: any[]; timestamp: number }[] {
    return [...this.callHistory]
  }

  getCallsForMethod(method: string) {
    return this.callHistory.filter(call => call.method === method)
  }

  wasMethodCalled(method: string, times?: number): boolean {
    const calls = this.getCallsForMethod(method)
    return times ? calls.length === times : calls.length > 0
  }

  getLastCallArgs(method: string): any[] | undefined {
    const calls = this.getCallsForMethod(method)
    return calls[calls.length - 1]?.args
  }

  // Verification helpers
  verifyUploadFlow(uploadData: AssetUploadData) {
    expect(this.validateUploadData).toHaveBeenCalledWith(uploadData)
    expect(this.scanForViruses).toHaveBeenCalledWith(uploadData.file)
    expect(this.uploadAsset).toHaveBeenCalledWith(uploadData)
  }

  verifyAssetCreated(title: string): boolean {
    return this.uploadedAssets.some(asset => asset.title === title)
  }

  verifyThumbnailGenerated(assetId: string): boolean {
    return this.wasMethodCalled('generateThumbnail') &&
           this.getCallsForMethod('generateThumbnail').some(call => call.args[0] === assetId)
  }

  verifyActivityLogged(action: string, assetId: string): boolean {
    return this.getCallsForMethod('logAssetActivity').some(call => 
      call.args[2] === action && call.args[3] === assetId
    )
  }
}