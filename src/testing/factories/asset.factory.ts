/**
 * Asset Test Factory
 * Creates test data following DDD patterns from CLAUDE.md
 * Provides branded types, Result pattern integration, and comprehensive test scenarios
 */

import { faker } from '@faker-js/faker'
import { 
  AssetId, 
  UserId, 
  OrganizationId, 
  VaultId,
  createAssetId,
  createUserId,
  createOrganizationId,
  createVaultId
} from '@/types/branded'
import { Result, Ok, Err } from '@/lib/repositories/result'
import { AssetWithDetails, AssetUploadData } from '@/lib/repositories/asset.repository.enhanced'
import { FileUploadItem, FileCategory } from '@/types/upload'

// Test File Types
export const TEST_FILE_TYPES = {
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  TXT: 'text/plain',
  INVALID: 'application/x-malware'
} as const

export const TEST_CATEGORIES: FileCategory[] = [
  'board-documents',
  'financial',
  'legal',
  'presentations',
  'policies',
  'meeting-materials',
  'compliance',
  'contracts',
  'general'
]

// Base Asset Factory
export class AssetFactory {
  static createId(): AssetId {
    const result = createAssetId(faker.string.uuid())
    if (!result.success) throw new Error('Failed to create test AssetId')
    return result.data
  }

  static createUserId(): UserId {
    const result = createUserId(faker.string.uuid())
    if (!result.success) throw new Error('Failed to create test UserId')
    return result.data
  }

  static createOrganizationId(): OrganizationId {
    const result = createOrganizationId(faker.string.uuid())
    if (!result.success) throw new Error('Failed to create test OrganizationId')
    return result.data
  }

  static createVaultId(): VaultId {
    const result = createVaultId(faker.string.uuid())
    if (!result.success) throw new Error('Failed to create test VaultId')
    return result.data
  }

  // Create basic asset with minimal required fields
  static createMinimal(overrides: Partial<AssetWithDetails> = {}): AssetWithDetails {
    const now = new Date().toISOString()
    
    return {
      id: faker.string.uuid(),
      title: faker.company.buzzPhrase(),
      description: faker.lorem.sentences(2),
      file_name: faker.system.fileName(),
      original_file_name: faker.system.fileName(),
      file_path: `uploads/${faker.string.uuid()}.pdf`,
      file_size: faker.number.int({ min: 1000, max: 50000000 }),
      file_type: 'pdf',
      mime_type: TEST_FILE_TYPES.PDF,
      category: 'general',
      folder_path: '/',
      tags: [],
      uploaded_by: faker.string.uuid(),
      organization_id: faker.string.uuid(),
      vault_id: null,
      thumbnail_url: null,
      public_url: null,
      metadata: {},
      processing_status: 'completed',
      processing_error: null,
      version: 1,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      ...overrides
    }
  }

  // Create comprehensive asset with all related data
  static createWithDetails(overrides: Partial<AssetWithDetails> = {}): AssetWithDetails {
    const baseAsset = this.createMinimal(overrides)
    const userId = faker.string.uuid()
    const orgId = faker.string.uuid()
    const vaultId = faker.string.uuid()

    return {
      ...baseAsset,
      uploaded_by_user: {
        id: userId,
        full_name: faker.person.fullName(),
        email: faker.internet.email(),
        avatar_url: faker.image.avatar()
      },
      organization: {
        id: orgId,
        name: faker.company.name(),
        slug: faker.internet.domainWord()
      },
      vault: {
        id: vaultId,
        name: faker.commerce.productName(),
        organization_id: orgId
      },
      shares: [],
      annotations: [],
      access_analytics: {
        total_views: faker.number.int({ min: 0, max: 1000 }),
        total_downloads: faker.number.int({ min: 0, max: 100 }),
        unique_viewers: faker.number.int({ min: 0, max: 50 }),
        last_accessed: faker.date.recent().toISOString()
      },
      ...overrides
    }
  }

  // Create asset upload data
  static createUploadData(overrides: Partial<AssetUploadData> = {}): AssetUploadData {
    const fileName = faker.system.fileName({ extensionCount: 1 })
    const fileContent = Buffer.from(faker.lorem.paragraphs(10))
    
    return {
      file: fileContent,
      fileName,
      originalFileName: fileName,
      mimeType: TEST_FILE_TYPES.PDF,
      fileSize: fileContent.length,
      title: faker.company.buzzPhrase(),
      description: faker.lorem.sentences(2),
      category: faker.helpers.arrayElement(TEST_CATEGORIES),
      tags: faker.helpers.arrayElements(['important', 'confidential', 'draft', 'final'], { min: 0, max: 3 }),
      organizationId: this.createOrganizationId(),
      vaultId: this.createVaultId(),
      folderPath: faker.helpers.arrayElement(['/', '/board-meetings', '/financial-reports', '/legal-documents']),
      uploadedBy: this.createUserId(),
      ...overrides
    }
  }

  // Create FileUploadItem for frontend testing
  static createFileUploadItem(overrides: Partial<FileUploadItem> = {}): FileUploadItem {
    const fileName = faker.system.fileName({ extensionCount: 1 })
    const fileContent = new Blob([faker.lorem.paragraphs(5)], { type: TEST_FILE_TYPES.PDF })
    const file = new File([fileContent], fileName, { type: TEST_FILE_TYPES.PDF })

    return {
      id: faker.string.uuid(),
      file,
      title: faker.company.buzzPhrase(),
      description: faker.lorem.sentences(2),
      category: faker.helpers.arrayElement(TEST_CATEGORIES),
      folder: faker.helpers.arrayElement(['/', '/board-meetings', '/financial-reports']),
      tags: faker.helpers.arrayElements(['important', 'confidential', 'draft'], { min: 0, max: 2 }),
      status: 'pending',
      progress: 0,
      preview: undefined,
      error: undefined,
      ...overrides
    }
  }

