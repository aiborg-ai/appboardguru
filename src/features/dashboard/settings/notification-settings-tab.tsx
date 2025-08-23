'use client'

import React, { useState } from 'react'
import { 
  Bell, 
  Mail, 
  Smartphone, 
  Monitor, 
  Globe,
  Settings,
  Clock,
  Shield,
  Users,
  FileText,
  MessageSquare,
  Calendar,
  AlertTriangle,
  Zap
} from 'lucide-react'
import type { NotificationSettingsProps } from '@/types/notification-types'
import type { UserId, OrganizationId } from '@/types/branded'

type NotificationTab = 
  | 'preferences' 
  | 'delivery' 
  | 'schedule' 
  | 'templates' 
  | 'analytics'

// Make the props optional to match the pattern used in export settings
type NotificationSettingsPropsOptional = {
  accountType: 'Superuser' | 'Administrator' | 'User' | 'Viewer'
  userId: UserId
  organizationId?: OrganizationId | null
}

export const NotificationSettingsTab = React.memo(function NotificationSettingsTab({ accountType, userId, organizationId }: NotificationSettingsPropsOptional) {
  const [activeTab, setActiveTab] = useState<NotificationTab>('preferences')

  const tabs = [
    { 
      id: 'preferences' as const, 
      label: 'Notification Preferences', 
      icon: Bell, 
      color: 'text-blue-600',
      description: 'Configure what notifications you receive'
    },
    { 
      id: 'delivery' as const, 
      label: 'Delivery Methods', 
      icon: Mail, 
      color: 'text-green-600',
      description: 'Setup email, SMS, and push notifications'
    },
    { 
      id: 'schedule' as const, 
      label: 'Schedule & Timing', 
      icon: Clock, 
      color: 'text-purple-600',
      description: 'Set quiet hours and notification frequency'
    },
    { 
      id: 'templates' as const, 
      label: 'Templates & Customization', 
      icon: FileText, 
      color: 'text-orange-600',
      description: 'Customize notification messages and templates',
      adminOnly: true
    },
    { 
      id: 'analytics' as const, 
      label: 'Analytics & Insights', 
      icon: Zap, 
      color: 'text-teal-600',
      description: 'View notification performance and engagement',
      adminOnly: true
    }
  ]

  const visibleTabs = tabs.filter(tab => 
    !tab.adminOnly || ['Superuser', 'Administrator'].includes(accountType)
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'preferences':
        return <NotificationPreferences accountType={accountType} userId={userId} organizationId={organizationId} />
      case 'delivery':
        return <DeliveryMethods accountType={accountType} userId={userId} organizationId={organizationId} />
      case 'schedule':
        return <ScheduleTiming accountType={accountType} userId={userId} organizationId={organizationId} />
      case 'templates':
        return <NotificationTemplates accountType={accountType} userId={userId} organizationId={organizationId} />
      case 'analytics':
        return <NotificationAnalytics accountType={accountType} userId={userId} organizationId={organizationId} />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
          <Bell className="h-7 w-7 text-blue-600" />
          <span>Notification Settings</span>
        </h1>
        <p className="text-gray-600 mt-1">
          Manage how and when you receive notifications for board activities and communications
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {visibleTabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : tab.color} group-hover:${tab.color}`} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {renderTabContent()}
      </div>
    </div>
  )
})

// Component for notification preferences
export function NotificationPreferences({ accountType, userId, organizationId }: NotificationSettingsProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('board_governance')

  const notificationCategories = [
    {
      id: 'board_governance',
      name: 'Board Governance',
      icon: Shield,
      color: 'text-blue-600',
      description: 'Board meetings, decisions, voting, and resolutions',
      notifications: [
        { id: 'board_meeting_scheduled', name: 'Board Meeting Scheduled', priority: 'high' },
        { id: 'board_meeting_reminder', name: 'Meeting Reminders', priority: 'high' },
        { id: 'voting_opened', name: 'Voting Opened', priority: 'critical' },
        { id: 'resolution_passed', name: 'Resolution Passed', priority: 'medium' },
        { id: 'action_item_assigned', name: 'Action Item Assigned', priority: 'medium' },
        { id: 'action_item_due', name: 'Action Items Due', priority: 'high' }
      ]
    },
    {
      id: 'documents',
      name: 'Document Management',
      icon: FileText,
      color: 'text-green-600',
      description: 'File uploads, sharing, approvals, and vault access',
      notifications: [
        { id: 'document_uploaded', name: 'New Document Uploaded', priority: 'medium' },
        { id: 'document_shared', name: 'Document Shared With You', priority: 'medium' },
        { id: 'document_approval_required', name: 'Document Approval Required', priority: 'high' },
        { id: 'vault_access_granted', name: 'Vault Access Granted', priority: 'medium' },
        { id: 'document_expires_soon', name: 'Document Expires Soon', priority: 'medium' }
      ]
    },
    {
      id: 'board_chat',
      name: 'BoardChat Communication',
      icon: MessageSquare,
      color: 'text-purple-600',
      description: 'Messages, mentions, voice notes, and group communications',
      notifications: [
        { id: 'new_message', name: 'New Messages', priority: 'medium' },
        { id: 'message_mention', name: 'When Mentioned', priority: 'high' },
        { id: 'voice_note_received', name: 'Voice Notes', priority: 'medium' },
        { id: 'emergency_message', name: 'Emergency Messages', priority: 'critical' },
        { id: 'group_invitation', name: 'Group Invitations', priority: 'medium' }
      ]
    },
    {
      id: 'calendar',
      name: 'Calendar & Events',
      icon: Calendar,
      color: 'text-orange-600',
      description: 'Meeting invitations, updates, and calendar conflicts',
      notifications: [
        { id: 'meeting_invitation', name: 'Meeting Invitations', priority: 'high' },
        { id: 'meeting_update', name: 'Meeting Updates', priority: 'medium' },
        { id: 'meeting_starting_soon', name: 'Meeting Starting Soon', priority: 'high' },
        { id: 'calendar_conflict', name: 'Calendar Conflicts', priority: 'medium' },
        { id: 'meeting_minutes_available', name: 'Meeting Minutes Available', priority: 'low' }
      ]
    },
    {
      id: 'compliance',
      name: 'Compliance & Workflows',
      icon: AlertTriangle,
      color: 'text-red-600',
      description: 'Compliance deadlines, workflows, and regulatory updates',
      notifications: [
        { id: 'compliance_deadline_approaching', name: 'Compliance Deadlines', priority: 'critical' },
        { id: 'workflow_step_assigned', name: 'Workflow Steps Assigned', priority: 'high' },
        { id: 'audit_scheduled', name: 'Audit Scheduled', priority: 'high' },
        { id: 'regulatory_update', name: 'Regulatory Updates', priority: 'medium' }
      ]
    },
    {
      id: 'security',
      name: 'Security & Activity',
      icon: Shield,
      color: 'text-red-600',
      description: 'Security alerts, login activities, and system notifications',
      notifications: [
        { id: 'security_alert', name: 'Security Alerts', priority: 'critical' },
        { id: 'login_from_new_device', name: 'Login from New Device', priority: 'high' },
        { id: 'suspicious_activity', name: 'Suspicious Activity', priority: 'critical' },
        { id: 'password_expires_soon', name: 'Password Expires Soon', priority: 'medium' }
      ]
    }
  ]

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50'
      case 'high': return 'text-orange-600 bg-orange-50'
      case 'medium': return 'text-blue-600 bg-blue-50'
      case 'low': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-1">Account Type: {accountType}</h3>
        <p className="text-sm text-blue-700">
          {accountType === 'Superuser' && 'Full access to all notification settings and administrative controls.'}
          {accountType === 'Administrator' && 'Access to organizational notification policies and user management alerts.'}
          {accountType === 'User' && 'Standard notification preferences for board activities and communications.'}
          {accountType === 'Viewer' && 'Limited notification access for view-only board activities.'}
        </p>
      </div>

      <div className="space-y-4">
        {notificationCategories.map(category => {
          const Icon = category.icon
          const isExpanded = expandedCategory === category.id
          
          return (
            <div key={category.id} className="bg-white border border-gray-200 rounded-lg">
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`h-6 w-6 ${category.color}`} />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{category.name}</h3>
                    <p className="text-sm text-gray-600">{category.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    {category.notifications.length} notifications
                  </span>
                  <svg
                    className={`h-5 w-5 text-gray-400 transform transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              
              {isExpanded && (
                <div className="px-6 pb-4 border-t border-gray-100">
                  <div className="space-y-3 mt-4">
                    {category.notifications.map(notification => (
                      <div key={notification.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={notification.id}
                              defaultChecked={notification.priority === 'critical' || notification.priority === 'high'}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor={notification.id} className="text-sm font-medium text-gray-900">
                              {notification.name}
                            </label>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(notification.priority)}`}>
                            {notification.priority}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <select className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                            <option value="immediate">Immediate</option>
                            <option value="digest_hourly">Hourly Digest</option>
                            <option value="digest_daily">Daily Digest</option>
                            <option value="digest_weekly">Weekly Digest</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Component for delivery methods
function DeliveryMethods({ accountType, userId, organizationId }: NotificationSettingsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Notifications */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Mail className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Email Notifications</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Enable Email Notifications</label>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="flex space-x-2">
                <input
                  type="email"
                  placeholder="your.email@company.com"
                  className="flex-1 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <button className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                  Verify
                </button>
              </div>
              <div className="flex items-center space-x-1 mt-1">
                <span className="inline-flex items-center text-xs text-green-600">
                  <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Verified
                </span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Format</label>
              <select className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                <option value="html">HTML (Rich formatting)</option>
                <option value="text">Plain Text</option>
              </select>
            </div>
          </div>
        </div>

        {/* SMS Notifications */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Smartphone className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-medium text-gray-900">SMS Notifications</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Enable SMS Notifications</label>
              <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <div className="flex space-x-2">
                <select className="border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                  <option value="+1">+1 (US)</option>
                  <option value="+44">+44 (UK)</option>
                  <option value="+49">+49 (DE)</option>
                </select>
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  className="flex-1 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <button className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700">
                  Verify
                </button>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> SMS notifications are limited to critical alerts only to avoid message overload.
              </p>
            </div>
          </div>
        </div>

        {/* Push Notifications */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Monitor className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-medium text-gray-900">Push Notifications</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Enable Browser Push</label>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Play Sound</label>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Show on Desktop</label>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Connected Devices</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Chrome on MacBook Pro</span>
                  <span className="text-green-600">Active</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Firefox on Windows PC</span>
                  <span className="text-gray-500">Last seen 2 hours ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Webhook Integration */}
        {['Superuser', 'Administrator'].includes(accountType) && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Globe className="h-6 w-6 text-teal-600" />
              <h3 className="text-lg font-medium text-gray-900">Webhook Integration</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Enable Webhooks</label>
                <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
                <input
                  type="url"
                  placeholder="https://your-api.company.com/webhooks/notifications"
                  className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secret Key</label>
                <input
                  type="password"
                  placeholder="Optional webhook secret for verification"
                  className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Retry Policy</label>
                <select className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                  <option value="none">No retries</option>
                  <option value="exponential">Exponential backoff</option>
                  <option value="linear">Linear retry</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Component for schedule and timing
function ScheduleTiming({ accountType, userId, organizationId }: NotificationSettingsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quiet Hours */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Clock className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-medium text-gray-900">Quiet Hours</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Enable Quiet Hours</label>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  defaultValue="22:00"
                  className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  defaultValue="08:00"
                  className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <select className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                <option value="America/New_York">Eastern Time (EST/EDT)</option>
                <option value="America/Chicago">Central Time (CST/CDT)</option>
                <option value="America/Denver">Mountain Time (MST/MDT)</option>
                <option value="America/Los_Angeles">Pacific Time (PST/PDT)</option>
                <option value="Europe/London">GMT/BST</option>
                <option value="Europe/Berlin">CET/CEST</option>
              </select>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Critical security alerts will still be delivered during quiet hours.
              </p>
            </div>
          </div>
        </div>

        {/* Digest Settings */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Mail className="h-6 w-6 text-orange-600" />
            <h3 className="text-lg font-medium text-gray-900">Digest Settings</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Daily Digest</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Send Time</label>
                  <input
                    type="time"
                    defaultValue="09:00"
                    className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                    <option value="enabled">Enabled</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Weekly Digest</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Send Day</label>
                  <select className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                    <option value="monday">Monday</option>
                    <option value="tuesday">Tuesday</option>
                    <option value="wednesday">Wednesday</option>
                    <option value="thursday">Thursday</option>
                    <option value="friday">Friday</option>
                    <option value="saturday">Saturday</option>
                    <option value="sunday">Sunday</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Send Time</label>
                  <input
                    type="time"
                    defaultValue="09:00"
                    className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Summary</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Send Date</label>
                  <select className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                    <option value="1">1st of month</option>
                    <option value="15">15th of month</option>
                    <option value="last">Last day of month</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                    <option value="enabled">Enabled</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Frequency Limits */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-yellow-600" />
          <h3 className="text-lg font-medium text-gray-900">Frequency Limits</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Notifications per Hour</label>
            <select className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
              <option value="unlimited">Unlimited</option>
              <option value="50">50 notifications</option>
              <option value="25">25 notifications</option>
              <option value="10">10 notifications</option>
              <option value="5">5 notifications</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bundle Similar Notifications</label>
            <select className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
              <option value="enabled">Enabled (Recommended)</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Smart Batching</label>
            <select className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>
        
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-sm text-gray-700">
            <strong>Smart Features:</strong> When enabled, similar notifications will be bundled together and delivered at optimal times to reduce interruptions while ensuring important information reaches you promptly.
          </p>
        </div>
      </div>
    </div>
  )
}

// Component for notification templates (Admin only)
function NotificationTemplates({ accountType, userId, organizationId }: NotificationSettingsProps) {
  return (
    <div className="space-y-6">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-orange-900 mb-1">Template Customization</h3>
        <p className="text-sm text-orange-700">
          Customize notification templates for your organization. Changes will apply to all organization members.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Template Management</h3>
        <p className="text-gray-600">
          Advanced template customization and branding options coming soon.
        </p>
      </div>
    </div>
  )
}

// Component for notification analytics (Admin only)
function NotificationAnalytics({ accountType, userId, organizationId }: NotificationSettingsProps) {
  return (
    <div className="space-y-6">
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-teal-900 mb-1">Notification Analytics</h3>
        <p className="text-sm text-teal-700">
          Track notification performance, engagement metrics, and optimization insights.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <Zap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Dashboard</h3>
        <p className="text-gray-600">
          Comprehensive notification analytics and insights coming soon.
        </p>
      </div>
    </div>
  )
}