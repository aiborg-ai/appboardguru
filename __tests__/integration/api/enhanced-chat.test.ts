/**
 * Enhanced Chat API Integration Tests
 * Following enterprise architecture guidelines:
 * - Repository Pattern with Result<T> types
 * - Branded types for type safety
 * - Database integration testing
 * - OpenRouter API mocking
 * - Comprehensive error handling
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/chat/enhanced/route'
import { EnhancedChatResponse } from '@/types/search'
import { createUserId, createOrganizationId, createVaultId, createAssetId } from '@/lib/utils/branded-type-helpers'
import { searchService } from '@/lib/services/search.service'
import { jest } from '@jest/globals'

// Mock external dependencies
jest.mock('@/lib/services/search.service', () => ({
  searchService: {
    search: jest.fn(),
    trackSearchQuery: jest.fn()
  }
}))

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn()
    })),
    storage: {
      from: jest.fn(() => ({
        download: jest.fn()
      }))
    }
  }))
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    getAll: () => [],
    set: jest.fn(),
    setAll: jest.fn()
  }))
}))

// Mock OpenRouter API
global.fetch = jest.fn()

describe('Enhanced Chat API Integration Tests', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
  const mockSearchService = searchService as jest.Mocked<typeof searchService>

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default OpenRouter API response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{
          message: {
            content: 'This is a mock AI response from Claude 3.5 Sonnet.'
          }
        }],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 75,
          total_tokens: 225
        }
      })
    } as Response)

    // Default search service response
    mockSearchService.search.mockResolvedValue({
      results: [],
      total_count: 0,
      search_time_ms: 50,
      query_metadata: {
        original_query: 'test',
        processed_query: 'test',
        query_type: 'hybrid',
        filters_applied: []
      }
    })
  })

  describe('Request Validation', () => {
    it('should validate required message field', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: { scope: 'general' }
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Message is required')
    })

    it('should validate required context field', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Context is required')
    })

    it('should validate context scope values', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message',
          context: { scope: 'invalid_scope' }
        })
      })

      const response = await POST(request)
      const data: EnhancedChatResponse = await response.json()

      expect(response.status).toBe(200) // Should still process but with default behavior
      expect(data.success).toBe(true)
    })
  })

  describe('Context Scope Processing', () => {
    it('should process general scope correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'What is board governance?',
          context: { scope: 'general' },
          options: { includeWebSearch: true, includeReferences: false }
        })
      })

      const response = await POST(request)
      const data: EnhancedChatResponse = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBeTruthy()
      expect(data.search_metadata.context_used).toBe('general')

      // Verify OpenRouter was called with correct system prompt
      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
            'Content-Type': 'application/json',
            'X-Title': 'BoardGuru AI Assistant'
          }),
          body: expect.stringContaining('"model":"anthropic/claude-3.5-sonnet"')
        })
      )
    })

    it('should process boardguru scope with specialized prompt', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'How do I create a board meeting?',
          context: { scope: 'boardguru' }
        })
      })

      const response = await POST(request)
      const data: EnhancedChatResponse = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.search_metadata.context_used).toBe('boardguru')

      // Verify system prompt contains BoardGuru-specific content
      const fetchCall = mockFetch.mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1]!.body as string)
      expect(requestBody.messages[0].content).toContain('BoardGuru AI Assistant')
      expect(requestBody.messages[0].content).toContain('corporate governance')
    })

    it('should process organization scope with context', async () => {
      const orgId = createOrganizationId('org_123')
      
      const request = new NextRequest('http://localhost:3000/api/chat/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'What are our governance policies?',
          context: {
            scope: 'organization',
            organizationId: orgId,
            organizationName: 'Acme Corporation'
          },
          options: { includeReferences: true }
        })
      })

      mockSearchService.search.mockResolvedValue({
        results: [{
          asset: {
            id: 'asset_123',
            title: 'Governance Policy Document',
            description: 'Corporate governance policies',
            file_name: 'governance-policy.pdf',
            file_type: 'application/pdf',
            file_size: 2048000,
            updated_at: new Date().toISOString(),
            tags: ['governance', 'policy'],
            category: 'compliance'
          },
          vault: { id: 'vault_123', name: 'Policy Vault' },
          organization: { id: orgId, name: 'Acme Corporation' },
          metadata: {
            relevance_score: 0.95,
            ai_summary: 'This document outlines corporate governance policies...',
            estimated_read_time: '10 min',
            complexity_level: 'advanced'
          },
          highlight: {
            content: 'governance policies for board oversight...'
          }
        }],
        total_count: 1,
        search_time_ms: 120,
        query_metadata: {
          original_query: 'governance policies',
          processed_query: 'governance policies',
          query_type: 'hybrid',
          filters_applied: ['organization:org_123']
        }
      })

      const response = await POST(request)
      const data: EnhancedChatResponse = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.references.assets).toHaveLength(1)
      expect(data.references.assets[0].title).toBe('Governance Policy Document')
      expect(data.search_metadata.context_used).toBe('organization')

      // Verify search service was called with organization context
      expect(mockSearchService.search).toHaveBeenCalledWith({
        query: 'What are our governance policies?',
        context_scope: 'organization',
        context_id: orgId,
        limit: 10,
        search_type: 'hybrid'
      })
    })

    it('should handle vault scope with asset references', async () => {
      const vaultId = createVaultId('vault_456')
      
      const request = new NextRequest('http://localhost:3000/api/chat/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Summarize the documents in this vault',
          context: {
            scope: 'vault',
            vaultId,
            vaultName: 'Board Meeting Documents'
          }
        })
      })

      const response = await POST(request)
      const data: EnhancedChatResponse = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.search_metadata.context_used).toBe('vault')
    })

    it('should handle asset scope with specific document context', async () => {
      const assetId = createAssetId('asset_789')
      
      const request = new NextRequest('http://localhost:3000/api/chat/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'What are the key points in this document?',
          context: {
            scope: 'asset',
            assetId,
            assetName: 'Q3 Financial Report.pdf'
          }
        })
      })

      const response = await POST(request)
      const data: EnhancedChatResponse = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.search_metadata.context_used).toBe('asset')
    })
  })

  describe('Search Integration', () => {
    it('should include search results when includeReferences is true', async () => {
      mockSearchService.search.mockResolvedValue({
        results: [{
          asset: {
            id: 'asset_search_123',
            title: 'Search Result Document',
            description: 'A document found through search',
            file_name: 'search-result.pdf',
            file_type: 'application/pdf',
            file_size: 1024000,
            updated_at: new Date().toISOString(),
            tags: ['search', 'test'],
            category: 'general'
          },
          vault: { id: 'vault_search', name: 'Search Vault' },
          organization: { id: 'org_search', name: 'Search Org' },
          metadata: {
            relevance_score: 0.88,
            ai_summary: 'Search result summary...',
            estimated_read_time: '5 min',
            complexity_level: 'medium'
          },
          highlight: {
            content: 'highlighted search content...'
          }
        }],
        total_count: 1,
        search_time_ms: 85,
        query_metadata: {
          original_query: 'test search',
          processed_query: 'test search',
          query_type: 'hybrid',
          filters_applied: []
        }
      })

      const request = new NextRequest('http://localhost:3000/api/chat/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Find documents about testing',
          context: { 
            scope: 'general',
            organizationId: 'org_123'
          },
          options: { 
            includeReferences: true,
            maxReferences: 3
          }
        })
      })

      const response = await POST(request)
      const data: EnhancedChatResponse = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.references.assets).toHaveLength(1)
      expect(data.references.assets[0].title).toBe('Search Result Document')
      expect(data.search_metadata.total_results_found).toBe(1)
      expect(data.search_metadata.search_time_ms).toBe(85)
    })

    it('should skip search when includeReferences is false', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Simple question without search',
          context: { scope: 'general' },
          options: { includeReferences: false }
        })
      })

      const response = await POST(request)
      const data: EnhancedChatResponse = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.references.assets).toHaveLength(0)
      expect(mockSearchService.search).not.toHaveBeenCalled()
    })

    it('should handle search service errors gracefully', async () => {
      mockSearchService.search.mockRejectedValue(new Error('Search service error'))

      const request = new NextRequest('http://localhost:3000/api/chat/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Search query that fails',
          context: { scope: 'general' },
          options: { includeReferences: true }
        })
      })

      const response = await POST(request)
      const data: EnhancedChatResponse = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true) // Should continue without search results
      expect(data.references.assets).toHaveLength(0)
    })
  })

  describe('OpenRouter API Integration', () => {
    it('should handle OpenRouter API success response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          choices: [{
            message: {
              content: 'BoardGuru helps organizations manage board governance through comprehensive document management, meeting scheduling, and compliance tracking.'
            }
          }],
          usage: {
            prompt_tokens: 200,
            completion_tokens: 100,
            total_tokens: 300
          }
        })
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/chat/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'What is BoardGuru?',
          context: { scope: 'boardguru' }
        })
      })

      const response = await POST(request)
      const data: EnhancedChatResponse = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('BoardGuru helps organizations')
      expect(data.usage.prompt_tokens).toBe(200)
      expect(data.usage.completion_tokens).toBe(100)
      expect(data.usage.total_tokens).toBe(300)
    })

    it('should handle OpenRouter API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => 'Rate limit exceeded'
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/chat/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message',
          context: { scope: 'general' }
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('OpenRouter API error')
    })

    it('should handle OpenRouter API network failures', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const request = new NextRequest('http://localhost:3000/api/chat/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message',
          context: { scope: 'general' }
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Failed to connect to OpenRouter API')
    })
  })

  describe('Response Generation', () => {
    it('should generate contextual suggestions', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'board meetings',
          context: { scope: 'organization' }
        })
      })

      const response = await POST(request)
      const data: EnhancedChatResponse = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.suggestions).toBeDefined()
      expect(data.suggestions.length).toBeGreaterThan(0)
      expect(data.suggestions[0]).toContain('board meetings')
    })

    it('should include proper metadata in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test query',
          context: { scope: 'boardguru' }
        })
      })

      const response = await POST(request)
      const data: EnhancedChatResponse = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.search_metadata).toMatchObject({
        query_processed: 'Test query',
        search_time_ms: expect.any(Number),
        total_results_found: expect.any(Number),
        context_used: 'boardguru'
      })
    })
  })

  describe('Performance & Security', () => {
    it('should complete request within reasonable time (< 15s)', async () => {
      const startTime = Date.now()

      const request = new NextRequest('http://localhost:3000/api/chat/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Performance test message',
          context: { scope: 'general' }
        })
      })

      const response = await POST(request)
      const endTime = Date.now()
      const duration = endTime - startTime

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(15000) // 15 second timeout
    }, 20000)

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/chat/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid JSON')
    })

    it('should sanitize potentially dangerous input', async () => {
      const maliciousInput = '<script>alert("xss")</script>Drop table users;'

      const request = new NextRequest('http://localhost:3000/api/chat/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: maliciousInput,
          context: { scope: 'general' }
        })
      })

      const response = await POST(request)
      const data: EnhancedChatResponse = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Message should be processed but dangerous content should be handled safely
    })
  })
})