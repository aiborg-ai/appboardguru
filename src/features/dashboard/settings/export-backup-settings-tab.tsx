'use client'

import React, { useState } from 'react'
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
  Globe
} from 'lucide-react'
import type { 
  ExportBackupSettingsPropsOptional, 
  hasOrganizationContext,
  ACCOUNT_TYPE_PERMISSIONS 
} from '@/types/export-backup-types'

type ExportBackupTab = 
  | 'data_export' 
  | 'scheduled_exports'
  | 'backup_policies' 
  | 'compliance_exports'
  | 'analytics'

export const ExportBackupSettingsTab = React.memo(function ExportBackupSettingsTab({ accountType, userId, organizationId }: ExportBackupSettingsPropsOptional) {
  const [activeTab, setActiveTab] = useState<ExportBackupTab>('data_export')

  const tabs = [
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
  ]

  // Get account permissions
  const permissions = ACCOUNT_TYPE_PERMISSIONS[accountType]
  
  const visibleTabs = tabs.filter(tab => {
    // Filter admin-only tabs based on account type
    if (tab.adminOnly && !['Superuser', 'Administrator'].includes(accountType)) {
      return false
    }
    
    // Some tabs require organization context
    if (['backup_policies', 'compliance_exports', 'analytics'].includes(tab.id) && !organizationId) {
      return false
    }
    
    return true
  })

  const renderTabContent = () => {
    switch (activeTab) {
      case 'data_export':
        return <DataExport accountType={accountType} userId={userId} organizationId={organizationId} />
      case 'scheduled_exports':
        return <ScheduledExports accountType={accountType} userId={userId} organizationId={organizationId} />
      case 'backup_policies':
        return <BackupPolicies accountType={accountType} userId={userId} organizationId={organizationId} />
      case 'compliance_exports':
        return <ComplianceExports accountType={accountType} userId={userId} organizationId={organizationId} />
      case 'analytics':
        return <ExportAnalytics accountType={accountType} userId={userId} organizationId={organizationId} />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
          <Download className="h-7 w-7 text-blue-600" />
          <span>Export & Backup Settings</span>
        </h1>
        <p className="text-gray-600 mt-1">
          Export board data, configure automated backups, and manage compliance requirements
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

// Component for data export
export function DataExport({ accountType, userId, organizationId }: ExportBackupSettingsPropsOptional) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['board_governance'])
  const [exportFormat, setExportFormat] = useState('json')
  const [includeFiles, setIncludeFiles] = useState(true)

  const exportCategories = [
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
    },
    {
      id: 'compliance',
      name: 'Compliance & Workflows',
      icon: Shield,
      color: 'text-red-600',
      description: 'Compliance workflows, audit documentation',
      dataTypes: ['Compliance workflows', 'Audit documentation', 'Regulatory submissions'],
      estimatedSize: '180 MB'
    },
    {
      id: 'security_logs',
      name: 'Security & Activity Logs',
      icon: Lock,
      color: 'text-gray-600',
      description: 'Login records, security events, access logs',
      dataTypes: ['Login records', 'Security events', 'Access logs', 'Permission changes'],
      estimatedSize: '320 MB',
      adminOnly: true
    }
  ]

  // Get account permissions and filter categories
  const permissions = ACCOUNT_TYPE_PERMISSIONS[accountType]
  
  const visibleCategories = exportCategories.filter(category => {
    // Filter admin-only categories
    if (category.adminOnly && !['Superuser', 'Administrator'].includes(accountType)) {
      return false
    }
    
    // Check if category is allowed for this account type
    const categoryMapping: Record<string, string> = {
      'board_governance': 'board_governance',
      'documents': 'documents',
      'communications': 'communications',
      'calendar': 'calendar',
      'compliance': 'compliance',
      'security_logs': 'security_logs'
    }
    
    const categoryKey = categoryMapping[category.id]
    if (categoryKey && !permissions.allowedCategories.includes(categoryKey as any)) {
      return false
    }
    
    return true
  })

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const getTotalEstimatedSize = () => {
    const selectedCategoryData = exportCategories.filter(cat => selectedCategories.includes(cat.id))
    // Simple calculation - in real app this would be more sophisticated
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
  }

  return (
    <div className="space-y-6">
      {/* Account Type Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-1">Export Permissions: {accountType}</h3>
        <p className="text-sm text-blue-700">
          {accountType === 'Superuser' && 'Full access to all data categories including system logs and security events.'}
          {accountType === 'Administrator' && 'Access to organizational data and compliance exports.'}
          {accountType === 'User' && 'Access to board governance data and documents you have permission to view.'}
          {accountType === 'Viewer' && 'Limited export access to publicly available board information only.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Categories */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Select Data Categories</h3>
          
          <div className="space-y-3">
            {visibleCategories.map(category => {
              const Icon = category.icon
              const isSelected = selectedCategories.includes(category.id)
              
              return (
                <div
                  key={category.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleCategoryToggle(category.id)}
                >
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleCategoryToggle(category.id)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Icon className={`h-5 w-5 ${category.color}`} />
                        <h4 className="font-medium text-gray-900">{category.name}</h4>
                        <span className="text-sm text-gray-500">({category.estimatedSize})</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-1">
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
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Export Configuration */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Export Configuration</h3>
          
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="json">JSON (Structured data)</option>
              <option value="csv">CSV (Spreadsheet format)</option>
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="pdf">PDF (Reports)</option>
              <option value="zip">ZIP Archive</option>
              <option value="encrypted_zip">Encrypted ZIP</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                defaultValue="2024-01-01"
              />
              <input
                type="date"
                className="border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                defaultValue="2024-12-31"
              />
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Include file attachments</label>
              <input
                type="checkbox"
                checked={includeFiles}
                onChange={(e) => setIncludeFiles(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Include metadata</label>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Anonymize personal data</label>
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          </div>

          {/* Encryption Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Encryption</label>
            <select className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
              <option value="none">No encryption</option>
              <option value="aes_256">AES-256 encryption</option>
              <option value="organization_key">Organization key</option>
              <option value="pgp">PGP encryption</option>
            </select>
          </div>

          {/* Export Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Export Summary</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Selected categories:</span>
                <span>{selectedCategories.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated size:</span>
                <span>{getTotalEstimatedSize()}</span>
              </div>
              <div className="flex justify-between">
                <span>Format:</span>
                <span className="uppercase">{exportFormat}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated time:</span>
                <span>~5-15 minutes</span>
              </div>
            </div>
          </div>

          {/* Export Actions */}
          <div className="flex space-x-3">
            <button
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={selectedCategories.length === 0}
            >
              <Download className="h-4 w-4 inline mr-2" />
              Start Export
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
              Save as Template
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Component for scheduled exports
function ScheduledExports({ accountType, userId, organizationId }: ExportBackupSettingsPropsOptional) {
  const permissions = ACCOUNT_TYPE_PERMISSIONS[accountType]
  
  // Show permission message if user cannot schedule exports
  if (!permissions.canScheduleExports) {
    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-900 mb-1">Scheduled Exports Unavailable</h3>
          <p className="text-sm text-yellow-700">
            Your account type ({accountType}) does not have permission to create scheduled exports.
          </p>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Scheduled Exports</h3>
          <p className="text-gray-600">
            Contact your administrator to upgrade your account for scheduled export capabilities.
          </p>
        </div>
      </div>
    )
  }
  const scheduledExports = [
    {
      id: 1,
      name: 'Weekly Board Governance Export',
      frequency: 'Weekly',
      nextRun: '2024-01-15 09:00',
      lastRun: '2024-01-08 09:00',
      status: 'active',
      format: 'JSON',
      categories: ['Board Governance', 'Documents']
    },
    {
      id: 2,
      name: 'Monthly Compliance Export',
      frequency: 'Monthly',
      nextRun: '2024-02-01 10:00',
      lastRun: '2024-01-01 10:00',
      status: 'active',
      format: 'PDF',
      categories: ['Compliance', 'Audit Trails']
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Scheduled Exports</h3>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          <Clock className="h-4 w-4 inline mr-2" />
          Create Schedule
        </button>
      </div>

      <div className="space-y-4">
        {scheduledExports.map(exportJob => (
          <div key={exportJob.id} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-gray-900">{exportJob.name}</h4>
                <p className="text-sm text-gray-600">
                  {exportJob.frequency} • {exportJob.format} format
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  exportJob.status === 'active' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {exportJob.status === 'active' ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 mr-1" />
                  )}
                  {exportJob.status}
                </span>
                <button className="text-gray-400 hover:text-gray-600">
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Next Run:</span>
                <p className="text-gray-600">{exportJob.nextRun}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Last Run:</span>
                <p className="text-gray-600">{exportJob.lastRun}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Categories:</span>
                <p className="text-gray-600">{exportJob.categories.join(', ')}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Actions:</span>
                <div className="flex space-x-2 mt-1">
                  <button className="text-blue-600 hover:text-blue-800">Edit</button>
                  <button className="text-red-600 hover:text-red-800">Delete</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {scheduledExports.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Scheduled Exports</h3>
          <p className="text-gray-600 mb-4">
            Create automated export schedules to regularly backup your board data.
          </p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Create Your First Schedule
          </button>
        </div>
      )}
    </div>
  )
}

// Component for backup policies (Admin only)
function BackupPolicies({ accountType, userId, organizationId }: ExportBackupSettingsPropsOptional) {
  // Check if organization context is available
  if (!hasOrganizationContext({ accountType, userId, organizationId })) {
    return (
      <div className="space-y-6">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-orange-900 mb-1">Organization Required</h3>
          <p className="text-sm text-orange-700">
            Backup policies require organization context. Please select an organization or contact support.
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-6">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-purple-900 mb-1">Automated Backup Policies</h3>
        <p className="text-sm text-purple-700">
          Configure organization-wide backup strategies and retention policies.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <Archive className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Backup Policy Management</h3>
        <p className="text-gray-600">
          Enterprise backup policies and automated retention management coming soon.
        </p>
      </div>
    </div>
  )
}

// Component for compliance exports (Admin only)
function ComplianceExports({ accountType, userId, organizationId }: ExportBackupSettingsPropsOptional) {
  // Check if organization context is available
  if (!hasOrganizationContext({ accountType, userId, organizationId })) {
    return (
      <div className="space-y-6">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-orange-900 mb-1">Organization Required</h3>
          <p className="text-sm text-orange-700">
            Compliance exports require organization context. Please select an organization or contact support.
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-6">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-orange-900 mb-1">Compliance & Legal Exports</h3>
        <p className="text-sm text-orange-700">
          Handle GDPR requests, legal holds, audit exports, and regulatory compliance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Globe className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">GDPR Data Requests</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Handle right to portability and data subject access requests.
          </p>
          <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Create GDPR Export
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-medium text-gray-900">Legal Hold Export</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Preserve data for litigation and regulatory investigations.
          </p>
          <button className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
            Create Legal Hold
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <FileText className="h-6 w-6 text-orange-600" />
            <h3 className="text-lg font-medium text-gray-900">Audit Export</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Generate comprehensive audit trails for compliance reviews.
          </p>
          <button className="w-full bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700">
            Generate Audit Export
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Database className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-medium text-gray-900">Regulatory Submission</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Prepare data for regulatory reporting and submissions.
          </p>
          <button className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">
            Prepare Submission
          </button>
        </div>
      </div>
    </div>
  )
}

// Component for export analytics (Admin only)
function ExportAnalytics({ accountType, userId, organizationId }: ExportBackupSettingsPropsOptional) {
  // Check if organization context is available
  if (!hasOrganizationContext({ accountType, userId, organizationId })) {
    return (
      <div className="space-y-6">
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-teal-900 mb-1">Organization Required</h3>
          <p className="text-sm text-teal-700">
            Export analytics require organization context. Please select an organization or contact support.
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-6">
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-teal-900 mb-1">Export Analytics & Insights</h3>
        <p className="text-sm text-teal-700">
          Track export usage, data volumes, and system performance metrics.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Export Analytics Dashboard</h3>
        <p className="text-gray-600">
          Comprehensive export analytics and usage insights coming soon.
        </p>
      </div>
    </div>
  )
}