'use client'

import React, { useState, useCallback, useMemo, memo } from 'react'
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
  Settings,
  Users,
  Key,
  Smartphone,
  Globe,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Monitor
} from 'lucide-react'
import type { UserId, OrganizationId } from '@/types/branded'
import { 
  SettingsHeader,
  SettingsCard, 
  SettingsSection,
  SettingsToggle,
  SettingsSelect,
  SettingsInput,
  SettingsButton,
  SettingsGrid,
  SettingsSearch,
  SettingsSkeleton,
  SettingsExportImport,
  SettingsHistory,
  SettingsReset
} from '@/features/shared/ui/settings'
import { useOptimizedCallback, useOptimizedMemo, usePerformanceMonitor } from '@/components/hooks'
import { Badge } from '@/components/atoms/display/badge'
import { Avatar } from '@/components/atoms/display/avatar'

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

type EnhancedSecurityTabProps = {
  accountType: 'superuser' | 'administrator' | 'user' | 'viewer'
  userId: UserId
  organizationId?: OrganizationId | null
}

export const EnhancedSecurityActivityTab = memo<EnhancedSecurityTabProps>(({ accountType, userId, organizationId }) => {
  const [activeSection, setActiveSection] = useState<SecuritySection>('dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(false)

  // Performance monitoring
  const renderTime = usePerformanceMonitor('EnhancedSecurityActivityTab')

  const securitySections = useMemo(() => [
    {
      id: 'dashboard' as const,
      label: 'Security Dashboard',
      description: 'Security posture overview and real-time metrics',
      icon: Shield,
      color: 'text-blue-600'
    },
    {
      id: 'access' as const,
      label: 'Access Management',
      description: 'Authentication, sessions, and login security',
      icon: Eye,
      color: 'text-green-600'
    },
    {
      id: 'activity' as const,
      label: 'Activity Monitoring',
      description: 'Comprehensive activity logs and user behavior',
      icon: Activity,
      color: 'text-purple-600'
    },
    {
      id: 'threats' as const,
      label: 'Threat Detection',
      description: 'Security incidents and threat management',
      icon: AlertTriangle,
      color: 'text-red-600'
    },
    {
      id: 'audit' as const,
      label: 'Audit & Compliance',
      description: 'Audit trails and regulatory compliance',
      icon: FileCheck,
      color: 'text-indigo-600'
    },
    {
      id: 'data_protection' as const,
      label: 'Data Protection',
      description: 'DLP, encryption, and privacy controls',
      icon: Lock,
      color: 'text-teal-600'
    },
    {
      id: 'alerts' as const,
      label: 'Security Alerts',
      description: 'Alert configuration and notification routing',
      icon: Bell,
      color: 'text-orange-600',
      requiredRole: ['superuser', 'administrator'] as const
    },
    {
      id: 'reports' as const,
      label: 'Security Reports',
      description: 'Analytics, dashboards, and reporting',
      icon: BarChart3,
      color: 'text-cyan-600'
    },
    {
      id: 'risk' as const,
      label: 'Risk Management',
      description: 'Risk assessment and mitigation workflows',
      icon: Target,
      color: 'text-pink-600',
      requiredRole: ['superuser', 'administrator'] as const
    }
  ], [])

  const availableSections = useOptimizedMemo(
    () => securitySections.filter(section => {
      if (!section.requiredRole) return true
      return section.requiredRole.includes(accountType)
    }),
    [securitySections, accountType]
  )

  const handleSectionChange = useOptimizedCallback((sectionId: SecuritySection) => {
    setActiveSection(sectionId)
  }, [])

  const handleSearch = useOptimizedCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const handleSettingsChange = useOptimizedCallback((newSettings: any) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  const handleExport = useOptimizedCallback((format: 'json' | 'csv' | 'xml') => {
    console.log('Exporting security settings in format:', format)
  }, [])

  const handleImport = useOptimizedCallback((data: any, format: string) => {
    console.log('Importing security settings:', data, format)
  }, [])

  const handleReset = useOptimizedCallback(() => {
    console.log('Resetting security settings')
  }, [])

  const renderSectionContent = useCallback(() => {
    const commonProps = { accountType, userId, organizationId, searchQuery, onSettingsChange: handleSettingsChange }
    
    switch (activeSection) {
      case 'dashboard':
        return <EnhancedSecurityDashboard {...commonProps} />
      case 'access':
        return <EnhancedAccessManagement {...commonProps} />
      case 'activity':
        return <EnhancedActivityMonitoring {...commonProps} />
      case 'threats':
        return <EnhancedThreatDetection {...commonProps} />
      case 'audit':
        return <EnhancedAuditCompliance {...commonProps} />
      case 'data_protection':
        return <EnhancedDataProtection {...commonProps} />
      case 'alerts':
        return <EnhancedSecurityAlerts {...commonProps} />
      case 'reports':
        return <EnhancedSecurityReports {...commonProps} />
      case 'risk':
        return <EnhancedRiskManagement {...commonProps} />
      default:
        return <EnhancedSecurityDashboard {...commonProps} />
    }
  }, [activeSection, accountType, userId, organizationId, searchQuery, handleSettingsChange])

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <SettingsHeader
        title="Security & Activity Management"
        subtitle="Enterprise security monitoring, threat detection, and compliance management"
        icon={Shield}
        actions={
          <div className="flex items-center space-x-3">
            <SettingsSearch
              placeholder="Search security settings..."
              onSearch={handleSearch}
              suggestions={['MFA', 'encryption', 'audit', 'threats', 'compliance', 'access logs']}
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

      <div className="flex">
        {/* Navigation Sidebar */}
        <div className="w-80 border-r border-gray-200 bg-gray-50">
          <nav className="p-4 space-y-2" role="navigation" aria-label="Security sections">
            {availableSections.map(section => {
              const Icon = section.icon
              const isActive = activeSection === section.id
              
              return (
                <button
                  key={section.id}
                  onClick={() => handleSectionChange(section.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isActive
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                      : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm'
                  }`}
                  aria-selected={isActive}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white' 
                        : `bg-gray-100 ${section.color} group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-indigo-500 group-hover:text-white`
                    }`}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
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
                      <Settings className="h-3 w-3 text-amber-500" aria-hidden="true" />
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
                <Shield className="h-3 w-3" aria-hidden="true" />
                <span className="capitalize">{accountType}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <div className="p-6">
            <div
              role="tabpanel"
              aria-labelledby={`${activeSection}-nav-item`}
            >
              {renderSectionContent()}
            </div>

            {/* Advanced Features */}
            {showAdvanced && (
              <div className="mt-8 border-t border-gray-200 pt-6">
                <SettingsSection
                  title="Advanced Security Settings"
                  description="Import/export configurations, view audit history, and reset settings"
                  collapsible={true}
                  defaultExpanded={false}
                >
                  <SettingsGrid columns={2}>
                    <SettingsExportImport
                      onExport={handleExport}
                      onImport={handleImport}
                      supportedFormats={['json', 'xml']}
                    />
                    <SettingsReset
                      onReset={handleReset}
                      confirmationRequired={true}
                      resetScopes={[
                        { id: 'access', label: 'Access Controls', description: 'Reset access management settings', selected: true },
                        { id: 'alerts', label: 'Security Alerts', description: 'Reset alert configurations', selected: false },
                        { id: 'audit', label: 'Audit Settings', description: 'Reset audit and logging settings', selected: false }
                      ]}
                    />
                  </SettingsGrid>
                </SettingsSection>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

EnhancedSecurityActivityTab.displayName = 'EnhancedSecurityActivityTab'

// Enhanced component interfaces
interface EnhancedSecurityComponentProps {
  accountType: 'superuser' | 'administrator' | 'user' | 'viewer'
  userId: UserId
  organizationId?: OrganizationId | null
  searchQuery?: string
  onSettingsChange?: (settings: any) => void
}

// Enhanced Security Dashboard Component
const EnhancedSecurityDashboard = memo<EnhancedSecurityComponentProps>(({ 
  accountType, 
  userId, 
  organizationId, 
  searchQuery = '', 
  onSettingsChange 
}) => {
  const securityMetrics = useMemo(() => [
    { label: 'Security Score', value: '92%', status: 'good', icon: Shield, color: 'text-green-600' },
    { label: 'Active Sessions', value: '12', status: 'normal', icon: Users, color: 'text-blue-600' },
    { label: 'Failed Logins (24h)', value: '3', status: 'warning', icon: AlertTriangle, color: 'text-yellow-600' },
    { label: 'Security Alerts', value: '0', status: 'good', icon: Bell, color: 'text-green-600' }
  ], [])

  const recentActivity = useMemo(() => [
    {
      id: 1,
      action: 'Login',
      user: 'John Doe',
      location: 'New York, US',
      device: 'Chrome on macOS',
      timestamp: '2024-01-10T10:30:00Z',
      status: 'success' as const,
      risk: 'low' as const
    },
    {
      id: 2,
      action: 'Password Change',
      user: 'Jane Smith',
      location: 'London, UK',
      device: 'Safari on iOS',
      timestamp: '2024-01-10T09:15:00Z',
      status: 'success' as const,
      risk: 'low' as const
    },
    {
      id: 3,
      action: 'Failed Login',
      user: 'Unknown',
      location: 'Tokyo, JP',
      device: 'Firefox on Windows',
      timestamp: '2024-01-10T08:45:00Z',
      status: 'failed' as const,
      risk: 'medium' as const
    }
  ], [])

  return (
    <SettingsSection
      title="Security Overview"
      description="Real-time security metrics and recent activity"
    >
      <div className="space-y-6">
        {/* Security Metrics */}
        <SettingsGrid columns={4}>
          {securityMetrics.map(metric => {
            const Icon = metric.icon
            return (
              <SettingsCard key={metric.label} variant="elevated">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-gray-100 ${metric.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{metric.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                  </div>
                </div>
              </SettingsCard>
            )
          })}
        </SettingsGrid>

        {/* Recent Security Activity */}
        <SettingsCard title="Recent Security Activity" icon={Activity}>
          <div className="space-y-3">
            {recentActivity.map(activity => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-1 rounded-full ${
                    activity.status === 'success' 
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {activity.status === 'success' ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{activity.action}</span>
                      <Badge variant={activity.risk === 'low' ? 'default' : activity.risk === 'medium' ? 'secondary' : 'destructive'}>
                        {activity.risk} risk
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 flex items-center space-x-4">
                      <span className="flex items-center space-x-1">
                        <Users className="h-3 w-3" />
                        <span>{activity.user}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>{activity.location}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Monitor className="h-3 w-3" />
                        <span>{activity.device}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(activity.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </SettingsCard>

        {/* Quick Actions */}
        <SettingsCard title="Security Actions">
          <SettingsGrid columns={3}>
            <SettingsButton variant="outline" icon={Shield} fullWidth>
              Run Security Scan
            </SettingsButton>
            <SettingsButton variant="outline" icon={FileCheck} fullWidth>
              Generate Audit Report
            </SettingsButton>
            <SettingsButton variant="outline" icon={Key} fullWidth>
              Rotate API Keys
            </SettingsButton>
          </SettingsGrid>
        </SettingsCard>
      </div>
    </SettingsSection>
  )
})

EnhancedSecurityDashboard.displayName = 'EnhancedSecurityDashboard'

// Enhanced Access Management Component
const EnhancedAccessManagement = memo<EnhancedSecurityComponentProps>((props) => {
  const [mfaEnabled, setMfaEnabled] = useState(true)
  const [sessionTimeout, setSessionTimeout] = useState('4')
  
  return (
    <SettingsSection 
      title="Access Management" 
      description="Configure authentication and access controls"
    >
      <div className="space-y-6">
        <SettingsCard title="Multi-Factor Authentication" icon={Smartphone}>
          <SettingsToggle
            label="Require MFA for all users"
            description="Enforce two-factor authentication for enhanced security"
            checked={mfaEnabled}
            onValueChange={setMfaEnabled}
          />
          <SettingsSelect
            label="Backup methods"
            options={[
              { value: 'sms', label: 'SMS', description: 'Text message verification' },
              { value: 'email', label: 'Email', description: 'Email-based codes' },
              { value: 'app', label: 'Authenticator App', description: 'TOTP apps like Google Authenticator' }
            ]}
            defaultValue="app"
          />
        </SettingsCard>

        <SettingsCard title="Session Management" icon={Clock}>
          <SettingsSelect
            label="Session timeout"
            description="Automatically log out users after inactivity"
            value={sessionTimeout}
            onValueChange={setSessionTimeout}
            options={[
              { value: '1', label: '1 hour', description: 'High security environments' },
              { value: '4', label: '4 hours', description: 'Balanced security and usability' },
              { value: '8', label: '8 hours', description: 'Standard business day' },
              { value: '24', label: '24 hours', description: 'Low security requirements' }
            ]}
          />
          <SettingsToggle
            label="Remember me option"
            description="Allow users to stay logged in for extended periods"
            defaultChecked={false}
          />
        </SettingsCard>

        <SettingsCard title="Password Policies" icon={Lock}>
          <SettingsToggle
            label="Enforce strong passwords"
            description="Require complex passwords with special characters"
            defaultChecked={true}
          />
          <SettingsSelect
            label="Password expiry"
            options={[
              { value: 'never', label: 'Never', description: 'Passwords never expire' },
              { value: '90', label: '90 days', description: 'Quarterly password updates' },
              { value: '60', label: '60 days', description: 'Bi-monthly updates' },
              { value: '30', label: '30 days', description: 'Monthly updates' }
            ]}
            defaultValue="90"
          />
        </SettingsCard>
      </div>
    </SettingsSection>
  )
})

EnhancedAccessManagement.displayName = 'EnhancedAccessManagement'

// Placeholder enhanced components for other sections
const EnhancedActivityMonitoring = memo<EnhancedSecurityComponentProps>((props) => {
  return (
    <SettingsSection title="Activity Monitoring" description="Monitor user activities and system events">
      <SettingsSkeleton variant="form" count={3} />
    </SettingsSection>
  )
})

const EnhancedThreatDetection = memo<EnhancedSecurityComponentProps>((props) => {
  return (
    <SettingsSection title="Threat Detection" description="Configure threat detection and incident response">
      <SettingsSkeleton variant="card" count={3} />
    </SettingsSection>
  )
})

const EnhancedAuditCompliance = memo<EnhancedSecurityComponentProps>((props) => {
  return (
    <SettingsSection title="Audit & Compliance" description="Manage audit trails and compliance requirements">
      <SettingsSkeleton variant="form" count={4} />
    </SettingsSection>
  )
})

const EnhancedDataProtection = memo<EnhancedSecurityComponentProps>((props) => {
  return (
    <SettingsSection title="Data Protection" description="Configure encryption and data loss prevention">
      <SettingsSkeleton variant="card" count={2} />
    </SettingsSection>
  )
})

const EnhancedSecurityAlerts = memo<EnhancedSecurityComponentProps>((props) => {
  return (
    <SettingsSection title="Security Alerts" description="Configure security alert notifications">
      <SettingsSkeleton variant="form" count={3} />
    </SettingsSection>
  )
})

const EnhancedSecurityReports = memo<EnhancedSecurityComponentProps>((props) => {
  return (
    <SettingsSection title="Security Reports" description="Generate and view security analytics">
      <SettingsSkeleton variant="card" count={4} />
    </SettingsSection>
  )
})

const EnhancedRiskManagement = memo<EnhancedSecurityComponentProps>((props) => {
  return (
    <SettingsSection title="Risk Management" description="Assess and mitigate security risks">
      <SettingsSkeleton variant="form" count={3} />
    </SettingsSection>
  )
})

EnhancedActivityMonitoring.displayName = 'EnhancedActivityMonitoring'
EnhancedThreatDetection.displayName = 'EnhancedThreatDetection'
EnhancedAuditCompliance.displayName = 'EnhancedAuditCompliance'
EnhancedDataProtection.displayName = 'EnhancedDataProtection'
EnhancedSecurityAlerts.displayName = 'EnhancedSecurityAlerts'
EnhancedSecurityReports.displayName = 'EnhancedSecurityReports'
EnhancedRiskManagement.displayName = 'EnhancedRiskManagement'