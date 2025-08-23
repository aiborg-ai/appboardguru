/**
 * Search Service Repository Integration Tests
 * Following enterprise architecture guidelines:
 * - Repository Pattern testing
 * - Result<T> types for error handling
 * - Branded types for type safety
 * - Database integration testing
 * - Performance monitoring
 * - Cache layer testing
 */

import { jest } from '@jest/globals'
import { searchService } from '@/lib/services/search.service'
import { SearchResult, SearchRequest } from '@/types/search'
import { createUserId, createOrganizationId, createVaultId, createAssetId } from '@/lib/utils/branded-type-helpers'
import { RepositoryFactory } from '@/lib/repositories'

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(),
    rpc: jest.fn()
  })),
  rpc: jest.fn(),
  auth: {
    getUser: jest.fn()
  }
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}))

// Mock the repository factory
jest.mock('@/lib/repositories', () => ({
  RepositoryFactory: jest.fn().mockImplementation(() => ({
    assets: {
      search: jest.fn(),
      findByContext: jest.fn(),
      getMetadata: jest.fn()
    },
    vaults: {
      findByOrganization: jest.fn(),
      search: jest.fn()
    },
    meetings: {
      findByOrganization: jest.fn(),
      search: jest.fn()
    },
    activity: {
      logSearchQuery: jest.fn()
    }
  }))
}))

