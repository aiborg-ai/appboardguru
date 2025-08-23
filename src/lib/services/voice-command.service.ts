'use client'

/**
 * Voice Command Service for BoardMates Management
 * 
 * Enterprise-grade voice processing system for $500K/seat application
 * Features: Speech recognition, NLP processing, voice biometrics, command execution
 */

interface VoiceCommand {
  id: string
  type: 'add_member' | 'search_member' | 'filter_members' | 'export_data' | 'analytics_query'
  text: string
  confidence: number
  timestamp: Date
  userId: string
  parameters: Record<string, any>
  status: 'pending' | 'processing' | 'completed' | 'failed'
  biometricMatch?: number // Voice biometric confidence 0-1
}

interface VoiceBiometricProfile {
  userId: string
  voiceprint: Float32Array // Voice biometric data
  characteristics: {
    pitch: number
    tone: number
    cadence: number
    accent: string
    confidence: number
  }
  createdAt: Date
  lastUpdated: Date
}

interface SpeechProcessingResult {
  transcription: string
  confidence: number
  language: string
  intent: string
  entities: Array<{
    type: string
    value: string
    confidence: number
  }>
  biometricMatch?: number
}

export class VoiceCommandService {
  private recognition: SpeechRecognition | null = null
  private isListening = false
  private audioContext: AudioContext | null = null
  private mediaRecorder: MediaRecorder | null = null
  private voiceBiometrics: Map<string, VoiceBiometricProfile> = new Map()
  private commandHistory: VoiceCommand[] = []

  constructor() {
    this.initializeSpeechRecognition()
    this.initializeAudioContext()
  }

