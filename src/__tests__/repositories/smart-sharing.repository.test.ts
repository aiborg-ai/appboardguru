import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { 
  SmartSharingRepository, 
  CreateSmartSharingRuleData, 
  UpdateSmartSharingRuleData,
  SmartSharingRuleFilters 
} from '../../lib/repositories/smart-sharing.repository'
import { SupabaseClient } from '@supabase/supabase-js'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    select: vi.fn(() => ({
      eq: vi.fn(),
      gte: vi.fn(),
      lte: vi.fn(),
      order: vi.fn(),
      single: vi.fn()
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn()
    }))
  })),
  sql: vi.fn((query) => query)
} as unknown as SupabaseClient

describe('SmartSharingRepository', () => {
  let repository: SmartSharingRepository
  let mockFrom: Mock

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new SmartSharingRepository(mockSupabaseClient)
    mockFrom = mockSupabaseClient.from as Mock
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('create', () => {
    it('should create smart sharing rule successfully', async () => {
      const ruleData: CreateSmartSharingRuleData = {
        user_id: 'user123',
        organization_id: 'org456',
        name: 'Financial Reports Auto Share',
        description: 'Automatically share financial reports with board members',
        conditions: {
          file_types: ['pdf', 'xlsx'],
          content_keywords: ['financial', 'budget', 'revenue'],
          organization_domains: ['company.com'],
          security_classification: ['confidential'],
          file_size_limit: 10485760, // 10MB
          author_patterns: ['finance@*']
        },
        actions: {
          auto_share_with: ['board@company.com'],
          notification_recipients: ['admin@company.com'],
          apply_tags: ['financial', 'board-ready'],
          set_permissions: {
            can_view: true,
            can_download: false,
            can_share: false
          }
        },
        is_active: true,
        priority: 5
      }

      const expectedRule = {
        id: 'rule_123',
        ...ruleData,
        trigger_count: 0,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      }

      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: expectedRule,
              error: null
            })
          })
        })
      })

      const result = await repository.create(ruleData)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        name: 'Financial Reports Auto Share',
        user_id: 'user123',
        conditions: expect.objectContaining({
          file_types: ['pdf', 'xlsx'],
          content_keywords: ['financial', 'budget', 'revenue']
        }),
        actions: expect.objectContaining({
          auto_share_with: ['board@company.com']
        }),
        is_active: true,
        priority: 5
      })
      expect(mockFrom).toHaveBeenCalledWith('smart_sharing_rules')
    })

    it('should apply default values for optional fields', async () => {
      const minimalRuleData: CreateSmartSharingRuleData = {
        user_id: 'user123',
        name: 'Simple Rule',
        conditions: {
          file_types: ['txt']
        },
        actions: {
          auto_share_with: ['test@example.com'],
          notification_recipients: [],
          apply_tags: [],
          set_permissions: {}
        }
      }

      let capturedData: any
      mockFrom.mockReturnValue({
        insert: vi.fn().mockImplementation((data) => {
          capturedData = data
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...data, id: 'rule123' },
                error: null
              })
            })
          }
        })
      })

      const result = await repository.create(minimalRuleData)

      expect(result.success).toBe(true)
      expect(capturedData.is_active).toBe(true) // Default value
      expect(capturedData.priority).toBe(1) // Default value
      expect(capturedData.trigger_count).toBe(0) // Default value
    })

    it('should handle database errors during creation', async () => {
      const ruleData: CreateSmartSharingRuleData = {
        user_id: 'user123',
        name: 'Test Rule',
        conditions: { file_types: ['pdf'] },
        actions: { auto_share_with: [], notification_recipients: [], apply_tags: [], set_permissions: {} }
      }

      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Unique constraint violation')
            })
          })
        })
      })

      const result = await repository.create(ruleData)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('findById', () => {
    it('should find rule by ID', async () => {
      const ruleId = 'rule_123'
      const mockRule = {
        id: ruleId,
        user_id: 'user123',
        name: 'Test Rule',
        conditions: { file_types: ['pdf'] },
        actions: { auto_share_with: ['test@example.com'] },
        is_active: true,
        priority: 1,
        trigger_count: 5
      }

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockRule,
              error: null
            })
          })
        })
      })

      const result = await repository.findById(ruleId)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject(mockRule)
    })

    it('should return null for non-existent rule', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          })
        })
      })

      const result = await repository.findById('nonexistent')

      expect(result.success).toBe(true)
      expect(result.data).toBeNull()
    })
  })

  describe('findByUser', () => {
    it('should find rules by user with filters', async () => {
      const userId = 'user123'
      const filters: SmartSharingRuleFilters = {
        organization_id: 'org456',
        is_active: true,
        priority_min: 3,
        priority_max: 8,
        created_after: new Date('2024-01-01'),
        created_before: new Date('2024-12-31')
      }

      const mockRules = [
        {
          id: 'rule1',
          user_id: userId,
          name: 'High Priority Rule',
          priority: 5,
          is_active: true,
          conditions: { file_types: ['pdf'] },
          actions: { auto_share_with: [] }
        },
        {
          id: 'rule2',
          user_id: userId,
          name: 'Medium Priority Rule',
          priority: 3,
          is_active: true,
          conditions: { file_types: ['docx'] },
          actions: { auto_share_with: [] }
        }
      ]

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockRules,
          error: null
        })
      }

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery)
      })

      const result = await repository.findByUser(userId, filters)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', userId)
      expect(mockQuery.eq).toHaveBeenCalledWith('organization_id', 'org456')
      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true)
      expect(mockQuery.gte).toHaveBeenCalledWith('priority', 3)
      expect(mockQuery.lte).toHaveBeenCalledWith('priority', 8)
      expect(mockQuery.order).toHaveBeenCalledWith('priority', { ascending: false })
    })

    it('should work without filters', async () => {
      const userId = 'user123'

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery)
      })

      const result = await repository.findByUser(userId)

      expect(result.success).toBe(true)
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', userId)
      expect(mockQuery.order).toHaveBeenCalledWith('priority', { ascending: false })
    })
  })

  describe('findActiveRules', () => {
    it('should find all active rules', async () => {
      const mockActiveRules = [
        {
          id: 'rule1',
          name: 'Active Rule 1',
          is_active: true,
          priority: 10
        },
        {
          id: 'rule2',
          name: 'Active Rule 2',
          is_active: true,
          priority: 5
        }
      ]

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockActiveRules,
          error: null
        })
      }

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery)
      })

      const result = await repository.findActiveRules()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true)
      expect(mockQuery.order).toHaveBeenCalledWith('priority', { ascending: false })
    })

    it('should filter by user and organization', async () => {
      const userId = 'user123'
      const organizationId = 'org456'

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery)
      })

      const result = await repository.findActiveRules(userId, organizationId)

      expect(result.success).toBe(true)
      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true)
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', userId)
      expect(mockQuery.eq).toHaveBeenCalledWith('organization_id', organizationId)
    })
  })

  describe('update', () => {
    it('should update rule successfully', async () => {
      const ruleId = 'rule_123'
      const updates: UpdateSmartSharingRuleData = {
        name: 'Updated Rule Name',
        is_active: false,
        priority: 8,
        conditions: {
          file_types: ['pdf', 'docx', 'xlsx']
        }
      }

      const updatedRule = {
        id: ruleId,
        ...updates,
        updated_at: '2024-01-02T10:00:00Z'
      }

      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedRule,
                error: null
              })
            })
          })
        })
      })

      const result = await repository.update(ruleId, updates)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        name: 'Updated Rule Name',
        is_active: false,
        priority: 8
      })
    })

    it('should handle non-existent rule updates', async () => {
      const ruleId = 'nonexistent'
      const updates: UpdateSmartSharingRuleData = {
        name: 'New Name'
      }

      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }
              })
            })
          })
        })
      })

      const result = await repository.update(ruleId, updates)

      expect(result.success).toBe(false)
      expect(result.error.type).toBe('not_found')
    })
  })

  describe('delete', () => {
    it('should delete rule successfully', async () => {
      const ruleId = 'rule_123'

      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        })
      })

      const result = await repository.delete(ruleId)

      expect(result.success).toBe(true)
    })

    it('should handle delete errors', async () => {
      const ruleId = 'rule_123'

      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: new Error('Foreign key constraint')
          })
        })
      })

      const result = await repository.delete(ruleId)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('incrementTriggerCount', () => {
    it('should increment trigger count and update last triggered', async () => {
      const ruleId = 'rule_123'

      let capturedUpdateData: any
      mockFrom.mockReturnValue({
        update: vi.fn().mockImplementation((data) => {
          capturedUpdateData = data
          return {
            eq: vi.fn().mockResolvedValue({
              error: null
            })
          }
        })
      })

      const result = await repository.incrementTriggerCount(ruleId)

      expect(result.success).toBe(true)
      expect(capturedUpdateData.last_triggered).toBeDefined()
      expect(capturedUpdateData.updated_at).toBeDefined()
      expect(capturedUpdateData.trigger_count).toBe('trigger_count + 1')
    })
  })

  describe('findByPriority', () => {
    it('should find rules above minimum priority', async () => {
      const minPriority = 5
      const mockHighPriorityRules = [
        { id: 'rule1', priority: 10, is_active: true },
        { id: 'rule2', priority: 7, is_active: true },
        { id: 'rule3', priority: 5, is_active: true }
      ]

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockHighPriorityRules,
          error: null
        })
      }

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery)
      })

      const result = await repository.findByPriority(minPriority)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(3)
      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true)
      expect(mockQuery.gte).toHaveBeenCalledWith('priority', minPriority)
      expect(mockQuery.order).toHaveBeenCalledWith('priority', { ascending: false })
    })

    it('should use default minimum priority of 1', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery)
      })

      const result = await repository.findByPriority()

      expect(result.success).toBe(true)
      expect(mockQuery.gte).toHaveBeenCalledWith('priority', 1)
    })
  })

  describe('getUsageStats', () => {
    it('should calculate usage statistics for user', async () => {
      const userId = 'user123'
      const mockRules = [
        {
          id: 'rule1',
          is_active: true,
          trigger_count: 25
        },
        {
          id: 'rule2',
          is_active: false,
          trigger_count: 10
        },
        {
          id: 'rule3',
          is_active: true,
          trigger_count: 5
        }
      ]

      const mockQuery = {
        eq: vi.fn().mockResolvedValue({
          data: mockRules,
          error: null
        })
      }

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery)
      })

      const result = await repository.getUsageStats(userId)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        total_rules: 3,
        active_rules: 2,
        total_triggers: 40, // 25 + 10 + 5
        most_triggered_rule: expect.objectContaining({
          id: 'rule1',
          trigger_count: 25
        })
      })
    })

    it('should work with organization filter', async () => {
      const organizationId = 'org456'

      const mockQuery = {
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery)
      })

      const result = await repository.getUsageStats(undefined, organizationId)

      expect(result.success).toBe(true)
      expect(mockQuery.eq).toHaveBeenCalledWith('organization_id', organizationId)
    })

    it('should handle empty rule set', async () => {
      const mockQuery = {
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery)
      })

      const result = await repository.getUsageStats('user123')

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        total_rules: 0,
        active_rules: 0,
        total_triggers: 0,
        most_triggered_rule: undefined
      })
    })
  })

  describe('Complex rule conditions and actions', () => {
    it('should handle complex file type patterns', async () => {
      const ruleData: CreateSmartSharingRuleData = {
        user_id: 'user123',
        name: 'Complex File Rule',
        conditions: {
          file_types: ['pdf', 'xlsx', 'docx', 'pptx'],
          content_keywords: [
            'quarterly report', 
            'financial statement', 
            'board meeting',
            'strategic plan'
          ],
          organization_domains: [
            'company.com',
            'subsidiary.com',
            'partner.org'
          ],
          security_classification: [
            'public',
            'internal',
            'confidential'
          ],
          file_size_limit: 52428800, // 50MB
          author_patterns: [
            'finance@*',
            '*@board.company.com',
            'ceo@*'
          ]
        },
        actions: {
          auto_share_with: [
            'board-members@company.com',
            'audit-committee@company.com',
            'legal@company.com'
          ],
          notification_recipients: [
            'compliance@company.com',
            'secretary@company.com'
          ],
          apply_tags: [
            'governance',
            'financial',
            'board-approved',
            'confidential'
          ],
          set_permissions: {
            can_view: true,
            can_download: true,
            can_share: false
          }
        },
        is_active: true,
        priority: 10
      }

      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...ruleData, id: 'complex_rule' },
              error: null
            })
          })
        })
      })

      const result = await repository.create(ruleData)

      expect(result.success).toBe(true)
      expect(result.data.conditions.file_types).toHaveLength(4)
      expect(result.data.conditions.content_keywords).toHaveLength(4)
      expect(result.data.actions.auto_share_with).toHaveLength(3)
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle network timeouts', async () => {
      const ruleData: CreateSmartSharingRuleData = {
        user_id: 'user123',
        name: 'Test Rule',
        conditions: { file_types: ['pdf'] },
        actions: { auto_share_with: [], notification_recipients: [], apply_tags: [], set_permissions: {} }
      }

      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error('Network timeout'))
          })
        })
      })

      const result = await repository.create(ruleData)

      expect(result.success).toBe(false)
      expect(result.error.type).toBe('internal')
    })

    it('should validate rule priority ranges', async () => {
      const extremePriorities = [-1, 0, 1, 5, 10, 100, 1000]
      
      for (const priority of extremePriorities) {
        const ruleData: CreateSmartSharingRuleData = {
          user_id: 'user123',
          name: `Priority ${priority} Rule`,
          conditions: { file_types: ['pdf'] },
          actions: { auto_share_with: [], notification_recipients: [], apply_tags: [], set_permissions: {} },
          priority
        }

        mockFrom.mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...ruleData, id: `rule_${priority}` },
                error: null
              })
            })
          })
        })

        const result = await repository.create(ruleData)
        expect(result.success).toBe(true)
        expect(result.data.priority).toBe(priority)
      }
    })

    it('should handle malformed condition objects', async () => {
      const malformedRuleData = {
        user_id: 'user123',
        name: 'Malformed Rule',
        conditions: {
          file_types: 'not_an_array' as any,
          content_keywords: null as any,
          file_size_limit: 'invalid_number' as any
        },
        actions: {
          auto_share_with: 'not_array' as any,
          set_permissions: 'invalid_object' as any
        }
      }

      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Invalid JSON structure')
            })
          })
        })
      })

      const result = await repository.create(malformedRuleData as any)

      expect(result.success).toBe(false)
    })
  })
})