/**
 * AI Chat RightPanel Component Tests
 * Following enterprise architecture guidelines:
 * - React Testing Library for component testing
 * - Mock API responses with Result<T> pattern
 * - Branded types for type safety
 * - Performance testing with render times
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jest } from '@jest/globals'
import RightPanel from '@/features/shared/components/RightPanel'
import { CONTEXT_SCOPE_OPTIONS } from '@/features/ai-chat/ai/ScopeSelectorTypes'
import { EnhancedChatResponse } from '@/types/search'
import { createUserId, createOrganizationId, createVaultId, createAssetId } from '@/lib/utils/branded-type-helpers'

// Mock the OrganizationContext
const mockOrganizationContext = {
  currentOrganization: { id: 'org_123', name: 'Test Organization', slug: 'test-org' },
  currentVault: null,
  organizations: [
    { id: 'org_123', name: 'Test Organization', slug: 'test-org' },
    { id: 'org_456', name: 'Another Organization', slug: 'another-org' }
  ]
}

jest.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => mockOrganizationContext
}))

// Mock the hooks
jest.mock('@/hooks/useContextDetection', () => ({
  useContextDetection: () => ({
    currentContext: 'test-context',
    contextEntities: ['entity1', 'entity2']
  })
}))

jest.mock('@/hooks/useFYIService', () => ({
  useFYIService: () => ({
    fetchInsights: jest.fn(),
    isLoading: false
  })
}))

// Mock fetch for API calls
global.fetch = jest.fn()

describe('RightPanel - AI Chat Component', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      },
      writable: true
    })
  })

  describe('Panel State Management', () => {
    it('should start closed by default (following architecture requirement)', () => {
      render(<RightPanel />)
      
      // Panel should not be visible initially
      expect(screen.queryByText('AI Assistant')).not.toBeInTheDocument()
    })

    it('should open when toggle button is clicked', async () => {
      render(<RightPanel />)
      
      const toggleButton = screen.getByTitle('Open AI Assistant Panel')
      await user.click(toggleButton)
      
      await waitFor(() => {
        expect(screen.getByText('AI Assistant')).toBeInTheDocument()
      })
    })

    it('should persist panel width in localStorage', async () => {
      const mockSetItem = jest.fn()
      Object.defineProperty(window, 'localStorage', {
        value: { ...window.localStorage, setItem: mockSetItem },
        writable: true
      })

      render(<RightPanel />)
      
      const toggleButton = screen.getByTitle('Open AI Assistant Panel')
      await user.click(toggleButton)
      
      await waitFor(() => {
        const wideButton = screen.getByTitle('Default width')
        return user.click(wideButton)
      })
      
      expect(mockSetItem).toHaveBeenCalledWith('right-panel-width', 'wide')
    })

    it('should handle keyboard shortcuts (Escape to close)', async () => {
      render(<RightPanel />)
      
      // Open panel first
      const toggleButton = screen.getByTitle('Open AI Assistant Panel')
      await user.click(toggleButton)
      
      await waitFor(() => {
        expect(screen.getByText('AI Assistant')).toBeInTheDocument()
      })
      
      // Press Escape to close
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
      
      await waitFor(() => {
        expect(screen.queryByText('AI Assistant')).not.toBeInTheDocument()
      })
    })
  })

  describe('Context Scope Selector', () => {
    beforeEach(async () => {
      render(<RightPanel />)
      const toggleButton = screen.getByTitle('Open AI Assistant Panel')
      await user.click(toggleButton)
      
      await waitFor(() => {
        expect(screen.getByText('AI Assistant')).toBeInTheDocument()
      })
    })

    it('should display all context scope options', async () => {
      const dropdownTrigger = screen.getByRole('button', { name: /boardguru/i })
      await user.click(dropdownTrigger)
      
      await waitFor(() => {
        CONTEXT_SCOPE_OPTIONS.forEach(option => {
          expect(screen.getByText(option.label)).toBeInTheDocument()
        })
      })
    })

    it('should change scope when option is selected', async () => {
      const dropdownTrigger = screen.getByRole('button', { name: /boardguru/i })
      await user.click(dropdownTrigger)
      
      await waitFor(() => {
        const generalOption = screen.getByText('General')
        return user.click(generalOption)
      })
      
      // Verify the scope changed
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /general/i })).toBeInTheDocument()
      })
    })

    it('should persist scope selection in localStorage', async () => {
      const mockSetItem = jest.fn()
      Object.defineProperty(window, 'localStorage', {
        value: { ...window.localStorage, setItem: mockSetItem },
        writable: true
      })

      const dropdownTrigger = screen.getByRole('button', { name: /boardguru/i })
      await user.click(dropdownTrigger)
      
      await waitFor(() => {
        const generalOption = screen.getByText('General')
        return user.click(generalOption)
      })
      
      expect(mockSetItem).toHaveBeenCalledWith('ai-chat-context-scope', 'general')
    })

    it('should show organization selection for organization scope', async () => {
      const dropdownTrigger = screen.getByRole('button', { name: /boardguru/i })
      await user.click(dropdownTrigger)
      
      await waitFor(() => {
        const orgOption = screen.getByText('Organization')
        return user.click(orgOption)
      })
      
      // Re-open dropdown to see organization options
      await user.click(dropdownTrigger)
      
      await waitFor(() => {
        expect(screen.getByText('Test Organization')).toBeInTheDocument()
        expect(screen.getByText('Another Organization')).toBeInTheDocument()
      })
    })
  })

  describe('AI Chat Functionality', () => {
    beforeEach(async () => {
      render(<RightPanel />)
      const toggleButton = screen.getByTitle('Open AI Assistant Panel')
      await user.click(toggleButton)
      
      await waitFor(() => {
        expect(screen.getByText('AI Assistant')).toBeInTheDocument()
      })
    })

    it('should send message to OpenRouter API with correct payload', async () => {
      const mockResponse: EnhancedChatResponse = {
        success: true,
        message: 'This is a test response from BoardGuru AI Assistant.',
        references: {
          assets: [],
          websites: [],
          vaults: [],
          meetings: [],
          reports: []
        },
        suggestions: ['Test suggestion 1', 'Test suggestion 2'],
        search_metadata: {
          query_processed: 'test message',
          search_time_ms: 150,
          total_results_found: 0,
          context_used: 'boardguru'
        },
        usage: {
          prompt_tokens: 50,
          completion_tokens: 25,
          total_tokens: 75
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      const sendButton = screen.getByRole('button', { name: /send message/i })

      await user.type(messageInput, 'Test message for AI')
      await user.click(sendButton)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/chat/enhanced',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Test message for AI',
            context: {
              scope: 'boardguru',
              organizationId: undefined,
              organizationName: undefined,
              vaultId: undefined,
              vaultName: undefined,
              assetId: undefined,
              assetName: undefined
            },
            options: {
              includeWebSearch: false,
              includeReferences: true,
              maxReferences: 5
            }
          })
        })
      )
    })

    it('should display AI response with proper formatting', async () => {
      const mockResponse: EnhancedChatResponse = {
        success: true,
        message: 'This is a test response with **bold text** and references.',
        references: {
          assets: [{
            id: 'asset_123' as any,
            type: 'pdf',
            title: 'Test Document',
            description: 'A test document for reference',
            excerpt: 'This is an excerpt from the test document',
            url: '/dashboard/assets/asset_123',
            download_url: '/api/assets/asset_123/download',
            thumbnail_url: null,
            relevance_score: 0.85,
            confidence_score: 0.92,
            metadata: {
              fileName: 'test-doc.pdf',
              fileSize: 1024000,
              fileType: 'application/pdf',
              lastModified: new Date().toISOString(),
              vault: { id: 'vault_123', name: 'Test Vault' },
              organization: { id: 'org_123', name: 'Test Organization' },
              tags: ['test', 'document'],
              category: 'governance',
              estimatedReadTime: '5 min',
              complexityLevel: 'medium'
            },
            preview: {
              content: 'Preview content...',
              wordCount: 150
            }
          }],
          websites: [],
          vaults: [],
          meetings: [],
          reports: []
        },
        suggestions: ['Learn more about governance', 'Review related documents'],
        search_metadata: {
          query_processed: 'test message',
          search_time_ms: 200,
          total_results_found: 1,
          context_used: 'boardguru'
        },
        usage: {
          prompt_tokens: 50,
          completion_tokens: 35,
          total_tokens: 85
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      const sendButton = screen.getByRole('button', { name: /send message/i })

      await user.type(messageInput, 'Test message')
      await user.click(sendButton)

      // Wait for response to appear
      await waitFor(() => {
        expect(screen.getByText(/test response with/i)).toBeInTheDocument()
      }, { timeout: 5000 })

      // Check for references section
      await waitFor(() => {
        expect(screen.getByText('References')).toBeInTheDocument()
        expect(screen.getByText('Test Document')).toBeInTheDocument()
      })
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response)

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      const sendButton = screen.getByRole('button', { name: /send message/i })

      await user.type(messageInput, 'Test message')
      await user.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText(/error.*occurred/i)).toBeInTheDocument()
      })
    })

    it('should show loading state during API call', async () => {
      // Mock a delayed response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, message: 'Response' })
        } as Response), 1000))
      )

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      const sendButton = screen.getByRole('button', { name: /send message/i })

      await user.type(messageInput, 'Test message')
      await user.click(sendButton)

      // Check for loading indicator
      expect(screen.getByText(/thinking/i)).toBeInTheDocument()
      expect(sendButton).toBeDisabled()
    })

    it('should clear conversation when clear button is clicked', async () => {
      // First send a message
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Test response' })
      } as Response)

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      const sendButton = screen.getByRole('button', { name: /send message/i })

      await user.type(messageInput, 'Test message')
      await user.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText('Test response')).toBeInTheDocument()
      })

      // Click clear conversation
      const clearButton = screen.getByText(/clear conversation/i)
      await user.click(clearButton)

      // Conversation should be cleared
      await waitFor(() => {
        expect(screen.queryByText('Test response')).not.toBeInTheDocument()
      })
    })
  })

  describe('Performance & Accessibility', () => {
    it('should render within performance budget (< 100ms)', () => {
      const startTime = performance.now()
      
      render(<RightPanel />)
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      expect(renderTime).toBeLessThan(100) // 100ms performance budget
    })

    it('should have proper ARIA labels for accessibility', async () => {
      render(<RightPanel />)
      
      // Check toggle button accessibility
      const toggleButton = screen.getByRole('button', { name: /open ai assistant panel/i })
      expect(toggleButton).toHaveAttribute('aria-label')
      
      // Open panel and check dropdown accessibility
      await user.click(toggleButton)
      
      await waitFor(() => {
        const dropdown = screen.getByRole('button', { name: /boardguru/i })
        expect(dropdown).toHaveAttribute('aria-expanded', 'false')
      })
    })

    it('should support keyboard navigation', async () => {
      render(<RightPanel />)
      
      // Open panel
      const toggleButton = screen.getByTitle('Open AI Assistant Panel')
      toggleButton.focus()
      fireEvent.keyDown(toggleButton, { key: 'Enter' })
      
      await waitFor(() => {
        expect(screen.getByText('AI Assistant')).toBeInTheDocument()
      })
      
      // Tab navigation should work
      fireEvent.keyDown(document.activeElement!, { key: 'Tab' })
      expect(document.activeElement).toHaveAttribute('role', 'button')
    })
  })

  describe('Context Management', () => {
    it('should switch context based on scope selection', async () => {
      render(<RightPanel />)
      const toggleButton = screen.getByTitle('Open AI Assistant Panel')
      await user.click(toggleButton)
      
      await waitFor(() => {
        expect(screen.getByText('AI Assistant')).toBeInTheDocument()
      })

      // Change to organization scope
      const dropdownTrigger = screen.getByRole('button', { name: /boardguru/i })
      await user.click(dropdownTrigger)
      
      const orgOption = screen.getByText('Organization')
      await user.click(orgOption)
      
      // Select an organization
      await user.click(dropdownTrigger)
      const testOrg = screen.getByText('Test Organization')
      await user.click(testOrg)
      
      // Send a message and verify context is included
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Org response' })
      } as Response)

      const messageInput = screen.getByPlaceholderText(/type your message/i)
      await user.type(messageInput, 'Test org message')
      
      const sendButton = screen.getByRole('button', { name: /send message/i })
      await user.click(sendButton)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/chat/enhanced',
        expect.objectContaining({
          body: expect.stringContaining('"organizationId":"org_123"')
        })
      )
    })
  })

  describe('Tab Management', () => {
    beforeEach(async () => {
      render(<RightPanel />)
      const toggleButton = screen.getByTitle('Open AI Assistant Panel')
      await user.click(toggleButton)
      
      await waitFor(() => {
        expect(screen.getByText('AI Assistant')).toBeInTheDocument()
      })
    })

    it('should switch between AI Chat, FYI, and Logs tabs', async () => {
      // AI Chat tab should be active by default
      expect(screen.getByText('AI Assistant')).toBeInTheDocument()
      
      // Switch to FYI tab
      const fyiTab = screen.getByText('FYI')
      await user.click(fyiTab)
      
      await waitFor(() => {
        expect(screen.getByText('FYI - Context Insights')).toBeInTheDocument()
      })
      
      // Switch to Logs tab
      const logsTab = screen.getByText('Logs')
      await user.click(logsTab)
      
      await waitFor(() => {
        expect(screen.getByText('System Logs')).toBeInTheDocument()
      })
    })

    it('should maintain tab state when panel is reopened', async () => {
      // Switch to Logs tab
      const logsTab = screen.getByText('Logs')
      await user.click(logsTab)
      
      await waitFor(() => {
        expect(screen.getByText('System Logs')).toBeInTheDocument()
      })
      
      // Close panel
      const closeButton = screen.getByTitle('Close panel')
      await user.click(closeButton)
      
      // Reopen panel
      const toggleButton = screen.getByTitle('Open AI Assistant Panel')
      await user.click(toggleButton)
      
      // Should still be on Logs tab
      await waitFor(() => {
        expect(screen.getByText('System Logs')).toBeInTheDocument()
      })
    })
  })
})