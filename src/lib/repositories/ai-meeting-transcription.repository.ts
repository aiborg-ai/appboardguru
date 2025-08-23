/**
 * AI Meeting Transcription Repository
 * 
 * Repository for managing real-time meeting transcriptions with AI analysis
 * Follows the DDD architecture with Result pattern and branded types
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database'
import { BaseRepository } from './base.repository'
import { Result, success, failure, wrapAsync } from './result'
import type { 
  QueryOptions, 
  PaginatedResult,
  AuditLogEntry,
  UserId,
  OrganizationId,
  MeetingId
} from './types'

import type {
  MeetingTranscriptionId,
  TranscriptionSegmentId,
  SpeakerIdentificationId,
  Timestamp,
  ISODateString
} from '../../types/branded'

import type {
  MeetingTranscription,
  TranscriptionSegment,
  SpeakerProfile,
  TranscriptionStatus,
  AudioConfiguration,
  TranscriptionMetadata,
  QualityMetrics,
  SegmentProcessingStatus,
  SpeakingMetrics,
  ContributionAnalysis
} from '../../types/ai-meeting-analysis'

// ==== Repository Types ====

export interface CreateTranscriptionRequest {
  readonly meetingId: MeetingId
  readonly organizationId: OrganizationId
  readonly title: string
  readonly audioConfig?: Partial<AudioConfiguration>
  readonly createdBy: UserId
}

export interface UpdateTranscriptionRequest {
  readonly title?: string
  readonly status?: TranscriptionStatus
  readonly audioConfig?: Partial<AudioConfiguration>
  readonly summary?: string
  readonly metadata?: Partial<TranscriptionMetadata>
  readonly segments?: TranscriptionSegment[]
  readonly speakers?: SpeakerProfile[]
}

export interface CreateSegmentRequest {
  readonly transcriptionId: MeetingTranscriptionId
  readonly text: string
  readonly originalAudioHash?: string
  readonly startTime: Timestamp
  readonly endTime: Timestamp
  readonly speakerId?: SpeakerIdentificationId
  readonly confidence: number
  readonly language?: string
  readonly translations?: Record<string, string>
}

export interface CreateSpeakerRequest {
  readonly transcriptionId: MeetingTranscriptionId
  readonly userId?: UserId
  readonly name: string
  readonly email?: string
  readonly role?: string
  readonly voiceFingerprint?: string
  readonly confidence?: number
}

export interface TranscriptionFilters {
  readonly meetingId?: MeetingId
  readonly organizationId?: OrganizationId
  readonly status?: TranscriptionStatus | TranscriptionStatus[]
  readonly createdBy?: UserId
  readonly dateRange?: {
    readonly start: ISODateString
    readonly end: ISODateString
  }
}

export interface SegmentFilters {
  readonly transcriptionId?: MeetingTranscriptionId
  readonly speakerId?: SpeakerIdentificationId
  readonly language?: string
  readonly timeRange?: {
    readonly start: Timestamp
    readonly end: Timestamp
  }
  readonly hasActionItems?: boolean
  readonly hasDecisions?: boolean
}

// ==== Main Repository Class ====

export class AIMeetingTranscriptionRepository extends BaseRepository {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
  }

  protected getEntityName(): string {
    return 'AI Meeting Transcription'
  }

  protected getSearchFields(): string[] {
    return ['title', 'summary']
  }

  protected getTableName(): string {
    return 'ai_meeting_transcriptions'
  }

  // ==== Transcription CRUD Operations ====

  /**
   * Create a new meeting transcription
   */
  async createTranscription(
    request: CreateTranscriptionRequest
  ): Promise<Result<MeetingTranscription>> {
    return wrapAsync(async () => {
      const defaultAudioConfig: AudioConfiguration = {
        sampleRate: 44100,
        channels: 2,
        bitDepth: 16,
        format: 'wav',
        noiseReduction: true,
        echoCancellation: true,
        autoGainControl: true
      }

      const transcriptionData = {
        meeting_id: request.meetingId,
        organization_id: request.organizationId,
        title: request.title,
        status: 'initializing' as TranscriptionStatus,
        audio_config: { ...defaultAudioConfig, ...request.audioConfig },
        segments: [],
        speakers: [],
        metadata: {},
        created_by: request.createdBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('ai_meeting_transcriptions')
        .insert(transcriptionData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create transcription: ${error.message}`)
      }

      // Log audit activity
      await this.logActivity({
        user_id: request.createdBy,
        organization_id: request.organizationId,
        event_type: 'create',
        event_category: 'ai_meeting_analysis',
        action: 'create_transcription',
        resource_type: 'meeting_transcription',
        resource_id: data.id,
        event_description: `Created AI meeting transcription: ${request.title}`,
        outcome: 'success',
        severity: 'low',
        details: {
          meetingId: request.meetingId,
          audioConfig: request.audioConfig
        }
      } as AuditLogEntry)

      return this.mapDatabaseToTranscription(data)
    })
  }

  /**
   * Find transcription by ID
   */
  async findById(
    id: MeetingTranscriptionId
  ): Promise<Result<MeetingTranscription | null>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('ai_meeting_transcriptions')
        .select()
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to find transcription: ${error.message}`)
      }

      return this.mapDatabaseToTranscription(data)
    })
  }

  /**
   * Find transcriptions with filters and pagination
   */
  async findMany(
    filters?: TranscriptionFilters,
    options?: QueryOptions
  ): Promise<Result<PaginatedResult<MeetingTranscription>>> {
    return wrapAsync(async () => {
      let query = this.supabase
        .from('ai_meeting_transcriptions')
        .select('*', { count: 'exact' })

      // Apply filters
      if (filters?.meetingId) {
        query = query.eq('meeting_id', filters.meetingId)
      }

      if (filters?.organizationId) {
        query = query.eq('organization_id', filters.organizationId)
      }

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status)
        } else {
          query = query.eq('status', filters.status)
        }
      }

      if (filters?.createdBy) {
        query = query.eq('created_by', filters.createdBy)
      }

      if (filters?.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end)
      }

      // Apply query options
      query = this.applyQueryOptions(query, options || {})

      const { data, error, count } = await query

      if (error) {
        throw new Error(`Failed to find transcriptions: ${error.message}`)
      }

      const transcriptions = data?.map(item => this.mapDatabaseToTranscription(item)) || []

      return this.createPaginatedResult(
        transcriptions,
        count,
        options || {}
      ).data
    })
  }

  /**
   * Update transcription
   */
  async updateTranscription(
    id: MeetingTranscriptionId,
    updates: UpdateTranscriptionRequest,
    updatedBy: UserId
  ): Promise<Result<MeetingTranscription>> {
    return wrapAsync(async () => {
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (updates.title) updateData.title = updates.title
      if (updates.status) updateData.status = updates.status
      if (updates.audioConfig) updateData.audio_config = updates.audioConfig
      if (updates.summary) updateData.summary = updates.summary
      if (updates.metadata) updateData.metadata = updates.metadata
      if (updates.segments) updateData.segments = updates.segments
      if (updates.speakers) updateData.speakers = updates.speakers

      // Set completion timestamp if status is completed
      if (updates.status === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('ai_meeting_transcriptions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update transcription: ${error.message}`)
      }

      // Log audit activity
      const currentTranscription = await this.findById(id)
      if (currentTranscription.success && currentTranscription.data) {
        await this.logActivity({
          user_id: updatedBy,
          organization_id: currentTranscription.data.organizationId,
          event_type: 'update',
          event_category: 'ai_meeting_analysis',
          action: 'update_transcription',
          resource_type: 'meeting_transcription',
          resource_id: id,
          event_description: `Updated AI meeting transcription`,
          outcome: 'success',
          severity: 'low',
          details: updates
        } as AuditLogEntry)
      }

      return this.mapDatabaseToTranscription(data)
    })
  }

  /**
   * Delete transcription (soft delete)
   */
  async deleteTranscription(
    id: MeetingTranscriptionId,
    deletedBy: UserId
  ): Promise<Result<boolean>> {
    return wrapAsync(async () => {
      const { error } = await this.supabase
        .from('ai_meeting_transcriptions')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to delete transcription: ${error.message}`)
      }

      // Log audit activity
      const currentTranscription = await this.findById(id)
      if (currentTranscription.success && currentTranscription.data) {
        await this.logActivity({
          user_id: deletedBy,
          organization_id: currentTranscription.data.organizationId,
          event_type: 'delete',
          event_category: 'ai_meeting_analysis',
          action: 'delete_transcription',
          resource_type: 'meeting_transcription',
          resource_id: id,
          event_description: `Archived AI meeting transcription`,
          outcome: 'success',
          severity: 'medium',
          details: { archived: true }
        } as AuditLogEntry)
      }

      return true
    })
  }

  // ==== Segment Operations ====

  /**
   * Add transcription segment
   */
  async addSegment(
    request: CreateSegmentRequest
  ): Promise<Result<TranscriptionSegment>> {
    return wrapAsync(async () => {
      const segmentData = {
        transcription_id: request.transcriptionId,
        text: request.text,
        original_audio_hash: request.originalAudioHash,
        start_time: request.startTime,
        end_time: request.endTime,
        speaker_id: request.speakerId,
        confidence: request.confidence,
        language: request.language || 'en',
        translations: request.translations || {},
        processing_status: {
          transcribed: true,
          speakerIdentified: !!request.speakerId,
          sentimentAnalyzed: false,
          topicExtracted: false,
          actionItemsExtracted: false,
          decisionsExtracted: false
        },
        created_at: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('ai_transcription_segments')
        .insert(segmentData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to add segment: ${error.message}`)
      }

      return this.mapDatabaseToSegment(data)
    })
  }

  /**
   * Find segments by transcription ID
   */
  async findSegmentsByTranscriptionId(
    transcriptionId: MeetingTranscriptionId,
    filters?: SegmentFilters,
    options?: QueryOptions
  ): Promise<Result<PaginatedResult<TranscriptionSegment>>> {
    return wrapAsync(async () => {
      let query = this.supabase
        .from('ai_transcription_segments')
        .select('*', { count: 'exact' })
        .eq('transcription_id', transcriptionId)

      // Apply filters
      if (filters?.speakerId) {
        query = query.eq('speaker_id', filters.speakerId)
      }

      if (filters?.language) {
        query = query.eq('language', filters.language)
      }

      if (filters?.timeRange) {
        query = query
          .gte('start_time', filters.timeRange.start)
          .lte('end_time', filters.timeRange.end)
      }

      if (filters?.hasActionItems !== undefined) {
        if (filters.hasActionItems) {
          query = query.not('action_items', 'is', null)
        } else {
          query = query.is('action_items', null)
        }
      }

      if (filters?.hasDecisions !== undefined) {
        if (filters.hasDecisions) {
          query = query.not('decisions', 'is', null)
        } else {
          query = query.is('decisions', null)
        }
      }

      // Default sorting by start time
      if (!options?.sortBy) {
        query = query.order('start_time', { ascending: true })
      } else {
        query = this.applyQueryOptions(query, options)
      }

      const { data, error, count } = await query

      if (error) {
        throw new Error(`Failed to find segments: ${error.message}`)
      }

      const segments = data?.map(item => this.mapDatabaseToSegment(item)) || []

      return this.createPaginatedResult(
        segments,
        count,
        options || {}
      ).data
    })
  }

  // ==== Speaker Operations ====

  /**
   * Add speaker profile
   */
  async addSpeaker(
    request: CreateSpeakerRequest
  ): Promise<Result<SpeakerProfile>> {
    return wrapAsync(async () => {
      const speakerData = {
        transcription_id: request.transcriptionId,
        user_id: request.userId,
        name: request.name,
        email: request.email,
        role: request.role,
        voice_fingerprint: request.voiceFingerprint,
        confidence: request.confidence || 0.5,
        speaking_metrics: {},
        engagement_score: 0,
        contribution_analysis: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('ai_speaker_profiles')
        .insert(speakerData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to add speaker: ${error.message}`)
      }

      return this.mapDatabaseToSpeaker(data)
    })
  }

  /**
   * Find speakers by transcription ID
   */
  async findSpeakersByTranscriptionId(
    transcriptionId: MeetingTranscriptionId
  ): Promise<Result<SpeakerProfile[]>> {
    return wrapAsync(async () => {
      const { data, error } = await this.supabase
        .from('ai_speaker_profiles')
        .select()
        .eq('transcription_id', transcriptionId)
        .order('created_at', { ascending: true })

      if (error) {
        throw new Error(`Failed to find speakers: ${error.message}`)
      }

      return data?.map(item => this.mapDatabaseToSpeaker(item)) || []
    })
  }

  // ==== Statistics and Analytics ====

  /**
   * Get transcription statistics for organization
   */
  async getOrganizationStatistics(
    organizationId: OrganizationId,
    dateRange?: { start: ISODateString; end: ISODateString }
  ): Promise<Result<{
    totalTranscriptions: number
    completedTranscriptions: number
    totalMeetingHours: number
    averageParticipants: number
    topLanguages: Array<{ language: string; count: number }>
  }>> {
    return wrapAsync(async () => {
      let query = this.supabase
        .from('ai_meeting_transcriptions')
        .select('status, metadata, speakers, created_at')
        .eq('organization_id', organizationId)

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to get statistics: ${error.message}`)
      }

      const totalTranscriptions = data?.length || 0
      const completedTranscriptions = data?.filter(t => t.status === 'completed').length || 0

      // Calculate total meeting hours
      const totalMeetingHours = data?.reduce((sum, t) => {
        const duration = t.metadata?.duration || 0
        return sum + (duration / (1000 * 60 * 60)) // Convert ms to hours
      }, 0) || 0

      // Calculate average participants
      const averageParticipants = data?.length ? 
        data.reduce((sum, t) => sum + (t.speakers?.length || 0), 0) / data.length : 0

      // Get language statistics from segments
      const { data: segments, error: segmentsError } = await this.supabase
        .from('ai_transcription_segments')
        .select('language')
        .in('transcription_id', data?.map(t => t.id) || [])

      if (segmentsError) {
        console.warn('Failed to get language statistics:', segmentsError)
      }

      const languageCounts = segments?.reduce((acc, segment) => {
        const lang = segment.language || 'unknown'
        acc[lang] = (acc[lang] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const topLanguages = Object.entries(languageCounts)
        .map(([language, count]) => ({ language, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      return {
        totalTranscriptions,
        completedTranscriptions,
        totalMeetingHours,
        averageParticipants,
        topLanguages
      }
    })
  }

  // ==== Private Helper Methods ====

  private mapDatabaseToTranscription(data: any): MeetingTranscription {
    return {
      id: data.id,
      meetingId: data.meeting_id,
      organizationId: data.organization_id,
      title: data.title,
      status: data.status,
      audioConfig: data.audio_config || {
        sampleRate: 44100,
        channels: 2,
        bitDepth: 16,
        format: 'wav',
        noiseReduction: true,
        echoCancellation: true,
        autoGainControl: true
      },
      segments: data.segments || [],
      speakers: data.speakers || [],
      metadata: data.metadata || {},
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      completedAt: data.completed_at
    }
  }

  private mapDatabaseToSegment(data: any): TranscriptionSegment {
    return {
      id: data.id,
      transcriptionId: data.transcription_id,
      text: data.text,
      originalAudioHash: data.original_audio_hash,
      startTime: data.start_time,
      endTime: data.end_time,
      speakerId: data.speaker_id,
      confidence: data.confidence,
      language: data.language,
      translations: data.translations || {},
      sentiment: data.sentiment,
      topics: data.topics || [],
      actionItems: data.action_items || [],
      decisions: data.decisions || [],
      keywords: data.keywords || [],
      processing: data.processing_status || {
        transcribed: true,
        speakerIdentified: false,
        sentimentAnalyzed: false,
        topicExtracted: false,
        actionItemsExtracted: false,
        decisionsExtracted: false
      },
      createdAt: data.created_at
    }
  }

  private mapDatabaseToSpeaker(data: any): SpeakerProfile {
    return {
      id: data.id,
      transcriptionId: data.transcription_id,
      userId: data.user_id,
      name: data.name,
      email: data.email,
      role: data.role,
      voiceFingerprint: data.voice_fingerprint,
      confidence: data.confidence,
      speakingMetrics: data.speaking_metrics || {},
      engagementScore: data.engagement_score,
      contributionAnalysis: data.contribution_analysis || {},
      firstAppearance: data.first_appearance,
      lastAppearance: data.last_appearance
    }
  }
}