  // Create test files of different types and sizes
  static createTestFile(
    type: keyof typeof TEST_FILE_TYPES = 'PDF', 
    size: 'small' | 'medium' | 'large' | 'xlarge' = 'medium'
  ): File {
    const sizeMap = {
      small: 1024, // 1KB
      medium: 1024 * 1024, // 1MB
      large: 10 * 1024 * 1024, // 10MB
      xlarge: 60 * 1024 * 1024 // 60MB (above limit)
    }

    const extensions = {
      PDF: '.pdf',
      DOCX: '.docx',
      JPEG: '.jpg',
      PNG: '.png',
      TXT: '.txt',
      INVALID: '.exe'
    }

    const targetSize = sizeMap[size]
    const content = new ArrayBuffer(targetSize)
    const fileName = faker.system.fileName() + extensions[type]
    const mimeType = TEST_FILE_TYPES[type]

    return new File([content], fileName, { type: mimeType })
  }

  // Create invalid file for error testing
  static createInvalidFile(): File {
    return this.createTestFile('INVALID', 'small')
  }

  // Create batch of assets for list testing
  static createBatch(count: number, overrides: Partial<AssetWithDetails> = {}): AssetWithDetails[] {
    return Array.from({ length: count }, () => this.createWithDetails(overrides))
  }

  // Create assets with specific statuses for workflow testing
  static createWithStatus(status: 'pending' | 'processing' | 'completed' | 'failed'): AssetWithDetails {
    return this.createWithDetails({
      processing_status: status,
      processing_error: status === 'failed' ? 'Processing failed due to corruption' : null
    })
  }

  // Create assets with different file types for filtering tests
  static createByFileType(fileType: keyof typeof TEST_FILE_TYPES): AssetWithDetails {
    const extensions = { PDF: 'pdf', DOCX: 'docx', JPEG: 'jpg', PNG: 'png', TXT: 'txt', INVALID: 'exe' }
    
    return this.createWithDetails({
      file_type: extensions[fileType],
      mime_type: TEST_FILE_TYPES[fileType],
      file_name: `test.${extensions[fileType]}`,
      original_file_name: `original.${extensions[fileType]}`
    })
  }

  // Create assets with different access levels for permission testing
  static createWithAccessLevel(level: 'private' | 'organization' | 'public'): AssetWithDetails {
    const vault = level === 'private' ? null : {
      id: faker.string.uuid(),
      name: faker.commerce.productName(),
      organization_id: faker.string.uuid()
    }

    return this.createWithDetails({
      vault,
      // Add metadata to indicate access level
      metadata: { access_level: level }
    })
  }

  // Create error scenarios for negative testing
  static createErrorScenarios() {
    return {
      oversizedFile: this.createUploadData({
        fileSize: 100 * 1024 * 1024, // 100MB - over limit
        file: Buffer.alloc(100 * 1024 * 1024)
      }),
      invalidFileType: this.createUploadData({
        mimeType: TEST_FILE_TYPES.INVALID,
        fileName: 'malware.exe'
      }),
      emptyFile: this.createUploadData({
        fileSize: 0,
        file: Buffer.alloc(0)
      }),
      corruptedFile: this.createUploadData({
        file: Buffer.from('corrupted data that is not a valid PDF'),
        mimeType: TEST_FILE_TYPES.PDF
      }),
      missingTitle: this.createUploadData({
        title: ''
      }),
      invalidOrganization: this.createUploadData({
        organizationId: 'invalid-uuid' as any
      })
    }
  }

  // Create performance test datasets
  static createPerformanceDataset() {
    return {
      smallFiles: Array.from({ length: 100 }, () => this.createTestFile('PDF', 'small')),
      mediumFiles: Array.from({ length: 10 }, () => this.createTestFile('PDF', 'medium')),
      largeFiles: Array.from({ length: 3 }, () => this.createTestFile('PDF', 'large')),
      mixedTypes: [
        this.createTestFile('PDF', 'medium'),
        this.createTestFile('DOCX', 'medium'),
        this.createTestFile('JPEG', 'small'),
        this.createTestFile('PNG', 'small'),
        this.createTestFile('TXT', 'small')
      ]
    }
  }
}

// Result pattern test helpers
export class AssetResultFactory {
  static createSuccessResult<T>(data: T): Result<T> {
    return Ok(data)
  }

  static createErrorResult(message: string, code?: string): Result<never> {
    return Err(new Error(message))
  }

  static createRepositoryError(message: string, code: string, metadata?: any): Result<never> {
    const error = new Error(message)
    ;(error as any).code = code
    ;(error as any).metadata = metadata
    return Err(error)
  }
}

// Export test constants
export const TEST_CONSTANTS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_FILES_PER_UPLOAD: 10,
  ALLOWED_MIME_TYPES: Object.values(TEST_FILE_TYPES).filter(t => t !== TEST_FILE_TYPES.INVALID),
  TEST_ORGANIZATION_ID: 'org_123',
  TEST_USER_ID: 'user_123',
  TEST_VAULT_ID: 'vault_123'
} as const