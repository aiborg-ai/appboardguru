'use client'

import type { UserId, OrganizationId } from './branded'

// Branded types for notification system
export type NotificationId = string & { readonly __brand: unique symbol }
export type NotificationTemplateId = string & { readonly __brand: unique symbol }
export type NotificationRuleId = string & { readonly __brand: unique symbol }

// Notification delivery methods
export type DeliveryMethod = 'email' | 'in_app' | 'sms' | 'push' | 'webhook'

// Notification frequencies
export type NotificationFrequency = 
  | 'immediate' 
  | 'digest_hourly' 
  | 'digest_daily' 
  | 'digest_weekly' 
  | 'digest_monthly'
  | 'never'

// Notification priorities
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical'

// Notification categories based on platform features
export type NotificationCategory = 
  | 'board_governance'
  | 'meetings'
  | 'documents'
  | 'board_chat'
  | 'compliance'
  | 'calendar'
  | 'security'
  | 'system'
  | 'user_activity'

// Specific notification types
export type NotificationType = 
  // Board Governance
  | 'board_meeting_scheduled'
  | 'board_meeting_reminder'
  | 'board_meeting_cancelled'
  | 'board_decision_required'
  | 'voting_opened'
  | 'voting_reminder'
  | 'voting_closed'
  | 'resolution_passed'
  | 'action_item_assigned'
  | 'action_item_due'
  | 'action_item_overdue'
  | 'action_item_completed'
  
  // Document Management
  | 'document_uploaded'
  | 'document_shared'
  | 'document_updated'
  | 'document_approval_required'
  | 'document_approved'
  | 'document_rejected'
  | 'document_expires_soon'
  | 'vault_access_granted'
  | 'vault_access_revoked'
  
  // BoardChat Communication
  | 'new_message'
  | 'message_mention'
  | 'group_created'
  | 'group_invitation'
  | 'voice_note_received'
  | 'emergency_message'
  
  // Calendar & Meetings
  | 'meeting_invitation'
  | 'meeting_update'
  | 'meeting_starting_soon'
  | 'meeting_minutes_available'
  | 'calendar_conflict'
  
  // Compliance & Workflows
  | 'compliance_deadline_approaching'
  | 'compliance_overdue'
  | 'workflow_step_assigned'
  | 'workflow_completed'
  | 'audit_scheduled'
  | 'regulatory_update'
  
  // Security & Activity
  | 'security_alert'
  | 'login_from_new_device'
  | 'password_expires_soon'
  | 'suspicious_activity'
  | 'data_breach_alert'
  | 'mfa_required'
  
  // System & Administrative
  | 'system_maintenance'
  | 'feature_update'
  | 'user_invited'
  | 'user_role_changed'
  | 'organization_update'
  | 'account_suspended'

// Notification preference configuration
export interface NotificationPreference {
  id: NotificationRuleId
  userId: UserId
  organizationId: OrganizationId
  type: NotificationType
  category: NotificationCategory
  deliveryMethods: DeliveryMethod[]
  frequency: NotificationFrequency
  priority: NotificationPriority
  enabled: boolean
  quietHours?: {
    start: string // HH:MM format
    end: string   // HH:MM format
    timezone: string
  }
  customMessage?: string
  conditions?: NotificationCondition[]
}

// Advanced notification conditions
export interface NotificationCondition {
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in'
  value: unknown
}

// Notification delivery settings
export interface DeliverySettings {
  email: {
    enabled: boolean
    address: string
    verified: boolean
    format: 'html' | 'text'
  }
  sms: {
    enabled: boolean
    phoneNumber: string
    verified: boolean
    carrierGateway?: string
  }
  push: {
    enabled: boolean
    devices: PushDevice[]
  }
  inApp: {
    enabled: boolean
    sound: boolean
    desktop: boolean
  }
  webhook: {
    enabled: boolean
    url: string
    secret?: string
    retryPolicy: 'none' | 'exponential' | 'linear'
  }
}

export interface PushDevice {
  id: string
  name: string
  type: 'web' | 'ios' | 'android'
  token: string
  active: boolean
  lastSeen: Date
}

// Notification templates for customization
export interface NotificationTemplate {
  id: NotificationTemplateId
  type: NotificationType
  subject: string
  body: string
  variables: string[]
  format: 'html' | 'text' | 'markdown'
  customizable: boolean
}

// Corporate notification policies
export interface NotificationPolicy {
  organizationId: OrganizationId
  type: NotificationType
  required: boolean
  mandatoryDeliveryMethods: DeliveryMethod[]
  allowUserCustomization: boolean
  escalationRules?: EscalationRule[]
}

export interface EscalationRule {
  delay: number // minutes
  escalateTo: UserId[]
  deliveryMethod: DeliveryMethod
  condition: 'no_response' | 'not_acknowledged' | 'custom'
}

// Account type-specific notification settings
export interface AccountTypeNotificationConfig {
  accountType: 'Superuser' | 'Administrator' | 'User' | 'Viewer'
  allowedCategories: NotificationCategory[]
  allowedDeliveryMethods: DeliveryMethod[]
  maxNotificationsPerHour: number
  requiredNotifications: NotificationType[]
  canCustomizeTemplates: boolean
  canSetQuietHours: boolean
  canConfigureEscalation: boolean
}

// Notification analytics and insights
export interface NotificationAnalytics {
  totalSent: number
  deliveryRate: number
  openRate: number
  clickRate: number
  unsubscribeRate: number
  topCategories: { category: NotificationCategory; count: number }[]
  deliveryMethodPreference: { method: DeliveryMethod; usage: number }[]
  peakHours: { hour: number; count: number }[]
}

// Props for notification settings components
export interface NotificationSettingsProps {
  accountType: 'Superuser' | 'Administrator' | 'User' | 'Viewer'
  userId: UserId
  organizationId: OrganizationId
}