describe('Search Service Repository Integration Tests', () => {
  let repositoryFactory: RepositoryFactory
  const mockRepositoryFactory = RepositoryFactory as jest.MockedClass<typeof RepositoryFactory>

  beforeEach(() => {
    jest.clearAllMocks()
    repositoryFactory = new mockRepositoryFactory(mockSupabaseClient as any)
  })

  describe('Basic Search Operations', () => {
    it('should perform hybrid search with keyword and semantic components', async () => {
      // Mock search results
      const mockSearchResults = {
        data: [{
          asset: {
            id: 'asset_123',
            title: 'Board Governance Policy',
            description: 'Comprehensive governance policies for board oversight',
            file_name: 'board-governance.pdf',
            file_type: 'application/pdf',
            file_size: 2048000,
            updated_at: new Date().toISOString(),
            tags: ['governance', 'policy', 'board'],
            category: 'governance'
          },
          vault: {
            id: 'vault_123',
            name: 'Governance Documents'
          },
          organization: {
            id: 'org_123',
            name: 'Test Corporation'
          },
          metadata: {
            relevance_score: 0.95,
            ai_summary: 'This document outlines comprehensive board governance policies...',
            estimated_read_time: '15 min',
            complexity_level: 'advanced'
          },
          highlight: {
            content: 'board governance policies and oversight procedures...'
          }
        }],
        error: null
      }

      mockSupabaseClient.rpc.mockResolvedValue(mockSearchResults)

      const searchRequest: SearchRequest = {
        query: 'board governance policies',
        context_scope: 'organization',
        context_id: createOrganizationId('org_123'),
        limit: 10,
        search_type: 'hybrid'
      }

      const result = await searchService.search(searchRequest)

      expect(result).toEqual({
        results: expect.arrayContaining([
          expect.objectContaining({
            asset: expect.objectContaining({
              id: 'asset_123',
              title: 'Board Governance Policy'
            }),
            metadata: expect.objectContaining({
              relevance_score: 0.95
            })
          })
        ]),
        total_count: 1,
        search_time_ms: expect.any(Number),
        query_metadata: expect.objectContaining({
          original_query: 'board governance policies',
          processed_query: 'board governance policies',
          query_type: 'hybrid'
        })
      })

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'hybrid_search_assets',
        expect.objectContaining({
          search_query: 'board governance policies',
          context_type: 'organization',
          context_id: 'org_123',
          result_limit: 10
        })
      )
    })

    it('should handle semantic-only search for complex queries', async () => {
      const mockSearchResults = {
        data: [{
          asset: {
            id: 'asset_456',
            title: 'Executive Compensation Framework',
            description: 'Framework for determining executive compensation',
            file_name: 'exec-compensation.pdf',
            file_type: 'application/pdf',
            file_size: 1536000,
            updated_at: new Date().toISOString(),
            tags: ['compensation', 'executive'],
            category: 'compensation'
          },
          vault: {
            id: 'vault_456',
            name: 'HR Documents'
          },
          organization: {
            id: 'org_123',
            name: 'Test Corporation'
          },
          metadata: {
            relevance_score: 0.87,
            ai_summary: 'Comprehensive framework for executive compensation decisions...',
            estimated_read_time: '12 min',
            complexity_level: 'advanced'
          },
          highlight: {
            content: 'executive compensation framework and decision criteria...'
          }
        }],
        error: null
      }

      mockSupabaseClient.rpc.mockResolvedValue(mockSearchResults)

      const searchRequest: SearchRequest = {
        query: 'How should we determine fair compensation for senior leadership roles?',
        context_scope: 'organization',
        context_id: createOrganizationId('org_123'),
        limit: 5,
        search_type: 'semantic'
      }

      const result = await searchService.search(searchRequest)

      expect(result.results).toHaveLength(1)
      expect(result.query_metadata.query_type).toBe('semantic')
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'semantic_search_assets',
        expect.objectContaining({
          search_query: expect.stringContaining('compensation'),
          context_type: 'organization'
        })
      )
    })

    it('should perform keyword search for exact term matching', async () => {
      const mockSearchResults = {
        data: [{
          asset: {
            id: 'asset_789',
            title: 'Audit Committee Charter',
            description: 'Charter document for the audit committee',
            file_name: 'audit-charter.pdf',
            file_type: 'application/pdf',
            file_size: 512000,
            updated_at: new Date().toISOString(),
            tags: ['audit', 'committee', 'charter'],
            category: 'governance'
          },
          vault: {
            id: 'vault_789',
            name: 'Committee Documents'
          },
          organization: {
            id: 'org_123',
            name: 'Test Corporation'
          },
          metadata: {
            relevance_score: 1.0,
            ai_summary: 'Audit committee charter defining roles and responsibilities...',
            estimated_read_time: '8 min',
            complexity_level: 'medium'
          },
          highlight: {
            content: 'audit committee charter roles responsibilities...'
          }
        }],
        error: null
      }

      mockSupabaseClient.from().select().textSearch.mockResolvedValue(mockSearchResults)

      const searchRequest: SearchRequest = {
        query: '"audit committee charter"',
        context_scope: 'vault',
        context_id: createVaultId('vault_789'),
        limit: 10,
        search_type: 'keyword'
      }

      const result = await searchService.search(searchRequest)

      expect(result.results[0].metadata.relevance_score).toBe(1.0)
      expect(result.query_metadata.query_type).toBe('keyword')
    })
  })

  describe('Context-Aware Search', () => {
    it('should filter results by organization context', async () => {
      const orgId = createOrganizationId('org_456')
      
      const mockSearchResults = {
        data: [{
          asset: {
            id: 'asset_org_specific',
            title: 'Organization Specific Policy',
            description: 'Policy specific to this organization',
            file_name: 'org-policy.pdf',
            file_type: 'application/pdf',
            file_size: 1024000,
            updated_at: new Date().toISOString(),
            tags: ['policy'],
            category: 'policy'
          },
          vault: {
            id: 'vault_org',
            name: 'Organization Vault'
          },
          organization: {
            id: orgId,
            name: 'Specific Organization'
          },
          metadata: {
            relevance_score: 0.92,
            ai_summary: 'Organization-specific policy document...',
            estimated_read_time: '10 min',
            complexity_level: 'medium'
          },
          highlight: {
            content: 'organization specific policy guidelines...'
          }
        }],
        error: null
      }

      mockSupabaseClient.rpc.mockResolvedValue(mockSearchResults)

      const searchRequest: SearchRequest = {
        query: 'policy guidelines',
        context_scope: 'organization',
        context_id: orgId,
        limit: 10,
        search_type: 'hybrid'
      }

      const result = await searchService.search(searchRequest)

      expect(result.results[0].organization.id).toBe(orgId)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'hybrid_search_assets',
        expect.objectContaining({
          context_type: 'organization',
          context_id: orgId
        })
      )
    })

    it('should filter results by vault context', async () => {
      const vaultId = createVaultId('vault_specific')
      
      const mockSearchResults = {
        data: [{
          asset: {
            id: 'asset_vault_specific',
            title: 'Vault Specific Document',
            description: 'Document within the specified vault',
            file_name: 'vault-doc.pdf',
            file_type: 'application/pdf',
            file_size: 768000,
            updated_at: new Date().toISOString(),
            tags: ['vault'],
            category: 'general'
          },
          vault: {
            id: vaultId,
            name: 'Specific Vault'
          },
          organization: {
            id: 'org_123',
            name: 'Test Corporation'
          },
          metadata: {
            relevance_score: 0.89,
            ai_summary: 'Document stored in the specified vault...',
            estimated_read_time: '7 min',
            complexity_level: 'basic'
          },
          highlight: {
            content: 'vault specific document content...'
          }
        }],
        error: null
      }

      mockSupabaseClient.rpc.mockResolvedValue(mockSearchResults)

      const result = await searchService.search({
        query: 'documents',
        context_scope: 'vault',
        context_id: vaultId,
        limit: 5,
        search_type: 'hybrid'
      })

      expect(result.results[0].vault.id).toBe(vaultId)
    })

    it('should handle asset-specific search', async () => {
      const assetId = createAssetId('asset_specific')
      
      const mockSearchResults = {
        data: [{
          asset: {
            id: assetId,
            title: 'Specific Asset Document',
            description: 'The exact asset being searched',
            file_name: 'specific-asset.pdf',
            file_type: 'application/pdf',
            file_size: 2048000,
            updated_at: new Date().toISOString(),
            tags: ['specific'],
            category: 'specific'
          },
          vault: {
            id: 'vault_123',
            name: 'General Vault'
          },
          organization: {
            id: 'org_123',
            name: 'Test Corporation'
          },
          metadata: {
            relevance_score: 1.0,
            ai_summary: 'The specific asset document content...',
            estimated_read_time: '20 min',
            complexity_level: 'advanced'
          },
          highlight: {
            content: 'specific asset document detailed content...'
          }
        }],
        error: null
      }

      mockSupabaseClient.rpc.mockResolvedValue(mockSearchResults)

      const result = await searchService.search({
        query: 'key points summary',
        context_scope: 'asset',
        context_id: assetId,
        limit: 1,
        search_type: 'semantic'
      })

      expect(result.results[0].asset.id).toBe(assetId)
      expect(result.results[0].metadata.relevance_score).toBe(1.0)
    })
  })

  describe('Search Performance and Optimization', () => {
    it('should complete search within performance budget', async () => {
      const mockSearchResults = {
        data: Array.from({ length: 10 }, (_, i) => ({
          asset: {
            id: `asset_perf_${i}`,
            title: `Performance Test Document ${i}`,
            description: `Document ${i} for performance testing`,
            file_name: `perf-doc-${i}.pdf`,
            file_type: 'application/pdf',
            file_size: 1024000,
            updated_at: new Date().toISOString(),
            tags: ['performance', 'test'],
            category: 'test'
          },
          vault: { id: 'vault_perf', name: 'Performance Vault' },
          organization: { id: 'org_perf', name: 'Performance Org' },
          metadata: {
            relevance_score: 0.9 - (i * 0.05),
            ai_summary: `Performance test document ${i} summary...`,
            estimated_read_time: '5 min',
            complexity_level: 'basic'
          },
          highlight: {
            content: `performance test content ${i}...`
          }
        })),
        error: null
      }

      mockSupabaseClient.rpc.mockResolvedValue(mockSearchResults)

      const startTime = Date.now()
      
      const result = await searchService.search({
        query: 'performance test',
        context_scope: 'general',
        limit: 10,
        search_type: 'hybrid'
      })

      const searchTime = Date.now() - startTime
      
      expect(searchTime).toBeLessThan(1000) // 1 second performance budget
      expect(result.search_time_ms).toBeLessThan(1000)
      expect(result.results).toHaveLength(10)
      expect(result.results[0].metadata.relevance_score).toBeGreaterThan(0.8)
    })

    it('should handle large result sets with pagination', async () => {
      const mockSearchResults = {
        data: Array.from({ length: 50 }, (_, i) => ({
          asset: {
            id: `asset_large_${i}`,
            title: `Large Dataset Document ${i}`,
            description: `Document ${i} in large dataset`,
            file_name: `large-doc-${i}.pdf`,
            file_type: 'application/pdf',
            file_size: 1024000,
            updated_at: new Date().toISOString(),
            tags: ['large', 'dataset'],
            category: 'test'
          },
          vault: { id: 'vault_large', name: 'Large Vault' },
          organization: { id: 'org_large', name: 'Large Org' },
          metadata: {
            relevance_score: 0.95 - (i * 0.01),
            ai_summary: `Large dataset document ${i} summary...`,
            estimated_read_time: '3 min',
            complexity_level: 'basic'
          },
          highlight: {
            content: `large dataset content ${i}...`
          }
        })),
        error: null
      }

      mockSupabaseClient.rpc.mockResolvedValue(mockSearchResults)

      const result = await searchService.search({
        query: 'large dataset',
        context_scope: 'general',
        limit: 50,
        search_type: 'hybrid'
      })

      expect(result.results).toHaveLength(50)
      expect(result.total_count).toBe(50)
      
      // Verify results are sorted by relevance score
      for (let i = 0; i < result.results.length - 1; i++) {
        expect(result.results[i].metadata.relevance_score)
          .toBeGreaterThanOrEqual(result.results[i + 1].metadata.relevance_score)
      }
    })

    it('should implement caching for repeated queries', async () => {
      const mockSearchResults = {
        data: [{
          asset: {
            id: 'asset_cache_test',
            title: 'Cache Test Document',
            description: 'Document for cache testing',
            file_name: 'cache-test.pdf',
            file_type: 'application/pdf',
            file_size: 512000,
            updated_at: new Date().toISOString(),
            tags: ['cache', 'test'],
            category: 'test'
          },
          vault: { id: 'vault_cache', name: 'Cache Vault' },
          organization: { id: 'org_cache', name: 'Cache Org' },
          metadata: {
            relevance_score: 0.88,
            ai_summary: 'Cache test document summary...',
            estimated_read_time: '4 min',
            complexity_level: 'basic'
          },
          highlight: {
            content: 'cache test content...'
          }
        }],
        error: null
      }

      mockSupabaseClient.rpc.mockResolvedValue(mockSearchResults)

      const searchRequest: SearchRequest = {
        query: 'cache test',
        context_scope: 'general',
        limit: 5,
        search_type: 'keyword'
      }

      // First search call
      const result1 = await searchService.search(searchRequest)
      
      // Second search call with same parameters
      const result2 = await searchService.search(searchRequest)

      expect(result1).toEqual(result2)
      
      // Verify caching behavior - second call should be faster
      const startTime = Date.now()
      await searchService.search(searchRequest)
      const cachedSearchTime = Date.now() - startTime
      
      expect(cachedSearchTime).toBeLessThan(100) // Cached search should be < 100ms
    })
  })

  describe('Search Query Tracking and Analytics', () => {
    it('should track search queries for analytics', async () => {
      const userId = createUserId('user_123')
      const orgId = createOrganizationId('org_123')
      
      const mockSearchResults = {
        data: [],
        error: null
      }

      mockSupabaseClient.rpc.mockResolvedValue(mockSearchResults)

      await searchService.trackSearchQuery(
        'governance policies',
        'organization',
        orgId,
        userId,
        orgId,
        5,
        250
      )

      expect(repositoryFactory.activity.logSearchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'governance policies',
          context_scope: 'organization',
          context_id: orgId,
          user_id: userId,
          organization_id: orgId,
          results_count: 5,
          search_time_ms: 250
        })
      )
    })

    it('should handle search analytics aggregation', async () => {
      const mockAnalytics = {
        data: {
          total_searches: 150,
          avg_search_time: 275,
          top_queries: [
            { query: 'board governance', count: 25 },
            { query: 'compliance policies', count: 20 },
            { query: 'audit committee', count: 18 }
          ],
          search_trends: {
            daily: [10, 12, 15, 8, 20],
            weekly: [65, 72, 80, 55]
          }
        },
        error: null
      }

      mockSupabaseClient.rpc.mockResolvedValue(mockAnalytics)

      const analytics = await searchService.getSearchAnalytics(
        createOrganizationId('org_123'),
        '7d'
      )

      expect(analytics).toEqual({
        total_searches: 150,
        avg_search_time: 275,
        top_queries: expect.arrayContaining([
          expect.objectContaining({ query: 'board governance', count: 25 })
        ]),
        search_trends: expect.objectContaining({
          daily: expect.any(Array),
          weekly: expect.any(Array)
        })
      })
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle database connection errors gracefully', async () => {
      mockSupabaseClient.rpc.mockRejectedValue(new Error('Connection timeout'))

      const result = await searchService.search({
        query: 'test query',
        context_scope: 'general',
        limit: 5,
        search_type: 'hybrid'
      })

      expect(result).toEqual({
        results: [],
        total_count: 0,
        search_time_ms: expect.any(Number),
        query_metadata: {
          original_query: 'test query',
          processed_query: 'test query',
          query_type: 'hybrid',
          filters_applied: [],
          error: 'Database connection failed'
        }
      })
    })

    it('should handle malformed search responses', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [{ invalid: 'structure' }],
        error: null
      })

      const result = await searchService.search({
        query: 'malformed test',
        context_scope: 'general',
        limit: 5,
        search_type: 'hybrid'
      })

      expect(result.results).toEqual([])
      expect(result.query_metadata.error).toContain('Invalid search result format')
    })

    it('should handle search timeouts with fallback', async () => {
      // Mock a timeout scenario
      mockSupabaseClient.rpc.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 5000)
        )
      )

      const startTime = Date.now()
      const result = await searchService.search({
        query: 'timeout test',
        context_scope: 'general',
        limit: 5,
        search_type: 'hybrid'
      })
      const elapsed = Date.now() - startTime

      expect(elapsed).toBeLessThan(6000) // Should timeout before 6 seconds
      expect(result.results).toEqual([])
      expect(result.query_metadata.error).toContain('timeout')
    })
  })

  describe('Repository Integration', () => {
    it('should integrate with AssetRepository for metadata enrichment', async () => {
      const assetMetadata = {
        ai_insights: {
          key_topics: ['governance', 'compliance'],
          sentiment_score: 0.8,
          complexity_analysis: 'advanced',
          related_documents: ['doc1', 'doc2']
        },
        access_patterns: {
          view_count: 45,
          download_count: 12,
          last_accessed: new Date().toISOString()
        }
      }

      repositoryFactory.assets.getMetadata = jest.fn().mockResolvedValue({
        success: true,
        data: assetMetadata
      })

      const mockSearchResults = {
        data: [{
          asset: {
            id: 'asset_metadata_test',
            title: 'Metadata Test Document',
            description: 'Document for metadata testing',
            file_name: 'metadata-test.pdf',
            file_type: 'application/pdf',
            file_size: 1024000,
            updated_at: new Date().toISOString(),
            tags: ['metadata', 'test'],
            category: 'test'
          },
          vault: { id: 'vault_meta', name: 'Metadata Vault' },
          organization: { id: 'org_meta', name: 'Metadata Org' },
          metadata: {
            relevance_score: 0.92,
            ai_summary: 'Metadata test document...',
            estimated_read_time: '6 min',
            complexity_level: 'advanced'
          },
          highlight: {
            content: 'metadata test content...'
          }
        }],
        error: null
      }

      mockSupabaseClient.rpc.mockResolvedValue(mockSearchResults)

      const result = await searchService.search({
        query: 'metadata test',
        context_scope: 'general',
        limit: 5,
        search_type: 'hybrid',
        include_metadata: true
      })

      expect(repositoryFactory.assets.getMetadata).toHaveBeenCalledWith('asset_metadata_test')
      expect(result.results[0]).toEqual(
        expect.objectContaining({
          asset: expect.objectContaining({
            id: 'asset_metadata_test'
          }),
          enriched_metadata: assetMetadata
        })
      )
    })

    it('should integrate with VaultRepository for context expansion', async () => {
      const vaultContext = {
        vault_stats: {
          total_assets: 125,
          recent_activity: 'high',
          categories: ['governance', 'compliance', 'audit']
        },
        access_permissions: ['read', 'download'],
        related_vaults: ['vault_related1', 'vault_related2']
      }

      repositoryFactory.vaults.search = jest.fn().mockResolvedValue({
        success: true,
        data: [vaultContext]
      })

      const result = await searchService.search({
        query: 'vault context test',
        context_scope: 'vault',
        context_id: createVaultId('vault_context_test'),
        limit: 10,
        search_type: 'hybrid',
        expand_context: true
      })

      expect(repositoryFactory.vaults.search).toHaveBeenCalled()
    })
  })
})