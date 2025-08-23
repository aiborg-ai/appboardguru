/**
 * @jest-environment jsdom
 */
import { FYIService } from '@/lib/services/fyi.service'
import { FYIRepository } from '@/lib/repositories/fyi.repository'
import { testDb } from '../../../tests/utils/test-database'
import { FYIFactory, FYIContextFactory, FYIPreferencesFactory, FYIFiltersFactory } from '../../factories/fyi.factory'
import { testAssertions, mockServices, performanceHelpers, createTestScenario } from '../../utils/test-helpers'
import type { FYIContext, FYIFilters } from '@/types/fyi'
import type { UserId, OrganizationId } from '@/types/branded'

// Mock repository and external services following CLAUDE.md patterns
jest.mock('@/lib/repositories/fyi.repository')

// Mock external API services
const mockNewsAPI = {
  fetchLatestNews: jest.fn(),
  searchNews: jest.fn(),
}

const mockFinancialAPI = {
  fetchMarketData: jest.fn(),
  getCompanyInsights: jest.fn(),
  getRegulatoryUpdates: jest.fn(),
}

const mockAIService = {
  analyzeRelevance: jest.fn(),
  extractEntities: jest.fn(),
  generateSummary: jest.fn(),
}

// Mock external services
jest.mock('@/lib/services/external/news-api', () => mockNewsAPI)
jest.mock('@/lib/services/external/financial-api', () => mockFinancialAPI)
jest.mock('@/lib/services/ai.service', () => mockAIService)

