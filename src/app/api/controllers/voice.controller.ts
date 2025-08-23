/**
 * Voice Controller
 * Consolidated controller for all voice-related AI assistant features
 * Following enterprise architecture with Repository Pattern and Result<T> types
 * 
 * Consolidates 24 voice API routes into a single controller:
 * - Voice assistant features
 * - Voice transcription and processing
 * - Voice training and biometrics
 * - Voice commands and shortcuts
 * - Voice collaboration features
 * - Voice analytics and insights
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { VoiceRepository } from '@/lib/repositories/voice.repository'
import { VoiceService } from '@/lib/services/voice.service'
import { RepositoryFactory } from '@/lib/repositories'
import { Result } from '@/lib/repositories/result'
import { createUserId, createOrganizationId, createVaultId, createAssetId } from '@/lib/utils/branded-type-helpers'
import { logError, logActivity } from '@/lib/utils/logging'
import { validateRequest } from '@/lib/utils/validation'
import { withAuth } from '@/lib/middleware/auth'
import { withRateLimit } from '@/lib/middleware/rate-limit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Voice Request/Response Types
interface VoiceTranscriptionRequest {
  audioData: string // Base64 encoded audio
  audioFormat: 'wav' | 'mp3' | 'webm' | 'ogg'
  language?: string
  context?: {
    organizationId?: string
    vaultId?: string
    assetId?: string
    meetingId?: string
  }
  options?: {
    enableSpeakerDiarization?: boolean
    enablePunctuation?: boolean
    enableConfidenceScores?: boolean
    customVocabulary?: string[]
  }
}

interface VoiceCommandRequest {
  command: string
  context?: {
    organizationId?: string
    vaultId?: string
    assetId?: string
  }
  parameters?: Record<string, any>
}

interface VoiceTrainingRequest {
  sessionId?: string
  audioSamples: Array<{
    audioData: string
    transcript: string
    speakerId?: string
  }>
  trainingType: 'personalization' | 'vocabulary' | 'accent' | 'biometric'
}

interface VoiceBiometricRequest {
  audioData: string
  action: 'register' | 'authenticate' | 'verify'
  userId?: string
  challengePhrase?: string
}

interface VoiceAssistantRequest {
  query: string
  context: {
    scope: 'general' | 'organization' | 'vault' | 'asset' | 'meeting'
    organizationId?: string
    vaultId?: string
    assetId?: string
    meetingId?: string
  }
  voiceSettings?: {
    voice: string
    speed: number
    pitch: number
    volume: number
  }
  outputFormat: 'text' | 'audio' | 'both'
}

// Validation Schemas
const transcriptionSchema = z.object({
  audioData: z.string().min(1, 'Audio data is required'),
  audioFormat: z.enum(['wav', 'mp3', 'webm', 'ogg']),
  language: z.string().optional(),
  context: z.object({
    organizationId: z.string().optional(),
    vaultId: z.string().optional(),
    assetId: z.string().optional(),
    meetingId: z.string().optional()
  }).optional(),
  options: z.object({
    enableSpeakerDiarization: z.boolean().optional(),
    enablePunctuation: z.boolean().optional(),
    enableConfidenceScores: z.boolean().optional(),
    customVocabulary: z.array(z.string()).optional()
  }).optional()
})

const voiceCommandSchema = z.object({
  command: z.string().min(1, 'Command is required'),
  context: z.object({
    organizationId: z.string().optional(),
    vaultId: z.string().optional(),
    assetId: z.string().optional()
  }).optional(),
  parameters: z.record(z.any()).optional()
})

const voiceTrainingSchema = z.object({
  sessionId: z.string().optional(),
  audioSamples: z.array(z.object({
    audioData: z.string(),
    transcript: z.string(),
    speakerId: z.string().optional()
  })),
  trainingType: z.enum(['personalization', 'vocabulary', 'accent', 'biometric'])
})

const voiceBiometricSchema = z.object({
  audioData: z.string().min(1, 'Audio data is required'),
  action: z.enum(['register', 'authenticate', 'verify']),
  userId: z.string().optional(),
  challengePhrase: z.string().optional()
})

const voiceAssistantSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  context: z.object({
    scope: z.enum(['general', 'organization', 'vault', 'asset', 'meeting']),
    organizationId: z.string().optional(),
    vaultId: z.string().optional(),
    assetId: z.string().optional(),
    meetingId: z.string().optional()
  }),
  voiceSettings: z.object({
    voice: z.string(),
    speed: z.number().min(0.5).max(2.0),
    pitch: z.number().min(-20).max(20),
    volume: z.number().min(0).max(100)
  }).optional(),
  outputFormat: z.enum(['text', 'audio', 'both']).default('text')
})

export class VoiceController {
  private voiceService: VoiceService
  private repositoryFactory: RepositoryFactory

  constructor() {
    // Initialize repositories and services
    this.repositoryFactory = new RepositoryFactory(this.createSupabaseClient())
    this.voiceService = new VoiceService(this.repositoryFactory)
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
   * POST /api/voice/transcribe
   * Transcribe audio to text with advanced features
   */
  async transcribe(request: NextRequest): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, transcriptionSchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const { audioData, audioFormat, language, context, options } = validation.data
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Perform transcription
      const transcriptionResult = await this.voiceService.transcribeAudio({
        audioData,
        audioFormat,
        language: language || 'en-US',
        userId: createUserId(user.id),
        context: context ? {
          organizationId: context.organizationId ? createOrganizationId(context.organizationId) : undefined,
          vaultId: context.vaultId ? createVaultId(context.vaultId) : undefined,
          assetId: context.assetId ? createAssetId(context.assetId) : undefined,
          meetingId: context.meetingId || undefined
        } : undefined,
        options
      })

      if (!transcriptionResult.success) {
        return NextResponse.json(
          { success: false, error: transcriptionResult.error },
          { status: 500 }
        )
      }

      // Log activity
      await logActivity({
        userId: user.id,
        action: 'voice_transcription',
        details: {
          audioFormat,
          language: language || 'en-US',
          duration: transcriptionResult.data.duration,
          confidence: transcriptionResult.data.confidence
        }
      })

      return NextResponse.json({
        success: true,
        data: transcriptionResult.data
      })

    } catch (error) {
      logError('Voice transcription failed', error)
      return NextResponse.json(
        { success: false, error: 'Transcription failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/voice/commands
   * Execute voice commands with context awareness
   */
  async executeCommand(request: NextRequest): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, voiceCommandSchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const { command, context, parameters } = validation.data
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Execute voice command
      const commandResult = await this.voiceService.executeCommand({
        command,
        userId: createUserId(user.id),
        context: context ? {
          organizationId: context.organizationId ? createOrganizationId(context.organizationId) : undefined,
          vaultId: context.vaultId ? createVaultId(context.vaultId) : undefined,
          assetId: context.assetId ? createAssetId(context.assetId) : undefined
        } : undefined,
        parameters
      })

      if (!commandResult.success) {
        return NextResponse.json(
          { success: false, error: commandResult.error },
          { status: 500 }
        )
      }

      // Log command execution
      await logActivity({
        userId: user.id,
        action: 'voice_command_executed',
        details: {
          command,
          success: commandResult.success,
          executionTime: commandResult.data.executionTime
        }
      })

      return NextResponse.json({
        success: true,
        data: commandResult.data
      })

    } catch (error) {
      logError('Voice command execution failed', error)
      return NextResponse.json(
        { success: false, error: 'Command execution failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/voice/training
   * Train personalized voice models
   */
  async trainModel(request: NextRequest): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, voiceTrainingSchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const { sessionId, audioSamples, trainingType } = validation.data
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Start or continue training session
      const trainingResult = await this.voiceService.trainPersonalizedModel({
        sessionId,
        userId: createUserId(user.id),
        audioSamples,
        trainingType
      })

      if (!trainingResult.success) {
        return NextResponse.json(
          { success: false, error: trainingResult.error },
          { status: 500 }
        )
      }

      // Log training activity
      await logActivity({
        userId: user.id,
        action: 'voice_training',
        details: {
          trainingType,
          samplesCount: audioSamples.length,
          sessionId: trainingResult.data.sessionId
        }
      })

      return NextResponse.json({
        success: true,
        data: trainingResult.data
      })

    } catch (error) {
      logError('Voice training failed', error)
      return NextResponse.json(
        { success: false, error: 'Training failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/voice/biometric
   * Voice biometric authentication
   */
  async biometricAuth(request: NextRequest): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, voiceBiometricSchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const { audioData, action, userId, challengePhrase } = validation.data
      const currentUser = await this.getCurrentUser()
      
      if (!currentUser) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Perform biometric operation
      const biometricResult = await this.voiceService.processBiometric({
        audioData,
        action,
        userId: userId ? createUserId(userId) : createUserId(currentUser.id),
        challengePhrase
      })

      if (!biometricResult.success) {
        return NextResponse.json(
          { success: false, error: biometricResult.error },
          { status: 500 }
        )
      }

      // Log biometric activity (without sensitive data)
      await logActivity({
        userId: currentUser.id,
        action: `voice_biometric_${action}`,
        details: {
          success: biometricResult.success,
          confidence: biometricResult.data.confidence
        }
      })

      return NextResponse.json({
        success: true,
        data: biometricResult.data
      })

    } catch (error) {
      logError('Voice biometric authentication failed', error)
      return NextResponse.json(
        { success: false, error: 'Biometric authentication failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/voice/assistant
   * AI voice assistant with context awareness
   */
  async assistant(request: NextRequest): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, voiceAssistantSchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const { query, context, voiceSettings, outputFormat } = validation.data
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Process voice assistant request
      const assistantResult = await this.voiceService.processAssistantRequest({
        query,
        userId: createUserId(user.id),
        context: {
          scope: context.scope,
          organizationId: context.organizationId ? createOrganizationId(context.organizationId) : undefined,
          vaultId: context.vaultId ? createVaultId(context.vaultId) : undefined,
          assetId: context.assetId ? createAssetId(context.assetId) : undefined,
          meetingId: context.meetingId || undefined
        },
        voiceSettings,
        outputFormat
      })

      if (!assistantResult.success) {
        return NextResponse.json(
          { success: false, error: assistantResult.error },
          { status: 500 }
        )
      }

      // Log assistant interaction
      await logActivity({
        userId: user.id,
        action: 'voice_assistant_query',
        details: {
          scope: context.scope,
          outputFormat,
          responseTime: assistantResult.data.responseTime
        }
      })

      return NextResponse.json({
        success: true,
        data: assistantResult.data
      })

    } catch (error) {
      logError('Voice assistant request failed', error)
      return NextResponse.json(
        { success: false, error: 'Assistant request failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/voice/analytics
   * Get voice usage analytics
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
      const timeRange = url.searchParams.get('timeRange') || '7d'
      const organizationId = url.searchParams.get('organizationId')

      // Get voice analytics
      const analyticsResult = await this.voiceService.getVoiceAnalytics({
        userId: createUserId(user.id),
        organizationId: organizationId ? createOrganizationId(organizationId) : undefined,
        timeRange
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
      logError('Voice analytics retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Analytics retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/voice/shortcuts
   * Get user's voice shortcuts
   */
  async getShortcuts(request: NextRequest): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const shortcutsResult = await this.voiceService.getUserShortcuts({
        userId: createUserId(user.id)
      })

      if (!shortcutsResult.success) {
        return NextResponse.json(
          { success: false, error: shortcutsResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: shortcutsResult.data
      })

    } catch (error) {
      logError('Voice shortcuts retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Shortcuts retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/voice/shortcuts
   * Create or update voice shortcuts
   */
  async createShortcut(request: NextRequest): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const { name, trigger, action, parameters } = await request.json()

      const shortcutResult = await this.voiceService.createShortcut({
        userId: createUserId(user.id),
        name,
        trigger,
        action,
        parameters
      })

      if (!shortcutResult.success) {
        return NextResponse.json(
          { success: false, error: shortcutResult.error },
          { status: 500 }
        )
      }

      // Log shortcut creation
      await logActivity({
        userId: user.id,
        action: 'voice_shortcut_created',
        details: {
          name,
          trigger,
          action
        }
      })

      return NextResponse.json({
        success: true,
        data: shortcutResult.data
      })

    } catch (error) {
      logError('Voice shortcut creation failed', error)
      return NextResponse.json(
        { success: false, error: 'Shortcut creation failed' },
        { status: 500 }
      )
    }
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
export const voiceController = new VoiceController()

// Route handlers for different HTTP methods and endpoints
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  if (pathname.includes('/analytics')) {
    return await voiceController.getAnalytics(request)
  } else if (pathname.includes('/shortcuts')) {
    return await voiceController.getShortcuts(request)
  }
  
  return NextResponse.json(
    { success: false, error: 'Endpoint not found' },
    { status: 404 }
  )
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting to voice endpoints
  const rateLimitResult = await withRateLimit(request, {
    limit: pathname.includes('/transcribe') ? 100 : 50, // Higher limit for transcription
    window: 60 * 1000 // 1 minute window
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  if (pathname.includes('/transcribe')) {
    return await voiceController.transcribe(request)
  } else if (pathname.includes('/commands')) {
    return await voiceController.executeCommand(request)
  } else if (pathname.includes('/training')) {
    return await voiceController.trainModel(request)
  } else if (pathname.includes('/biometric')) {
    return await voiceController.biometricAuth(request)
  } else if (pathname.includes('/assistant')) {
    return await voiceController.assistant(request)
  } else if (pathname.includes('/shortcuts')) {
    return await voiceController.createShortcut(request)
  }
  
  return NextResponse.json(
    { success: false, error: 'Endpoint not found' },
    { status: 404 }
  )
}