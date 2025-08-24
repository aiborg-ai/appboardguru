/**
 * Intelligent Notification Router Service
 * 
 * Advanced routing system that intelligently determines:
 * - Which notifications to send based on urgency and context
 * - When to send them (time zone awareness, Do Not Disturb)
 * - How to deliver them (platform selection, escalation)
 * - Follow-up actions and escalation patterns
 * 
 * Features:
 * - Smart scheduling based on recipient time zones
 * - Context-aware priority escalation
 * - Multi-channel delivery coordination
 * - Governance-specific routing rules
 * - Performance optimization
 */

import { z } from 'zod'
import { BaseService } from './base.service'
import { Result, success, failure, RepositoryError } from '../repositories/result'
import { EnterprisePushNotificationService, PushNotificationPayload, NotificationCategory, NotificationPriority } from './push-notification.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import type { UserId, OrganizationId, NotificationId } from '../../types/branded'
import { createUserId, createOrganizationId, createNotificationId } from '../../types/branded'

// =============================================
// ROUTING TYPES AND INTERFACES
// =============================================

export type DeliveryChannel = 'push' | 'email' | 'sms' | 'in_app' | 'webhook'
export type EscalationTrigger = 'unread' | 'undelivered' | 'no_action' | 'time_critical'
export type RoutingContext = 'meeting' | 'voting' | 'compliance' | 'emergency' | 'governance'

export interface NotificationRoutingRule {
  id: string
  name: string
  organization_id?: OrganizationId
  category: NotificationCategory
  priority: NotificationPriority
  routing_context: RoutingContext
  
  // Delivery preferences
  primary_channels: DeliveryChannel[]
  fallback_channels: DeliveryChannel[]
  
  // Time-based routing
  immediate_delivery: boolean
  respect_dnd: boolean
  timezone_aware: boolean
  business_hours_only: boolean
  
  // Escalation settings
  escalation_enabled: boolean
  escalation_delay_minutes: number
  escalation_trigger: EscalationTrigger
  escalation_channels: DeliveryChannel[]
  escalation_recipients?: UserId[]
  
  // Conditions
  conditions: RoutingCondition[]
  
  // Metadata
  created_by: UserId
  created_at: Date
  updated_at: Date
  is_active: boolean
}

export interface RoutingCondition {
  field: string // user.role, organization.settings, notification.data, etc.
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'contains' | 'starts_with'
  value: any
  logical_operator?: 'and' | 'or'
}

export interface RoutingDecision {
  notification_id: NotificationId
  user_id: UserId
  organization_id?: OrganizationId
  
  // Decision outcome
  should_deliver: boolean
  delivery_channels: DeliveryChannel[]
  delivery_time: Date
  escalation_scheduled: boolean
  
  // Reasoning
  applied_rules: string[]
  routing_context: RoutingContext
  decision_factors: Record<string, any>
  
  // Performance
  decision_time_ms: number
  created_at: Date
}

export interface EscalationJob {
  id: string
  original_notification_id: NotificationId
  user_id: UserId
  organization_id?: OrganizationId
  
  // Escalation settings
  trigger: EscalationTrigger
  delay_minutes: number
  escalation_channels: DeliveryChannel[]
  escalation_recipients: UserId[]
  
  // Status
  status: 'scheduled' | 'triggered' | 'completed' | 'cancelled'
  scheduled_for: Date
  triggered_at?: Date
  completed_at?: Date
  
  // Results
  escalation_sent: boolean
  escalation_results?: any[]
  
  created_at: Date
}

export interface UserRoutingProfile {
  user_id: UserId
  organization_id?: OrganizationId
  
  // Time zone and availability
  timezone: string
  business_hours_start: string // HH:MM
  business_hours_end: string   // HH:MM
  business_days: string[]      // ['monday', 'tuesday', ...]
  
  // Channel preferences
  channel_preferences: Record<DeliveryChannel, {
    enabled: boolean
    priority: number // 1-5, lower = higher priority
    dnd_override_allowed: boolean
  }>
  
  // Category-specific preferences
  category_routing: Record<NotificationCategory, {
    preferred_channels: DeliveryChannel[]
    escalation_threshold_minutes: number
    auto_escalate_to_manager: boolean
  }>
  
