/**
 * Unit Tests for Voice Command Service
 * Testing enterprise-grade voice recognition and command processing
 */

import { VoiceCommandService } from '@/lib/services/voice-command.service'

// Mock Web APIs
const mockSpeechRecognition = {
  continuous: false,
  interimResults: false,
  lang: 'en-US',
  maxAlternatives: 1,
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  onstart: null,
  onresult: null,
  onerror: null,
  onend: null,
  dispatchEvent: jest.fn()
}

const mockMediaDevices = {
  getUserMedia: jest.fn()
}

const mockAudioContext = {
  decodeAudioData: jest.fn(),
  createAnalyser: jest.fn(),
  createMediaStreamSource: jest.fn(),
  close: jest.fn(),
  state: 'running'
}

const mockMediaRecorder = {
  start: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  state: 'inactive',
  ondataavailable: null,
  onstop: null,
  onerror: null,
  stream: null
}

// Setup global mocks
beforeAll(() => {
  // @ts-ignore
  global.webkitSpeechRecognition = jest.fn(() => mockSpeechRecognition)
  global.AudioContext = jest.fn(() => mockAudioContext) as any
  global.MediaRecorder = jest.fn(() => mockMediaRecorder) as any
  global.navigator = {
    ...global.navigator,
    mediaDevices: mockMediaDevices
  } as any
  
  // Mock window event dispatch
  global.window = {
    ...global.window,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  } as any
})

