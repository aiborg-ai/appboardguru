/**
 * Document Controller
 * 
 * Consolidated controller for all document-related endpoints
 * Follows DDD architecture with BaseController and Result pattern
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { BaseController } from '../base-controller'
import { Result, Ok, Err, ResultUtils } from '../../result'
import { DocumentService } from '../../services/document.service'
import { DocumentRepository } from '../../repositories/document.repository'
import { createSupabaseServerClient } from '../../supabase-server'
import { DocumentError, getFriendlyErrorMessage, getErrorSeverity } from '../../repositories/document-errors'

import type {
  AssetId,
  DocumentId,
  AnnotationId,
  UserId
} from '../../../types/branded'

// ==== Request/Response Schemas ====

const CreateAnnotationSchema = z.object({
  type: z.enum(['comment', 'question', 'note', 'voice']),
  content: z.string().min(1),
  sectionReference: z.object({
    page: z.number().optional(),
    coordinates: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number().optional(),
      height: z.number().optional()
    }).optional(),
    text: z.string().optional()
  }).optional(),
  voiceUrl: z.string().optional(),
  isShared: z.boolean().optional().default(false),
  sharedWith: z.array(z.string()).optional().default([])
})

const UpdateAnnotationSchema = z.object({
  content: z.string().min(1).optional(),
  sectionReference: z.object({
    page: z.number().optional(),
    coordinates: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number().optional(),
      height: z.number().optional()
    }).optional(),
    text: z.string().optional()
  }).optional(),
  voiceUrl: z.string().optional(),
  isShared: z.boolean().optional(),
  sharedWith: z.array(z.string()).optional()
})

const ShareAnnotationSchema = z.object({
  userIds: z.array(z.string().uuid())
})

const GenerateSummarySchema = z.object({
  type: z.enum(['executive', 'detailed', 'bullet_points', 'key_insights'])
})

const ProcessChatMessageSchema = z.object({
  message: z.string().min(1),
  context: z.record(z.any()).optional()
})

const DocumentSearchSchema = z.object({
  q: z.string().min(1),
  caseSensitive: z.boolean().optional().default(false),
  wholeWord: z.boolean().optional().default(false),
  page: z.coerce.number().optional()
})

// ==== Main Controller Class ====

export class DocumentController extends BaseController {
  private documentService: DocumentService

  constructor() {
    super()
    // Service will be initialized per request to ensure fresh Supabase client
    this.documentService = null as any
  }

  private async initializeService(request: NextRequest): Promise<void> {
    const supabase = await createSupabaseServerClient()
    const repository = new DocumentRepository(supabase)
    this.documentService = new DocumentService(repository)
  }

  // ==== Document Metadata Endpoints ====

  /**
   * GET /api/documents/[assetId]
   * Get document metadata
   */
  async getDocument(
    request: NextRequest, 
    context: { params: { assetId: string } }
  ): Promise<NextResponse> {
    await this.initializeService(request)

    return this.handleRequest(request, async () => {
      const { assetId } = this.getPathParams(context)

      const result = await this.documentService.getDocumentByAssetId(assetId as AssetId)
      
      if (!result.success) {
        return Err(new Error(result.error.message))
      }

      return Ok({
        success: true,
        data: result.data,
        message: 'Document retrieved successfully'
      })
    })
  }

  // ==== Annotation Endpoints ====

  /**
   * GET /api/documents/[assetId]/annotations
   * Get annotations for a document
   */
  async getAnnotations(
    request: NextRequest,
    context: { params: { assetId: string } }
  ): Promise<NextResponse> {
    await this.initializeService(request)

    const queryResult = this.validateQuery(request, z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(50),
      search: z.string().optional()
    }))

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(queryResult)) return queryResult

      const { assetId } = this.getPathParams(context)
      const { page, limit, search } = ResultUtils.unwrap(queryResult)

      const queryOptions = {
        page,
        limit,
        search,
        offset: (page - 1) * limit
      }

      const result = await this.documentService.getAnnotations(assetId as DocumentId, queryOptions)
      
      if (!result.success) {
        return Err(new Error(result.error.message))
      }

      return Ok({
        success: true,
        data: result.data.data.map(annotation => this.transformAnnotationForResponse(annotation)),
        pagination: {
          page: result.data.page,
          limit: result.data.limit,
          total: result.data.total,
          totalPages: result.data.totalPages
        },
        message: 'Annotations retrieved successfully'
      })
    })
  }

  /**
   * POST /api/documents/[assetId]/annotations
   * Create a new annotation
   */
  async createAnnotation(
    request: NextRequest,
    context: { params: { assetId: string } }
  ): Promise<NextResponse> {
    await this.initializeService(request)

    const bodyResult = await this.validateBody(request, CreateAnnotationSchema)

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(bodyResult)) return bodyResult

      const userIdResult = await this.getUserId(request)
      if (ResultUtils.isErr(userIdResult)) return userIdResult

      const { assetId } = this.getPathParams(context)
      const annotationData = ResultUtils.unwrap(bodyResult)
      const userId = ResultUtils.unwrap(userIdResult) as UserId

      const createData = {
        documentId: assetId as DocumentId,
        userId,
        annotationType: annotationData.type,
        content: annotationData.content,
        positionData: annotationData.sectionReference?.coordinates,
        highlightedText: annotationData.sectionReference?.text,
        pageNumber: annotationData.sectionReference?.page,
        voiceUrl: annotationData.voiceUrl,
        isShared: annotationData.isShared,
        sharedWith: annotationData.sharedWith
      }

      const result = await this.documentService.createAnnotation(createData)
      
      if (!result.success) {
        return Err(new Error(result.error.message))
      }

      return Ok({
        success: true,
        data: this.transformAnnotationForResponse(result.data),
        message: 'Annotation created successfully'
      })
    })
  }

  /**
   * PUT /api/documents/annotations/[id]
   * Update an annotation
   */
  async updateAnnotation(
    request: NextRequest,
    context: { params: { id: string } }
  ): Promise<NextResponse> {
    await this.initializeService(request)

    const bodyResult = await this.validateBody(request, UpdateAnnotationSchema)

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(bodyResult)) return bodyResult

      const userIdResult = await this.getUserId(request)
      if (ResultUtils.isErr(userIdResult)) return userIdResult

      const { id } = this.getPathParams(context)
      const updateData = ResultUtils.unwrap(bodyResult)

      const processedUpdateData = {
        content: updateData.content,
        positionData: updateData.sectionReference?.coordinates,
        highlightedText: updateData.sectionReference?.text,
        voiceUrl: updateData.voiceUrl,
        isShared: updateData.isShared,
        sharedWith: updateData.sharedWith
      }

      const result = await this.documentService.updateAnnotation(
        id as AnnotationId, 
        processedUpdateData
      )
      
      if (!result.success) {
        return Err(new Error(result.error.message))
      }

      return Ok({
        success: true,
        data: this.transformAnnotationForResponse(result.data),
        message: 'Annotation updated successfully'
      })
    })
  }

  /**
   * DELETE /api/documents/annotations/[id]
   * Delete an annotation
   */
  async deleteAnnotation(
    request: NextRequest,
    context: { params: { id: string } }
  ): Promise<NextResponse> {
    await this.initializeService(request)

    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request)
      if (ResultUtils.isErr(userIdResult)) return userIdResult

      const { id } = this.getPathParams(context)

      const result = await this.documentService.deleteAnnotation(id as AnnotationId)
      
      if (!result.success) {
        return Err(new Error(result.error.message))
      }

      return Ok({
        success: true,
        message: 'Annotation deleted successfully'
      })
    })
  }

  /**
   * POST /api/documents/annotations/[id]/share
   * Share an annotation with users
   */
  async shareAnnotation(
    request: NextRequest,
    context: { params: { id: string } }
  ): Promise<NextResponse> {
    await this.initializeService(request)

    const bodyResult = await this.validateBody(request, ShareAnnotationSchema)

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(bodyResult)) return bodyResult

      const userIdResult = await this.getUserId(request)
      if (ResultUtils.isErr(userIdResult)) return userIdResult

      const { id } = this.getPathParams(context)
      const { userIds } = ResultUtils.unwrap(bodyResult)

      const result = await this.documentService.shareAnnotation(id as AnnotationId, userIds)
      
      if (!result.success) {
        return Err(new Error(result.error.message))
      }

      return Ok({
        success: true,
        data: this.transformAnnotationForResponse(result.data),
        message: 'Annotation shared successfully'
      })
    })
  }

  // ==== Table of Contents Endpoints ====

  /**
   * GET /api/documents/[assetId]/toc
   * Get table of contents
   */
  async getTableOfContents(
    request: NextRequest,
    context: { params: { assetId: string } }
  ): Promise<NextResponse> {
    await this.initializeService(request)

    return this.handleRequest(request, async () => {
      const { assetId } = this.getPathParams(context)

      const result = await this.documentService.getTableOfContents(assetId as DocumentId)
      
      if (!result.success) {
        return Err(new Error(result.error.message))
      }

      return Ok({
        success: true,
        data: result.data,
        message: 'Table of contents retrieved successfully'
      })
    })
  }

  /**
   * POST /api/documents/[assetId]/toc
   * Generate table of contents
   */
  async generateTableOfContents(
    request: NextRequest,
    context: { params: { assetId: string } }
  ): Promise<NextResponse> {
    await this.initializeService(request)

    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request)
      if (ResultUtils.isErr(userIdResult)) return userIdResult

      const { assetId } = this.getPathParams(context)

      const result = await this.documentService.generateTableOfContents(assetId as DocumentId)
      
      if (!result.success) {
        return Err(new Error(result.error.message))
      }

      return Ok({
        success: true,
        data: result.data,
        message: 'Table of contents generated successfully'
      })
    })
  }

  // ==== Summary Endpoints ====

  /**
   * GET /api/documents/[assetId]/summary
   * Get document summaries
   */
  async getSummaries(
    request: NextRequest,
    context: { params: { assetId: string } }
  ): Promise<NextResponse> {
    await this.initializeService(request)

    const queryResult = this.validateQuery(request, z.object({
      type: z.enum(['executive', 'detailed', 'bullet_points', 'key_insights']).optional()
    }))

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(queryResult)) return queryResult

      const { assetId } = this.getPathParams(context)
      const { type } = ResultUtils.unwrap(queryResult)

      const result = await this.documentService.getSummaries(assetId as DocumentId, type)
      
      if (!result.success) {
        return Err(new Error(result.error.message))
      }

      return Ok({
        success: true,
        data: result.data,
        message: 'Summaries retrieved successfully'
      })
    })
  }

  /**
   * POST /api/documents/[assetId]/summary
   * Generate document summary
   */
  async generateSummary(
    request: NextRequest,
    context: { params: { assetId: string } }
  ): Promise<NextResponse> {
    await this.initializeService(request)

    const bodyResult = await this.validateBody(request, GenerateSummarySchema)

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(bodyResult)) return bodyResult

      const userIdResult = await this.getUserId(request)
      if (ResultUtils.isErr(userIdResult)) return userIdResult

      const { assetId } = this.getPathParams(context)
      const { type } = ResultUtils.unwrap(bodyResult)

      const result = await this.documentService.generateSummary(assetId as DocumentId, type)
      
      if (!result.success) {
        return Err(new Error(result.error.message))
      }

      return Ok({
        success: true,
        data: result.data,
        message: 'Summary generated successfully'
      })
    })
  }

  // ==== Podcast Endpoints ====

  /**
   * GET /api/documents/[assetId]/podcast
   * Get document podcast
   */
  async getPodcast(
    request: NextRequest,
    context: { params: { assetId: string } }
  ): Promise<NextResponse> {
    await this.initializeService(request)

    return this.handleRequest(request, async () => {
      const { assetId } = this.getPathParams(context)

      const result = await this.documentService.getPodcast(assetId as DocumentId)
      
      if (!result.success) {
        return Err(new Error(result.error.message))
      }

      return Ok({
        success: true,
        data: result.data,
        message: 'Podcast retrieved successfully'
      })
    })
  }

  /**
   * POST /api/documents/[assetId]/podcast
   * Generate document podcast
   */
  async generatePodcast(
    request: NextRequest,
    context: { params: { assetId: string } }
  ): Promise<NextResponse> {
    await this.initializeService(request)

    return this.handleRequest(request, async () => {
      const userIdResult = await this.getUserId(request)
      if (ResultUtils.isErr(userIdResult)) return userIdResult

      const { assetId } = this.getPathParams(context)

      const result = await this.documentService.generatePodcast(assetId as DocumentId)
      
      if (!result.success) {
        return Err(new Error(result.error.message))
      }

      return Ok({
        success: true,
        data: result.data,
        message: 'Podcast generated successfully'
      })
    })
  }

  // ==== Search Endpoints ====

  /**
   * GET /api/documents/[assetId]/search
   * Search within a document
   */
  async searchDocument(
    request: NextRequest,
    context: { params: { assetId: string } }
  ): Promise<NextResponse> {
    await this.initializeService(request)

    const queryResult = this.validateQuery(request, DocumentSearchSchema)

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(queryResult)) return queryResult

      const { assetId } = this.getPathParams(context)
      const searchParams = ResultUtils.unwrap(queryResult)

      const searchQuery = {
        query: searchParams.q,
        documentId: assetId as DocumentId,
        caseSensitive: searchParams.caseSensitive,
        wholeWord: searchParams.wholeWord,
        pageNumber: searchParams.page
      }

      const result = await this.documentService.searchDocument(searchQuery)
      
      if (!result.success) {
        return Err(new Error(result.error.message))
      }

      return Ok({
        success: true,
        data: result.data,
        message: 'Search completed successfully'
      })
    })
  }

  // ==== AI Chat Endpoints ====

  /**
   * POST /api/documents/[assetId]/chat
   * Process AI chat message about document
   */
  async processChatMessage(
    request: NextRequest,
    context: { params: { assetId: string } }
  ): Promise<NextResponse> {
    await this.initializeService(request)

    const bodyResult = await this.validateBody(request, ProcessChatMessageSchema)

    return this.handleRequest(request, async () => {
      if (ResultUtils.isErr(bodyResult)) return bodyResult

      const userIdResult = await this.getUserId(request)
      if (ResultUtils.isErr(userIdResult)) return userIdResult

      const { assetId } = this.getPathParams(context)
      const { message, context: chatContext } = ResultUtils.unwrap(bodyResult)

      const result = await this.documentService.processChatMessage(
        assetId as DocumentId,
        message,
        chatContext
      )
      
      if (!result.success) {
        return Err(new Error(result.error.message))
      }

      return Ok({
        success: true,
        data: {
          message: result.data,
          timestamp: new Date().toISOString()
        },
        message: 'Chat message processed successfully'
      })
    })
  }

  // ==== Private Helper Methods ====

  private transformAnnotationForResponse(annotation: any) {
    return {
      id: annotation.id,
      type: annotation.annotationType,
      content: annotation.content,
      voiceUrl: annotation.voiceUrl,
      sectionReference: {
        page: annotation.pageNumber || 1,
        coordinates: annotation.positionData,
        text: annotation.highlightedText
      },
      userId: annotation.userId,
      userName: annotation.user?.fullName || 'Unknown User',
      createdAt: annotation.createdAt,
      updatedAt: annotation.updatedAt,
      isShared: annotation.isShared || false,
      sharedWith: annotation.sharedWith || [],
      replies: annotation.replies || []
    }
  }
}