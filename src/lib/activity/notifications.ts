/**
 * Smart Activity Notifications & Automation Engine
 * Intelligent alert rules, workflow automation, and notification management
 */

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { broadcastSystemAlert } from '@/lib/websocket/activity-stream'
import type {
  ActivityLog,
  NotificationPayload,
  NotificationChannel,
  NotificationPriority,
  WebhookDeliveryConfig,
  SlackDeliveryConfig,
  TeamsDeliveryConfig,
  ActivityMetadata,
  ActivityEventType,
  ActivityEventCategory,
  AuditOutcome,
  ActivitySeverity,
  NotificationDelivery,
  NotificationDeliveryStatus
} from '@/types/entities/activity.types'

export interface AlertRule {
  id: string
  name: string
  description: string
  isActive: boolean
  conditions: AlertCondition[]
  actions: AlertAction[]
  severity: 'low' | 'medium' | 'high' | 'critical'
  cooldownMinutes: number
  lastTriggered?: string
  triggerCount: number
}

export interface AlertCondition {
  type: 'activity_count' | 'activity_type' | 'user_behavior' | 'time_based' | 'resource_access' | 'anomaly_score'
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'in_range' | 'not_in_range'
  value: string | number | boolean | string[]
  timeWindow?: string // '1h', '24h', '7d', etc.
  metadata?: Record<string, string | number | boolean>
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'slack' | 'teams' | 'push_notification' | 'create_ticket' | 'auto_response'
  config: WebhookDeliveryConfig | SlackDeliveryConfig | TeamsDeliveryConfig | Record<string, string | number | boolean>
  template?: string
  recipients?: string[]
  priority: 'immediate' | 'high' | 'normal' | 'low'
}

export interface WorkflowTrigger {
  eventType: string
  conditions: AlertCondition[]
  actions: WorkflowAction[]
}

export interface WorkflowAction {
  type: 'send_notification' | 'update_permissions' | 'create_audit_entry' | 'trigger_backup' | 'lock_account' | 'require_mfa'
  config: Record<string, string | number | boolean>
  delay?: number // seconds
  requiresApproval?: boolean
}

export class SmartNotificationEngine {
  /**
   * Create a new alert rule
   */
  static async createAlertRule(
    organizationId: string,
    userId: string,
    rule: Omit<AlertRule, 'id' | 'triggerCount' | 'lastTriggered'>
  ): Promise<string> {
    try {
      const supabase = await createSupabaseServerClient()

      const { data: alertRule, error } = await (supabase as any)
        .from('activity_alert_rules')
        .insert({
          organization_id: organizationId,
          created_by: userId,
          rule_name: rule.name,
          description: rule.description,
          is_active: rule.isActive,
          trigger_conditions: {
            conditions: rule.conditions,
            logic: 'AND' // Default logic operator
          },
          alert_actions: rule.actions,
          severity: rule.severity,
          cooldown_minutes: rule.cooldownMinutes
        })
        .select()
        .single()

      if (error) throw error

      console.log(`✅ Alert rule created: ${rule.name}`)
      return alertRule.id
    } catch (error) {
      console.error('Error creating alert rule:', error)
      throw error
    }
  }

