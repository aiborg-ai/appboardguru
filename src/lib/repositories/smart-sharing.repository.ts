import { BaseRepository } from './base.repository'
import { Result, success, failure, RepositoryError } from './result'
import type { Database } from '../../types/database'

export interface SmartSharingRule {
  id: string
  user_id: string
  organization_id?: string
  name: string
  description?: string
  conditions: {
    file_types?: string[]
    content_keywords?: string[]
    organization_domains?: string[]
    security_classification?: string[]
    file_size_limit?: number
    author_patterns?: string[]
  }
  actions: {
    auto_share_with: string[]
    notification_recipients: string[]
    apply_tags: string[]
    set_permissions: {
      can_view?: boolean
      can_download?: boolean
      can_share?: boolean
    }
  }
  is_active: boolean
  priority: number
  created_at: string
  updated_at: string
  last_triggered?: string
  trigger_count: number
}

export interface CreateSmartSharingRuleData {
  user_id: string
  organization_id?: string
  name: string
  description?: string
  conditions: SmartSharingRule['conditions']
  actions: SmartSharingRule['actions']
  is_active?: boolean
  priority?: number
}

export interface UpdateSmartSharingRuleData {
  name?: string
  description?: string
  conditions?: SmartSharingRule['conditions']
  actions?: SmartSharingRule['actions']
  is_active?: boolean
  priority?: number
}

export interface SmartSharingRuleFilters {
  user_id?: string
  organization_id?: string
  is_active?: boolean
  priority_min?: number
  priority_max?: number
  created_after?: Date
  created_before?: Date
}

export class SmartSharingRepository extends BaseRepository {
  async create(ruleData: CreateSmartSharingRuleData): Promise<Result<SmartSharingRule>> {
    try {
      const rule: Omit<SmartSharingRule, 'id' | 'created_at' | 'updated_at'> & {
        id?: string
        created_at?: string
        updated_at?: string
      } = {
        user_id: ruleData.user_id,
        organization_id: ruleData.organization_id,
        name: ruleData.name,
        description: ruleData.description,
        conditions: ruleData.conditions,
        actions: ruleData.actions,
        is_active: ruleData.is_active ?? true,
        priority: ruleData.priority ?? 1,
        trigger_count: 0
      }

      const { data, error } = await this.supabase
        .from('smart_sharing_rules')
        .insert(rule)
        .select()
        .single()

      if (error) {
        return failure(RepositoryError.create('Failed to create smart sharing rule', error))
      }

      return success(data)
    } catch (error) {
      return failure(RepositoryError.internal('Unexpected error creating smart sharing rule'))
    }
  }

  async findById(id: string): Promise<Result<SmartSharingRule | null>> {
    try {
      const { data, error } = await this.supabase
        .from('smart_sharing_rules')
        .select('*')
        .eq('id', id)
        .single()

      if (error && error.code !== 'PGRST116') {
        return failure(RepositoryError.notFound('Smart sharing rule', id))
      }

      return success(data || null)
    } catch (error) {
      return failure(RepositoryError.internal('Unexpected error fetching smart sharing rule'))
    }
  }

  async findByUser(userId: string, filters?: SmartSharingRuleFilters): Promise<Result<SmartSharingRule[]>> {
    try {
      let query = this.supabase
        .from('smart_sharing_rules')
        .select('*')
        .eq('user_id', userId)

      if (filters?.organization_id) {
        query = query.eq('organization_id', filters.organization_id)
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active)
      }

      if (filters?.priority_min) {
        query = query.gte('priority', filters.priority_min)
      }

      if (filters?.priority_max) {
        query = query.lte('priority', filters.priority_max)
      }

      if (filters?.created_after) {
        query = query.gte('created_at', filters.created_after.toISOString())
      }

      if (filters?.created_before) {
        query = query.lte('created_at', filters.created_before.toISOString())
      }

      const { data, error } = await query.order('priority', { ascending: false })

      if (error) {
        return failure(RepositoryError.query('Failed to fetch smart sharing rules', error))
      }

      return success(data || [])
    } catch (error) {
      return failure(RepositoryError.internal('Unexpected error fetching smart sharing rules'))
    }
  }

  async findActiveRules(userId?: string, organizationId?: string): Promise<Result<SmartSharingRule[]>> {
    try {
      let query = this.supabase
        .from('smart_sharing_rules')
        .select('*')
        .eq('is_active', true)

      if (userId) {
        query = query.eq('user_id', userId)
      }

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query.order('priority', { ascending: false })

      if (error) {
        return failure(RepositoryError.query('Failed to fetch active smart sharing rules', error))
      }

      return success(data || [])
    } catch (error) {
      return failure(RepositoryError.internal('Unexpected error fetching active smart sharing rules'))
    }
  }

  async update(id: string, updates: UpdateSmartSharingRuleData): Promise<Result<SmartSharingRule>> {
    try {
      const { data, error } = await this.supabase
        .from('smart_sharing_rules')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return failure(RepositoryError.notFound('Smart sharing rule', id))
        }
        return failure(RepositoryError.update('Failed to update smart sharing rule', error))
      }

      return success(data)
    } catch (error) {
      return failure(RepositoryError.internal('Unexpected error updating smart sharing rule'))
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('smart_sharing_rules')
        .delete()
        .eq('id', id)

      if (error) {
        return failure(RepositoryError.delete('Failed to delete smart sharing rule', error))
      }

      return success(void 0)
    } catch (error) {
      return failure(RepositoryError.internal('Unexpected error deleting smart sharing rule'))
    }
  }

  async incrementTriggerCount(id: string): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('smart_sharing_rules')
        .update({
          trigger_count: this.supabase.sql`trigger_count + 1`,
          last_triggered: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        return failure(RepositoryError.update('Failed to increment trigger count', error))
      }

      return success(void 0)
    } catch (error) {
      return failure(RepositoryError.internal('Unexpected error incrementing trigger count'))
    }
  }

  async findByPriority(minPriority: number = 1): Promise<Result<SmartSharingRule[]>> {
    try {
      const { data, error } = await this.supabase
        .from('smart_sharing_rules')
        .select('*')
        .eq('is_active', true)
        .gte('priority', minPriority)
        .order('priority', { ascending: false })

      if (error) {
        return failure(RepositoryError.query('Failed to fetch rules by priority', error))
      }

      return success(data || [])
    } catch (error) {
      return failure(RepositoryError.internal('Unexpected error fetching rules by priority'))
    }
  }

  async getUsageStats(userId?: string, organizationId?: string): Promise<Result<{
    total_rules: number
    active_rules: number
    total_triggers: number
    most_triggered_rule?: SmartSharingRule
  }>> {
    try {
      let query = this.supabase
        .from('smart_sharing_rules')
        .select('*')

      if (userId) {
        query = query.eq('user_id', userId)
      }

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query

      if (error) {
        return failure(RepositoryError.query('Failed to fetch usage stats', error))
      }

      const rules = data || []
      const totalRules = rules.length
      const activeRules = rules.filter(rule => rule.is_active).length
      const totalTriggers = rules.reduce((sum, rule) => sum + (rule.trigger_count || 0), 0)
      const mostTriggeredRule = rules.reduce(
        (max, rule) => (rule.trigger_count > (max?.trigger_count || 0) ? rule : max),
        null as SmartSharingRule | null
      )

      return success({
        total_rules: totalRules,
        active_rules: activeRules,
        total_triggers: totalTriggers,
        most_triggered_rule: mostTriggeredRule || undefined
      })
    } catch (error) {
      return failure(RepositoryError.internal('Unexpected error calculating usage stats'))
    }
  }
}