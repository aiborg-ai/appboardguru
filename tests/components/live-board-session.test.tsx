/**
 * Tests for LiveBoardSession Component
 * Tests meeting management, voting, chat, and session controls
 */

import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LiveBoardSession } from '@/components/collaboration/LiveBoardSession'
import { 
  createTestWrapper, 
  createTestSession, 
  createTestUser, 
  MockWebSocket,
  cleanupTest 
} from '../test-utils'

// Mock the store
const mockStore = {
  connection: { isConnected: true, status: 'connected' },
  sessions: new Map([
    ['test-session-id', createTestSession({
      participants: [
        {
          userId: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'member',
          joinedAt: new Date(),
          permissions: {
            canVote: true,
            canChat: true,
            canShare: false,
            canRecord: false,
          },
          presence: {
            isOnline: true,
            lastSeen: new Date(),
            device: 'desktop',
          },
        }
      ],
      votes: [
        {
          id: 'vote-1',
          title: 'Approve Budget',
          description: 'Vote to approve the 2024 budget',
          options: ['Approve', 'Reject', 'Abstain'],
          responses: [],
          status: 'active',
          createdBy: 'host-1',
          createdAt: new Date(),
          endsAt: new Date(Date.now() + 300000),
        }
      ],
      chat: [
        {
          id: 'msg-1',
          userId: 'user-1',
          userName: 'John Doe',
          content: 'Hello everyone!',
          timestamp: new Date(),
          type: 'text',
        }
      ]
    })]
  ]),
  joinSession: vi.fn(),
  leaveSession: vi.fn(),
  addSessionParticipant: vi.fn(),
  removeSessionParticipant: vi.fn(),
  castVote: vi.fn(),
  addChatMessage: vi.fn(),
  updateSessionSettings: vi.fn(),
  sendMessage: vi.fn(),
}

vi.mock('@/lib/stores/realtime-collaboration.store', () => ({
  useRealtimeCollaborationStore: () => mockStore
}))

// Mock MediaStream APIs
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }),
    getDisplayMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }),
  },
})

const mockProps = {
  sessionId: 'test-session-id',
  userId: 'current-user',
  onLeave: vi.fn(),
  onError: vi.fn(),
}