describe('VoiceCommandService', () => {
  let service: VoiceCommandService
  let mockStream: MediaStream

  beforeEach(() => {
    service = new VoiceCommandService()
    mockStream = {
      getTracks: () => [{
        stop: jest.fn(),
        kind: 'audio',
        enabled: true,
        readyState: 'live'
      }] as any
    } as MediaStream
    
    jest.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize speech recognition correctly', () => {
      expect(service).toBeDefined()
      expect(service.isCurrentlyListening()).toBe(false)
    })

    it('should handle browsers without speech recognition support', () => {
      // @ts-ignore
      delete global.webkitSpeechRecognition
      
      const serviceWithoutSpeech = new VoiceCommandService()
      expect(serviceWithoutSpeech).toBeDefined()
    })
  })

  describe('Voice Recognition Lifecycle', () => {
    it('should start listening successfully with proper permissions', async () => {
      mockMediaDevices.getUserMedia.mockResolvedValue(mockStream)
      
      await service.startListening('test-user-id')
      
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
      expect(mockSpeechRecognition.start).toHaveBeenCalled()
    })

    it('should handle microphone permission denial', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValue(
        new Error('Permission denied')
      )

      await expect(service.startListening('test-user-id'))
        .rejects.toThrow('Permission denied')
    })

    it('should stop listening correctly', () => {
      service.stopListening()
      
      expect(mockSpeechRecognition.stop).toHaveBeenCalled()
      expect(service.isCurrentlyListening()).toBe(false)
    })

    it('should not start multiple listening sessions', async () => {
      mockMediaDevices.getUserMedia.mockResolvedValue(mockStream)
      
      // Start first session
      await service.startListening('test-user-id')
      mockSpeechRecognition.start.mockClear()
      
      // Try to start second session
      await service.startListening('test-user-id')
      
      expect(mockSpeechRecognition.start).not.toHaveBeenCalled()
    })
  })

  describe('Intent Recognition and NLP', () => {
    it('should recognize add member commands correctly', async () => {
      const testCases = [
        {
          input: 'Add John Smith to the board as admin',
          expectedIntent: 'add_member',
          expectedEntities: {
            memberName: 'John Smith',
            role: 'admin'
          }
        },
        {
          input: 'Invite sarah@company.com as a member',
          expectedIntent: 'add_member',
          expectedEntities: {
            memberName: 'sarah@company.com',
            email: 'sarah@company.com',
            role: 'member'
          }
        },
        {
          input: 'bring Alice Johnson onto the board',
          expectedIntent: 'add_member',
          expectedEntities: {
            memberName: 'Alice Johnson'
          }
        }
      ]

      for (const testCase of testCases) {
        const result = await (service as any).analyzeIntent(testCase.input)
        
        expect(result.intent).toBe(testCase.expectedIntent)
        
        const parameters = (service as any).extractParameters(result.entities, testCase.input)
        
        if (testCase.expectedEntities.memberName) {
          expect(parameters.memberName).toBe(testCase.expectedEntities.memberName)
        }
        if (testCase.expectedEntities.role) {
          expect(parameters.role).toBe(testCase.expectedEntities.role)
        }
        if (testCase.expectedEntities.email) {
          expect(parameters.email).toBe(testCase.expectedEntities.email)
        }
      }
    })

    it('should recognize search commands correctly', async () => {
      const testCases = [
        'find John Smith',
        'search for members from TechFlow',
        'look for Sarah',
        'show me all admins'
      ]

      for (const input of testCases) {
        const result = await (service as any).analyzeIntent(input)
        expect(result.intent).toBe('search_member')
      }
    })

    it('should recognize analytics commands correctly', async () => {
      const testCases = [
        'show board performance',
        'what are our diversity metrics',
        'display board analytics',
        'show performance statistics'
      ]

      for (const input of testCases) {
        const result = await (service as any).analyzeIntent(input)
        expect(result.intent).toBe('analytics_query')
      }
    })

    it('should recognize filter commands correctly', async () => {
      const testCases = [
        'show only admin members',
        'filter by role admin',
        'display members with finance experience',
        'show active board members'
      ]

      for (const input of testCases) {
        const result = await (service as any).analyzeIntent(input)
        expect(result.intent).toBe('filter_members')
      }
    })

    it('should handle ambiguous or unclear commands', async () => {
      const ambiguousCommands = [
        'um hello',
        'can you',
        'maybe we should',
        'I think'
      ]

      for (const input of ambiguousCommands) {
        const result = await (service as any).analyzeIntent(input)
        expect(result.intent).toBe('unknown')
      }
    })
  })

  describe('Command Execution', () => {
    it('should dispatch proper events for add member commands', async () => {
      const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent')
      
      const command = {
        id: 'test-cmd-1',
        type: 'add_member' as const,
        text: 'Add John Smith as admin',
        confidence: 0.95,
        timestamp: new Date(),
        userId: 'test-user',
        parameters: {
          memberName: 'John Smith',
          role: 'admin'
        },
        status: 'processing' as const
      }

      await (service as any).executeAddMemberCommand(command)

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'voiceCommandAddMember',
          detail: expect.objectContaining({
            memberName: 'John Smith',
            role: 'admin',
            commandId: 'test-cmd-1',
            confidence: 0.95
          })
        })
      )
    })

    it('should dispatch search events correctly', async () => {
      const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent')
      
      const command = {
        id: 'test-cmd-2',
        type: 'search_member' as const,
        text: 'find Sarah Johnson',
        confidence: 0.9,
        timestamp: new Date(),
        userId: 'test-user',
        parameters: {
          searchTerm: 'Sarah Johnson'
        },
        status: 'processing' as const
      }

      await (service as any).executeSearchCommand(command)

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'voiceCommandSearch',
          detail: expect.objectContaining({
            searchTerm: 'Sarah Johnson',
            commandId: 'test-cmd-2'
          })
        })
      )
    })

    it('should handle commands with missing parameters', async () => {
      const command = {
        id: 'test-cmd-3',
        type: 'add_member' as const,
        text: 'Add someone to the board',
        confidence: 0.7,
        timestamp: new Date(),
        userId: 'test-user',
        parameters: {}, // Missing memberName
        status: 'processing' as const
      }

      await expect((service as any).executeAddMemberCommand(command))
        .rejects.toThrow('Member name is required')
    })
  })

  describe('Voice Biometric Processing', () => {
    it('should create biometric profiles from audio data', async () => {
      const mockAudioBlob = new Blob(['fake audio data'], { type: 'audio/wav' })
      const mockArrayBuffer = new ArrayBuffer(1024)
      const mockAudioBuffer = {
        getChannelData: jest.fn().mockReturnValue(new Float32Array(1024))
      }
      
      mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer)
      
      jest.spyOn(mockAudioBlob, 'arrayBuffer').mockResolvedValue(mockArrayBuffer)
      
      await (service as any).processBiometricData(mockAudioBlob, 'test-user')
      
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalledWith(mockArrayBuffer)
    })

    it('should verify speaker identity', async () => {
      const mockVoiceprint = new Float32Array(1024).fill(0.5)
      const mockTestAudio = new Float32Array(1024).fill(0.5)
      
      // First create a profile
      const mockProfile = {
        userId: 'test-user',
        voiceprint: mockVoiceprint,
        characteristics: {
          pitch: 150,
          tone: 50,
          cadence: 60,
          accent: 'neutral',
          confidence: 0.8
        },
        createdAt: new Date(),
        lastUpdated: new Date()
      }
      
      // @ts-ignore - Access private property for testing
      service.voiceBiometrics.set('test-user', mockProfile)
      
      const similarity = await service.verifyBiometrics('test-user', mockTestAudio)
      
      expect(similarity).toBeGreaterThanOrEqual(0)
      expect(similarity).toBeLessThanOrEqual(1)
    })

    it('should handle biometric verification with no profile', async () => {
      const mockTestAudio = new Float32Array(1024).fill(0.5)
      
      const similarity = await service.verifyBiometrics('unknown-user', mockTestAudio)
      
      expect(similarity).toBe(0.0)
    })

    it('should extract voice characteristics correctly', async () => {
      const mockAudioData = new Float32Array(1024)
      // Create some test audio pattern
      for (let i = 0; i < mockAudioData.length; i++) {
        mockAudioData[i] = Math.sin(i * 0.01) * 0.5
      }
      
      const characteristics = (service as any).extractVoiceCharacteristics(mockAudioData)
      
      expect(characteristics).toHaveProperty('pitch')
      expect(characteristics).toHaveProperty('tone')
      expect(characteristics).toHaveProperty('cadence')
      expect(characteristics).toHaveProperty('accent')
      expect(characteristics).toHaveProperty('confidence')
      
      expect(typeof characteristics.pitch).toBe('number')
      expect(typeof characteristics.tone).toBe('number')
      expect(typeof characteristics.cadence).toBe('number')
    })
  })

  describe('Command History and Management', () => {
    it('should maintain command history', async () => {
      // Simulate processing some commands
      const commands = [
        { text: 'Add John Smith as admin', confidence: 0.9, userId: 'test-user' },
        { text: 'Find Sarah Johnson', confidence: 0.85, userId: 'test-user' },
        { text: 'Show board analytics', confidence: 0.88, userId: 'test-user' }
      ]

      for (const cmd of commands) {
        await (service as any).processVoiceCommand(cmd.text, cmd.confidence, cmd.userId)
      }

      const history = service.getCommandHistory()
      
      expect(history.length).toBe(commands.length)
      expect(history[0].text).toContain('Show board analytics') // Most recent first
      expect(history[history.length - 1].text).toContain('Add John Smith') // Oldest last
    })

    it('should clear command history', async () => {
      await (service as any).processVoiceCommand('test command', 0.9, 'test-user')
      
      expect(service.getCommandHistory().length).toBeGreaterThan(0)
      
      service.clearCommandHistory()
      
      expect(service.getCommandHistory().length).toBe(0)
    })

    it('should limit command history size', async () => {
      // Add many commands to test history limit
      for (let i = 0; i < 200; i++) {
        await (service as any).processVoiceCommand(`command ${i}`, 0.9, 'test-user')
      }

      const history = service.getCommandHistory()
      
      // Should not exceed reasonable limit (e.g., 100 commands)
      expect(history.length).toBeLessThanOrEqual(100)
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle speech recognition errors gracefully', () => {
      const errorHandler = mockSpeechRecognition.onerror = jest.fn()
      
      // Simulate error
      if (errorHandler) {
        errorHandler({ error: 'network' } as any)
      }
      
      expect(service.isCurrentlyListening()).toBe(false)
    })

    it('should handle audio context creation failures', () => {
      // Mock AudioContext failure
      global.AudioContext = jest.fn(() => {
        throw new Error('AudioContext not supported')
      }) as any
      
      const serviceWithoutAudio = new VoiceCommandService()
      expect(serviceWithoutAudio).toBeDefined()
    })

    it('should retry failed command processing', async () => {
      const processSpy = jest.spyOn(service as any, 'analyzeIntent')
        .mockRejectedValueOnce(new Error('NLP service unavailable'))
        .mockResolvedValueOnce({
          transcription: 'Add John as admin',
          confidence: 0.8,
          language: 'en-US',
          intent: 'add_member',
          entities: [{ type: 'member_name', value: 'John', confidence: 0.9 }]
        })

      const command = await (service as any).processVoiceCommand(
        'Add John as admin', 
        0.9, 
        'test-user'
      )

      expect(command.status).toBe('completed')
    })

    it('should handle malformed voice commands', async () => {
      const malformedCommands = [
        '', // Empty
        '   ', // Whitespace only
        'aaaaaaaa', // Nonsense
        '!@#$%^&*()', // Special characters only
      ]

      for (const cmd of malformedCommands) {
        const result = await (service as any).processVoiceCommand(cmd, 0.5, 'test-user')
        expect(result.status).toBeDefined() // Should not crash
      }
    })
  })

  describe('Performance and Scalability', () => {
    it('should process commands efficiently', async () => {
      const startTime = Date.now()
      
      const promises = Array.from({ length: 10 }, (_, i) => 
        (service as any).processVoiceCommand(`test command ${i}`, 0.9, 'test-user')
      )
      
      const results = await Promise.all(promises)
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
      expect(results).toHaveLength(10)
      results.forEach(result => {
        expect(result.status).toBeDefined()
      })
    })

    it('should handle concurrent voice sessions', async () => {
      const users = ['user1', 'user2', 'user3']
      
      const sessions = users.map(async (userId, index) => {
        // Simulate different users with different commands
        return (service as any).processVoiceCommand(
          `Add member ${index} as admin`, 
          0.9, 
          userId
        )
      })

      const results = await Promise.all(sessions)
      
      expect(results).toHaveLength(3)
      results.forEach((result, index) => {
        expect(result.userId).toBe(users[index])
      })
    })

    it('should manage memory usage efficiently', async () => {
      // Process many commands to test memory management
      for (let i = 0; i < 1000; i++) {
        await (service as any).processVoiceCommand(`command ${i}`, 0.9, 'test-user')
      }

      const history = service.getCommandHistory()
      
      // History should be limited to prevent memory issues
      expect(history.length).toBeLessThan(200)
    })
  })

  describe('Help and Documentation', () => {
    it('should provide comprehensive voice command help', () => {
      const help = service.getVoiceCommandsHelp()
      
      expect(help).toBeInstanceOf(Array)
      expect(help.length).toBeGreaterThan(0)
      
      help.forEach(item => {
        expect(item).toHaveProperty('command')
        expect(item).toHaveProperty('example')
        expect(typeof item.command).toBe('string')
        expect(typeof item.example).toBe('string')
      })
    })

    it('should include all major command types in help', () => {
      const help = service.getVoiceCommandsHelp()
      const commandTypes = help.map(h => h.command.toLowerCase())
      
      expect(commandTypes.some(c => c.includes('add'))).toBe(true)
      expect(commandTypes.some(c => c.includes('search'))).toBe(true)
      expect(commandTypes.some(c => c.includes('analytics'))).toBe(true)
      expect(commandTypes.some(c => c.includes('export'))).toBe(true)
    })
  })
})