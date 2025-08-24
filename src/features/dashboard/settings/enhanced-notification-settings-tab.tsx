'use client'

import React, { useState, useCallback, useMemo, memo } from 'react'
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
import type { UserId, OrganizationId } from '@/types/branded'
import { 
  SettingsHeader,
  SettingsCard, 
  SettingsSection,
  SettingsToggle,
  SettingsSelect,
  SettingsGrid,
  SettingsSearch,
  SettingsSkeleton,
  SettingsExportImport,
  SettingsHistory,
  SettingsReset
} from '@/features/shared/ui/settings'
import { useOptimizedCallback, useOptimizedMemo, usePerformanceMonitor } from '@/components/hooks'

type NotificationTab = 
  | 'preferences' 
  | 'delivery' 
  | 'schedule' 
  | 'templates' 
  | 'analytics'

type EnhancedNotificationSettingsProps = {
  accountType: 'Superuser' | 'Administrator' | 'User' | 'Viewer'
  userId: UserId
  organizationId?: OrganizationId | null
}

export const EnhancedNotificationSettingsTab = memo<EnhancedNotificationSettingsProps>(({ accountType, userId, organizationId }) => {
  const [activeTab, setActiveTab] = useState<NotificationTab>('preferences')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Performance monitoring
  const renderTime = usePerformanceMonitor('EnhancedNotificationSettingsTab')

  const tabs = useMemo(() => [
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
  ], [])

  const visibleTabs = useOptimizedMemo(
    () => tabs.filter(tab => 
      !tab.adminOnly || ['Superuser', 'Administrator'].includes(accountType)
    ),
    [tabs, accountType]
  )

  const handleTabChange = useOptimizedCallback((tabId: NotificationTab) => {
    setActiveTab(tabId)
  }, [])

  const handleSearch = useOptimizedCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const handleSettingsChange = useOptimizedCallback((newSettings: any) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  const handleExport = useOptimizedCallback((format: 'json' | 'csv' | 'xml') => {
    // Implementation for exporting settings
    console.log('Exporting notification settings in format:', format)
  }, [])

  const handleImport = useOptimizedCallback((data: any, format: string) => {
    // Implementation for importing settings
    console.log('Importing notification settings:', data, format)
  }, [])

  const handleReset = useOptimizedCallback(() => {
    // Implementation for resetting settings
    console.log('Resetting notification settings')
  }, [])

  const renderTabContent = useCallback(() => {
    const commonProps = { accountType, userId, organizationId, searchQuery, onSettingsChange: handleSettingsChange }
    
    switch (activeTab) {
      case 'preferences':
        return <EnhancedNotificationPreferences {...commonProps} />
      case 'delivery':
        return <EnhancedDeliveryMethods {...commonProps} />
      case 'schedule':
        return <EnhancedScheduleTiming {...commonProps} />
      case 'templates':
        return <EnhancedNotificationTemplates {...commonProps} />
      case 'analytics':
        return <EnhancedNotificationAnalytics {...commonProps} />
      default:
        return <EnhancedNotificationPreferences {...commonProps} />
    }
  }, [activeTab, accountType, userId, organizationId, searchQuery, handleSettingsChange])

  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Notification Settings"
        subtitle="Manage how and when you receive notifications for board activities and communications"
        icon={Bell}
        actions={
          <div className="flex items-center space-x-3">
            <SettingsSearch
              placeholder="Search notification settings..."
              onSearch={handleSearch}
              suggestions={['email', 'push', 'sms', 'webhook', 'board meetings', 'documents']}
            />
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              aria-label={showAdvanced ? 'Hide advanced settings' : 'Show advanced settings'}
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced
            </button>
          </div>
        }
      />

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" role="tablist">
          {visibleTabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`group inline-flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`${tab.id}-panel`}
                id={`${tab.id}-tab`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : tab.color} group-hover:${tab.color} transition-colors`} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        <div
          role="tabpanel"
          id={`${activeTab}-panel`}
          aria-labelledby={`${activeTab}-tab`}
        >
          {renderTabContent()}
        </div>
      </div>

      {/* Advanced Features */}
      {showAdvanced && (
        <div className="mt-8 border-t border-gray-200 pt-6">
          <SettingsSection
            title="Advanced Settings"
            description="Import/export settings, view history, and reset configurations"
            collapsible={true}
            defaultExpanded={false}
          >
            <SettingsGrid columns={2}>
              <SettingsExportImport
                onExport={handleExport}
                onImport={handleImport}
                supportedFormats={['json', 'csv']}
              />
              <SettingsReset
                onReset={handleReset}
                confirmationRequired={true}
                resetScopes={[
                  { id: 'preferences', label: 'Notification Preferences', description: 'Reset all notification preferences', selected: true },
                  { id: 'delivery', label: 'Delivery Methods', description: 'Reset email, SMS, and push settings', selected: false },
                  { id: 'schedule', label: 'Schedule Settings', description: 'Reset quiet hours and timing', selected: false }
                ]}
              />
            </SettingsGrid>
          </SettingsSection>
        </div>
      )}
    </div>
  )
})

EnhancedNotificationSettingsTab.displayName = 'EnhancedNotificationSettingsTab'

// Enhanced component interfaces
interface EnhancedNotificationComponentProps {
  accountType: 'Superuser' | 'Administrator' | 'User' | 'Viewer'
  userId: UserId
  organizationId?: OrganizationId | null
  searchQuery?: string
  onSettingsChange?: (settings: any) => void
}

