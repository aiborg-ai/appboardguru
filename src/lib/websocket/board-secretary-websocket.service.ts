/**
 * Board Secretary WebSocket Service
 * Real-time updates for AI Board Secretary system
 */

import { BaseWebSocketService } from './base-websocket.service'

export type BoardSecretaryEventType = 
  | 'meeting_created'
  | 'meeting_updated' 
  | 'meeting_status_changed'
  | 'transcription_started'
  | 'transcription_completed'
  | 'transcription_failed'
  | 'minutes_generated'
  | 'action_item_created'
  | 'action_item_updated'
  | 'action_item_completed'
  | 'compliance_alert_created'
  | 'compliance_alert_dismissed'
  | 'agenda_generated'
  | 'ai_job_status_updated'

export interface BoardSecretaryEvent {
  type: BoardSecretaryEventType
  boardId: string
  data: any
  timestamp: string
  userId?: string
  metadata?: {
    meetingId?: string
    actionItemId?: string
    complianceRequirementId?: string
    transcriptionId?: string
    agendaId?: string
    minutesId?: string
    jobId?: string
  }
}

export interface BoardSecretaryEventHandlers {
  onMeetingCreated?: (event: BoardSecretaryEvent) => void
  onMeetingUpdated?: (event: BoardSecretaryEvent) => void
  onMeetingStatusChanged?: (event: BoardSecretaryEvent) => void
  onTranscriptionStarted?: (event: BoardSecretaryEvent) => void
  onTranscriptionCompleted?: (event: BoardSecretaryEvent) => void
  onTranscriptionFailed?: (event: BoardSecretaryEvent) => void
  onMinutesGenerated?: (event: BoardSecretaryEvent) => void
  onActionItemCreated?: (event: BoardSecretaryEvent) => void
  onActionItemUpdated?: (event: BoardSecretaryEvent) => void
  onActionItemCompleted?: (event: BoardSecretaryEvent) => void
  onComplianceAlertCreated?: (event: BoardSecretaryEvent) => void
  onComplianceAlertDismissed?: (event: BoardSecretaryEvent) => void
  onAgendaGenerated?: (event: BoardSecretaryEvent) => void
  onAIJobStatusUpdated?: (event: BoardSecretaryEvent) => void
}

export class BoardSecretaryWebSocketService extends BaseWebSocketService<BoardSecretaryEvent> {
  private eventHandlers: BoardSecretaryEventHandlers = {}
  private subscribedBoards: Set<string> = new Set()

  constructor(
    url: string = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000',
    reconnectInterval: number = 5000
  ) {
    super(url, reconnectInterval)
    this.setupEventHandlers()
  }

  /**
   * Subscribe to board secretary events for a specific board
   */
  subscribeToBoard(boardId: string, handlers: Partial<BoardSecretaryEventHandlers> = {}): void {
    if (!boardId) {
      console.warn('BoardSecretaryWebSocketService: Cannot subscribe to board without boardId')
      return
    }

    this.subscribedBoards.add(boardId)
    this.eventHandlers = { ...this.eventHandlers, ...handlers }

    // Send subscription message
    this.send({
      type: 'subscribe_board_secretary',
      boardId,
      timestamp: new Date().toISOString()
    })

    console.log(`BoardSecretaryWebSocketService: Subscribed to board ${boardId}`)
  }

  /**
   * Unsubscribe from board secretary events for a specific board
   */
  unsubscribeFromBoard(boardId: string): void {
    if (!boardId) {
      console.warn('BoardSecretaryWebSocketService: Cannot unsubscribe from board without boardId')
      return
    }

    this.subscribedBoards.delete(boardId)

    // Send unsubscription message
    this.send({
      type: 'unsubscribe_board_secretary',
      boardId,
      timestamp: new Date().toISOString()
    })

    console.log(`BoardSecretaryWebSocketService: Unsubscribed from board ${boardId}`)
  }

  /**
   * Subscribe to AI job status updates
   */
  subscribeToAIJobs(jobIds: string[], onUpdate: (event: BoardSecretaryEvent) => void): void {
    this.eventHandlers.onAIJobStatusUpdated = onUpdate

    this.send({
      type: 'subscribe_ai_jobs',
      jobIds,
      timestamp: new Date().toISOString()
    })

    console.log(`BoardSecretaryWebSocketService: Subscribed to ${jobIds.length} AI jobs`)
  }

