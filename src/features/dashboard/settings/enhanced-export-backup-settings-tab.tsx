'use client'

import React, { useState, useCallback, useMemo, memo } from 'react'
import { 
  Download, 
  Upload,
  Archive,
  Clock,
  Shield,
  FileText,
  Database,
  CloudDownload,
  HardDrive,
  Lock,
  Calendar,
  MessageSquare,
  Users,
  AlertTriangle,
  CheckCircle,
  Settings,
  BarChart3,
  Globe,
  Play,
  Pause,
  Trash2
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

type ExportBackupTab = 
  | 'data_export' 
  | 'scheduled_exports'
  | 'backup_policies' 
  | 'compliance_exports'
  | 'analytics'

type EnhancedExportBackupSettingsProps = {
  accountType: 'Superuser' | 'Administrator' | 'User' | 'Viewer'
  userId: UserId
  organizationId?: OrganizationId | null
}

export const EnhancedExportBackupSettingsTab = memo<EnhancedExportBackupSettingsProps>(({ accountType, userId, organizationId }) => {
  const [activeTab, setActiveTab] = useState<ExportBackupTab>('data_export')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(false)

  // Performance monitoring
  const renderTime = usePerformanceMonitor('EnhancedExportBackupSettingsTab')

  const tabs = useMemo(() => [
    { 
      id: 'data_export' as const, 
      label: 'Data Export', 
      icon: Download, 
      color: 'text-blue-600',
      description: 'Export board data in various formats'
    },
    { 
      id: 'scheduled_exports' as const, 
      label: 'Scheduled Exports', 
      icon: Clock, 
      color: 'text-green-600',
      description: 'Automate regular data exports'
    },
    { 
      id: 'backup_policies' as const, 
      label: 'Backup Policies', 
      icon: Archive, 
      color: 'text-purple-600',
      description: 'Configure automated backup strategies',
      adminOnly: true
    },
    { 
      id: 'compliance_exports' as const, 
      label: 'Compliance & Legal', 
      icon: Shield, 
      color: 'text-orange-600',
      description: 'GDPR, audit trails, and legal hold exports',
      adminOnly: true
    },
    { 
      id: 'analytics' as const, 
      label: 'Export Analytics', 
      icon: BarChart3, 
      color: 'text-teal-600',
      description: 'Export usage statistics and insights',
      adminOnly: true
    }
  ], [])

  const visibleTabs = useOptimizedMemo(
    () => tabs.filter(tab => 
      !tab.adminOnly || ['Superuser', 'Administrator'].includes(accountType)
    ),
    [tabs, accountType]
  )

  const handleTabChange = useOptimizedCallback((tabId: ExportBackupTab) => {
    setActiveTab(tabId)
  }, [])

  const handleSearch = useOptimizedCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const handleSettingsChange = useOptimizedCallback((newSettings: any) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  const handleExport = useOptimizedCallback((format: 'json' | 'csv' | 'xml') => {
    console.log('Exporting backup settings in format:', format)
  }, [])

  const handleImport = useOptimizedCallback((data: any, format: string) => {
    console.log('Importing backup settings:', data, format)
  }, [])

  const handleReset = useOptimizedCallback(() => {
    console.log('Resetting backup settings')
  }, [])

  const renderTabContent = useCallback(() => {
    const commonProps = { accountType, userId, organizationId, searchQuery, onSettingsChange: handleSettingsChange }
    
    switch (activeTab) {
      case 'data_export':
        return <EnhancedDataExport {...commonProps} />
      case 'scheduled_exports':
        return <EnhancedScheduledExports {...commonProps} />
      case 'backup_policies':
        return <EnhancedBackupPolicies {...commonProps} />
      case 'compliance_exports':
        return <EnhancedComplianceExports {...commonProps} />
      case 'analytics':
        return <EnhancedExportAnalytics {...commonProps} />
      default:
        return <EnhancedDataExport {...commonProps} />
    }
  }, [activeTab, accountType, userId, organizationId, searchQuery, handleSettingsChange])

  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Export & Backup Settings"
        subtitle="Export board data, configure automated backups, and manage compliance requirements"
        icon={Download}
        actions={
          <div className="flex items-center space-x-3">
            <SettingsSearch
              placeholder="Search export settings..."
              onSearch={handleSearch}
              suggestions={['export', 'backup', 'schedule', 'compliance', 'GDPR', 'audit']}
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
            description="Import/export configurations, view history, and reset settings"
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
                  { id: 'export', label: 'Export Settings', description: 'Reset export configurations', selected: true },
                  { id: 'schedule', label: 'Scheduled Jobs', description: 'Reset all scheduled exports', selected: false },
                  { id: 'backup', label: 'Backup Policies', description: 'Reset backup configurations', selected: false }
                ]}
              />
            </SettingsGrid>
          </SettingsSection>
        </div>
      )}
    </div>
  )
})

