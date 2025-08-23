/**
 * Asset Repository Mock Implementation
 * Following CLAUDE.md DDD patterns with Result pattern integration
 * Provides comprehensive mocking for all repository operations
 */

import { jest } from '@jest/globals'
import { Result, Ok, Err } from '@/lib/repositories/result'
import { 
  AssetRepository, 
  AssetWithDetails, 
  AssetUploadData,
  StorageUploadResult 
} from '@/lib/repositories/asset.repository.enhanced'
import { AssetFactory, AssetResultFactory } from '../factories/asset.factory'
import { AssetId, UserId, OrganizationId, VaultId } from '@/types/branded'

export class MockAssetRepository {
  // In-memory storage for testing
  private assets: Map<string, AssetWithDetails> = new Map()
  private uploadResults: Map<string, StorageUploadResult> = new Map()
  
  // Mock method implementations
  uploadFileToStorage = jest.fn<(data: AssetUploadData) => Promise<Result<StorageUploadResult>>>()
  createAssetRecord = jest.fn<(data: AssetUploadData, storageResult: StorageUploadResult) => Promise<Result<AssetWithDetails>>>()
  getAssetById = jest.fn<(id: AssetId) => Promise<Result<AssetWithDetails>>>()
  getAssetsByOrganization = jest.fn<(orgId: OrganizationId) => Promise<Result<AssetWithDetails[]>>>()
  getAssetsByVault = jest.fn<(vaultId: VaultId) => Promise<Result<AssetWithDetails[]>>>()
  getAssetsByUser = jest.fn<(userId: UserId) => Promise<Result<AssetWithDetails[]>>>()
  updateAsset = jest.fn<(id: AssetId, updates: Partial<AssetWithDetails>) => Promise<Result<AssetWithDetails>>>()
  deleteAsset = jest.fn<(id: AssetId) => Promise<Result<void>>>()
  deleteFileFromStorage = jest.fn<(filePath: string) => Promise<Result<void>>>()
  validateOrganizationAccess = jest.fn<(orgId: OrganizationId, userId: UserId) => Promise<Result<boolean>>>()
  sanitizeFolderPath = jest.fn<(path: string) => string>()

  constructor() {
    this.setupDefaultBehaviors()
  }

  private setupDefaultBehaviors() {
    // Default successful behaviors
    this.uploadFileToStorage.mockImplementation(async (data: AssetUploadData) => {
      const storageResult: StorageUploadResult = {
        filePath: `uploads/${data.organizationId}/${data.fileName}`,
        fileName: data.fileName,
        publicUrl: `https://storage.example.com/uploads/${data.organizationId}/${data.fileName}`,
        metadata: {
          size: data.fileSize,
          contentType: data.mimeType,
          originalName: data.originalFileName
        }
      }
      
      this.uploadResults.set(data.fileName, storageResult)
      return AssetResultFactory.createSuccessResult(storageResult)
    })

    this.createAssetRecord.mockImplementation(async (data: AssetUploadData, storageResult: StorageUploadResult) => {
      const asset = AssetFactory.createWithDetails({
        title: data.title,
        description: data.description,
        file_name: data.fileName,
        original_file_name: data.originalFileName,
        file_path: storageResult.filePath,
        file_size: data.fileSize,
        mime_type: data.mimeType,
        category: data.category,
        folder_path: data.folderPath,
        tags: data.tags,
        uploaded_by: data.uploadedBy as string,
        organization_id: data.organizationId as string,
        vault_id: data.vaultId as string || null,
        public_url: storageResult.publicUrl
      })

      this.assets.set(asset.id, asset)
      return AssetResultFactory.createSuccessResult(asset)
    })

    this.getAssetById.mockImplementation(async (id: AssetId) => {
      const asset = this.assets.get(id as string)
      if (!asset) {
        return AssetResultFactory.createErrorResult('Asset not found', 'ASSET_NOT_FOUND')
      }
      return AssetResultFactory.createSuccessResult(asset)
    })

    this.getAssetsByOrganization.mockImplementation(async (orgId: OrganizationId) => {
      const assets = Array.from(this.assets.values())
        .filter(asset => asset.organization_id === orgId)
      return AssetResultFactory.createSuccessResult(assets)
    })

    this.getAssetsByVault.mockImplementation(async (vaultId: VaultId) => {
      const assets = Array.from(this.assets.values())
        .filter(asset => asset.vault_id === vaultId)
      return AssetResultFactory.createSuccessResult(assets)
    })

    this.getAssetsByUser.mockImplementation(async (userId: UserId) => {
      const assets = Array.from(this.assets.values())
        .filter(asset => asset.uploaded_by === userId)
      return AssetResultFactory.createSuccessResult(assets)
    })

    this.updateAsset.mockImplementation(async (id: AssetId, updates: Partial<AssetWithDetails>) => {
      const asset = this.assets.get(id as string)
      if (!asset) {
        return AssetResultFactory.createErrorResult('Asset not found', 'ASSET_NOT_FOUND')
      }
      
      const updatedAsset = { ...asset, ...updates, updated_at: new Date().toISOString() }
      this.assets.set(id as string, updatedAsset)
      return AssetResultFactory.createSuccessResult(updatedAsset)
    })

    this.deleteAsset.mockImplementation(async (id: AssetId) => {
      const asset = this.assets.get(id as string)
      if (!asset) {
        return AssetResultFactory.createErrorResult('Asset not found', 'ASSET_NOT_FOUND')
      }
      
      this.assets.delete(id as string)
      return AssetResultFactory.createSuccessResult(undefined as void)
    })

    this.deleteFileFromStorage.mockImplementation(async (filePath: string) => {
      // Simulate storage deletion
      return AssetResultFactory.createSuccessResult(undefined as void)
    })

    this.validateOrganizationAccess.mockImplementation(async (orgId: OrganizationId, userId: UserId) => {
      // Default to allowing access for tests
      return AssetResultFactory.createSuccessResult(true)
    })

    this.sanitizeFolderPath.mockImplementation((path: string) => {
      return path.replace(/[^a-zA-Z0-9\-_\/]/g, '_').replace(/\/+/g, '/')
    })
  }