  /**
   * Update meeting status in real-time
   */
  updateMeetingStatus(boardId: string, meetingId: string, status: string): void {
    this.send({
      type: 'update_meeting_status',
      boardId,
      data: { meetingId, status },
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Update action item progress in real-time
   */
  updateActionItemProgress(
    boardId: string, 
    actionItemId: string, 
    progress: number, 
    status?: string
  ): void {
    this.send({
      type: 'update_action_item_progress',
      boardId,
      data: { actionItemId, progress, status },
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Request compliance check for a board
   */
  requestComplianceCheck(boardId: string): void {
    this.send({
      type: 'request_compliance_check',
      boardId,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Start transcription process
   */
  startTranscription(
    boardId: string, 
    meetingId: string, 
    audioUrl?: string, 
    videoUrl?: string
  ): void {
    this.send({
      type: 'start_transcription',
      boardId,
      data: { meetingId, audioUrl, videoUrl },
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Generate meeting agenda
   */
  generateAgenda(
    boardId: string, 
    meetingId: string, 
    options: {
      includePreviousItems?: boolean
      templateId?: string
      customItems?: Array<{ title: string; description?: string }>
    } = {}
  ): void {
    this.send({
      type: 'generate_agenda',
      boardId,
      data: { meetingId, ...options },
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Generate meeting minutes
   */
  generateMinutes(boardId: string, meetingId: string, transcriptionId: string): void {
    this.send({
      type: 'generate_minutes',
      boardId,
      data: { meetingId, transcriptionId },
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Extract action items from meeting
   */
  extractActionItems(boardId: string, meetingId: string, transcriptionText?: string): void {
    this.send({
      type: 'extract_action_items',
      boardId,
      data: { meetingId, transcriptionText },
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Setup event handlers for incoming messages
   */
  private setupEventHandlers(): void {
    this.onMessage((event: BoardSecretaryEvent) => {
      // Only process events for boards we're subscribed to
      if (!this.subscribedBoards.has(event.boardId)) {
        return
      }

      console.log('BoardSecretaryWebSocketService: Received event', event.type, event)

      // Route event to appropriate handler
      switch (event.type) {
        case 'meeting_created':
          this.eventHandlers.onMeetingCreated?.(event)
          break

        case 'meeting_updated':
          this.eventHandlers.onMeetingUpdated?.(event)
          break

        case 'meeting_status_changed':
          this.eventHandlers.onMeetingStatusChanged?.(event)
          break

        case 'transcription_started':
          this.eventHandlers.onTranscriptionStarted?.(event)
          break

        case 'transcription_completed':
          this.eventHandlers.onTranscriptionCompleted?.(event)
          break

        case 'transcription_failed':
          this.eventHandlers.onTranscriptionFailed?.(event)
          break

        case 'minutes_generated':
          this.eventHandlers.onMinutesGenerated?.(event)
          break

        case 'action_item_created':
          this.eventHandlers.onActionItemCreated?.(event)
          break

        case 'action_item_updated':
          this.eventHandlers.onActionItemUpdated?.(event)
          break

        case 'action_item_completed':
          this.eventHandlers.onActionItemCompleted?.(event)
          break

        case 'compliance_alert_created':
          this.eventHandlers.onComplianceAlertCreated?.(event)
          break

        case 'compliance_alert_dismissed':
          this.eventHandlers.onComplianceAlertDismissed?.(event)
          break

        case 'agenda_generated':
          this.eventHandlers.onAgendaGenerated?.(event)
          break

        case 'ai_job_status_updated':
          this.eventHandlers.onAIJobStatusUpdated?.(event)
          break

        default:
          console.warn('BoardSecretaryWebSocketService: Unhandled event type:', event.type)
      }
    })

    this.onError((error: Event) => {
      console.error('BoardSecretaryWebSocketService: WebSocket error', error)
    })

    this.onClose(() => {
      console.log('BoardSecretaryWebSocketService: WebSocket connection closed')
    })

    this.onOpen(() => {
      console.log('BoardSecretaryWebSocketService: WebSocket connection opened')
      
      // Re-subscribe to all boards after reconnection
      this.subscribedBoards.forEach(boardId => {
        this.send({
          type: 'subscribe_board_secretary',
          boardId,
          timestamp: new Date().toISOString()
        })
      })
    })
  }

  /**
   * Update event handlers
   */
  updateEventHandlers(handlers: Partial<BoardSecretaryEventHandlers>): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers }
  }

  /**
   * Get list of subscribed boards
   */
  getSubscribedBoards(): string[] {
    return Array.from(this.subscribedBoards)
  }

  /**
   * Clear all subscriptions and handlers
   */
  clearSubscriptions(): void {
    this.subscribedBoards.forEach(boardId => {
      this.unsubscribeFromBoard(boardId)
    })
    this.subscribedBoards.clear()
    this.eventHandlers = {}
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.clearSubscriptions()
    super.disconnect()
  }
}

// Global instance
let boardSecretaryWebSocketService: BoardSecretaryWebSocketService | null = null

export const getBoardSecretaryWebSocketService = (): BoardSecretaryWebSocketService => {
  if (!boardSecretaryWebSocketService) {
    boardSecretaryWebSocketService = new BoardSecretaryWebSocketService()
  }
  return boardSecretaryWebSocketService
}

export const useBoardSecretaryWebSocket = (
  boardId: string,
  handlers: Partial<BoardSecretaryEventHandlers> = {}
) => {
  const service = getBoardSecretaryWebSocketService()
  
  React.useEffect(() => {
    if (boardId) {
      service.subscribeToBoard(boardId, handlers)
    }
    
    return () => {
      if (boardId) {
        service.unsubscribeFromBoard(boardId)
      }
    }
  }, [boardId, service])

  return service
}

export default BoardSecretaryWebSocketService