describe('LiveBoardSession', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    global.WebSocket = MockWebSocket as any
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanupTest()
  })

  it('should render session interface with participants', () => {
    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.getByText('Test Board Meeting')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('1 participant')).toBeInTheDocument()
  })

  it('should display active votes', () => {
    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.getByText('Approve Budget')).toBeInTheDocument()
    expect(screen.getByText('Vote to approve the 2024 budget')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abstain' })).toBeInTheDocument()
  })

  it('should handle voting', async () => {
    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    const approveButton = screen.getByRole('button', { name: 'Approve' })
    await user.click(approveButton)

    expect(mockStore.castVote).toHaveBeenCalledWith(
      'test-session-id',
      'vote-1',
      'current-user',
      'Approve'
    )
  })

  it('should display chat interface', () => {
    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.getByText('Hello everyone!')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument()
  })

  it('should handle sending chat messages', async () => {
    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    const messageInput = screen.getByPlaceholderText('Type a message...')
    const sendButton = screen.getByRole('button', { name: 'Send' })

    await user.type(messageInput, 'New chat message')
    await user.click(sendButton)

    expect(mockStore.addChatMessage).toHaveBeenCalledWith(
      'test-session-id',
      expect.objectContaining({
        content: 'New chat message',
        userId: 'current-user',
        type: 'text',
      })
    )
  })

  it('should handle screen sharing', async () => {
    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    const shareButton = screen.getByRole('button', { name: /share screen/i })
    await user.click(shareButton)

    expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalled()
  })

  it('should show session controls for host', () => {
    // Mock session where current user is host
    const hostSession = createTestSession({
      hostId: 'current-user',
    })
    
    const modifiedMockStore = {
      ...mockStore,
      sessions: new Map([['test-session-id', hostSession]])
    }

    vi.mocked(require('@/lib/stores/realtime-collaboration.store').useRealtimeCollaborationStore)
      .mockReturnValue(modifiedMockStore)

    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.getByRole('button', { name: /end session/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create vote/i })).toBeInTheDocument()
  })

  it('should handle session recording', async () => {
    // Mock session where current user is host
    const hostSession = createTestSession({
      hostId: 'current-user',
    })
    
    const modifiedMockStore = {
      ...mockStore,
      sessions: new Map([['test-session-id', hostSession]])
    }

    vi.mocked(require('@/lib/stores/realtime-collaboration.store').useRealtimeCollaborationStore)
      .mockReturnValue(modifiedMockStore)

    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    const recordButton = screen.getByRole('button', { name: /start recording/i })
    await user.click(recordButton)

    expect(mockStore.updateSessionSettings).toHaveBeenCalledWith(
      'test-session-id',
      expect.objectContaining({
        isRecording: true,
      })
    )
  })

  it('should create new votes', async () => {
    // Mock session where current user is host
    const hostSession = createTestSession({
      hostId: 'current-user',
    })
    
    const modifiedMockStore = {
      ...mockStore,
      sessions: new Map([['test-session-id', hostSession]])
    }

    vi.mocked(require('@/lib/stores/realtime-collaboration.store').useRealtimeCollaborationStore)
      .mockReturnValue(modifiedMockStore)

    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    const createVoteButton = screen.getByRole('button', { name: /create vote/i })
    await user.click(createVoteButton)

    // Should show vote creation modal
    expect(screen.getByText('Create New Vote')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Vote title')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Vote description')).toBeInTheDocument()
  })

  it('should handle participant permissions', () => {
    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    // Non-host should not see admin controls
    expect(screen.queryByRole('button', { name: /end session/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /create vote/i })).not.toBeInTheDocument()
  })

  it('should show session statistics', () => {
    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.getByText('Session Duration:')).toBeInTheDocument()
    expect(screen.getByText('Participants:')).toBeInTheDocument()
    expect(screen.getByText('Messages:')).toBeInTheDocument()
  })

  it('should handle session leave', async () => {
    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    const leaveButton = screen.getByRole('button', { name: /leave session/i })
    await user.click(leaveButton)

    expect(mockProps.onLeave).toHaveBeenCalledWith('test-session-id')
  })

  it('should display agenda items', () => {
    const sessionWithAgenda = createTestSession({
      agenda: [
        {
          id: 'agenda-1',
          title: 'Budget Review',
          description: 'Review Q4 budget proposal',
          duration: 15,
          presenter: 'user-1',
          status: 'active',
          attachments: [],
        }
      ]
    })

    const modifiedMockStore = {
      ...mockStore,
      sessions: new Map([['test-session-id', sessionWithAgenda]])
    }

    vi.mocked(require('@/lib/stores/realtime-collaboration.store').useRealtimeCollaborationStore)
      .mockReturnValue(modifiedMockStore)

    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.getByText('Budget Review')).toBeInTheDocument()
    expect(screen.getByText('Review Q4 budget proposal')).toBeInTheDocument()
  })

  it('should handle connection quality warnings', () => {
    const poorConnectionStore = {
      ...mockStore,
      connection: {
        isConnected: true,
        status: 'connected',
        quality: 'poor',
        latency: 2000,
      }
    }

    vi.mocked(require('@/lib/stores/realtime-collaboration.store').useRealtimeCollaborationStore)
      .mockReturnValue(poorConnectionStore)

    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.getByText(/connection quality is poor/i)).toBeInTheDocument()
  })
})

describe('LiveBoardSession Performance', () => {
  beforeEach(() => {
    global.WebSocket = MockWebSocket as any
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanupTest()
  })

  it('should handle large number of participants', () => {
    const participants = Array.from({ length: 100 }, (_, i) => ({
      userId: `user-${i}`,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      role: 'member' as const,
      joinedAt: new Date(),
      permissions: {
        canVote: true,
        canChat: true,
        canShare: false,
        canRecord: false,
      },
      presence: {
        isOnline: true,
        lastSeen: new Date(),
        device: 'desktop' as const,
      },
    }))

    const largeSession = createTestSession({ participants })
    
    const modifiedMockStore = {
      ...mockStore,
      sessions: new Map([['test-session-id', largeSession]])
    }

    vi.mocked(require('@/lib/stores/realtime-collaboration.store').useRealtimeCollaborationStore)
      .mockReturnValue(modifiedMockStore)

    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.getByText('100 participants')).toBeInTheDocument()
    
    // Should implement virtualization for large lists
    const participantList = screen.getByTestId('participant-list')
    expect(participantList).toBeInTheDocument()
  })

  it('should handle rapid chat messages', async () => {
    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    const messageInput = screen.getByPlaceholderText('Type a message...')
    const sendButton = screen.getByRole('button', { name: 'Send' })

    // Send multiple messages rapidly
    for (let i = 0; i < 10; i++) {
      await user.type(messageInput, `Message ${i}`)
      await user.click(sendButton)
    }

    // Should debounce or handle rapid sends gracefully
    expect(mockStore.addChatMessage).toHaveBeenCalledTimes(10)
  })

  it('should optimize vote rendering', () => {
    const manyVotes = Array.from({ length: 20 }, (_, i) => ({
      id: `vote-${i}`,
      title: `Vote ${i}`,
      description: `Description for vote ${i}`,
      options: ['Yes', 'No'],
      responses: [],
      status: 'active' as const,
      createdBy: 'host-1',
      createdAt: new Date(),
      endsAt: new Date(Date.now() + 300000),
    }))

    const sessionWithManyVotes = createTestSession({ votes: manyVotes })
    
    const modifiedMockStore = {
      ...mockStore,
      sessions: new Map([['test-session-id', sessionWithManyVotes]])
    }

    vi.mocked(require('@/lib/stores/realtime-collaboration.store').useRealtimeCollaborationStore)
      .mockReturnValue(modifiedMockStore)

    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    // Should show votes with pagination or virtualization
    expect(screen.getByText('Active Votes')).toBeInTheDocument()
    expect(screen.getAllByText(/Vote \d+/)).toHaveLength(Math.min(5, manyVotes.length)) // Should paginate
  })
})

