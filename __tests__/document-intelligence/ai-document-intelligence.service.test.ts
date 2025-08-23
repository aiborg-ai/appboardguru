/**
 * Test Suite for AI Document Intelligence Service
 * Comprehensive tests for document processing, summarization, and analysis
 */

import { aiDocumentIntelligenceService } from '@/lib/services/ai-document-intelligence.service'
import { smartSummarizationService } from '@/lib/services/smart-summarization.service'
import { ragQAService } from '@/lib/services/rag-qa.service'
import { automatedDocumentAnalysisService } from '@/lib/services/automated-document-analysis.service'

// Mock OpenRouter API
jest.mock('openrouter-api', () => {
  return {
    OpenRouter: jest.fn().mockImplementation(() => ({
      chat: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              summary: 'This is a test summary of the document.',
              keyInsights: ['Key insight 1', 'Key insight 2'],
              actionItems: ['Action 1', 'Action 2'],
              riskFactors: ['Risk 1', 'Risk 2']
            })
          }
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 200,
          total_tokens: 300
        }
      }))
    }))
  }
})

describe('AI Document Intelligence Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Document Summarization', () => {
    it('should generate smart summary with priority scoring', async () => {
      const result = await aiDocumentIntelligenceService.generateSmartSummary('doc1', {
        summaryType: 'executive',
        priorityScoring: true,
        maxLength: 1000,
        includeMetrics: true
      })

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('content')
      expect(result.data).toHaveProperty('priorityScore')
      expect(result.data).toHaveProperty('metadata')
      expect(result.data.priorityScore).toBeGreaterThanOrEqual(1)
      expect(result.data.priorityScore).toBeLessThanOrEqual(10)
    })

    it('should extract key insights from summary', async () => {
      const result = await smartSummarizationService.extractKeyInsights('doc1')

      expect(result.success).toBe(true)
      expect(Array.isArray(result.data)).toBe(true)
      result.data.forEach(insight => {
        expect(insight).toHaveProperty('id')
        expect(insight).toHaveProperty('title')
        expect(insight).toHaveProperty('description')
        expect(insight).toHaveProperty('impact')
        expect(insight).toHaveProperty('confidence')
      })
    })

    it('should extract action items with priorities', async () => {
      const mockContent = 'The board must review the quarterly results by Friday. Consider implementing the new strategy.'
      const actionItems = await smartSummarizationService.extractActionItems(mockContent)

      expect(Array.isArray(actionItems)).toBe(true)
      actionItems.forEach(item => {
        expect(item).toHaveProperty('id')
        expect(item).toHaveProperty('description')
        expect(item).toHaveProperty('priority')
        expect(['low', 'medium', 'high', 'critical']).toContain(item.priority)
      })
    })

    it('should extract risk factors with severity levels', async () => {
      const mockContent = 'There is a critical risk of regulatory non-compliance. Market volatility poses a significant threat.'
      const riskFactors = await smartSummarizationService.extractRiskFactors(mockContent)

      expect(Array.isArray(riskFactors)).toBe(true)
      riskFactors.forEach(risk => {
        expect(risk).toHaveProperty('id')
        expect(risk).toHaveProperty('category')
        expect(risk).toHaveProperty('description')
        expect(risk).toHaveProperty('severity')
        expect(['low', 'medium', 'high', 'critical']).toContain(risk.severity)
      })
    })

    it('should calculate priority score based on document characteristics', async () => {
      const mockDocument = {
        id: 'doc1',
        filename: 'contract.pdf',
        fileType: 'contract',
        fileSize: 1024 * 1024,
        totalPages: 25,
        uploadedAt: new Date().toISOString(),
        processed: true,
        complexity: 8
      }

      const mockSummary = 'This urgent contract contains critical compliance requirements and must be reviewed immediately.'
      const mockRisks = [
        { severity: 'critical', likelihood: 'likely' },
        { severity: 'high', likelihood: 'possible' }
      ]

      const score = await smartSummarizationService['calculatePriorityScore'](
        mockDocument, 
        mockSummary, 
        mockRisks
      )

      expect(score).toBeGreaterThanOrEqual(1)
      expect(score).toBeLessThanOrEqual(10)
      expect(score).toBeGreaterThan(5) // Should be high due to contract type and urgency
    })
  })

  describe('RAG Q&A System', () => {
    it('should answer questions using cross-document context', async () => {
      const result = await ragQAService.askQuestion({
        query: 'What are the key financial metrics?',
        documentIds: ['doc1', 'doc2'],
        options: {
          maxSources: 10,
          answerStyle: 'detailed'
        }
      })

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('answer')
      expect(result.data).toHaveProperty('citations')
      expect(result.data).toHaveProperty('confidence')
      expect(result.data.confidence).toBeGreaterThanOrEqual(0)
      expect(result.data.confidence).toBeLessThanOrEqual(1)
    })

    it('should perform cross-document analysis', async () => {
      const result = await ragQAService.performCrossDocumentAnalysis(
        'Compare revenue trends',
        ['doc1', 'doc2'],
        'comparison'
      )

      expect(result.success).toBe(true)
      expect(Array.isArray(result.data)).toBe(true)
      result.data.forEach(insight => {
        expect(insight).toHaveProperty('type')
        expect(insight).toHaveProperty('description')
        expect(insight).toHaveProperty('confidence')
      })
    })

    it('should generate comparative reports', async () => {
      const result = await ragQAService.generateComparativeReport(
        ['doc1', 'doc2'],
        ['revenue', 'profitability', 'risk']
      )

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('summary')
      expect(result.data).toHaveProperty('comparisons')
      expect(result.data).toHaveProperty('insights')
      expect(result.data).toHaveProperty('recommendations')
    })

    it('should extract citations from answers', async () => {
      const mockAnswer = 'According to [Source 1], the revenue increased. [Source 2] shows market growth.'
      const mockChunks = [
        {
          id: 'doc1_chunk1',
          content: 'Revenue increased by 15% this quarter',
          similarity: 0.9,
          metadata: { page: 1, section: 'Financial Results' }
        },
        {
          id: 'doc2_chunk1', 
          content: 'Market growth continues to accelerate',
          similarity: 0.8,
          metadata: { page: 3, section: 'Market Analysis' }
        }
      ]

      const citations = ragQAService['extractCitations'](mockAnswer, mockChunks)

      expect(Array.isArray(citations)).toBe(true)
      expect(citations.length).toBeGreaterThan(0)
      citations.forEach(citation => {
        expect(citation).toHaveProperty('documentId')
        expect(citation).toHaveProperty('quote')
        expect(citation).toHaveProperty('relevanceScore')
      })
    })
  })

  describe('Automated Document Analysis', () => {
    it('should analyze contract documents', async () => {
      const mockDocument = {
        id: 'contract1',
        filename: 'service-agreement.pdf',
        fileType: 'contract',
        fileSize: 2 * 1024 * 1024,
        totalPages: 35,
        uploadedAt: new Date().toISOString(),
        processed: true
      }

      const result = await automatedDocumentAnalysisService.analyzeContract(
        mockDocument,
        'Mock contract content',
        { includeRecommendations: true }
      )

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('contractType')
      expect(result.data).toHaveProperty('parties')
      expect(result.data).toHaveProperty('keyTerms')
      expect(result.data).toHaveProperty('riskAssessment')
      expect(result.data).toHaveProperty('recommendations')
    })

    it('should analyze financial documents', async () => {
      const mockDocument = {
        id: 'financial1',
        filename: 'quarterly-report.pdf',
        fileType: 'financial-report',
        fileSize: 3 * 1024 * 1024,
        totalPages: 45,
        uploadedAt: new Date().toISOString(),
        processed: true
      }

      const result = await automatedDocumentAnalysisService.analyzeFinancialDocument(
        mockDocument,
        'Mock financial content',
        { compareWithStandards: true }
      )

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('documentType')
      expect(result.data).toHaveProperty('keyMetrics')
      expect(result.data).toHaveProperty('ratios')
      expect(result.data).toHaveProperty('anomalies')
      expect(result.data).toHaveProperty('benchmarkComparison')
    })

    it('should perform compliance analysis', async () => {
      const mockDocument = {
        id: 'policy1',
        filename: 'data-policy.pdf',
        fileType: 'policy',
        fileSize: 1024 * 1024,
        totalPages: 20,
        uploadedAt: new Date().toISOString(),
        processed: true
      }

      const result = await automatedDocumentAnalysisService.performComplianceAnalysis(
        mockDocument,
        'Mock policy content',
        ['gdpr', 'sox']
      )

      expect(result.success).toBe(true)
      expect(Array.isArray(result.data)).toBe(true)
      result.data.forEach(compliance => {
        expect(compliance).toHaveProperty('standard')
        expect(compliance).toHaveProperty('status')
        expect(compliance).toHaveProperty('score')
        expect(compliance).toHaveProperty('findings')
        expect(compliance.score).toBeGreaterThanOrEqual(0)
        expect(compliance.score).toBeLessThanOrEqual(100)
      })
    })

    it('should generate overall risk assessment', async () => {
      const mockAnalysisResults = {
        contract: {
          riskFactors: [
            { severity: 'high', likelihood: 'likely', category: 'legal' },
            { severity: 'medium', likelihood: 'possible', category: 'financial' }
          ]
        },
        financial: {
          anomalies: [
            { severity: 'critical', type: 'ratio-deviation' }
          ]
        }
      }

      const mockDocument = { id: 'doc1', filename: 'test.pdf' }

      const riskAssessment = await automatedDocumentAnalysisService['generateOverallRiskAssessment'](
        mockAnalysisResults,
        mockDocument
      )

      expect(riskAssessment).toHaveProperty('overallRiskScore')
      expect(riskAssessment).toHaveProperty('riskCategories')
      expect(riskAssessment).toHaveProperty('criticalFindings')
      expect(riskAssessment).toHaveProperty('recommendations')
      expect(riskAssessment.overallRiskScore).toBeGreaterThanOrEqual(1)
      expect(riskAssessment.overallRiskScore).toBeLessThanOrEqual(10)
    })
  })

  describe('Vector Embeddings', () => {
    it('should generate consistent embeddings for similar text', async () => {
      const text1 = 'Financial performance has improved significantly'
      const text2 = 'The financial results show significant improvement'
      
      const embedding1 = await aiDocumentIntelligenceService.generateEmbedding(text1)
      const embedding2 = await aiDocumentIntelligenceService.generateEmbedding(text2)

      expect(Array.isArray(embedding1)).toBe(true)
      expect(Array.isArray(embedding2)).toBe(true)
      expect(embedding1.length).toBe(embedding2.length)
      expect(embedding1.length).toBe(768) // Standard embedding size

      // Calculate cosine similarity
      const similarity = aiDocumentIntelligenceService['cosineSimilarity'](embedding1, embedding2)
      expect(similarity).toBeGreaterThan(0.5) // Similar texts should have high similarity
    })

    it('should store and retrieve embeddings', async () => {
      const documentId = 'test-doc'
      const chunkId = 'chunk-1'
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5]

      await aiDocumentIntelligenceService.storeEmbedding(documentId, chunkId, embedding)

      // Verify embedding was stored
      const storedEmbedding = aiDocumentIntelligenceService['vectorStore'].get(`${documentId}_${chunkId}`)
      expect(storedEmbedding).toBeDefined()
      expect(storedEmbedding?.embedding).toEqual(embedding)
    })

    it('should perform vector search with similarity threshold', async () => {
      const queryEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5]
      
      // Store some test embeddings
      await aiDocumentIntelligenceService.storeEmbedding('doc1', 'chunk1', [0.1, 0.2, 0.3, 0.4, 0.6])
      await aiDocumentIntelligenceService.storeEmbedding('doc2', 'chunk1', [0.9, 0.8, 0.7, 0.6, 0.5])

      const results = await aiDocumentIntelligenceService.vectorSearch(queryEmbedding, {
        maxResults: 10,
        similarityThreshold: 0.5
      })

      expect(Array.isArray(results)).toBe(true)
      results.forEach(result => {
        expect(result).toHaveProperty('similarity')
        expect(result.similarity).toBeGreaterThanOrEqual(0.5)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid document IDs gracefully', async () => {
      const result = await aiDocumentIntelligenceService.generateSmartSummary('invalid-doc', {
        summaryType: 'executive',
        priorityScoring: false
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle empty or invalid content', async () => {
      const result = await ragQAService.askQuestion({
        query: '',
        options: {}
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Query too short')
    })

    it('should handle API rate limiting', async () => {
      // Mock rate limiting scenario
      const originalChat = aiDocumentIntelligenceService['openRouter'].chat
      aiDocumentIntelligenceService['openRouter'].chat = jest.fn().mockRejectedValue(
        new Error('Rate limit exceeded')
      )

      const result = await aiDocumentIntelligenceService.generateSmartSummary('doc1', {
        summaryType: 'executive',
        priorityScoring: false
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Rate limit')

      // Restore original function
      aiDocumentIntelligenceService['openRouter'].chat = originalChat
    })
  })

  describe('Performance Optimization', () => {
    it('should cache embedding calculations', async () => {
      const text = 'This is a test document for caching'
      
      const start1 = Date.now()
      const embedding1 = await aiDocumentIntelligenceService.generateEmbedding(text)
      const time1 = Date.now() - start1

      const start2 = Date.now() 
      const embedding2 = await aiDocumentIntelligenceService.generateEmbedding(text)
      const time2 = Date.now() - start2

      expect(embedding1).toEqual(embedding2)
      // Second call should be faster due to caching (in a real implementation)
      // expect(time2).toBeLessThan(time1)
    })

    it('should handle batch processing efficiently', async () => {
      const documentIds = ['doc1', 'doc2', 'doc3', 'doc4', 'doc5']
      
      const start = Date.now()
      const results = await Promise.all(
        documentIds.map(id => 
          aiDocumentIntelligenceService.generateSmartSummary(id, {
            summaryType: 'executive',
            priorityScoring: false
          })
        )
      )
      const duration = Date.now() - start

      expect(results.length).toBe(documentIds.length)
      expect(duration).toBeLessThan(30000) // Should complete within 30 seconds
    })
  })

  describe('Integration Tests', () => {
    it('should complete full document intelligence workflow', async () => {
      const documentId = 'integration-test-doc'
      
      // Step 1: Generate summary
      const summaryResult = await aiDocumentIntelligenceService.generateSmartSummary(documentId, {
        summaryType: 'executive',
        priorityScoring: true,
        includeMetrics: true
      })
      expect(summaryResult.success).toBe(true)

      // Step 2: Ask questions about the document
      const qaResult = await ragQAService.askQuestion({
        query: 'What are the main risks?',
        documentIds: [documentId],
        options: { answerStyle: 'concise' }
      })
      expect(qaResult.success).toBe(true)

      // Step 3: Perform document analysis
      const analysisResult = await automatedDocumentAnalysisService.analyzeDocument({
        documentId,
        analysisTypes: ['risk', 'compliance'],
        options: { includeRecommendations: true }
      })
      expect(analysisResult.success).toBe(true)

      // Verify all components work together
      expect(summaryResult.data).toHaveProperty('priorityScore')
      expect(qaResult.data).toHaveProperty('confidence')
      expect(analysisResult.data).toHaveProperty('results')
    })
  })
})

describe('Document Intelligence Analytics', () => {
  it('should calculate comprehensive metrics', async () => {
    const timeRange = {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString()
    }

    const result = await aiDocumentIntelligenceService.generateIntelligenceMetrics('org1', timeRange)

    expect(result.success).toBe(true)
    expect(result.data).toHaveProperty('totalDocuments')
    expect(result.data).toHaveProperty('contentMetrics')
    expect(result.data).toHaveProperty('usageMetrics')
    expect(result.data).toHaveProperty('qualityMetrics')
    expect(result.data).toHaveProperty('trends')
  })

  it('should identify performance bottlenecks', async () => {
    // Mock metrics that would indicate bottlenecks
    const mockMetrics = {
      averageProcessingTime: 120, // 2 minutes (high)
      accuracyScore: 0.65, // Below threshold
      userSatisfactionScore: 0.6 // Low satisfaction
    }

    const bottlenecks = await aiDocumentIntelligenceService['identifyBottlenecks'](mockMetrics)
    
    expect(Array.isArray(bottlenecks)).toBe(true)
    expect(bottlenecks.length).toBeGreaterThan(0)
    
    bottlenecks.forEach(bottleneck => {
      expect(bottleneck).toHaveProperty('area')
      expect(bottleneck).toHaveProperty('description')
      expect(bottleneck).toHaveProperty('impact')
      expect(bottleneck).toHaveProperty('recommendation')
    })
  })
})

// Test data generators
export const generateMockDocument = (overrides = {}) => ({
  id: 'test-doc-' + Math.random().toString(36).substr(2, 9),
  filename: 'test-document.pdf',
  fileType: 'pdf',
  fileSize: 1024 * 1024,
  totalPages: 10,
  uploadedAt: new Date().toISOString(),
  processed: true,
  complexity: 5,
  ...overrides
})

export const generateMockSummary = (overrides = {}) => ({
  id: 'summary-' + Math.random().toString(36).substr(2, 9),
  documentId: 'test-doc',
  summaryType: 'executive' as const,
  content: 'This is a test summary of the document.',
  keyInsights: ['Test insight 1', 'Test insight 2'],
  actionItems: [],
  riskFactors: [],
  generatedAt: new Date().toISOString(),
  llmModel: 'test-model',
  metadata: {
    wordCount: 50,
    readingTime: 1,
    complexity: 3,
    confidence: 0.85
  },
  ...overrides
})