EnhancedExportBackupSettingsTab.displayName = 'EnhancedExportBackupSettingsTab'

// Enhanced component interfaces
interface EnhancedExportComponentProps {
  accountType: 'Superuser' | 'Administrator' | 'User' | 'Viewer'
  userId: UserId
  organizationId?: OrganizationId | null
  searchQuery?: string
  onSettingsChange?: (settings: any) => void
}

// Enhanced Data Export Component
const EnhancedDataExport = memo<EnhancedExportComponentProps>(({ 
  accountType, 
  userId, 
  organizationId, 
  searchQuery = '', 
  onSettingsChange 
}) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['board_governance'])
  const [exportFormat, setExportFormat] = useState('json')
  const [includeFiles, setIncludeFiles] = useState(true)
  const [loading, setLoading] = useState(false)

  const handleCategoryToggle = useOptimizedCallback((categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }, [])

  const handleStartExport = useOptimizedCallback(async () => {
    setLoading(true)
    // Simulate export process
    setTimeout(() => {
      setLoading(false)
      onSettingsChange?.({ lastExport: new Date().toISOString() })
    }, 3000)
  }, [onSettingsChange])

  const exportCategories = useMemo(() => [
    {
      id: 'board_governance',
      name: 'Board Governance',
      icon: Users,
      color: 'text-blue-600',
      description: 'Board meetings, resolutions, voting records, action items',
      dataTypes: ['Board meetings', 'Meeting minutes', 'Resolutions', 'Voting records', 'Action items'],
      estimatedSize: '125 MB'
    },
    {
      id: 'documents',
      name: 'Document Management',
      icon: FileText,
      color: 'text-green-600',
      description: 'Files, vaults, permissions, version history',
      dataTypes: ['Vault contents', 'Document metadata', 'Version history', 'Permissions', 'Digital signatures'],
      estimatedSize: '2.4 GB'
    },
    {
      id: 'communications',
      name: 'BoardChat Communications',
      icon: MessageSquare,
      color: 'text-purple-600',
      description: 'Messages, voice notes, group communications',
      dataTypes: ['Chat messages', 'Voice notes', 'Group communications', 'Message attachments'],
      estimatedSize: '890 MB'
    },
    {
      id: 'calendar',
      name: 'Calendar & Events',
      icon: Calendar,
      color: 'text-orange-600',
      description: 'Meeting schedules, events, bookings',
      dataTypes: ['Meeting schedules', 'Calendar events', 'Attendee records', 'Room bookings'],
      estimatedSize: '45 MB'
    }
  ], [])

  const filteredCategories = useOptimizedMemo(() => {
    if (!searchQuery.trim()) return exportCategories
    return exportCategories.filter(category => 
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [exportCategories, searchQuery])

  const getTotalEstimatedSize = useOptimizedMemo(() => {
    const selectedCategoryData = exportCategories.filter(cat => selectedCategories.includes(cat.id))
    let totalMB = 0
    selectedCategoryData.forEach(cat => {
      const sizeStr = cat.estimatedSize
      if (sizeStr.includes('GB')) {
        totalMB += parseFloat(sizeStr) * 1024
      } else {
        totalMB += parseFloat(sizeStr)
      }
    })
    return totalMB > 1024 ? `${(totalMB / 1024).toFixed(1)} GB` : `${totalMB.toFixed(0)} MB`
  }, [exportCategories, selectedCategories])

  return (
    <SettingsSection
      title="Data Export"
      description="Export your board data in various formats"
    >
      <div className="space-y-6">
        {/* Account Type Info */}
        <SettingsCard variant="elevated" size="sm">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-1">Export Permissions: {accountType}</h3>
            <p className="text-sm text-blue-700">
              {accountType === 'Superuser' && 'Full access to all data categories including system logs and security events.'}
              {accountType === 'Administrator' && 'Access to organizational data and compliance exports.'}
              {accountType === 'User' && 'Access to board governance data and documents you have permission to view.'}
              {accountType === 'Viewer' && 'Limited export access to publicly available board information only.'}
            </p>
          </div>
        </SettingsCard>

        <SettingsGrid columns={2}>
          {/* Data Categories */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Select Data Categories</h3>
            
            <div className="space-y-3">
              {filteredCategories.map(category => {
                const Icon = category.icon
                const isSelected = selectedCategories.includes(category.id)
                
                return (
                  <SettingsCard
                    key={category.id}
                    variant={isSelected ? 'elevated' : 'default'}
                    className={`cursor-pointer transition-all duration-200 ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'hover:shadow-sm'
                    }`}
                    onClick={() => handleCategoryToggle(category.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <SettingsToggle
                        id={category.id}
                        label=""
                        checked={isSelected}
                        onValueChange={() => handleCategoryToggle(category.id)}
                        size="sm"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Icon className={`h-5 w-5 ${category.color}`} />
                          <h4 className="font-medium text-gray-900">{category.name}</h4>
                          <span className="text-sm text-gray-500">({category.estimatedSize})</span>
                        </div>
                        <p className="text-sm text-gray-600">{category.description}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {category.dataTypes.slice(0, 3).map((type, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {type}
                            </span>
                          ))}
                          {category.dataTypes.length > 3 && (
                            <span className="text-xs text-gray-500">+{category.dataTypes.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </SettingsCard>
                )
              })}
            </div>
          </div>

          {/* Export Configuration */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Export Configuration</h3>
            
            <SettingsSelect
              label="Export Format"
              value={exportFormat}
              onValueChange={setExportFormat}
              options={[
                { value: 'json', label: 'JSON', description: 'Structured data format' },
                { value: 'csv', label: 'CSV', description: 'Spreadsheet format' },
                { value: 'xlsx', label: 'Excel (.xlsx)', description: 'Microsoft Excel format' },
                { value: 'pdf', label: 'PDF', description: 'Report format' },
                { value: 'zip', label: 'ZIP Archive', description: 'Compressed archive' },
                { value: 'encrypted_zip', label: 'Encrypted ZIP', description: 'Password-protected archive' }
              ]}
            />

            <div className="grid grid-cols-2 gap-4">
              <SettingsInput
                label="From Date"
                type="date"
                defaultValue="2024-01-01"
              />
              <SettingsInput
                label="To Date"
                type="date"
                defaultValue="2024-12-31"
              />
            </div>

            <div className="space-y-3">
              <SettingsToggle
                label="Include file attachments"
                checked={includeFiles}
                onValueChange={setIncludeFiles}
                description="Include document files in the export"
              />
              
              <SettingsToggle
                label="Include metadata"
                defaultChecked={true}
                description="Include creation dates, permissions, and other metadata"
              />
              
              <SettingsToggle
                label="Anonymize personal data"
                description="Remove or obscure personally identifiable information"
              />
            </div>

            <SettingsSelect
              label="Encryption"
              options={[
                { value: 'none', label: 'No encryption', description: 'Plain text export' },
                { value: 'aes_256', label: 'AES-256 encryption', description: 'Strong encryption' },
                { value: 'organization_key', label: 'Organization key', description: 'Use org encryption key' },
                { value: 'pgp', label: 'PGP encryption', description: 'Public key encryption' }
              ]}
              defaultValue="none"
            />

            {/* Export Summary */}
            <SettingsCard variant="elevated">
              <h4 className="font-medium text-gray-900 mb-3">Export Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Selected categories:</span>
                  <span className="font-medium">{selectedCategories.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated size:</span>
                  <span className="font-medium">{getTotalEstimatedSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Format:</span>
                  <span className="font-medium uppercase">{exportFormat}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated time:</span>
                  <span className="font-medium">~5-15 minutes</span>
                </div>
              </div>
            </SettingsCard>

            {/* Export Actions */}
            <div className="flex space-x-3">
              <SettingsButton
                onClick={handleStartExport}
                loading={loading}
                disabled={selectedCategories.length === 0}
                icon={Download}
                fullWidth
              >
                {loading ? 'Exporting...' : 'Start Export'}
              </SettingsButton>
              <SettingsButton
                variant="outline"
                disabled={loading}
              >
                Save as Template
              </SettingsButton>
            </div>
          </div>
        </SettingsGrid>
      </div>
    </SettingsSection>
  )
})

EnhancedDataExport.displayName = 'EnhancedDataExport'

// Enhanced Scheduled Exports Component
const EnhancedScheduledExports = memo<EnhancedExportComponentProps>(({ 
  accountType, 
  userId, 
  organizationId, 
  searchQuery = '', 
  onSettingsChange 
}) => {
  const [scheduledExports, setScheduledExports] = useState([
    {
      id: 1,
      name: 'Weekly Board Governance Export',
      frequency: 'Weekly',
      nextRun: '2024-01-15 09:00',
      lastRun: '2024-01-08 09:00',
      status: 'active' as const,
      format: 'JSON',
      categories: ['Board Governance', 'Documents']
    },
    {
      id: 2,
      name: 'Monthly Compliance Export',
      frequency: 'Monthly',
      nextRun: '2024-02-01 10:00',
      lastRun: '2024-01-01 10:00',
      status: 'paused' as const,
      format: 'PDF',
      categories: ['Compliance', 'Audit Trails']
    }
  ])

  const handleToggleStatus = useOptimizedCallback((id: number) => {
    setScheduledExports(prev => 
      prev.map(exp => 
        exp.id === id 
          ? { ...exp, status: exp.status === 'active' ? 'paused' : 'active' }
          : exp
      )
    )
  }, [])

  const handleDeleteExport = useOptimizedCallback((id: number) => {
    setScheduledExports(prev => prev.filter(exp => exp.id !== id))
  }, [])

  return (
    <SettingsSection
      title="Scheduled Exports"
      description="Automate regular data exports with scheduled jobs"
      headerActions={
        <SettingsButton icon={Clock} size="sm">
          Create Schedule
        </SettingsButton>
      }
    >
      <div className="space-y-4">
        {scheduledExports.length > 0 ? (
          scheduledExports.map(exportJob => (
            <SettingsCard key={exportJob.id} variant="elevated">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{exportJob.name}</h4>
                  <p className="text-sm text-gray-600">
                    {exportJob.frequency} • {exportJob.format} format
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    exportJob.status === 'active' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {exportJob.status === 'active' ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <Pause className="h-3 w-3 mr-1" />
                    )}
                    {exportJob.status}
                  </span>
                  <SettingsButton
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleStatus(exportJob.id)}
                    icon={exportJob.status === 'active' ? Pause : Play}
                  >
                    {exportJob.status === 'active' ? 'Pause' : 'Resume'}
                  </SettingsButton>
                  <SettingsButton
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteExport(exportJob.id)}
                    icon={Trash2}
                  >
                    Delete
                  </SettingsButton>
                </div>
              </div>

              <SettingsGrid columns={4}>
                <div>
                  <span className="text-xs font-medium text-gray-700 block">Next Run:</span>
                  <p className="text-sm text-gray-600">{exportJob.nextRun}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-700 block">Last Run:</span>
                  <p className="text-sm text-gray-600">{exportJob.lastRun}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-700 block">Categories:</span>
                  <p className="text-sm text-gray-600">{exportJob.categories.join(', ')}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-700 block">Actions:</span>
                  <div className="flex space-x-2 mt-1">
                    <button className="text-xs text-blue-600 hover:text-blue-800">Edit</button>
                    <button className="text-xs text-green-600 hover:text-green-800">Run Now</button>
                  </div>
                </div>
              </SettingsGrid>
            </SettingsCard>
          ))
        ) : (
          <SettingsCard variant="elevated" className="text-center py-8">
            <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Scheduled Exports</h3>
            <p className="text-gray-600 mb-4">
              Create automated export schedules to regularly backup your board data.
            </p>
            <SettingsButton icon={Clock}>
              Create Your First Schedule
            </SettingsButton>
          </SettingsCard>
        )}
      </div>
    </SettingsSection>
  )
})

EnhancedScheduledExports.displayName = 'EnhancedScheduledExports'

// Placeholder enhanced components for other tabs
const EnhancedBackupPolicies = memo<EnhancedExportComponentProps>((props) => {
  return (
    <SettingsSection title="Backup Policies" description="Configure automated backup strategies">
      <SettingsSkeleton variant="form" count={3} />
    </SettingsSection>
  )
})

const EnhancedComplianceExports = memo<EnhancedExportComponentProps>((props) => {
  return (
    <SettingsSection title="Compliance & Legal" description="GDPR, audit trails, and legal hold exports">
      <SettingsSkeleton variant="card" count={4} />
    </SettingsSection>
  )
})

const EnhancedExportAnalytics = memo<EnhancedExportComponentProps>((props) => {
  return (
    <SettingsSection title="Export Analytics" description="View export usage statistics and insights">
      <SettingsSkeleton variant="card" count={3} />
    </SettingsSection>
  )
})

EnhancedBackupPolicies.displayName = 'EnhancedBackupPolicies'
EnhancedComplianceExports.displayName = 'EnhancedComplianceExports'
EnhancedExportAnalytics.displayName = 'EnhancedExportAnalytics'