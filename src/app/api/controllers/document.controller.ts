/**
 * Document Controller
 * Consolidated controller for all document processing and collaboration features
 * Following enterprise architecture with Repository Pattern and Result<T> types
 * 
 * Consolidates document-related API routes into a single controller:
 * - Document CRUD operations and metadata management
 * - Document processing (OCR, text extraction, analysis)
 * - Real-time collaborative editing with operational transforms
 * - Version control and document history
 * - Document sharing and permissions
 * - Document templates and automation
 * - Document analytics and insights
 * - Document conversion and export
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { DocumentRepository } from '@/lib/repositories/document.repository'
import { DocumentService } from '@/lib/services/document.service'
import { CollaborationService } from '@/lib/services/collaboration.service'
import { NotificationService } from '@/lib/services/notification.service'
import { AnalyticsService } from '@/lib/services/analytics.service'
import { RepositoryFactory } from '@/lib/repositories'
import { Result } from '@/lib/repositories/result'
import { createUserId, createOrganizationId, createVaultId, createAssetId } from '@/lib/utils/branded-type-helpers'
import { logError, logActivity } from '@/lib/utils/logging'
import { validateRequest } from '@/lib/utils/validation'
import { withAuth } from '@/lib/middleware/auth'
import { withRateLimit } from '@/lib/middleware/rate-limit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Document Types
export interface Document {
  id?: string
  title: string
  content: string
  contentType: 'html' | 'markdown' | 'plain' | 'structured'
  documentType: 'board_minutes' | 'agenda' | 'policy' | 'contract' | 'report' | 'memo' | 'other'
  organizationId?: string
  vaultId?: string
  folderId?: string
  status: 'draft' | 'review' | 'approved' | 'archived'
  version: string
  tags: string[]
  metadata: {
    createdBy: string
    lastModifiedBy?: string
    createdAt?: string
    updatedAt?: string
    wordCount?: number
    readingTime?: number // in minutes
    language?: string
    summary?: string
    extractedEntities?: Array<{
      type: 'person' | 'organization' | 'location' | 'date' | 'currency' | 'other'
      value: string
      confidence: number
    }>
    compliance?: {
      reviewed: boolean
      approvedBy?: string
      approvalDate?: string
      expiryDate?: string
      classifications: string[]
    }
  }
  permissions: {
    visibility: 'public' | 'organization' | 'private' | 'restricted'
    allowedUsers?: string[]
    allowedRoles?: string[]
    editPermissions: string[]
    commentPermissions: string[]
  }
  collaboration?: {
    isLocked?: boolean
    lockedBy?: string
    lockExpiry?: string
    activeEditors?: string[]
    lastActivity?: string
  }
}

interface DocumentProcessingRequest {
  documentId: string
  processingType: 'ocr' | 'text_extraction' | 'entity_extraction' | 'summarization' | 'translation' | 'compliance_check'
  options?: {
    language?: string
    targetLanguage?: string // for translation
    extractionFormat?: 'plain' | 'structured'
    summaryLength?: 'short' | 'medium' | 'long'
    complianceStandards?: string[]
  }
}

interface DocumentCollaborationRequest {
  documentId: string
  operation: 'lock' | 'unlock' | 'join_editing' | 'leave_editing' | 'apply_changes'
  operationalTransforms?: Array<{
    type: 'insert' | 'delete' | 'retain' | 'format'
    position: number
    content?: string
    length?: number
    attributes?: Record<string, any>
  }>
  lockDuration?: number // minutes
}

interface DocumentVersionRequest {
  documentId: string
  action: 'create_version' | 'restore_version' | 'compare_versions'
  versionId?: string
  compareWithVersion?: string
  versionNotes?: string
}

interface DocumentTemplateRequest {
  name: string
  description?: string
  documentType: Document['documentType']
  templateContent: string
  templateVariables: Array<{
    name: string
    type: 'text' | 'number' | 'date' | 'boolean' | 'select'
    description: string
    required: boolean
    defaultValue?: any
    options?: string[] // for select type
  }>
  organizationId?: string
  isPublic: boolean
}

interface DocumentConversionRequest {
  documentId: string
  targetFormat: 'pdf' | 'docx' | 'html' | 'markdown' | 'txt'
  options?: {
    includeComments?: boolean
    includeMetadata?: boolean
    pageSize?: 'A4' | 'Letter' | 'Legal'
    margins?: { top: number, right: number, bottom: number, left: number }
    watermark?: string
  }
}

interface DocumentSharingRequest {
  documentId: string
  shareType: 'link' | 'email' | 'organization'
  recipients?: string[]
  permissions: 'read' | 'comment' | 'edit'
  expiryDate?: string
  password?: string
  allowDownload?: boolean
  message?: string
}

// Validation Schemas
const documentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().min(1, 'Content is required'),
  contentType: z.enum(['html', 'markdown', 'plain', 'structured']).default('html'),
  documentType: z.enum(['board_minutes', 'agenda', 'policy', 'contract', 'report', 'memo', 'other']),
  organizationId: z.string().optional(),
  vaultId: z.string().optional(),
  folderId: z.string().optional(),
  status: z.enum(['draft', 'review', 'approved', 'archived']).default('draft'),
  tags: z.array(z.string()).default([]),
  permissions: z.object({
    visibility: z.enum(['public', 'organization', 'private', 'restricted']).default('organization'),
    allowedUsers: z.array(z.string()).optional(),
    allowedRoles: z.array(z.string()).optional(),
    editPermissions: z.array(z.string()).default([]),
    commentPermissions: z.array(z.string()).default([])
  }),
  metadata: z.object({
    language: z.string().optional(),
    summary: z.string().optional(),
    compliance: z.object({
      reviewed: z.boolean().default(false),
      approvedBy: z.string().optional(),
      approvalDate: z.string().datetime().optional(),
      expiryDate: z.string().datetime().optional(),
      classifications: z.array(z.string()).default([])
    }).optional()
  }).optional()
})

const documentProcessingSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  processingType: z.enum(['ocr', 'text_extraction', 'entity_extraction', 'summarization', 'translation', 'compliance_check']),
  options: z.object({
    language: z.string().optional(),
    targetLanguage: z.string().optional(),
    extractionFormat: z.enum(['plain', 'structured']).optional(),
    summaryLength: z.enum(['short', 'medium', 'long']).optional(),
    complianceStandards: z.array(z.string()).optional()
  }).optional()
})

const documentCollaborationSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  operation: z.enum(['lock', 'unlock', 'join_editing', 'leave_editing', 'apply_changes']),
  operationalTransforms: z.array(z.object({
    type: z.enum(['insert', 'delete', 'retain', 'format']),
    position: z.number().min(0),
    content: z.string().optional(),
    length: z.number().min(0).optional(),
    attributes: z.record(z.any()).optional()
  })).optional(),
  lockDuration: z.number().min(1).max(240).optional() // 1-240 minutes
})

const documentVersionSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  action: z.enum(['create_version', 'restore_version', 'compare_versions']),
  versionId: z.string().optional(),
  compareWithVersion: z.string().optional(),
  versionNotes: z.string().max(500, 'Version notes too long').optional()
})

const documentTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  documentType: documentSchema.shape.documentType,
  templateContent: z.string().min(1, 'Template content is required'),
  templateVariables: z.array(z.object({
    name: z.string().min(1),
    type: z.enum(['text', 'number', 'date', 'boolean', 'select']),
    description: z.string(),
    required: z.boolean(),
    defaultValue: z.any().optional(),
    options: z.array(z.string()).optional()
  })),
  organizationId: z.string().optional(),
  isPublic: z.boolean().default(false)
})

const documentConversionSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  targetFormat: z.enum(['pdf', 'docx', 'html', 'markdown', 'txt']),
  options: z.object({
    includeComments: z.boolean().optional(),
    includeMetadata: z.boolean().optional(),
    pageSize: z.enum(['A4', 'Letter', 'Legal']).optional(),
    margins: z.object({
      top: z.number(),
      right: z.number(),
      bottom: z.number(),
      left: z.number()
    }).optional(),
    watermark: z.string().optional()
  }).optional()
})

const documentSharingSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  shareType: z.enum(['link', 'email', 'organization']),
  recipients: z.array(z.string().email()).optional(),
  permissions: z.enum(['read', 'comment', 'edit']),
  expiryDate: z.string().datetime().optional(),
  password: z.string().min(8).optional(),
  allowDownload: z.boolean().default(true),
  message: z.string().max(1000, 'Message too long').optional()
})

export class DocumentController {
  private documentService: DocumentService
  private collaborationService: CollaborationService
  private notificationService: NotificationService
  private analyticsService: AnalyticsService
  private repositoryFactory: RepositoryFactory

  constructor() {
    this.repositoryFactory = new RepositoryFactory(this.createSupabaseClient())
    this.documentService = new DocumentService(this.repositoryFactory)
    this.collaborationService = new CollaborationService(this.repositoryFactory)
    this.notificationService = new NotificationService(this.repositoryFactory)
    this.analyticsService = new AnalyticsService(this.repositoryFactory)
  }

  private createSupabaseClient() {
    const cookieStore = cookies()
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )
  }

  /**
   * GET /api/documents
   * Retrieve documents with filtering and pagination
   */
  async getDocuments(request: NextRequest): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const url = new URL(request.url)
      const organizationId = url.searchParams.get('organizationId')
      const vaultId = url.searchParams.get('vaultId')
      const documentType = url.searchParams.get('documentType')
      const status = url.searchParams.get('status')
      const tags = url.searchParams.getAll('tags')
      const search = url.searchParams.get('search')
      const limit = parseInt(url.searchParams.get('limit') || '20')
      const offset = parseInt(url.searchParams.get('offset') || '0')

      const documentsResult = await this.documentService.getDocuments({
        userId: createUserId(user.id),
        organizationId: organizationId ? createOrganizationId(organizationId) : undefined,
        vaultId: vaultId ? createVaultId(vaultId) : undefined,
        documentType: documentType as Document['documentType'] || undefined,
        status: status as Document['status'] || undefined,
        tags,
        search,
        limit,
        offset
      })

      if (!documentsResult.success) {
        return NextResponse.json(
          { success: false, error: documentsResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: documentsResult.data
      })

    } catch (error) {
      logError('Documents retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Documents retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/documents
   * Create a new document
   */
  async createDocument(request: NextRequest): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, documentSchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const documentData = validation.data as Document

      // Create document with metadata
      const documentResult = await this.documentService.createDocument({
        ...documentData,
        organizationId: documentData.organizationId ? createOrganizationId(documentData.organizationId) : undefined,
        vaultId: documentData.vaultId ? createVaultId(documentData.vaultId) : undefined,
        metadata: {
          ...documentData.metadata,
          createdBy: user.id,
          wordCount: this.calculateWordCount(documentData.content),
          readingTime: this.calculateReadingTime(documentData.content)
        }
      }, createUserId(user.id))

      if (!documentResult.success) {
        return NextResponse.json(
          { success: false, error: documentResult.error },
          { status: 500 }
        )
      }

      // Log document creation
      await logActivity({
        userId: user.id,
        action: 'document_created',
        details: {
          documentId: documentResult.data.id,
          title: documentData.title,
          documentType: documentData.documentType,
          wordCount: documentResult.data.metadata?.wordCount
        }
      })

      return NextResponse.json({
        success: true,
        data: documentResult.data
      }, { status: 201 })

    } catch (error) {
      logError('Document creation failed', error)
      return NextResponse.json(
        { success: false, error: 'Document creation failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/documents/[id]
   * Get a specific document
   */
  async getDocument(request: NextRequest, documentId: string): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const documentResult = await this.documentService.getDocumentById({
        documentId: createAssetId(documentId),
        userId: createUserId(user.id)
      })

      if (!documentResult.success) {
        return NextResponse.json(
          { success: false, error: documentResult.error },
          { status: documentResult.error === 'Document not found' ? 404 : 500 }
        )
      }

      // Track document access
      await this.analyticsService.trackDocumentAccess({
        documentId: createAssetId(documentId),
        userId: createUserId(user.id),
        accessType: 'view'
      })

      return NextResponse.json({
        success: true,
        data: documentResult.data
      })

    } catch (error) {
      logError('Document retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Document retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * PUT /api/documents/[id]
   * Update a document
   */
  async updateDocument(request: NextRequest, documentId: string): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, documentSchema.partial())
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const updateData = validation.data

      // Update word count and reading time if content changed
      if (updateData.content) {
        updateData.metadata = {
          ...updateData.metadata,
          wordCount: this.calculateWordCount(updateData.content),
          readingTime: this.calculateReadingTime(updateData.content)
        }
      }

      const documentResult = await this.documentService.updateDocument({
        documentId: createAssetId(documentId),
        userId: createUserId(user.id),
        updateData: {
          ...updateData,
          organizationId: updateData.organizationId ? createOrganizationId(updateData.organizationId) : undefined,
          vaultId: updateData.vaultId ? createVaultId(updateData.vaultId) : undefined,
          metadata: {
            ...updateData.metadata,
            lastModifiedBy: user.id
          }
        }
      })

      if (!documentResult.success) {
        return NextResponse.json(
          { success: false, error: documentResult.error },
          { status: documentResult.error === 'Document not found' ? 404 : 500 }
        )
      }

      // Log document update
      await logActivity({
        userId: user.id,
        action: 'document_updated',
        details: {
          documentId,
          changesCount: Object.keys(updateData).length
        }
      })

      return NextResponse.json({
        success: true,
        data: documentResult.data
      })

    } catch (error) {
      logError('Document update failed', error)
      return NextResponse.json(
        { success: false, error: 'Document update failed' },
        { status: 500 }
      )
    }
  }

  /**
   * DELETE /api/documents/[id]
   * Delete a document
   */
  async deleteDocument(request: NextRequest, documentId: string): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const deleteResult = await this.documentService.deleteDocument({
        documentId: createAssetId(documentId),
        userId: createUserId(user.id)
      })

      if (!deleteResult.success) {
        return NextResponse.json(
          { success: false, error: deleteResult.error },
          { status: deleteResult.error === 'Document not found' ? 404 : 500 }
        )
      }

      // Log document deletion
      await logActivity({
        userId: user.id,
        action: 'document_deleted',
        details: {
          documentId
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Document deleted successfully'
      })

    } catch (error) {
      logError('Document deletion failed', error)
      return NextResponse.json(
        { success: false, error: 'Document deletion failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/documents/[id]/process
   * Process document with AI (OCR, extraction, etc.)
   */
  async processDocument(request: NextRequest, documentId: string): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, documentProcessingSchema.omit({ documentId: true }))
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const { processingType, options } = validation.data

      const processingResult = await this.documentService.processDocument({
        documentId: createAssetId(documentId),
        userId: createUserId(user.id),
        processingType,
        options
      })

      if (!processingResult.success) {
        return NextResponse.json(
          { success: false, error: processingResult.error },
          { status: 500 }
        )
      }

      // Log processing activity
      await logActivity({
        userId: user.id,
        action: 'document_processed',
        details: {
          documentId,
          processingType,
          success: processingResult.success
        }
      })

      return NextResponse.json({
        success: true,
        data: processingResult.data
      })

    } catch (error) {
      logError('Document processing failed', error)
      return NextResponse.json(
        { success: false, error: 'Document processing failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/documents/[id]/collaborate
   * Handle real-time collaboration operations
   */
  async handleCollaboration(request: NextRequest, documentId: string): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, documentCollaborationSchema.omit({ documentId: true }))
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const { operation, operationalTransforms, lockDuration } = validation.data

      const collaborationResult = await this.collaborationService.handleDocumentCollaboration({
        documentId: createAssetId(documentId),
        userId: createUserId(user.id),
        operation,
        operationalTransforms,
        lockDuration
      })

      if (!collaborationResult.success) {
        return NextResponse.json(
          { success: false, error: collaborationResult.error },
          { status: 500 }
        )
      }

      // Broadcast collaboration changes to other editors
      if (operation === 'apply_changes' && operationalTransforms) {
        await this.collaborationService.broadcastChanges({
          documentId: createAssetId(documentId),
          userId: createUserId(user.id),
          changes: operationalTransforms
        })
      }

      return NextResponse.json({
        success: true,
        data: collaborationResult.data
      })

    } catch (error) {
      logError('Document collaboration failed', error)
      return NextResponse.json(
        { success: false, error: 'Collaboration operation failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/documents/[id]/versions
   * Handle document versioning operations
   */
  async handleVersioning(request: NextRequest, documentId: string): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, documentVersionSchema.omit({ documentId: true }))
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const { action, versionId, compareWithVersion, versionNotes } = validation.data

      const versionResult = await this.documentService.handleVersioning({
        documentId: createAssetId(documentId),
        userId: createUserId(user.id),
        action,
        versionId,
        compareWithVersion,
        versionNotes
      })

      if (!versionResult.success) {
        return NextResponse.json(
          { success: false, error: versionResult.error },
          { status: 500 }
        )
      }

      // Log versioning activity
      await logActivity({
        userId: user.id,
        action: `document_version_${action}`,
        details: {
          documentId,
          versionId: versionResult.data.versionId
        }
      })

      return NextResponse.json({
        success: true,
        data: versionResult.data
      })

    } catch (error) {
      logError('Document versioning failed', error)
      return NextResponse.json(
        { success: false, error: 'Version operation failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/documents/[id]/convert
   * Convert document to different formats
   */
  async convertDocument(request: NextRequest, documentId: string): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, documentConversionSchema.omit({ documentId: true }))
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const { targetFormat, options } = validation.data

      const conversionResult = await this.documentService.convertDocument({
        documentId: createAssetId(documentId),
        userId: createUserId(user.id),
        targetFormat,
        options
      })

      if (!conversionResult.success) {
        return NextResponse.json(
          { success: false, error: conversionResult.error },
          { status: 500 }
        )
      }

      // Log conversion activity
      await logActivity({
        userId: user.id,
        action: 'document_converted',
        details: {
          documentId,
          targetFormat,
          fileSize: conversionResult.data.fileSize
        }
      })

      // Set appropriate content type
      const contentTypes = {
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        html: 'text/html',
        markdown: 'text/markdown',
        txt: 'text/plain'
      }

      return new Response(conversionResult.data.content, {
        status: 200,
        headers: {
          'Content-Type': contentTypes[targetFormat],
          'Content-Disposition': `attachment; filename="document.${targetFormat}"`,
          'Cache-Control': 'no-store'
        }
      })

    } catch (error) {
      logError('Document conversion failed', error)
      return NextResponse.json(
        { success: false, error: 'Document conversion failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/documents/[id]/share
   * Share document with users or generate sharing links
   */
  async shareDocument(request: NextRequest, documentId: string): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, documentSharingSchema.omit({ documentId: true }))
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const sharingData = validation.data

      const sharingResult = await this.documentService.shareDocument({
        documentId: createAssetId(documentId),
        userId: createUserId(user.id),
        ...sharingData
      })

      if (!sharingResult.success) {
        return NextResponse.json(
          { success: false, error: sharingResult.error },
          { status: 500 }
        )
      }

      // Send notifications if sharing via email
      if (sharingData.shareType === 'email' && sharingData.recipients) {
        await this.notificationService.sendDocumentSharingNotifications({
          documentId: createAssetId(documentId),
          sharedBy: {
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.name || user.email
          },
          recipients: sharingData.recipients,
          permissions: sharingData.permissions,
          message: sharingData.message
        })
      }

      // Log sharing activity
      await logActivity({
        userId: user.id,
        action: 'document_shared',
        details: {
          documentId,
          shareType: sharingData.shareType,
          permissions: sharingData.permissions,
          recipientsCount: sharingData.recipients?.length || 0
        }
      })

      return NextResponse.json({
        success: true,
        data: sharingResult.data
      })

    } catch (error) {
      logError('Document sharing failed', error)
      return NextResponse.json(
        { success: false, error: 'Document sharing failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/documents/templates
   * Get available document templates
   */
  async getTemplates(request: NextRequest): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const url = new URL(request.url)
      const organizationId = url.searchParams.get('organizationId')
      const documentType = url.searchParams.get('documentType')
      const includePublic = url.searchParams.get('includePublic') === 'true'

      const templatesResult = await this.documentService.getTemplates({
        userId: createUserId(user.id),
        organizationId: organizationId ? createOrganizationId(organizationId) : undefined,
        documentType: documentType as Document['documentType'] || undefined,
        includePublic
      })

      if (!templatesResult.success) {
        return NextResponse.json(
          { success: false, error: templatesResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: templatesResult.data
      })

    } catch (error) {
      logError('Templates retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Templates retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/documents/templates
   * Create a new document template
   */
  async createTemplate(request: NextRequest): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, documentTemplateSchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const templateData = validation.data

      const templateResult = await this.documentService.createTemplate({
        ...templateData,
        organizationId: templateData.organizationId ? createOrganizationId(templateData.organizationId) : undefined,
        createdBy: createUserId(user.id)
      })

      if (!templateResult.success) {
        return NextResponse.json(
          { success: false, error: templateResult.error },
          { status: 500 }
        )
      }

      // Log template creation
      await logActivity({
        userId: user.id,
        action: 'document_template_created',
        details: {
          templateId: templateResult.data.id,
          name: templateData.name,
          documentType: templateData.documentType
        }
      })

      return NextResponse.json({
        success: true,
        data: templateResult.data
      }, { status: 201 })

    } catch (error) {
      logError('Template creation failed', error)
      return NextResponse.json(
        { success: false, error: 'Template creation failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/documents/analytics
   * Get document analytics and insights
   */
  async getAnalytics(request: NextRequest): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const url = new URL(request.url)
      const organizationId = url.searchParams.get('organizationId')
      const timeRange = url.searchParams.get('timeRange') || '30d'
      const metrics = url.searchParams.getAll('metrics')

      const analyticsResult = await this.analyticsService.getDocumentAnalytics({
        userId: createUserId(user.id),
        organizationId: organizationId ? createOrganizationId(organizationId) : undefined,
        timeRange,
        metrics: metrics.length > 0 ? metrics : undefined
      })

      if (!analyticsResult.success) {
        return NextResponse.json(
          { success: false, error: analyticsResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: analyticsResult.data
      })

    } catch (error) {
      logError('Document analytics retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Analytics retrieval failed' },
        { status: 500 }
      )
    }
  }

  // Helper Methods
  private calculateWordCount(content: string): number {
    return content.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  private calculateReadingTime(content: string): number {
    const wordsPerMinute = 200
    const wordCount = this.calculateWordCount(content)
    return Math.ceil(wordCount / wordsPerMinute)
  }

  private async getCurrentUser() {
    try {
      const supabase = this.createSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      return user
    } catch (error) {
      logError('Failed to get current user', error)
      return null
    }
  }
}

// Export controller instance
export const documentController = new DocumentController()

// Route handlers for different HTTP methods and endpoints
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting
  const rateLimitResult = await withRateLimit(request, {
    limit: 150, // 150 requests per minute for read operations
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  if (pathname.includes('/templates')) {
    return await documentController.getTemplates(request)
  } else if (pathname.includes('/analytics')) {
    return await documentController.getAnalytics(request)
  } else if (pathname.includes('/documents/')) {
    const documentId = pathname.split('/documents/')[1]?.split('/')[0]
    if (documentId) {
      return await documentController.getDocument(request, documentId)
    }
  } else if (pathname.includes('/documents')) {
    return await documentController.getDocuments(request)
  }
  
  return NextResponse.json(
    { success: false, error: 'Endpoint not found' },
    { status: 404 }
  )
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting for POST operations
  const rateLimitResult = await withRateLimit(request, {
    limit: 60, // 60 requests per minute for write operations
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const documentId = pathname.split('/documents/')[1]?.split('/')[0]

  if (pathname.includes('/templates') && !documentId) {
    return await documentController.createTemplate(request)
  } else if (pathname.includes('/share') && documentId) {
    return await documentController.shareDocument(request, documentId)
  } else if (pathname.includes('/convert') && documentId) {
    return await documentController.convertDocument(request, documentId)
  } else if (pathname.includes('/versions') && documentId) {
    return await documentController.handleVersioning(request, documentId)
  } else if (pathname.includes('/collaborate') && documentId) {
    return await documentController.handleCollaboration(request, documentId)
  } else if (pathname.includes('/process') && documentId) {
    return await documentController.processDocument(request, documentId)
  } else if (pathname.includes('/documents') && !documentId) {
    return await documentController.createDocument(request)
  }
  
  return NextResponse.json(
    { success: false, error: 'Endpoint not found' },
    { status: 404 }
  )
}

export async function PUT(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting for PUT operations
  const rateLimitResult = await withRateLimit(request, {
    limit: 60,
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const documentId = pathname.split('/documents/')[1]?.split('/')[0]
  
  if (!documentId) {
    return NextResponse.json(
      { success: false, error: 'Document ID required' },
      { status: 400 }
    )
  }

  return await documentController.updateDocument(request, documentId)
}

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting for DELETE operations
  const rateLimitResult = await withRateLimit(request, {
    limit: 30,
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const documentId = pathname.split('/documents/')[1]?.split('/')[0]
  
  if (!documentId) {
    return NextResponse.json(
      { success: false, error: 'Document ID required' },
      { status: 400 }
    )
  }

  return await documentController.deleteDocument(request, documentId)
}