import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { AuditRepository, CreateAuditLogData, AuditLogFilters } from '../../lib/repositories/audit.repository'
import { SupabaseClient } from '@supabase/supabase-js'
import { success, failure } from '../../lib/repositories/result'

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
      limit: vi.fn(),
      range: vi.fn(),
      single: vi.fn(),
      in: vi.fn()
    })),
    delete: vi.fn(() => ({
      lt: vi.fn(() => ({
        select: vi.fn()
      }))
    }))
  }))
} as unknown as SupabaseClient

describe('AuditRepository', () => {
  let repository: AuditRepository
  let mockFrom: Mock

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new AuditRepository(mockSupabaseClient)
    mockFrom = mockSupabaseClient.from as Mock
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('create', () => {
    it('should create audit log successfully', async () => {
      const auditData: CreateAuditLogData = {
        user_id: 'user123',
        organization_id: 'org456',
        action: 'LOGIN',
        resource_type: 'user',
        resource_id: 'user123',
        metadata: { ip_address: '192.168.1.1' },
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        severity: 'low',
        category: 'auth'
      }

      const expectedAuditLog = {
        id: 'audit_123',
        ...auditData,
        created_at: '2024-01-01T10:00:00Z'
      }

      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: expectedAuditLog,
              error: null
            })
          })
        })
      })

      const result = await repository.create(auditData)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        user_id: 'user123',
        action: 'LOGIN',
        severity: 'low',
        category: 'auth'
      })
      expect(mockFrom).toHaveBeenCalledWith('audit_logs')
    })

    it('should handle database errors during creation', async () => {
      const auditData: CreateAuditLogData = {
        action: 'INVALID_ACTION',
        resource_type: 'unknown'
      }

      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Constraint violation')
            })
          })
        })
      })

      const result = await repository.create(auditData)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should apply default values for optional fields', async () => {
      const minimalAuditData: CreateAuditLogData = {
        action: 'VIEW_DOCUMENT',
        resource_type: 'document',
        resource_id: 'doc123'
      }

      let capturedInsertData: any
      mockFrom.mockReturnValue({
        insert: vi.fn().mockImplementation((data) => {
          capturedInsertData = data
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...data, id: 'audit_123' },
                error: null
              })
            })
          }
        })
      })

      const result = await repository.create(minimalAuditData)

      expect(result.success).toBe(true)
      expect(capturedInsertData.severity).toBe('low')
      expect(capturedInsertData.category).toBe('data')
    })
  })

  describe('bulkCreate', () => {
    it('should create multiple audit logs in batch', async () => {
      const auditLogs: CreateAuditLogData[] = [
        {
          user_id: 'user1',
          action: 'CREATE_VAULT',
          resource_type: 'vault',
          resource_id: 'vault1',
          severity: 'medium',
          category: 'data'
        },
        {
          user_id: 'user2',
          action: 'DELETE_ASSET',
          resource_type: 'asset',
          resource_id: 'asset1',
          severity: 'high',
          category: 'security'
        }
      ]

      const expectedLogs = auditLogs.map((log, i) => ({
        id: `audit_${i + 1}`,
        ...log,
        created_at: '2024-01-01T10:00:00Z'
      }))

      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: expectedLogs,
            error: null
          })
        })
      })

      const result = await repository.bulkCreate(auditLogs)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data[0].action).toBe('CREATE_VAULT')
      expect(result.data[1].action).toBe('DELETE_ASSET')
    })

    it('should handle empty array input', async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })

      const result = await repository.bulkCreate([])

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(0)
    })
  })

  describe('findByFilters', () => {
    it('should find audit logs with user filter', async () => {
      const filters: AuditLogFilters = {
        user_id: 'user123',
        limit: 50
      }

      const mockLogs = [
        {
          id: 'audit1',
          user_id: 'user123',
          action: 'LOGIN',
          resource_type: 'user',
          severity: 'low',
          category: 'auth',
          created_at: '2024-01-01T10:00:00Z'
        }
      ]

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockLogs,
          error: null
        })
      }

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery)
      })

      const result = await repository.findByFilters(filters)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user123')
      expect(mockQuery.limit).toHaveBeenCalledWith(50)
    })

    it('should apply date range filters', async () => {
      const dateFrom = new Date('2024-01-01')
      const dateTo = new Date('2024-01-31')
      
      const filters: AuditLogFilters = {
        date_from: dateFrom,
        date_to: dateTo,
        severity: 'high'
      }

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery)
      })

      const result = await repository.findByFilters(filters)

      expect(result.success).toBe(true)
      expect(mockQuery.gte).toHaveBeenCalledWith('created_at', dateFrom.toISOString())
      expect(mockQuery.lte).toHaveBeenCalledWith('created_at', dateTo.toISOString())
      expect(mockQuery.eq).toHaveBeenCalledWith('severity', 'high')
    })

    it('should handle pagination with offset', async () => {
      const filters: AuditLogFilters = {
        limit: 25,
        offset: 50
      }

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery)
      })

      const result = await repository.findByFilters(filters)

      expect(result.success).toBe(true)
      expect(mockQuery.range).toHaveBeenCalledWith(50, 74) // offset to offset + limit - 1
    })
  })

  describe('findSecurityEvents', () => {
    it('should find high/critical security and auth events', async () => {
      const mockSecurityEvents = [
        {
          id: 'security1',
          action: 'FAILED_LOGIN_ATTEMPT',
          category: 'auth',
          severity: 'high',
          created_at: '2024-01-01T10:00:00Z'
        },
        {
          id: 'security2',
          action: 'UNAUTHORIZED_ACCESS',
          category: 'security',
          severity: 'critical',
          created_at: '2024-01-01T11:00:00Z'
        }
      ]

      const mockQuery = {
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockSecurityEvents,
          error: null
        })
      }

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery)
      })

      const result = await repository.findSecurityEvents('org123', 50)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(mockQuery.in).toHaveBeenCalledWith('category', ['auth', 'security'])
      expect(mockQuery.in).toHaveBeenCalledWith('severity', ['high', 'critical'])
      expect(mockQuery.eq).toHaveBeenCalledWith('organization_id', 'org123')
      expect(mockQuery.limit).toHaveBeenCalledWith(50)
    })

    it('should work without organization filter', async () => {
      const mockQuery = {
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery)
      })

      const result = await repository.findSecurityEvents(undefined, 25)

      expect(result.success).toBe(true)
      expect(mockQuery.in).toHaveBeenCalledWith('category', ['auth', 'security'])
      expect(mockQuery.limit).toHaveBeenCalledWith(25)
    })
  })

  describe('getStatsByPeriod', () => {
    it('should calculate statistics for day period', async () => {
      const mockLogs = [
        {
          action: 'LOGIN',
          category: 'auth',
          severity: 'low',
          created_at: '2024-01-01T10:00:00Z'
        },
        {
          action: 'CREATE_ASSET',
          category: 'data',
          severity: 'medium',
          created_at: '2024-01-01T11:00:00Z'
        },
        {
          action: 'LOGIN',
          category: 'auth',
          severity: 'low',
          created_at: '2024-01-01T12:00:00Z'
        }
      ]

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({
          data: mockLogs,
          error: null
        })
      }

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery)
      })

      const result = await repository.getStatsByPeriod('day', 'org123')

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        total_day: 3,
        category_auth: 2,
        category_data: 1,
        severity_low: 2,
        severity_medium: 1,
        action_LOGIN: 2,
        action_CREATE_ASSET: 1
      })
    })

    it('should handle week and month periods', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery)
      })

      // Test week period
      const weekResult = await repository.getStatsByPeriod('week')
      expect(weekResult.success).toBe(true)

      // Test month period
      const monthResult = await repository.getStatsByPeriod('month')
      expect(monthResult.success).toBe(true)
    })
  })

  describe('cleanupOldLogs', () => {
    it('should delete logs older than retention period', async () => {
      const deletedLogs = [{ id: 'old1' }, { id: 'old2' }]

      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: deletedLogs,
              error: null
            })
          })
        })
      })

      const result = await repository.cleanupOldLogs(30) // 30 days retention

      expect(result.success).toBe(true)
      expect(result.data).toBe(2) // Number of deleted logs
    })

    it('should use default retention period of 90 days', async () => {
      let capturedCutoffDate: string

      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          lt: vi.fn().mockImplementation((date) => {
            capturedCutoffDate = date
            return {
              select: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            }
          })
        })
      })

      const result = await repository.cleanupOldLogs()

      expect(result.success).toBe(true)
      
      // Verify date is approximately 90 days ago
      const cutoffTime = new Date(capturedCutoffDate).getTime()
      const expectedTime = Date.now() - (90 * 24 * 60 * 60 * 1000)
      const timeDiff = Math.abs(cutoffTime - expectedTime)
      expect(timeDiff).toBeLessThan(60000) // Within 1 minute tolerance
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle null metadata gracefully', async () => {
      const auditData: CreateAuditLogData = {
        action: 'TEST_ACTION',
        resource_type: 'test',
        metadata: null as any
      }

      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...auditData, id: 'audit123' },
              error: null
            })
          })
        })
      })

      const result = await repository.create(auditData)

      expect(result.success).toBe(true)
    })

    it('should handle complex filter combinations', async () => {
      const complexFilters: AuditLogFilters = {
        user_id: 'user123',
        organization_id: 'org456',
        action: 'COMPLEX_ACTION',
        resource_type: 'complex_resource',
        severity: 'critical',
        category: 'security',
        date_from: new Date('2024-01-01'),
        date_to: new Date('2024-12-31'),
        limit: 100,
        offset: 200
      }

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery)
      })

      const result = await repository.findByFilters(complexFilters)

      expect(result.success).toBe(true)
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user123')
      expect(mockQuery.eq).toHaveBeenCalledWith('organization_id', 'org456')
      expect(mockQuery.eq).toHaveBeenCalledWith('action', 'COMPLEX_ACTION')
      expect(mockQuery.eq).toHaveBeenCalledWith('resource_type', 'complex_resource')
      expect(mockQuery.eq).toHaveBeenCalledWith('severity', 'critical')
      expect(mockQuery.eq).toHaveBeenCalledWith('category', 'security')
    })

    it('should handle database connection failures', async () => {
      const auditData: CreateAuditLogData = {
        action: 'TEST_ACTION',
        resource_type: 'test'
      }

      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error('Connection timeout'))
          })
        })
      })

      const result = await repository.create(auditData)

      expect(result.success).toBe(false)
      expect(result.error.type).toBe('internal')
    })

    it('should validate severity and category enums', async () => {
      const validSeverities = ['low', 'medium', 'high', 'critical'] as const
      const validCategories = ['auth', 'data', 'system', 'security', 'compliance'] as const

      for (const severity of validSeverities) {
        for (const category of validCategories) {
          const auditData: CreateAuditLogData = {
            action: `TEST_${severity}_${category}`,
            resource_type: 'test',
            severity,
            category
          }

          mockFrom.mockReturnValue({
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...auditData, id: 'test' },
                  error: null
                })
              })
            })
          })

          const result = await repository.create(auditData)
          expect(result.success).toBe(true)
        }
      }
    })
  })
})