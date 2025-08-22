'use client'

import React from 'react'
import { 
  Crown, 
  Shield, 
  User, 
  Eye, 
  Check, 
  X, 
  AlertCircle,
  Calendar,
  Users,
  FileText,
  BarChart3,
  Settings,
  Lock
} from 'lucide-react'

interface PermissionLevel {
  view: boolean
  create: boolean
  edit: boolean
  delete: boolean
  approve: boolean
  audit: boolean
}

interface AccountTypeInfo {
  type: 'superuser' | 'administrator' | 'user' | 'viewer'
  label: string
  description: string
  icon: React.ComponentType<any>
  color: string
  badgeColor: string
  permissions: {
    users: PermissionLevel
    documents: PermissionLevel
    vaults: PermissionLevel
    meetings: PermissionLevel
    compliance: PermissionLevel
    analytics: PermissionLevel
    settings: PermissionLevel
  }
}

const accountTypes: Record<string, AccountTypeInfo> = {
  superuser: {
    type: 'superuser',
    label: 'Superuser',
    description: 'System Administrator with complete access and control',
    icon: Crown,
    color: 'text-purple-600',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    permissions: {
      users: { view: true, create: true, edit: true, delete: true, approve: true, audit: true },
      documents: { view: true, create: true, edit: true, delete: true, approve: true, audit: true },
      vaults: { view: true, create: true, edit: true, delete: true, approve: true, audit: true },
      meetings: { view: true, create: true, edit: true, delete: true, approve: true, audit: true },
      compliance: { view: true, create: true, edit: true, delete: true, approve: true, audit: true },
      analytics: { view: true, create: true, edit: true, delete: true, approve: true, audit: true },
      settings: { view: true, create: true, edit: true, delete: true, approve: true, audit: true }
    }
  },
  administrator: {
    type: 'administrator',
    label: 'Administrator',
    description: 'Organization administrator with management privileges',
    icon: Shield,
    color: 'text-blue-600',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    permissions: {
      users: { view: true, create: true, edit: true, delete: false, approve: true, audit: true },
      documents: { view: true, create: true, edit: true, delete: true, approve: true, audit: true },
      vaults: { view: true, create: true, edit: true, delete: true, approve: true, audit: true },
      meetings: { view: true, create: true, edit: true, delete: true, approve: true, audit: true },
      compliance: { view: true, create: true, edit: true, delete: false, approve: true, audit: true },
      analytics: { view: true, create: true, edit: true, delete: false, approve: false, audit: true },
      settings: { view: true, create: false, edit: true, delete: false, approve: false, audit: false }
    }
  },
  user: {
    type: 'user',
    label: 'User',
    description: 'Standard corporate user with collaboration access',
    icon: User,
    color: 'text-green-600',
    badgeColor: 'bg-green-100 text-green-800 border-green-200',
    permissions: {
      users: { view: true, create: false, edit: false, delete: false, approve: false, audit: false },
      documents: { view: true, create: true, edit: true, delete: true, approve: false, audit: false },
      vaults: { view: true, create: true, edit: true, delete: true, approve: false, audit: false },
      meetings: { view: true, create: true, edit: true, delete: true, approve: false, audit: false },
      compliance: { view: true, create: false, edit: false, delete: false, approve: false, audit: false },
      analytics: { view: true, create: false, edit: false, delete: false, approve: false, audit: false },
      settings: { view: true, create: false, edit: true, delete: false, approve: false, audit: false }
    }
  },
  viewer: {
    type: 'viewer',
    label: 'Viewer',
    description: 'External stakeholder with read-only access',
    icon: Eye,
    color: 'text-gray-600',
    badgeColor: 'bg-gray-100 text-gray-800 border-gray-200',
    permissions: {
      users: { view: false, create: false, edit: false, delete: false, approve: false, audit: false },
      documents: { view: true, create: false, edit: false, delete: false, approve: false, audit: false },
      vaults: { view: true, create: false, edit: false, delete: false, approve: false, audit: false },
      meetings: { view: true, create: false, edit: false, delete: false, approve: false, audit: false },
      compliance: { view: true, create: false, edit: false, delete: false, approve: false, audit: false },
      analytics: { view: false, create: false, edit: false, delete: false, approve: false, audit: false },
      settings: { view: false, create: false, edit: false, delete: false, approve: false, audit: false }
    }
  }
}

