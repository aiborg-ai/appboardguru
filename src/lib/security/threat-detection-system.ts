/**
 * Advanced Threat Detection System
 * Real-time security monitoring, anomaly detection, and automated response
 */

import { EventEmitter } from 'events'
import { z } from 'zod'
import { Result, success, failure } from '../repositories/result'
import { MetricsCollector } from '../observability/metrics-collector'
import { DistributedTracer } from '../observability/distributed-tracer'
import { DomainEvent } from '../events/event-store'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database'
import { nanoid } from 'nanoid'

// Core interfaces
export interface SecurityEvent {
  id: string
  type: SecurityEventType
  severity: SecuritySeverity
  userId?: string
  sessionId?: string
  ipAddress: string
  userAgent: string
  timestamp: string
  details: Record<string, any>
  metadata: Record<string, any>
  riskScore: number
  geolocation?: {
    country: string
    city: string
    latitude: number
    longitude: number
  }
}

export type SecurityEventType = 
  | 'login_attempt'
  | 'failed_login'
  | 'suspicious_activity'
  | 'data_access'
  | 'permission_change'
  | 'account_lockout'
  | 'password_change'
  | 'mfa_bypass_attempt'
  | 'unusual_location'
  | 'brute_force'
  | 'sql_injection'
  | 'xss_attempt'
  | 'csrf_attempt'
  | 'api_abuse'
  | 'data_exfiltration'
  | 'privilege_escalation'

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical'

export interface ThreatRule {
  id: string
  name: string
  description: string
  severity: SecuritySeverity
  conditions: ThreatCondition[]
  timeWindow?: number // in seconds
  threshold?: number
  isActive: boolean
  actions: ThreatAction[]
  createdAt: string
  updatedAt: string
}

export interface ThreatCondition {
  field: string
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'matches'
  value: any
}

export type ThreatAction = 'log' | 'alert' | 'block_ip' | 'lock_account' | 'require_mfa' | 'notify_admin'

export interface ThreatAlert {
  id: string
  ruleId: string
  ruleName: string
  severity: SecuritySeverity
  message: string
  affectedUserId?: string
  ipAddress: string
  eventCount: number
  firstOccurrence: string
  lastOccurrence: string
  isResolved: boolean
  resolvedAt?: string
  resolvedBy?: string
  actions: ThreatAction[]
  metadata: Record<string, any>
}

export interface SecurityMetrics {
  totalEvents: number
  eventsByType: Record<SecurityEventType, number>
  eventsBySeverity: Record<SecuritySeverity, number>
  activeAlerts: number
  blockedIPs: number
  lockedAccounts: number
  topThreats: Array<{
    type: SecurityEventType
    count: number
    trend: 'increasing' | 'decreasing' | 'stable'
  }>
}

/**
 * Advanced Threat Detection Manager
 */
export class AdvancedThreatDetectionManager extends EventEmitter {
  private threatRules: Map<string, ThreatRule> = new Map()
  private activeAlerts: Map<string, ThreatAlert> = new Map()
  private eventBuffer: Map<string, SecurityEvent[]> = new Map()
  private blockedIPs: Set<string> = new Set()
  private lockedAccounts: Set<string> = new Set()
  private metrics: MetricsCollector
  private tracer: DistributedTracer

  constructor(
    private supabase: SupabaseClient<Database>,
    private options: {
      bufferSize: number
      bufferDuration: number
      maxBlockedIPs: number
      alertRetention: number
      enableMachineLearning: boolean
    }
  ) {
    super()
    
    this.metrics = MetricsCollector.getInstance()
    this.tracer = DistributedTracer.getInstance()

    this.setupDefaultRules()
    this.setupCleanupTasks()
  }