  // Context-specific settings
  context_settings: Record<RoutingContext, {
    immediate_alerts: boolean
    aggregation_window_minutes: number
    max_notifications_per_hour: number
  }>
  
  updated_at: Date
}

export interface RoutingAnalytics {
  period_start: Date
  period_end: Date
  
  // Delivery statistics
  total_notifications: number
  delivered_notifications: number
  failed_notifications: number
  escalated_notifications: number
  
  // Channel performance
  channel_stats: Record<DeliveryChannel, {
    attempted: number
    delivered: number
    opened: number
    acted_upon: number
    avg_response_time_minutes: number
  }>
  
  // Category performance
  category_stats: Record<NotificationCategory, {
    sent: number
    delivered: number
    response_rate: number
    avg_resolution_time_minutes: number
  }>
  
  // Time-based analysis
  hourly_distribution: Record<string, number>
  timezone_effectiveness: Record<string, {
    delivery_rate: number
    response_rate: number
  }>
  
  // Escalation analysis
  escalation_stats: {
    total_escalations: number
    successful_escalations: number
    avg_escalation_time_minutes: number
    most_common_triggers: Record<EscalationTrigger, number>
  }
}

// =============================================
// VALIDATION SCHEMAS
// =============================================

const RoutingConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['eq', 'ne', 'gt', 'lt', 'in', 'contains', 'starts_with']),
  value: z.any(),
  logical_operator: z.enum(['and', 'or']).optional()
})

const NotificationRoutingRuleSchema = z.object({
  name: z.string().min(1).max(100),
  organization_id: z.string().optional(),
  category: z.enum([
    'emergency_board_matter',
    'time_sensitive_voting',
    'compliance_alert',
    'meeting_notification',
    'governance_update',
    'security_alert'
  ]),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  routing_context: z.enum(['meeting', 'voting', 'compliance', 'emergency', 'governance']),
  primary_channels: z.array(z.enum(['push', 'email', 'sms', 'in_app', 'webhook'])),
  fallback_channels: z.array(z.enum(['push', 'email', 'sms', 'in_app', 'webhook'])),
  immediate_delivery: z.boolean(),
  respect_dnd: z.boolean(),
  timezone_aware: z.boolean(),
  business_hours_only: z.boolean(),
  escalation_enabled: z.boolean(),
  escalation_delay_minutes: z.number().int().min(1).max(1440),
  escalation_trigger: z.enum(['unread', 'undelivered', 'no_action', 'time_critical']),
  escalation_channels: z.array(z.enum(['push', 'email', 'sms', 'in_app', 'webhook'])),
  escalation_recipients: z.array(z.string()).optional(),
  conditions: z.array(RoutingConditionSchema)
})

// =============================================
// INTELLIGENT NOTIFICATION ROUTER SERVICE
// =============================================

export class IntelligentNotificationRouterService extends BaseService {
  private pushService: EnterprisePushNotificationService
  private routingCache = new Map<string, RoutingDecision>()
  private profileCache = new Map<string, UserRoutingProfile>()

  constructor(
    supabase: SupabaseClient<Database>,
    pushService: EnterprisePushNotificationService
  ) {
    super(supabase)
    this.pushService = pushService
  }

  // =============================================
  // ROUTING RULE MANAGEMENT
  // =============================================