  /**
   * Initialize Web Speech API for voice recognition
   */
  private initializeSpeechRecognition() {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      // @ts-ignore
      this.recognition = new webkitSpeechRecognition()
      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.lang = 'en-US'
      this.recognition.maxAlternatives = 3
    }
  }

  /**
   * Initialize audio context for voice biometrics
   */
  private initializeAudioContext() {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext()
    }
  }

  /**
   * Start listening for voice commands
   */
  async startListening(userId: string): Promise<void> {
    if (!this.recognition) {
      throw new Error('Speech recognition not supported in this browser')
    }

    if (this.isListening) {
      return
    }

    try {
      // Request microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      this.isListening = true
      
      this.recognition.onstart = () => {
        console.log('Voice recognition started')
      }

      this.recognition.onresult = async (event) => {
        const results = event.results
        const lastResult = results[results.length - 1]
        
        if (lastResult.isFinal) {
          const transcription = lastResult[0].transcript
          const confidence = lastResult[0].confidence
          
          await this.processVoiceCommand(transcription, confidence, userId)
        }
      }

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        this.isListening = false
      }

      this.recognition.onend = () => {
        this.isListening = false
      }

      this.recognition.start()
      
      // Start voice biometric capture
      await this.startBiometricCapture(stream, userId)
      
    } catch (error) {
      console.error('Failed to start voice recognition:', error)
      throw error
    }
  }

  /**
   * Stop listening for voice commands
   */
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
      this.isListening = false
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
    }
  }

  /**
   * Process voice command using NLP and intent recognition
   */
  private async processVoiceCommand(
    transcription: string, 
    confidence: number, 
    userId: string
  ): Promise<VoiceCommand> {
    const command: VoiceCommand = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'add_member',
      text: transcription.toLowerCase().trim(),
      confidence,
      timestamp: new Date(),
      userId,
      parameters: {},
      status: 'processing'
    }

    try {
      // Intent recognition and entity extraction
      const processed = await this.analyzeIntent(transcription)
      
      command.type = this.mapIntentToCommandType(processed.intent)
      command.parameters = this.extractParameters(processed.entities, transcription)
      
      // Add to command history
      this.commandHistory.push(command)
      
      // Execute command
      await this.executeCommand(command)
      
      command.status = 'completed'
      
    } catch (error) {
      console.error('Failed to process voice command:', error)
      command.status = 'failed'
    }

    return command
  }

  /**
   * Analyze intent from transcribed text
   */
  private async analyzeIntent(text: string): Promise<SpeechProcessingResult> {
    const normalizedText = text.toLowerCase().trim()
    
    // Intent patterns for BoardMates management
    const intentPatterns = {
      add_member: [
        /add (.*?) to the board/,
        /invite (.*?) as (.*)/,
        /bring (.*?) onto the board/,
        /include (.*?) in the vault/,
        /add new member (.*)/
      ],
      search_member: [
        /find (.*)/,
        /search for (.*)/,
        /look for (.*)/,
        /show me (.*)/
      ],
      filter_members: [
        /show (.*?) members/,
        /filter by (.*)/,
        /display only (.*)/,
        /show members with (.*)/
      ],
      analytics_query: [
        /what.* performance/,
        /show analytics/,
        /board statistics/,
        /performance metrics/,
        /diversity score/
      ],
      export_data: [
        /export (.*)/,
        /download (.*)/,
        /generate report/,
        /create report/
      ]
    }

    // Find matching intent
    let detectedIntent = 'unknown'
    let entities: any[] = []
    
    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      for (const pattern of patterns) {
        const match = normalizedText.match(pattern)
        if (match) {
          detectedIntent = intent
          
          // Extract entities based on pattern matches
          if (match[1]) {
            entities.push({
              type: intent === 'add_member' ? 'member_name' : 'search_term',
              value: match[1].trim(),
              confidence: 0.9
            })
          }
          
          if (match[2] && intent === 'add_member') {
            entities.push({
              type: 'role',
              value: match[2].trim(),
              confidence: 0.8
            })
          }
          
          break
        }
      }
      if (detectedIntent !== 'unknown') break
    }

    return {
      transcription: text,
      confidence: 0.9,
      language: 'en-US',
      intent: detectedIntent,
      entities
    }
  }

  /**
   * Map NLP intent to command type
   */
  private mapIntentToCommandType(intent: string): VoiceCommand['type'] {
    const mapping: Record<string, VoiceCommand['type']> = {
      'add_member': 'add_member',
      'search_member': 'search_member',
      'filter_members': 'filter_members',
      'analytics_query': 'analytics_query',
      'export_data': 'export_data'
    }
    
    return mapping[intent] || 'add_member'
  }

  /**
   * Extract parameters from entities and text
   */
  private extractParameters(entities: any[], text: string): Record<string, any> {
    const parameters: Record<string, any> = {}
    
    entities.forEach(entity => {
      switch (entity.type) {
        case 'member_name':
          parameters.memberName = entity.value
          
          // Extract email if mentioned
          const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)
          if (emailMatch) {
            parameters.email = emailMatch[0]
          }
          break
          
        case 'role':
          const roleMapping: Record<string, string> = {
            'admin': 'admin',
            'administrator': 'admin',
            'member': 'member',
            'viewer': 'viewer',
            'owner': 'owner'
          }
          parameters.role = roleMapping[entity.value.toLowerCase()] || 'member'
          break
          
        case 'search_term':
          parameters.searchTerm = entity.value
          break
      }
    })
    
    return parameters
  }

  /**
   * Execute voice command
   */
  private async executeCommand(command: VoiceCommand): Promise<void> {
    switch (command.type) {
      case 'add_member':
        await this.executeAddMemberCommand(command)
        break
        
      case 'search_member':
        await this.executeSearchCommand(command)
        break
        
      case 'filter_members':
        await this.executeFilterCommand(command)
        break
        
      case 'analytics_query':
        await this.executeAnalyticsQuery(command)
        break
        
      case 'export_data':
        await this.executeExportCommand(command)
        break
        
      default:
        console.log('Unknown command type:', command.type)
    }
  }

  /**
   * Execute add member voice command
   */
  private async executeAddMemberCommand(command: VoiceCommand): Promise<void> {
    const { memberName, email, role = 'member' } = command.parameters
    
    if (!memberName) {
      throw new Error('Member name is required')
    }
    
    // Dispatch custom event to notify UI components
    const event = new CustomEvent('voiceCommandAddMember', {
      detail: {
        memberName,
        email,
        role,
        commandId: command.id,
        confidence: command.confidence
      }
    })
    
    window.dispatchEvent(event)
    
    // Log the command execution
    console.log('Voice command executed: Add member', {
      memberName,
      email,
      role,
      confidence: command.confidence
    })
  }

  /**
   * Execute search command
   */
  private async executeSearchCommand(command: VoiceCommand): Promise<void> {
    const { searchTerm } = command.parameters
    
    const event = new CustomEvent('voiceCommandSearch', {
      detail: {
        searchTerm,
        commandId: command.id
      }
    })
    
    window.dispatchEvent(event)
  }

  /**
   * Execute filter command
   */
  private async executeFilterCommand(command: VoiceCommand): Promise<void> {
    const event = new CustomEvent('voiceCommandFilter', {
      detail: command.parameters
    })
    
    window.dispatchEvent(event)
  }

  /**
   * Execute analytics query
   */
  private async executeAnalyticsQuery(command: VoiceCommand): Promise<void> {
    const event = new CustomEvent('voiceCommandAnalytics', {
      detail: {
        query: command.text,
        commandId: command.id
      }
    })
    
    window.dispatchEvent(event)
  }

  /**
   * Execute export command
   */
  private async executeExportCommand(command: VoiceCommand): Promise<void> {
    const event = new CustomEvent('voiceCommandExport', {
      detail: command.parameters
    })
    
    window.dispatchEvent(event)
  }

  /**
   * Start voice biometric capture for security
   */
  private async startBiometricCapture(stream: MediaStream, userId: string): Promise<void> {
    if (!this.audioContext) return
    
    try {
      this.mediaRecorder = new MediaRecorder(stream)
      const audioChunks: Blob[] = []
      
      this.mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data)
      }
      
      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
        await this.processBiometricData(audioBlob, userId)
      }
      
      this.mediaRecorder.start(1000) // Capture every second
      
    } catch (error) {
      console.error('Failed to start biometric capture:', error)
    }
  }

  /**
   * Process biometric voice data (simplified implementation)
   */
  private async processBiometricData(audioBlob: Blob, userId: string): Promise<void> {
    try {
      // In a real implementation, this would use ML models for voice biometrics
      // For now, we'll create a simplified biometric profile
      
      const arrayBuffer = await audioBlob.arrayBuffer()
      const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer)
      
      // Extract basic audio characteristics
      const channelData = audioBuffer.getChannelData(0)
      const characteristics = this.extractVoiceCharacteristics(channelData)
      
      const profile: VoiceBiometricProfile = {
        userId,
        voiceprint: new Float32Array(channelData.slice(0, 1024)), // First 1024 samples
        characteristics,
        createdAt: new Date(),
        lastUpdated: new Date()
      }
      
      this.voiceBiometrics.set(userId, profile)
      
    } catch (error) {
      console.error('Failed to process biometric data:', error)
    }
  }

  /**
   * Extract voice characteristics for biometric profiling
   */
  private extractVoiceCharacteristics(channelData: Float32Array): VoiceBiometricProfile['characteristics'] {
    // Calculate basic audio features
    let sum = 0
    let sumSquares = 0
    let peaks = 0
    
    for (let i = 0; i < channelData.length; i++) {
      const sample = channelData[i]
      sum += sample
      sumSquares += sample * sample
      
      if (Math.abs(sample) > 0.5) {
        peaks++
      }
    }
    
    const mean = sum / channelData.length
    const variance = (sumSquares / channelData.length) - (mean * mean)
    const rms = Math.sqrt(variance)
    
    return {
      pitch: mean * 1000 + 100, // Simplified pitch estimation
      tone: rms * 100, // Tone estimation
      cadence: (peaks / channelData.length) * 100, // Speech rhythm
      accent: 'neutral', // Would require more sophisticated analysis
      confidence: 0.8
    }
  }

  /**
   * Verify speaker identity using voice biometrics
   */
  async verifyBiometrics(userId: string, audioData: Float32Array): Promise<number> {
    const profile = this.voiceBiometrics.get(userId)
    
    if (!profile) {
      return 0.0 // No profile found
    }
    
    // Simple correlation-based matching
    const correlation = this.calculateCorrelation(profile.voiceprint, audioData.slice(0, 1024))
    return Math.max(0, Math.min(1, correlation))
  }

  /**
   * Calculate correlation between two audio signals
   */
  private calculateCorrelation(signal1: Float32Array, signal2: Float32Array): number {
    const length = Math.min(signal1.length, signal2.length)
    let correlation = 0
    
    for (let i = 0; i < length; i++) {
      correlation += signal1[i] * signal2[i]
    }
    
    return correlation / length
  }

  /**
   * Get command history
   */
  getCommandHistory(): VoiceCommand[] {
    return [...this.commandHistory].reverse() // Most recent first
  }

  /**
   * Clear command history
   */
  clearCommandHistory(): void {
    this.commandHistory = []
  }

  /**
   * Get listening status
   */
  isCurrentlyListening(): boolean {
    return this.isListening
  }

  /**
   * Get supported voice commands help
   */
  getVoiceCommandsHelp(): Array<{ command: string; example: string }> {
    return [
      {
        command: 'Add Member',
        example: 'Add John Smith to the board as admin'
      },
      {
        command: 'Invite Member',
        example: 'Invite sarah@company.com as a member'
      },
      {
        command: 'Search Members',
        example: 'Find all members from TechFlow'
      },
      {
        command: 'Filter Members',
        example: 'Show only admin members'
      },
      {
        command: 'View Analytics',
        example: 'Show board performance metrics'
      },
      {
        command: 'Export Data',
        example: 'Export member list as PDF'
      }
    ]
  }
}

// Export singleton instance
export const voiceCommandService = new VoiceCommandService()