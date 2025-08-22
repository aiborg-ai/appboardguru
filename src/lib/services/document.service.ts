import { 
  DocumentRepository,
  DocumentMetadata,
  DocumentAnnotation,
  DocumentTableOfContents,
  DocumentSummary,
  DocumentPodcast,
  DocumentSearchResult,
  CreateDocumentAnnotationData,
  UpdateDocumentAnnotationData,
  CreateDocumentSummaryData,
  CreateDocumentPodcastData,
  DocumentSearchQuery,
  DocumentId,
  AnnotationId,
  createDocumentId
} from '../repositories/document.repository'
import { DocumentError } from '../repositories/document-errors'
import { Result, success, failure, wrapAsync, mapResult, flatMapResult } from '../repositories/result'
import { QueryOptions, PaginatedResult, AssetId } from '../repositories/types'

/**
 * Business logic for document operations
 * Sits between controllers and repositories
 */
export class DocumentService {
  constructor(private documentRepository: DocumentRepository) {}

  // Document metadata operations
  async getDocumentByAssetId(assetId: AssetId): Promise<Result<DocumentMetadata>> {
    return wrapAsync(async () => {
      const result = await this.documentRepository.findDocumentByAssetId(assetId)
      if (!result.success) {
        throw result.error
      }

      if (!result.data) {
        throw DocumentError.document.notFound(createDocumentId(assetId))
      }

      return result.data
    })
  }

