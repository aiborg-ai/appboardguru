/**
 * @jest-environment jsdom
 */
import { FYIRepository } from '@/lib/repositories/fyi.repository'
import { createSupabaseAdminClient } from '@/config/database.config'
import { testDb } from '../../../tests/utils/test-database'
import { FYIFactory, FYIContextFactory, FYIFiltersFactory } from '../../factories/fyi.factory'
import { testAssertions, dbHelpers, performanceHelpers } from '../../utils/test-helpers'
import type { FYIContext } from '@/types/fyi'

// Mock Supabase client
jest.mock('@/config/database.config', () => ({
  createSupabaseAdminClient: jest.fn(),
}))

describe('FYIRepository', () => {
  let fyiRepository: FYIRepository
  let mockSupabase: any
  let testOrganization: any
  let testUser: any
  let testInsight: any

  beforeAll(async () => {
    await testDb.setup()
  })

  afterAll(async () => {
    await testDb.cleanup()
  })

  beforeEach(async () => {
    // Create comprehensive mock Supabase client following CLAUDE.md patterns
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      and: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
    }

    ;(createSupabaseAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    fyiRepository = new FYIRepository()

    // Create test data following established patterns
    testUser = await testDb.createUser({
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'director',
    })
    
    testOrganization = await testDb.createOrganization({
      created_by: testUser.id,
      name: 'Test Organization',
    })

    // Create test insight data
    testInsight = FYIFactory.buildInsightCache({
      context_entity: testOrganization.id,
    })
  })

  afterEach(async () => {
    jest.clearAllMocks()
  })

  describe('Repository Base Methods - Following CLAUDE.md BaseRepository Pattern', () => {
    describe('getEntityName', () => {
      it('should return correct entity name', () => {
        const entityName = fyiRepository['getEntityName']()
        expect(entityName).toBe('FYI')
      })
    })

    describe('getTableName', () => {
      it('should return correct table name', () => {
        const tableName = fyiRepository['getTableName']()
        expect(tableName).toBe('fyi_insights_cache')
      })
    })
  })

  describe('findCachedInsights - Result Pattern Testing', () => {
    it('should return cached insights with default pagination', async () => {
      const expectedInsights = FYIFactory.buildMany(5)
      
      mockSupabase.mockResolvedValue({
        data: expectedInsights,
        error: null,
      })

      const result = await fyiRepository.findCachedInsights(testOrganization.id)

      expect(mockSupabase.from).toHaveBeenCalledWith('fyi_insights_cache')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.eq).toHaveBeenCalledWith('context_entity', testOrganization.id)
      expect(mockSupabase.order).toHaveBeenCalledWith('relevance_score', { ascending: false })
      expect(mockSupabase.limit).toHaveBeenCalledWith(10)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data).toEqual(expectedInsights)
        expect(result.data).toHaveLength(5)
      }
    })

    it('should filter by context when specified', async () => {
      const contextInsights = FYIFactory.buildMany(3, { 
        context_entity: 'board-meeting,strategic-planning' 
      })
      
      mockSupabase.mockResolvedValue({
        data: contextInsights,
        error: null,
      })

      const result = await fyiRepository.findCachedInsights(
        testOrganization.id, 
        'board-meeting', 
        10
      )

      expect(mockSupabase.ilike).toHaveBeenCalledWith('context_entity', '%board-meeting%')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(contextInsights)
      }
    })

    it('should handle custom limit parameter', async () => {
      const limitedInsights = FYIFactory.buildMany(20)
      
      mockSupabase.mockResolvedValue({
        data: limitedInsights,
        error: null,
      })

      const result = await fyiRepository.findCachedInsights(testOrganization.id, undefined, 20)

      expect(mockSupabase.limit).toHaveBeenCalledWith(20)
      expect(result.success).toBe(true)
    })

    it('should return failure when database error occurs - CLAUDE.md Result Pattern', async () => {
      mockSupabase.mockResolvedValue({
        data: null,
        error: { 
          message: 'Connection timeout', 
          code: 'CONNECTION_ERROR' 
        },
      })

      const result = await fyiRepository.findCachedInsights(testOrganization.id)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Connection timeout')
        expect(result.error.code).toBe('CONNECTION_ERROR')
      }
    })

    it('should handle empty results gracefully', async () => {
      mockSupabase.mockResolvedValue({
        data: [],
        error: null,
      })

      const result = await fyiRepository.findCachedInsights(testOrganization.id)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual([])
      }
    })
  })

  describe('cacheInsight - Data Persistence Testing', () => {
    it('should successfully cache new insight', async () => {
      const newInsight = FYIFactory.buildInsightCache({
        insight_id: 'new-insight-123',
        context_entity: testOrganization.id,
      })
      
      const expectedResult = { ...newInsight, id: 'generated-uuid' }
      
      mockSupabase.single.mockResolvedValue({
        data: expectedResult,
        error: null,
      })

      const result = await fyiRepository.cacheInsight(newInsight)

      expect(mockSupabase.from).toHaveBeenCalledWith('fyi_insights_cache')
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        ...newInsight,
        created_at: expect.any(String),
      }))
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data).toEqual(expectedResult)
        expect(result.data.insight_id).toBe('new-insight-123')
      }
    })

    it('should handle validation errors during insert', async () => {
      const invalidInsight = FYIFactory.buildInsightCache({ 
        title: '', // Invalid empty title
        insight_id: 'invalid-insight'
      })
      
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { 
          message: 'Title cannot be empty', 
          code: '23514' 
        },
      })

      const result = await fyiRepository.cacheInsight(invalidInsight)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Title cannot be empty')
        expect(result.error.code).toBe('23514')
      }
    })

    it('should handle duplicate insight_id constraint violations', async () => {
      const duplicateInsight = FYIFactory.buildInsightCache({
        insight_id: 'existing-insight-123'
      })
      
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { 
          message: 'duplicate key value violates unique constraint', 
          code: '23505' 
        },
      })

      const result = await fyiRepository.cacheInsight(duplicateInsight)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('duplicate key value')
        expect(result.error.code).toBe('23505')
      }
    })

    it('should automatically set created_at timestamp', async () => {
      const insight = FYIFactory.buildInsightCache()
      
      mockSupabase.single.mockResolvedValue({
        data: { ...insight, created_at: expect.any(String) },
        error: null,
      })

      await fyiRepository.cacheInsight(insight)

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          created_at: expect.any(String),
        })
      )
    })
  })

  describe('findByRelevance - Advanced Filtering', () => {
    it('should filter insights by minimum relevance score', async () => {
      const highRelevanceInsights = FYIFactory.buildWithRelevanceScores().filter(
        insight => insight.relevance_score! >= 0.80
      )
      
      mockSupabase.mockResolvedValue({
        data: highRelevanceInsights,
        error: null,
      })

      const result = await fyiRepository.findByRelevance(testOrganization.id, 0.80)

      expect(mockSupabase.gte).toHaveBeenCalledWith('relevance_score', 0.80)
      expect(mockSupabase.order).toHaveBeenCalledWith('relevance_score', { ascending: false })
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.every(insight => insight.relevance_score! >= 0.80)).toBe(true)
      }
    })

    it('should combine relevance filtering with context filtering', async () => {
      const contextualHighRelevanceInsights = [
        FYIFactory.buildFinancialInsight({ relevance_score: 0.85 })
      ]
      
      mockSupabase.mockResolvedValue({
        data: contextualHighRelevanceInsights,
        error: null,
      })

      const result = await fyiRepository.findByRelevance(
        testOrganization.id, 
        0.80, 
        'financial'
      )

      expect(mockSupabase.gte).toHaveBeenCalledWith('relevance_score', 0.80)
      expect(mockSupabase.ilike).toHaveBeenCalledWith('context_entity', '%financial%')
      expect(result.success).toBe(true)
    })
  })

  describe('findByType - Type-based Filtering', () => {
    it('should filter insights by type', async () => {
      const newsInsights = [
        FYIFactory.buildNewsInsight(),
        FYIFactory.buildNewsInsight(),
      ]
      
      mockSupabase.mockResolvedValue({
        data: newsInsights,
        error: null,
      })

      const result = await fyiRepository.findByType(testOrganization.id, 'news')

      expect(mockSupabase.eq).toHaveBeenCalledWith('type', 'news')
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.every(insight => insight.type === 'news')).toBe(true)
      }
    })

    it('should support all insight types', async () => {
      const types = ['news', 'financial', 'regulatory', 'competitive']
      
      for (const type of types) {
        mockSupabase.mockResolvedValue({
          data: [FYIFactory.buildInsightCache({ type })],
          error: null,
        })

        const result = await fyiRepository.findByType(testOrganization.id, type)
        
        expect(mockSupabase.eq).toHaveBeenCalledWith('type', type)
        expect(result.success).toBe(true)
        
        if (result.success) {
          expect(result.data[0].type).toBe(type)
        }
        
        jest.clearAllMocks()
      }
    })
  })

  describe('cleanExpiredCache - Cache Management', () => {
    it('should remove expired insights from cache', async () => {
      const expiredCount = 5
      
      mockSupabase.mockResolvedValue({
        data: Array(expiredCount).fill(null).map(() => ({ id: 'deleted-insight' })),
        error: null,
      })

      const result = await fyiRepository.cleanExpiredCache()

      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.lte).toHaveBeenCalledWith('expires_at', expect.any(String))
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.deletedCount).toBe(expiredCount)
      }
    })

    it('should handle case when no expired insights exist', async () => {
      mockSupabase.mockResolvedValue({
        data: [],
        error: null,
      })

      const result = await fyiRepository.cleanExpiredCache()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.deletedCount).toBe(0)
      }
    })

    it('should handle database errors during cleanup', async () => {
      mockSupabase.mockResolvedValue({
        data: null,
        error: { 
          message: 'Database maintenance in progress', 
          code: 'MAINTENANCE' 
        },
      })

      const result = await fyiRepository.cleanExpiredCache()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Database maintenance')
      }
    })
  })

  describe('searchInsights - Full Text Search', () => {
    it('should search insights by title and summary', async () => {
      const searchResults = [
        FYIFactory.buildInsightCache({ 
          title: 'Technology Market Analysis',
          summary: 'Comprehensive technology sector analysis'
        })
      ]
      
      mockSupabase.mockResolvedValue({
        data: searchResults,
        error: null,
      })

      const result = await fyiRepository.searchInsights(
        testOrganization.id, 
        'technology'
      )

      expect(mockSupabase.or).toHaveBeenCalledWith(
        expect.stringContaining('title.ilike.%technology%,summary.ilike.%technology%')
      )
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data).toEqual(searchResults)
      }
    })

    it('should handle pagination for search results', async () => {
      const paginatedResults = FYIFactory.buildMany(10)
      
      mockSupabase.mockResolvedValue({
        data: paginatedResults,
        error: null,
      })

      const result = await fyiRepository.searchInsights(
        testOrganization.id, 
        'market', 
        { limit: 10, offset: 20 }
      )

      expect(mockSupabase.range).toHaveBeenCalledWith(20, 29)
      expect(mockSupabase.limit).toHaveBeenCalledWith(10)
      expect(result.success).toBe(true)
    })

    it('should combine search with relevance filtering', async () => {
      const relevantSearchResults = [
        FYIFactory.buildInsightCache({ 
          relevance_score: 0.85,
          title: 'Critical Market Update' 
        })
      ]
      
      mockSupabase.mockResolvedValue({
        data: relevantSearchResults,
        error: null,
      })

      const result = await fyiRepository.searchInsights(
        testOrganization.id, 
        'market', 
        { relevanceThreshold: 0.80 }
      )

      expect(mockSupabase.gte).toHaveBeenCalledWith('relevance_score', 0.80)
      expect(result.success).toBe(true)
    })
  })

  describe('Performance Tests - CLAUDE.md Performance Requirements', () => {
    it('should handle large insight cache efficiently', async () => {
      const largeDataset = FYIFactory.buildLargeDataset(1000)
      
      mockSupabase.mockResolvedValue({
        data: largeDataset,
        error: null,
      })

      const { result, duration } = await performanceHelpers.measureExecutionTime(
        () => fyiRepository.findCachedInsights(testOrganization.id, undefined, 1000)
      )

      expect(duration).toBeLessThan(3000) // Should complete in under 3 seconds
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1000)
      }
    })

    it('should efficiently perform search operations on large datasets', async () => {
      const searchResults = FYIFactory.buildMany(50)
      
      mockSupabase.mockResolvedValue({
        data: searchResults,
        error: null,
      })

      const { result, duration } = await performanceHelpers.measureExecutionTime(
        () => fyiRepository.searchInsights(testOrganization.id, 'technology')
      )

      expect(duration).toBeLessThan(1000) // Should complete in under 1 second
      expect(result.success).toBe(true)
    })

    it('should handle bulk cache operations efficiently', async () => {
      const bulkInsights = FYIFactory.buildMany(100)
      
      mockSupabase.mockResolvedValue({
        data: bulkInsights,
        error: null,
      })

      const { duration } = await performanceHelpers.measureExecutionTime(
        () => Promise.all(bulkInsights.map(insight => 
          fyiRepository.cacheInsight(insight)
        ))
      )

      expect(duration).toBeLessThan(5000) // Should complete bulk operations efficiently
    })
  })

  describe('Edge Cases and Error Handling - CLAUDE.md Comprehensive Coverage', () => {
    it('should handle malformed insight data gracefully', async () => {
      const malformedInsight = FYIFactory.buildInsightCache({
        raw_data: null, // Malformed JSON data
        relevance_score: null,
      })
      
      mockSupabase.single.mockResolvedValue({
        data: malformedInsight,
        error: null,
      })

      const result = await fyiRepository.cacheInsight(malformedInsight)

      expect(result.success).toBe(true) // Should handle gracefully
    })

    it('should handle network timeout errors', async () => {
      mockSupabase.mockRejectedValue(new Error('Network timeout'))

      const result = await fyiRepository.findCachedInsights(testOrganization.id)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Network timeout')
      }
    })

    it('should handle invalid organization IDs', async () => {
      const result = await fyiRepository.findCachedInsights('invalid-org-id')

      expect(mockSupabase.eq).toHaveBeenCalledWith('context_entity', 'invalid-org-id')
      // Should not throw error, will return empty results
    })

    it('should validate required fields before caching', async () => {
      const incompleteInsight = {
        // Missing required fields like title, insight_id
        summary: 'Test summary',
      } as any
      
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { 
          message: 'null value in column "title" violates not-null constraint', 
          code: '23502' 
        },
      })

      const result = await fyiRepository.cacheInsight(incompleteInsight)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('not-null constraint')
      }
    })

    it('should handle extremely high relevance scores', async () => {
      const insight = FYIFactory.buildInsightCache({ relevance_score: 1.5 }) // Invalid high score
      
      mockSupabase.mockResolvedValue({
        data: [insight],
        error: null,
      })

      const result = await fyiRepository.findByRelevance(testOrganization.id, 0.5)

      expect(result.success).toBe(true)
      // Repository should handle invalid data gracefully
    })

    it('should handle special characters in search queries', async () => {
      const specialCharQuery = "!@#$%^&*()[]{}|;':\",./<>?"
      
      mockSupabase.mockResolvedValue({
        data: [],
        error: null,
      })

      const result = await fyiRepository.searchInsights(
        testOrganization.id, 
        specialCharQuery
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual([])
      }
    })
  })

  describe('Data Validation and Integrity', () => {
    it('should validate insight data structure', async () => {
      const insight = FYIFactory.buildInsightCache()
      
      expect(testAssertions.hasRequiredFields(insight, [
        'insight_id', 'title', 'type', 'source', 'url', 'published_at', 'expires_at'
      ])).toBe(true)
      
      expect(testAssertions.isValidUUID).toBeDefined()
    })

    it('should validate relevance score ranges', async () => {
      const validScores = [0.0, 0.5, 0.85, 1.0]
      
      validScores.forEach(score => {
        const insight = FYIFactory.buildInsightCache({ relevance_score: score })
        expect(insight.relevance_score).toBeGreaterThanOrEqual(0)
        expect(insight.relevance_score).toBeLessThanOrEqual(1)
      })
    })

    it('should validate insight types are from allowed enum', async () => {
      const allowedTypes = ['news', 'financial', 'regulatory', 'competitive']
      
      allowedTypes.forEach(type => {
        const insight = FYIFactory.buildInsightCache({ type })
        expect(allowedTypes).toContain(insight.type)
      })
    })

    it('should validate URL formats in insight data', async () => {
      const insight = FYIFactory.buildInsightCache({ 
        url: 'https://valid-source.com/insight/123' 
      })
      
      expect(insight.url).toMatch(/^https?:\/\//)
    })

    it('should validate timestamp formats', async () => {
      const insight = FYIFactory.buildInsightCache()
      
      expect(insight.published_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      expect(insight.expires_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })
})