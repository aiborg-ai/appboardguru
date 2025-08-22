import { RepositoryError } from './result'
import { DocumentId, AnnotationId, TocId, SummaryId, PodcastId } from './document.repository'

/**
 * Document-specific error codes extending the base error system
 */
export enum DocumentErrorCode {
  // Document errors
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  DOCUMENT_PROCESSING_FAILED = 'DOCUMENT_PROCESSING_FAILED',
  DOCUMENT_CORRUPTED = 'DOCUMENT_CORRUPTED',
  DOCUMENT_TOO_LARGE = 'DOCUMENT_TOO_LARGE',
  UNSUPPORTED_DOCUMENT_TYPE = 'UNSUPPORTED_DOCUMENT_TYPE',
  
  // Annotation errors
  ANNOTATION_NOT_FOUND = 'ANNOTATION_NOT_FOUND',
  ANNOTATION_ACCESS_DENIED = 'ANNOTATION_ACCESS_DENIED',
  INVALID_ANNOTATION_POSITION = 'INVALID_ANNOTATION_POSITION',
  VOICE_ANNOTATION_PROCESSING_FAILED = 'VOICE_ANNOTATION_PROCESSING_FAILED',
  ANNOTATION_SHARING_FAILED = 'ANNOTATION_SHARING_FAILED',
  
  // Table of Contents errors
  TOC_GENERATION_FAILED = 'TOC_GENERATION_FAILED',
  TOC_NOT_AVAILABLE = 'TOC_NOT_AVAILABLE',
  LLM_TOC_SERVICE_UNAVAILABLE = 'LLM_TOC_SERVICE_UNAVAILABLE',
  
  // Summary errors
  SUMMARY_GENERATION_FAILED = 'SUMMARY_GENERATION_FAILED',
  SUMMARY_TYPE_NOT_SUPPORTED = 'SUMMARY_TYPE_NOT_SUPPORTED',
  LLM_SUMMARY_SERVICE_UNAVAILABLE = 'LLM_SUMMARY_SERVICE_UNAVAILABLE',
  SUMMARY_TOO_LONG = 'SUMMARY_TOO_LONG',
  
  // Podcast errors
  PODCAST_GENERATION_FAILED = 'PODCAST_GENERATION_FAILED',
  AUDIO_PROCESSING_FAILED = 'AUDIO_PROCESSING_FAILED',
  TTS_SERVICE_UNAVAILABLE = 'TTS_SERVICE_UNAVAILABLE',
  PODCAST_DURATION_EXCEEDED = 'PODCAST_DURATION_EXCEEDED',
  
  // Search errors
  SEARCH_FAILED = 'SEARCH_FAILED',
  SEARCH_INDEX_NOT_AVAILABLE = 'SEARCH_INDEX_NOT_AVAILABLE',
  SEARCH_QUERY_TOO_COMPLEX = 'SEARCH_QUERY_TOO_COMPLEX',
  
  // Collaboration errors
  COLLABORATION_SETUP_FAILED = 'COLLABORATION_SETUP_FAILED',
  USER_NOT_AUTHORIZED_FOR_COLLABORATION = 'USER_NOT_AUTHORIZED_FOR_COLLABORATION',
  REAL_TIME_SYNC_FAILED = 'REAL_TIME_SYNC_FAILED',
  
  // AI Chat errors
  AI_CHAT_FAILED = 'AI_CHAT_FAILED',
  LLM_SERVICE_UNAVAILABLE = 'LLM_SERVICE_UNAVAILABLE',
  CONTEXT_TOO_LARGE = 'CONTEXT_TOO_LARGE',
  INAPPROPRIATE_CONTENT = 'INAPPROPRIATE_CONTENT'
}

/**
 * Document-specific error factory extending RepositoryError
 */
export class DocumentError extends RepositoryError {
  static document = {
    notFound: (documentId: DocumentId): DocumentError => {
      return new DocumentError(
        `Document not found: ${documentId}`,
        DocumentErrorCode.DOCUMENT_NOT_FOUND,
        { documentId }
      )
    },

    processingFailed: (documentId: DocumentId, reason: string): DocumentError => {
      return new DocumentError(
        `Document processing failed: ${reason}`,
        DocumentErrorCode.DOCUMENT_PROCESSING_FAILED,
        { documentId, reason }
      )
    },

    corrupted: (documentId: DocumentId, details?: string): DocumentError => {
      return new DocumentError(
        `Document is corrupted${details ? `: ${details}` : ''}`,
        DocumentErrorCode.DOCUMENT_CORRUPTED,
        { documentId, details }
      )
    },

    tooLarge: (documentId: DocumentId, size: number, maxSize: number): DocumentError => {
      return new DocumentError(
        `Document size ${size} bytes exceeds maximum ${maxSize} bytes`,
        DocumentErrorCode.DOCUMENT_TOO_LARGE,
        { documentId, size, maxSize }
      )
    },

    unsupportedType: (documentId: DocumentId, fileType: string): DocumentError => {
      return new DocumentError(
        `Unsupported document type: ${fileType}`,
        DocumentErrorCode.UNSUPPORTED_DOCUMENT_TYPE,
        { documentId, fileType }
      )
    }
  }