  /**
   * Create a new notification routing rule
   */
  async createRoutingRule(ruleData: Omit<NotificationRoutingRule, 'id' | 'created_by' | 'created_at' | 'updated_at'>): Promise<Result<NotificationRoutingRule>> {
    // Validate input
    const validation = this.validateWithContext(
      ruleData,
      NotificationRoutingRuleSchema,
      'create routing rule',
      'rule_data'
    )
    if (!validation.success) {
      return validation
    }

    // Get current user
    const userResult = await this.getCurrentUser()
    if (!userResult.success) {
      return failure(userResult.error)
    }

    // Check permissions
    const permissionResult = await this.checkPermissionWithContext(
      userResult.data.id,
      'notification_routing',
      'create',
      undefined,
      { organizationId: ruleData.organization_id }
    )
    if (!permissionResult.success) {
      return failure(permissionResult.error)
    }

    // Create routing rule
    const ruleResult = await this.executeDbOperation(
      async () => {
        const { data, error } = await this.supabase
          .from('notification_routing_rules')
          .insert({
            ...validation.data,
            created_by: userResult.data.id,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        return { data, error }
      },
      'create_routing_rule',
      { category: ruleData.category, context: ruleData.routing_context }
    )

    if (!ruleResult.success) {
      return ruleResult
    }

    // Clear routing cache for affected organization
    this.clearRoutingCache(ruleData.organization_id)

    // Log rule creation
    await this.logActivity(
      'create_routing_rule',
      'routing_rule',
      ruleResult.data.id,
      {
        category: ruleData.category,
        priority: ruleData.priority,
        organizationId: ruleData.organization_id
      }
    )

    return success(ruleResult.data as NotificationRoutingRule)
  }

  /**
   * Get routing rules for an organization
   */
  async getRoutingRules(organizationId?: OrganizationId): Promise<Result<NotificationRoutingRule[]>> {
    const rulesResult = await this.executeDbOperation(
      async () => {
        let query = this.supabase
          .from('notification_routing_rules')
          .select('*')
          .eq('is_active', true)
          .order('priority', { ascending: false })

        if (organizationId) {
          query = query.eq('organization_id', organizationId)
        } else {
          query = query.is('organization_id', null)
        }

        const { data, error } = await query

        return { data, error }
      },
      'get_routing_rules',
      { organizationId }
    )

    return rulesResult as Result<NotificationRoutingRule[]>
  }

  // =============================================
  // INTELLIGENT ROUTING DECISION ENGINE
  // =============================================

  /**
   * Make intelligent routing decision for a notification
   */
  async makeRoutingDecision(
    payload: PushNotificationPayload,
    userContext?: Record<string, any>
  ): Promise<Result<RoutingDecision>> {
    const startTime = Date.now()

    try {
      // Check cache first
      const cacheKey = `${payload.user_id}_${payload.category}_${payload.priority}`
      if (this.routingCache.has(cacheKey)) {
        return success(this.routingCache.get(cacheKey)!)
      }

      // Get user routing profile
      const profileResult = await this.getUserRoutingProfile(payload.user_id)
      if (!profileResult.success) {
        return failure(profileResult.error)
      }

      const profile = profileResult.data

      // Get applicable routing rules
      const rulesResult = await this.getApplicableRules(payload, profile, userContext)
      if (!rulesResult.success) {
        return failure(rulesResult.error)
      }

      const applicableRules = rulesResult.data

      // Apply routing logic
      const decision = await this.applyRoutingRules(payload, profile, applicableRules, userContext)

      // Cache decision
      this.routingCache.set(cacheKey, decision)

      // Schedule cache cleanup
      setTimeout(() => this.routingCache.delete(cacheKey), 5 * 60 * 1000) // 5 minutes

      // Log decision
      await this.logRoutingDecision(decision)

      return success(decision)

    } catch (error) {
      return failure(RepositoryError.internal(
        'routing_decision',
        `Failed to make routing decision: ${error instanceof Error ? error.message : 'Unknown error'}`
      ))
    }
  }

  /**
   * Get applicable routing rules for a notification
   */
  private async getApplicableRules(
    payload: PushNotificationPayload,
    profile: UserRoutingProfile,
    userContext?: Record<string, any>
  ): Promise<Result<NotificationRoutingRule[]>> {
    // Get all rules for organization and global rules
    const organizationRulesResult = await this.getRoutingRules(payload.organization_id)
    const globalRulesResult = await this.getRoutingRules()

    if (!organizationRulesResult.success) {
      return organizationRulesResult
    }

    if (!globalRulesResult.success) {
      return globalRulesResult
    }

    const allRules = [...organizationRulesResult.data, ...globalRulesResult.data]

    // Filter rules based on category and priority
    const matchingRules = allRules.filter(rule => {
      // Basic matching
      if (rule.category !== payload.category && rule.category !== 'governance_update') {
        return false
      }

      // Priority matching (rule applies to this priority or higher)
      const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 }
      if (priorityOrder[payload.priority] < priorityOrder[rule.priority]) {
        return false
      }

      // Check conditions
      return this.evaluateConditions(rule.conditions, {
        notification: payload,
        user: profile,
        context: userContext || {}
      })
    })

    return success(matchingRules)
  }

  /**
   * Evaluate routing rule conditions
   */
  private evaluateConditions(
    conditions: RoutingCondition[],
    context: Record<string, any>
  ): boolean {
    if (conditions.length === 0) return true

    let result = true
    let currentOperator: 'and' | 'or' = 'and'

    for (const condition of conditions) {
      const fieldValue = this.getNestedValue(context, condition.field)
      const conditionResult = this.evaluateCondition(condition, fieldValue)

      if (currentOperator === 'and') {
        result = result && conditionResult
      } else {
        result = result || conditionResult
      }

      currentOperator = condition.logical_operator || 'and'
    }

    return result
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: RoutingCondition, fieldValue: any): boolean {
    const { operator, value } = condition

    switch (operator) {
      case 'eq':
        return fieldValue === value
      case 'ne':
        return fieldValue !== value
      case 'gt':
        return fieldValue > value
      case 'lt':
        return fieldValue < value
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue)
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(value)
      case 'starts_with':
        return typeof fieldValue === 'string' && fieldValue.startsWith(value)
      default:
        return false
    }
  }

