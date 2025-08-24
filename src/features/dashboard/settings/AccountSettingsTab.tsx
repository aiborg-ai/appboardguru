'use client'

import React, { useState } from 'react'
import { 
  User, 
  Shield, 
  Users, 
  Settings, 
  FileCheck, 
  BarChart3, 
  Bell, 
  Lock 
} from 'lucide-react'
import { AccountTypeDisplay } from './AccountTypeDisplay'
import { CorporateProfile } from './CorporateProfile'
import { SecuritySettings } from './SecuritySettings'
import { DelegationManager } from './DelegationManager'
import { CompliancePanel } from './CompliancePanel'
import { ResourceQuotas } from './ResourceQuotas'
import { NotificationPreferences } from './NotificationPreferences'
import { PrivacyControls } from './PrivacyControls'
import type { UserId, OrganizationId } from '@/types/branded'

type AccountSettingsSection = 
  | 'overview' 
  | 'profile' 
  | 'security' 
  | 'delegation' 
  | 'compliance' 
  | 'resources' 
  | 'notifications' 
  | 'privacy'

interface AccountSettingsTabProps {
  accountType: 'Superuser' | 'Administrator' | 'User' | 'Viewer'
  userId: UserId
  organizationId?: OrganizationId | null
}

export function AccountSettingsTab({ accountType, userId, organizationId }: AccountSettingsTabProps) {
  const [activeSection, setActiveSection] = useState<AccountSettingsSection>('overview')

  const sections = [
    { 
      id: 'overview' as const, 
      label: 'Account Overview', 
      icon: User, 
      description: 'Account type, status, and permissions'
    },
    { 
      id: 'profile' as const, 
      label: 'Corporate Profile', 
      icon: Settings, 
      description: 'Professional information and identity'
    },
    { 
      id: 'security' as const, 
      label: 'Security & Auth', 
      icon: Shield, 
      description: 'Authentication and security settings'
    },
    { 
      id: 'delegation' as const, 
      label: 'Delegation', 
      icon: Users, 
      description: 'Deputy and coverage management'
    },
    { 
      id: 'compliance' as const, 
      label: 'Compliance', 
      icon: FileCheck, 
      description: 'Regulatory and governance tracking'
    },
    { 
      id: 'resources' as const, 
      label: 'Usage & Quotas', 
      icon: BarChart3, 
      description: 'Resource limits and usage monitoring'
    },
    { 
      id: 'notifications' as const, 
      label: 'Communications', 
      icon: Bell, 
      description: 'Notification and communication preferences'
    },
    { 
      id: 'privacy' as const, 
      label: 'Data & Privacy', 
      icon: Lock, 
      description: 'Privacy controls and data management'
    }
  ]

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'overview':
        return <AccountTypeDisplay />
      case 'profile':
        return <CorporateProfile />
      case 'security':
        return <SecuritySettings />
      case 'delegation':
        return <DelegationManager />
      case 'compliance':
        return <CompliancePanel />
      case 'resources':
        return <ResourceQuotas />
      case 'notifications':
        return <NotificationPreferences />
      case 'privacy':
        return <PrivacyControls />
      default:
        return <AccountTypeDisplay />
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <User className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Account Management</h2>
            <p className="text-sm text-gray-600">
              Corporate account settings, permissions, and governance controls
            </p>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Navigation Sidebar */}
        <div className="w-64 border-r border-gray-200">
          <nav className="p-4 space-y-2">
            {sections.map(section => {
              const Icon = section.icon
              const isActive = activeSection === section.id
              
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-3 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <Icon className={`h-5 w-5 mt-0.5 ${
                      isActive ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div>
                      <div className={`font-medium ${
                        isActive ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {section.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {section.description}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6">
          {renderSectionContent()}
        </div>
      </div>
    </div>
  )
}