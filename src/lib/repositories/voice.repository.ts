import { BaseRepository } from './base.repository'
import { Result, success, failure, RepositoryError } from './result'
import type { Database } from '../../types/database'

// Voice session types
export interface VoiceSession {
  id: string
  host_user_id: string
  name: string
  description?: string
  collaboration_type: 'brainstorming' | 'presentation' | 'discussion' | 'review'
  spatial_audio_config: {
    enabled: boolean
    room_size: 'small' | 'medium' | 'large'
    acoustics: 'studio' | 'conference' | 'open_space'
  }
  permissions: {
    allow_screen_share: boolean
    allow_file_share: boolean
    allow_recording: boolean
    participant_limit: number
  }
  status: 'scheduled' | 'active' | 'ended' | 'cancelled'
  participants: VoiceParticipant[]
  created_at: string
  started_at?: string
  ended_at?: string
}

export interface VoiceParticipant {
  user_id: string
  session_id: string
  role: 'host' | 'presenter' | 'participant'
  spatial_position?: {
    x: number
    y: number
    z: number
  }
  audio_settings: {
    muted: boolean
    volume: number
    spatial_audio_enabled: boolean
  }
  joined_at: string
  left_at?: string
}

export interface CreateVoiceSessionData {
  host_user_id: string
  name: string
  description?: string
  collaboration_type: 'brainstorming' | 'presentation' | 'discussion' | 'review'
  spatial_audio_config: {
    enabled: boolean
    room_size: 'small' | 'medium' | 'large'
    acoustics: 'studio' | 'conference' | 'open_space'
  }
  permissions: {
    allow_screen_share: boolean
    allow_file_share: boolean
    allow_recording: boolean
    participant_limit: number
  }
}

export interface VoiceSessionAnalytics {
  session_id: string
  total_duration: number
  participant_count: number
  peak_participants: number
  engagement_metrics: {
    speaking_time_distribution: Record<string, number>
    interruption_count: number
    silence_periods: number
    active_participation_rate: number
  }
  technical_metrics: {
    average_audio_quality: number
    connection_stability: number
    spatial_audio_usage: boolean
  }
  generated_at: string
}

export class VoiceRepository extends BaseRepository {
  // Session management
  async createSession(data: CreateVoiceSessionData): Promise<Result<VoiceSession>> {
    try {
      const sessionId = `vs_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      
      const session: VoiceSession = {
        id: sessionId,
        host_user_id: data.host_user_id,
        name: data.name,
        description: data.description,
        collaboration_type: data.collaboration_type,
        spatial_audio_config: data.spatial_audio_config,
        permissions: data.permissions,
        status: 'scheduled',
        participants: [],
        created_at: new Date().toISOString()
      }

      const { data: insertedSession, error } = await this.supabase
        .from('voice_sessions')
        .insert({
          id: session.id,
          host_user_id: session.host_user_id,
          name: session.name,
          description: session.description,
          collaboration_type: session.collaboration_type,
          spatial_audio_config: session.spatial_audio_config,
          permissions: session.permissions,
          status: session.status,
          created_at: session.created_at
        })
        .select()
        .single()

      if (error) {
        return failure(RepositoryError.create('Failed to create voice session', error))
      }

      return success(session)
    } catch (error) {
      return failure(RepositoryError.internal('Unexpected error creating voice session'))
    }
  }

  async findSessionById(sessionId: string): Promise<Result<VoiceSession | null>> {
    try {
      const { data, error } = await this.supabase
        .from('voice_sessions')
        .select(`
          *,
          voice_participants (
            user_id,
            role,
            spatial_position,
            audio_settings,
            joined_at,
            left_at
          )
        `)
        .eq('id', sessionId)
        .single()

      if (error && error.code !== 'PGRST116') {
        return failure(RepositoryError.notFound('Voice session', sessionId))
      }

      if (!data) {
        return success(null)
      }

      const session: VoiceSession = {
        id: data.id,
        host_user_id: data.host_user_id,
        name: data.name,
        description: data.description,
        collaboration_type: data.collaboration_type,
        spatial_audio_config: data.spatial_audio_config,
        permissions: data.permissions,
        status: data.status,
        participants: (data.voice_participants || []).map((p: any) => ({
          user_id: p.user_id,
          session_id: data.id,
          role: p.role,
          spatial_position: p.spatial_position,
          audio_settings: p.audio_settings,
          joined_at: p.joined_at,
          left_at: p.left_at
        })),
        created_at: data.created_at,
        started_at: data.started_at,
        ended_at: data.ended_at
      }

      return success(session)
    } catch (error) {
      return failure(RepositoryError.internal('Unexpected error fetching voice session'))
    }
  }

  async updateSessionStatus(sessionId: string, status: VoiceSession['status']): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('voice_sessions')
        .update({ 
          status,
          ...(status === 'active' && { started_at: new Date().toISOString() }),
          ...(status === 'ended' && { ended_at: new Date().toISOString() })
        })
        .eq('id', sessionId)

      if (error) {
        return failure(RepositoryError.update('Failed to update session status', error))
      }

      return success(void 0)
    } catch (error) {
      return failure(RepositoryError.internal('Unexpected error updating session status'))
    }
  }

  async findSessionsByUser(userId: string): Promise<Result<VoiceSession[]>> {
    try {
      const { data, error } = await this.supabase
        .from('voice_sessions')
        .select(`
          *,
          voice_participants!inner (
            user_id,
            role,
            spatial_position,
            audio_settings,
            joined_at,
            left_at
          )
        `)
        .or(`host_user_id.eq.${userId},voice_participants.user_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (error) {
        return failure(RepositoryError.query('Failed to fetch user sessions', error))
      }

      const sessions = (data || []).map((session: any) => ({
        id: session.id,
        host_user_id: session.host_user_id,
        name: session.name,
        description: session.description,
        collaboration_type: session.collaboration_type,
        spatial_audio_config: session.spatial_audio_config,
        permissions: session.permissions,
        status: session.status,
        participants: (session.voice_participants || []).map((p: any) => ({
          user_id: p.user_id,
          session_id: session.id,
          role: p.role,
          spatial_position: p.spatial_position,
          audio_settings: p.audio_settings,
          joined_at: p.joined_at,
          left_at: p.left_at
        })),
        created_at: session.created_at,
        started_at: session.started_at,
        ended_at: session.ended_at
      }))

      return success(sessions)
    } catch (error) {
      return failure(RepositoryError.internal('Unexpected error fetching user sessions'))
    }
  }

