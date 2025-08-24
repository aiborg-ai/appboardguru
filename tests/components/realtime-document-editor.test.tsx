/**
 * Tests for RealTimeDocumentEditor Component
 * Tests document collaboration, CRDT operations, and user interactions
 */

import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RealTimeDocumentEditor } from '@/components/collaboration/RealTimeDocumentEditor'
import { 
  createTestWrapper, 
  createTestDocument, 
  createTestUser, 
  MockWebSocket,
  cleanupTest 
} from '../test-utils'

// Mock the store
vi.mock('@/lib/stores/realtime-collaboration.store', () => ({
  useRealtimeCollaborationStore: () => ({
    connection: {
      isConnected: true,
      status: 'connected',
      quality: 'good',
    },
    documents: new Map([
      ['test-doc-id', createTestDocument()]
    ]),
    presence: {
      users: new Map([
        ['user-1', createTestUser({ userId: 'user-1', activity: 'editing' })]
      ])
    },
    connect: vi.fn(),
    joinDocument: vi.fn(),
    leaveDocument: vi.fn(),
    updatePresence: vi.fn(),
    sendMessage: vi.fn(),
  })
}))

// Mock the document collaboration hook
vi.mock('@/hooks/useDocumentCollaboration', () => ({
  useDocumentCollaboration: () => ({
    isConnected: true,
    cursors: [
      {
        userId: 'user-1',
        position: 10,
        selection: { start: 10, end: 15 },
        timestamp: Date.now(),
      }
    ],
    pendingChanges: [],
    conflicts: [],
    insertText: vi.fn(),
    deleteText: vi.fn(),
    updateCursor: vi.fn(),
    resolveConflict: vi.fn(),
    handleRemoteOperation: vi.fn(),
  })
}))

// Mock Yjs
vi.mock('yjs', () => ({
  Doc: vi.fn().mockImplementation(() => ({
    getText: vi.fn(() => ({
      toString: () => 'Test document content',
      insert: vi.fn(),
      delete: vi.fn(),
      observe: vi.fn(),
      unobserve: vi.fn(),
    })),
    destroy: vi.fn(),
  })),
}))

const mockProps = {
  document: createTestDocument(),
  onSave: vi.fn(),
  onError: vi.fn(),
  className: 'test-class',
}

