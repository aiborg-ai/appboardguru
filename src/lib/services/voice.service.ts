import { BaseService } from './base.service'
import { Result, success, failure } from '../repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

export interface VoiceCommand {
  id: string
  command: string
  intent: string
  confidence: number
  parameters: Record<string, any>
  user_id: string
  processed_at: string
  response?: string
  action_taken?: string
  success: boolean
  processing_time_ms: number
}

export interface VoiceTranscription {
  id: string
  audio_url: string
  transcript: string
  confidence: number
  language: string
  duration_seconds: number
  user_id: string
  created_at: string
  metadata?: Record<string, any>
}

export interface VoiceBiometric {
  id: string
  user_id: string
  voice_print: number[]
  enrollment_phrases: string[]
  confidence_threshold: number
  last_updated: string
  created_at: string
  is_active: boolean
}

export interface VoiceShortcut {
  id: string
  user_id: string
  phrase: string
  action: string
  parameters: Record<string, any>
  is_active: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

export interface VoiceAnalytics {
  user_id: string
  total_commands: number
  successful_commands: number
  average_confidence: number
  most_used_commands: { command: string, count: number }[]
  language_usage: { language: string, count: number }[]
  weekly_usage: { week: string, count: number }[]
}

export interface VoiceTrainingSession {
  id: string
  user_id: string
  session_type: 'enrollment' | 'improvement' | 'testing'
  phrases: string[]
  recordings: string[]
  quality_scores: number[]
  status: 'in_progress' | 'completed' | 'failed'
  started_at: string
  completed_at?: string
  results?: Record<string, any>
}

export interface VoiceCollaboration {
  id: string
  meeting_id: string
  participants: string[]
  transcript: string
  speaker_segments: {
    speaker_id: string
    speaker_name: string
    start_time: number
    end_time: number
    text: string
    confidence: number
  }[]
  action_items: {
    text: string
    assigned_to?: string
    due_date?: string
    extracted_at: number
  }[]
  summary?: string
  created_at: string
}

export interface VoiceTranslation {
  id: string
  source_language: string
  target_language: string
  original_text: string
  translated_text: string
  confidence: number
  user_id: string
  created_at: string
}

export class VoiceService extends BaseService {
  private supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh']
  private voiceCommands = new Map<string, (params: any) => Promise<any>>()

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase)
    this.setupVoiceCommands()
  }

  /**
   * Process voice command
   */
  async processVoiceCommand(
    audioBlob: Blob,
    language: string = 'en'
  ): Promise<Result<VoiceCommand>> {
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    const startTime = Date.now()

    try {
      // Transcribe audio
      const transcriptionResult = await this.transcribeAudio(audioBlob, language)
      if (!transcriptionResult.success) {
        return transcriptionResult
      }

      const transcript = transcriptionResult.data.transcript

      // Parse intent and extract parameters
      const intentResult = await this.parseIntent(transcript)
      if (!intentResult.success) {
        return intentResult
      }

      const { intent, parameters, confidence } = intentResult.data

      // Execute command
      const executionResult = await this.executeVoiceCommand(intent, parameters)
      
      const processingTime = Date.now() - startTime

      // Create voice command record
      const voiceCommand: Omit<VoiceCommand, 'id'> = {
        command: transcript,
        intent,
        confidence,
        parameters,
        user_id: currentUserResult.data.id,
        processed_at: new Date().toISOString(),
        response: executionResult.success ? executionResult.data?.message : executionResult.error?.message,
        action_taken: executionResult.success ? intent : undefined,
        success: executionResult.success,
        processing_time_ms: processingTime
      }

      const result = await this.saveVoiceCommand(voiceCommand)
      if (!result.success) {
        return result
      }

      // Log the activity
      await this.logActivity('process_voice_command', 'voice', result.data.id, {
        intent,
        confidence,
        success: executionResult.success
      })

      return success(result.data)
    } catch (error) {
      return this.handleError(error, 'processVoiceCommand', { language })
    }
  }

  /**
   * Transcribe audio to text
   */
  async transcribeAudio(
    audioBlob: Blob,
    language: string = 'en'
  ): Promise<Result<VoiceTranscription>> {
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    return this.executeDbOperation(async () => {
      // Upload audio file
      const audioBuffer = await audioBlob.arrayBuffer()
      const audioUrl = await this.uploadAudioFile(audioBuffer)

      // Call speech-to-text service (mock implementation)
      const transcriptionData = await this.callSpeechToTextService(audioBuffer, language)

      // Save transcription
      const { data, error } = await this.supabase
        .from('voice_transcriptions')
        .insert({
          audio_url: audioUrl,
          transcript: transcriptionData.transcript,
          confidence: transcriptionData.confidence,
          language,
          duration_seconds: transcriptionData.duration,
          user_id: currentUserResult.data.id,
          created_at: new Date().toISOString(),
          metadata: transcriptionData.metadata
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return data as VoiceTranscription
    }, 'transcribeAudio', { language })
  }

  /**
   * Enroll user for voice biometrics
   */
  async enrollVoiceBiometric(
    enrollmentPhrases: string[],
    audioRecordings: Blob[]
  ): Promise<Result<VoiceBiometric>> {
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    if (enrollmentPhrases.length !== audioRecordings.length) {
      return failure(new Error('Number of phrases must match number of recordings'))
    }

    return this.executeDbOperation(async () => {
      // Process audio recordings to extract voice features
      const voicePrint = await this.extractVoiceFeatures(audioRecordings)

      // Calculate confidence threshold based on enrollment quality
      const confidenceThreshold = this.calculateConfidenceThreshold(voicePrint)

      // Save voice biometric data
      const { data, error } = await this.supabase
        .from('voice_biometrics')
        .upsert({
          user_id: currentUserResult.data.id,
          voice_print: voicePrint,
          enrollment_phrases: enrollmentPhrases,
          confidence_threshold: confidenceThreshold,
          last_updated: new Date().toISOString(),
          created_at: new Date().toISOString(),
          is_active: true
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Log the activity
      await this.logActivity('enroll_voice_biometric', 'voice', data.id, {
        phrasesCount: enrollmentPhrases.length
      })

      return data as VoiceBiometric
    }, 'enrollVoiceBiometric', { phrasesCount: enrollmentPhrases.length })
  }

  /**
   * Verify user using voice biometrics
   */
  async verifyVoiceBiometric(
    audioBlob: Blob,
    phrase: string
  ): Promise<Result<{ verified: boolean, confidence: number }>> {
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    return this.executeDbOperation(async () => {
      // Get user's voice biometric data
      const { data: biometric, error: biometricError } = await this.supabase
        .from('voice_biometrics')
        .select('*')
        .eq('user_id', currentUserResult.data.id)
        .eq('is_active', true)
        .single()

      if (biometricError || !biometric) {
        throw new Error('No voice biometric data found for user')
      }

      // Extract voice features from provided audio
      const audioBuffer = await audioBlob.arrayBuffer()
      const testVoicePrint = await this.extractVoiceFeatures([audioBlob])

      // Compare voice prints
      const confidence = this.compareVoicePrints(biometric.voice_print, testVoicePrint)
      const verified = confidence >= biometric.confidence_threshold

      // Log the verification attempt
      await this.logActivity('verify_voice_biometric', 'voice', biometric.id, {
        confidence,
        verified,
        phrase
      })

      return { verified, confidence }
    }, 'verifyVoiceBiometric', { phrase })
  }

  /**
   * Create voice shortcut
   */
  async createVoiceShortcut(
    phrase: string,
    action: string,
    parameters: Record<string, any> = {}
  ): Promise<Result<VoiceShortcut>> {
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    return this.executeDbOperation(async () => {
      const { data, error } = await this.supabase
        .from('voice_shortcuts')
        .insert({
          user_id: currentUserResult.data.id,
          phrase: phrase.toLowerCase(),
          action,
          parameters,
          is_active: true,
          usage_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Log the activity
      await this.logActivity('create_voice_shortcut', 'voice', data.id, {
        phrase,
        action
      })

      return data as VoiceShortcut
    }, 'createVoiceShortcut', { phrase, action })
  }

  /**
   * Start voice training session
   */
  async startVoiceTrainingSession(
    sessionType: 'enrollment' | 'improvement' | 'testing',
    phrases: string[]
  ): Promise<Result<VoiceTrainingSession>> {
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    return this.executeDbOperation(async () => {
      const { data, error } = await this.supabase
        .from('voice_training_sessions')
        .insert({
          user_id: currentUserResult.data.id,
          session_type: sessionType,
          phrases,
          recordings: [],
          quality_scores: [],
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return data as VoiceTrainingSession
    }, 'startVoiceTrainingSession', { sessionType, phrasesCount: phrases.length })
  }

  /**
   * Process meeting audio for collaboration
   */
  async processMeetingAudio(
    meetingId: string,
    audioBlob: Blob,
    participants: string[]
  ): Promise<Result<VoiceCollaboration>> {
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    return this.executeDbOperation(async () => {
      // Transcribe the entire meeting audio
      const transcriptionResult = await this.transcribeAudio(audioBlob)
      if (!transcriptionResult.success) {
        throw new Error('Failed to transcribe meeting audio')
      }

      // Perform speaker diarization (identify who spoke when)
      const speakerSegments = await this.performSpeakerDiarization(
        audioBlob,
        participants,
        transcriptionResult.data.transcript
      )

      // Extract action items from transcript
      const actionItems = await this.extractActionItems(transcriptionResult.data.transcript)

      // Generate meeting summary
      const summary = await this.generateMeetingSummary(
        transcriptionResult.data.transcript,
        speakerSegments,
        actionItems
      )

      // Save collaboration data
      const { data, error } = await this.supabase
        .from('voice_collaborations')
        .insert({
          meeting_id: meetingId,
          participants,
          transcript: transcriptionResult.data.transcript,
          speaker_segments: speakerSegments,
          action_items: actionItems,
          summary,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Log the activity
      await this.logActivity('process_meeting_audio', 'voice', data.id, {
        meetingId,
        participantsCount: participants.length,
        actionItemsCount: actionItems.length
      })

      return data as VoiceCollaboration
    }, 'processMeetingAudio', { meetingId, participantsCount: participants.length })
  }

  /**
   * Translate voice input
   */
  async translateVoice(
    audioBlob: Blob,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<Result<VoiceTranslation>> {
    const currentUserResult = await this.getCurrentUser()
    if (!currentUserResult.success) {
      return currentUserResult
    }

    if (!this.supportedLanguages.includes(sourceLanguage) || !this.supportedLanguages.includes(targetLanguage)) {
      return failure(new Error('Unsupported language'))
    }

    return this.executeDbOperation(async () => {
      // Transcribe audio in source language
      const transcriptionResult = await this.transcribeAudio(audioBlob, sourceLanguage)
      if (!transcriptionResult.success) {
        throw new Error('Failed to transcribe audio')
      }

      // Translate text
      const translationResult = await this.translateText(
        transcriptionResult.data.transcript,
        sourceLanguage,
        targetLanguage
      )

      // Save translation
      const { data, error } = await this.supabase
        .from('voice_translations')
        .insert({
          source_language: sourceLanguage,
          target_language: targetLanguage,
          original_text: transcriptionResult.data.transcript,
          translated_text: translationResult.translated_text,
          confidence: Math.min(transcriptionResult.data.confidence, translationResult.confidence),
          user_id: currentUserResult.data.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return data as VoiceTranslation
    }, 'translateVoice', { sourceLanguage, targetLanguage })
  }

  /**
   * Get voice analytics for user
   */
  async getVoiceAnalytics(
    userId: string,
    timeRange: { start: string, end: string }
  ): Promise<Result<VoiceAnalytics>> {
    return this.executeDbOperation(async () => {
      // Get voice commands in time range
      const { data: commands, error } = await this.supabase
        .from('voice_commands')
        .select('*')
        .eq('user_id', userId)
        .gte('processed_at', timeRange.start)
        .lte('processed_at', timeRange.end)

      if (error) {
        throw error
      }

      if (!commands || commands.length === 0) {
        return {
          user_id: userId,
          total_commands: 0,
          successful_commands: 0,
          average_confidence: 0,
          most_used_commands: [],
          language_usage: [],
          weekly_usage: []
        }
      }

      const totalCommands = commands.length
      const successfulCommands = commands.filter(c => c.success).length
      const averageConfidence = commands.reduce((sum, c) => sum + c.confidence, 0) / totalCommands

      // Calculate most used commands
      const commandCounts = new Map<string, number>()
      commands.forEach(c => {
        commandCounts.set(c.intent, (commandCounts.get(c.intent) || 0) + 1)
      })
      const mostUsedCommands = Array.from(commandCounts.entries())
        .map(([command, count]) => ({ command, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // Get language usage from transcriptions
      const { data: transcriptions } = await this.supabase
        .from('voice_transcriptions')
        .select('language')
        .eq('user_id', userId)
        .gte('created_at', timeRange.start)
        .lte('created_at', timeRange.end)

      const languageCounts = new Map<string, number>()
      transcriptions?.forEach(t => {
        languageCounts.set(t.language, (languageCounts.get(t.language) || 0) + 1)
      })
      const languageUsage = Array.from(languageCounts.entries())
        .map(([language, count]) => ({ language, count }))

      // Calculate weekly usage
      const weeklyUsage = this.calculateWeeklyUsage(commands, timeRange)

      return {
        user_id: userId,
        total_commands: totalCommands,
        successful_commands: successfulCommands,
        average_confidence: averageConfidence,
        most_used_commands: mostUsedCommands,
        language_usage: languageUsage,
        weekly_usage: weeklyUsage
      }
    }, 'getVoiceAnalytics', { userId, timeRange })
  }

  /**
   * Private helper methods
   */
  private setupVoiceCommands(): void {
    // Register built-in voice commands
    this.voiceCommands.set('search', async (params) => {
      return { message: `Searching for: ${params.query}`, action: 'search', data: params }
    })

    this.voiceCommands.set('create_meeting', async (params) => {
      return { message: `Creating meeting: ${params.title}`, action: 'create_meeting', data: params }
    })

    this.voiceCommands.set('upload_file', async (params) => {
      return { message: `File upload initiated`, action: 'upload_file', data: params }
    })

    this.voiceCommands.set('navigate', async (params) => {
      return { message: `Navigating to: ${params.destination}`, action: 'navigate', data: params }
    })

    this.voiceCommands.set('set_reminder', async (params) => {
      return { message: `Reminder set for: ${params.time}`, action: 'set_reminder', data: params }
    })
  }

  private async parseIntent(transcript: string): Promise<Result<{
    intent: string,
    parameters: Record<string, any>,
    confidence: number
  }>> {
    // Simple intent parsing - in production, this would use NLP services
    const lowerTranscript = transcript.toLowerCase()

    // Search intent
    if (lowerTranscript.includes('search') || lowerTranscript.includes('find')) {
      const query = lowerTranscript.replace(/(search|find)\s+(for\s+)?/, '').trim()
      return success({
        intent: 'search',
        parameters: { query },
        confidence: 0.9
      })
    }

    // Create meeting intent
    if (lowerTranscript.includes('create meeting') || lowerTranscript.includes('schedule meeting')) {
      const title = lowerTranscript.replace(/(create|schedule)\s+meeting\s+(about\s+|for\s+)?/, '').trim()
      return success({
        intent: 'create_meeting',
        parameters: { title },
        confidence: 0.85
      })
    }

    // Navigation intent
    if (lowerTranscript.includes('go to') || lowerTranscript.includes('navigate to')) {
      const destination = lowerTranscript.replace(/(go\s+to|navigate\s+to)\s+/, '').trim()
      return success({
        intent: 'navigate',
        parameters: { destination },
        confidence: 0.8
      })
    }

    // Default fallback
    return success({
      intent: 'unknown',
      parameters: { transcript },
      confidence: 0.3
    })
  }

  private async executeVoiceCommand(
    intent: string,
    parameters: Record<string, any>
  ): Promise<Result<any>> {
    const commandHandler = this.voiceCommands.get(intent)
    
    if (!commandHandler) {
      return failure(new Error(`Unknown command: ${intent}`))
    }

    try {
      const result = await commandHandler(parameters)
      return success(result)
    } catch (error) {
      return failure(error instanceof Error ? error : new Error(String(error)))
    }
  }

  private async saveVoiceCommand(voiceCommand: Omit<VoiceCommand, 'id'>): Promise<Result<VoiceCommand>> {
    const { data, error } = await this.supabase
      .from('voice_commands')
      .insert(voiceCommand)
      .select()
      .single()

    if (error) {
      return failure(error)
    }

    return success(data as VoiceCommand)
  }

  private async uploadAudioFile(audioBuffer: ArrayBuffer): Promise<string> {
    // Mock implementation - in production, this would upload to cloud storage
    const fileName = `audio_${Date.now()}.wav`
    const url = `/api/voice/audio/${fileName}`
    
    // Store audio buffer temporarily (in production, upload to S3/GCS)
    return url
  }

  private async callSpeechToTextService(
    audioBuffer: ArrayBuffer,
    language: string
  ): Promise<{
    transcript: string,
    confidence: number,
    duration: number,
    metadata: Record<string, any>
  }> {
    // Mock implementation - in production, this would call actual STT service
    return {
      transcript: 'Mock transcription of audio content',
      confidence: 0.92,
      duration: 5.2,
      metadata: {
        audioFormat: 'wav',
        sampleRate: 16000,
        channels: 1
      }
    }
  }

  private async extractVoiceFeatures(audioRecordings: Blob[]): Promise<number[]> {
    // Mock implementation - in production, this would extract actual voice features
    const features: number[] = []
    
    for (let i = 0; i < 128; i++) {
      features.push(Math.random())
    }
    
    return features
  }

  private calculateConfidenceThreshold(voicePrint: number[]): number {
    // Calculate threshold based on voice print quality
    const variance = this.calculateVariance(voicePrint)
    return Math.max(0.7, Math.min(0.95, 0.8 + (variance * 0.1)))
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length
  }

  private compareVoicePrints(enrolled: number[], test: number[]): number {
    // Calculate cosine similarity between voice prints
    if (enrolled.length !== test.length) {
      return 0
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < enrolled.length; i++) {
      dotProduct += enrolled[i] * test[i]
      normA += enrolled[i] * enrolled[i]
      normB += test[i] * test[i]
    }

    if (normA === 0 || normB === 0) {
      return 0
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  private async performSpeakerDiarization(
    audioBlob: Blob,
    participants: string[],
    transcript: string
  ): Promise<any[]> {
    // Mock implementation - in production, this would use speaker diarization service
    const segments = []
    const words = transcript.split(' ')
    let currentTime = 0
    
    for (let i = 0; i < words.length; i += 10) {
      const speakerIndex = Math.floor(Math.random() * participants.length)
      const segmentWords = words.slice(i, i + 10)
      const duration = segmentWords.length * 0.5 // ~0.5 seconds per word
      
      segments.push({
        speaker_id: participants[speakerIndex],
        speaker_name: `Participant ${speakerIndex + 1}`,
        start_time: currentTime,
        end_time: currentTime + duration,
        text: segmentWords.join(' '),
        confidence: 0.85
      })
      
      currentTime += duration
    }
    
    return segments
  }

  private async extractActionItems(transcript: string): Promise<any[]> {
    // Simple action item extraction - in production, this would use NLP
    const actionItems = []
    const sentences = transcript.split(/[.!?]+/)
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase()
      if (lowerSentence.includes('todo') || 
          lowerSentence.includes('action item') ||
          lowerSentence.includes('follow up') ||
          lowerSentence.includes('need to')) {
        
        actionItems.push({
          text: sentence.trim(),
          extracted_at: Math.random() * transcript.length
        })
      }
    }
    
    return actionItems
  }

  private async generateMeetingSummary(
    transcript: string,
    speakerSegments: any[],
    actionItems: any[]
  ): Promise<string> {
    // Mock summary generation - in production, this would use AI
    const participantCount = new Set(speakerSegments.map(s => s.speaker_id)).size
    const duration = Math.max(...speakerSegments.map(s => s.end_time))
    
    return `Meeting summary: ${participantCount} participants discussed various topics over ${Math.round(duration / 60)} minutes. ${actionItems.length} action items were identified.`
  }

  private async translateText(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<{ translated_text: string, confidence: number }> {
    // Mock translation - in production, this would use translation service
    return {
      translated_text: `[Translated from ${sourceLanguage} to ${targetLanguage}] ${text}`,
      confidence: 0.88
    }
  }

  private calculateWeeklyUsage(
    commands: any[],
    timeRange: { start: string, end: string }
  ): { week: string, count: number }[] {
    const weekly = new Map<string, number>()
    
    commands.forEach(command => {
      const date = new Date(command.processed_at)
      const weekStart = new Date(date.setDate(date.getDate() - date.getDay()))
      const weekKey = weekStart.toISOString().split('T')[0]
      
      weekly.set(weekKey, (weekly.get(weekKey) || 0) + 1)
    })
    
    return Array.from(weekly.entries())
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => a.week.localeCompare(b.week))
  }
}