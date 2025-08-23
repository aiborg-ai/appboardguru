/**
 * API Integration Tests for Document Intelligence Endpoints
 * Comprehensive tests for all document intelligence API routes
 */

import { createMocks } from 'node-mocks-http'
import { NextRequest } from 'next/server'

// Import API route handlers
import { POST as SummarizeAPI, GET as SummarizeGetAPI } from '@/app/api/document-intelligence/summarize/route'
import { POST as QAAPI, GET as QAGetAPI, DELETE as QADeleteAPI } from '@/app/api/document-intelligence/qa/route'
import { POST as AnalyzeAPI, GET as AnalyzeGetAPI } from '@/app/api/document-intelligence/analyze/route'
import { POST as SearchAPI, GET as SearchGetAPI } from '@/app/api/document-intelligence/search/route'
import { POST as AnalyticsAPI, GET as AnalyticsGetAPI, PUT as AnalyticsPutAPI } from '@/app/api/document-intelligence/analytics/route'

// Mock Supabase
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-1', email: 'test@example.com' } },
        error: null
      })
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'test-record' }, error: null }),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis()
    }))
  }))
}))

// Mock cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    getAll: () => [],
    set: () => {},
    get: () => null
  })
}))

// Mock document intelligence services
jest.mock('@/lib/services/smart-summarization.service', () => ({
  smartSummarizationService: {
    generateSmartSummary: jest.fn().mockResolvedValue({
      success: true,
      data: {
        summaries: [{
          id: 'summary-1',
          documentId: 'doc-1',
          summaryType: 'executive',
          content: 'Test summary content',
          keyInsights: ['Insight 1', 'Insight 2'],
          actionItems: [],
          riskFactors: [],
          generatedAt: new Date().toISOString(),
          metadata: {
            wordCount: 100,
            readingTime: 2,
            complexity: 5,
            confidence: 0.85
          },
          priorityScore: 7
        }]
      }
    }),
    summarizeBoardPack: jest.fn().mockResolvedValue({
      success: true,
      data: {
        executiveSummary: 'Board pack summary',
        documentSummaries: [],
        priorityRanking: [],
        keyDecisionPoints: [],
        recommendedActions: []
      }
    })
  }
}))

jest.mock('@/lib/services/rag-qa.service', () => ({
  ragQAService: {
    askQuestion: jest.fn().mockResolvedValue({
      success: true,
      data: {
        id: 'qa-1',
        query: 'Test question',
        answer: 'Test answer',
        citations: [],
        relatedDocuments: [],
        confidence: 0.9,
        sources: [],
        generatedAt: new Date().toISOString()
      }
    }),
    performCrossDocumentAnalysis: jest.fn().mockResolvedValue({
      success: true,
      data: []
    }),
    generateComparativeReport: jest.fn().mockResolvedValue({
      success: true,
      data: {
        summary: 'Comparative analysis summary',
        comparisons: [],
        insights: [],
        recommendations: []
      }
    })
  }
}))

jest.mock('@/lib/services/automated-document-analysis.service', () => ({
  automatedDocumentAnalysisService: {
    analyzeDocument: jest.fn().mockResolvedValue({
      success: true,
      data: {
        id: 'analysis-1',
        documentId: 'doc-1',
        analysisTypes: ['contract'],
        results: {
          contract: {
            contractType: 'Service Agreement',
            parties: [],
            keyTerms: [],
            riskAssessment: {}
          }
        },
        confidence: 0.8,
        generatedAt: new Date().toISOString()
      }
    })
  }
}))

jest.mock('@/lib/services/semantic-search.service', () => ({
  semanticSearchService: {
    performSemanticSearch: jest.fn().mockResolvedValue({
      success: true,
      data: {
        query: 'test search',
        results: [],
        totalResults: 0,
        searchTime: 150,
        searchStrategy: {
          primary: 'semantic',
          fallbacks: [],
          confidence: 0.8,
          explanation: 'Selected semantic strategy'
        }
      }
    }),
    indexDocument: jest.fn().mockResolvedValue({ success: true }),
    reindexDocuments: jest.fn().mockResolvedValue({
      success: true,
      data: { indexed: 5, failed: [] }
    })
  }
}))