  /**
   * Process security event
   */
  async processSecurityEvent(event: Omit<SecurityEvent, 'id' | 'riskScore'>): Promise<Result<SecurityEvent, string>> {
    const span = this.tracer.startSpan('threat_detection_process')

    try {
      const fullEvent: SecurityEvent = {
        id: nanoid(),
        ...event,
        riskScore: this.calculateRiskScore(event as SecurityEvent)
      }

      await this.storeSecurityEvent(fullEvent)
      this.addToEventBuffer(fullEvent)

      const ruleResults = await this.evaluateThreatRules(fullEvent)
      
      for (const result of ruleResults) {
        if (result.triggered) {
          await this.handleTriggeredRule(result.rule, fullEvent)
        }
      }

      this.metrics.recordSecurityEvent(fullEvent.type, fullEvent.severity, fullEvent.riskScore)
      this.emit('securityEventProcessed', fullEvent)

      return success(fullEvent)

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Security event processing failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Block IP address
   */
  async blockIP(ipAddress: string, reason: string, duration?: number): Promise<Result<void, string>> {
    try {
      this.blockedIPs.add(ipAddress)

      await this.supabase
        .from('security_blocked_ips')
        .insert({
          ip_address: ipAddress,
          reason,
          blocked_at: new Date().toISOString(),
          expires_at: duration ? new Date(Date.now() + duration * 1000).toISOString() : null,
          is_active: true
        })

      if (duration) {
        setTimeout(() => this.unblockIP(ipAddress), duration * 1000)
      }

      this.emit('ipBlocked', { ipAddress, reason, duration })
      return success(undefined)

    } catch (error) {
      return failure(`IP blocking failed: ${(error as Error).message}`)
    }
  }

  isIPBlocked(ipAddress: string): boolean {
    return this.blockedIPs.has(ipAddress)
  }

  isAccountLocked(userId: string): boolean {
    return this.lockedAccounts.has(userId)
  }

  getActiveAlerts(): ThreatAlert[] {
    return Array.from(this.activeAlerts.values())
  }

  private calculateRiskScore(event: SecurityEvent): number {
    const typeScores: Record<SecurityEventType, number> = {
      'login_attempt': 0.1,
      'failed_login': 0.3,
      'suspicious_activity': 0.5,
      'data_access': 0.2,
      'permission_change': 0.4,
      'account_lockout': 0.6,
      'password_change': 0.3,
      'mfa_bypass_attempt': 0.8,
      'unusual_location': 0.4,
      'brute_force': 0.9,
      'sql_injection': 1.0,
      'xss_attempt': 0.8,
      'csrf_attempt': 0.7,
      'api_abuse': 0.6,
      'data_exfiltration': 1.0,
      'privilege_escalation': 1.0
    }

    let score = typeScores[event.type] || 0.1

    const severityMultipliers: Record<SecuritySeverity, number> = {
      'low': 1.0,
      'medium': 1.5,
      'high': 2.0,
      'critical': 3.0
    }

    return Math.min(score * severityMultipliers[event.severity], 1.0)
  }

  private addToEventBuffer(event: SecurityEvent): void {
    const ipEvents = this.eventBuffer.get(event.ipAddress) || []
    ipEvents.push(event)

    const cutoffTime = Date.now() - (this.options.bufferDuration * 1000)
    const recentEvents = ipEvents.filter(e => 
      new Date(e.timestamp).getTime() > cutoffTime
    ).slice(-this.options.bufferSize)

    this.eventBuffer.set(event.ipAddress, recentEvents)
  }

  private async evaluateThreatRules(event: SecurityEvent): Promise<Array<{
    rule: ThreatRule
    triggered: boolean
  }>> {
    const results: Array<{ rule: ThreatRule; triggered: boolean }> = []

    for (const rule of this.threatRules.values()) {
      if (!rule.isActive) continue

      const matchingEvents = this.findMatchingEvents(rule, event)
      const triggered = matchingEvents.length >= (rule.threshold || 1)

      results.push({ rule, triggered })
    }

    return results
  }

  private findMatchingEvents(rule: ThreatRule, event: SecurityEvent): SecurityEvent[] {
    const events = [event]
    
    if (rule.timeWindow) {
      const cutoffTime = Date.now() - (rule.timeWindow * 1000)
      const recentEvents = this.eventBuffer.get(event.ipAddress) || []
      
      events.push(...recentEvents.filter(e =>
        new Date(e.timestamp).getTime() > cutoffTime && e.id !== event.id
      ))
    }

    return events.filter(e => this.matchesRuleConditions(rule, e))
  }

  private matchesRuleConditions(rule: ThreatRule, event: SecurityEvent): boolean {
    return rule.conditions.every(condition => {
      const value = this.getEventFieldValue(event, condition.field)
      return this.evaluateCondition(value, condition.operator, condition.value)
    })
  }

  private getEventFieldValue(event: SecurityEvent, field: string): any {
    return field.split('.').reduce((obj, key) => obj?.[key], event)
  }

  private evaluateCondition(actualValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals': return actualValue === expectedValue
      case 'notEquals': return actualValue !== expectedValue
      case 'contains': return String(actualValue).includes(String(expectedValue))
      case 'greaterThan': return Number(actualValue) > Number(expectedValue)
      case 'lessThan': return Number(actualValue) < Number(expectedValue)
      case 'matches': return new RegExp(expectedValue).test(String(actualValue))
      default: return false
    }
  }

  private async handleTriggeredRule(rule: ThreatRule, event: SecurityEvent): Promise<void> {
    const alertId = `${rule.id}_${event.ipAddress}_${event.userId || 'unknown'}`
    
    const alert: ThreatAlert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: `Threat rule "${rule.name}" triggered`,
      affectedUserId: event.userId,
      ipAddress: event.ipAddress,
      eventCount: 1,
      firstOccurrence: event.timestamp,
      lastOccurrence: event.timestamp,
      isResolved: false,
      actions: rule.actions,
      metadata: { eventId: event.id }
    }

    this.activeAlerts.set(alertId, alert)

    for (const action of rule.actions) {
      await this.executeAction(action, event, alert)
    }

    await this.storeAlert(alert)
    this.emit('threatDetected', { rule, event, alert })
  }

