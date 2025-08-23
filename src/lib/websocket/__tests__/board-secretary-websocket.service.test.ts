/**
 * Board Secretary WebSocket Service Tests
 * Unit tests for real-time communication service
 */

import { BoardSecretaryWebSocketService, type BoardSecretaryEvent, type BoardSecretaryEventHandlers } from '../board-secretary-websocket.service'

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(public url: string) {
    // Simulate successful connection after a short delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.(new Event('open'))
    }, 10)
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSING
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED
      this.onclose?.(new CloseEvent('close', { code: code || 1000, reason: reason || 'Normal closure' }))
    }, 10)
  }

  // Helper method to simulate receiving messages
  simulateMessage(data: any) {
    if (this.readyState === MockWebSocket.OPEN) {
      const event = new MessageEvent('message', {
        data: JSON.stringify(data)
      })
      this.onmessage?.(event)
    }
  }

  // Helper method to simulate errors
  simulateError(error: Event) {
    this.onerror?.(error)
  }
}

// Replace global WebSocket with mock
;(global as any).WebSocket = MockWebSocket

describe('BoardSecretaryWebSocketService', () => {
  let service: BoardSecretaryWebSocketService
  let mockHandlers: BoardSecretaryEventHandlers

  beforeEach(() => {
    service = new BoardSecretaryWebSocketService('ws://localhost:3000', 1000)
    mockHandlers = {
      onMeetingCreated: jest.fn(),
      onMeetingUpdated: jest.fn(),
      onMeetingStatusChanged: jest.fn(),
      onTranscriptionCompleted: jest.fn(),
      onActionItemCreated: jest.fn(),
      onComplianceAlertCreated: jest.fn(),
      onAgendaGenerated: jest.fn(),
      onAIJobStatusUpdated: jest.fn()
    }

    jest.clearAllMocks()
  })

  afterEach(() => {
    service.disconnect()
  })

  describe('Connection Management', () => {
    it('should establish connection when subscribing to board', (done) => {
      service.subscribeToBoard('board-123', mockHandlers)

      // Wait for connection to be established
      setTimeout(() => {
        const status = service.getConnectionStatus()
        expect(status.isConnected).toBe(true)
        done()
      }, 50)
    })

    it('should track subscribed boards', () => {
      service.subscribeToBoard('board-123')
      service.subscribeToBoard('board-456')

      const subscribedBoards = service.getSubscribedBoards()
      expect(subscribedBoards).toContain('board-123')
      expect(subscribedBoards).toContain('board-456')
      expect(subscribedBoards).toHaveLength(2)
    })

    it('should unsubscribe from boards', () => {
      service.subscribeToBoard('board-123')
      service.subscribeToBoard('board-456')
      
      service.unsubscribeFromBoard('board-123')

      const subscribedBoards = service.getSubscribedBoards()
      expect(subscribedBoards).not.toContain('board-123')
      expect(subscribedBoards).toContain('board-456')
      expect(subscribedBoards).toHaveLength(1)
    })

    it('should clear all subscriptions', () => {
      service.subscribeToBoard('board-123')
      service.subscribeToBoard('board-456')
      
      service.clearSubscriptions()

      const subscribedBoards = service.getSubscribedBoards()
      expect(subscribedBoards).toHaveLength(0)
    })

    it('should handle connection errors gracefully', (done) => {
      let errorReceived = false

      service.onError((error) => {
        errorReceived = true
      })

      service.subscribeToBoard('board-123')

      // Wait for connection and simulate error
      setTimeout(() => {
        const ws = (service as any).ws as MockWebSocket
        ws.simulateError(new Event('error'))

        setTimeout(() => {
          expect(errorReceived).toBe(true)
          done()
        }, 10)
      }, 50)
    })
  })

  describe('Event Handling', () => {
    beforeEach((done) => {
      service.subscribeToBoard('board-123', mockHandlers)
      // Wait for connection
      setTimeout(done, 50)
    })

    it('should handle meeting created events', () => {
      const event: BoardSecretaryEvent = {
        type: 'meeting_created',
        boardId: 'board-123',
        data: {
          meetingId: 'meeting-456',
          meeting_title: 'New Board Meeting'
        },
        timestamp: new Date().toISOString(),
        metadata: { meetingId: 'meeting-456' }
      }

      const ws = (service as any).ws as MockWebSocket
      ws.simulateMessage(event)

      expect(mockHandlers.onMeetingCreated).toHaveBeenCalledWith(event)
    })

    it('should handle transcription completed events', () => {
      const event: BoardSecretaryEvent = {
        type: 'transcription_completed',
        boardId: 'board-123',
        data: {
          transcriptionId: 'trans-123',
          meetingId: 'meeting-456',
          status: 'completed'
        },
        timestamp: new Date().toISOString(),
        metadata: { transcriptionId: 'trans-123', meetingId: 'meeting-456' }
      }

      const ws = (service as any).ws as MockWebSocket
      ws.simulateMessage(event)

      expect(mockHandlers.onTranscriptionCompleted).toHaveBeenCalledWith(event)
    })

    it('should handle action item created events', () => {
      const event: BoardSecretaryEvent = {
        type: 'action_item_created',
        boardId: 'board-123',
        data: {
          actionItemId: 'action-789',
          title: 'Review budget proposal',
          priority: 'high'
        },
        timestamp: new Date().toISOString(),
        metadata: { actionItemId: 'action-789' }
      }

      const ws = (service as any).ws as MockWebSocket
      ws.simulateMessage(event)

      expect(mockHandlers.onActionItemCreated).toHaveBeenCalledWith(event)
    })

    it('should handle compliance alert events', () => {
      const event: BoardSecretaryEvent = {
        type: 'compliance_alert_created',
        boardId: 'board-123',
        data: {
          alertId: 'alert-101',
          severity: 'critical',
          message: 'Filing deadline approaching'
        },
        timestamp: new Date().toISOString()
      }

      const ws = (service as any).ws as MockWebSocket
      ws.simulateMessage(event)

      expect(mockHandlers.onComplianceAlertCreated).toHaveBeenCalledWith(event)
    })

    it('should handle AI job status updates', () => {
      const event: BoardSecretaryEvent = {
        type: 'ai_job_status_updated',
        boardId: 'board-123',
        data: {
          jobId: 'job-202',
          status: 'completed',
          output: { minutes: 'Generated minutes content' }
        },
        timestamp: new Date().toISOString(),
        metadata: { jobId: 'job-202' }
      }

      const ws = (service as any).ws as MockWebSocket
      ws.simulateMessage(event)

      expect(mockHandlers.onAIJobStatusUpdated).toHaveBeenCalledWith(event)
    })

    it('should ignore events from unsubscribed boards', () => {
      const event: BoardSecretaryEvent = {
        type: 'meeting_created',
        boardId: 'board-999', // Different board
        data: { meetingId: 'meeting-456' },
        timestamp: new Date().toISOString()
      }

      const ws = (service as any).ws as MockWebSocket
      ws.simulateMessage(event)

      expect(mockHandlers.onMeetingCreated).not.toHaveBeenCalled()
    })

    it('should update event handlers', () => {
      const newHandlers: Partial<BoardSecretaryEventHandlers> = {
        onMeetingCreated: jest.fn(),
        onActionItemUpdated: jest.fn()
      }

      service.updateEventHandlers(newHandlers)

      const event: BoardSecretaryEvent = {
        type: 'meeting_created',
        boardId: 'board-123',
        data: { meetingId: 'meeting-456' },
        timestamp: new Date().toISOString()
      }

      const ws = (service as any).ws as MockWebSocket
      ws.simulateMessage(event)

      // Original handler should not be called
      expect(mockHandlers.onMeetingCreated).not.toHaveBeenCalled()
      // New handler should be called
      expect(newHandlers.onMeetingCreated).toHaveBeenCalledWith(event)
    })
  })

  describe('Outgoing Messages', () => {
    beforeEach((done) => {
      service.subscribeToBoard('board-123')
      // Wait for connection
      setTimeout(done, 50)
    })

    it('should send meeting status updates', () => {
      const sendSpy = jest.spyOn((service as any).ws, 'send')
      
      service.updateMeetingStatus('board-123', 'meeting-456', 'in_progress')

      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({
        type: 'update_meeting_status',
        boardId: 'board-123',
        data: { meetingId: 'meeting-456', status: 'in_progress' },
        timestamp: expect.any(String)
      }))
    })

    it('should send action item progress updates', () => {
      const sendSpy = jest.spyOn((service as any).ws, 'send')
      
      service.updateActionItemProgress('board-123', 'action-789', 75, 'in_progress')

      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({
        type: 'update_action_item_progress',
        boardId: 'board-123',
        data: { actionItemId: 'action-789', progress: 75, status: 'in_progress' },
        timestamp: expect.any(String)
      }))
    })

    it('should request compliance checks', () => {
      const sendSpy = jest.spyOn((service as any).ws, 'send')
      
      service.requestComplianceCheck('board-123')

      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({
        type: 'request_compliance_check',
        boardId: 'board-123',
        timestamp: expect.any(String)
      }))
    })

    it('should start transcription requests', () => {
      const sendSpy = jest.spyOn((service as any).ws, 'send')
      
      service.startTranscription('board-123', 'meeting-456', 'audio-url', 'video-url')

      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({
        type: 'start_transcription',
        boardId: 'board-123',
        data: { meetingId: 'meeting-456', audioUrl: 'audio-url', videoUrl: 'video-url' },
        timestamp: expect.any(String)
      }))
    })

    it('should generate agenda requests', () => {
      const sendSpy = jest.spyOn((service as any).ws, 'send')
      
      service.generateAgenda('board-123', 'meeting-456', {
        includePreviousItems: true,
        templateId: 'template-123',
        customItems: [{ title: 'Custom Item', description: 'Custom description' }]
      })

      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({
        type: 'generate_agenda',
        boardId: 'board-123',
        data: {
          meetingId: 'meeting-456',
          includePreviousItems: true,
          templateId: 'template-123',
          customItems: [{ title: 'Custom Item', description: 'Custom description' }]
        },
        timestamp: expect.any(String)
      }))
    })

    it('should generate minutes requests', () => {
      const sendSpy = jest.spyOn((service as any).ws, 'send')
      
      service.generateMinutes('board-123', 'meeting-456', 'transcription-123')

      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({
        type: 'generate_minutes',
        boardId: 'board-123',
        data: { meetingId: 'meeting-456', transcriptionId: 'transcription-123' },
        timestamp: expect.any(String)
      }))
    })

    it('should extract action items requests', () => {
      const sendSpy = jest.spyOn((service as any).ws, 'send')
      
      service.extractActionItems('board-123', 'meeting-456', 'transcription text')

      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({
        type: 'extract_action_items',
        boardId: 'board-123',
        data: { meetingId: 'meeting-456', transcriptionText: 'transcription text' },
        timestamp: expect.any(String)
      }))
    })
  })

  describe('AI Job Subscription', () => {
    it('should subscribe to AI job updates', (done) => {
      const sendSpy = jest.spyOn(service, 'send')
      const onUpdate = jest.fn()
      
      service.subscribeToBoard('board-123')
      
      setTimeout(() => {
        service.subscribeToAIJobs(['job-1', 'job-2'], onUpdate)

        expect(sendSpy).toHaveBeenCalledWith({
          type: 'subscribe_ai_jobs',
          jobIds: ['job-1', 'job-2'],
          timestamp: expect.any(String)
        })

        // Test that the handler is set up
        service.updateEventHandlers({ onAIJobStatusUpdated: onUpdate })
        
        const event: BoardSecretaryEvent = {
          type: 'ai_job_status_updated',
          boardId: 'board-123',
          data: { jobId: 'job-1', status: 'completed' },
          timestamp: new Date().toISOString()
        }

        const ws = (service as any).ws as MockWebSocket
        ws.simulateMessage(event)

        expect(onUpdate).toHaveBeenCalledWith(event)
        done()
      }, 50)
    })
  })

  describe('Connection Status', () => {
    it('should report correct connection status', (done) => {
      const initialStatus = service.getConnectionStatus()
      expect(initialStatus.isConnected).toBe(false)
      expect(initialStatus.isConnecting).toBe(false)

      service.subscribeToBoard('board-123')

      // Check connecting status
      const connectingStatus = service.getConnectionStatus()
      expect(connectingStatus.isConnecting).toBe(true)

      // Wait for connection
      setTimeout(() => {
        const connectedStatus = service.getConnectionStatus()
        expect(connectedStatus.isConnected).toBe(true)
        expect(connectedStatus.isConnecting).toBe(false)
        expect(connectedStatus.readyState).toBe(MockWebSocket.OPEN)
        done()
      }, 50)
    })
  })

  describe('Cleanup', () => {
    it('should disconnect cleanly', (done) => {
      service.subscribeToBoard('board-123')

      setTimeout(() => {
        service.disconnect()
        
        setTimeout(() => {
          const status = service.getConnectionStatus()
          expect(status.isConnected).toBe(false)
          expect(service.getSubscribedBoards()).toHaveLength(0)
          done()
        }, 50)
      }, 50)
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed JSON messages gracefully', (done) => {
      service.subscribeToBoard('board-123')

      setTimeout(() => {
        const ws = (service as any).ws as MockWebSocket
        const event = new MessageEvent('message', { data: 'invalid json' })
        
        // Should not throw an error
        expect(() => {
          ws.onmessage?.(event)
        }).not.toThrow()

        done()
      }, 50)
    })

    it('should handle unknown event types', (done) => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      service.subscribeToBoard('board-123')

      setTimeout(() => {
        const event: BoardSecretaryEvent = {
          type: 'unknown_event' as any,
          boardId: 'board-123',
          data: {},
          timestamp: new Date().toISOString()
        }

        const ws = (service as any).ws as MockWebSocket
        ws.simulateMessage(event)

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'BoardSecretaryWebSocketService: Unhandled event type:',
          'unknown_event'
        )

        consoleWarnSpy.mockRestore()
        done()
      }, 50)
    })
  })
})