  /**
   * Get nested object value by path
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  /**
   * Apply routing rules and make decision
   */
  private async applyRoutingRules(
    payload: PushNotificationPayload,
    profile: UserRoutingProfile,
    rules: NotificationRoutingRule[],
    userContext?: Record<string, any>
  ): Promise<RoutingDecision> {
    const decision: RoutingDecision = {
      notification_id: payload.id,
      user_id: payload.user_id,
      organization_id: payload.organization_id,
      should_deliver: true,
      delivery_channels: ['push'], // Default to push
      delivery_time: new Date(),
      escalation_scheduled: false,
      applied_rules: [],
      routing_context: this.determineRoutingContext(payload),
      decision_factors: {},
      decision_time_ms: 0,
      created_at: new Date()
    }

    // Apply rules in priority order
    const sortedRules = rules.sort((a, b) => {
      const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })

    for (const rule of sortedRules) {
      decision.applied_rules.push(rule.id)

      // Determine delivery channels
      const channels = this.selectOptimalChannels(rule, profile, payload)
      decision.delivery_channels = channels

      // Determine delivery time
      decision.delivery_time = this.calculateOptimalDeliveryTime(rule, profile, payload)

      // Check if escalation should be scheduled
      if (rule.escalation_enabled) {
        decision.escalation_scheduled = true
        await this.scheduleEscalation(payload, rule)
      }

      // Record decision factors
      decision.decision_factors[rule.id] = {
        rule_name: rule.name,
        immediate_delivery: rule.immediate_delivery,
        respect_dnd: rule.respect_dnd,
        timezone_aware: rule.timezone_aware,
        escalation_enabled: rule.escalation_enabled
      }

      // For critical/emergency notifications, use the first matching rule
      if (payload.priority === 'critical' || rule.routing_context === 'emergency') {
        break
      }
    }

    // If no rules matched, use default routing
    if (decision.applied_rules.length === 0) {
      decision.delivery_channels = this.getDefaultChannels(profile, payload)
      decision.decision_factors.default_routing = true
    }

    return decision
  }

  /**
   * Select optimal delivery channels based on rules and preferences
   */
  private selectOptimalChannels(
    rule: NotificationRoutingRule,
    profile: UserRoutingProfile,
    payload: PushNotificationPayload
  ): DeliveryChannel[] {
    const availableChannels = rule.primary_channels.filter(channel => {
      const pref = profile.channel_preferences[channel]
      return pref && pref.enabled
    })

    if (availableChannels.length > 0) {
      return availableChannels
    }

    // Fall back to fallback channels
    const fallbackChannels = rule.fallback_channels.filter(channel => {
      const pref = profile.channel_preferences[channel]
      return pref && pref.enabled
    })

    return fallbackChannels.length > 0 ? fallbackChannels : ['push']
  }