  static annotation = {
    notFound: (annotationId: AnnotationId): DocumentError => {
      return new DocumentError(
        `Annotation not found: ${annotationId}`,
        DocumentErrorCode.ANNOTATION_NOT_FOUND,
        { annotationId }
      )
    },

    accessDenied: (annotationId: AnnotationId, userId: string, action: string): DocumentError => {
      return new DocumentError(
        `Access denied for ${action} on annotation ${annotationId}`,
        DocumentErrorCode.ANNOTATION_ACCESS_DENIED,
        { annotationId, userId, action }
      )
    },

    invalidPosition: (position: any): DocumentError => {
      return new DocumentError(
        'Invalid annotation position data',
        DocumentErrorCode.INVALID_ANNOTATION_POSITION,
        { position }
      )
    },

    voiceProcessingFailed: (reason: string): DocumentError => {
      return new DocumentError(
        `Voice annotation processing failed: ${reason}`,
        DocumentErrorCode.VOICE_ANNOTATION_PROCESSING_FAILED,
        { reason }
      )
    },

    sharingFailed: (annotationId: AnnotationId, reason: string): DocumentError => {
      return new DocumentError(
        `Failed to share annotation: ${reason}`,
        DocumentErrorCode.ANNOTATION_SHARING_FAILED,
        { annotationId, reason }
      )
    }
  }

  static toc = {
    generationFailed: (documentId: DocumentId, reason: string): DocumentError => {
      return new DocumentError(
        `TOC generation failed: ${reason}`,
        DocumentErrorCode.TOC_GENERATION_FAILED,
        { documentId, reason }
      )
    },

    notAvailable: (documentId: DocumentId): DocumentError => {
      return new DocumentError(
        'Table of contents not available for this document',
        DocumentErrorCode.TOC_NOT_AVAILABLE,
        { documentId }
      )
    },

    llmServiceUnavailable: (service: string): DocumentError => {
      return new DocumentError(
        `LLM service for TOC generation unavailable: ${service}`,
        DocumentErrorCode.LLM_TOC_SERVICE_UNAVAILABLE,
        { service }
      )
    }
  }

  static summary = {
    generationFailed: (documentId: DocumentId, summaryType: string, reason: string): DocumentError => {
      return new DocumentError(
        `Summary generation failed for type ${summaryType}: ${reason}`,
        DocumentErrorCode.SUMMARY_GENERATION_FAILED,
        { documentId, summaryType, reason }
      )
    },

    typeNotSupported: (summaryType: string): DocumentError => {
      return new DocumentError(
        `Summary type not supported: ${summaryType}`,
        DocumentErrorCode.SUMMARY_TYPE_NOT_SUPPORTED,
        { summaryType }
      )
    },

    llmServiceUnavailable: (service: string): DocumentError => {
      return new DocumentError(
        `LLM service for summary generation unavailable: ${service}`,
        DocumentErrorCode.LLM_SUMMARY_SERVICE_UNAVAILABLE,
        { service }
      )
    },

    tooLong: (wordCount: number, maxWords: number): DocumentError => {
      return new DocumentError(
        `Summary too long: ${wordCount} words exceeds maximum ${maxWords}`,
        DocumentErrorCode.SUMMARY_TOO_LONG,
        { wordCount, maxWords }
      )
    }
  }

  static podcast = {
    generationFailed: (documentId: DocumentId, reason: string): DocumentError => {
      return new DocumentError(
        `Podcast generation failed: ${reason}`,
        DocumentErrorCode.PODCAST_GENERATION_FAILED,
        { documentId, reason }
      )
    },

    audioProcessingFailed: (reason: string): DocumentError => {
      return new DocumentError(
        `Audio processing failed: ${reason}`,
        DocumentErrorCode.AUDIO_PROCESSING_FAILED,
        { reason }
      )
    },

    ttsServiceUnavailable: (service: string): DocumentError => {
      return new DocumentError(
        `Text-to-speech service unavailable: ${service}`,
        DocumentErrorCode.TTS_SERVICE_UNAVAILABLE,
        { service }
      )
    },

    durationExceeded: (duration: number, maxDuration: number): DocumentError => {
      return new DocumentError(
        `Podcast duration ${duration}s exceeds maximum ${maxDuration}s`,
        DocumentErrorCode.PODCAST_DURATION_EXCEEDED,
        { duration, maxDuration }
      )
    }
  }

