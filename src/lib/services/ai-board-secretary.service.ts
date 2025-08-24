/**
 * AI Board Secretary Service
 * Comprehensive AI-powered board governance automation
 */

import { BaseService } from './base.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

import { z } from 'zod'

// Type definitions
interface MeetingTranscription {
  id: string
  meeting_id: string
  audio_file_url?: string
  video_file_url?: string
  transcription_text?: string
  speakers: Speaker[]
  diarization_data?: any
  processing_status: 'pending' | 'processing' | 'completed' | 'failed' | 'queued'
  ai_service_used?: string
  processing_duration_seconds?: number
  confidence_score?: number
  language: string
  created_at: string
  updated_at: string
}

interface Speaker {
  id: string
  name?: string
  role?: string
  segments: TranscriptionSegment[]
}

interface TranscriptionSegment {
  start_time: number
  end_time: number
  text: string
  confidence: number
  speaker_id: string
}

interface BoardMeeting {
  id: string
  board_id: string
  meeting_title: string
  meeting_type: 'regular' | 'special' | 'annual' | 'emergency'
  scheduled_date: string
  actual_start_time?: string
  actual_end_time?: string
  location?: string
  is_virtual: boolean
  virtual_meeting_url?: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed'
  agenda_id?: string
  minutes_id?: string
  recording_url?: string
  created_by: string
  created_at: string
  updated_at: string
}

interface ActionItem {
  id: string
  meeting_id?: string
  title: string
  description?: string
  assigned_to?: string
  assigned_by?: string
  due_date?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue'
  completion_percentage: number
  ai_extracted: boolean
  ai_confidence_score?: number
  context_reference?: string
  dependencies: string[]
  progress_notes: any[]
  completion_date?: string
  escalation_level: number
  reminders_sent: number
  tags: string[]
  created_by: string
  created_at: string
  updated_at: string
}

interface ComplianceRequirement {
  id: string
  board_id: string
  requirement_name: string
  requirement_type: 'filing' | 'meeting' | 'reporting' | 'governance' | 'regulatory'
  description?: string
  regulatory_body?: string
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annually' | 'annually' | 'one_time'
  next_due_date?: string
  days_notice_required: number
  responsible_party?: string
  is_mandatory: boolean
  penalty_description?: string
  reference_documents: any[]
  last_completed?: string
  completion_status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'waived'
  ai_monitored: boolean
  created_by: string
  created_at: string
  updated_at: string
}

interface MeetingAgenda {
  id: string
  meeting_id: string
  title: string
  agenda_items: AgendaItem[]
  time_allocations: Record<string, number>
  ai_generated: boolean
  ai_generation_metadata?: any
  template_used?: string
  status: 'draft' | 'approved' | 'published' | 'archived'
  approved_by?: string
  approved_at?: string
  created_by: string
  created_at: string
  updated_at: string
}

interface AgendaItem {
  id: string
  title: string
  description?: string
  presenter?: string
  time_allocation?: number
  order: number
  type: 'presentation' | 'discussion' | 'decision' | 'information' | 'action'
  attachments?: string[]
  previous_action_items?: string[]
}

interface MeetingMinutes {
  id: string
  meeting_id: string
  title: string
  content: any
  attendees: any[]
  absentees: any[]
  decisions: Decision[]
  voting_records: VotingRecord[]
  resolutions: Resolution[]
  ai_generated: boolean
  ai_processing_metadata?: any
  transcription_id?: string
  status: 'draft' | 'review' | 'approved' | 'published' | 'archived'
  approved_by?: string
  approved_at?: string
  secretary_notes?: string
  created_by: string
  created_at: string
  updated_at: string
}

interface Decision {
  id: string
  title: string
  description: string
  decision_type: 'motion' | 'resolution' | 'policy' | 'appointment' | 'other'
  outcome: 'approved' | 'rejected' | 'deferred' | 'amended'
  voting_required: boolean
  voting_record_id?: string
  context: string
  implications: string[]
  action_items: string[]
}

interface VotingRecord {
  id: string
  motion: string
  votes_for: number
  votes_against: number
  abstentions: number
  total_eligible: number
  outcome: 'passed' | 'failed' | 'tied'
  voting_details: any[]
  quorum_met: boolean
  voting_method: 'voice' | 'show_hands' | 'ballot' | 'electronic'
  timestamp: string
}

interface Resolution {
  id: string
  resolution_number: string
  title: string
  whereas_clauses: string[]
  resolved_clauses: string[]
  effective_date: string
  expiry_date?: string
  status: 'active' | 'expired' | 'superseded' | 'repealed'
  related_decisions: string[]
}

// Validation schemas
const CreateMeetingSchema = z.object({
  board_id: z.string().uuid(),
  meeting_title: z.string().min(1).max(255),
  meeting_type: z.enum(['regular', 'special', 'annual', 'emergency']).default('regular'),
  scheduled_date: z.string().datetime(),
  location: z.string().optional(),
  is_virtual: z.boolean().default(false),
  virtual_meeting_url: z.string().url().optional(),
})