  /**
   * Calculate optimal delivery time based on rules and user preferences
   */
  private calculateOptimalDeliveryTime(
    rule: NotificationRoutingRule,
    profile: UserRoutingProfile,
    payload: PushNotificationPayload
  ): Date {
    const now = new Date()

    // Critical notifications are always delivered immediately
    if (payload.priority === 'critical' || rule.immediate_delivery) {
      return now
    }

    // Check if we need to respect time zone and business hours
    if (rule.timezone_aware || rule.business_hours_only) {
      return this.calculateTimezoneAwareDelivery(rule, profile, now)
    }

    // Check Do Not Disturb settings
    if (rule.respect_dnd) {
      return this.respectDoNotDisturb(profile, now)
    }

    return now
  }

  /**
   * Calculate delivery time based on user's timezone and business hours
   */
  private calculateTimezoneAwareDelivery(
    rule: NotificationRoutingRule,
    profile: UserRoutingProfile,
    baseTime: Date
  ): Date {
    // Convert to user's timezone
    const userTime = new Date(baseTime.toLocaleString('en-US', { timeZone: profile.timezone }))
    const currentHour = userTime.getHours()
    const currentDay = userTime.toLocaleDateString('en-US', { weekday: 'lowercase' })

    // Check if it's during business hours
    const businessStart = parseInt(profile.business_hours_start.split(':')[0])
    const businessEnd = parseInt(profile.business_hours_end.split(':')[0])
    
    const isBusinessDay = profile.business_days.includes(currentDay)
    const isBusinessHours = currentHour >= businessStart && currentHour < businessEnd

    if (rule.business_hours_only && (!isBusinessDay || !isBusinessHours)) {
      // Schedule for next business day at start of business hours
      const nextBusinessDay = this.getNextBusinessDay(profile)
      nextBusinessDay.setHours(businessStart, 0, 0, 0)
      return nextBusinessDay
    }

    return baseTime
  }

  /**
   * Respect Do Not Disturb settings
   */
  private respectDoNotDisturb(profile: UserRoutingProfile, baseTime: Date): Date {
    // This is a simplified implementation
    // In practice, you'd check the user's DND settings from their devices
    return baseTime
  }

  /**
   * Get next business day for user
   */
  private getNextBusinessDay(profile: UserRoutingProfile): Date {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    while (true) {
      const dayName = tomorrow.toLocaleDateString('en-US', { weekday: 'lowercase' })
      if (profile.business_days.includes(dayName)) {
        break
      }
      tomorrow.setDate(tomorrow.getDate() + 1)
    }
    
    return tomorrow
  }

  /**
   * Determine routing context from notification payload
   */
  private determineRoutingContext(payload: PushNotificationPayload): RoutingContext {
    const categoryToContext: Record<NotificationCategory, RoutingContext> = {
      emergency_board_matter: 'emergency',
      time_sensitive_voting: 'voting',
      compliance_alert: 'compliance',
      meeting_notification: 'meeting',
      governance_update: 'governance',
      security_alert: 'emergency'
    }

    return categoryToContext[payload.category] || 'governance'
  }

  /**
   * Get default channels when no rules apply
   */
  private getDefaultChannels(profile: UserRoutingProfile, payload: PushNotificationPayload): DeliveryChannel[] {
    // Default to channels with highest priority in user preferences
    const enabledChannels = Object.entries(profile.channel_preferences)
      .filter(([_, pref]) => pref.enabled)
      .sort(([_, a], [__, b]) => a.priority - b.priority)
      .map(([channel, _]) => channel as DeliveryChannel)

    return enabledChannels.length > 0 ? enabledChannels.slice(0, 2) : ['push']
  }

  // =============================================
  // ESCALATION MANAGEMENT
  // =============================================

  /**
   * Schedule escalation for a notification
   */
  private async scheduleEscalation(
    payload: PushNotificationPayload,
    rule: NotificationRoutingRule
  ): Promise<void> {
    const escalationJob: Omit<EscalationJob, 'id'> = {
      original_notification_id: payload.id,
      user_id: payload.user_id,
      organization_id: payload.organization_id,
      trigger: rule.escalation_trigger,
      delay_minutes: rule.escalation_delay_minutes,
      escalation_channels: rule.escalation_channels,
      escalation_recipients: rule.escalation_recipients || [],
      status: 'scheduled',
      scheduled_for: new Date(Date.now() + rule.escalation_delay_minutes * 60 * 1000),
      escalation_sent: false,
      created_at: new Date()
    }

    await this.supabase
      .from('notification_escalations')
      .insert(escalationJob)
  }