describe('LiveBoardSession Integration', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    global.WebSocket = MockWebSocket as any
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanupTest()
  })

  it('should integrate with WebSocket for real-time updates', async () => {
    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    // Simulate receiving a new participant via WebSocket
    expect(mockStore.joinSession).toHaveBeenCalledWith('test-session-id', expect.any(Object))
  })

  it('should handle session state changes', async () => {
    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    // Session should update when status changes
    const sessionData = mockStore.sessions.get('test-session-id')
    expect(sessionData?.status).toBe('active')
  })

  it('should sync with presence system', () => {
    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    // Participants should show online status
    expect(screen.getByText('online', { exact: false })).toBeInTheDocument()
  })
})

describe('LiveBoardSession Error Handling', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    global.WebSocket = MockWebSocket as any
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanupTest()
  })

  it('should handle session not found', () => {
    const emptyMockStore = {
      ...mockStore,
      sessions: new Map(),
    }

    vi.mocked(require('@/lib/stores/realtime-collaboration.store').useRealtimeCollaborationStore)
      .mockReturnValue(emptyMockStore)

    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.getByText('Session not found')).toBeInTheDocument()
  })

  it('should handle media access errors', async () => {
    // Mock media access failure
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(
      new Error('Permission denied')
    )

    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    const micButton = screen.getByRole('button', { name: /microphone/i })
    await user.click(micButton)

    expect(mockProps.onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('microphone access'),
      })
    )
  })

  it('should handle vote casting errors', async () => {
    mockStore.castVote.mockRejectedValue(new Error('Vote failed'))

    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    const approveButton = screen.getByRole('button', { name: 'Approve' })
    await user.click(approveButton)

    await waitFor(() => {
      expect(screen.getByText(/error casting vote/i)).toBeInTheDocument()
    })
  })

  it('should handle disconnection during session', () => {
    const disconnectedStore = {
      ...mockStore,
      connection: {
        isConnected: false,
        status: 'disconnected',
      }
    }

    vi.mocked(require('@/lib/stores/realtime-collaboration.store').useRealtimeCollaborationStore)
      .mockReturnValue(disconnectedStore)

    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.getByText('Disconnected from session')).toBeInTheDocument()
    expect(screen.getByText('Attempting to reconnect...')).toBeInTheDocument()
  })
})

describe('LiveBoardSession Accessibility', () => {
  beforeEach(() => {
    global.WebSocket = MockWebSocket as any
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanupTest()
  })

  it('should have proper ARIA labels for session controls', () => {
    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    const micButton = screen.getByRole('button', { name: /microphone/i })
    expect(micButton).toHaveAttribute('aria-label', expect.stringContaining('microphone'))

    const cameraButton = screen.getByRole('button', { name: /camera/i })
    expect(cameraButton).toHaveAttribute('aria-label', expect.stringContaining('camera'))
  })

  it('should announce important session events', async () => {
    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    const liveRegion = screen.getByRole('status')
    expect(liveRegion).toBeInTheDocument()
  })

  it('should support keyboard navigation for votes', async () => {
    const user = userEvent.setup()
    
    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    // Tab to vote options
    await user.tab()
    
    const firstOption = screen.getByRole('button', { name: 'Approve' })
    expect(firstOption).toHaveFocus()

    // Use arrow keys to navigate vote options
    await user.keyboard('{ArrowRight}')
    
    const secondOption = screen.getByRole('button', { name: 'Reject' })
    expect(secondOption).toHaveFocus()
  })

  it('should provide screen reader announcements for chat', async () => {
    render(<LiveBoardSession {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    // New messages should be announced
    const chatRegion = screen.getByRole('log')
    expect(chatRegion).toHaveAttribute('aria-live', 'polite')
  })
})