const TranscriptionRequestSchema = z.object({
  meeting_id: z.string().uuid(),
  audio_file_url: z.string().url().optional(),
  video_file_url: z.string().url().optional(),
  language: z.string().default('en'),
})

const ActionItemSchema = z.object({
  meeting_id: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
  due_date: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  tags: z.array(z.string()).default([]),
})

const ComplianceRequirementSchema = z.object({
  board_id: z.string().uuid(),
  requirement_name: z.string().min(1).max(255),
  requirement_type: z.enum(['filing', 'meeting', 'reporting', 'governance', 'regulatory']),
  description: z.string().optional(),
  regulatory_body: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'semi_annually', 'annually', 'one_time']).optional(),
  next_due_date: z.string().datetime().optional(),
  days_notice_required: z.number().int().min(1).default(30),
  responsible_party: z.string().uuid().optional(),
  is_mandatory: z.boolean().default(true),
})

export class AIBoardSecretaryService extends BaseService {
  private readonly OPENROUTER_API_URL = 'https://openrouter.ai/api/v1'

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
  }

  /**
   * ==========================================
   * MEETING MANAGEMENT
   * ==========================================
   */

  /**
   * Create a new board meeting
   */
  async createMeeting(data: z.infer<typeof CreateMeetingSchema>): Promise<Result<BoardMeeting>> {
    const validation = this.validateWithContext<typeof data>(data, CreateMeetingSchema, 'meeting creation')
    if (!validation.success) return validation

    const userResult = await this.getCurrentUser()
    if (!userResult.success) return userResult

    return this.executeDbOperation(async () => {
      const { data: meeting, error } = await this.supabase
        .from('board_meetings')
        .insert({
          ...validation.data,
          created_by: userResult.data.id,
          status: 'scheduled'
        })
        .select()
        .single()

      if (error) throw error
      return meeting as BoardMeeting
    }, 'create_meeting')
  }

  /**
   * Get meetings for a board with filtering and pagination
   */
  async getMeetings(
    boardId: string, 
    options: {
      status?: string
      from_date?: string
      to_date?: string
      page?: number
      limit?: number
    } = {}
  ): Promise<Result<{ meetings: BoardMeeting[], total: number }>> {
    const { status, from_date, to_date, page = 1, limit = 20 } = options

    return this.executeDbOperation(async () => {
      let query = this.supabase
        .from('board_meetings')
        .select('*', { count: 'exact' })
        .eq('board_id', boardId)

      if (status) {
        query = query.eq('status', status)
      }

      if (from_date) {
        query = query.gte('scheduled_date', from_date)
      }

      if (to_date) {
        query = query.lte('scheduled_date', to_date)
      }

      const { data: meetings, error, count } = await query
        .order('scheduled_date', { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

      if (error) throw error

      return {
        meetings: meetings as BoardMeeting[],
        total: count || 0
      }
    }, 'get_meetings')
  }

  /**
   * ==========================================
   * TRANSCRIPTION AND AI PROCESSING
   * ==========================================
   */

  /**
   * Request meeting transcription
   */
  async requestTranscription(data: z.infer<typeof TranscriptionRequestSchema>): Promise<Result<MeetingTranscription>> {
    const validation = this.validateWithContext<typeof data>(data, TranscriptionRequestSchema, 'transcription request')
    if (!validation.success) return validation

    if (!validation.data.audio_file_url && !validation.data.video_file_url) {
      return failure(RepositoryError.validation('Either audio_file_url or video_file_url is required'))
    }

    return this.executeDbOperation(async () => {
      // Create transcription record
      const { data: transcription, error } = await this.supabase
        .from('meeting_transcriptions')
        .insert({
          meeting_id: validation.data.meeting_id,
          audio_file_url: validation.data.audio_file_url,
          video_file_url: validation.data.video_file_url,
          language: validation.data.language,
          processing_status: 'queued'
        }))
        .select()
        .single()

      if (error) throw error

      // Queue AI processing job
      await this.queueAIJob({
        job_type: 'transcription',
        reference_id: transcription.id,
        reference_type: 'meeting_transcription',
        input_data: {
          audio_url: validation.data.audio_file_url,
          video_url: validation.data.video_file_url,
          language: validation.data.language
        },
        priority: 5
      }))

      return transcription as MeetingTranscription
    }, 'request_transcription')
  }

  /**
   * Process audio/video file with OpenRouter API
   */
  private async processTranscription(
    audioUrl?: string, 
    videoUrl?: string, 
    language = 'en'
  ): Promise<Result<{
    transcription_text: string
    speakers: Speaker[]
    confidence_score: number
  }>> {
    const userResult = await this.getCurrentUser()
    if (!userResult.success) return userResult

    return success(await (async () => {
      // Get user's AI settings
      const { data: aiSettings } = await this.supabase
        .from('ai_user_settings')
        .select('*')
        .eq('user_id', userResult.data.id)
        .single()

      const apiKey = aiSettings?.api_key_encrypted || process.env.OPENROUTER_API_KEY
      if (!apiKey) {
        throw RepositoryError.configuration('OpenRouter API key not configured')
      }

      const fileUrl = audioUrl || videoUrl
      if (!fileUrl) {
        throw RepositoryError.validation('Audio or video URL required for transcription')
      }

      // Use OpenRouter's Whisper or similar model for transcription
      const response = await fetch(`${this.OPENROUTER_API_URL}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/whisper-large-v3',
          file_url: fileUrl,
          language: language,
          response_format: 'verbose_json',
          timestamp_granularities: ['segment'],
        }))
      }))

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw RepositoryError.externalService(
          'OpenRouter', 
          `Transcription failed: ${response.statusText}`,
          { status: response.status, error: errorData }
        )
      }

      const result = await response.json()

      // Process the result into our format
      const speakers: Speaker[] = this.extractSpeakers(result)
      
      return {
        transcription_text: result.text || '',
        speakers,
        confidence_score: this.calculateAverageConfidence(result.segments || [])
      }
    }))
  }

  /**
   * Extract speakers from transcription result with basic diarization
   */
  private extractSpeakers(transcriptionResult: any): Speaker[] {
    const segments = transcriptionResult.segments || []
    const speakersMap = new Map<string, Speaker>()

    segments.forEach((segment: any, index: number) => {
      // Simple speaker identification - in real implementation, 
      // you'd use a proper diarization service
      const speakerId = `speaker_${Math.floor(index / 10)}` // Group segments
      
      if (!speakersMap.has(speakerId)) {
        speakersMap.set(speakerId, {
          id: speakerId,
          name: `Speaker ${speakersMap.size + 1}`,
          segments: []
        }))
      }

      const speaker = speakersMap.get(speakerId)!
      speaker.segments.push({
        start_time: segment.start || 0,
        end_time: segment.end || 0,
        text: segment.text || '',
        confidence: segment.avg_logprob || 0.8,
        speaker_id: speakerId
      }))
    }))

    return Array.from(speakersMap.values())
  }

  /**
   * Calculate average confidence score
   */
  private calculateAverageConfidence(segments: any[]): number {
    if (segments.length === 0) return 0.8
    
    const totalConfidence = segments.reduce((sum, segment) => {
      return sum + (segment.avg_logprob || 0.8)
    }, 0)
    
    return Math.max(0, Math.min(1, totalConfidence / segments.length))
  }

  /**
   * ==========================================
   * MEETING MINUTES GENERATION
   * ==========================================
   */

  /**
   * Generate meeting minutes from transcription
   */
  async generateMeetingMinutes(
    meetingId: string, 
    transcriptionId: string
  ): Promise<Result<MeetingMinutes>> {
    return this.executeDbOperation(async () => {
      // Get transcription data
      const { data: transcription, error: transError } = await this.supabase
        .from('meeting_transcriptions')
        .select('*')
        .eq('id', transcriptionId)
        .single()

      if (transError || !transcription) {
        throw RepositoryError.notFound('Transcription not found')
      }

      // Get meeting data
      const { data: meeting, error: meetingError } = await this.supabase
        .from('board_meetings')
        .select('*')
        .eq('id', meetingId)
        .single()

      if (meetingError || !meeting) {
        throw RepositoryError.notFound('Meeting not found')
      }

      // Process with AI
      const aiResult = await this.processMinutesWithAI(
        transcription.transcription_text,
        meeting,
        transcription.speakers
      )

      if (!aiResult.success) throw aiResult.error

      // Create minutes record
      const { data: minutes, error } = await this.supabase
        .from('meeting_minutes')
        .insert({
          meeting_id: meetingId,
          title: `Minutes - ${meeting.meeting_title}`,
          content: aiResult.data.content,
          attendees: aiResult.data.attendees,
          absentees: aiResult.data.absentees,
          decisions: aiResult.data.decisions,
          voting_records: aiResult.data.voting_records,
          resolutions: aiResult.data.resolutions,
          ai_generated: true,
          ai_processing_metadata: aiResult.data.metadata,
          transcription_id: transcriptionId,
          status: 'draft',
          created_by: (await this.getCurrentUser()).data?.id
        }))
        .select()
        .single()

      if (error) throw error

      return minutes as MeetingMinutes
    }, 'generate_meeting_minutes')
  }

  /**
   * Process transcription with AI to create structured minutes
   */
  private async processMinutesWithAI(
    transcriptionText: string,
    meeting: any,
    speakers: Speaker[]
  ): Promise<Result<{
    content: any
    attendees: any[]
    absentees: any[]
    decisions: Decision[]
    voting_records: VotingRecord[]
    resolutions: Resolution[]
    metadata: any
  }>> {
    const userResult = await this.getCurrentUser()
    if (!userResult.success) return userResult

    return success(await (async () => {
      const { data: aiSettings } = await this.supabase
        .from('ai_user_settings')
        .select('*')
        .eq('user_id', userResult.data.id)
        .single()

      const apiKey = aiSettings?.api_key_encrypted || process.env.OPENROUTER_API_KEY
      if (!apiKey) {
        throw RepositoryError.configuration('OpenRouter API key not configured')
      }

      const prompt = `
You are an AI Board Secretary tasked with generating comprehensive meeting minutes from a transcription.

MEETING CONTEXT:
- Title: ${meeting.meeting_title}
- Date: ${meeting.scheduled_date}
- Type: ${meeting.meeting_type}

TRANSCRIPTION:
${transcriptionText}

SPEAKERS:
${speakers.map(s => `${s.name || s.id}: ${s.segments.length} segments`).join('\n')}

Please generate structured meeting minutes in JSON format with the following structure:
{
  "content": {
    "call_to_order": "...",
    "roll_call": "...",
    "approval_of_previous_minutes": "...",
    "reports": [...],
    "old_business": [...],
    "new_business": [...],
    "announcements": "...",
    "adjournment": "..."
  },
  "attendees": [
    {"name": "John Doe", "role": "Chairman", "present": true, "arrival_time": "09:00"}
  ],
  "absentees": [
    {"name": "Jane Smith", "role": "Secretary", "reason": "Travel"}
  ],
  "decisions": [
    {
      "title": "Budget Approval",
      "description": "...",
      "decision_type": "motion",
      "outcome": "approved",
      "voting_required": true,
      "context": "...",
      "implications": ["..."],
      "action_items": ["..."]
    }
  ],
  "voting_records": [
    {
      "motion": "Approve 2024 Budget",
      "votes_for": 7,
      "votes_against": 2,
      "abstentions": 1,
      "total_eligible": 10,
      "outcome": "passed",
      "quorum_met": true,
      "voting_method": "voice",
      "timestamp": "..."
    }
  ],
  "resolutions": [
    {
      "resolution_number": "2024-01",
      "title": "Budget Resolution",
      "whereas_clauses": ["WHEREAS..."],
      "resolved_clauses": ["RESOLVED..."],
      "effective_date": "2024-01-01",
      "status": "active"
    }
  ]
}

Focus on accuracy, completeness, and professional formatting. Extract all decisions, voting records, and action items clearly.
`

      const response = await fetch(`${this.OPENROUTER_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: aiSettings?.preferred_model || 'anthropic/claude-3.5-sonnet',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1, // Low temperature for accuracy
          max_tokens: 4000
        }))
      }))

      if (!response.ok) {
        throw RepositoryError.externalService('OpenRouter', `AI processing failed: ${response.statusText}`)
      }

      const result = await response.json()
      const content = result.choices?.[0]?.message?.content

      if (!content) {
        throw RepositoryError.externalService('OpenRouter', 'No content returned from AI')
      }

      try {
        const parsedContent = JSON.parse(content)
        return {
          ...parsedContent,
          metadata: {
            ai_model: aiSettings?.preferred_model || 'anthropic/claude-3.5-sonnet',
            processing_date: new Date().toISOString(),
            token_usage: result.usage,
            transcription_length: transcriptionText.length,
            speakers_count: speakers.length
          }
        }
      } catch (parseError) {
        throw RepositoryError.internal('Failed to parse AI response', parseError)
      }
    }))
  }

  /**
   * ==========================================
   * ACTION ITEM EXTRACTION AND TRACKING
   * ==========================================
   */

  /**
   * Extract action items from meeting transcription
   */
  async extractActionItems(meetingId: string, transcriptionText?: string): Promise<Result<ActionItem[]>> {
    return this.executeDbOperation(async () => {
      let content = transcriptionText

      // If no transcription text provided, get it from the meeting's transcription
      if (!content) {
        const { data: transcription } = await this.supabase
          .from('meeting_transcriptions')
          .select('transcription_text')
          .eq('meeting_id', meetingId)
          .single()
        
        content = transcription?.transcription_text
        if (!content) {
          throw RepositoryError.notFound('No transcription found for meeting')
        }
      }

      const aiResult = await this.extractActionItemsWithAI(content, meetingId)
      if (!aiResult.success) throw aiResult.error

      // Save extracted action items
      const userResult = await this.getCurrentUser()
      if (!userResult.success) throw userResult.error

      const actionItems: ActionItem[] = []
      
      for (const item of aiResult.data) {
        const { data: savedItem, error } = await this.supabase
          .from('action_items')
          .insert({
            meeting_id: meetingId,
            title: item.title,
            description: item.description,
            assigned_to: item.assigned_to,
            due_date: item.due_date,
            priority: item.priority,
            ai_extracted: true,
            ai_confidence_score: item.confidence_score,
            context_reference: item.context_reference,
            tags: item.tags,
            created_by: userResult.data.id
          }))
          .select()
          .single()

        if (error) throw error
        actionItems.push(savedItem as ActionItem)
      }

      return actionItems
    }, 'extract_action_items')
  }

  /**
   * Extract action items using AI
   */
  private async extractActionItemsWithAI(
    transcriptionText: string,
    meetingId: string
  ): Promise<Result<Array<{
    title: string
    description: string
    assigned_to?: string
    due_date?: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    confidence_score: number
    context_reference: string
    tags: string[]
  }>>> {
    const userResult = await this.getCurrentUser()
    if (!userResult.success) return userResult

    return success(await (async () => {
      const { data: aiSettings } = await this.supabase
        .from('ai_user_settings')
        .select('*')
        .eq('user_id', userResult.data.id)
        .single()

      const apiKey = aiSettings?.api_key_encrypted || process.env.OPENROUTER_API_KEY
      if (!apiKey) {
        throw RepositoryError.configuration('OpenRouter API key not configured')
      }

      const prompt = `
You are an AI assistant specialized in extracting action items from board meeting transcriptions.

Please analyze the following meeting transcription and extract all action items, tasks, follow-ups, and commitments mentioned.

TRANSCRIPTION:
${transcriptionText}

For each action item found, provide:
1. Clear, actionable title
2. Detailed description with context
3. Assigned person (if mentioned)
4. Due date/deadline (if mentioned)
5. Priority level based on urgency and importance
6. Your confidence score (0.0-1.0) in the extraction accuracy
7. Context reference (quote from transcription)
8. Relevant tags/categories

Return the results as a JSON array with this exact structure:
[
  {
    "title": "Review quarterly budget proposal",
    "description": "Analyze the Q4 budget proposal and prepare recommendations for the next board meeting",
    "assigned_to": null,
    "due_date": null,
    "priority": "medium",
    "confidence_score": 0.95,
    "context_reference": "John mentioned we need to review the quarterly budget...",
    "tags": ["budget", "finance", "quarterly-review"]
  }
]

Only extract genuine action items that require follow-up. Ignore casual mentions or completed tasks.
Be specific and actionable in your titles and descriptions.
`

      const response = await fetch(`${this.OPENROUTER_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: aiSettings?.preferred_model || 'anthropic/claude-3.5-sonnet',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 3000
        }))
      }))

      if (!response.ok) {
        throw RepositoryError.externalService('OpenRouter', `AI processing failed: ${response.statusText}`)
      }

      const result = await response.json()
      const content = result.choices?.[0]?.message?.content

      if (!content) {
        throw RepositoryError.externalService('OpenRouter', 'No content returned from AI')
      }

      try {
        const actionItems = JSON.parse(content)
        return Array.isArray(actionItems) ? actionItems : []
      } catch (parseError) {
        throw RepositoryError.internal('Failed to parse AI response for action items', parseError)
      }
    }))
  }

  /**
   * Create manual action item
   */
  async createActionItem(data: z.infer<typeof ActionItemSchema>): Promise<Result<ActionItem>> {
    const validation = this.validateWithContext<typeof data>(data, ActionItemSchema, 'action item creation')
    if (!validation.success) return validation

    const userResult = await this.getCurrentUser()
    if (!userResult.success) return userResult

    return this.executeDbOperation(async () => {
      const { data: actionItem, error } = await this.supabase
        .from('action_items')
        .insert({
          ...validation.data,
          ai_extracted: false,
          created_by: userResult.data.id
        }))
        .select()
        .single()

      if (error) throw error
      return actionItem as ActionItem
    }, 'create_action_item')
  }

  /**
   * Update action item progress
   */
  async updateActionItemProgress(
    actionItemId: string,
    updates: {
      status?: ActionItem['status']
      completion_percentage?: number
      progress_notes?: string
    }
  ): Promise<Result<ActionItem>> {
    const userResult = await this.getCurrentUser()
    if (!userResult.success) return userResult

    return this.executeDbOperation(async () => {
      const updateData: any = { updated_at: new Date().toISOString() }

      if (updates.status) {
        updateData.status = updates.status
        if (updates.status === 'completed') {
          updateData.completion_date = new Date().toISOString()
          updateData.completion_percentage = 100
        }
      }

      if (updates.completion_percentage !== undefined) {
        updateData.completion_percentage = Math.max(0, Math.min(100, updates.completion_percentage))
        if (updateData.completion_percentage === 100 && !updateData.status) {
          updateData.status = 'completed'
          updateData.completion_date = new Date().toISOString()
        }
      }

      if (updates.progress_notes) {
        // Add new progress note
        const { data: currentItem } = await this.supabase
          .from('action_items')
          .select('progress_notes')
          .eq('id', actionItemId)
          .single()

        const currentNotes = currentItem?.progress_notes || []
        updateData.progress_notes = [
          ...currentNotes,
          {
            note: updates.progress_notes,
            added_by: userResult.data.id,
            added_at: new Date().toISOString()
          }
        ]
      }

      const { data: actionItem, error } = await this.supabase
        .from('action_items')
        .update(updateData)
        .eq('id', actionItemId)
        .select()
        .single()

      if (error) throw error
      return actionItem as ActionItem
    }, 'update_action_item_progress')
  }

  /**
   * Get action items with filtering
   */
  async getActionItems(filters: {
    meeting_id?: string
    assigned_to?: string
    status?: string
    priority?: string
    overdue_only?: boolean
    page?: number
    limit?: number
  } = {}): Promise<Result<{ action_items: ActionItem[], total: number }>> {
    const { page = 1, limit = 20 } = filters

    return this.executeDbOperation(async () => {
      let query = this.supabase
        .from('action_items')
        .select('*', { count: 'exact' })

      if (filters.meeting_id) {
        query = query.eq('meeting_id', filters.meeting_id)
      }

      if (filters.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to)
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.priority) {
        query = query.eq('priority', filters.priority)
      }

      if (filters.overdue_only) {
        const today = new Date().toISOString().split('T')[0]
        query = query
          .lt('due_date', today)
          .neq('status', 'completed')
          .neq('status', 'cancelled')
      }

      const { data: actionItems, error, count } = await query
        .order('due_date', { ascending: true })
        .range((page - 1) * limit, page * limit - 1)

      if (error) throw error

      return {
        action_items: actionItems as ActionItem[],
        total: count || 0
      }
    }, 'get_action_items')
  }

  /**
   * ==========================================
   * COMPLIANCE MONITORING
   * ==========================================
   */

  /**
   * Create compliance requirement
   */
  async createComplianceRequirement(data: z.infer<typeof ComplianceRequirementSchema>): Promise<Result<ComplianceRequirement>> {
    const validation = this.validateWithContext<typeof data>(data, ComplianceRequirementSchema, 'compliance requirement creation')
    if (!validation.success) return validation

    const userResult = await this.getCurrentUser()
    if (!userResult.success) return userResult

    return this.executeDbOperation(async () => {
      const { data: requirement, error } = await this.supabase
        .from('compliance_requirements')
        .insert({
          ...validation.data,
          created_by: userResult.data.id
        }))
        .select()
        .single()

      if (error) throw error
      return requirement as ComplianceRequirement
    }, 'create_compliance_requirement')
  }

  /**
   * Check compliance status and generate alerts
   */
  async checkComplianceAlerts(boardId: string): Promise<Result<any[]>> {
    return this.executeDbOperation(async () => {
      const today = new Date()
      const alerts: any[] = []

      // Get all compliance requirements for the board
      const { data: requirements, error } = await this.supabase
        .from('compliance_requirements')
        .select('*')
        .eq('board_id', boardId)
        .eq('ai_monitored', true)

      if (error) throw error

      for (const req of requirements || []) {
        if (!req.next_due_date) continue

        const dueDate = new Date(req.next_due_date)
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        // Check if alert needed
        if (daysUntilDue <= req.days_notice_required && daysUntilDue >= 0) {
          // Upcoming deadline alert
          const alert = await this.createComplianceAlert({
            compliance_requirement_id: req.id,
            alert_type: 'upcoming_deadline',
            alert_title: `Compliance Deadline Approaching: ${req.requirement_name}`,
            alert_message: `The compliance requirement "${req.requirement_name}" is due on ${dueDate.toLocaleDateString()}. ${daysUntilDue} days remaining.`,
            severity: daysUntilDue <= 7 ? 'high' : daysUntilDue <= 14 ? 'medium' : 'low',
            target_audience: req.responsible_party ? [req.responsible_party] : [],
            alert_date: today.toISOString()
          }))
          
          if (alert.success) {
            alerts.push(alert.data)
          }
        } else if (daysUntilDue < 0) {
          // Overdue alert
          const alert = await this.createComplianceAlert({
            compliance_requirement_id: req.id,
            alert_type: 'overdue',
            alert_title: `Overdue Compliance Requirement: ${req.requirement_name}`,
            alert_message: `The compliance requirement "${req.requirement_name}" was due on ${dueDate.toLocaleDateString()}. It is now ${Math.abs(daysUntilDue)} days overdue.`,
            severity: 'critical',
            target_audience: req.responsible_party ? [req.responsible_party] : [],
            alert_date: today.toISOString()
          }))
          
          if (alert.success) {
            alerts.push(alert.data)
          }

          // Update requirement status
          await this.supabase
            .from('compliance_requirements')
            .update({ completion_status: 'overdue' })
            .eq('id', req.id)
        }
      }

      return alerts
    }, 'check_compliance_alerts')
  }

  /**
   * Create compliance alert
   */
  private async createComplianceAlert(alertData: {
    compliance_requirement_id: string
    alert_type: string
    alert_title: string
    alert_message: string
    severity: string
    target_audience: string[]
    alert_date: string
  }): Promise<Result<any>> {
    return this.executeDbOperation(async () => {
      // Check if similar alert already exists in the last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      const { data: existingAlert } = await this.supabase
        .from('compliance_alerts')
        .select('id')
        .eq('compliance_requirement_id', alertData.compliance_requirement_id)
        .eq('alert_type', alertData.alert_type)
        .gte('created_at', oneDayAgo)
        .single()

      if (existingAlert) {
        return existingAlert // Don't create duplicate alerts
      }

      const { data: alert, error } = await this.supabase
        .from('compliance_alerts')
        .insert(alertData)
        .select()
        .single()

      if (error) throw error
      return alert
    }, 'create_compliance_alert')
  }

  /**
   * ==========================================
   * SMART AGENDA GENERATION
   * ==========================================
   */

  /**
   * Generate meeting agenda using AI
   */
  async generateSmartAgenda(meetingId: string, options: {
    include_previous_items?: boolean
    template_id?: string
    custom_items?: Array<{ title: string, description?: string }>
  } = {}): Promise<Result<MeetingAgenda>> {
    const userResult = await this.getCurrentUser()
    if (!userResult.success) return userResult

    return this.executeDbOperation(async () => {
      // Get meeting details
      const { data: meeting, error: meetingError } = await this.supabase
        .from('board_meetings')
        .select('*')
        .eq('id', meetingId)
        .single()

      if (meetingError || !meeting) {
        throw RepositoryError.notFound('Meeting not found')
      }

      // Get previous meeting context if requested
      let previousContext = ''
      if (options.include_previous_items) {
        const { data: previousMeetings } = await this.supabase
          .from('board_meetings')
          .select(`
            *,
            meeting_minutes (
              decisions,
              resolutions
            ),
            action_items (
              title,
              description,
              status
            )
          `)
          .eq('board_id', meeting.board_id)
          .lt('scheduled_date', meeting.scheduled_date)
          .order('scheduled_date', { ascending: false })
          .limit(2)

        if (previousMeetings?.length) {
          previousContext = this.buildPreviousContext(previousMeetings)
        }
      }

      // Get pending action items for the board
      const { data: pendingActions } = await this.supabase
        .from('action_items')
        .select('*')
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true })
        .limit(10)

      // Generate agenda with AI
      const aiResult = await this.generateAgendaWithAI(
        meeting,
        previousContext,
        pendingActions || [],
        options.custom_items || []
      )

      if (!aiResult.success) throw aiResult.error

      // Create agenda record
      const { data: agenda, error } = await this.supabase
        .from('meeting_agendas')
        .insert({
          meeting_id: meetingId,
          title: `Agenda - ${meeting.meeting_title}`,
          agenda_items: aiResult.data.agenda_items,
          time_allocations: aiResult.data.time_allocations,
          ai_generated: true,
          ai_generation_metadata: aiResult.data.metadata,
          template_used: options.template_id,
          status: 'draft',
          created_by: userResult.data.id
        }))
        .select()
        .single()

      if (error) throw error

      return agenda as MeetingAgenda
    }, 'generate_smart_agenda')
  }

  /**
   * Build context from previous meetings
   */
  private buildPreviousContext(previousMeetings: any[]): string {
    return previousMeetings.map(meeting => {
      const decisions = meeting.meeting_minutes?.[0]?.decisions || []
      const actionItems = meeting.action_items || []
      
      return `
Previous Meeting: ${meeting.meeting_title} (${meeting.scheduled_date})
Decisions made: ${decisions.map((d: any) => d.title).join(', ')}
Action items: ${actionItems.map((a: any) => `${a.title} (${a.status})`).join(', ')}
      `.trim()
    }).join('\n\n')
  }

  /**
   * Generate agenda using AI
   */
  private async generateAgendaWithAI(
    meeting: any,
    previousContext: string,
    pendingActions: ActionItem[],
    customItems: Array<{ title: string, description?: string }>
  ): Promise<Result<{
    agenda_items: AgendaItem[]
    time_allocations: Record<string, number>
    metadata: any
  }>> {
    const userResult = await this.getCurrentUser()
    if (!userResult.success) return userResult

    return success(await (async () => {
      const { data: aiSettings } = await this.supabase
        .from('ai_user_settings')
        .select('*')
        .eq('user_id', userResult.data.id)
        .single()

      const apiKey = aiSettings?.api_key_encrypted || process.env.OPENROUTER_API_KEY
      if (!apiKey) {
        throw RepositoryError.configuration('OpenRouter API key not configured')
      }

      const prompt = `
You are an AI Board Secretary creating a comprehensive meeting agenda.

MEETING DETAILS:
- Title: ${meeting.meeting_title}
- Type: ${meeting.meeting_type}
- Date: ${meeting.scheduled_date}
- Location: ${meeting.location || 'TBD'}

PREVIOUS CONTEXT:
${previousContext}

PENDING ACTION ITEMS:
${pendingActions.map(item => `- ${item.title} (Due: ${item.due_date || 'No date'}, Status: ${item.status})`).join('\n')}

CUSTOM ITEMS REQUESTED:
${customItems.map(item => `- ${item.title}: ${item.description || ''}`).join('\n')}

Create a professional board meeting agenda with appropriate time allocations. Include standard items like:
- Call to Order
- Roll Call
- Approval of Previous Minutes
- Reports (if applicable)
- Old Business (pending items)
- New Business
- Announcements
- Adjournment

Return the agenda in this exact JSON structure:
{
  "agenda_items": [
    {
      "id": "1",
      "title": "Call to Order",
      "description": "Meeting called to order by the Chairman",
      "presenter": "Chairman",
      "time_allocation": 5,
      "order": 1,
      "type": "information",
      "attachments": [],
      "previous_action_items": []
    }
  ],
  "time_allocations": {
    "total_meeting_time": 120,
    "buffer_time": 15
  }
}

Make time allocations realistic and ensure the meeting can be completed within a reasonable timeframe.
Include relevant pending action items in the "Old Business" section.
`

      const response = await fetch(`${this.OPENROUTER_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: aiSettings?.preferred_model || 'anthropic/claude-3.5-sonnet',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 3000
        }))
      }))

      if (!response.ok) {
        throw RepositoryError.externalService('OpenRouter', `AI processing failed: ${response.statusText}`)
      }

      const result = await response.json()
      const content = result.choices?.[0]?.message?.content

      if (!content) {
        throw RepositoryError.externalService('OpenRouter', 'No content returned from AI')
      }

      try {
        const parsedContent = JSON.parse(content)
        return {
          ...parsedContent,
          metadata: {
            ai_model: aiSettings?.preferred_model || 'anthropic/claude-3.5-sonnet',
            generation_date: new Date().toISOString(),
            token_usage: result.usage,
            previous_meetings_considered: previousContext ? 1 : 0,
            pending_actions_included: pendingActions.length,
            custom_items_included: customItems.length
          }
        }
      } catch (parseError) {
        throw RepositoryError.internal('Failed to parse AI response for agenda', parseError)
      }
    }))
  }

  /**
   * ==========================================
   * UTILITY METHODS
   * ==========================================
   */

  /**
   * Queue AI processing job
   */
  private async queueAIJob(jobData: {
    job_type: string
    reference_id: string
    reference_type: string
    input_data: any
    priority?: number
  }): Promise<Result<void>> {
    const userResult = await this.getCurrentUser()
    if (!userResult.success) return userResult

    return this.executeDbOperation(async () => {
      const { error } = await this.supabase
        .from('ai_processing_jobs')
        .insert({
          ...jobData,
          status: 'queued',
          created_by: userResult.data.id
        }))

      if (error) throw error
    }, 'queue_ai_job')
  }

  /**
   * Get AI processing job status
   */
  async getAIJobStatus(jobId: string): Promise<Result<any>> {
    return this.executeDbOperation(async () => {
      const { data: job, error } = await this.supabase
        .from('ai_processing_jobs')
        .select('*')
        .eq('id', jobId)
        .single()

      if (error) throw error
      return job
    }, 'get_ai_job_status')
  }

  /**
   * Update secretary settings for a board
   */
  async updateSecretarySettings(
    boardId: string,
    settings: {
      ai_transcription_enabled?: boolean
      auto_agenda_generation?: boolean
      auto_minutes_generation?: boolean
      auto_action_extraction?: boolean
      compliance_monitoring_enabled?: boolean
      notification_preferences?: any
      ai_model_preferences?: any
      language_preference?: string
      timezone?: string
      secretary_signature?: string
      document_templates?: any
    }
  ): Promise<Result<any>> {
    const userResult = await this.getCurrentUser()
    if (!userResult.success) return userResult

    return this.executeDbOperation(async () => {
      const { data: secretarySettings, error } = await this.supabase
        .from('board_secretary_settings')
        .upsert({
          board_id: boardId,
          ...settings,
          updated_at: new Date().toISOString()
        }))
        .select()
        .single()

      if (error) throw error
      return secretarySettings
    }, 'update_secretary_settings')
  }

  /**
   * Get secretary settings for a board
   */
  async getSecretarySettings(boardId: string): Promise<Result<any>> {
    return this.executeDbOperation(async () => {
      const { data: settings, error } = await this.supabase
        .from('board_secretary_settings')
        .select('*')
        .eq('board_id', boardId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      
      // Return default settings if none exist
      return settings || {
        board_id: boardId,
        ai_transcription_enabled: true,
        auto_agenda_generation: true,
        auto_minutes_generation: true,
        auto_action_extraction: true,
        compliance_monitoring_enabled: true,
        notification_preferences: {},
        ai_model_preferences: {},
        language_preference: 'en',
        timezone: 'UTC'
      }
    }, 'get_secretary_settings')
  }
}