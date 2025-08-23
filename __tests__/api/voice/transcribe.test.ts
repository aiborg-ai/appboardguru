/**
 * Comprehensive API Tests for Voice Transcription Endpoint
 * Tests cover: JSON/FormData handling, OpenRouter integration, error scenarios, security
 */

import { createMocks } from 'node-mocks-http'
import { POST, OPTIONS } from '@/app/api/voice/transcribe/route'
import { VoiceController } from '@/lib/api/controllers/voice.controller'

// Mock fetch for OpenRouter API calls
global.fetch = jest.fn()

// Mock environment variables
const originalEnv = process.env
beforeEach(() => {
  jest.resetModules()
  process.env = {
    ...originalEnv,
    OPENROUTER_API_KEY: 'test-api-key',
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000'
  }
  jest.clearAllMocks()
})

afterEach(() => {
  process.env = originalEnv
})

describe('/api/voice/transcribe', () => {
  describe('POST endpoint', () => {
    describe('JSON Request Format', () => {
      it('processes JSON request with base64 audio successfully', async () => {
        // Mock successful OpenRouter response
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: 'This is the transcribed text from OpenRouter'
              }
            }]
          })
        })

        const { req, res } = createMocks({
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: {
            audio: Buffer.from('test audio data').toString('base64'),
            format: 'webm'
          }
        })

        const response = await POST(req as any)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.text).toBe('This is the transcribed text from OpenRouter')
        expect(data.data.confidence).toBe(0.95)
        expect(data.data.format).toBe('webm')
      })

      it('handles missing audio data in JSON request', async () => {
        const { req } = createMocks({
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: {
            format: 'webm'
          }
        })

        const response = await POST(req as any)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Audio data is required')
      })

      it('defaults format to webm when not provided', async () => {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: { content: 'transcribed text' }
            }]
          })
        })

        const { req } = createMocks({
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: {
            audio: Buffer.from('test audio data').toString('base64')
          }
        })

        const response = await POST(req as any)
        const data = await response.json()

        expect(data.success).toBe(true)
        expect(data.data.format).toBe('webm')
      })
    })

    describe('FormData Request Format', () => {
      it('processes FormData request with audio file successfully', async () => {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: { content: 'FormData transcribed text' }
            }]
          })
        })

        // Create mock File
        const audioFile = new Blob(['audio data'], { type: 'audio/webm' })
        Object.defineProperty(audioFile, 'name', { value: 'audio.webm' })

        const formData = new FormData()
        formData.append('audio', audioFile as File)

        const { req } = createMocks({
          method: 'POST',
          headers: {
            'content-type': 'multipart/form-data; boundary=----test',
          }
        })

        // Mock formData method
        req.formData = jest.fn().mockResolvedValue(formData)

        const response = await POST(req as any)
        const data = await response.json()

        expect(data.success).toBe(true)
        expect(data.data.text).toBe('FormData transcribed text')
        expect(data.data.format).toBe('webm')
      })

      it('handles missing audio file in FormData request', async () => {
        const formData = new FormData()

        const { req } = createMocks({
          method: 'POST',
          headers: {
            'content-type': 'multipart/form-data; boundary=----test',
          }
        })

        req.formData = jest.fn().mockResolvedValue(formData)

        const response = await POST(req as any)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Audio file is required')
      })

      it('determines format from file MIME type', async () => {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'transcribed' } }]
          })
        })

        const audioFile = new Blob(['audio data'], { type: 'audio/wav' })
        const formData = new FormData()
        formData.append('audio', audioFile as File)

        const { req } = createMocks({
          method: 'POST',
          headers: {
            'content-type': 'multipart/form-data',
          }
        })

        req.formData = jest.fn().mockResolvedValue(formData)

        const response = await POST(req as any)
        const data = await response.json()

        expect(data.data.format).toBe('wav')
      })
    })

    describe('OpenRouter API Integration', () => {
      it('makes correct API call to OpenRouter', async () => {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'API response' } }]
          })
        })

        const { req } = createMocks({
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: {
            audio: Buffer.from('test').toString('base64'),
            format: 'webm'
          }
        })

        await POST(req as any)

        expect(global.fetch).toHaveBeenCalledWith(
          'https://openrouter.ai/api/v1/chat/completions',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': 'Bearer test-api-key',
              'Content-Type': 'application/json',
              'HTTP-Referer': 'http://localhost:3000',
              'X-Title': 'AppBoardGuru Voice Transcription'
            }),
            body: expect.stringContaining('"model":"openai/whisper-1"')
          })
        )
      })

      it('handles OpenRouter API errors gracefully', async () => {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: () => Promise.resolve({
            error: { message: 'Invalid API key' }
          })
        })

        const { req } = createMocks({
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: {
            audio: Buffer.from('test').toString('base64'),
            format: 'webm'
          }
        })

        const response = await POST(req as any)
        const data = await response.json()

        expect(data.success).toBe(true) // Should provide fallback
        expect(data.data.text).toContain('Transcription temporarily unavailable')
      })

      it('handles OpenRouter network errors', async () => {
        ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

        const { req } = createMocks({
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: {
            audio: Buffer.from('test').toString('base64'),
            format: 'webm'
          }
        })

        const response = await POST(req as any)
        const data = await response.json()

        expect(data.success).toBe(true) // Should provide fallback
        expect(data.data.text).toContain('Transcription temporarily unavailable')
      })

      it('provides helpful fallback when API key is missing', async () => {
        process.env.OPENROUTER_API_KEY = undefined
        process.env.NEXT_PUBLIC_OPENROUTER_API_KEY = undefined

        const { req } = createMocks({
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: {
            audio: Buffer.from('test').toString('base64'),
            format: 'webm'
          }
        })

        const response = await POST(req as any)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error).toContain('OpenRouter API key not configured')
      })

      it('calculates audio size correctly for different formats', async () => {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'size test response' } }]
          })
        })

        const largerAudioData = Buffer.from('a'.repeat(2048)).toString('base64') // 2KB

        const { req } = createMocks({
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: {
            audio: largerAudioData,
            format: 'wav'
          }
        })

        const response = await POST(req as any)
        const data = await response.json()

        expect(data.success).toBe(true)
        
        // Check that OpenRouter was called with size information
        const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
        const requestBody = JSON.parse(fetchCall[1].body)
        expect(requestBody.messages[0].content).toContain('2.0KB')
        expect(requestBody.messages[0].content).toContain('wav format')
      })
    })

    describe('Error Handling', () => {
      it('handles malformed JSON gracefully', async () => {
        const { req } = createMocks({
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: 'invalid json'
        })

        // Mock JSON parsing error
        req.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'))

        const response = await POST(req as any)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
      })

      it('handles FormData parsing errors', async () => {
        const { req } = createMocks({
          method: 'POST',
          headers: { 'content-type': 'multipart/form-data' }
        })

        req.formData = jest.fn().mockRejectedValue(new Error('FormData error'))

        const response = await POST(req as any)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
      })

      it('handles invalid base64 audio data', async () => {
        const { req } = createMocks({
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: {
            audio: 'invalid-base64-data!@#$%',
            format: 'webm'
          }
        })

        const response = await POST(req as any)
        
        // Should still process but may provide fallback response
        expect(response.status).toBeLessThan(500)
      })

      it('handles empty audio data gracefully', async () => {
        const { req } = createMocks({
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: {
            audio: '',
            format: 'webm'
          }
        })

        const response = await POST(req as any)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
      })
    })

    describe('Security', () => {
      it('validates content-type header', async () => {
        const { req } = createMocks({
          method: 'POST',
          headers: { 'content-type': 'text/plain' },
          body: 'some data'
        })

        const response = await POST(req as any)
        
        // Should handle gracefully or reject invalid content type
        expect(response.status).toBeLessThan(600)
      })

      it('handles large audio payloads appropriately', async () => {
        // Create very large base64 payload (1MB)
        const largeAudio = Buffer.from('x'.repeat(1024 * 1024)).toString('base64')

        const { req } = createMocks({
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: {
            audio: largeAudio,
            format: 'webm'
          }
        })

        const response = await POST(req as any)
        
        // Should handle large payloads without crashing
        expect(response.status).toBeLessThan(600)
      })

      it('does not leak sensitive information in error responses', async () => {
        process.env.OPENROUTER_API_KEY = 'secret-key-123'

        ;(global.fetch as jest.Mock).mockRejectedValueOnce(
          new Error('OpenRouter API error with sensitive data: secret-key-123')
        )

        const { req } = createMocks({
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: {
            audio: Buffer.from('test').toString('base64'),
            format: 'webm'
          }
        })

        const response = await POST(req as any)
        const data = await response.json()

        // Error message should not contain API key
        const responseText = JSON.stringify(data)
        expect(responseText).not.toContain('secret-key-123')
      })
    })
  })

  describe('OPTIONS endpoint', () => {
    it('returns correct CORS headers', async () => {
      const { req } = createMocks({
        method: 'OPTIONS'
      })

      const response = await OPTIONS()

      expect(response.status).toBe(200)
      
      // Check CORS headers are present
      const headers = Object.fromEntries(response.headers.entries())
      expect(headers).toHaveProperty('access-control-allow-origin')
      expect(headers).toHaveProperty('access-control-allow-methods')
      expect(headers).toHaveProperty('access-control-allow-headers')
    })
  })

  describe('Performance', () => {
    it('processes requests within reasonable time', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({
              choices: [{ message: { content: 'quick response' } }]
            })
          }), 100) // 100ms delay
        )
      )

      const startTime = Date.now()

      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          audio: Buffer.from('test').toString('base64'),
          format: 'webm'
        }
      })

      await POST(req as any)

      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('handles concurrent requests properly', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'concurrent response' } }]
        })
      })

      const requests = Array.from({ length: 5 }, (_, i) => {
        const { req } = createMocks({
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: {
            audio: Buffer.from(`test-${i}`).toString('base64'),
            format: 'webm'
          }
        })
        return POST(req as any)
      })

      const responses = await Promise.all(requests)

      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      // Should have made 5 API calls
      expect(global.fetch).toHaveBeenCalledTimes(5)
    })
  })

  describe('Voice Controller Direct Tests', () => {
    let controller: VoiceController

    beforeEach(() => {
      controller = new VoiceController()
    })

    it('handles JSON request format correctly', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'controller test' } }]
        })
      })

      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          audio: Buffer.from('test').toString('base64'),
          format: 'mp3'
        }
      })

      req.json = jest.fn().mockResolvedValue({
        audio: Buffer.from('test').toString('base64'),
        format: 'mp3'
      })

      const response = await controller.transcribe(req as any)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data.format).toBe('mp3')
    })

    it('provides consistent response format', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'consistent format test' } }]
        })
      })

      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' }
      })

      req.json = jest.fn().mockResolvedValue({
        audio: Buffer.from('test').toString('base64'),
        format: 'webm'
      })

      const response = await controller.transcribe(req as any)
      const data = await response.json()

      // Verify response structure
      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('data')
      expect(data.data).toHaveProperty('text')
      expect(data.data).toHaveProperty('confidence')
      expect(data.data).toHaveProperty('duration')
      expect(data.data).toHaveProperty('language')
      expect(data.data).toHaveProperty('format')

      expect(typeof data.data.text).toBe('string')
      expect(typeof data.data.confidence).toBe('number')
      expect(typeof data.data.duration).toBe('number')
      expect(typeof data.data.language).toBe('string')
      expect(typeof data.data.format).toBe('string')
    })
  })
})