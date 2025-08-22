import { NextRequest, NextResponse } from 'next/server'
import { DocumentService } from '../services/document.service'
import { DocumentRepository } from '../repositories/document.repository'
import { createSupabaseServerClient } from '../supabase-server'
import { DocumentError, getFriendlyErrorMessage, getErrorSeverity } from '../repositories/document-errors'
import { 
  createDocumentId, 
  createAnnotationId, 
  createAssetId,
  AssetId,
  DocumentId,
  AnnotationId 
} from '../repositories/types'
import { Result, isSuccess } from '../repositories/result'

/**
 * Controller for document operations following DDD architecture
 * Handles HTTP requests and delegates to service layer
 */
export class DocumentController {
  private documentService: DocumentService

  constructor(documentService?: DocumentService) {
    // If no service provided, create one with default repository
    if (documentService) {
      this.documentService = documentService
    } else {
      // This will be replaced with dependency injection
      this.documentService = this.createDefaultService()
    }
  }

  // Document metadata operations
  async getDocument(request: NextRequest, { params }: { params: { assetId: string } }): Promise<NextResponse> {
    try {
      const { assetId } = params
      const documentId = createAssetId(assetId) as AssetId

      const result = await this.documentService.getDocumentByAssetId(documentId)
      
      if (!isSuccess(result)) {
        return this.handleError(result.error)
      }

      return NextResponse.json({
        success: true,
        data: result.data
      })
    } catch (error) {
      return this.handleUnexpectedError(error)
    }
  }