  // Participant management
  async addParticipant(sessionId: string, participant: Omit<VoiceParticipant, 'session_id'>): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('voice_participants')
        .insert({
          session_id: sessionId,
          user_id: participant.user_id,
          role: participant.role,
          spatial_position: participant.spatial_position,
          audio_settings: participant.audio_settings,
          joined_at: participant.joined_at
        })

      if (error) {
        return failure(RepositoryError.create('Failed to add participant', error))
      }

      return success(void 0)
    } catch (error) {
      return failure(RepositoryError.internal('Unexpected error adding participant'))
    }
  }

  async removeParticipant(sessionId: string, userId: string): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('voice_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('session_id', sessionId)
        .eq('user_id', userId)

      if (error) {
        return failure(RepositoryError.update('Failed to remove participant', error))
      }

      return success(void 0)
    } catch (error) {
      return failure(RepositoryError.internal('Unexpected error removing participant'))
    }
  }

  async updateParticipantPosition(
    sessionId: string, 
    userId: string, 
    position: { x: number; y: number; z: number }
  ): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('voice_participants')
        .update({ spatial_position: position })
        .eq('session_id', sessionId)
        .eq('user_id', userId)

      if (error) {
        return failure(RepositoryError.update('Failed to update participant position', error))
      }

      return success(void 0)
    } catch (error) {
      return failure(RepositoryError.internal('Unexpected error updating participant position'))
    }
  }

  // Analytics
  async generateSessionAnalytics(sessionId: string): Promise<Result<VoiceSessionAnalytics>> {
    try {
      // This would typically analyze stored session data
      // For now, return mock analytics structure
      const analytics: VoiceSessionAnalytics = {
        session_id: sessionId,
        total_duration: 0,
        participant_count: 0,
        peak_participants: 0,
        engagement_metrics: {
          speaking_time_distribution: {},
          interruption_count: 0,
          silence_periods: 0,
          active_participation_rate: 0
        },
        technical_metrics: {
          average_audio_quality: 0,
          connection_stability: 0,
          spatial_audio_usage: false
        },
        generated_at: new Date().toISOString()
      }

      // TODO: Implement actual analytics calculation from session data
      
      return success(analytics)
    } catch (error) {
      return failure(RepositoryError.internal('Failed to generate session analytics'))
    }
  }
}