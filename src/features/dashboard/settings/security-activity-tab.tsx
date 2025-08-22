'use client'

import React, { useState } from 'react'
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  FileCheck, 
  Lock, 
  Bell, 
  BarChart3, 
  Target,
  Eye,
  Settings 
} from 'lucide-react'
import { SecurityDashboard } from './security-dashboard'
import { AccessManagement } from './access-management'
import { ActivityMonitoring } from './activity-monitoring'
import { ThreatDetection } from './threat-detection'
import { AuditCompliance } from './audit-compliance'
import { DataProtection } from './data-protection'
import { SecurityAlerts } from './security-alerts'
import { SecurityReports } from './security-reports'
import { RiskManagement } from './risk-management'
import type { SecurityTabProps } from '@/types/security-types'

type SecuritySection = 
  | 'dashboard'
  | 'access'
  | 'activity'
  | 'threats'
  | 'audit'
  | 'data_protection'
  | 'alerts'
  | 'reports'
  | 'risk'

interface SecuritySectionConfig {
  id: SecuritySection
  label: string
  description: string
  icon: React.ComponentType<any>
  color: string
  requiredRole?: ('superuser' | 'administrator')[]
}

const securitySections: SecuritySectionConfig[] = [
  {
    id: 'dashboard',
    label: 'Security Dashboard',
    description: 'Security posture overview and real-time metrics',
    icon: Shield,
    color: 'text-blue-600'
  },
  {
    id: 'access',
    label: 'Access Management',
    description: 'Authentication, sessions, and login security',
    icon: Eye,
    color: 'text-green-600'
  },
  {
    id: 'activity',
    label: 'Activity Monitoring',
    description: 'Comprehensive activity logs and user behavior',
    icon: Activity,
    color: 'text-purple-600'
  },
  {
    id: 'threats',
    label: 'Threat Detection',
    description: 'Security incidents and threat management',
    icon: AlertTriangle,
    color: 'text-red-600'
  },
  {
    id: 'audit',
    label: 'Audit & Compliance',
    description: 'Audit trails and regulatory compliance',
    icon: FileCheck,
    color: 'text-indigo-600'
  },
  {
    id: 'data_protection',
    label: 'Data Protection',
    description: 'DLP, encryption, and privacy controls',
    icon: Lock,
    color: 'text-teal-600'
  },
  {
    id: 'alerts',
    label: 'Security Alerts',
    description: 'Alert configuration and notification routing',
    icon: Bell,
    color: 'text-orange-600',
    requiredRole: ['superuser', 'administrator']
  },
  {
    id: 'reports',
    label: 'Security Reports',
    description: 'Analytics, dashboards, and reporting',
    icon: BarChart3,
    color: 'text-cyan-600'
  },
  {
    id: 'risk',
    label: 'Risk Management',
    description: 'Risk assessment and mitigation workflows',
    icon: Target,
    color: 'text-pink-600',
    requiredRole: ['superuser', 'administrator']
  }
]

export function SecurityActivityTab({
  accountType,
  userId,
  organizationId
}: SecurityTabProps) {
  const [activeSection, setActiveSection] = useState<SecuritySection>('dashboard')

  // Filter sections based on account type
  const availableSections = securitySections.filter(section => {
    if (!section.requiredRole) return true
    return section.requiredRole.includes(accountType)
  })

  const renderSectionContent = () => {
    const commonProps: SecurityTabProps = {
      accountType,
      userId,
      organizationId
    }

    switch (activeSection) {
      case 'dashboard':
        return <SecurityDashboard {...commonProps} />
      case 'access':
        return <AccessManagement {...commonProps} />
      case 'activity':
        return <ActivityMonitoring {...commonProps} />
      case 'threats':
        return <ThreatDetection {...commonProps} />
      case 'audit':
        return <AuditCompliance {...commonProps} />
      case 'data_protection':
        return <DataProtection {...commonProps} />
      case 'alerts':
        return <SecurityAlerts {...commonProps} />
      case 'reports':
        return <SecurityReports {...commonProps} />
      case 'risk':
        return <RiskManagement {...commonProps} />
      default:
        return <SecurityDashboard {...commonProps} />
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Security & Activity Management</h2>
            <p className="text-sm text-gray-600">
              Enterprise security monitoring, threat detection, and compliance management
            </p>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Navigation Sidebar */}
        <div className="w-80 border-r border-gray-200 bg-gray-50">
          <nav className="p-4 space-y-2">
            {availableSections.map(section => {
              const Icon = section.icon
              const isActive = activeSection === section.id
              
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors group ${
                    isActive
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                      : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white' 
                        : `bg-gray-100 ${section.color} group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-indigo-500 group-hover:text-white`
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm ${
                        isActive ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'
                      }`}>
                        {section.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 leading-tight">
                        {section.description}
                      </div>
                    </div>
                  </div>
                  
                  {/* Security Badge for restricted sections */}
                  {section.requiredRole && (
                    <div className="mt-2 flex items-center space-x-1">
                      <Settings className="h-3 w-3 text-amber-500" />
                      <span className="text-xs text-amber-600 font-medium">
                        Admin Required
                      </span>
                    </div>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Account Type Badge */}
          <div className="p-4 border-t border-gray-200">
            <div className={`px-3 py-2 rounded-lg text-xs font-medium text-center ${
              accountType === 'superuser' 
                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                : accountType === 'administrator'
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : accountType === 'user'
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-gray-100 text-gray-600 border border-gray-200'
            }`}>
              <div className="flex items-center justify-center space-x-1">
                <Shield className="h-3 w-3" />
                <span className="capitalize">{accountType}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <div className="p-6">
            {renderSectionContent()}
          </div>
        </div>
      </div>
    </div>
  )
}