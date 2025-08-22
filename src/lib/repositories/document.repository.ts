import { BaseRepository } from './base.repository'
import { Result, success, failure, RepositoryError, wrapAsync } from './result'
import { 
  QueryOptions, 
  PaginatedResult, 
  createAssetId,
  AssetId,
  UserId,
  OrganizationId
} from './types'
import { Database } from '@/types/database'
import { SupabaseClient } from '@supabase/supabase-js'

// Document-specific branded types
export type DocumentId = string & { __brand: 'DocumentId' }
export type AnnotationId = string & { __brand: 'AnnotationId' }
export type TocId = string & { __brand: 'TocId' }
export type SummaryId = string & { __brand: 'SummaryId' }
export type PodcastId = string & { __brand: 'PodcastId' }

// Type constructors
export const createDocumentId = (id: string): DocumentId => id as DocumentId
export const createAnnotationId = (id: string): AnnotationId => id as AnnotationId
export const createTocId = (id: string): TocId => id as TocId
export const createSummaryId = (id: string): SummaryId => id as SummaryId
export const createPodcastId = (id: string): PodcastId => id as PodcastId

// Document interfaces
export interface DocumentMetadata {
  id: DocumentId
  assetId: AssetId
  filename: string
  fileType: string
  fileSize: number
  fileUrl: string
  totalPages: number
  organizationId: OrganizationId
  vaultId?: string
  uploadedBy: UserId
  createdAt: string
  updatedAt: string
}

export interface DocumentAnnotation {
  id: AnnotationId
  documentId: DocumentId
  userId: UserId
  annotationType: 'comment' | 'question' | 'note' | 'voice'
  content: string
  positionData?: Record<string, any>
  highlightedText?: string
  pageNumber?: number
  voiceUrl?: string
  isShared: boolean
  sharedWith: string[]
  createdAt: string
  updatedAt: string
  user: {
    id: string
    fullName: string
    avatarUrl?: string
  }
  replies: DocumentAnnotationReply[]
}

export interface DocumentAnnotationReply {
  id: string
  annotationId: AnnotationId
  userId: UserId
  content: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    fullName: string
    avatarUrl?: string
  }
}

export interface DocumentTableOfContents {
  id: TocId
  documentId: DocumentId
  title: string
  level: number
  pageNumber: number
  section: string
  subsection?: string
  createdAt: string
  generatedByLlm: boolean
}

export interface DocumentSummary {
  id: SummaryId
  documentId: DocumentId
  summaryType: 'executive' | 'detailed' | 'bullet_points' | 'key_insights'
  content: string
  wordCount: number
  generatedBy: 'llm' | 'user'
  llmModel?: string
  createdAt: string
  updatedAt: string
}

export interface DocumentPodcast {
  id: PodcastId
  documentId: DocumentId
  title: string
  description: string
  audioUrl: string
  duration: number // in seconds
  transcript: string
  generatedBy: 'llm'
  llmModel: string
  status: 'generating' | 'completed' | 'failed'
  createdAt: string
  updatedAt: string
}

export interface DocumentSearchResult {
  documentId: DocumentId
  pageNumber: number
  matchText: string
  contextBefore: string
  contextAfter: string
  score: number
  position: {
    x: number
    y: number
    width: number
    height: number
  }
}

// Create interfaces
export interface CreateDocumentAnnotationData {
  documentId: DocumentId
  annotationType: 'comment' | 'question' | 'note' | 'voice'
  content: string
  positionData?: Record<string, any>
  highlightedText?: string
  pageNumber?: number
  voiceUrl?: string
  isShared?: boolean
  sharedWith?: string[]
}

export interface UpdateDocumentAnnotationData {
  content?: string
  positionData?: Record<string, any>
  highlightedText?: string
  voiceUrl?: string
  isShared?: boolean
  sharedWith?: string[]
}

export interface CreateDocumentSummaryData {
  documentId: DocumentId
  summaryType: 'executive' | 'detailed' | 'bullet_points' | 'key_insights'
  content: string
  generatedBy: 'llm' | 'user'
  llmModel?: string
}