  static search = {
    failed: (query: string, reason: string): DocumentError => {
      return new DocumentError(
        `Search failed for query "${query}": ${reason}`,
        DocumentErrorCode.SEARCH_FAILED,
        { query, reason }
      )
    },

    indexNotAvailable: (documentId: DocumentId): DocumentError => {
      return new DocumentError(
        'Search index not available for this document',
        DocumentErrorCode.SEARCH_INDEX_NOT_AVAILABLE,
        { documentId }
      )
    },

    queryTooComplex: (query: string): DocumentError => {
      return new DocumentError(
        `Search query too complex: ${query}`,
        DocumentErrorCode.SEARCH_QUERY_TOO_COMPLEX,
        { query }
      )
    }
  }

  static collaboration = {
    setupFailed: (documentId: DocumentId, reason: string): DocumentError => {
      return new DocumentError(
        `Collaboration setup failed: ${reason}`,
        DocumentErrorCode.COLLABORATION_SETUP_FAILED,
        { documentId, reason }
      )
    },

    notAuthorized: (userId: string, documentId: DocumentId): DocumentError => {
      return new DocumentError(
        'User not authorized for collaboration on this document',
        DocumentErrorCode.USER_NOT_AUTHORIZED_FOR_COLLABORATION,
        { userId, documentId }
      )
    },

    realTimeSyncFailed: (reason: string): DocumentError => {
      return new DocumentError(
        `Real-time sync failed: ${reason}`,
        DocumentErrorCode.REAL_TIME_SYNC_FAILED,
        { reason }
      )
    }
  }

  static aiChat = {
    failed: (reason: string): DocumentError => {
      return new DocumentError(
        `AI chat failed: ${reason}`,
        DocumentErrorCode.AI_CHAT_FAILED,
        { reason }
      )
    },

    llmServiceUnavailable: (service: string): DocumentError => {
      return new DocumentError(
        `LLM service unavailable: ${service}`,
        DocumentErrorCode.LLM_SERVICE_UNAVAILABLE,
        { service }
      )
    },

    contextTooLarge: (contextSize: number, maxSize: number): DocumentError => {
      return new DocumentError(
        `Context size ${contextSize} exceeds maximum ${maxSize}`,
        DocumentErrorCode.CONTEXT_TOO_LARGE,
        { contextSize, maxSize }
      )
    },

    inappropriateContent: (reason: string): DocumentError => {
      return new DocumentError(
        `Content flagged as inappropriate: ${reason}`,
        DocumentErrorCode.INAPPROPRIATE_CONTENT,
        { reason }
      )
    }
  }
}

/**
 * Type guards for document errors
 */
export const isDocumentError = (error: unknown): error is DocumentError => {
  return error instanceof DocumentError
}

export const isDocumentErrorCode = (error: unknown, code: DocumentErrorCode): boolean => {
  return isDocumentError(error) && error.code === code
}

/**
 * Error recovery utilities
 */
export const getRecoveryAction = (error: DocumentError): string | null => {
  switch (error.code) {
    case DocumentErrorCode.DOCUMENT_NOT_FOUND:
      return 'refresh_and_retry'
    
    case DocumentErrorCode.LLM_TOC_SERVICE_UNAVAILABLE:
    case DocumentErrorCode.LLM_SUMMARY_SERVICE_UNAVAILABLE:
    case DocumentErrorCode.TTS_SERVICE_UNAVAILABLE:
    case DocumentErrorCode.LLM_SERVICE_UNAVAILABLE:
      return 'retry_later'
    
    case DocumentErrorCode.DOCUMENT_TOO_LARGE:
    case DocumentErrorCode.SUMMARY_TOO_LONG:
    case DocumentErrorCode.PODCAST_DURATION_EXCEEDED:
    case DocumentErrorCode.CONTEXT_TOO_LARGE:
      return 'reduce_size'
    
    case DocumentErrorCode.UNSUPPORTED_DOCUMENT_TYPE:
      return 'convert_format'
    
    case DocumentErrorCode.ANNOTATION_ACCESS_DENIED:
    case DocumentErrorCode.USER_NOT_AUTHORIZED_FOR_COLLABORATION:
      return 'request_permission'
    
    case DocumentErrorCode.SEARCH_QUERY_TOO_COMPLEX:
      return 'simplify_query'
    
    case DocumentErrorCode.INAPPROPRIATE_CONTENT:
      return 'modify_content'
    
    default:
      return 'retry'
  }
}