// Enhanced Notification Preferences Component
const EnhancedNotificationPreferences = memo<EnhancedNotificationComponentProps>(({ 
  accountType, 
  userId, 
  organizationId, 
  searchQuery = '', 
  onSettingsChange 
}) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('board_governance')
  const [preferences, setPreferences] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  
  const handleToggleChange = useOptimizedCallback((notificationId: string, enabled: boolean) => {
    const newPreferences = { ...preferences, [notificationId]: enabled }
    setPreferences(newPreferences)
    onSettingsChange?.(newPreferences)
  }, [preferences, onSettingsChange])

  const notificationCategories = useMemo(() => [
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
    }
  ], [])

  // Filter categories based on search query
  const filteredCategories = useOptimizedMemo(() => {
    if (!searchQuery.trim()) return notificationCategories
    return notificationCategories.filter(category => 
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.notifications.some(notif => 
        notif.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
  }, [notificationCategories, searchQuery])

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50'
      case 'high': return 'text-orange-600 bg-orange-50'
      case 'medium': return 'text-blue-600 bg-blue-50'
      case 'low': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }, [])

  return (
    <SettingsSection
      title="Notification Preferences"
      description="Configure which notifications you want to receive"
    >
      <div className="space-y-6">
        {/* Account Type Info */}
        <SettingsCard
          variant="elevated"
          size="sm"
        >
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-1">Account Type: {accountType}</h3>
            <p className="text-sm text-blue-700">
              {accountType === 'Superuser' && 'Full access to all notification settings and administrative controls.'}
              {accountType === 'Administrator' && 'Access to organizational notification policies and user management alerts.'}
              {accountType === 'User' && 'Standard notification preferences for board activities and communications.'}
              {accountType === 'Viewer' && 'Limited notification access for view-only board activities.'}
            </p>
          </div>
        </SettingsCard>

        <div className="space-y-4">
          {filteredCategories.map(category => {
            const Icon = category.icon
            const isExpanded = expandedCategory === category.id
            
            return (
              <SettingsCard key={category.id} variant="bordered">
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
                  aria-expanded={isExpanded}
                  aria-controls={`category-${category.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-6 w-6 ${category.color}`} aria-hidden="true" />
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
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                
                {isExpanded && (
                  <div
                    id={`category-${category.id}`}
                    className="px-6 pb-4 border-t border-gray-100 animate-in slide-in-from-top-2 fade-in-0 duration-200"
                  >
                    <div className="space-y-4 mt-4">
                      {category.notifications.map(notification => (
                        <div key={notification.id} className="py-2">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3 flex-1">
                              <SettingsToggle
                                id={notification.id}
                                label={notification.name}
                                checked={preferences[notification.id] ?? (notification.priority === 'critical' || notification.priority === 'high')}
                                onValueChange={(checked) => handleToggleChange(notification.id, checked)}
                                size="sm"
                              />
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(notification.priority)}`}>
                                {notification.priority}
                              </span>
                            </div>
                          </div>
                          <div className="ml-6">
                            <SettingsSelect
                              label="Delivery frequency"
                              value="immediate"
                              options={[
                                { value: 'immediate', label: 'Immediate', description: 'Send notification right away' },
                                { value: 'digest_hourly', label: 'Hourly Digest', description: 'Bundle into hourly summary' },
                                { value: 'digest_daily', label: 'Daily Digest', description: 'Include in daily summary' },
                                { value: 'digest_weekly', label: 'Weekly Digest', description: 'Include in weekly summary' }
                              ]}
                              size="sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </SettingsCard>
            )
          })}
        </div>
      </div>
    </SettingsSection>
  )
})

EnhancedNotificationPreferences.displayName = 'EnhancedNotificationPreferences'

// Placeholder enhanced components for other tabs
const EnhancedDeliveryMethods = memo<EnhancedNotificationComponentProps>((props) => {
  return (
    <SettingsSection title="Delivery Methods" description="Configure how notifications are delivered">
      <SettingsSkeleton variant="form" count={3} />
    </SettingsSection>
  )
})

const EnhancedScheduleTiming = memo<EnhancedNotificationComponentProps>((props) => {
  return (
    <SettingsSection title="Schedule & Timing" description="Set quiet hours and delivery timing">
      <SettingsSkeleton variant="form" count={3} />
    </SettingsSection>
  )
})

const EnhancedNotificationTemplates = memo<EnhancedNotificationComponentProps>((props) => {
  return (
    <SettingsSection title="Templates & Customization" description="Customize notification messages">
      <SettingsSkeleton variant="form" count={2} />
    </SettingsSection>
  )
})

const EnhancedNotificationAnalytics = memo<EnhancedNotificationComponentProps>((props) => {
  return (
    <SettingsSection title="Analytics & Insights" description="View notification performance metrics">
      <SettingsSkeleton variant="card" count={3} />
    </SettingsSection>
  )
})

EnhancedDeliveryMethods.displayName = 'EnhancedDeliveryMethods'
EnhancedScheduleTiming.displayName = 'EnhancedScheduleTiming'
EnhancedNotificationTemplates.displayName = 'EnhancedNotificationTemplates'
EnhancedNotificationAnalytics.displayName = 'EnhancedNotificationAnalytics'