jest.mock('@/lib/services/document-intelligence-analytics.service', () => ({
  documentIntelligenceAnalyticsService: {
    generateAnalyticsDashboard: jest.fn().mockResolvedValue({
      success: true,
      data: {
        organizationId: 'org-1',
        timeRange: { start: '2023-01-01', end: '2023-01-31' },
        overview: {
          totalDocuments: 100,
          documentsProcessed: 95,
          averageProcessingTime: 45,
          systemHealth: {
            overall: 92,
            components: {
              processing: 90,
              accuracy: 94,
              performance: 88,
              availability: 99
            }
          },
          costEfficiency: {
            costPerDocument: 0.50,
            costPerQuery: 0.02,
            resourceUtilization: 75,
            roi: 3.2
          }
        }
      }
    }),
    trackEvent: jest.fn().mockResolvedValue(undefined)
  }
}))

describe('Document Intelligence API Integration Tests', () => {
  
  describe('/api/document-intelligence/summarize', () => {
    it('should generate single document summary', async () => {
      const requestBody = {
        documentId: 'doc-1',
        summaryTypes: ['executive', 'key-insights'],
        options: {
          priorityScoring: true,
          targetAudience: 'board'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/document-intelligence/summarize', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await SummarizeAPI(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.summaries).toBeDefined()
      expect(Array.isArray(data.data.summaries)).toBe(true)
    })

    it('should generate board pack summary', async () => {
      const requestBody = {
        documentIds: ['doc-1', 'doc-2', 'doc-3'],
        options: {
          generateExecutiveSummary: true,
          prioritizeByUrgency: true,
          includeRiskDashboard: true
        }
      }

      const url = new URL('http://localhost:3000/api/document-intelligence/summarize?operation=board-pack')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await SummarizeAPI(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.executiveSummary).toBeDefined()
      expect(data.data.priorityRanking).toBeDefined()
    })

    it('should get existing summaries', async () => {
      const url = new URL('http://localhost:3000/api/document-intelligence/summarize?documentId=doc-1')
      const request = new NextRequest(url, { method: 'GET' })

      const response = await SummarizeGetAPI(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.summaries).toBeDefined()
    })

    it('should validate required fields', async () => {
      const requestBody = {
        summaryTypes: ['executive']
        // Missing documentId
      }

      const request = new NextRequest('http://localhost:3000/api/document-intelligence/summarize', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await SummarizeAPI(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Validation error')
    })
  })

  describe('/api/document-intelligence/qa', () => {
    it('should answer questions using RAG', async () => {
      const requestBody = {
        query: 'What are the key financial metrics?',
        documentIds: ['doc-1', 'doc-2'],
        options: {
          maxSources: 10,
          answerStyle: 'detailed'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/document-intelligence/qa', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await QAAPI(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.answer).toBeDefined()
      expect(data.data.confidence).toBeGreaterThanOrEqual(0)
      expect(data.data.confidence).toBeLessThanOrEqual(1)
    })

    it('should perform cross-document analysis', async () => {
      const requestBody = {
        query: 'Compare revenue trends',
        documentIds: ['doc-1', 'doc-2'],
        analysisType: 'comparison'
      }

      const url = new URL('http://localhost:3000/api/document-intelligence/qa?operation=cross-analysis')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await QAAPI(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
    })

    it('should get Q&A history', async () => {
      const url = new URL('http://localhost:3000/api/document-intelligence/qa?operation=history&limit=20')
      const request = new NextRequest(url, { method: 'GET' })

      const response = await QAGetAPI(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.interactions).toBeDefined()
    })

    it('should delete conversations', async () => {
      const url = new URL('http://localhost:3000/api/document-intelligence/qa?conversationId=conv-1')
      const request = new NextRequest(url, { method: 'DELETE' })

      const response = await QADeleteAPI(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('/api/document-intelligence/analyze', () => {
    it('should analyze single document', async () => {
      const requestBody = {
        documentId: 'doc-1',
        analysisTypes: ['contract', 'risk'],
        options: {
          deepAnalysis: true,
          includeRecommendations: true
        }
      }

      const request = new NextRequest('http://localhost:3000/api/document-intelligence/analyze', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await AnalyzeAPI(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.results).toBeDefined()
      expect(data.data.confidence).toBeGreaterThanOrEqual(0)
    })

    it('should perform batch analysis', async () => {
      const requestBody = {
        documentIds: ['doc-1', 'doc-2', 'doc-3'],
        analysisTypes: ['risk', 'compliance'],
        options: {
          generateCrossAnalysis: true
        }
      }

      const url = new URL('http://localhost:3000/api/document-intelligence/analyze?operation=batch')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await AnalyzeAPI(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.results).toBeDefined()
      expect(data.data.summary).toBeDefined()
    })

    it('should get analysis history', async () => {
      const url = new URL('http://localhost:3000/api/document-intelligence/analyze?operation=history&limit=10')
      const request = new NextRequest(url, { method: 'GET' })

      const response = await AnalyzeGetAPI(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.analyses).toBeDefined()
    })

    it('should get available compliance frameworks', async () => {
      const url = new URL('http://localhost:3000/api/document-intelligence/analyze?operation=frameworks')
      const request = new NextRequest(url, { method: 'GET' })

      const response = await AnalyzeGetAPI(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.frameworks).toBeDefined()
      expect(Array.isArray(data.data.frameworks)).toBe(true)
    })
  })

  describe('/api/document-intelligence/search', () => {
    it('should perform semantic search', async () => {
      const requestBody = {
        query: 'financial performance metrics',
        options: {
          maxResults: 20,
          includeSnippets: true,
          searchTypes: ['semantic', 'keyword'],
          semanticBoost: 1.2
        }
      }

      const request = new NextRequest('http://localhost:3000/api/document-intelligence/search', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await SearchAPI(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.results).toBeDefined()
      expect(data.data.searchStrategy).toBeDefined()
    })

    it('should index documents', async () => {
      const requestBody = {
        documentId: 'doc-1'
      }

      const url = new URL('http://localhost:3000/api/document-intelligence/search?operation=index')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await SearchAPI(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should get search history', async () => {
      const url = new URL('http://localhost:3000/api/document-intelligence/search?operation=history')
      const request = new NextRequest(url, { method: 'GET' })

      const response = await SearchGetAPI(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.searches).toBeDefined()
    })

    it('should get search suggestions', async () => {
      const url = new URL('http://localhost:3000/api/document-intelligence/search?operation=suggestions&query=financial')
      const request = new NextRequest(url, { method: 'GET' })

      const response = await SearchGetAPI(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.suggestions).toBeDefined()
    })
  })

  describe('/api/document-intelligence/analytics', () => {
    it('should generate analytics dashboard', async () => {
      const requestBody = {
        organizationId: 'org-1',
        timeRange: {
          start: '2023-01-01T00:00:00.000Z',
          end: '2023-01-31T23:59:59.000Z'
        },
        options: {
          includeRealTime: true,
          includePredictions: true,
          granularity: 'day'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/document-intelligence/analytics', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await AnalyticsAPI(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.overview).toBeDefined()
      expect(data.data.overview.totalDocuments).toBeGreaterThanOrEqual(0)
      expect(data.data.overview.systemHealth.overall).toBeGreaterThanOrEqual(0)
      expect(data.data.overview.systemHealth.overall).toBeLessThanOrEqual(100)
    })

    it('should track events', async () => {
      const requestBody = {
        organizationId: 'org-1',
        eventType: 'document_processed',
        metadata: {
          documentId: 'doc-1',
          processingTime: 45
        }
      }

      const url = new URL('http://localhost:3000/api/document-intelligence/analytics?operation=track-event')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await AnalyticsAPI(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should get analytics summary', async () => {
      const url = new URL('http://localhost:3000/api/document-intelligence/analytics?operation=summary&organizationId=org-1')
      const request = new NextRequest(url, { method: 'GET' })

      const response = await AnalyticsGetAPI(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.totalDocuments).toBeGreaterThanOrEqual(0)
    })

    it('should update settings', async () => {
      const requestBody = {
        organizationId: 'org-1',
        settings: {
          enableRealTimeTracking: true,
          retentionPeriodDays: 90,
          alertThresholds: {
            processingTime: 120,
            accuracyScore: 0.8
          }
        }
      }

      const url = new URL('http://localhost:3000/api/document-intelligence/analytics?operation=update-settings')
      const request = new NextRequest(url, {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await AnalyticsPutAPI(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      // Mock authentication failure
      const originalGetUser = require('@supabase/ssr').createServerClient().auth.getUser
      require('@supabase/ssr').createServerClient = jest.fn(() => ({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Invalid token' }
          })
        }
      }))

      const requestBody = { documentId: 'doc-1', summaryTypes: ['executive'] }
      const request = new NextRequest('http://localhost:3000/api/document-intelligence/summarize', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await SummarizeAPI(request)
      expect(response.status).toBe(401)

      // Restore mock
      require('@supabase/ssr').createServerClient = jest.fn(() => ({
        auth: { getUser: originalGetUser }
      }))
    })

    it('should handle service errors gracefully', async () => {
      // Mock service failure
      const { smartSummarizationService } = require('@/lib/services/smart-summarization.service')
      smartSummarizationService.generateSmartSummary.mockResolvedValueOnce({
        success: false,
        error: 'Service temporarily unavailable'
      })

      const requestBody = { documentId: 'doc-1', summaryTypes: ['executive'] }
      const request = new NextRequest('http://localhost:3000/api/document-intelligence/summarize', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await SummarizeAPI(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Service temporarily unavailable')
    })

    it('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/document-intelligence/summarize', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await SummarizeAPI(request)
      expect(response.status).toBe(400)
    })

    it('should handle missing required parameters', async () => {
      const url = new URL('http://localhost:3000/api/document-intelligence/analytics?operation=summary')
      // Missing organizationId parameter
      const request = new NextRequest(url, { method: 'GET' })

      const response = await AnalyticsGetAPI(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Organization ID is required')
    })
  })

  describe('Rate Limiting', () => {
    it('should handle rate limiting gracefully', async () => {
      // This would test rate limiting if implemented
      const requests = Array.from({ length: 100 }, (_, i) => {
        const requestBody = { documentId: `doc-${i}`, summaryTypes: ['executive'] }
        return new NextRequest('http://localhost:3000/api/document-intelligence/summarize', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json'
          }
        })
      })

      // In a real scenario, some of these would be rate limited
      const responses = await Promise.all(requests.map(req => SummarizeAPI(req)))
      
      // All should respond (either success or rate limited)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status)
      })
    })
  })

  describe('Performance Tests', () => {
    it('should respond within acceptable time limits', async () => {
      const requestBody = {
        query: 'performance test query',
        options: { maxResults: 10 }
      }

      const start = Date.now()
      const request = new NextRequest('http://localhost:3000/api/document-intelligence/search', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await SearchAPI(request)
      const duration = Date.now() - start

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(5000) // Should respond within 5 seconds
    })

    it('should handle concurrent requests', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => {
        const requestBody = { documentId: `concurrent-doc-${i}`, summaryTypes: ['executive'] }
        return new NextRequest('http://localhost:3000/api/document-intelligence/summarize', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json'
          }
        })
      })

      const start = Date.now()
      const responses = await Promise.all(concurrentRequests.map(req => SummarizeAPI(req)))
      const duration = Date.now() - start

      expect(responses.every(res => res.status === 200)).toBe(true)
      expect(duration).toBeLessThan(15000) // Should complete within 15 seconds
    })
  })
})

// Test utilities
export const createTestRequest = (url: string, method: string, body?: any, params?: Record<string, string>) => {
  const testUrl = new URL(url)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      testUrl.searchParams.set(key, value)
    })
  }

  return new NextRequest(testUrl, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export const expectSuccessResponse = (response: Response, expectedData?: any) => {
  expect(response.status).toBe(200)
  return response.json().then(data => {
    expect(data.success).toBe(true)
    if (expectedData) {
      expect(data.data).toMatchObject(expectedData)
    }
    return data
  })
}

export const expectErrorResponse = (response: Response, expectedStatus: number, expectedError?: string) => {
  expect(response.status).toBe(expectedStatus)
  return response.json().then(data => {
    expect(data.success).toBe(false)
    if (expectedError) {
      expect(data.error).toBe(expectedError)
    }
    return data
  })
}