/**
 * User-friendly error messages
 */
export const getFriendlyErrorMessage = (error: DocumentError): string => {
  switch (error.code) {
    case DocumentErrorCode.DOCUMENT_NOT_FOUND:
      return 'The document you are looking for could not be found. It may have been moved or deleted.'
    
    case DocumentErrorCode.DOCUMENT_PROCESSING_FAILED:
      return 'We encountered an issue while processing your document. Please try again.'
    
    case DocumentErrorCode.DOCUMENT_CORRUPTED:
      return 'This document appears to be corrupted and cannot be opened.'
    
    case DocumentErrorCode.DOCUMENT_TOO_LARGE:
      return 'This document is too large to process. Please try with a smaller file.'
    
    case DocumentErrorCode.UNSUPPORTED_DOCUMENT_TYPE:
      return 'This document type is not supported. Please try with a PDF, Word, or text file.'
    
    case DocumentErrorCode.ANNOTATION_NOT_FOUND:
      return 'The annotation you are looking for could not be found.'
    
    case DocumentErrorCode.ANNOTATION_ACCESS_DENIED:
      return 'You do not have permission to access this annotation.'
    
    case DocumentErrorCode.TOC_GENERATION_FAILED:
      return 'We could not generate a table of contents for this document.'
    
    case DocumentErrorCode.SUMMARY_GENERATION_FAILED:
      return 'We could not generate a summary for this document. Please try again later.'
    
    case DocumentErrorCode.PODCAST_GENERATION_FAILED:
      return 'We could not generate a podcast from this document. Please try again later.'
    
    case DocumentErrorCode.SEARCH_FAILED:
      return 'Search could not be completed. Please try with different keywords.'
    
    case DocumentErrorCode.AI_CHAT_FAILED:
      return 'AI chat is temporarily unavailable. Please try again in a few moments.'
    
    case DocumentErrorCode.LLM_SERVICE_UNAVAILABLE:
    case DocumentErrorCode.LLM_TOC_SERVICE_UNAVAILABLE:
    case DocumentErrorCode.LLM_SUMMARY_SERVICE_UNAVAILABLE:
    case DocumentErrorCode.TTS_SERVICE_UNAVAILABLE:
      return 'AI services are temporarily unavailable. Please try again later.'
    
    case DocumentErrorCode.COLLABORATION_SETUP_FAILED:
      return 'Could not set up collaboration for this document. Please try again.'
    
    case DocumentErrorCode.INAPPROPRIATE_CONTENT:
      return 'The content was flagged as inappropriate and cannot be processed.'
    
    default:
      return error.message || 'An unexpected error occurred. Please try again.'
  }
}

/**
 * Error severity levels for logging and alerting
 */
export const getErrorSeverity = (error: DocumentError): 'low' | 'medium' | 'high' | 'critical' => {
  switch (error.code) {
    case DocumentErrorCode.DOCUMENT_CORRUPTED:
    case DocumentErrorCode.LLM_SERVICE_UNAVAILABLE:
    case DocumentErrorCode.LLM_TOC_SERVICE_UNAVAILABLE:
    case DocumentErrorCode.LLM_SUMMARY_SERVICE_UNAVAILABLE:
    case DocumentErrorCode.TTS_SERVICE_UNAVAILABLE:
      return 'critical'
    
    case DocumentErrorCode.DOCUMENT_PROCESSING_FAILED:
    case DocumentErrorCode.TOC_GENERATION_FAILED:
    case DocumentErrorCode.SUMMARY_GENERATION_FAILED:
    case DocumentErrorCode.PODCAST_GENERATION_FAILED:
    case DocumentErrorCode.COLLABORATION_SETUP_FAILED:
      return 'high'
    
    case DocumentErrorCode.DOCUMENT_NOT_FOUND:
    case DocumentErrorCode.ANNOTATION_NOT_FOUND:
    case DocumentErrorCode.ANNOTATION_ACCESS_DENIED:
    case DocumentErrorCode.SEARCH_FAILED:
    case DocumentErrorCode.AI_CHAT_FAILED:
      return 'medium'
    
    default:
      return 'low'
  }
}