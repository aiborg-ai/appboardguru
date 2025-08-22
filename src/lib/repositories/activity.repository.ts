import { BaseRepository } from './base.repository'
import { Result, success, failure, RepositoryError } from './result'
import { 
  UserId, 
  OrganizationId, 
  ActivityLogId,
  QueryOptions, 
  PaginatedResult,
  AuditLogEntry,
  createUserId,
  createOrganizationId,
  createActivityLogId
} from './types'
import type { Database } from '../../types/database'

type AuditLog = Database['public']['Tables']['audit_logs']['Row']
type UserActivityFeed = Database['public']['Tables']['user_activity_feed']['Row']
type ActivitySession = Database['public']['Tables']['activity_sessions']['Row']
type ActivityInsights = Database['public']['Tables']['activity_insights']['Row']

export interface ActivityLogWithDetails extends AuditLog {
  user?: {
    id: string
    full_name: string | null
    email: string
    avatar_url: string | null
  }
  organization?: {
    id: string
    name: string
    slug: string
  }
}

export interface ActivityFilters {
  userId?: UserId
  organizationId?: OrganizationId
  eventType?: string
  eventCategory?: string
  action?: string
  resourceType?: string
  resourceId?: string
  outcome?: 'success' | 'failure' | 'partial'
  severity?: 'low' | 'medium' | 'high' | 'critical'
  dateFrom?: Date
  dateTo?: Date
  ipAddress?: string
  userAgent?: string
}

export interface ActivityStats {
  totalActivities: number
  activitiesByType: Record<string, number>
  activitiesByCategory: Record<string, number>
  activitiesByOutcome: Record<string, number>
  activitiesByUser: Array<{
    user_id: string
    user_name: string | null
    count: number
    last_activity: string
  }>
  timelineData: Array<{
    date: string
    count: number
    success_count: number
    failure_count: number
  }>
  topResources: Array<{
    resource_type: string
    resource_id: string
    count: number
  }>
  criticalEvents: number
  failureRate: number
}

export interface UserSession {
  user_id: UserId
  organization_id?: OrganizationId
  session_start: Date
  session_end?: Date
  ip_address?: string
  user_agent?: string
  pages_visited: number
  actions_performed: number
  duration_minutes?: number
  device_type?: 'desktop' | 'mobile' | 'tablet'
  browser?: string
  referrer?: string
}

export interface ActivityInsight {
  insight_type: 'trend' | 'anomaly' | 'pattern' | 'recommendation'
  title: string
  description: string
  severity: 'low' | 'medium' | 'high'
  confidence_score: number
  data: Record<string, unknown>
  generated_at: Date
  is_actionable: boolean
  action_url?: string
}

export interface BehaviorPattern {
  pattern_id: string
  user_id: UserId
  pattern_type: 'login_time' | 'feature_usage' | 'navigation' | 'session_duration'
  pattern_data: Record<string, unknown>
  confidence_score: number
  first_seen: Date
  last_seen: Date
  occurrence_count: number
}

export class ActivityRepository extends BaseRepository {
  protected getEntityName(): string {
    return 'Activity'
  }

  protected getSearchFields(): string[] {
    return ['event_description', 'resource_type', 'action']
  }

  async findById(id: ActivityLogId): Promise<Result<AuditLog>> {
    const { data, error } = await this.supabase
      .from('audit_logs')
      .select('*')
      .eq('id', id)
      .single()

    return this.createResult(data, error, 'findById')
  }

  async findWithDetails(id: ActivityLogId): Promise<Result<ActivityLogWithDetails>> {
    const { data, error } = await this.supabase
      .from('audit_logs')
      .select(`
        *,
        user:users(id, full_name, email, avatar_url),
        organization:organizations(id, name, slug)
      `)
      .eq('id', id)
      .single()

    return this.createResult(data as ActivityLogWithDetails, error, 'findWithDetails')
  }

