/**
 * Context Management Service Layer Tests
 * Following enterprise architecture guidelines:
 * - Service layer testing with mocked repositories
 * - Result<T> pattern for error handling
 * - Branded types for type safety
 * - Context state management testing
 * - Business logic validation
 */

import { jest } from '@jest/globals'
import { ContextService } from '@/lib/services/context.service'
import { ContextScope } from '@/features/ai-chat/ai/ScopeSelectorTypes'
import { createUserId, createOrganizationId, createVaultId, createAssetId } from '@/lib/utils/branded-type-helpers'
import { Result } from '@/lib/repositories/result'

// Mock the repository dependencies
const mockRepositoryFactory = {
  organizations: {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    getHierarchy: jest.fn()
  },
  vaults: {
    findById: jest.fn(),
    findByOrganization: jest.fn(),
    getPermissions: jest.fn()
  },
  assets: {
    findById: jest.fn(),
    findByVault: jest.fn(),
    getMetadata: jest.fn(),
    getPermissions: jest.fn()
  },
  activity: {
    logContextSwitch: jest.fn(),
    trackContextUsage: jest.fn()
  }
}

jest.mock('@/lib/repositories', () => ({
  RepositoryFactory: jest.fn(() => mockRepositoryFactory)
}))

describe('Context Management Service Tests', () => {
  let contextService: ContextService
  const userId = createUserId('user_123')
  const orgId = createOrganizationId('org_123')
  const vaultId = createVaultId('vault_123')
  const assetId = createAssetId('asset_123')

  beforeEach(() => {
    jest.clearAllMocks()
    contextService = new ContextService(mockRepositoryFactory as any)
  })

  describe('Context Resolution and Validation', () => {
    it('should resolve general context without additional validation', async () => {
      const context = await contextService.resolveContext({
        scope: 'general',
        userId
      })

      expect(context.success).toBe(true)
      expect(context.data).toEqual({
        scope: 'general',
        resolved: true,
        permissions: ['read'],
        metadata: {
          contextType: 'general',
          description: 'General AI assistant context',
          capabilities: ['general_knowledge', 'document_analysis']
        }
      })
    })

    it('should resolve boardguru context with specialized capabilities', async () => {
      const context = await contextService.resolveContext({
        scope: 'boardguru',
        userId
      })

      expect(context.success).toBe(true)
      expect(context.data?.scope).toBe('boardguru')
      expect(context.data?.metadata.capabilities).toContain('governance_expertise')
      expect(context.data?.metadata.capabilities).toContain('compliance_analysis')
      expect(context.data?.metadata.capabilities).toContain('board_best_practices')
    })

    it('should resolve organization context with proper validation', async () => {
      const mockOrganization = {
        id: orgId,
        name: 'Test Corporation',
        slug: 'test-corp',
        settings: {
          ai_features_enabled: true,
          context_scope_permissions: ['organization', 'vault', 'asset']
        },
        subscription: {
          plan: 'enterprise',
          ai_quota_remaining: 1000
        }
      }

      mockRepositoryFactory.organizations.findById.mockResolvedValue(
        Result.success(mockOrganization)
      )
      mockRepositoryFactory.organizations.getHierarchy.mockResolvedValue(
        Result.success({
          vaults: [
            { id: 'vault_1', name: 'Board Documents' },
            { id: 'vault_2', name: 'Compliance Files' }
          ],
          members: 25,
          assets_count: 150
        })
      )

      const context = await contextService.resolveContext({
        scope: 'organization',
        organizationId: orgId,
        userId
      })

      expect(context.success).toBe(true)
      expect(context.data?.scope).toBe('organization')
      expect(context.data?.organization).toEqual(mockOrganization)
      expect(context.data?.hierarchy?.vaults).toHaveLength(2)
      expect(mockRepositoryFactory.organizations.findById).toHaveBeenCalledWith(orgId)
    })

    it('should validate organization access permissions', async () => {
      mockRepositoryFactory.organizations.findById.mockResolvedValue(
        Result.failure('Organization not found')
      )

      const context = await contextService.resolveContext({
        scope: 'organization',
        organizationId: orgId,
        userId
      })

      expect(context.success).toBe(false)
      expect(context.error).toContain('Organization not found')
    })

    it('should resolve vault context with asset listings', async () => {
      const mockVault = {
        id: vaultId,
        name: 'Board Documents Vault',
        description: 'Secure storage for board documents',
        organization_id: orgId,
        settings: {
          ai_analysis_enabled: true,
          context_search_enabled: true
        }
      }

      const mockAssets = [
        {
          id: 'asset_1',
          title: 'Q3 Board Minutes',
          type: 'pdf',
          category: 'meetings'
        },
        {
          id: 'asset_2',
          title: 'Governance Policy',
          type: 'pdf',
          category: 'governance'
        }
      ]

      mockRepositoryFactory.vaults.findById.mockResolvedValue(
        Result.success(mockVault)
      )
      mockRepositoryFactory.assets.findByVault.mockResolvedValue(
        Result.success(mockAssets)
      )
      mockRepositoryFactory.vaults.getPermissions.mockResolvedValue(
        Result.success(['read', 'search', 'ai_analysis'])
      )

      const context = await contextService.resolveContext({
        scope: 'vault',
        vaultId,
        userId
      })

      expect(context.success).toBe(true)
      expect(context.data?.vault).toEqual(mockVault)
      expect(context.data?.assets).toHaveLength(2)
      expect(context.data?.permissions).toContain('ai_analysis')
    })

    it('should resolve asset context with detailed metadata', async () => {
      const mockAsset = {
        id: assetId,
        title: 'Corporate Governance Framework',
        description: 'Comprehensive framework for corporate governance',
        file_type: 'application/pdf',
        file_size: 2048000,
        category: 'governance',
        tags: ['governance', 'framework', 'corporate'],
        vault_id: vaultId,
        organization_id: orgId
      }

      const mockMetadata = {
        ai_analysis: {
          key_topics: ['governance', 'compliance', 'board_oversight'],
          sentiment: 'neutral',
          complexity: 'advanced',
          summary: 'Comprehensive governance framework document...'
        },
        access_patterns: {
          view_count: 45,
          last_accessed: new Date().toISOString(),
          popular_sections: ['executive_summary', 'board_responsibilities']
        }
      }

      mockRepositoryFactory.assets.findById.mockResolvedValue(
        Result.success(mockAsset)
      )
      mockRepositoryFactory.assets.getMetadata.mockResolvedValue(
        Result.success(mockMetadata)
      )
      mockRepositoryFactory.assets.getPermissions.mockResolvedValue(
        Result.success(['read', 'download', 'ai_analysis'])
      )

      const context = await contextService.resolveContext({
        scope: 'asset',
        assetId,
        userId
      })

      expect(context.success).toBe(true)
      expect(context.data?.asset).toEqual(mockAsset)
      expect(context.data?.metadata).toEqual(mockMetadata)
      expect(context.data?.permissions).toContain('ai_analysis')
    })
  })

  describe('Context Switching and State Management', () => {
    it('should track context switches for analytics', async () => {
      const fromContext = {
        scope: 'general' as ContextScope,
        userId
      }

      const toContext = {
        scope: 'organization' as ContextScope,
        organizationId: orgId,
        userId
      }

      mockRepositoryFactory.organizations.findById.mockResolvedValue(
        Result.success({
          id: orgId,
          name: 'Test Corp',
          slug: 'test-corp'
        })
      )

      await contextService.switchContext(fromContext, toContext)

      expect(mockRepositoryFactory.activity.logContextSwitch).toHaveBeenCalledWith({
        user_id: userId,
        from_scope: 'general',
        to_scope: 'organization',
        to_context_id: orgId,
        switch_time: expect.any(Date),
        session_id: expect.any(String)
      })
    })

    it('should maintain context history for session management', async () => {
      const contexts = [
        { scope: 'general' as ContextScope, userId },
        { scope: 'organization' as ContextScope, organizationId: orgId, userId },
        { scope: 'vault' as ContextScope, vaultId, userId }
      ]

      mockRepositoryFactory.organizations.findById.mockResolvedValue(
        Result.success({ id: orgId, name: 'Test Corp' })
      )
      mockRepositoryFactory.vaults.findById.mockResolvedValue(
        Result.success({ id: vaultId, name: 'Test Vault' })
      )

      for (let i = 1; i < contexts.length; i++) {
        await contextService.switchContext(contexts[i-1], contexts[i])
      }

      const history = await contextService.getContextHistory(userId)

      expect(history.success).toBe(true)
      expect(history.data).toHaveLength(3)
      expect(history.data?.[0].scope).toBe('general')
      expect(history.data?.[2].scope).toBe('vault')
    })

    it('should validate context transitions based on permissions', async () => {
      const fromContext = {
        scope: 'general' as ContextScope,
        userId
      }

      const toContext = {
        scope: 'organization' as ContextScope,
        organizationId: orgId,
        userId
      }

      // Mock organization that doesn't allow AI features
      mockRepositoryFactory.organizations.findById.mockResolvedValue(
        Result.success({
          id: orgId,
          name: 'Restricted Corp',
          settings: {
            ai_features_enabled: false
          }
        })
      )

      const result = await contextService.switchContext(fromContext, toContext)

      expect(result.success).toBe(false)
      expect(result.error).toContain('AI features not enabled')
    })
  })

  describe('Context Optimization and Caching', () => {
    it('should cache resolved contexts for performance', async () => {
      const contextRequest = {
        scope: 'organization' as ContextScope,
        organizationId: orgId,
        userId
      }

      mockRepositoryFactory.organizations.findById.mockResolvedValue(
        Result.success({
          id: orgId,
          name: 'Cached Corp',
          slug: 'cached-corp'
        })
      )

      // First resolution
      const context1 = await contextService.resolveContext(contextRequest)
      
      // Second resolution should use cache
      const context2 = await contextService.resolveContext(contextRequest)

      expect(context1).toEqual(context2)
      // Repository should only be called once due to caching
      expect(mockRepositoryFactory.organizations.findById).toHaveBeenCalledTimes(1)
    })

    it('should invalidate cache when context data changes', async () => {
      const contextRequest = {
        scope: 'vault' as ContextScope,
        vaultId,
        userId
      }

      mockRepositoryFactory.vaults.findById.mockResolvedValue(
        Result.success({
          id: vaultId,
          name: 'Original Vault Name',
          updated_at: '2024-01-01T00:00:00Z'
        })
      )

      // First resolution
      await contextService.resolveContext(contextRequest)

      // Simulate vault update
      await contextService.invalidateContextCache('vault', vaultId)

      mockRepositoryFactory.vaults.findById.mockResolvedValue(
        Result.success({
          id: vaultId,
          name: 'Updated Vault Name',
          updated_at: '2024-01-02T00:00:00Z'
        })
      )

      // Second resolution should fetch fresh data
      const context2 = await contextService.resolveContext(contextRequest)

      expect(context2.data?.vault?.name).toBe('Updated Vault Name')
      expect(mockRepositoryFactory.vaults.findById).toHaveBeenCalledTimes(2)
    })

    it('should handle concurrent context resolution requests', async () => {
      const contextRequest = {
        scope: 'asset' as ContextScope,
        assetId,
        userId
      }

      mockRepositoryFactory.assets.findById.mockImplementation(() =>
        new Promise(resolve => 
          setTimeout(() => resolve(Result.success({
            id: assetId,
            title: 'Concurrent Test Asset'
          })), 100)
        )
      )

      // Make multiple concurrent requests
      const promises = Array.from({ length: 5 }, () => 
        contextService.resolveContext(contextRequest)
      )

      const results = await Promise.all(promises)

      // All results should be identical
      expect(results.every(result => result.success)).toBe(true)
      expect(results.every(result => 
        result.data?.asset?.title === 'Concurrent Test Asset'
      )).toBe(true)

      // Repository should only be called once due to deduplication
      expect(mockRepositoryFactory.assets.findById).toHaveBeenCalledTimes(1)
    })
  })

  describe('Context Permissions and Security', () => {
    it('should enforce row-level security for organization contexts', async () => {
      const contextRequest = {
        scope: 'organization' as ContextScope,
        organizationId: orgId,
        userId: createUserId('unauthorized_user')
      }

      mockRepositoryFactory.organizations.findById.mockResolvedValue(
        Result.failure('Access denied: User not member of organization')
      )

      const context = await contextService.resolveContext(contextRequest)

      expect(context.success).toBe(false)
      expect(context.error).toContain('Access denied')
    })

    it('should validate vault access permissions', async () => {
      const contextRequest = {
        scope: 'vault' as ContextScope,
        vaultId,
        userId
      }

      mockRepositoryFactory.vaults.findById.mockResolvedValue(
        Result.success({
          id: vaultId,
          name: 'Private Vault'
        })
      )
      mockRepositoryFactory.vaults.getPermissions.mockResolvedValue(
        Result.success([]) // No permissions
      )

      const context = await contextService.resolveContext(contextRequest)

      expect(context.success).toBe(false)
      expect(context.error).toContain('Insufficient permissions')
    })

    it('should handle asset access with file-level security', async () => {
      const contextRequest = {
        scope: 'asset' as ContextScope,
        assetId,
        userId
      }

      mockRepositoryFactory.assets.findById.mockResolvedValue(
        Result.success({
          id: assetId,
          title: 'Confidential Document',
          security_level: 'confidential'
        })
      )
      mockRepositoryFactory.assets.getPermissions.mockResolvedValue(
        Result.success(['read']) // Basic read access
      )

      const context = await contextService.resolveContext(contextRequest)

      expect(context.success).toBe(true)
      expect(context.data?.permissions).toEqual(['read'])
      expect(context.data?.asset?.security_level).toBe('confidential')
    })
  })

  describe('Context Analytics and Insights', () => {
    it('should track context usage patterns', async () => {
      const contextRequest = {
        scope: 'organization' as ContextScope,
        organizationId: orgId,
        userId
      }

      mockRepositoryFactory.organizations.findById.mockResolvedValue(
        Result.success({
          id: orgId,
          name: 'Analytics Corp'
        })
      )

      await contextService.resolveContext(contextRequest)

      expect(mockRepositoryFactory.activity.trackContextUsage).toHaveBeenCalledWith({
        user_id: userId,
        context_scope: 'organization',
        context_id: orgId,
        usage_time: expect.any(Date),
        session_id: expect.any(String),
        features_used: ['context_resolution']
      })
    })

    it('should generate context insights for optimization', async () => {
      const insights = await contextService.getContextInsights(orgId, '30d')

      expect(insights.success).toBe(true)
      expect(insights.data).toEqual(
        expect.objectContaining({
          most_used_scopes: expect.any(Array),
          context_switch_frequency: expect.any(Number),
          popular_assets: expect.any(Array),
          usage_trends: expect.any(Object),
          recommendations: expect.any(Array)
        })
      )
    })

    it('should provide context recommendations based on usage', async () => {
      const mockUsageData = {
        recent_contexts: [
          { scope: 'vault', id: 'vault_1', frequency: 15 },
          { scope: 'asset', id: 'asset_1', frequency: 8 }
        ],
        user_patterns: {
          preferred_scope: 'organization',
          peak_usage_hours: [9, 10, 14, 15],
          common_workflows: ['document_review', 'compliance_check']
        }
      }

      mockRepositoryFactory.activity.trackContextUsage.mockResolvedValue(
        Result.success(mockUsageData)
      )

      const recommendations = await contextService.getContextRecommendations(userId)

      expect(recommendations.success).toBe(true)
      expect(recommendations.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'frequent_context',
            scope: expect.any(String),
            confidence: expect.any(Number),
            reason: expect.any(String)
          })
        ])
      )
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle database connection failures gracefully', async () => {
      mockRepositoryFactory.organizations.findById.mockRejectedValue(
        new Error('Database connection failed')
      )

      const context = await contextService.resolveContext({
        scope: 'organization',
        organizationId: orgId,
        userId
      })

      expect(context.success).toBe(false)
      expect(context.error).toContain('Database connection failed')
    })

    it('should provide fallback contexts when primary resolution fails', async () => {
      mockRepositoryFactory.vaults.findById.mockResolvedValue(
        Result.failure('Vault not found')
      )

      const context = await contextService.resolveContext({
        scope: 'vault',
        vaultId,
        userId,
        fallbackToGeneral: true
      })

      expect(context.success).toBe(true)
      expect(context.data?.scope).toBe('general')
      expect(context.data?.metadata.fallback_reason).toBe('Vault not found')
    })

    it('should handle malformed context requests', async () => {
      const context = await contextService.resolveContext({
        scope: 'invalid_scope' as any,
        userId
      })

      expect(context.success).toBe(false)
      expect(context.error).toContain('Invalid context scope')
    })
  })
})