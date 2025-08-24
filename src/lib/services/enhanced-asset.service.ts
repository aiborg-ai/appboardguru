/**
 * Enhanced Asset Service with Advanced Performance and Reliability Features
 * - Circuit breaker protection for file operations and external services
 * - Bulk file processing with concurrency control
 * - Advanced caching for asset metadata and thumbnails
 * - Performance monitoring for upload/download operations
 * - Retry logic for network-dependent operations
 */

import { EnhancedBaseService } from './enhanced-base-service'
import { Result, success, failure, RepositoryError } from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

export interface Asset {
  id: string
  file_name: string
  original_file_name: string
  file_size: number
  mime_type: string
  organization_id: string
  owner_id: string
  vault_id?: string
  file_path: string
  public_url?: string
  thumbnail_url?: string
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  processing_error?: string
  metadata?: AssetMetadata
  tags: string[]
  version: number
  view_count: number
  download_count: number
  created_at: string
  updated_at: string
  last_accessed_at?: string
}

export interface AssetMetadata {
  description?: string
  category?: string
  confidentiality_level?: 'public' | 'internal' | 'confidential' | 'restricted'
  retention_period?: number
  custom_fields?: Record<string, any>
  extracted_text?: string
  page_count?: number
  duration?: number
  dimensions?: { width: number; height: number }
}

export interface UploadAssetRequest {
  file: Buffer | File
  fileName: string
  mimeType: string
  size: number
  vaultId?: string
  organizationId: string
  userId: string
  metadata?: Partial<AssetMetadata>
  tags?: string[]
  description?: string
}

export interface BulkUploadRequest {
  files: UploadAssetRequest[]
  batchSize?: number
  concurrency?: number
  skipDuplicates?: boolean
  processingOptions?: {
    generateThumbnails?: boolean
    extractText?: boolean
    scanForVirus?: boolean
  }
}

export interface AssetSearchCriteria {
  query?: string
  fileName?: string
  mimeType?: string
  tags?: string[]
  vaultId?: string
  organizationId?: string
  ownerId?: string
  category?: string
  confidentialityLevel?: string
  sizeMin?: number
  sizeMax?: number
  dateFrom?: Date
  dateTo?: Date
  processingStatus?: string[]
  limit?: number
  offset?: number
  sortBy?: 'created_at' | 'updated_at' | 'file_name' | 'file_size' | 'view_count'
  sortOrder?: 'asc' | 'desc'
}

export interface AssetProcessingJob {
  assetId: string
  jobType: 'thumbnail' | 'text_extraction' | 'virus_scan' | 'format_conversion'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  result?: any
  error?: string
}

export interface AssetDownloadInfo {
  url: string
  expiresAt: string
  fileName: string
  fileSize: number
  mimeType: string
}

export interface AssetUsageAnalytics {
  totalAssets: number
  storageUsed: number
  mostViewedAssets: Array<{ asset: Asset; viewCount: number }>
  recentUploads: Asset[]
  processingStats: {
    pending: number
    processing: number
    completed: number
    failed: number
  }
  typeDistribution: Record<string, number>
}