  // Test utility methods
  seedWithAssets(assets: AssetWithDetails[]) {
    assets.forEach(asset => this.assets.set(asset.id, asset))
  }

  clearAssets() {
    this.assets.clear()
    this.uploadResults.clear()
  }

  getStoredAssets() {
    return Array.from(this.assets.values())
  }

  getUploadResults() {
    return Array.from(this.uploadResults.values())
  }

  // Error scenario setups
  setupUploadFailure(error: string = 'Storage upload failed') {
    this.uploadFileToStorage.mockImplementation(async () => {
      return AssetResultFactory.createRepositoryError(error, 'STORAGE_UPLOAD_FAILED')
    })
  }

  setupDatabaseFailure(error: string = 'Database operation failed') {
    this.createAssetRecord.mockImplementation(async () => {
      return AssetResultFactory.createRepositoryError(error, 'DATABASE_ERROR')
    })
  }

  setupAccessDenied() {
    this.validateOrganizationAccess.mockImplementation(async () => {
      return AssetResultFactory.createRepositoryError('Access denied', 'ORGANIZATION_ACCESS_DENIED')
    })
  }

  setupNetworkTimeout() {
    this.uploadFileToStorage.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100)) // Simulate delay
      return AssetResultFactory.createRepositoryError('Network timeout', 'NETWORK_TIMEOUT')
    })
  }

  setupPartialFailure() {
    let callCount = 0
    this.uploadFileToStorage.mockImplementation(async (data: AssetUploadData) => {
      callCount++
      if (callCount <= 2) {
        // First 2 calls fail
        return AssetResultFactory.createRepositoryError('Temporary failure', 'TEMPORARY_FAILURE')
      }
      // 3rd call succeeds
      return this.uploadFileToStorage.getMockImplementation()!(data)
    })
  }

  // Verification helpers
  verifyUploadCalled(times: number = 1) {
    expect(this.uploadFileToStorage).toHaveBeenCalledTimes(times)
  }

  verifyAssetCreated(title: string) {
    const assets = this.getStoredAssets()
    expect(assets.some(asset => asset.title === title)).toBeTruthy()
  }

  verifyAssetNotCreated() {
    expect(this.getStoredAssets()).toHaveLength(0)
  }

  verifyCleanupCalled() {
    expect(this.deleteFileFromStorage).toHaveBeenCalled()
  }

  getLastUploadCall() {
    const calls = this.uploadFileToStorage.mock.calls
    return calls[calls.length - 1]?.[0]
  }
}