describe('FYIService - Following CLAUDE.md Service Layer Patterns', () => {
  let fyiService: FYIService
  let mockFYIRepository: jest.Mocked<FYIRepository>
  let testUser: any
  let testOrganization: any
  let testUserId: UserId
  let testOrganizationId: OrganizationId

  beforeAll(async () => {
    await testDb.setup()
  })

  afterAll(async () => {
    await testDb.cleanup()
  })

  beforeEach(async () => {
    // Create comprehensive mock repository following established patterns
    mockFYIRepository = {
      findCachedInsights: jest.fn(),
      cacheInsight: jest.fn(),
      findByRelevance: jest.fn(),
      findByType: jest.fn(),
      searchInsights: jest.fn(),
      cleanExpiredCache: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    } as any

    fyiService = new FYIService(mockFYIRepository)

    // Create test data following established patterns
    const scenario = await createTestScenario('basic')
    testUser = scenario.users[0]
    testOrganization = scenario.organizations[0]
    testUserId = testUser.id as UserId
    testOrganizationId = testOrganization.id as OrganizationId

    // Reset all mocks
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Service Initialization and Dependencies - CLAUDE.md Architecture', () => {
    it('should initialize service with proper dependency injection', () => {
      expect(fyiService).toBeInstanceOf(FYIService)
      expect(fyiService['repository']).toBe(mockFYIRepository)
    })

    it('should have required methods following service layer patterns', () => {
      expect(fyiService.fetchInsights).toBeDefined()
      expect(fyiService.getCachedInsights).toBeDefined()
      expect(fyiService.refreshInsights).toBeDefined()
      expect(fyiService.searchInsights).toBeDefined()
      expect(fyiService.getUserPreferences).toBeDefined()
      expect(fyiService.updateUserPreferences).toBeDefined()
    })
  })

  describe('fetchInsights - Core Business Logic with Result Pattern', () => {
    it('should fetch and cache insights with context analysis', async () => {
      const context = FYIContextFactory.buildOrganizationContext({
        entities: ['technology', 'financial-services'],
        primaryEntity: 'technology',
        confidence: 0.88,
      })

      const mockNewsInsights = [
        FYIFactory.buildNewsInsight({ relevance_score: 0.92 }),
        FYIFactory.buildRegulatoryInsight({ relevance_score: 0.85 }),
      ]

      const mockFinancialInsights = [
        FYIFactory.buildFinancialInsight({ relevance_score: 0.78 }),
      ]

      // Mock external API responses
      mockNewsAPI.searchNews.mockResolvedValue({
        success: true,
        data: mockNewsInsights.slice(0, 1) // Only news insight
      })

      mockFinancialAPI.fetchMarketData.mockResolvedValue({
        success: true,
        data: mockFinancialInsights
      })

      mockAIService.analyzeRelevance.mockResolvedValue({
        success: true,
        data: { relevanceScore: 0.85, confidence: 0.92 }
      })

      // Mock repository caching
      mockFYIRepository.cacheInsight
        .mockResolvedValueOnce({ success: true, data: mockNewsInsights[0] })
        .mockResolvedValueOnce({ success: true, data: mockFinancialInsights[0] })

      const result = await fyiService.fetchInsights(
        testOrganizationId,
        testUserId,
        context
      )

      expect(mockNewsAPI.searchNews).toHaveBeenCalledWith(
        context.entities,
        expect.objectContaining({
          relevanceThreshold: 0.70,
          maxResults: 10,
        })
      )
      expect(mockFinancialAPI.fetchMarketData).toHaveBeenCalledWith(
        context.entities,
        expect.any(Object)
      )
      expect(mockFYIRepository.cacheInsight).toHaveBeenCalledTimes(2)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.insights).toHaveLength(2)
        expect(result.data.context).toEqual(context)
        expect(result.data.fetchedAt).toBeDefined()
      }
    })

    it('should handle context detection for document-specific insights', async () => {
      const documentContext = FYIContextFactory.buildDocumentContext({
        entities: ['quarterly-report', 'financial-performance'],
        contextType: 'document',
        confidence: 0.95,
      })

      mockFinancialAPI.getCompanyInsights.mockResolvedValue({
        success: true,
        data: [FYIFactory.buildFinancialInsight()]
      })

      mockAIService.extractEntities.mockResolvedValue({
        success: true,
        data: { entities: ['earnings', 'revenue', 'profit-margin'] }
      })

      mockFYIRepository.cacheInsight.mockResolvedValue({ 
        success: true, 
        data: FYIFactory.buildFinancialInsight() 
      })

      const result = await fyiService.fetchInsights(
        testOrganizationId,
        testUserId,
        documentContext
      )

      expect(mockAIService.extractEntities).toHaveBeenCalledWith(
        documentContext.entities
      )
      expect(mockFinancialAPI.getCompanyInsights).toHaveBeenCalled()
      expect(result.success).toBe(true)
    })

    it('should filter insights based on user preferences', async () => {
      const userPreferences = FYIPreferencesFactory.buildConservativePreferences(testUserId)
      const context = FYIContextFactory.buildContext()

      const lowRelevanceInsight = FYIFactory.buildLowRelevanceInsight() // 0.25 relevance
      const highRelevanceInsight = FYIFactory.buildFinancialInsight({ relevance_score: 0.90 })

      mockNewsAPI.searchNews.mockResolvedValue({
        success: true,
        data: [lowRelevanceInsight, highRelevanceInsight]
      })

      mockAIService.analyzeRelevance
        .mockResolvedValueOnce({ success: true, data: { relevanceScore: 0.25 } })
        .mockResolvedValueOnce({ success: true, data: { relevanceScore: 0.90 } })

      // Mock user preferences fetching
      jest.spyOn(fyiService, 'getUserPreferences').mockResolvedValue({
        success: true,
        data: userPreferences
      })

      mockFYIRepository.cacheInsight.mockResolvedValue({
        success: true,
        data: highRelevanceInsight
      })

      const result = await fyiService.fetchInsights(
        testOrganizationId,
        testUserId,
        context
      )

      expect(result.success).toBe(true)
      if (result.success) {
        // Should only include high-relevance insight (0.90 > 0.85 threshold)
        expect(result.data.insights).toHaveLength(1)
        expect(result.data.insights[0].relevance_score).toBe(0.90)
      }
    })

    it('should handle external API failures gracefully with fallback', async () => {
      const context = FYIContextFactory.buildContext()

      // Mock API failures
      mockNewsAPI.searchNews.mockResolvedValue({
        success: false,
        error: new Error('News API rate limit exceeded')
      })

      mockFinancialAPI.fetchMarketData.mockResolvedValue({
        success: false,
        error: new Error('Financial API service unavailable')
      })

      // Mock cached insights as fallback
      const cachedInsights = FYIFactory.buildMany(3)
      mockFYIRepository.findCachedInsights.mockResolvedValue({
        success: true,
        data: cachedInsights
      })

      const result = await fyiService.fetchInsights(
        testOrganizationId,
        testUserId,
        context
      )

      expect(result.success).toBe(true) // Should succeed with cached data
      if (result.success) {
        expect(result.data.insights).toEqual(cachedInsights)
        expect(result.data.warnings).toContain('External APIs temporarily unavailable')
      }
    })

    it('should respect rate limiting for external APIs', async () => {
      const context = FYIContextFactory.buildContext()

      // Mock rate limit response
      mockNewsAPI.searchNews.mockResolvedValue({
        success: false,
        error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' }
      })

      const result = await fyiService.fetchInsights(
        testOrganizationId,
        testUserId,
        context
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('RATE_LIMIT_EXCEEDED')
        expect(result.error.message).toContain('Too many requests')
      }
    })
  })

  describe('getCachedInsights - Performance Optimized Retrieval', () => {
    it('should retrieve cached insights with filtering', async () => {
      const cachedInsights = FYIFactory.buildWithRelevanceScores()
      const filters = FYIFiltersFactory.buildHighRelevanceFilters()

      mockFYIRepository.findByRelevance.mockResolvedValue({
        success: true,
        data: cachedInsights.filter(i => i.relevance_score! >= 0.90)
      })

      const result = await fyiService.getCachedInsights(
        testOrganizationId,
        testUserId,
        filters
      )

      expect(mockFYIRepository.findByRelevance).toHaveBeenCalledWith(
        testOrganizationId,
        filters.relevanceThreshold,
        undefined,
        20 // default limit
      )
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.every(insight => insight.relevance_score! >= 0.90)).toBe(true)
      }
    })

    it('should handle type-specific filtering', async () => {
      const regulatoryInsights = [
        FYIFactory.buildRegulatoryInsight(),
        FYIFactory.buildRegulatoryInsight(),
      ]
      
      const filters = FYIFiltersFactory.buildFilters({ type: 'regulatory' })

      mockFYIRepository.findByType.mockResolvedValue({
        success: true,
        data: regulatoryInsights
      })

      const result = await fyiService.getCachedInsights(
        testOrganizationId,
        testUserId,
        filters
      )

      expect(mockFYIRepository.findByType).toHaveBeenCalledWith(
        testOrganizationId,
        'regulatory',
        20
      )
      expect(result.success).toBe(true)
    })

    it('should handle date range filtering', async () => {
      const fromDate = '2024-01-01T00:00:00Z'
      const toDate = '2024-01-31T23:59:59Z'
      const dateFilters = FYIFiltersFactory.buildDateRangeFilters(fromDate, toDate)

      const dateFilteredInsights = FYIFactory.buildMany(5)

      mockFYIRepository.findCachedInsights.mockResolvedValue({
        success: true,
        data: dateFilteredInsights
      })

      const result = await fyiService.getCachedInsights(
        testOrganizationId,
        testUserId,
        dateFilters
      )

      expect(mockFYIRepository.findCachedInsights).toHaveBeenCalledWith(
        testOrganizationId,
        undefined,
        20
      )
      expect(result.success).toBe(true)
    })

    it('should handle pagination correctly', async () => {
      const paginatedInsights = FYIFactory.buildMany(10)

      mockFYIRepository.findCachedInsights.mockResolvedValue({
        success: true,
        data: paginatedInsights
      })

      const result = await fyiService.getCachedInsights(
        testOrganizationId,
        testUserId,
        undefined,
        { limit: 10, offset: 20 }
      )

      expect(mockFYIRepository.findCachedInsights).toHaveBeenCalledWith(
        testOrganizationId,
        undefined,
        10
      )
      expect(result.success).toBe(true)
    })
  })

  describe('refreshInsights - Cache Management', () => {
    it('should refresh insights and clean expired cache', async () => {
      const context = FYIContextFactory.buildContext()
      const freshInsights = FYIFactory.buildMany(5)

      // Mock cache cleanup
      mockFYIRepository.cleanExpiredCache.mockResolvedValue({
        success: true,
        data: { deletedCount: 10 }
      })

      // Mock fresh insights fetch
      mockNewsAPI.searchNews.mockResolvedValue({
        success: true,
        data: freshInsights
      })

      mockFYIRepository.cacheInsight.mockResolvedValue({
        success: true,
        data: freshInsights[0]
      })

      const result = await fyiService.refreshInsights(
        testOrganizationId,
        testUserId,
        context
      )

      expect(mockFYIRepository.cleanExpiredCache).toHaveBeenCalled()
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.cleanedCount).toBe(10)
        expect(result.data.newInsights).toHaveLength(5)
      }
    })

    it('should handle cache cleanup failures gracefully', async () => {
      const context = FYIContextFactory.buildContext()

      mockFYIRepository.cleanExpiredCache.mockResolvedValue({
        success: false,
        error: new Error('Cache cleanup failed')
      })

      // Should continue with refresh despite cleanup failure
      mockNewsAPI.searchNews.mockResolvedValue({
        success: true,
        data: [FYIFactory.buildNewsInsight()]
      })

      mockFYIRepository.cacheInsight.mockResolvedValue({
        success: true,
        data: FYIFactory.buildNewsInsight()
      })

      const result = await fyiService.refreshInsights(
        testOrganizationId,
        testUserId,
        context
      )

      expect(result.success).toBe(true) // Should succeed despite cleanup failure
      if (result.success) {
        expect(result.data.warnings).toContain('Cache cleanup failed')
      }
    })
  })

  describe('searchInsights - Full-text Search with Intelligence', () => {
    it('should perform intelligent search with context awareness', async () => {
      const searchQuery = 'ESG sustainability regulations'
      const searchResults = [
        FYIFactory.buildRegulatoryInsight({
          title: 'New ESG Reporting Requirements',
          summary: 'Sustainability reporting regulations for public companies',
        }),
        FYIFactory.buildCompetitiveInsight({
          title: 'Competitor ESG Initiative',
          summary: 'Major competitor announces sustainability program',
        }),
      ]

      // Mock AI-enhanced entity extraction
      mockAIService.extractEntities.mockResolvedValue({
        success: true,
        data: { entities: ['ESG', 'sustainability', 'regulations'] }
      })

      mockFYIRepository.searchInsights.mockResolvedValue({
        success: true,
        data: searchResults
      })

      const result = await fyiService.searchInsights(
        testOrganizationId,
        testUserId,
        searchQuery
      )

      expect(mockAIService.extractEntities).toHaveBeenCalledWith([searchQuery])
      expect(mockFYIRepository.searchInsights).toHaveBeenCalledWith(
        testOrganizationId,
        searchQuery,
        expect.objectContaining({
          limit: 20,
        })
      )
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.results).toEqual(searchResults)
        expect(result.data.query).toBe(searchQuery)
        expect(result.data.enhancedEntities).toEqual(['ESG', 'sustainability', 'regulations'])
      }
    })

    it('should handle search with advanced filtering', async () => {
      const searchQuery = 'financial market trends'
      const filters = FYIFiltersFactory.buildFilters({
        type: 'financial',
        relevanceThreshold: 0.80,
      })

      mockFYIRepository.searchInsights.mockResolvedValue({
        success: true,
        data: [FYIFactory.buildFinancialInsight()]
      })

      const result = await fyiService.searchInsights(
        testOrganizationId,
        testUserId,
        searchQuery,
        filters
      )

      expect(mockFYIRepository.searchInsights).toHaveBeenCalledWith(
        testOrganizationId,
        searchQuery,
        expect.objectContaining({
          type: 'financial',
          relevanceThreshold: 0.80,
        })
      )
      expect(result.success).toBe(true)
    })

    it('should handle empty search queries gracefully', async () => {
      const result = await fyiService.searchInsights(
        testOrganizationId,
        testUserId,
        ''
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Search query cannot be empty')
      }
    })
  })

  describe('User Preferences Management - Personalization', () => {
    it('should get user preferences with defaults', async () => {
      const savedPreferences = FYIPreferencesFactory.buildPreferences(testUserId)

      // Mock repository call (would typically be user preferences repository)
      mockFYIRepository.findUserPreferences = jest.fn().mockResolvedValue({
        success: true,
        data: savedPreferences
      })

      const result = await fyiService.getUserPreferences(testUserId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.userId).toBe(testUserId)
        expect(result.data.relevance_threshold).toBe(0.70)
        expect(result.data.enabled_sources).toContain('Bloomberg API')
      }
    })

    it('should return default preferences for new users', async () => {
      mockFYIRepository.findUserPreferences = jest.fn().mockResolvedValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User preferences not found' }
      })

      const result = await fyiService.getUserPreferences('new-user-id' as UserId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.relevance_threshold).toBe(0.70) // Default threshold
        expect(result.data.auto_refresh_interval).toBe(15) // Default refresh interval
      }
    })

    it('should update user preferences with validation', async () => {
      const updatedPreferences = FYIPreferencesFactory.buildAggressivePreferences(testUserId)

      mockFYIRepository.updateUserPreferences = jest.fn().mockResolvedValue({
        success: true,
        data: updatedPreferences
      })

      const result = await fyiService.updateUserPreferences(testUserId, {
        relevance_threshold: 0.50,
        auto_refresh_interval: 5,
        notification_preferences: {
          high_priority: true,
          medium_priority: true,
          email_digest: true,
          in_app_notifications: true,
        }
      })

      expect(mockFYIRepository.updateUserPreferences).toHaveBeenCalledWith(
        testUserId,
        expect.objectContaining({
          relevance_threshold: 0.50,
          auto_refresh_interval: 5,
        })
      )
      expect(result.success).toBe(true)
    })

    it('should validate preference values before updating', async () => {
      const invalidPreferences = {
        relevance_threshold: 1.5, // Invalid: > 1.0
        auto_refresh_interval: -5, // Invalid: negative
      }

      const result = await fyiService.updateUserPreferences(testUserId, invalidPreferences)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Invalid preference values')
      }
    })
  })

  describe('Performance Tests - CLAUDE.md Performance Requirements', () => {
    it('should efficiently fetch insights for large organizations', async () => {
      const context = FYIContextFactory.buildContext({
        entities: Array.from({ length: 50 }, (_, i) => `entity-${i}`)
      })

      const largeInsightSet = FYIFactory.buildLargeDataset(100)

      mockNewsAPI.searchNews.mockResolvedValue({
        success: true,
        data: largeInsightSet.slice(0, 50)
      })

      mockFinancialAPI.fetchMarketData.mockResolvedValue({
        success: true,
        data: largeInsightSet.slice(50, 100)
      })

      mockFYIRepository.cacheInsight.mockResolvedValue({
        success: true,
        data: largeInsightSet[0]
      })

      const { result, duration } = await performanceHelpers.measureExecutionTime(
        () => fyiService.fetchInsights(testOrganizationId, testUserId, context)
      )

      expect(duration).toBeLessThan(5000) // Should complete in under 5 seconds
      expect(result.success).toBe(true)
    })

    it('should efficiently handle concurrent insight requests', async () => {
      const context = FYIContextFactory.buildContext()
      const concurrentRequests = 10

      mockNewsAPI.searchNews.mockResolvedValue({
        success: true,
        data: [FYIFactory.buildNewsInsight()]
      })

      mockFYIRepository.cacheInsight.mockResolvedValue({
        success: true,
        data: FYIFactory.buildNewsInsight()
      })

      const { result, duration } = await performanceHelpers.measureExecutionTime(
        () => Promise.all(
          Array.from({ length: concurrentRequests }, () => 
            fyiService.fetchInsights(testOrganizationId, testUserId, context)
          )
        )
      )

      expect(duration).toBeLessThan(3000) // Should handle concurrency efficiently
      expect(result).toHaveLength(concurrentRequests)
      expect(result.every(r => r.success)).toBe(true)
    })

    it('should efficiently search through large insight cache', async () => {
      const searchResults = FYIFactory.buildMany(100)

      mockFYIRepository.searchInsights.mockResolvedValue({
        success: true,
        data: searchResults
      })

      const { result, duration } = await performanceHelpers.measureExecutionTime(
        () => fyiService.searchInsights(testOrganizationId, testUserId, 'technology trends')
      )

      expect(duration).toBeLessThan(1000) // Should complete search in under 1 second
      expect(result.success).toBe(true)
    })
  })

  describe('Error Handling and Edge Cases - CLAUDE.md Comprehensive Coverage', () => {
    it('should handle malformed external API responses', async () => {
      const context = FYIContextFactory.buildContext()

      mockNewsAPI.searchNews.mockResolvedValue({
        success: true,
        data: [
          { // Malformed insight - missing required fields
            title: 'Valid Title',
            // missing summary, type, source, etc.
          }
        ]
      })

      const result = await fyiService.fetchInsights(
        testOrganizationId,
        testUserId,
        context
      )

      expect(result.success).toBe(true) // Should handle gracefully
      if (result.success) {
        expect(result.data.insights).toHaveLength(0) // Malformed insights filtered out
        expect(result.data.warnings).toContain('Malformed insights filtered')
      }
    })

    it('should handle network timeouts gracefully', async () => {
      const context = FYIContextFactory.buildContext()

      mockNewsAPI.searchNews.mockRejectedValue(new Error('Network timeout'))

      // Should fallback to cached insights
      mockFYIRepository.findCachedInsights.mockResolvedValue({
        success: true,
        data: FYIFactory.buildMany(3)
      })

      const result = await fyiService.fetchInsights(
        testOrganizationId,
        testUserId,
        context
      )

      expect(result.success).toBe(true) // Should succeed with cached data
    })

    it('should validate organization and user IDs', async () => {
      const invalidOrgId = 'invalid-org' as OrganizationId
      const invalidUserId = 'invalid-user' as UserId
      const context = FYIContextFactory.buildContext()

      const result = await fyiService.fetchInsights(
        invalidOrgId,
        invalidUserId,
        context
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Invalid organization or user ID')
      }
    })

    it('should handle context with extremely low confidence', async () => {
      const lowConfidenceContext = FYIContextFactory.buildContext({ confidence: 0.05 })

      const result = await fyiService.fetchInsights(
        testOrganizationId,
        testUserId,
        lowConfidenceContext
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Context confidence too low')
      }
    })

    it('should handle repository transaction failures', async () => {
      const context = FYIContextFactory.buildContext()

      mockNewsAPI.searchNews.mockResolvedValue({
        success: true,
        data: [FYIFactory.buildNewsInsight()]
      })

      mockFYIRepository.cacheInsight.mockResolvedValue({
        success: false,
        error: new Error('Database transaction failed')
      })

      const result = await fyiService.fetchInsights(
        testOrganizationId,
        testUserId,
        context
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Database transaction failed')
      }
    })

    it('should handle circular dependency in entity extraction', async () => {
      const searchQuery = 'complex query with circular references'

      mockAIService.extractEntities.mockRejectedValue(
        new Error('Circular dependency in entity graph')
      )

      // Should fallback to direct search
      mockFYIRepository.searchInsights.mockResolvedValue({
        success: true,
        data: [FYIFactory.buildCompetitiveInsight()]
      })

      const result = await fyiService.searchInsights(
        testOrganizationId,
        testUserId,
        searchQuery
      )

      expect(result.success).toBe(true) // Should succeed with fallback
      if (result.success) {
        expect(result.data.warnings).toContain('AI entity extraction failed')
      }
    })
  })

  describe('Business Logic Validation and Data Integrity', () => {
    it('should validate insight relevance scores before caching', async () => {
      const context = FYIContextFactory.buildContext()
      const invalidInsight = FYIFactory.buildInsightCache({ 
        relevance_score: 2.5 // Invalid: > 1.0
      })

      mockNewsAPI.searchNews.mockResolvedValue({
        success: true,
        data: [invalidInsight]
      })

      const result = await fyiService.fetchInsights(
        testOrganizationId,
        testUserId,
        context
      )

      // Service should normalize or filter invalid scores
      expect(result.success).toBe(true)
      if (result.success && result.data.insights.length > 0) {
        expect(result.data.insights[0].relevance_score).toBeLessThanOrEqual(1.0)
      }
    })

    it('should ensure proper insight categorization', async () => {
      const insights = [
        FYIFactory.buildNewsInsight(),
        FYIFactory.buildFinancialInsight(),
        FYIFactory.buildRegulatoryInsight(),
        FYIFactory.buildCompetitiveInsight(),
      ]

      const allowedTypes = ['news', 'financial', 'regulatory', 'competitive']

      insights.forEach(insight => {
        expect(allowedTypes).toContain(insight.type)
        expect(testAssertions.hasRequiredFields(insight, [
          'insight_id', 'title', 'type', 'source', 'url'
        ])).toBe(true)
      })
    })

    it('should validate insight expiration times', async () => {
      const insight = FYIFactory.buildInsightCache()
      const expirationDate = new Date(insight.expires_at)
      const creationDate = new Date(insight.published_at)

      expect(expirationDate.getTime()).toBeGreaterThan(creationDate.getTime())
      expect(testAssertions.isRecentDate(insight.published_at, 86400000)).toBe(true) // Within 24 hours
    })

    it('should maintain insight source attribution', async () => {
      const insights = FYIFactory.buildMany(10)

      insights.forEach(insight => {
        expect(insight.source).toBeTruthy()
        expect(insight.url).toMatch(/^https?:\/\//)
        expect(insight.insight_id).toBeTruthy()
      })
    })
  })
})