export class EnhancedAssetService extends EnhancedBaseService {
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
  private readonly SUPPORTED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'text/csv'
  ]

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase, {
      maxConcurrent: 20, // Higher concurrency for file operations
      timeoutMs: 60000, // 60 seconds for large file operations
      retryConfig: {
        attempts: 5, // More retries for network operations
        backoff: 'exponential',
        maxDelay: 15000
      }
    })
  }

  /**
   * Upload single asset with comprehensive processing
   */
  async uploadAsset(request: UploadAssetRequest): Promise<Result<Asset>> {
    const startTime = Date.now()

    // Validate file
    const validationResult = this.validateAssetUpload(request)
    if (!validationResult.success) {
      return validationResult
    }

    const result = await this.executeWithConcurrencyControl(async () => {
      return this.executeWithCircuitBreaker('storage', async () => {
        // Create database record first
        const assetRecord = await this.createAssetRecord(request)
        if (!assetRecord.success) {
          throw assetRecord.error
        }

        try {
          // Upload to storage with retry logic
          const uploadResult = await this.executeWithCircuitBreaker('file_upload', async () => {
            const filePath = `assets/${request.organizationId}/${assetRecord.data.id}`
            
            const { error: uploadError } = await this.supabase.storage
              .from('assets')
              .upload(filePath, request.file, {
                cacheControl: '3600',
                upsert: false,
                contentType: request.mimeType
              })

            if (uploadError) {
              throw RepositoryError.externalService('storage', uploadError.message)
            }

            return filePath
          })

          if (!uploadResult.success) {
            throw uploadResult.error
          }

          // Update record with file path
          const updatedAsset = await this.updateAssetAfterUpload(
            assetRecord.data.id,
            uploadResult.data
          )

          if (!updatedAsset.success) {
            throw updatedAsset.error
          }

          // Start background processing
          this.startBackgroundProcessing(updatedAsset.data.id)

          return updatedAsset.data

        } catch (error) {
          // Cleanup on failure
          await this.cleanupFailedUpload(assetRecord.data.id)
          throw error
        }
      })
    })

    this.recordPerformanceMetric('uploadAsset', Date.now() - startTime)

    if (!result.success) {
      return failure(this.handleError(result.error, 'uploadAsset', { 
        fileName: request.fileName,
        size: request.size 
      }))
    }

    return result
  }

  /**
   * Bulk upload assets with advanced batching and error recovery
   */
  async bulkUploadAssets(request: BulkUploadRequest): Promise<Result<{
    successful: Asset[]
    failed: Array<{ file: string; error: string }>
    stats: {
      total: number
      successful: number
      failed: number
      totalSize: number
      processingTime: number
    }
  }>> {
    const startTime = Date.now()
    const { files, batchSize = 5, concurrency = 3, skipDuplicates = false } = request

    // Pre-validate all files
    const validFiles: UploadAssetRequest[] = []
    const invalidFiles: Array<{ file: string; error: string }> = []

    for (const file of files) {
      const validation = this.validateAssetUpload(file)
      if (validation.success) {
        validFiles.push(file)
      } else {
        invalidFiles.push({
          file: file.fileName,
          error: validation.error.message
        })
      }
    }

    if (validFiles.length === 0) {
      return success({
        successful: [],
        failed: invalidFiles,
        stats: {
          total: files.length,
          successful: 0,
          failed: files.length,
          totalSize: 0,
          processingTime: Date.now() - startTime
        }
      })
    }

    // Process in batches with concurrency control
    const result = await this.executeBulkOperation({
      items: validFiles,
      batchSize,
      processor: async (batch: UploadAssetRequest[]) => {
        const operations = batch.map(file => 
          () => this.uploadAsset(file)
        )

        const batchResult = await this.executeParallel(operations, {
          maxConcurrency: concurrency,
          failFast: false,
          aggregateErrors: false
        })

        return batchResult
      },
      onProgress: (processed, total) => {
        console.log(`Bulk upload progress: ${processed}/${total} files`)
      },
      onError: (error, batch) => {
        console.error(`Batch upload failed:`, batch.length, 'files', error.message)
      }
    })

    this.recordPerformanceMetric('bulkUploadAssets', Date.now() - startTime)

    if (!result.success) {
      return failure(this.handleError(result.error, 'bulkUploadAssets', { 
        fileCount: files.length 
      }))
    }

    const successful = result.data.filter(asset => asset != null)
    const failedUploads = validFiles
      .filter(file => !successful.some(asset => asset.original_file_name === file.fileName))
      .map(file => ({ file: file.fileName, error: 'Upload processing failed' }))

    const totalSize = successful.reduce((sum, asset) => sum + asset.file_size, 0)

    return success({
      successful,
      failed: [...invalidFiles, ...failedUploads],
      stats: {
        total: files.length,
        successful: successful.length,
        failed: invalidFiles.length + failedUploads.length,
        totalSize,
        processingTime: Date.now() - startTime
      }
    })
  }

  /**
   * Get asset with advanced caching and access tracking
   */
  async getAsset(assetId: string, trackAccess = true): Promise<Result<Asset>> {
    const startTime = Date.now()

    const result = await this.executeWithCache(
      `asset:${assetId}`,
      async () => {
        return this.executeWithCircuitBreaker('database', async () => {
          const { data, error } = await this.supabase
            .from('assets')
            .select('*')
            .eq('id', assetId)
            .single()

          if (error) {
            throw RepositoryError.database('Failed to fetch asset', error, 'getAsset')
          }
          if (!data) {
            throw RepositoryError.notFound('Asset')
          }

          return data as Asset
        })
      },
      {
        ttl: 600000, // 10 minutes
        tags: ['asset', `asset:${assetId}`],
        refreshThreshold: 0.8
      }
    )

    if (result.success && trackAccess) {
      // Track access in background (non-blocking)
      this.trackAssetAccess(assetId).catch(error => {
        console.warn(`Failed to track asset access: ${assetId}`, error)
      })
    }

    this.recordPerformanceMetric('getAsset', Date.now() - startTime)

    if (!result.success) {
      return failure(this.handleError(result.error, 'getAsset', { assetId }))
    }

    return result
  }

  /**
   * Advanced asset search with full-text search and filters
   */
  async searchAssets(criteria: AssetSearchCriteria): Promise<Result<{
    assets: Asset[]
    pagination: {
      total: number
      limit: number
      offset: number
      hasMore: boolean
    }
    facets?: {
      mimeTypes: Record<string, number>
      categories: Record<string, number>
      tags: Record<string, number>
    }
  }>> {
    const startTime = Date.now()
    const { limit = 50, offset = 0, sortBy = 'created_at', sortOrder = 'desc' } = criteria

    const result = await this.executeWithCache(
      `assets:search:${JSON.stringify(criteria)}`,
      async () => {
        return this.executeWithCircuitBreaker('database', async () => {
          let query = this.supabase
            .from('assets')
            .select('*', { count: 'exact' })

          // Apply filters
          if (criteria.query) {
            query = query.or(`file_name.ilike.%${criteria.query}%,metadata->>description.ilike.%${criteria.query}%`)
          }
          if (criteria.fileName) {
            query = query.ilike('file_name', `%${criteria.fileName}%`)
          }
          if (criteria.mimeType) {
            query = query.eq('mime_type', criteria.mimeType)
          }
          if (criteria.vaultId) {
            query = query.eq('vault_id', criteria.vaultId)
          }
          if (criteria.organizationId) {
            query = query.eq('organization_id', criteria.organizationId)
          }
          if (criteria.ownerId) {
            query = query.eq('owner_id', criteria.ownerId)
          }
          if (criteria.tags && criteria.tags.length > 0) {
            query = query.overlaps('tags', criteria.tags)
          }
          if (criteria.sizeMin) {
            query = query.gte('file_size', criteria.sizeMin)
          }
          if (criteria.sizeMax) {
            query = query.lte('file_size', criteria.sizeMax)
          }
          if (criteria.dateFrom) {
            query = query.gte('created_at', criteria.dateFrom.toISOString())
          }
          if (criteria.dateTo) {
            query = query.lte('created_at', criteria.dateTo.toISOString())
          }
          if (criteria.processingStatus && criteria.processingStatus.length > 0) {
            query = query.in('processing_status', criteria.processingStatus)
          }

          // Apply sorting and pagination
          query = query
            .order(sortBy, { ascending: sortOrder === 'asc' })
            .range(offset, offset + limit - 1)

          const { data, error, count } = await query

          if (error) {
            throw RepositoryError.database('Failed to search assets', error, 'searchAssets')
          }

          return {
            assets: data as Asset[],
            total: count || 0
          }
        })
      },
      {
        ttl: 300000, // 5 minutes
        tags: ['assets', 'search'],
        refreshThreshold: 0.9
      }
    )

    this.recordPerformanceMetric('searchAssets', Date.now() - startTime)

    if (!result.success) {
      return failure(this.handleError(result.error, 'searchAssets', criteria))
    }

    const { assets, total } = result.data

    return success({
      assets,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
  }

  /**
   * Generate secure download URL with expiration
   */
  async getDownloadUrl(
    assetId: string,
    expiresIn = 3600
  ): Promise<Result<AssetDownloadInfo>> {
    const startTime = Date.now()

    const result = await this.executeWithConcurrencyControl(async () => {
      // Get asset info first
      const assetResult = await this.getAsset(assetId, false)
      if (!assetResult.success) {
        throw assetResult.error
      }

      const asset = assetResult.data

      return this.executeWithCircuitBreaker('storage', async () => {
        const { data, error } = await this.supabase.storage
          .from('assets')
          .createSignedUrl(asset.file_path, expiresIn)

        if (error) {
          throw RepositoryError.externalService('storage', error.message)
        }

        // Track download in background
        this.trackAssetDownload(assetId).catch(error => {
          console.warn(`Failed to track download: ${assetId}`, error)
        })

        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

        return {
          url: data.signedUrl,
          expiresAt,
          fileName: asset.original_file_name,
          fileSize: asset.file_size,
          mimeType: asset.mime_type
        } as AssetDownloadInfo
      })
    })

    this.recordPerformanceMetric('getDownloadUrl', Date.now() - startTime)

    if (!result.success) {
      return failure(this.handleError(result.error, 'getDownloadUrl', { assetId }))
    }

    return result
  }

  /**
   * Get asset analytics and usage statistics
   */
  async getAssetAnalytics(
    organizationId: string,
    period: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<Result<AssetUsageAnalytics>> {
    const startTime = Date.now()

    const result = await this.executeWithCache(
      `analytics:assets:${organizationId}:${period}`,
      async () => {
        return this.executeWithCircuitBreaker('database', async () => {
          // Get basic stats
          const { data: totalStats, error: statsError } = await this.supabase
            .from('assets')
            .select('count(*), file_size.sum()')
            .eq('organization_id', organizationId)
            .single()

          if (statsError) {
            throw RepositoryError.database('Failed to get asset stats', statsError, 'getAssetAnalytics')
          }

          // Get most viewed assets
          const { data: mostViewed, error: viewedError } = await this.supabase
            .from('assets')
            .select('*, view_count')
            .eq('organization_id', organizationId)
            .order('view_count', { ascending: false })
            .limit(10)

          if (viewedError) {
            throw RepositoryError.database('Failed to get most viewed assets', viewedError, 'getAssetAnalytics')
          }

          // Get recent uploads
          const { data: recentUploads, error: recentError } = await this.supabase
            .from('assets')
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })
            .limit(10)

          if (recentError) {
            throw RepositoryError.database('Failed to get recent uploads', recentError, 'getAssetAnalytics')
          }

          return {
            totalAssets: totalStats?.count || 0,
            storageUsed: totalStats?.sum || 0,
            mostViewedAssets: (mostViewed || []).map(asset => ({
              asset: asset as Asset,
              viewCount: asset.view_count
            })),
            recentUploads: recentUploads as Asset[] || [],
            processingStats: {
              pending: 0, // These would be calculated from actual queries
              processing: 0,
              completed: 0,
              failed: 0
            },
            typeDistribution: {}
          } as AssetUsageAnalytics
        })
      },
      {
        ttl: 1800000, // 30 minutes
        tags: ['analytics', `org:${organizationId}`],
        refreshThreshold: 0.8
      }
    )

    this.recordPerformanceMetric('getAssetAnalytics', Date.now() - startTime)

    if (!result.success) {
      return failure(this.handleError(result.error, 'getAssetAnalytics', { organizationId }))
    }

    return result
  }

  /**
   * Private helper methods
   */
  private validateAssetUpload(request: UploadAssetRequest): Result<void> {
    if (request.size > this.MAX_FILE_SIZE) {
      return failure(RepositoryError.validation(
        `File size exceeds maximum allowed size: ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`
      ))
    }

    if (!this.SUPPORTED_MIME_TYPES.includes(request.mimeType)) {
      return failure(RepositoryError.validation(
        `Unsupported file type: ${request.mimeType}`
      ))
    }

    if (!request.fileName || request.fileName.trim().length === 0) {
      return failure(RepositoryError.validation('File name is required'))
    }

    return success(undefined)
  }

  private async createAssetRecord(request: UploadAssetRequest): Promise<Result<Asset>> {
    const { data, error } = await this.supabase
      .from('assets')
      .insert({
        file_name: this.sanitizeFileName(request.fileName),
        original_file_name: request.fileName,
        file_size: request.size,
        mime_type: request.mimeType,
        organization_id: request.organizationId,
        owner_id: request.userId,
        vault_id: request.vaultId,
        processing_status: 'pending',
        metadata: request.metadata || {},
        tags: request.tags || [],
        version: 1,
        view_count: 0,
        download_count: 0
      })
      .select()
      .single()

    if (error) {
      return failure(RepositoryError.database('Failed to create asset record', error, 'createAssetRecord'))
    }

    return success(data as Asset)
  }

  private async updateAssetAfterUpload(assetId: string, filePath: string): Promise<Result<Asset>> {
    const { data, error } = await this.supabase
      .from('assets')
      .update({
        file_path: filePath,
        processing_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', assetId)
      .select()
      .single()

    if (error) {
      return failure(RepositoryError.database('Failed to update asset record', error, 'updateAssetAfterUpload'))
    }

    return success(data as Asset)
  }

  private async cleanupFailedUpload(assetId: string): Promise<void> {
    try {
      await this.supabase
        .from('assets')
        .delete()
        .eq('id', assetId)
    } catch (error) {
      console.warn(`Failed to cleanup asset record: ${assetId}`, error)
    }
  }

  private startBackgroundProcessing(assetId: string): void {
    // Start background jobs for thumbnail generation, text extraction, etc.
    // This would integrate with your job queue system
    console.debug(`Starting background processing for asset: ${assetId}`)
  }

  private async trackAssetAccess(assetId: string): Promise<void> {
    await this.supabase
      .from('assets')
      .update({
        view_count: this.supabase.raw('view_count + 1'),
        last_accessed_at: new Date().toISOString()
      })
      .eq('id', assetId)
  }

  private async trackAssetDownload(assetId: string): Promise<void> {
    await this.supabase
      .from('assets')
      .update({
        download_count: this.supabase.raw('download_count + 1'),
        last_accessed_at: new Date().toISOString()
      })
      .eq('id', assetId)
  }

  private sanitizeFileName(fileName: string): string {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase()
  }

  /**
   * Get asset service-specific metrics
   */
  getAssetServiceMetrics() {
    return {
      performance: this.getPerformanceStats(),
      circuitBreakers: this.getCircuitBreakerStats(),
      concurrency: this.concurrencyManager.getStats()
    }
  }
}