export interface CreateDocumentPodcastData {
  documentId: DocumentId
  title: string
  description: string
  audioUrl: string
  duration: number
  transcript: string
  llmModel: string
}

export interface DocumentSearchQuery {
  query: string
  documentId?: DocumentId
  pageNumber?: number
  caseSensitive?: boolean
  wholeWord?: boolean
}

export class DocumentRepository extends BaseRepository {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
  }

  protected getEntityName(): string {
    return 'Document'
  }

  protected getSearchFields(): string[] {
    return ['filename', 'content']
  }

  // Document metadata operations
  async findDocumentByAssetId(assetId: AssetId): Promise<Result<DocumentMetadata | null>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('vault_assets')
        .select(`
          asset_id,
          filename,
          file_type,
          file_size,
          file_url,
          vault_id,
          organization_id,
          uploaded_by,
          created_at,
          updated_at,
          metadata
        `)
        .eq('asset_id', assetId)
        .single()

      if (error) {
        return this.createResult(null, error, 'findDocumentByAssetId').data
      }

      if (!data) {
        return null
      }

      const metadata: DocumentMetadata = {
        id: createDocumentId(data.asset_id),
        assetId: createAssetId(data.asset_id),
        filename: data.filename,
        fileType: data.file_type,
        fileSize: data.file_size,
        fileUrl: data.file_url,
        totalPages: data.metadata?.totalPages || 1,
        organizationId: data.organization_id as OrganizationId,
        vaultId: data.vault_id || undefined,
        uploadedBy: data.uploaded_by as UserId,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }

      return metadata
    })
  }

  // Annotation operations
  async findAnnotationsByDocument(
    documentId: DocumentId, 
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<DocumentAnnotation>>> {
    return wrapAsync(async () => {
      let query = this.supabase
        .from('document_annotations')
        .select(`
          id,
          document_id,
          user_id,
          annotation_type,
          content,
          position_data,
          highlighted_text,
          page_number,
          voice_url,
          is_shared,
          shared_with,
          created_at,
          updated_at,
          profiles!document_annotations_user_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `, { count: 'exact' })
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })

      query = this.applyQueryOptions(query, options)

      const { data, error, count } = await query

      if (error) {
        return this.createPaginatedResult([], null, options, error).data
      }

      const annotations: DocumentAnnotation[] = (data || []).map((row: any) => ({
        id: createAnnotationId(row.id),
        documentId: createDocumentId(row.document_id),
        userId: row.user_id as UserId,
        annotationType: row.annotation_type,
        content: row.content,
        positionData: row.position_data,
        highlightedText: row.highlighted_text,
        pageNumber: row.page_number,
        voiceUrl: row.voice_url,
        isShared: row.is_shared || false,
        sharedWith: row.shared_with || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        user: {
          id: row.profiles?.id || row.user_id,
          fullName: row.profiles?.full_name || 'Unknown User',
          avatarUrl: row.profiles?.avatar_url
        },
        replies: [] // Will be loaded separately if needed
      }))

      return this.createPaginatedResult(annotations, count, options).data
    })
  }

  async createAnnotation(data: CreateDocumentAnnotationData): Promise<Result<DocumentAnnotation>> {
    return wrapAsync(async () => {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) {
        throw userResult.error
      }

      const insertData = {
        document_id: data.documentId,
        user_id: userResult.data,
        annotation_type: data.annotationType,
        content: data.content,
        position_data: data.positionData,
        highlighted_text: data.highlightedText,
        page_number: data.pageNumber,
        voice_url: data.voiceUrl,
        is_shared: data.isShared || false,
        shared_with: data.sharedWith || []
      }

      const { data: newAnnotation, error } = await this.supabase
        .from('document_annotations')
        .insert(insertData)
        .select(`
          id,
          document_id,
          user_id,
          annotation_type,
          content,
          position_data,
          highlighted_text,
          page_number,
          voice_url,
          is_shared,
          shared_with,
          created_at,
          updated_at,
          profiles!document_annotations_user_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .single()

      if (error) {
        return this.createResult(null, error, 'createAnnotation').data
      }

      const annotation: DocumentAnnotation = {
        id: createAnnotationId(newAnnotation.id),
        documentId: createDocumentId(newAnnotation.document_id),
        userId: newAnnotation.user_id as UserId,
        annotationType: newAnnotation.annotation_type,
        content: newAnnotation.content,
        positionData: newAnnotation.position_data,
        highlightedText: newAnnotation.highlighted_text,
        pageNumber: newAnnotation.page_number,
        voiceUrl: newAnnotation.voice_url,
        isShared: newAnnotation.is_shared || false,
        sharedWith: newAnnotation.shared_with || [],
        createdAt: newAnnotation.created_at,
        updatedAt: newAnnotation.updated_at,
        user: {
          id: newAnnotation.profiles?.id || newAnnotation.user_id,
          fullName: newAnnotation.profiles?.full_name || 'Unknown User',
          avatarUrl: newAnnotation.profiles?.avatar_url
        },
        replies: []
      }

      return annotation
    })
  }

  async updateAnnotation(
    annotationId: AnnotationId, 
    data: UpdateDocumentAnnotationData
  ): Promise<Result<DocumentAnnotation>> {
    return wrapAsync(async () => {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) {
        throw userResult.error
      }

      // Check ownership
      const { data: existing, error: checkError } = await this.supabase
        .from('document_annotations')
        .select('user_id')
        .eq('id', annotationId)
        .single()

      if (checkError || !existing) {
        throw RepositoryError.notFound('Annotation', annotationId)
      }

      if (existing.user_id !== userResult.data) {
        throw RepositoryError.forbidden('update annotation', 'Only the author can update annotations')
      }

      const { data: updatedAnnotation, error } = await this.supabase
        .from('document_annotations')
        .update({
          content: data.content,
          position_data: data.positionData,
          highlighted_text: data.highlightedText,
          voice_url: data.voiceUrl,
          is_shared: data.isShared,
          shared_with: data.sharedWith,
          updated_at: new Date().toISOString()
        })
        .eq('id', annotationId)
        .select(`
          id,
          document_id,
          user_id,
          annotation_type,
          content,
          position_data,
          highlighted_text,
          page_number,
          voice_url,
          is_shared,
          shared_with,
          created_at,
          updated_at,
          profiles!document_annotations_user_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .single()

      if (error) {
        return this.createResult(null, error, 'updateAnnotation').data
      }

      const annotation: DocumentAnnotation = {
        id: createAnnotationId(updatedAnnotation.id),
        documentId: createDocumentId(updatedAnnotation.document_id),
        userId: updatedAnnotation.user_id as UserId,
        annotationType: updatedAnnotation.annotation_type,
        content: updatedAnnotation.content,
        positionData: updatedAnnotation.position_data,
        highlightedText: updatedAnnotation.highlighted_text,
        pageNumber: updatedAnnotation.page_number,
        voiceUrl: updatedAnnotation.voice_url,
        isShared: updatedAnnotation.is_shared || false,
        sharedWith: updatedAnnotation.shared_with || [],
        createdAt: updatedAnnotation.created_at,
        updatedAt: updatedAnnotation.updated_at,
        user: {
          id: updatedAnnotation.profiles?.id || updatedAnnotation.user_id,
          fullName: updatedAnnotation.profiles?.full_name || 'Unknown User',
          avatarUrl: updatedAnnotation.profiles?.avatar_url
        },
        replies: []
      }

      return annotation
    })
  }

  async deleteAnnotation(annotationId: AnnotationId): Promise<Result<void>> {
    return wrapAsync(async () => {
      const userResult = await this.getCurrentUserId()
      if (!userResult.success) {
        throw userResult.error
      }

      // Check ownership
      const { data: existing, error: checkError } = await this.supabase
        .from('document_annotations')
        .select('user_id')
        .eq('id', annotationId)
        .single()

      if (checkError || !existing) {
        throw RepositoryError.notFound('Annotation', annotationId)
      }

      if (existing.user_id !== userResult.data) {
        throw RepositoryError.forbidden('delete annotation', 'Only the author can delete annotations')
      }

      const { error } = await this.supabase
        .from('document_annotations')
        .delete()
        .eq('id', annotationId)

      if (error) {
        throw RepositoryError.fromSupabaseError(error, 'deleteAnnotation')
      }

      return undefined
    })
  }

  // Table of Contents operations
  async findTocByDocument(documentId: DocumentId): Promise<Result<DocumentTableOfContents[]>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('document_toc')
        .select('*')
        .eq('document_id', documentId)
        .order('page_number', { ascending: true })
        .order('level', { ascending: true })

      if (error) {
        throw RepositoryError.fromSupabaseError(error, 'findTocByDocument')
      }

      const toc: DocumentTableOfContents[] = (data || []).map((row: any) => ({
        id: createTocId(row.id),
        documentId: createDocumentId(row.document_id),
        title: row.title,
        level: row.level,
        pageNumber: row.page_number,
        section: row.section,
        subsection: row.subsection,
        createdAt: row.created_at,
        generatedByLlm: row.generated_by_llm || false
      }))

      return toc
    })
  }

  async createTocEntries(
    documentId: DocumentId, 
    entries: Omit<DocumentTableOfContents, 'id' | 'documentId' | 'createdAt'>[]
  ): Promise<Result<DocumentTableOfContents[]>> {
    return wrapAsync(async () => {
      // Delete existing TOC entries for this document
      await this.supabase
        .from('document_toc')
        .delete()
        .eq('document_id', documentId)

      const insertData = entries.map(entry => ({
        document_id: documentId,
        title: entry.title,
        level: entry.level,
        page_number: entry.pageNumber,
        section: entry.section,
        subsection: entry.subsection,
        generated_by_llm: entry.generatedByLlm
      }))

      const { data, error } = await this.supabase
        .from('document_toc')
        .insert(insertData)
        .select('*')

      if (error) {
        throw RepositoryError.fromSupabaseError(error, 'createTocEntries')
      }

      const toc: DocumentTableOfContents[] = (data || []).map((row: any) => ({
        id: createTocId(row.id),
        documentId: createDocumentId(row.document_id),
        title: row.title,
        level: row.level,
        pageNumber: row.page_number,
        section: row.section,
        subsection: row.subsection,
        createdAt: row.created_at,
        generatedByLlm: row.generated_by_llm || false
      }))

      return toc
    })
  }

  // Summary operations
  async findSummariesByDocument(
    documentId: DocumentId, 
    summaryType?: 'executive' | 'detailed' | 'bullet_points' | 'key_insights'
  ): Promise<Result<DocumentSummary[]>> {
    return wrapAsync(async () => {
      let query = this.supabase
        .from('document_summaries')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })

      if (summaryType) {
        query = query.eq('summary_type', summaryType)
      }

      const { data, error } = await query

      if (error) {
        throw RepositoryError.fromSupabaseError(error, 'findSummariesByDocument')
      }

      const summaries: DocumentSummary[] = (data || []).map((row: any) => ({
        id: createSummaryId(row.id),
        documentId: createDocumentId(row.document_id),
        summaryType: row.summary_type,
        content: row.content,
        wordCount: row.word_count || 0,
        generatedBy: row.generated_by,
        llmModel: row.llm_model,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))

      return summaries
    })
  }

  async createSummary(data: CreateDocumentSummaryData): Promise<Result<DocumentSummary>> {
    return wrapAsync(async () => {
      const insertData = {
        document_id: data.documentId,
        summary_type: data.summaryType,
        content: data.content,
        word_count: data.content.split(/\s+/).length,
        generated_by: data.generatedBy,
        llm_model: data.llmModel
      }

      const { data: newSummary, error } = await this.supabase
        .from('document_summaries')
        .insert(insertData)
        .select('*')
        .single()

      if (error) {
        throw RepositoryError.fromSupabaseError(error, 'createSummary')
      }

      const summary: DocumentSummary = {
        id: createSummaryId(newSummary.id),
        documentId: createDocumentId(newSummary.document_id),
        summaryType: newSummary.summary_type,
        content: newSummary.content,
        wordCount: newSummary.word_count || 0,
        generatedBy: newSummary.generated_by,
        llmModel: newSummary.llm_model,
        createdAt: newSummary.created_at,
        updatedAt: newSummary.updated_at
      }

      return summary
    })
  }

  // Podcast operations
  async findPodcastByDocument(documentId: DocumentId): Promise<Result<DocumentPodcast | null>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('document_podcasts')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw RepositoryError.fromSupabaseError(error, 'findPodcastByDocument')
      }

      if (!data) {
        return null
      }

      const podcast: DocumentPodcast = {
        id: createPodcastId(data.id),
        documentId: createDocumentId(data.document_id),
        title: data.title,
        description: data.description,
        audioUrl: data.audio_url,
        duration: data.duration,
        transcript: data.transcript,
        generatedBy: 'llm',
        llmModel: data.llm_model,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }

      return podcast
    })
  }

  async createPodcast(data: CreateDocumentPodcastData): Promise<Result<DocumentPodcast>> {
    return wrapAsync(async () => {
      const insertData = {
        document_id: data.documentId,
        title: data.title,
        description: data.description,
        audio_url: data.audioUrl,
        duration: data.duration,
        transcript: data.transcript,
        llm_model: data.llmModel,
        status: 'completed'
      }

      const { data: newPodcast, error } = await this.supabase
        .from('document_podcasts')
        .insert(insertData)
        .select('*')
        .single()

      if (error) {
        throw RepositoryError.fromSupabaseError(error, 'createPodcast')
      }

      const podcast: DocumentPodcast = {
        id: createPodcastId(newPodcast.id),
        documentId: createDocumentId(newPodcast.document_id),
        title: newPodcast.title,
        description: newPodcast.description,
        audioUrl: newPodcast.audio_url,
        duration: newPodcast.duration,
        transcript: newPodcast.transcript,
        generatedBy: 'llm',
        llmModel: newPodcast.llm_model,
        status: newPodcast.status,
        createdAt: newPodcast.created_at,
        updatedAt: newPodcast.updated_at
      }

      return podcast
    })
  }

  // Search operations
  async searchDocument(searchQuery: DocumentSearchQuery): Promise<Result<DocumentSearchResult[]>> {
    return wrapAsync(async () => {
      // This would typically use a full-text search or vector search
      // For now, we'll implement a basic search
      let query = this.supabase
        .from('document_content')
        .select(`
          document_id,
          page_number,
          content
        `)

      if (searchQuery.documentId) {
        query = query.eq('document_id', searchQuery.documentId)
      }

      if (searchQuery.pageNumber) {
        query = query.eq('page_number', searchQuery.pageNumber)
      }

      // Use ilike for case-insensitive search if not specified
      const searchOperator = searchQuery.caseSensitive ? 'like' : 'ilike'
      const searchPattern = searchQuery.wholeWord 
        ? `%\\m${searchQuery.query}\\M%`
        : `%${searchQuery.query}%`

      query = query[searchOperator]('content', searchPattern)

      const { data, error } = await query

      if (error) {
        throw RepositoryError.fromSupabaseError(error, 'searchDocument')
      }

      // Transform results into DocumentSearchResult format
      const results: DocumentSearchResult[] = (data || []).map((row: any) => {
        const content = row.content
        const searchTerm = searchQuery.query
        const index = searchQuery.caseSensitive 
          ? content.indexOf(searchTerm)
          : content.toLowerCase().indexOf(searchTerm.toLowerCase())
        
        const contextLength = 100
        const start = Math.max(0, index - contextLength)
        const end = Math.min(content.length, index + searchTerm.length + contextLength)
        
        return {
          documentId: createDocumentId(row.document_id),
          pageNumber: row.page_number,
          matchText: content.substring(index, index + searchTerm.length),
          contextBefore: content.substring(start, index),
          contextAfter: content.substring(index + searchTerm.length, end),
          score: 1.0, // Basic scoring
          position: {
            x: 0, // Would need proper text positioning
            y: 0,
            width: 0,
            height: 0
          }
        }
      })

      return results
    })
  }
}