  private async executeAction(action: ThreatAction, event: SecurityEvent, alert: ThreatAlert): Promise<void> {
    switch (action) {
      case 'log':
        console.log(`Security Alert: ${alert.message}`, { event, alert })
        break
      case 'alert':
        this.emit('securityAlert', { event, alert })
        break
      case 'block_ip':
        await this.blockIP(event.ipAddress, `Threat rule: ${alert.ruleName}`, 3600)
        break
      case 'lock_account':
        if (event.userId) {
          await this.lockAccount(event.userId, `Threat rule: ${alert.ruleName}`, 1800)
        }
        break
      case 'require_mfa':
        if (event.userId) {
          this.emit('requireMFA', { userId: event.userId, reason: alert.ruleName })
        }
        break
      case 'notify_admin':
        this.emit('notifyAdmin', { event, alert })
        break
    }
  }

  private async lockAccount(userId: string, reason: string, duration?: number): Promise<void> {
    this.lockedAccounts.add(userId)

    await this.supabase
      .from('security_account_locks')
      .insert({
        user_id: userId,
        reason,
        locked_at: new Date().toISOString(),
        expires_at: duration ? new Date(Date.now() + duration * 1000).toISOString() : null,
        is_active: true
      })

    if (duration) {
      setTimeout(() => this.unlockAccount(userId), duration * 1000)
    }

    this.emit('accountLocked', { userId, reason, duration })
  }

  private async unblockIP(ipAddress: string): Promise<void> {
    this.blockedIPs.delete(ipAddress)
    
    await this.supabase
      .from('security_blocked_ips')
      .update({ is_active: false, unblocked_at: new Date().toISOString() })
      .eq('ip_address', ipAddress)

    this.emit('ipUnblocked', { ipAddress })
  }

  private async unlockAccount(userId: string): Promise<void> {
    this.lockedAccounts.delete(userId)
    
    await this.supabase
      .from('security_account_locks')
      .update({ is_active: false, unlocked_at: new Date().toISOString() })
      .eq('user_id', userId)

    this.emit('accountUnlocked', { userId })
  }

  private async storeSecurityEvent(event: SecurityEvent): Promise<void> {
    await this.supabase.from('security_events').insert({
      id: event.id,
      type: event.type,
      severity: event.severity,
      user_id: event.userId,
      session_id: event.sessionId,
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
      timestamp: event.timestamp,
      details: event.details,
      metadata: event.metadata,
      risk_score: event.riskScore,
      geolocation: event.geolocation
    })
  }

  private async storeAlert(alert: ThreatAlert): Promise<void> {
    await this.supabase.from('security_alerts').upsert({
      id: alert.id,
      rule_id: alert.ruleId,
      rule_name: alert.ruleName,
      severity: alert.severity,
      message: alert.message,
      affected_user_id: alert.affectedUserId,
      ip_address: alert.ipAddress,
      event_count: alert.eventCount,
      first_occurrence: alert.firstOccurrence,
      last_occurrence: alert.lastOccurrence,
      is_resolved: alert.isResolved,
      actions: alert.actions,
      metadata: alert.metadata
    })
  }

  private setupDefaultRules(): void {
    const rules: Omit<ThreatRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Brute Force Detection',
        description: 'Multiple failed login attempts',
        severity: 'high',
        conditions: [{ field: 'type', operator: 'equals', value: 'failed_login' }],
        timeWindow: 300,
        threshold: 5,
        isActive: true,
        actions: ['log', 'alert', 'block_ip']
      },
      {
        name: 'SQL Injection Attempt',
        description: 'Potential SQL injection detected',
        severity: 'critical',
        conditions: [{ field: 'type', operator: 'equals', value: 'sql_injection' }],
        threshold: 1,
        isActive: true,
        actions: ['log', 'alert', 'block_ip', 'notify_admin']
      }
    ]

    rules.forEach(rule => {
      const fullRule: ThreatRule = {
        id: nanoid(),
        ...rule,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      this.threatRules.set(fullRule.id, fullRule)
    })
  }

  private setupCleanupTasks(): void {
    setInterval(() => {
      this.cleanupOldEvents()
    }, 60 * 60 * 1000)
  }

  private cleanupOldEvents(): void {
    const cutoffTime = Date.now() - (this.options.bufferDuration * 1000)
    
    for (const [ip, events] of this.eventBuffer.entries()) {
      const recentEvents = events.filter(e => 
        new Date(e.timestamp).getTime() > cutoffTime
      )
      
      if (recentEvents.length === 0) {
        this.eventBuffer.delete(ip)
      } else {
        this.eventBuffer.set(ip, recentEvents)
      }
    }
  }
}