  // Annotation business logic
  async getAnnotations(
    documentId: DocumentId,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<DocumentAnnotation>>> {
    return this.documentRepository.findAnnotationsByDocument(documentId, options)
  }

  async createAnnotation(data: CreateDocumentAnnotationData): Promise<Result<DocumentAnnotation>> {
    return wrapAsync(async () => {
      // Validate annotation data
      const validationResult = this.validateAnnotationData(data)
      if (!validationResult.success) {
        throw validationResult.error
      }

      // Create annotation
      const result = await this.documentRepository.createAnnotation(data)
      if (!result.success) {
        throw result.error
      }

      // Log activity for audit trail
      await this.logAnnotationActivity('create', result.data.id, data.content)

      return result.data
    })
  }

  async updateAnnotation(
    annotationId: AnnotationId,
    data: UpdateDocumentAnnotationData
  ): Promise<Result<DocumentAnnotation>> {
    return wrapAsync(async () => {
      // Validate update data
      if (data.content !== undefined) {
        const validationResult = this.validateAnnotationContent(data.content)
        if (!validationResult.success) {
          throw validationResult.error
        }
      }

      // Update annotation
      const result = await this.documentRepository.updateAnnotation(annotationId, data)
      if (!result.success) {
        throw result.error
      }

      // Log activity
      await this.logAnnotationActivity('update', annotationId, data.content)

      return result.data
    })
  }

  async deleteAnnotation(annotationId: AnnotationId): Promise<Result<void>> {
    return wrapAsync(async () => {
      const result = await this.documentRepository.deleteAnnotation(annotationId)
      if (!result.success) {
        throw result.error
      }

      // Log activity
      await this.logAnnotationActivity('delete', annotationId)

      return result.data
    })
  }

  async shareAnnotation(
    annotationId: AnnotationId,
    userIds: string[]
  ): Promise<Result<DocumentAnnotation>> {
    return wrapAsync(async () => {
      // Validate sharing permissions
      if (userIds.length === 0) {
        throw DocumentError.annotation.sharingFailed(annotationId, 'No users specified')
      }

      if (userIds.length > 50) {
        throw DocumentError.annotation.sharingFailed(annotationId, 'Too many users specified')
      }

      // Update annotation with shared users
      const result = await this.documentRepository.updateAnnotation(annotationId, {
        isShared: true,
        sharedWith: userIds
      })

      if (!result.success) {
        throw result.error
      }

      // Log sharing activity
      await this.logAnnotationActivity('share', annotationId, `Shared with ${userIds.length} users`)

      return result.data
    })
  }

  // Table of Contents business logic
  async getTableOfContents(documentId: DocumentId): Promise<Result<DocumentTableOfContents[]>> {
    return this.documentRepository.findTocByDocument(documentId)
  }

  async generateTableOfContents(documentId: DocumentId): Promise<Result<DocumentTableOfContents[]>> {
    return wrapAsync(async () => {
      // Get document metadata
      const docResult = await this.documentRepository.findDocumentByAssetId(documentId as AssetId)
      if (!docResult.success || !docResult.data) {
        throw DocumentError.document.notFound(documentId)
      }

      const document = docResult.data

      // Check if document supports TOC generation
      if (!this.isTocGenerationSupported(document.fileType)) {
        throw DocumentError.toc.notAvailable(documentId)
      }

      try {
        // Generate TOC using LLM service
        const tocEntries = await this.generateTocWithLLM(document)

        // Save TOC entries
        const result = await this.documentRepository.createTocEntries(documentId, tocEntries)
        if (!result.success) {
          throw result.error
        }

        return result.data
      } catch (error) {
        if (error instanceof DocumentError) {
          throw error
        }
        throw DocumentError.toc.generationFailed(documentId, error instanceof Error ? error.message : 'Unknown error')
      }
    })
  }

  // Summary business logic
  async getSummaries(
    documentId: DocumentId,
    summaryType?: 'executive' | 'detailed' | 'bullet_points' | 'key_insights'
  ): Promise<Result<DocumentSummary[]>> {
    return this.documentRepository.findSummariesByDocument(documentId, summaryType)
  }

  async generateSummary(
    documentId: DocumentId,
    summaryType: 'executive' | 'detailed' | 'bullet_points' | 'key_insights'
  ): Promise<Result<DocumentSummary>> {
    return wrapAsync(async () => {
      // Get document metadata
      const docResult = await this.documentRepository.findDocumentByAssetId(documentId as AssetId)
      if (!docResult.success || !docResult.data) {
        throw DocumentError.document.notFound(documentId)
      }

      const document = docResult.data

      // Check if document supports summary generation
      if (!this.isSummaryGenerationSupported(document.fileType)) {
        throw DocumentError.summary.typeNotSupported(summaryType)
      }

      try {
        // Generate summary using LLM service
        const summaryContent = await this.generateSummaryWithLLM(document, summaryType)

        // Validate summary length
        const wordCount = summaryContent.split(/\s+/).length
        if (wordCount > this.getMaxSummaryWords(summaryType)) {
          throw DocumentError.summary.tooLong(wordCount, this.getMaxSummaryWords(summaryType))
        }

        // Save summary
        const summaryData: CreateDocumentSummaryData = {
          documentId,
          summaryType,
          content: summaryContent,
          generatedBy: 'llm',
          llmModel: 'gpt-4'
        }

        const result = await this.documentRepository.createSummary(summaryData)
        if (!result.success) {
          throw result.error
        }

        return result.data
      } catch (error) {
        if (error instanceof DocumentError) {
          throw error
        }
        throw DocumentError.summary.generationFailed(documentId, summaryType, error instanceof Error ? error.message : 'Unknown error')
      }
    })
  }

  // Podcast business logic
  async getPodcast(documentId: DocumentId): Promise<Result<DocumentPodcast | null>> {
    return this.documentRepository.findPodcastByDocument(documentId)
  }

  async generatePodcast(documentId: DocumentId): Promise<Result<DocumentPodcast>> {
    return wrapAsync(async () => {
      // Get document metadata
      const docResult = await this.documentRepository.findDocumentByAssetId(documentId as AssetId)
      if (!docResult.success || !docResult.data) {
        throw DocumentError.document.notFound(documentId)
      }

      const document = docResult.data

      // Check if document supports podcast generation
      if (!this.isPodcastGenerationSupported(document.fileType)) {
        throw DocumentError.podcast.generationFailed(documentId, 'Document type not supported for podcast generation')
      }

      try {
        // Generate podcast using TTS service
        const podcastData = await this.generatePodcastWithTTS(document)

        // Validate podcast duration (max 3 minutes = 180 seconds)
        if (podcastData.duration > 180) {
          throw DocumentError.podcast.durationExceeded(podcastData.duration, 180)
        }

        // Save podcast
        const result = await this.documentRepository.createPodcast(podcastData)
        if (!result.success) {
          throw result.error
        }

        return result.data
      } catch (error) {
        if (error instanceof DocumentError) {
          throw error
        }
        throw DocumentError.podcast.generationFailed(documentId, error instanceof Error ? error.message : 'Unknown error')
      }
    })
  }

  // Search business logic
  async searchDocument(searchQuery: DocumentSearchQuery): Promise<Result<DocumentSearchResult[]>> {
    return wrapAsync(async () => {
      // Validate search query
      if (!searchQuery.query || searchQuery.query.trim().length < 2) {
        throw DocumentError.search.failed(searchQuery.query, 'Query too short')
      }

      if (searchQuery.query.length > 500) {
        throw DocumentError.search.queryTooComplex(searchQuery.query)
      }

      // Perform search
      const result = await this.documentRepository.searchDocument(searchQuery)
      if (!result.success) {
        throw result.error
      }

      // Sort results by relevance score
      const sortedResults = result.data.sort((a, b) => b.score - a.score)

      return sortedResults
    })
  }

  // AI Chat business logic
  async processChatMessage(
    documentId: DocumentId,
    message: string,
    context?: {
      pageNumber?: number
      selectedText?: string
      annotations?: string[]
    }
  ): Promise<Result<string>> {
    return wrapAsync(async () => {
      // Validate message
      if (!message || message.trim().length === 0) {
        throw DocumentError.aiChat.failed('Empty message')
      }

      if (message.length > 4000) {
        throw DocumentError.aiChat.contextTooLarge(message.length, 4000)
      }

      // Check for inappropriate content
      if (this.containsInappropriateContent(message)) {
        throw DocumentError.aiChat.inappropriateContent('Message contains inappropriate content')
      }

      // Get document metadata
      const docResult = await this.documentRepository.findDocumentByAssetId(documentId as AssetId)
      if (!docResult.success || !docResult.data) {
        throw DocumentError.document.notFound(documentId)
      }

      try {
        // Process with LLM service
        const response = await this.processChatWithLLM(docResult.data, message, context)
        return response
      } catch (error) {
        throw DocumentError.aiChat.llmServiceUnavailable('OpenAI GPT-4')
      }
    })
  }

  // Private helper methods
  private validateAnnotationData(data: CreateDocumentAnnotationData): Result<void> {
    if (!data.content || data.content.trim().length === 0) {
      return failure(DocumentError.annotation.invalidPosition('Content is required'))
    }

    if (data.content.length > 5000) {
      return failure(DocumentError.annotation.invalidPosition('Content too long'))
    }

    if (data.positionData && !this.isValidPosition(data.positionData)) {
      return failure(DocumentError.annotation.invalidPosition(data.positionData))
    }

    return success(undefined)
  }

  private validateAnnotationContent(content: string): Result<void> {
    if (!content || content.trim().length === 0) {
      return failure(DocumentError.annotation.invalidPosition('Content is required'))
    }

    if (content.length > 5000) {
      return failure(DocumentError.annotation.invalidPosition('Content too long'))
    }

    return success(undefined)
  }

  private isValidPosition(position: any): boolean {
    return (
      typeof position === 'object' &&
      typeof position.x === 'number' &&
      typeof position.y === 'number' &&
      position.x >= 0 &&
      position.y >= 0
    )
  }

  private isTocGenerationSupported(fileType: string): boolean {
    return ['pdf', 'docx', 'doc', 'txt', 'md'].includes(fileType.toLowerCase())
  }

  private isSummaryGenerationSupported(fileType: string): boolean {
    return ['pdf', 'docx', 'doc', 'txt', 'md'].includes(fileType.toLowerCase())
  }

  private isPodcastGenerationSupported(fileType: string): boolean {
    return ['pdf', 'docx', 'doc', 'txt', 'md'].includes(fileType.toLowerCase())
  }

  private getMaxSummaryWords(summaryType: string): number {
    switch (summaryType) {
      case 'executive': return 200
      case 'detailed': return 1000
      case 'bullet_points': return 300
      case 'key_insights': return 500
      default: return 500
    }
  }

  private containsInappropriateContent(message: string): boolean {
    // Simple content filtering - in production, use a proper content moderation service
    const inappropriateWords = ['spam', 'abuse', 'inappropriate']
    return inappropriateWords.some(word => message.toLowerCase().includes(word))
  }

  private async logAnnotationActivity(action: string, annotationId: AnnotationId, content?: string): Promise<void> {
    // Implement activity logging
    console.log(`Annotation ${action}: ${annotationId}`, content)
  }

  // LLM integration methods (to be implemented with actual services)
  private async generateTocWithLLM(document: DocumentMetadata): Promise<Omit<DocumentTableOfContents, 'id' | 'documentId' | 'createdAt'>[]> {
    // Mock implementation - replace with actual LLM service call
    return [
      {
        title: 'Introduction',
        level: 1,
        pageNumber: 1,
        section: '1',
        generatedByLlm: true
      },
      {
        title: 'Main Content',
        level: 1,
        pageNumber: 2,
        section: '2',
        generatedByLlm: true
      },
      {
        title: 'Subsection',
        level: 2,
        pageNumber: 3,
        section: '2',
        subsection: '2.1',
        generatedByLlm: true
      },
      {
        title: 'Conclusion',
        level: 1,
        pageNumber: 4,
        section: '3',
        generatedByLlm: true
      }
    ]
  }

  private async generateSummaryWithLLM(document: DocumentMetadata, summaryType: string): Promise<string> {
    // Mock implementation - replace with actual LLM service call
    const summaries = {
      executive: `Executive summary of ${document.filename}: This document contains important information...`,
      detailed: `Detailed summary of ${document.filename}: This comprehensive document covers multiple aspects...`,
      bullet_points: `• Key point 1 from ${document.filename}\n• Key point 2\n• Key point 3`,
      key_insights: `Key insights from ${document.filename}: The main insights reveal...`
    }
    
    return summaries[summaryType as keyof typeof summaries] || summaries.executive
  }

  private async generatePodcastWithTTS(document: DocumentMetadata): Promise<CreateDocumentPodcastData> {
    // Mock implementation - replace with actual TTS service call
    return {
      documentId: document.id,
      title: `Podcast: ${document.filename}`,
      description: `AI-generated podcast summary of ${document.filename}`,
      audioUrl: `/api/podcasts/${document.id}/audio.mp3`, // Would be actual audio URL
      duration: 120, // 2 minutes
      transcript: `This is an AI-generated podcast summary of ${document.filename}...`,
      llmModel: 'gpt-4-tts'
    }
  }

  private async processChatWithLLM(
    document: DocumentMetadata,
    message: string,
    context?: any
  ): Promise<string> {
    // Mock implementation - replace with actual LLM service call
    return `Based on the document "${document.filename}", here is my response to your question: "${message}". ${context ? 'I have considered the context you provided.' : ''}`
  }
}