'use client'

import React, { useState } from 'react'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { AISettingsPanel } from '@/features/dashboard/settings/AISettingsPanel'
import { ActivityLogsTab } from '@/features/dashboard/settings/ActivityLogsTab'
import { FYITab } from '@/features/dashboard/settings/FYITab'
import { SecurityActivityTab } from '@/features/dashboard/settings/security-activity-tab'
import { AccountSettingsTab } from '@/features/dashboard/settings/AccountSettingsTab'
import { ExportBackupSettingsTab } from '@/features/dashboard/settings/export-backup-settings-tab'
import { NotificationSettingsTab } from '@/features/dashboard/settings/notification-settings-tab'
import { useUserContext, useUserContextLoading } from '@/hooks/useUserContext'
import type { UserId, OrganizationId } from '@/types/branded'
import { 
  Settings, 
  Brain, 
  User, 
  Shield, 
  Bell, 
  Download,
  Upload,
  Activity,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { InfoTooltip, InfoSection } from '@/components/ui/info-tooltip'

type SettingsTab = 'ai' | 'account' | 'security' | 'notifications' | 'export'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai')
  
  // Get user context with proper error handling following CLAUDE.md patterns
  const userContextResult = useUserContext()
  const { isLoading, hasError, errorMessage } = useUserContextLoading()
  
  // Early return for loading state
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-600">Loading user settings...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }
  
  // Error state with proper error handling
  if (hasError || !userContextResult.success) {
    const error = userContextResult.error || { message: errorMessage || 'Unknown error' }
    
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
              <div className="flex items-center space-x-3 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <h3 className="text-lg font-medium text-red-900">Settings Unavailable</h3>
              </div>
              <p className="text-red-700 mb-4">
                {error.message}
              </p>
              <p className="text-sm text-red-600">
                Please try refreshing the page or contact support if the issue persists.
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }
  
  // Extract user context data
  const userContext = userContextResult.data!
  const { accountType, userId, organizationId } = userContext

  const tabs = [
    { 
      id: 'ai' as const, 
      label: 'AI Assistant', 
      icon: Brain, 
      color: 'text-purple-600',
      description: 'Configure AI assistant preferences, behavior, and integration settings'
    },
    { 
      id: 'account' as const, 
      label: 'Account', 
      icon: User, 
      color: 'text-blue-600',
      description: 'Manage profile information, personal settings, and account preferences'
    },
    { 
      id: 'security' as const, 
      label: 'Security & Activity', 
      icon: Activity, 
      color: 'text-green-600',
      description: 'Security settings, activity monitoring, and compliance tracking'
    },
    { 
      id: 'notifications' as const, 
      label: 'Notifications', 
      icon: Bell, 
      color: 'text-yellow-600',
      description: 'Notification preferences and alert settings for optimal productivity'
    },
    { 
      id: 'export' as const, 
      label: 'Export & Backup', 
      icon: Download, 
      color: 'text-gray-600',
      description: 'Data export, backup settings, and archive management'
    }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'ai':
        return <AISettingsPanel />
      
      case 'account':
        return <AccountSettingsTab />
      
      case 'security':
        return <SecurityActivityTab />
      
      case 'notifications':
        return (
          <NotificationSettingsTab 
            accountType={accountType}
            userId={userId!}
            organizationId={organizationId}
          />
        )
      
      case 'export':
        return (
          <ExportBackupSettingsTab 
            accountType={accountType}
            userId={userId!}
            organizationId={organizationId}
          />
        )
      
      default:
        return null
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Settings className="h-8 w-8 text-gray-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Settings
              <InfoTooltip
                content={
                  <InfoSection
                    title="Application Settings & Controls"
                    description="Comprehensive settings panel for managing your account, security, AI preferences, and application behavior."
                    features={[
                      "AI Assistant configuration and preferences",
                      "Account management and profile settings",
                      "Security settings with activity monitoring",
                      "Notification preferences and controls",
                      "Data export and backup capabilities",
                      "Organization and permission management",
                      "Integration and API settings",
                      "Compliance and audit configurations"
                    ]}
                    tips={[
                      "Regularly review security activity logs",
                      "Configure AI assistant for your workflow",
                      "Set up data backup schedules",
                      "Review notification settings for optimal productivity"
                    ]}
                  />
                }
                side="right"
              />
            </h1>
            <div className="space-y-1">
              <p className="text-gray-600">Manage your account and application preferences</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>Account: <span className="font-medium text-gray-700">{accountType}</span></span>
                {userContext.user?.full_name && (
                  <span>User: <span className="font-medium text-gray-700">{userContext.user.full_name}</span></span>
                )}
                {userContext.currentOrganization && (
                  <span>Organization: <span className="font-medium text-gray-700">{userContext.currentOrganization.name}</span></span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Settings Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <nav className="space-y-1 p-2">
                {tabs.map(tab => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`h-5 w-5 ${isActive ? 'text-blue-700' : tab.color}`} />
                        <span className="font-medium">{tab.label}</span>
                      </div>
                      <InfoTooltip
                        content={tab.description}
                        size="sm"
                      />
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>
          
          {/* Settings Content */}
          <div className="flex-1">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}