  // Annotation operations
  async getAnnotations(request: NextRequest, { params }: { params: { assetId: string } }): Promise<NextResponse> {
    try {
      const { assetId } = params
      const documentId = createDocumentId(assetId)
      
      // Parse query parameters
      const { searchParams } = new URL(request.url)
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '50')
      const search = searchParams.get('search') || undefined

      const queryOptions = {
        page,
        limit,
        search,
        offset: (page - 1) * limit
      }

      const result = await this.documentService.getAnnotations(documentId, queryOptions)
      
      if (!isSuccess(result)) {
        return this.handleError(result.error)
      }

      return NextResponse.json({
        success: true,
        data: result.data.data,
        pagination: {
          page: result.data.page,
          limit: result.data.limit,
          total: result.data.total,
          totalPages: result.data.totalPages
        }
      })
    } catch (error) {
      return this.handleUnexpectedError(error)
    }
  }

  async createAnnotation(request: NextRequest, { params }: { params: { assetId: string } }): Promise<NextResponse> {
    try {
      const { assetId } = params
      const documentId = createDocumentId(assetId)
      const body = await request.json()

      // Validate required fields
      if (!body.type || !body.content) {
        return NextResponse.json(
          { success: false, error: 'Type and content are required' },
          { status: 400 }
        )
      }

      const annotationData = {
        documentId,
        annotationType: body.type as 'comment' | 'question' | 'note' | 'voice',
        content: body.content,
        positionData: body.sectionReference?.coordinates,
        highlightedText: body.sectionReference?.text,
        pageNumber: body.sectionReference?.page,
        voiceUrl: body.voiceUrl,
        isShared: body.isShared || false,
        sharedWith: body.sharedWith || []
      }

      const result = await this.documentService.createAnnotation(annotationData)
      
      if (!isSuccess(result)) {
        return this.handleError(result.error)
      }

      return NextResponse.json(
        {
          success: true,
          data: this.transformAnnotationForResponse(result.data)
        },
        { status: 201 }
      )
    } catch (error) {
      return this.handleUnexpectedError(error)
    }
  }

  async updateAnnotation(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
    try {
      const { id } = params
      const annotationId = createAnnotationId(id)
      const body = await request.json()

      const updateData = {
        content: body.content,
        positionData: body.sectionReference?.coordinates,
        highlightedText: body.sectionReference?.text,
        voiceUrl: body.voiceUrl,
        isShared: body.isShared,
        sharedWith: body.sharedWith
      }

      const result = await this.documentService.updateAnnotation(annotationId, updateData)
      
      if (!isSuccess(result)) {
        return this.handleError(result.error)
      }

      return NextResponse.json({
        success: true,
        data: this.transformAnnotationForResponse(result.data)
      })
    } catch (error) {
      return this.handleUnexpectedError(error)
    }
  }

  async deleteAnnotation(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
    try {
      const { id } = params
      const annotationId = createAnnotationId(id)

      const result = await this.documentService.deleteAnnotation(annotationId)
      
      if (!isSuccess(result)) {
        return this.handleError(result.error)
      }

      return NextResponse.json({
        success: true,
        message: 'Annotation deleted successfully'
      })
    } catch (error) {
      return this.handleUnexpectedError(error)
    }
  }

  async shareAnnotation(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
    try {
      const { id } = params
      const annotationId = createAnnotationId(id)
      const body = await request.json()

      if (!body.userIds || !Array.isArray(body.userIds)) {
        return NextResponse.json(
          { success: false, error: 'userIds array is required' },
          { status: 400 }
        )
      }

      const result = await this.documentService.shareAnnotation(annotationId, body.userIds)
      
      if (!isSuccess(result)) {
        return this.handleError(result.error)
      }

      return NextResponse.json({
        success: true,
        data: this.transformAnnotationForResponse(result.data)
      })
    } catch (error) {
      return this.handleUnexpectedError(error)
    }
  }

  // Table of Contents operations
  async getTableOfContents(request: NextRequest, { params }: { params: { assetId: string } }): Promise<NextResponse> {
    try {
      const { assetId } = params
      const documentId = createDocumentId(assetId)

      const result = await this.documentService.getTableOfContents(documentId)
      
      if (!isSuccess(result)) {
        return this.handleError(result.error)
      }

      return NextResponse.json({
        success: true,
        data: result.data
      })
    } catch (error) {
      return this.handleUnexpectedError(error)
    }
  }

  async generateTableOfContents(request: NextRequest, { params }: { params: { assetId: string } }): Promise<NextResponse> {
    try {
      const { assetId } = params
      const documentId = createDocumentId(assetId)

      const result = await this.documentService.generateTableOfContents(documentId)
      
      if (!isSuccess(result)) {
        return this.handleError(result.error)
      }

      return NextResponse.json({
        success: true,
        data: result.data
      })
    } catch (error) {
      return this.handleUnexpectedError(error)
    }
  }

  // Summary operations
  async getSummaries(request: NextRequest, { params }: { params: { assetId: string } }): Promise<NextResponse> {
    try {
      const { assetId } = params
      const documentId = createDocumentId(assetId)
      
      const { searchParams } = new URL(request.url)
      const summaryType = searchParams.get('type') as 'executive' | 'detailed' | 'bullet_points' | 'key_insights' | undefined

      const result = await this.documentService.getSummaries(documentId, summaryType)
      
      if (!isSuccess(result)) {
        return this.handleError(result.error)
      }

      return NextResponse.json({
        success: true,
        data: result.data
      })
    } catch (error) {
      return this.handleUnexpectedError(error)
    }
  }

  async generateSummary(request: NextRequest, { params }: { params: { assetId: string } }): Promise<NextResponse> {
    try {
      const { assetId } = params
      const documentId = createDocumentId(assetId)
      const body = await request.json()

      const summaryType = body.type as 'executive' | 'detailed' | 'bullet_points' | 'key_insights'
      
      if (!summaryType) {
        return NextResponse.json(
          { success: false, error: 'Summary type is required' },
          { status: 400 }
        )
      }

      const result = await this.documentService.generateSummary(documentId, summaryType)
      
      if (!isSuccess(result)) {
        return this.handleError(result.error)
      }

      return NextResponse.json({
        success: true,
        data: result.data
      })
    } catch (error) {
      return this.handleUnexpectedError(error)
    }
  }

  // Podcast operations
  async getPodcast(request: NextRequest, { params }: { params: { assetId: string } }): Promise<NextResponse> {
    try {
      const { assetId } = params
      const documentId = createDocumentId(assetId)

      const result = await this.documentService.getPodcast(documentId)
      
      if (!isSuccess(result)) {
        return this.handleError(result.error)
      }

      return NextResponse.json({
        success: true,
        data: result.data
      })
    } catch (error) {
      return this.handleUnexpectedError(error)
    }
  }

  async generatePodcast(request: NextRequest, { params }: { params: { assetId: string } }): Promise<NextResponse> {
    try {
      const { assetId } = params
      const documentId = createDocumentId(assetId)

      const result = await this.documentService.generatePodcast(documentId)
      
      if (!isSuccess(result)) {
        return this.handleError(result.error)
      }

      return NextResponse.json({
        success: true,
        data: result.data
      })
    } catch (error) {
      return this.handleUnexpectedError(error)
    }
  }

  // Search operations
  async searchDocument(request: NextRequest, { params }: { params: { assetId: string } }): Promise<NextResponse> {
    try {
      const { assetId } = params
      const documentId = createDocumentId(assetId)
      
      const { searchParams } = new URL(request.url)
      const query = searchParams.get('q')
      const caseSensitive = searchParams.get('caseSensitive') === 'true'
      const wholeWord = searchParams.get('wholeWord') === 'true'
      const pageNumber = searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined

      if (!query) {
        return NextResponse.json(
          { success: false, error: 'Search query is required' },
          { status: 400 }
        )
      }

      const searchQuery = {
        query,
        documentId,
        caseSensitive,
        wholeWord,
        pageNumber
      }

      const result = await this.documentService.searchDocument(searchQuery)
      
      if (!isSuccess(result)) {
        return this.handleError(result.error)
      }

      return NextResponse.json({
        success: true,
        data: result.data
      })
    } catch (error) {
      return this.handleUnexpectedError(error)
    }
  }

  // AI Chat operations
  async processChatMessage(request: NextRequest, { params }: { params: { assetId: string } }): Promise<NextResponse> {
    try {
      const { assetId } = params
      const documentId = createDocumentId(assetId)
      const body = await request.json()

      if (!body.message) {
        return NextResponse.json(
          { success: false, error: 'Message is required' },
          { status: 400 }
        )
      }

      const result = await this.documentService.processChatMessage(
        documentId,
        body.message,
        body.context
      )
      
      if (!isSuccess(result)) {
        return this.handleError(result.error)
      }

      return NextResponse.json({
        success: true,
        data: {
          message: result.data,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      return this.handleUnexpectedError(error)
    }
  }

  // Private helper methods
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

  private handleError(error: DocumentError): NextResponse {
    const status = this.getHttpStatusFromError(error)
    const friendlyMessage = getFriendlyErrorMessage(error)
    const severity = getErrorSeverity(error)

    // Log error for monitoring
    console.error(`Document API Error [${severity}]:`, {
      code: error.code,
      message: error.message,
      details: error.details
    })

    return NextResponse.json(
      {
        success: false,
        error: friendlyMessage,
        code: error.code,
        ...(process.env.NODE_ENV === 'development' && { details: error.details })
      },
      { status }
    )
  }

  private handleUnexpectedError(error: unknown): NextResponse {
    console.error('Unexpected Document API Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
        ...(process.env.NODE_ENV === 'development' && { 
          details: error instanceof Error ? error.message : String(error) 
        })
      },
      { status: 500 }
    )
  }

  private getHttpStatusFromError(error: DocumentError): number {
    switch (error.code) {
      case 'DOCUMENT_NOT_FOUND':
      case 'ANNOTATION_NOT_FOUND':
        return 404
      
      case 'ANNOTATION_ACCESS_DENIED':
      case 'USER_NOT_AUTHORIZED_FOR_COLLABORATION':
        return 403
      
      case 'VALIDATION_ERROR':
      case 'INVALID_ANNOTATION_POSITION':
      case 'SUMMARY_TYPE_NOT_SUPPORTED':
      case 'SEARCH_QUERY_TOO_COMPLEX':
      case 'INAPPROPRIATE_CONTENT':
        return 400
      
      case 'DOCUMENT_TOO_LARGE':
      case 'SUMMARY_TOO_LONG':
      case 'PODCAST_DURATION_EXCEEDED':
      case 'CONTEXT_TOO_LARGE':
        return 413
      
      case 'LLM_SERVICE_UNAVAILABLE':
      case 'LLM_TOC_SERVICE_UNAVAILABLE':
      case 'LLM_SUMMARY_SERVICE_UNAVAILABLE':
      case 'TTS_SERVICE_UNAVAILABLE':
        return 503
      
      default:
        return 500
    }
  }

  private createDefaultService(): DocumentService {
    // This is a fallback - in production, use dependency injection
    const supabase = createSupabaseServerClient()
    const repository = new DocumentRepository(supabase)
    return new DocumentService(repository)
  }
}

// Factory function for creating controller with proper dependencies
export async function createDocumentController(): Promise<DocumentController> {
  const supabase = await createSupabaseServerClient()
  const repository = new DocumentRepository(supabase)
  const service = new DocumentService(repository)
  return new DocumentController(service)
}