const modules = [
  { id: 'users', label: 'Users & Teams', icon: Users },
  { id: 'documents', label: 'Documents & Assets', icon: FileText },
  { id: 'vaults', label: 'Vaults', icon: Lock },
  { id: 'meetings', label: 'Meetings', icon: Calendar },
  { id: 'compliance', label: 'Compliance', icon: Shield },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings }
]

const permissions = [
  { id: 'view', label: 'View' },
  { id: 'create', label: 'Create' },
  { id: 'edit', label: 'Edit' },
  { id: 'delete', label: 'Delete' },
  { id: 'approve', label: 'Approve' },
  { id: 'audit', label: 'Audit' }
]

export function AccountTypeDisplay() {
  // Mock current user - in real app this would come from context/props
  const currentAccountType = accountTypes.user
  const Icon = currentAccountType.icon

  const PermissionIcon = ({ allowed }: { allowed: boolean }) => (
    allowed ? (
      <Check className="h-4 w-4 text-green-600" />
    ) : (
      <X className="h-4 w-4 text-gray-400" />
    )
  )

  return (
    <div className="space-y-6">
      {/* Account Type Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-lg bg-white shadow-sm ${currentAccountType.color}`}>
              <Icon className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h3 className="text-xl font-semibold text-gray-900">
                  {currentAccountType.label}
                </h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${currentAccountType.badgeColor}`}>
                  Account Type
                </span>
              </div>
              <p className="text-gray-600 mt-1">
                {currentAccountType.description}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <AlertCircle className="h-4 w-4" />
              <span>Active Status</span>
            </div>
            <div className="mt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></div>
                Verified Account
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h4 className="font-medium text-gray-900">Organization</h4>
          </div>
          <p className="text-sm text-gray-600">Acme Corp</p>
          <p className="text-xs text-gray-500">Board of Directors</p>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="h-5 w-5 text-green-600" />
            <h4 className="font-medium text-gray-900">Last Access</h4>
          </div>
          <p className="text-sm text-gray-600">2 minutes ago</p>
          <p className="text-xs text-gray-500">From New York, NY</p>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-5 w-5 text-purple-600" />
            <h4 className="font-medium text-gray-900">Security Score</h4>
          </div>
          <p className="text-sm text-gray-600">98%</p>
          <p className="text-xs text-gray-500">Excellent Security</p>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Permission Matrix</h3>
          <p className="text-sm text-gray-600 mt-1">
            Your access rights across different modules and operations
          </p>
        </div>
        
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 pr-4 text-sm font-medium text-gray-900">
                    Module
                  </th>
                  {permissions.map(permission => (
                    <th key={permission.id} className="text-center py-3 px-3 text-sm font-medium text-gray-900">
                      {permission.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {modules.map(module => {
                  const ModuleIcon = module.icon
                  const modulePermissions = currentAccountType.permissions[module.id as keyof typeof currentAccountType.permissions]
                  
                  return (
                    <tr key={module.id} className="hover:bg-gray-50">
                      <td className="py-3 pr-4">
                        <div className="flex items-center space-x-2">
                          <ModuleIcon className="h-4 w-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">
                            {module.label}
                          </span>
                        </div>
                      </td>
                      {permissions.map(permission => (
                        <td key={permission.id} className="text-center py-3 px-3">
                          <PermissionIcon 
                            allowed={modulePermissions[permission.id as keyof PermissionLevel] as boolean} 
                          />
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Special Privileges */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900">Special Privileges</h4>
            <div className="mt-2 space-y-1">
              <div className="text-sm text-amber-800">
                • Cross-department document access
              </div>
              <div className="text-sm text-amber-800">
                • Meeting proxy attendance rights
              </div>
              <div className="text-sm text-amber-800">
                • Limited delegation authority (up to $50,000)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}