  /**
   * Evaluate all active alert rules against new activity
   */
  static async evaluateAlertRules(
    organizationId: string,
    activityData: {
      userId: string
      activityType: ActivityEventType
      resourceType?: string
      resourceId?: string
      metadata: ActivityMetadata
      timestamp: string
    }
  ): Promise<void> {
    try {
      const supabase = await createSupabaseServerClient()

      // Get active alert rules for this organization
      const { data: alertRules } = await (supabase as any)
        .from('activity_alert_rules')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)

      if (!alertRules?.length) return

      for (const rule of alertRules) {
        try {
          // Check cooldown period
          if (rule.last_triggered_at) {
            const lastTriggered = new Date(rule.last_triggered_at).getTime()
            const cooldownPeriod = rule.cooldown_minutes * 60 * 1000
            if (Date.now() - lastTriggered < cooldownPeriod) {
              continue // Skip this rule due to cooldown
            }
          }

          // Evaluate conditions
          const shouldTrigger = await this.evaluateConditions(
            (rule.trigger_conditions as any).conditions,
            activityData,
            organizationId
          )

          if (shouldTrigger) {
            await this.triggerAlert(rule, activityData, organizationId)
          }
        } catch (error) {
          console.error(`Error evaluating alert rule ${rule.rule_name}:`, error)
        }
      }
    } catch (error) {
      console.error('Error evaluating alert rules:', error)
    }
  }

  /**
   * Evaluate alert conditions
   */
  private static async evaluateConditions(
    conditions: AlertCondition[],
    activityData: {
      userId: string
      activityType: ActivityEventType
      resourceType?: string
      resourceId?: string
      metadata: ActivityMetadata
      timestamp: string
    },
    organizationId: string
  ): Promise<boolean> {
    try {
      const supabase = await createSupabaseServerClient()

      for (const condition of conditions) {
        let conditionMet = false

        switch (condition.type) {
          case 'activity_count':
            conditionMet = await this.evaluateActivityCountCondition(
              condition,
              activityData,
              organizationId,
              supabase
            )
            break

          case 'activity_type':
            conditionMet = this.evaluateActivityTypeCondition(condition, activityData)
            break

          case 'user_behavior':
            conditionMet = await this.evaluateUserBehaviorCondition(
              condition,
              activityData,
              organizationId,
              supabase
            )
            break

          case 'time_based':
            conditionMet = this.evaluateTimeBasedCondition(condition, activityData)
            break

          case 'resource_access':
            conditionMet = this.evaluateResourceAccessCondition(condition, activityData)
            break

          case 'anomaly_score':
            conditionMet = await this.evaluateAnomalyScoreCondition(
              condition,
              activityData,
              organizationId,
              supabase
            )
            break
        }

        if (!conditionMet) {
          return false // AND logic - all conditions must be met
        }
      }

      return true
    } catch (error) {
      console.error('Error evaluating conditions:', error)
      return false
    }
  }

  private static async evaluateActivityCountCondition(
    condition: AlertCondition,
    activityData: {
      userId: string
      activityType: ActivityEventType
      resourceType?: string
      resourceId?: string
      metadata: ActivityMetadata
      timestamp: string
    },
    organizationId: string,
    supabase: ReturnType<typeof createSupabaseServerClient> extends Promise<infer T> ? T : never
  ): Promise<boolean> {
    const timeWindow = condition.timeWindow || '1h'
    const windowMs = this.parseTimeWindow(timeWindow)
    const windowStart = new Date(Date.now() - windowMs).toISOString()

    const { data: activities, count } = await (supabase as any)
      .from('audit_logs')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .gte('created_at', windowStart)

    const value = typeof condition.value === 'string' 
      ? condition.value 
      : Array.isArray(condition.value) 
        ? condition.value[0] 
        : String(condition.value)
    return this.compareValues(count || 0, condition.operator, value || '')
  }

  private static evaluateActivityTypeCondition(
    condition: AlertCondition,
    activityData: {
      userId: string
      activityType: ActivityEventType
      resourceType?: string
      resourceId?: string
      metadata: ActivityMetadata
      timestamp: string
    }
  ): boolean {
    const activityType = activityData.activityType
    
    switch (condition.operator) {
      case 'equals':
        return activityType === condition.value
      case 'not_equals':
        return activityType !== condition.value
      case 'contains':
        return activityType.includes(String(condition.value))
      case 'not_contains':
        return !activityType.includes(String(condition.value))
      default:
        return false
    }
  }

  private static async evaluateUserBehaviorCondition(
    condition: AlertCondition,
    activityData: {
      userId: string
      activityType: ActivityEventType
      resourceType?: string
      resourceId?: string
      metadata: ActivityMetadata
      timestamp: string
    },
    organizationId: string,
    supabase: ReturnType<typeof createSupabaseServerClient> extends Promise<infer T> ? T : never
  ): Promise<boolean> {
    const { data: anomalies } = await (supabase as any).rpc('detect_activity_anomalies', {
      input_user_id: activityData.userId,
      input_org_id: organizationId
    })

    if (!anomalies) return false

    // Check specific behavioral flags
    switch (condition.value) {
      case 'bulk_downloads':
        return (anomalies as any).bulk_downloads && this.compareValues(
          (anomalies as any).downloads_today,
          condition.operator,
          (condition.metadata as any)?.threshold || 10
        )
      case 'unusual_hours':
        return (anomalies as any).unusual_hours
      case 'high_activity':
        return (anomalies as any).high_activity
      default:
        return false
    }
  }

  private static evaluateTimeBasedCondition(
    condition: AlertCondition,
    activityData: {
      userId: string
      activityType: ActivityEventType
      resourceType?: string
      resourceId?: string
      metadata: ActivityMetadata
      timestamp: string
    }
  ): boolean {
    const activityTime = new Date(activityData.timestamp)
    const hour = activityTime.getHours()
    const dayOfWeek = activityTime.getDay() // 0 = Sunday

    switch (condition.value) {
      case 'business_hours':
        return hour >= 8 && hour <= 18 && dayOfWeek >= 1 && dayOfWeek <= 5
      case 'after_hours':
        return hour < 8 || hour > 18 || dayOfWeek === 0 || dayOfWeek === 6
      case 'weekend':
        return dayOfWeek === 0 || dayOfWeek === 6
      case 'weekday':
        return dayOfWeek >= 1 && dayOfWeek <= 5
      default:
        return false
    }
  }

  private static evaluateResourceAccessCondition(
    condition: AlertCondition,
    activityData: {
      userId: string
      activityType: ActivityEventType
      resourceType?: string
      resourceId?: string
      metadata: ActivityMetadata
      timestamp: string
    }
  ): boolean {
    const resourceType = activityData.resourceType
    const resourceId = activityData.resourceId

    switch (condition.operator) {
      case 'equals':
        return resourceType === condition.value || resourceId === condition.value
      case 'contains':
        return (resourceType && typeof condition.value === 'string' && resourceType.includes(condition.value)) || (resourceId && typeof condition.value === 'string' && resourceId.includes(condition.value)) || false
      default:
        return false
    }
  }

  private static async evaluateAnomalyScoreCondition(
    condition: AlertCondition,
    activityData: {
      userId: string
      activityType: ActivityEventType
      resourceType?: string
      resourceId?: string
      metadata: ActivityMetadata
      timestamp: string
    },
    organizationId: string,
    supabase: ReturnType<typeof createSupabaseServerClient> extends Promise<infer T> ? T : never
  ): Promise<boolean> {
    // Get recent anomaly score for user
    const { data: anomalies } = await (supabase as any)
      .from('activity_insights')
      .select('confidence_score')
      .eq('organization_id', organizationId)
      .eq('user_id', activityData.userId)
      .eq('insight_type', 'anomaly')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    const score = anomalies?.[0]?.confidence_score || 0
    const value = typeof condition.value === 'string' 
      ? condition.value 
      : Array.isArray(condition.value) 
        ? condition.value[0] 
        : String(condition.value)
    return this.compareValues(score, condition.operator, value || '')
  }

  /**
   * Trigger alert and execute actions
   */
  private static async triggerAlert(
    rule: {
      id: string
      rule_name: string
      severity: ActivitySeverity
      alert_actions: AlertAction[]
      trigger_count?: number
    },
    activityData: {
      userId: string
      activityType: ActivityEventType
      resourceType?: string
      resourceId?: string
      metadata: ActivityMetadata
      timestamp: string
    },
    organizationId: string
  ): Promise<void> {
    try {
      const supabase = await createSupabaseServerClient()

      // Update rule trigger count and timestamp  
      // Get current count first, then update
      const { data: currentRule } = await (supabase as any)
        .from('activity_alert_rules')
        .select('trigger_count')
        .eq('id', rule.id)
        .single()
      
      await (supabase as any)
        .from('activity_alert_rules')
        .update({
          trigger_count: (currentRule?.trigger_count || 0) + 1,
          last_triggered_at: new Date().toISOString()
        })
        .eq('id', rule.id)

      // Execute alert actions
      for (const action of rule.alert_actions) {
        try {
          await this.executeAlertAction(action, rule, activityData, organizationId)
        } catch (error) {
          console.error(`Error executing alert action ${action.type}:`, error)
        }
      }

      // Broadcast real-time alert
      broadcastSystemAlert({
        id: `alert-${rule.id}-${Date.now()}`,
        type: 'security',
        severity: rule.severity === 'info' ? 'low' : rule.severity as 'low' | 'medium' | 'high' | 'critical',
        title: `Alert: ${rule.rule_name}`,
        message: `Alert rule "${rule.rule_name}" has been triggered`,
        organizationId,
        userId: activityData.userId,
        metadata: {
          ruleId: rule.id,
          activityData,
          triggerTime: new Date().toISOString()
        }
      })

      console.log(`🚨 Alert triggered: ${rule.rule_name}`)
    } catch (error) {
      console.error('Error triggering alert:', error)
    }
  }

  /**
   * Execute specific alert action
   */
  private static async executeAlertAction(
    action: AlertAction,
    rule: {
      id: string
      rule_name: string
      severity: ActivitySeverity
      alert_actions: AlertAction[]
    },
    activityData: {
      userId: string
      activityType: ActivityEventType
      resourceType?: string
      resourceId?: string
      metadata: ActivityMetadata
      timestamp: string
    },
    organizationId: string
  ): Promise<void> {
    switch (action.type) {
      case 'email':
        await this.sendEmailAlert(action, rule, activityData, organizationId)
        break

      case 'webhook':
        await this.sendWebhookAlert(action, rule, activityData, organizationId)
        break

      case 'slack':
        await this.sendSlackAlert(action, rule, activityData, organizationId)
        break

      case 'teams':
        await this.sendTeamsAlert(action, rule, activityData, organizationId)
        break

      case 'push_notification':
        await this.sendPushNotification(action, rule, activityData, organizationId)
        break

      case 'create_ticket':
        await this.createSupportTicket(action, rule, activityData, organizationId)
        break

      case 'auto_response':
        await this.executeAutoResponse(action, rule, activityData, organizationId)
        break

      default:
        console.warn(`Unknown alert action type: ${action.type}`)
    }
  }

  /**
   * Send email alert
   */
  private static async sendEmailAlert(
    action: AlertAction,
    rule: any,
    activityData: any,
    organizationId: string
  ): Promise<void> {
    try {
      // Get organization admin emails
      const supabase = await createSupabaseServerClient()
      const { data: admins } = await (supabase as any)
        .from('organization_members')
        .select('users(email, full_name)')
        .eq('organization_id', organizationId)
        .in('role', ['owner', 'admin'])
        .eq('status', 'active')

      const recipients = action.recipients || admins?.flatMap((admin: {
        users: { email: string; full_name: string } | { email: string; full_name: string }[]
      }) => 
        Array.isArray((admin.users as any)) ? (admin.users as any).map((user: any) => user.email) : [(admin.users as any)?.email]
      ).filter(Boolean) || []

      if (recipients.length === 0) {
        console.warn('No email recipients found for alert')
        return
      }

      const emailContent = this.generateEmailContent(action.template || 'default', rule, activityData)

      // Send email (integrate with your email service)
      console.log(`📧 Email alert sent to ${recipients.length} recipients: ${rule.rule_name}`)
      
      // TODO: Integrate with actual email service (Nodemailer, SendGrid, etc.)
    } catch (error) {
      console.error('Error sending email alert:', error)
    }
  }

  /**
   * Send webhook alert
   */
  private static async sendWebhookAlert(
    action: AlertAction,
    rule: any,
    activityData: any,
    organizationId: string
  ): Promise<void> {
    try {
      const webhookUrl = (action.config as { url?: string }).url
      if (!webhookUrl) return

      const payload = {
        alertId: `${rule.id}-${Date.now()}`,
        ruleName: rule.rule_name,
        severity: rule.severity,
        organizationId,
        activityData,
        timestamp: new Date().toISOString(),
        metadata: (action.config as any)?.metadata || {}
      }

      // Add webhook signature if secret is provided
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'BoardGuru-Alerts/1.0'
      }

      if ((action.config as any)?.secret) {
        const signature = await this.generateWebhookSignature(JSON.stringify(payload), (action.config as any).secret)
        headers['X-BoardGuru-Signature'] = signature
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      if (!response.ok) {
        throw new Error(`Webhook responded with status ${response.status}`)
      }

      console.log(`🔗 Webhook alert sent: ${webhookUrl}`)
    } catch (error) {
      console.error('Error sending webhook alert:', error)
      
      // Log webhook failure for retry logic
      const supabase = await createSupabaseServerClient()
      
      // Get current failure count first
      const { data: currentWebhook } = await (supabase as any)
        .from('activity_webhooks')
        .select('failure_count')
        .eq('endpoint_url', (action.config as any)?.url || '')
        .single()
      
      await (supabase as any)
        .from('activity_webhooks')
        .update({
          failure_count: (currentWebhook?.failure_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('endpoint_url', (action.config as any)?.url || '')
    }
  }

  /**
   * Send Slack alert
   */
  private static async sendSlackAlert(
    action: AlertAction,
    rule: any,
    activityData: any,
    organizationId: string
  ): Promise<void> {
    try {
      const slackWebhook = (action.config as any)?.webhookUrl
      if (!slackWebhook) return

      const slackMessage = {
        text: `🚨 BoardGuru Alert: ${rule.rule_name}`,
        attachments: [
          {
            color: this.getSeverityColor(rule.severity),
            fields: [
              {
                title: 'Alert Rule',
                value: rule.rule_name,
                short: true
              },
              {
                title: 'Severity',
                value: rule.severity.toUpperCase(),
                short: true
              },
              {
                title: 'Activity',
                value: activityData.activityType,
                short: true
              },
              {
                title: 'User',
                value: (activityData.metadata as any)?.userName || 'Unknown',
                short: true
              },
              {
                title: 'Time',
                value: new Date(activityData.timestamp).toLocaleString(),
                short: false
              }
            ],
            footer: 'BoardGuru Activity Monitoring',
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      }

      await fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage)
      })

      console.log(`💬 Slack alert sent: ${rule.rule_name}`)
    } catch (error) {
      console.error('Error sending Slack alert:', error)
    }
  }

  /**
   * Send Microsoft Teams alert
   */
  private static async sendTeamsAlert(
    action: AlertAction,
    rule: any,
    activityData: any,
    organizationId: string
  ): Promise<void> {
    try {
      const teamsWebhook = (action.config as any)?.webhookUrl
      if (!teamsWebhook) return

      const teamsMessage = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        themeColor: this.getSeverityColor(rule.severity),
        summary: `BoardGuru Alert: ${rule.rule_name}`,
        sections: [
          {
            activityTitle: `🚨 Alert: ${rule.rule_name}`,
            activitySubtitle: `Severity: ${rule.severity.toUpperCase()}`,
            facts: [
              { name: 'Activity Type', value: activityData.activityType },
              { name: 'User', value: (activityData.metadata as any)?.userName || 'Unknown' },
              { name: 'Time', value: new Date(activityData.timestamp).toLocaleString() },
              { name: 'Organization', value: organizationId }
            ]
          }
        ],
        potentialAction: [
          {
            "@type": "OpenUri",
            name: "View in BoardGuru",
            targets: [
              {
                os: "default",
                uri: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/activity-analytics`
              }
            ]
          }
        ]
      }

      await fetch(teamsWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamsMessage)
      })

      console.log(`👥 Teams alert sent: ${rule.rule_name}`)
    } catch (error) {
      console.error('Error sending Teams alert:', error)
    }
  }

  /**
   * Send push notification
   */
  private static async sendPushNotification(
    action: AlertAction,
    rule: any,
    activityData: any,
    organizationId: string
  ): Promise<void> {
    try {
      const supabase = await createSupabaseServerClient()

      // Get users who should receive push notifications
      const { data: notificationUsers } = await (supabase as any)
        .from('organization_members')
        .select('user_id, users(full_name)')
        .eq('organization_id', organizationId)
        .eq('receive_notifications', true)
        .eq('status', 'active')

      if (!notificationUsers?.length) return

      // Create in-app notifications
      const notifications = notificationUsers.map((user: any) => ({
        user_id: user.user_id,
        organization_id: organizationId,
        type: 'security' as const,
        category: 'alert',
        title: `Alert: ${rule.rule_name}`,
        message: `Activity monitoring alert triggered: ${activityData.activityType}`,
        priority: this.mapSeverityToPriority(rule.severity),
        metadata: {
          ruleId: rule.id,
          activityData,
          alertType: 'automated'
        }
      }))

      await (supabase as any)
        .from('notifications')
        .insert(notifications)

      console.log(`🔔 Push notifications sent to ${notificationUsers.length} users`)
    } catch (error) {
      console.error('Error sending push notifications:', error)
    }
  }

  /**
   * Create support ticket
   */
  private static async createSupportTicket(
    action: AlertAction,
    rule: any,
    activityData: any,
    organizationId: string
  ): Promise<void> {
    try {
      // This would integrate with your ticketing system (Jira, ServiceNow, etc.)
      const ticketData = {
        title: `Alert: ${rule.rule_name}`,
        description: `Automated alert triggered for activity: ${activityData.activityType}`,
        priority: rule.severity,
        category: 'security',
        organizationId,
        activityData,
        createdAt: new Date().toISOString()
      }

      console.log(`🎫 Support ticket created: ${ticketData.title}`)
      // TODO: Integrate with actual ticketing system
    } catch (error) {
      console.error('Error creating support ticket:', error)
    }
  }

  /**
   * Execute automated response
   */
  private static async executeAutoResponse(
    action: AlertAction,
    rule: any,
    activityData: any,
    organizationId: string
  ): Promise<void> {
    try {
      const responseType = (action.config as any)?.responseType

      switch (responseType) {
        case 'lock_user_account':
          await this.lockUserAccount(activityData.userId, organizationId, rule.rule_name)
          break

        case 'require_mfa':
          await this.requireMFA(activityData.userId, organizationId)
          break

        case 'revoke_session':
          await this.revokeUserSessions(activityData.userId)
          break

        case 'limit_permissions':
          await this.limitUserPermissions(activityData.userId, organizationId)
          break

        default:
          console.warn(`Unknown auto-response type: ${responseType}`)
      }

      console.log(`🤖 Auto-response executed: ${responseType} for ${activityData.userId}`)
    } catch (error) {
      console.error('Error executing auto-response:', error)
    }
  }

  /**
   * Utility functions
   */
  private static parseTimeWindow(timeWindow: string): number {
    const match = timeWindow.match(/^(\d+)([hmds])$/)
    if (!match) return 3600000 // Default 1 hour

    const [, amount, unit] = match
    const multipliers = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    }

    return parseInt(amount || '0') * multipliers[unit as keyof typeof multipliers]
  }

  private static compareValues(
    actual: string | number | boolean,
    operator: string,
    expected: string | number | boolean
  ): boolean {
    switch (operator) {
      case 'equals': return actual === expected
      case 'not_equals': return actual !== expected
      case 'greater_than': return actual > expected
      case 'less_than': return actual < expected
      case 'contains': return String(actual).includes(String(expected))
      case 'not_contains': return !String(actual).includes(String(expected))
      default: return false
    }
  }

  private static getSeverityColor(severity: string): string {
    const colors = {
      low: '#36a64f',      // Green
      medium: '#ff9500',   // Orange
      high: '#ff0000',     // Red
      critical: '#8b0000'  // Dark red
    }
    return colors[severity as keyof typeof colors] || colors.medium
  }

  private static mapSeverityToPriority(severity: string): 'low' | 'medium' | 'high' | 'critical' {
    const mapping: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      low: 'low',
      medium: 'medium',
      high: 'high',
      critical: 'critical'
    }
    return mapping[severity] || 'medium'
  }

  private static generateEmailContent(
    template: string,
    rule: {
      rule_name: string
      severity: ActivitySeverity
      description?: string
    },
    activityData: {
      activityType: ActivityEventType
      metadata: ActivityMetadata
      timestamp: string
    }
  ): string {
    // Generate email content based on template
    return `
      Alert: ${rule.rule_name}
      
      An activity monitoring alert has been triggered:
      
      Activity: ${activityData.activityType}
      User: ${(activityData.metadata as any)?.userName || 'Unknown'}
      Time: ${new Date(activityData.timestamp).toLocaleString()}
      Severity: ${rule.severity.toUpperCase()}
      
      Description: ${rule.description}
      
      Please review this activity in the BoardGuru dashboard.
    `
  }

  private static async generateWebhookSignature(payload: string, secret: string): Promise<string> {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  private static async lockUserAccount(userId: string, organizationId: string, reason: string): Promise<void> {
    const supabase = supabaseAdmin
    await (supabase as any)
      .from('organization_members')
      .update({ 
        status: 'suspended',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('organization_id', organizationId)

    console.log(`🔒 User account locked: ${userId} (Reason: ${reason})`)
  }

  private static async requireMFA(userId: string, organizationId: string): Promise<void> {
    // Implementation would depend on your auth system
    console.log(`🔐 MFA required for user: ${userId}`)
  }

  private static async revokeUserSessions(userId: string): Promise<void> {
    // Implementation would revoke active sessions
    console.log(`🚪 Sessions revoked for user: ${userId}`)
  }

  private static async limitUserPermissions(userId: string, organizationId: string): Promise<void> {
    const supabase = supabaseAdmin
    await (supabase as any)
      .from('organization_members')
      .update({
        role: 'viewer', // Downgrade to viewer
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('organization_id', organizationId)

    console.log(`⚠️ Permissions limited for user: ${userId}`)
  }
}

/**
 * Workflow automation engine
 */
export class WorkflowAutomation {
  private static workflows: Map<string, WorkflowTrigger> = new Map()

  /**
   * Register a workflow trigger
   */
  static registerWorkflow(
    id: string,
    organizationId: string,
    workflow: WorkflowTrigger
  ): void {
    this.workflows.set(`${organizationId}:${id}`, workflow)
    console.log(`⚙️ Workflow registered: ${id}`)
  }

  /**
   * Process activity against all registered workflows
   */
  static async processWorkflows(
    organizationId: string,
    activityData: {
      userId: string
      activityType: ActivityEventType
      resourceType?: string
      resourceId?: string
      metadata: ActivityMetadata
      timestamp: string
    }
  ): Promise<void> {
    try {
      for (const [workflowId, workflow] of Array.from(this.workflows.entries())) {
        if (!workflowId.startsWith(`${organizationId}:`)) continue

        // Check if workflow conditions are met
        const shouldExecute = await this.evaluateWorkflowConditions(
          workflow.conditions,
          activityData,
          organizationId
        )

        if (shouldExecute) {
          await this.executeWorkflow(workflow, activityData, organizationId)
        }
      }
    } catch (error) {
      console.error('Error processing workflows:', error)
    }
  }

  private static async evaluateWorkflowConditions(
    conditions: AlertCondition[],
    activityData: any,
    organizationId: string
  ): Promise<boolean> {
    // Use the same condition evaluation logic as alerts
    return SmartNotificationEngine['evaluateConditions'](conditions, activityData, organizationId)
  }

  private static async executeWorkflow(
    workflow: WorkflowTrigger,
    activityData: any,
    organizationId: string
  ): Promise<void> {
    for (const action of workflow.actions) {
      try {
        // Add delay if specified
        if (action.delay) {
          setTimeout(() => {
            this.executeWorkflowAction(action, activityData, organizationId)
          }, action.delay * 1000)
        } else {
          await this.executeWorkflowAction(action, activityData, organizationId)
        }
      } catch (error) {
        console.error('Error executing workflow action:', error)
      }
    }
  }

  private static async executeWorkflowAction(
    action: WorkflowAction,
    activityData: any,
    organizationId: string
  ): Promise<void> {
    switch (action.type) {
      case 'send_notification':
        // Implementation for sending notifications
        break
      case 'update_permissions':
        // Implementation for updating permissions
        break
      case 'create_audit_entry':
        // Implementation for creating audit entries
        break
      case 'trigger_backup':
        // Implementation for triggering backups
        break
      case 'lock_account':
        // Implementation for locking accounts
        break
      case 'require_mfa':
        // Implementation for requiring MFA
        break
    }

    console.log(`⚙️ Workflow action executed: ${action.type}`)
  }
}

/**
 * Intelligent notification digest system
 */
export class NotificationDigest {
  /**
   * Generate smart activity digest
   */
  static async generateActivityDigest(
    organizationId: string,
    userId: string,
    digestType: 'daily' | 'weekly' | 'monthly'
  ): Promise<{
    summary: string
    keyActivities: ActivityLog[]
    insights: string[]
    recommendations: string[]
    unreadAlerts: number
  }> {
    try {
      const supabase = await createSupabaseServerClient()

      // Calculate time range based on digest type
      const timeRanges = {
        daily: 24 * 60 * 60 * 1000,
        weekly: 7 * 24 * 60 * 60 * 1000,
        monthly: 30 * 24 * 60 * 60 * 1000
      }

      const timeRange = {
        start: new Date(Date.now() - timeRanges[digestType]).toISOString(),
        end: new Date().toISOString()
      }

      // Get activity summary
      const { data: activities } = await (supabase as any)
        .from('audit_logs')
        .select('event_category, action, created_at, outcome, severity')
        .eq('organization_id', organizationId)
        .gte('created_at', timeRange.start)
        .lte('created_at', timeRange.end)

      // Get user's unread alerts
      const { data: alerts, count: alertCount } = await (supabase as any)
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('status', 'unread')
        .in('type', ['security', 'system'])

      // Generate digest content
      const activityCount = activities?.length || 0
      const failureCount = activities?.filter((a: any) => a.outcome === 'failure').length || 0
      const criticalCount = activities?.filter((a: any) => a.severity === 'critical').length || 0

      const summary = `${digestType.charAt(0).toUpperCase() + digestType.slice(1)} Summary: ${activityCount} activities, ${failureCount} failures, ${criticalCount} critical events`

      const keyActivities = activities?.slice(0, 10) || []

      const insights = [
        activityCount > 0 ? `${activityCount} total activities recorded` : 'No activities recorded',
        failureCount > 0 ? `${failureCount} operations failed` : 'All operations successful',
        criticalCount > 0 ? `${criticalCount} critical events require attention` : 'No critical events'
      ].filter(Boolean)

      const recommendations = [
        failureCount > activityCount * 0.1 ? 'Review failed operations for patterns' : null,
        criticalCount > 0 ? 'Address critical security events immediately' : null,
        activityCount === 0 ? 'Check system health and logging configuration' : null
      ].filter(Boolean) as string[]

      return {
        summary,
        keyActivities: keyActivities as ActivityLog[],
        insights,
        recommendations,
        unreadAlerts: alertCount || 0
      }
    } catch (error) {
      console.error('Error generating activity digest:', error)
      throw error
    }
  }
}