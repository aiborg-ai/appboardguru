import { BaseRepository } from './base.repository'
import { Result, success, failure, RepositoryError } from './result'
import type { Database } from '../../types/database'

export interface AuditLog {
  id: string
  user_id?: string
  organization_id?: string
  action: string
  resource_type: string
  resource_id?: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  metadata?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'auth' | 'data' | 'system' | 'security' | 'compliance'
}

export interface CreateAuditLogData {
  user_id?: string
  organization_id?: string
  action: string
  resource_type: string
  resource_id?: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  metadata?: Record<string, any>
  ip_address?: string
  user_agent?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  category?: 'auth' | 'data' | 'system' | 'security' | 'compliance'
}

export interface AuditLogFilters {
  user_id?: string
  organization_id?: string
  action?: string
  resource_type?: string
  resource_id?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  category?: 'auth' | 'data' | 'system' | 'security' | 'compliance'
  date_from?: Date
  date_to?: Date
  limit?: number
  offset?: number
}

export class AuditRepository extends BaseRepository {
  async create(auditData: CreateAuditLogData): Promise<Result<AuditLog>> {
    try {
      const auditLog: Omit<AuditLog, 'id' | 'created_at'> & { id?: string; created_at?: string } = {
        user_id: auditData.user_id,
        organization_id: auditData.organization_id,
        action: auditData.action,
        resource_type: auditData.resource_type,
        resource_id: auditData.resource_id,
        old_values: auditData.old_values,
        new_values: auditData.new_values,
        metadata: auditData.metadata,
        ip_address: auditData.ip_address,
        user_agent: auditData.user_agent,
        severity: auditData.severity || 'low',
        category: auditData.category || 'data'
      }

      const { data, error } = await this.supabase
        .from('audit_logs')
        .insert(auditLog)
        .select()
        .single()

      if (error) {
        return failure(RepositoryError.create('Failed to create audit log', error))
      }

      return success(data)
    } catch (error) {
      return failure(RepositoryError.internal('Unexpected error creating audit log'))
    }
  }

  async bulkCreate(auditLogs: CreateAuditLogData[]): Promise<Result<AuditLog[]>> {
    try {
      const auditLogRecords = auditLogs.map(auditData => ({
        user_id: auditData.user_id,
        organization_id: auditData.organization_id,
        action: auditData.action,
        resource_type: auditData.resource_type,
        resource_id: auditData.resource_id,
        old_values: auditData.old_values,
        new_values: auditData.new_values,
        metadata: auditData.metadata,
        ip_address: auditData.ip_address,
        user_agent: auditData.user_agent,
        severity: auditData.severity || 'low',
        category: auditData.category || 'data'
      }))

      const { data, error } = await this.supabase
        .from('audit_logs')
        .insert(auditLogRecords)
        .select()

      if (error) {
        return failure(RepositoryError.create('Failed to create audit logs', error))
      }

      return success(data || [])
    } catch (error) {
      return failure(RepositoryError.internal('Unexpected error creating audit logs'))
    }
  }

  async findByFilters(filters: AuditLogFilters): Promise<Result<AuditLog[]>> {
    try {
      let query = this.supabase
        .from('audit_logs')
        .select('*')

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id)
      }

      if (filters.organization_id) {
        query = query.eq('organization_id', filters.organization_id)
      }

      if (filters.action) {
        query = query.eq('action', filters.action)
      }

      if (filters.resource_type) {
        query = query.eq('resource_type', filters.resource_type)
      }

      if (filters.resource_id) {
        query = query.eq('resource_id', filters.resource_id)
      }

      if (filters.severity) {
        query = query.eq('severity', filters.severity)
      }

      if (filters.category) {
        query = query.eq('category', filters.category)
      }

      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from.toISOString())
      }

      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to.toISOString())
      }

      query = query.order('created_at', { ascending: false })

      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
      }

      const { data, error } = await query

      if (error) {
        return failure(RepositoryError.query('Failed to fetch audit logs', error))
      }

      return success(data || [])
    } catch (error) {
      return failure(RepositoryError.internal('Unexpected error fetching audit logs'))
    }
  }

  async findById(id: string): Promise<Result<AuditLog | null>> {
    try {
      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .eq('id', id)
        .single()

      if (error && error.code !== 'PGRST116') {
        return failure(RepositoryError.notFound('Audit log', id))
      }

      return success(data || null)
    } catch (error) {
      return failure(RepositoryError.internal('Unexpected error fetching audit log'))
    }
  }

  async findByResource(resourceType: string, resourceId: string): Promise<Result<AuditLog[]>> {
    try {
      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: false })

      if (error) {
        return failure(RepositoryError.query('Failed to fetch resource audit logs', error))
      }

      return success(data || [])
    } catch (error) {
      return failure(RepositoryError.internal('Unexpected error fetching resource audit logs'))
    }
  }

  async findSecurityEvents(organizationId?: string, limit: number = 50): Promise<Result<AuditLog[]>> {
    try {
      let query = this.supabase
        .from('audit_logs')
        .select('*')
        .in('category', ['auth', 'security'])
        .in('severity', ['high', 'critical'])

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        return failure(RepositoryError.query('Failed to fetch security events', error))
      }

      return success(data || [])
    } catch (error) {
      return failure(RepositoryError.internal('Unexpected error fetching security events'))
    }
  }

  async getStatsByPeriod(
    period: 'day' | 'week' | 'month',
    organizationId?: string
  ): Promise<Result<Record<string, number>>> {
    try {
      let query = this.supabase
        .from('audit_logs')
        .select('action, category, severity, created_at')

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      // Calculate date range based on period
      const now = new Date()
      let fromDate: Date

      switch (period) {
        case 'day':
          fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case 'week':
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      }

      const { data, error } = await query.gte('created_at', fromDate.toISOString())

      if (error) {
        return failure(RepositoryError.query('Failed to fetch audit statistics', error))
      }

      // Aggregate data
      const stats: Record<string, number> = {}
      
      if (data) {
        data.forEach((log: any) => {
          stats[`total_${period}`] = (stats[`total_${period}`] || 0) + 1
          stats[`category_${log.category}`] = (stats[`category_${log.category}`] || 0) + 1
          stats[`severity_${log.severity}`] = (stats[`severity_${log.severity}`] || 0) + 1
          stats[`action_${log.action}`] = (stats[`action_${log.action}`] || 0) + 1
        })
      }

      return success(stats)
    } catch (error) {
      return failure(RepositoryError.internal('Unexpected error calculating audit statistics'))
    }
  }

  async cleanupOldLogs(retentionDays: number = 90): Promise<Result<number>> {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

      const { data, error } = await this.supabase
        .from('audit_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id')

      if (error) {
        return failure(RepositoryError.delete('Failed to cleanup old audit logs', error))
      }

      return success(data?.length || 0)
    } catch (error) {
      return failure(RepositoryError.internal('Unexpected error cleaning up audit logs'))
    }
  }
}