  /**
   * Process pending escalations
   */
  async processEscalations(): Promise<Result<number>> {
    const now = new Date()

    const escalationsResult = await this.executeDbOperation(
      async () => {
        const { data, error } = await this.supabase
          .from('notification_escalations')
          .select('*')
          .eq('status', 'scheduled')
          .lte('scheduled_for', now.toISOString())

        return { data, error }
      },
      'get_pending_escalations'
    )

    if (!escalationsResult.success) {
      return escalationsResult
    }

    const escalations = escalationsResult.data as EscalationJob[]
    let processed = 0

    for (const escalation of escalations) {
      const result = await this.processEscalation(escalation)
      if (result.success) {
        processed++
      }
    }

    return success(processed)
  }

  /**
   * Process a single escalation
   */
  private async processEscalation(escalation: EscalationJob): Promise<Result<void>> {
    try {
      // Check escalation trigger conditions
      const shouldEscalate = await this.checkEscalationTrigger(escalation)
      
      if (!shouldEscalate) {
        // Cancel escalation
        await this.supabase
          .from('notification_escalations')
          .update({
            status: 'cancelled',
            completed_at: new Date().toISOString()
          })
          .eq('id', escalation.id)

        return success(undefined)
      }

      // Send escalation notifications
      const escalationResults = await this.sendEscalationNotifications(escalation)

      // Update escalation status
      await this.supabase
        .from('notification_escalations')
        .update({
          status: 'completed',
          triggered_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          escalation_sent: true,
          escalation_results: escalationResults
        })
        .eq('id', escalation.id)

      return success(undefined)

    } catch (error) {
      await this.supabase
        .from('notification_escalations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          escalation_sent: false,
          escalation_results: [{ error: error instanceof Error ? error.message : 'Unknown error' }]
        })
        .eq('id', escalation.id)

      return failure(RepositoryError.internal(
        'process_escalation',
        `Failed to process escalation: ${error instanceof Error ? error.message : 'Unknown error'}`
      ))
    }
  }

  /**
   * Check if escalation should trigger
   */
  private async checkEscalationTrigger(escalation: EscalationJob): Promise<boolean> {
    const { data: notification } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('id', escalation.original_notification_id)
      .single()

    if (!notification) {
      return false // Notification doesn't exist anymore
    }

    switch (escalation.trigger) {
      case 'unread':
        return notification.status === 'unread'
      
      case 'undelivered':
        // Check delivery status
        const { data: delivery } = await this.supabase
          .from('push_notification_deliveries')
          .select('successful_deliveries, total_devices')
          .eq('notification_id', escalation.original_notification_id)
          .single()
        
        return delivery && delivery.successful_deliveries < delivery.total_devices
      
      case 'no_action':
        // Check if user has taken any action
        return !notification.read_at && !notification.action_taken_at
      
      case 'time_critical':
        // Always escalate for time-critical notifications
        return true
      
      default:
        return false
    }
  }

  /**
   * Send escalation notifications
   */
  private async sendEscalationNotifications(escalation: EscalationJob): Promise<any[]> {
    const results: any[] = []

    // Get original notification for context
    const { data: originalNotification } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('id', escalation.original_notification_id)
      .single()

    if (!originalNotification) {
      return results
    }

    // Create escalation notification payload
    const escalationPayload: PushNotificationPayload = {
      id: createNotificationId(crypto.randomUUID()),
      user_id: escalation.user_id,
      organization_id: escalation.organization_id,
      title: `ESCALATED: ${originalNotification.title}`,
      body: `This notification requires immediate attention. Original: ${originalNotification.message}`,
      category: originalNotification.category,
      priority: 'critical' as NotificationPriority,
      data: {
        ...originalNotification.metadata,
        escalation_id: escalation.id,
        original_notification_id: escalation.original_notification_id,
        escalation_trigger: escalation.trigger
      }
    }

    // Send to escalation recipients
    for (const recipientId of escalation.escalation_recipients) {
      const recipientPayload = {
        ...escalationPayload,
        user_id: recipientId
      }

      const result = await this.pushService.sendNotification(recipientPayload)
      results.push({
        recipient_id: recipientId,
        success: result.success,
        error: result.success ? null : result.error?.message
      })
    }

    return results
  }

  // =============================================
  // USER ROUTING PROFILES
  // =============================================

  /**
   * Get user routing profile
   */
  async getUserRoutingProfile(userId: UserId): Promise<Result<UserRoutingProfile>> {
    // Check cache first
    if (this.profileCache.has(userId)) {
      return success(this.profileCache.get(userId)!)
    }

    const profileResult = await this.executeDbOperation(
      async () => {
        const { data, error } = await this.supabase
          .from('user_routing_profiles')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (error && error.code !== 'PGRST116') {
          throw error
        }

        if (!data) {
          // Create default profile
          const defaultProfile = this.createDefaultRoutingProfile(userId)
          const { data: created, error: createError } = await this.supabase
            .from('user_routing_profiles')
            .insert(defaultProfile)
            .select()
            .single()

          if (createError) throw createError
          return { data: created, error: null }
        }

        return { data, error }
      },
      'get_user_routing_profile',
      { userId }
    )

    if (!profileResult.success) {
      return profileResult
    }

    const profile = profileResult.data as UserRoutingProfile

    // Cache profile
    this.profileCache.set(userId, profile)
    
    // Schedule cache cleanup
    setTimeout(() => this.profileCache.delete(userId), 10 * 60 * 1000) // 10 minutes

    return success(profile)
  }

  /**
   * Create default routing profile for user
   */
  private createDefaultRoutingProfile(userId: UserId): Omit<UserRoutingProfile, 'updated_at'> {
    return {
      user_id: userId,
      timezone: 'UTC',
      business_hours_start: '09:00',
      business_hours_end: '17:00',
      business_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      channel_preferences: {
        push: { enabled: true, priority: 1, dnd_override_allowed: true },
        email: { enabled: true, priority: 2, dnd_override_allowed: false },
        sms: { enabled: false, priority: 3, dnd_override_allowed: true },
        in_app: { enabled: true, priority: 4, dnd_override_allowed: false },
        webhook: { enabled: false, priority: 5, dnd_override_allowed: false }
      },
      category_routing: {
        emergency_board_matter: {
          preferred_channels: ['push', 'email'],
          escalation_threshold_minutes: 5,
          auto_escalate_to_manager: true
        },
        time_sensitive_voting: {
          preferred_channels: ['push', 'in_app'],
          escalation_threshold_minutes: 15,
          auto_escalate_to_manager: false
        },
        compliance_alert: {
          preferred_channels: ['push', 'email'],
          escalation_threshold_minutes: 30,
          auto_escalate_to_manager: true
        },
        meeting_notification: {
          preferred_channels: ['push', 'in_app'],
          escalation_threshold_minutes: 60,
          auto_escalate_to_manager: false
        },
        governance_update: {
          preferred_channels: ['in_app', 'email'],
          escalation_threshold_minutes: 240,
          auto_escalate_to_manager: false
        },
        security_alert: {
          preferred_channels: ['push', 'email', 'sms'],
          escalation_threshold_minutes: 2,
          auto_escalate_to_manager: true
        }
      },
      context_settings: {
        meeting: {
          immediate_alerts: true,
          aggregation_window_minutes: 5,
          max_notifications_per_hour: 10
        },
        voting: {
          immediate_alerts: true,
          aggregation_window_minutes: 0,
          max_notifications_per_hour: 5
        },
        compliance: {
          immediate_alerts: true,
          aggregation_window_minutes: 15,
          max_notifications_per_hour: 3
        },
        emergency: {
          immediate_alerts: true,
          aggregation_window_minutes: 0,
          max_notifications_per_hour: 50
        },
        governance: {
          immediate_alerts: false,
          aggregation_window_minutes: 60,
          max_notifications_per_hour: 10
        }
      }
    }
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  /**
   * Clear routing cache for organization
   */
  private clearRoutingCache(organizationId?: OrganizationId): void {
    if (organizationId) {
      for (const [key, decision] of this.routingCache.entries()) {
        if (decision.organization_id === organizationId) {
          this.routingCache.delete(key)
        }
      }
    } else {
      this.routingCache.clear()
    }
  }

  /**
   * Log routing decision for analytics
   */
  private async logRoutingDecision(decision: RoutingDecision): Promise<void> {
    try {
      await this.supabase
        .from('routing_decisions')
        .insert(decision)
    } catch (error) {
      console.error('Failed to log routing decision:', error)
    }
  }

  /**
   * Get routing analytics
   */
  async getRoutingAnalytics(
    organizationId?: OrganizationId,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<Result<RoutingAnalytics>> {
    const analyticsResult = await this.executeDbOperation(
      async () => {
        let query = this.supabase
          .from('routing_decisions')
          .select('*')

        if (organizationId) {
          query = query.eq('organization_id', organizationId)
        }

        if (dateFrom) {
          query = query.gte('created_at', dateFrom.toISOString())
        }

        if (dateTo) {
          query = query.lte('created_at', dateTo.toISOString())
        }

        const { data, error } = await query

        if (error) throw error

        // Calculate analytics from data
        const analytics = this.calculateRoutingAnalytics(data, dateFrom, dateTo)
        return { data: analytics, error: null }
      },
      'get_routing_analytics',
      { organizationId, dateFrom, dateTo }
    )

    return analyticsResult
  }

  /**
   * Calculate routing analytics from raw data
   */
  private calculateRoutingAnalytics(
    decisions: RoutingDecision[],
    dateFrom?: Date,
    dateTo?: Date
  ): RoutingAnalytics {
    // This is a simplified implementation
    // In production, you'd want more sophisticated analytics
    
    return {
      period_start: dateFrom || new Date(Math.min(...decisions.map(d => new Date(d.created_at).getTime()))),
      period_end: dateTo || new Date(Math.max(...decisions.map(d => new Date(d.created_at).getTime()))),
      total_notifications: decisions.length,
      delivered_notifications: decisions.filter(d => d.should_deliver).length,
      failed_notifications: decisions.filter(d => !d.should_deliver).length,
      escalated_notifications: decisions.filter(d => d.escalation_scheduled).length,
      channel_stats: {
        push: { attempted: 0, delivered: 0, opened: 0, acted_upon: 0, avg_response_time_minutes: 0 },
        email: { attempted: 0, delivered: 0, opened: 0, acted_upon: 0, avg_response_time_minutes: 0 },
        sms: { attempted: 0, delivered: 0, opened: 0, acted_upon: 0, avg_response_time_minutes: 0 },
        in_app: { attempted: 0, delivered: 0, opened: 0, acted_upon: 0, avg_response_time_minutes: 0 },
        webhook: { attempted: 0, delivered: 0, opened: 0, acted_upon: 0, avg_response_time_minutes: 0 }
      },
      category_stats: {
        emergency_board_matter: { sent: 0, delivered: 0, response_rate: 0, avg_resolution_time_minutes: 0 },
        time_sensitive_voting: { sent: 0, delivered: 0, response_rate: 0, avg_resolution_time_minutes: 0 },
        compliance_alert: { sent: 0, delivered: 0, response_rate: 0, avg_resolution_time_minutes: 0 },
        meeting_notification: { sent: 0, delivered: 0, response_rate: 0, avg_resolution_time_minutes: 0 },
        governance_update: { sent: 0, delivered: 0, response_rate: 0, avg_resolution_time_minutes: 0 },
        security_alert: { sent: 0, delivered: 0, response_rate: 0, avg_resolution_time_minutes: 0 }
      },
      hourly_distribution: {},
      timezone_effectiveness: {},
      escalation_stats: {
        total_escalations: decisions.filter(d => d.escalation_scheduled).length,
        successful_escalations: 0,
        avg_escalation_time_minutes: 0,
        most_common_triggers: {
          unread: 0,
          undelivered: 0,
          no_action: 0,
          time_critical: 0
        }
      }
    }
  }
}

// =============================================
// SERVICE FACTORY
// =============================================

export function createIntelligentNotificationRouterService(
  supabase: SupabaseClient<Database>,
  pushService: EnterprisePushNotificationService
): IntelligentNotificationRouterService {
  return new IntelligentNotificationRouterService(supabase, pushService)
}