describe('RealTimeDocumentEditor', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    global.WebSocket = MockWebSocket as any
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanupTest()
  })

  it('should render document editor with basic elements', () => {
    render(<RealTimeDocumentEditor {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByText('Connected')).toBeInTheDocument()
    expect(screen.getByText('1 user online')).toBeInTheDocument()
  })

  it('should display connection status', () => {
    render(<RealTimeDocumentEditor {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    // Should show connected status
    expect(screen.getByText('Connected')).toBeInTheDocument()
    expect(screen.getByText('Good connection')).toBeInTheDocument()
  })

  it('should show active collaborators', () => {
    render(<RealTimeDocumentEditor {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    // Should show user presence indicator
    expect(screen.getByText('1 user online')).toBeInTheDocument()
    
    // Check for user avatars/indicators
    const collaboratorSection = screen.getByText('Active Collaborators').closest('div')
    expect(collaboratorSection).toBeInTheDocument()
  })

  it('should handle text input and changes', async () => {
    render(<RealTimeDocumentEditor {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    const textArea = screen.getByRole('textbox')
    
    await user.type(textArea, 'New content')
    
    // Should trigger document updates
    await waitFor(() => {
      expect(textArea).toHaveValue(expect.stringContaining('New content'))
    })
  })

  it('should display cursor positions', () => {
    render(<RealTimeDocumentEditor {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    // Should show other users' cursors
    expect(screen.getByText('user-1')).toBeInTheDocument()
  })

  it('should handle auto-save functionality', async () => {
    vi.useFakeTimers()
    
    render(<RealTimeDocumentEditor {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    const textArea = screen.getByRole('textbox')
    await user.type(textArea, 'Auto save test')

    // Fast-forward past auto-save delay
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    await waitFor(() => {
      expect(mockProps.onSave).toHaveBeenCalled()
    })

    vi.useRealTimers()
  })

  it('should show version history', async () => {
    render(<RealTimeDocumentEditor {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    const historyButton = screen.getByRole('button', { name: /version history/i })
    await user.click(historyButton)

    expect(screen.getByText('Version History')).toBeInTheDocument()
  })

  it('should handle document locking', async () => {
    render(<RealTimeDocumentEditor {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    const lockButton = screen.getByRole('button', { name: /lock document/i })
    await user.click(lockButton)

    // Should show lock confirmation
    expect(screen.getByText('Document Locked')).toBeInTheDocument()
  })

  it('should display conflict resolution interface', async () => {
    // Mock conflicts in the hook
    vi.mocked(require('@/hooks/useDocumentCollaboration').useDocumentCollaboration)
      .mockReturnValue({
        isConnected: true,
        cursors: [],
        pendingChanges: [],
        conflicts: [
          {
            id: 'conflict-1',
            localOperation: { type: 'insert', position: 5, content: 'Local text' },
            remoteOperation: { type: 'insert', position: 5, content: 'Remote text' },
            timestamp: Date.now(),
            documentState: 'conflicted',
          }
        ],
        insertText: vi.fn(),
        deleteText: vi.fn(),
        updateCursor: vi.fn(),
        resolveConflict: vi.fn(),
        handleRemoteOperation: vi.fn(),
      })

    render(<RealTimeDocumentEditor {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.getByText('Conflicts Detected')).toBeInTheDocument()
    expect(screen.getByText('1 conflict needs resolution')).toBeInTheDocument()
  })

  it('should handle export functionality', async () => {
    render(<RealTimeDocumentEditor {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    const exportButton = screen.getByRole('button', { name: /export/i })
    await user.click(exportButton)

    // Should show export options
    expect(screen.getByText('Export Document')).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()
    expect(screen.getByText('Word')).toBeInTheDocument()
  })

  it('should show real-time activity feed', () => {
    render(<RealTimeDocumentEditor {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    const activityFeed = screen.getByText('Recent Activity').closest('div')
    expect(activityFeed).toBeInTheDocument()
  })

  it('should handle keyboard shortcuts', async () => {
    render(<RealTimeDocumentEditor {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    const textArea = screen.getByRole('textbox')
    
    // Test Ctrl+S for save
    await user.type(textArea, '{Control>}s{/Control}')
    
    expect(mockProps.onSave).toHaveBeenCalled()
  })

  it('should handle disconnection gracefully', () => {
    // Mock disconnected state
    vi.mocked(require('@/lib/stores/realtime-collaboration.store').useRealtimeCollaborationStore)
      .mockReturnValue({
        connection: {
          isConnected: false,
          status: 'disconnected',
          quality: 'poor',
        },
        documents: new Map(),
        presence: { users: new Map() },
        connect: vi.fn(),
        joinDocument: vi.fn(),
        leaveDocument: vi.fn(),
        updatePresence: vi.fn(),
        sendMessage: vi.fn(),
      })

    render(<RealTimeDocumentEditor {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    expect(screen.getByText('Disconnected')).toBeInTheDocument()
    expect(screen.getByText('Attempting to reconnect...')).toBeInTheDocument()
  })

  it('should validate user permissions', () => {
    const readOnlyDocument = createTestDocument({
      collaborators: [
        {
          userId: 'current-user',
          permissions: ['read'], // No edit permission
          joinedAt: new Date(),
        }
      ]
    })

    render(<RealTimeDocumentEditor {...mockProps} document={readOnlyDocument} />, {
      wrapper: createTestWrapper(),
    })

    const textArea = screen.getByRole('textbox')
    expect(textArea).toHaveAttribute('readOnly')
    expect(screen.getByText('Read Only')).toBeInTheDocument()
  })

  it('should handle document size limits', async () => {
    const largeContent = 'x'.repeat(1000000) // 1MB content
    const largeDocument = createTestDocument({
      content: largeContent
    })

    render(<RealTimeDocumentEditor {...mockProps} document={largeDocument} />, {
      wrapper: createTestWrapper(),
    })

    // Should show size warning
    expect(screen.getByText(/document size/i)).toBeInTheDocument()
  })
})

describe('RealTimeDocumentEditor Accessibility', () => {
  beforeEach(() => {
    global.WebSocket = MockWebSocket as any
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanupTest()
  })

  it('should have proper ARIA labels', () => {
    render(<RealTimeDocumentEditor {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    const textArea = screen.getByRole('textbox')
    expect(textArea).toHaveAttribute('aria-label', expect.stringContaining('Document editor'))
    
    const statusRegion = screen.getByRole('status')
    expect(statusRegion).toBeInTheDocument()
  })

  it('should announce status changes to screen readers', async () => {
    render(<RealTimeDocumentEditor {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    const statusRegion = screen.getByRole('status')
    expect(statusRegion).toHaveTextContent('Connected')
  })

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup()
    
    render(<RealTimeDocumentEditor {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    // Tab through interactive elements
    await user.tab()
    expect(screen.getByRole('textbox')).toHaveFocus()

    await user.tab()
    expect(screen.getByRole('button', { name: /save/i })).toHaveFocus()
  })

  it('should provide clear focus indicators', () => {
    render(<RealTimeDocumentEditor {...mockProps} />, {
      wrapper: createTestWrapper(),
    })

    const textArea = screen.getByRole('textbox')
    expect(textArea).toHaveClass('focus:ring-2')
  })
})