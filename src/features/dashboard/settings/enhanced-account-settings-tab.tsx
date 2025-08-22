'use client'

import React, { useState, useCallback, useMemo, memo } from 'react'
import { 
  User, 
  Shield, 
  Users, 
  Settings, 
  FileCheck, 
  BarChart3, 
  Bell, 
  Lock,
  Building,
  Mail,
  Phone,
  Globe,
  Camera,
  Edit,
  Calendar,
  MapPin,
  Briefcase,
  Award,
  Key,
  Smartphone
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
} from '@/components/ui/settings'
import { useOptimizedCallback, useOptimizedMemo, usePerformanceMonitor } from '@/components/hooks'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

type AccountSettingsSection = 
  | 'overview' 
  | 'profile' 
  | 'security' 
  | 'delegation' 
  | 'compliance' 
  | 'resources' 
  | 'notifications' 
  | 'privacy'

type EnhancedAccountSettingsProps = {
  accountType?: 'Superuser' | 'Administrator' | 'User' | 'Viewer'
  userId?: UserId
  organizationId?: OrganizationId | null
}

export const EnhancedAccountSettingsTab = memo<EnhancedAccountSettingsProps>(({ 
  accountType = 'User', 
  userId, 
  organizationId 
}) => {
  const [activeSection, setActiveSection] = useState<AccountSettingsSection>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(false)

  // Performance monitoring
  const renderTime = usePerformanceMonitor('EnhancedAccountSettingsTab')

  const sections = useMemo(() => [
    { 
      id: 'overview' as const, 
      label: 'Account Overview', 
      icon: User, 
      description: 'Account type, status, and permissions',
      color: 'text-blue-600'
    },
    { 
      id: 'profile' as const, 
      label: 'Corporate Profile', 
      icon: Building, 
      description: 'Professional information and identity',
      color: 'text-green-600'
    },
    { 
      id: 'security' as const, 
      label: 'Security & Auth', 
      icon: Shield, 
      description: 'Authentication and security settings',
      color: 'text-red-600'
    },
    { 
      id: 'delegation' as const, 
      label: 'Delegation', 
      icon: Users, 
      description: 'Deputy and coverage management',
      color: 'text-purple-600'
    },
    { 
      id: 'compliance' as const, 
      label: 'Compliance', 
      icon: FileCheck, 
      description: 'Regulatory and governance tracking',
      color: 'text-orange-600'
    },
    { 
      id: 'resources' as const, 
      label: 'Usage & Quotas', 
      icon: BarChart3, 
      description: 'Resource limits and usage monitoring',
      color: 'text-teal-600'
    },
    { 
      id: 'notifications' as const, 
      label: 'Communications', 
      icon: Bell, 
      description: 'Notification and communication preferences',
      color: 'text-yellow-600'
    },
    { 
      id: 'privacy' as const, 
      label: 'Data & Privacy', 
      icon: Lock, 
      description: 'Privacy controls and data management',
      color: 'text-gray-600'
    }
  ], [])

  const handleSectionChange = useOptimizedCallback((sectionId: AccountSettingsSection) => {
    setActiveSection(sectionId)
  }, [])

  const handleSearch = useOptimizedCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const handleSettingsChange = useOptimizedCallback((newSettings: any) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  const handleExport = useOptimizedCallback((format: 'json' | 'csv' | 'xml') => {
    console.log('Exporting account settings in format:', format)
  }, [])

  const handleImport = useOptimizedCallback((data: any, format: string) => {
    console.log('Importing account settings:', data, format)
  }, [])

  const handleReset = useOptimizedCallback(() => {
    console.log('Resetting account settings')
  }, [])

  const renderSectionContent = useCallback(() => {
    const commonProps = { accountType, userId, organizationId, searchQuery, onSettingsChange: handleSettingsChange }
    
    switch (activeSection) {
      case 'overview':
        return <EnhancedAccountOverview {...commonProps} />
      case 'profile':
        return <EnhancedCorporateProfile {...commonProps} />
      case 'security':
        return <EnhancedSecuritySettings {...commonProps} />
      case 'delegation':
        return <EnhancedDelegationManager {...commonProps} />
      case 'compliance':
        return <EnhancedCompliancePanel {...commonProps} />
      case 'resources':
        return <EnhancedResourceQuotas {...commonProps} />
      case 'notifications':
        return <EnhancedNotificationPreferences {...commonProps} />
      case 'privacy':
        return <EnhancedPrivacyControls {...commonProps} />
      default:
        return <EnhancedAccountOverview {...commonProps} />
    }
  }, [activeSection, accountType, userId, organizationId, searchQuery, handleSettingsChange])

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <SettingsHeader
        title="Account Management"
        subtitle="Corporate account settings, permissions, and governance controls"
        icon={User}
        actions={
          <div className="flex items-center space-x-3">
            <SettingsSearch
              placeholder="Search account settings..."
              onSearch={handleSearch}
              suggestions={['profile', 'security', 'MFA', 'delegation', 'compliance', 'privacy']}
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
        <div className="w-64 border-r border-gray-200">
          <nav className="p-4 space-y-2" role="navigation" aria-label="Account settings sections">
            {sections.map(section => {
              const Icon = section.icon
              const isActive = activeSection === section.id
              
              return (
                <button
                  key={section.id}
                  onClick={() => handleSectionChange(section.id)}
                  className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  aria-selected={isActive}
                >
                  <div className="flex items-start space-x-3">
                    <Icon className={`h-5 w-5 mt-0.5 ${
                      isActive ? 'text-blue-600' : section.color
                    }`} aria-hidden="true" />
                    <div>
                      <div className={`font-medium ${
                        isActive ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {section.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 leading-tight">
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
                title="Advanced Account Settings"
                description="Import/export profile data, view change history, and reset configurations"
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
                      { id: 'profile', label: 'Profile Information', description: 'Reset profile data to defaults', selected: true },
                      { id: 'preferences', label: 'User Preferences', description: 'Reset notification and display preferences', selected: false },
                      { id: 'security', label: 'Security Settings', description: 'Reset security configurations', selected: false }
                    ]}
                  />
                </SettingsGrid>
              </SettingsSection>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

EnhancedAccountSettingsTab.displayName = 'EnhancedAccountSettingsTab'

// Enhanced component interfaces
interface EnhancedAccountComponentProps {
  accountType?: 'Superuser' | 'Administrator' | 'User' | 'Viewer'
  userId?: UserId
  organizationId?: OrganizationId | null
  searchQuery?: string
  onSettingsChange?: (settings: any) => void
}

// Enhanced Account Overview Component
const EnhancedAccountOverview = memo<EnhancedAccountComponentProps>(({ 
  accountType = 'User', 
  userId, 
  organizationId, 
  searchQuery = '', 
  onSettingsChange 
}) => {
  const accountInfo = useMemo(() => ({
    name: 'John Doe',
    email: 'john.doe@company.com',
    role: 'Board Member',
    department: 'Executive',
    joinDate: '2023-06-15',
    lastLogin: '2024-01-10T14:30:00Z',
    status: 'Active'
  }), [])

  const permissions = useMemo(() => {
    const basePermissions = [
      'View board documents',
      'Participate in meetings',
      'Access vault files'
    ]
    
    if (accountType === 'Administrator' || accountType === 'Superuser') {
      return [
        ...basePermissions,
        'Manage user accounts',
        'Configure system settings',
        'View audit logs'
      ]
    }
    
    return basePermissions
  }, [accountType])

  return (
    <SettingsSection
      title="Account Overview"
      description="Your account information and current status"
    >
      <div className="space-y-6">
        {/* Profile Summary */}
        <SettingsCard variant="elevated">
          <div className="flex items-start space-x-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <img 
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${accountInfo.name}`}
                  alt={accountInfo.name}
                  className="rounded-full"
                />
              </Avatar>
              <button className="absolute -bottom-1 -right-1 p-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
                <Camera className="h-3 w-3" />
              </button>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h2 className="text-xl font-semibold text-gray-900">{accountInfo.name}</h2>
                <Badge variant={accountInfo.status === 'Active' ? 'default' : 'secondary'}>
                  {accountInfo.status}
                </Badge>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Mail className="h-3 w-3" />
                  <span>{accountInfo.email}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Briefcase className="h-3 w-3" />
                  <span>{accountInfo.role} • {accountInfo.department}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>Joined {new Date(accountInfo.joinDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            <SettingsButton variant="outline" icon={Edit} size="sm">
              Edit Profile
            </SettingsButton>
          </div>
        </SettingsCard>

        <SettingsGrid columns={2}>
          {/* Account Type & Permissions */}
          <SettingsCard title="Account Type & Permissions" icon={Shield}>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Account Type</span>
                  <Badge variant={
                    accountType === 'Superuser' ? 'default' :
                    accountType === 'Administrator' ? 'secondary' :
                    'outline'
                  }>
                    {accountType}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600">
                  {accountType === 'Superuser' && 'Full system access with administrative privileges'}
                  {accountType === 'Administrator' && 'Organization management with user administration'}
                  {accountType === 'User' && 'Standard access to board activities and documents'}
                  {accountType === 'Viewer' && 'Read-only access to public board information'}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Permissions</h4>
                <div className="space-y-1">
                  {permissions.map((permission, index) => (
                    <div key={index} className="flex items-center space-x-2 text-xs">
                      <div className="w-1 h-1 bg-green-500 rounded-full" />
                      <span className="text-gray-600">{permission}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SettingsCard>

          {/* Account Activity */}
          <SettingsCard title="Recent Activity" icon={BarChart3}>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Last login</span>
                <span className="font-medium">{new Date(accountInfo.lastLogin).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Sessions this month</span>
                <span className="font-medium">24</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Documents accessed</span>
                <span className="font-medium">156</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Meetings attended</span>
                <span className="font-medium">8</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <SettingsButton variant="outline" size="sm" fullWidth>
                View Full Activity
              </SettingsButton>
            </div>
          </SettingsCard>
        </SettingsGrid>

        {/* Quick Actions */}
        <SettingsCard title="Quick Actions">
          <SettingsGrid columns={4}>
            <SettingsButton variant="outline" icon={Key} size="sm" fullWidth>
              Change Password
            </SettingsButton>
            <SettingsButton variant="outline" icon={Smartphone} size="sm" fullWidth>
              Setup MFA
            </SettingsButton>
            <SettingsButton variant="outline" icon={Bell} size="sm" fullWidth>
              Notifications
            </SettingsButton>
            <SettingsButton variant="outline" icon={Lock} size="sm" fullWidth>
              Privacy Settings
            </SettingsButton>
          </SettingsGrid>
        </SettingsCard>
      </div>
    </SettingsSection>
  )
})

EnhancedAccountOverview.displayName = 'EnhancedAccountOverview'

// Enhanced Corporate Profile Component
const EnhancedCorporateProfile = memo<EnhancedAccountComponentProps>(({ 
  accountType, 
  userId, 
  organizationId, 
  searchQuery = '', 
  onSettingsChange 
}) => {
  const [editing, setEditing] = useState(false)
  const [profileData, setProfileData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    title: 'Senior Board Member',
    department: 'Executive',
    phone: '+1 (555) 123-4567',
    location: 'New York, NY',
    timezone: 'America/New_York',
    bio: 'Experienced board member with 15+ years in corporate governance.',
    linkedin: 'https://linkedin.com/in/johndoe',
    expertise: ['Corporate Governance', 'Risk Management', 'Strategic Planning']
  })

  const handleSave = useOptimizedCallback(() => {
    setEditing(false)
    onSettingsChange?.(profileData)
  }, [profileData, onSettingsChange])

  return (
    <SettingsSection 
      title="Corporate Profile"
      description="Manage your professional information and board identity"
      headerActions={
        <SettingsButton 
          variant={editing ? "primary" : "outline"}
          size="sm"
          icon={editing ? undefined : Edit}
          onClick={editing ? handleSave : () => setEditing(true)}
        >
          {editing ? 'Save Changes' : 'Edit Profile'}
        </SettingsButton>
      }
    >
      <div className="space-y-6">
        <SettingsGrid columns={2}>
          <SettingsInput
            label="First Name"
            value={profileData.firstName}
            onValueChange={(value) => setProfileData(prev => ({ ...prev, firstName: value }))}
            disabled={!editing}
          />
          <SettingsInput
            label="Last Name"
            value={profileData.lastName}
            onValueChange={(value) => setProfileData(prev => ({ ...prev, lastName: value }))}
            disabled={!editing}
          />
        </SettingsGrid>

        <SettingsGrid columns={2}>
          <SettingsInput
            label="Job Title"
            value={profileData.title}
            onValueChange={(value) => setProfileData(prev => ({ ...prev, title: value }))}
            disabled={!editing}
          />
          <SettingsInput
            label="Department"
            value={profileData.department}
            onValueChange={(value) => setProfileData(prev => ({ ...prev, department: value }))}
            disabled={!editing}
          />
        </SettingsGrid>

        <SettingsGrid columns={2}>
          <SettingsInput
            label="Phone Number"
            type="tel"
            value={profileData.phone}
            onValueChange={(value) => setProfileData(prev => ({ ...prev, phone: value }))}
            disabled={!editing}
            startIcon={Phone}
          />
          <SettingsInput
            label="Location"
            value={profileData.location}
            onValueChange={(value) => setProfileData(prev => ({ ...prev, location: value }))}
            disabled={!editing}
            startIcon={MapPin}
          />
        </SettingsGrid>

        <SettingsSelect
          label="Timezone"
          value={profileData.timezone}
          onValueChange={(value) => setProfileData(prev => ({ ...prev, timezone: value }))}
          disabled={!editing}
          options={[
            { value: 'America/New_York', label: 'Eastern Time (EST/EDT)' },
            { value: 'America/Chicago', label: 'Central Time (CST/CDT)' },
            { value: 'America/Denver', label: 'Mountain Time (MST/MDT)' },
            { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)' },
            { value: 'Europe/London', label: 'GMT/BST' },
            { value: 'Europe/Berlin', label: 'CET/CEST' }
          ]}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Professional Bio
          </label>
          <textarea
            value={profileData.bio}
            onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
            disabled={!editing}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="Share your professional background and expertise..."
          />
        </div>

        <SettingsInput
          label="LinkedIn Profile"
          type="url"
          value={profileData.linkedin}
          onValueChange={(value) => setProfileData(prev => ({ ...prev, linkedin: value }))}
          disabled={!editing}
          startIcon={Globe}
          placeholder="https://linkedin.com/in/yourprofile"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Areas of Expertise
          </label>
          <div className="flex flex-wrap gap-2">
            {profileData.expertise.map((skill, index) => (
              <Badge key={index} variant="secondary">
                {skill}
                {editing && (
                  <button
                    onClick={() => setProfileData(prev => ({
                      ...prev,
                      expertise: prev.expertise.filter((_, i) => i !== index)
                    }))}
                    className="ml-1 text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                )}
              </Badge>
            ))}
            {editing && (
              <button className="px-2 py-1 text-xs text-blue-600 border border-blue-300 rounded hover:bg-blue-50">
                + Add Expertise
              </button>
            )}
          </div>
        </div>
      </div>
    </SettingsSection>
  )
})

EnhancedCorporateProfile.displayName = 'EnhancedCorporateProfile'

// Placeholder enhanced components for other sections
const EnhancedSecuritySettings = memo<EnhancedAccountComponentProps>((props) => {
  return (
    <SettingsSection title="Security & Authentication" description="Manage your account security settings">
      <SettingsSkeleton variant="form" count={4} />
    </SettingsSection>
  )
})

const EnhancedDelegationManager = memo<EnhancedAccountComponentProps>((props) => {
  return (
    <SettingsSection title="Delegation Management" description="Configure deputy access and coverage">
      <SettingsSkeleton variant="card" count={2} />
    </SettingsSection>
  )
})

const EnhancedCompliancePanel = memo<EnhancedAccountComponentProps>((props) => {
  return (
    <SettingsSection title="Compliance Settings" description="Regulatory and governance tracking">
      <SettingsSkeleton variant="form" count={3} />
    </SettingsSection>
  )
})

const EnhancedResourceQuotas = memo<EnhancedAccountComponentProps>((props) => {
  return (
    <SettingsSection title="Usage & Quotas" description="Monitor resource usage and limits">
      <SettingsSkeleton variant="card" count={3} />
    </SettingsSection>
  )
})

const EnhancedNotificationPreferences = memo<EnhancedAccountComponentProps>((props) => {
  return (
    <SettingsSection title="Communication Preferences" description="Configure notifications and communications">
      <SettingsSkeleton variant="toggle" count={5} />
    </SettingsSection>
  )
})

const EnhancedPrivacyControls = memo<EnhancedAccountComponentProps>((props) => {
  return (
    <SettingsSection title="Data & Privacy Controls" description="Manage data privacy and access controls">
      <SettingsSkeleton variant="form" count={4} />
    </SettingsSection>
  )
})

EnhancedSecuritySettings.displayName = 'EnhancedSecuritySettings'
EnhancedDelegationManager.displayName = 'EnhancedDelegationManager'
EnhancedCompliancePanel.displayName = 'EnhancedCompliancePanel'
EnhancedResourceQuotas.displayName = 'EnhancedResourceQuotas'
EnhancedNotificationPreferences.displayName = 'EnhancedNotificationPreferences'
EnhancedPrivacyControls.displayName = 'EnhancedPrivacyControls'