  async findByUser(
    userId: UserId,
    filters: ActivityFilters = {},
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<ActivityLogWithDetails>>> {
    let query = this.supabase
      .from('audit_logs')
      .select(`
        *,
        user:users(id, full_name, email, avatar_url),
        organization:organizations(id, name, slug)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    query = this.applyFilters(query, filters)
    query = this.applyQueryOptions(query, options)

    const { data, error, count } = await query

    return this.createPaginatedResult(data as ActivityLogWithDetails[] || [], count, options, error)
  }

  async findByOrganization(
    organizationId: OrganizationId,
    userId: UserId,
    filters: ActivityFilters = {},
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<ActivityLogWithDetails>>> {
    // Check user has access to organization
    const permissionCheck = await this.checkOrganizationPermission(userId, organizationId, ['admin', 'owner'])
    if (!permissionCheck.success) {
      return permissionCheck
    }

    let query = this.supabase
      .from('audit_logs')
      .select(`
        *,
        user:users(id, full_name, email, avatar_url),
        organization:organizations(id, name, slug)
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    query = this.applyFilters(query, filters)
    query = this.applyQueryOptions(query, options)

    const { data, error, count } = await query

    return this.createPaginatedResult(data as ActivityLogWithDetails[] || [], count, options, error)
  }

  async logActivity(entry: AuditLogEntry): Promise<Result<AuditLog>> {
    const insertData = {
      user_id: entry.user_id,
      organization_id: entry.organization_id,
      event_type: entry.event_type,
      event_category: entry.event_category,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id,
      event_description: entry.event_description,
      outcome: entry.outcome,
      severity: entry.severity,
      details: entry.details,
      ip_address: entry.ip_address,
      user_agent: entry.user_agent,
      created_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('audit_logs')
      .insert(insertData)
      .select()
      .single()

    return this.createResult(data, error, 'logActivity')
  }

  async bulkLogActivities(entries: AuditLogEntry[]): Promise<Result<AuditLog[]>> {
    if (entries.length === 0) {
      return success([])
    }

    const insertData = entries.map(entry => ({
      user_id: entry.user_id,
      organization_id: entry.organization_id,
      event_type: entry.event_type,
      event_category: entry.event_category,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id,
      event_description: entry.event_description,
      outcome: entry.outcome,
      severity: entry.severity,
      details: entry.details,
      ip_address: entry.ip_address,
      user_agent: entry.user_agent,
      created_at: new Date().toISOString()
    }))

    const { data, error } = await this.supabase
      .from('audit_logs')
      .insert(insertData)
      .select()

    return this.createResult(data || [], error, 'bulkLogActivities')
  }

  async getStats(
    userId?: UserId,
    organizationId?: OrganizationId,
    dateRange?: { start: Date; end: Date }
  ): Promise<Result<ActivityStats>> {
    let query = this.supabase
      .from('audit_logs')
      .select(`
        id, event_type, event_category, action, outcome, 
        severity, resource_type, resource_id, created_at,
        user_id, user:users(full_name)
      `)

    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }
    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
    }

    const { data: activities, error } = await query

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'getStats'))
    }

    const stats: ActivityStats = {
      totalActivities: activities?.length || 0,
      activitiesByType: {},
      activitiesByCategory: {},
      activitiesByOutcome: {},
      activitiesByUser: [],
      timelineData: [],
      topResources: [],
      criticalEvents: 0,
      failureRate: 0
    }

    if (activities) {
      const userMap = new Map<string, { name: string | null; count: number; last_activity: string }>()
      const timelineMap = new Map<string, { count: number; success_count: number; failure_count: number }>()
      const resourceMap = new Map<string, number>()

      let failureCount = 0

      activities.forEach((activity: any) => {
        // Count by type
        stats.activitiesByType[activity.event_type] = (stats.activitiesByType[activity.event_type] || 0) + 1

        // Count by category
        stats.activitiesByCategory[activity.event_category] = (stats.activitiesByCategory[activity.event_category] || 0) + 1

        // Count by outcome
        stats.activitiesByOutcome[activity.outcome] = (stats.activitiesByOutcome[activity.outcome] || 0) + 1

        if (activity.outcome === 'failure') failureCount++

        // Count critical events
        if (activity.severity === 'critical') stats.criticalEvents++

        // Track users
        const userId = activity.user_id
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            name: activity.user?.full_name || null,
            count: 0,
            last_activity: activity.created_at
          })
        }
        const userStats = userMap.get(userId)!
        userStats.count++
        if (activity.created_at > userStats.last_activity) {
          userStats.last_activity = activity.created_at
        }

        // Track timeline data
        const date = activity.created_at.split('T')[0]
        if (!timelineMap.has(date)) {
          timelineMap.set(date, { count: 0, success_count: 0, failure_count: 0 })
        }
        const dayStats = timelineMap.get(date)!
        dayStats.count++
        if (activity.outcome === 'success') dayStats.success_count++
        if (activity.outcome === 'failure') dayStats.failure_count++

        // Track resource usage
        const resourceKey = `${activity.resource_type}:${activity.resource_id}`
        resourceMap.set(resourceKey, (resourceMap.get(resourceKey) || 0) + 1)
      })

      // Convert maps to arrays
      stats.activitiesByUser = Array.from(userMap.entries()).map(([user_id, data]) => ({
        user_id,
        user_name: data.name,
        count: data.count,
        last_activity: data.last_activity
      })).sort((a, b) => b.count - a.count).slice(0, 10)

      stats.timelineData = Array.from(timelineMap.entries()).map(([date, data]) => ({
        date,
        ...data
      })).sort((a, b) => a.date.localeCompare(b.date))

      stats.topResources = Array.from(resourceMap.entries()).map(([resource, count]) => {
        const [resource_type, resource_id] = resource.split(':')
        return { resource_type, resource_id, count }
      }).sort((a, b) => b.count - a.count).slice(0, 10)

      stats.failureRate = activities.length > 0 ? (failureCount / activities.length) * 100 : 0
    }

    return success(stats)
  }

  async startSession(sessionData: Omit<UserSession, 'session_start'>): Promise<Result<ActivitySession>> {
    const insertData = {
      user_id: sessionData.user_id,
      organization_id: sessionData.organization_id,
      session_start: new Date().toISOString(),
      ip_address: sessionData.ip_address,
      user_agent: sessionData.user_agent,
      device_type: sessionData.device_type || 'desktop',
      browser: sessionData.browser,
      referrer: sessionData.referrer,
      pages_visited: 0,
      actions_performed: 0,
      is_active: true,
      created_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('activity_sessions')
      .insert(insertData)
      .select()
      .single()

    return this.createResult(data, error, 'startSession')
  }

  async updateSession(
    sessionId: string,
    updates: {
      pages_visited?: number
      actions_performed?: number
      last_activity?: Date
    }
  ): Promise<Result<ActivitySession>> {
    const updateData = {
      ...updates,
      last_activity: updates.last_activity?.toISOString() || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('activity_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single()

    return this.createResult(data, error, 'updateSession')
  }

  async endSession(sessionId: string): Promise<Result<ActivitySession>> {
    const now = new Date()
    
    // Get session start time to calculate duration
    const sessionResult = await this.supabase
      .from('activity_sessions')
      .select('session_start')
      .eq('id', sessionId)
      .single()

    if (sessionResult.error) {
      return failure(RepositoryError.fromSupabaseError(sessionResult.error, 'endSession - get start time'))
    }

    const sessionStart = new Date(sessionResult.data.session_start)
    const durationMinutes = Math.round((now.getTime() - sessionStart.getTime()) / (1000 * 60))

    const { data, error } = await this.supabase
      .from('activity_sessions')
      .update({
        session_end: now.toISOString(),
        duration_minutes: durationMinutes,
        is_active: false,
        updated_at: now.toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single()

    return this.createResult(data, error, 'endSession')
  }

  async getUserSessions(
    userId: UserId,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<ActivitySession>>> {
    let query = this.supabase
      .from('activity_sessions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('session_start', { ascending: false })

    query = this.applyQueryOptions(query, options)

    const { data, error, count } = await query

    return this.createPaginatedResult(data || [], count, options, error)
  }

  async findCriticalEvents(
    organizationId?: OrganizationId,
    hoursBack: number = 24
  ): Promise<Result<ActivityLogWithDetails[]>> {
    const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000)

    let query = this.supabase
      .from('audit_logs')
      .select(`
        *,
        user:users(id, full_name, email, avatar_url),
        organization:organizations(id, name, slug)
      `)
      .eq('severity', 'critical')
      .gte('created_at', startTime.toISOString())
      .order('created_at', { ascending: false })

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query

    return this.createResult(data as ActivityLogWithDetails[] || [], error, 'findCriticalEvents')
  }

  async findFailurePatterns(
    organizationId?: OrganizationId,
    daysBack: number = 7
  ): Promise<Result<Array<{ pattern: string; count: number; latest: string }>>> {
    const startTime = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)

    let query = this.supabase
      .from('audit_logs')
      .select('event_type, event_category, action, resource_type, created_at')
      .eq('outcome', 'failure')
      .gte('created_at', startTime.toISOString())

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data: failures, error } = await query

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'findFailurePatterns'))
    }

    const patterns = new Map<string, { count: number; latest: string }>()

    failures?.forEach(failure => {
      const patternKey = `${failure.event_type}:${failure.action}:${failure.resource_type}`
      
      if (!patterns.has(patternKey)) {
        patterns.set(patternKey, { count: 0, latest: failure.created_at })
      }
      
      const pattern = patterns.get(patternKey)!
      pattern.count++
      
      if (failure.created_at > pattern.latest) {
        pattern.latest = failure.created_at
      }
    })

    const result = Array.from(patterns.entries())
      .map(([pattern, data]) => ({ pattern, ...data }))
      .sort((a, b) => b.count - a.count)

    return success(result)
  }

  async exportActivities(
    filters: ActivityFilters,
    format: 'json' | 'csv' = 'json'
  ): Promise<Result<string>> {
    // This is a simplified version - in practice you'd want to handle large exports with streaming
    const activitiesResult = await this.findByOrganization(
      filters.organizationId!,
      filters.userId!,
      filters,
      { limit: 10000 } // Large limit for export
    )

    if (!activitiesResult.success) {
      return activitiesResult
    }

    if (format === 'json') {
      return success(JSON.stringify(activitiesResult.data.data, null, 2))
    } else {
      // Convert to CSV format
      const activities = activitiesResult.data.data
      if (activities.length === 0) {
        return success('')
      }

      const headers = Object.keys(activities[0]).join(',')
      const rows = activities.map(activity => 
        Object.values(activity).map(value => 
          typeof value === 'object' ? JSON.stringify(value) : String(value)
        ).join(',')
      )

      return success([headers, ...rows].join('\n'))
    }
  }

  private applyFilters(query: any, filters: ActivityFilters): unknown {
    if (filters.eventType) {
      query = query.eq('event_type', filters.eventType)
    }
    if (filters.eventCategory) {
      query = query.eq('event_category', filters.eventCategory)
    }
    if (filters.action) {
      query = query.eq('action', filters.action)
    }
    if (filters.resourceType) {
      query = query.eq('resource_type', filters.resourceType)
    }
    if (filters.resourceId) {
      query = query.eq('resource_id', filters.resourceId)
    }
    if (filters.outcome) {
      query = query.eq('outcome', filters.outcome)
    }
    if (filters.severity) {
      query = query.eq('severity', filters.severity)
    }
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom.toISOString())
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo.toISOString())
    }
    if (filters.ipAddress) {
      query = query.eq('ip_address', filters.ipAddress)
    }

    return query
  }
}