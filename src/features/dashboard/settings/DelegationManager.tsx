'use client'

import React, { useState } from 'react'
import {
  Users,
  UserPlus,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  FileText,
  Settings,
  Trash2,
  Edit,
  Plus,
  ArrowRight
} from 'lucide-react'

interface Delegate {
  id: string
  name: string
  email: string
  title: string
  avatar?: string
  type: 'primary' | 'vacation' | 'emergency'
  permissions: DelegationPermission[]
  activeFrom?: string
  activeTo?: string
  status: 'active' | 'inactive' | 'pending'
}

interface DelegationPermission {
  module: string
  level: 'view' | 'comment' | 'approve_limited' | 'approve_full'
  limit?: number
}

interface DelegationRule {
  id: string
  name: string
  trigger: 'vacation' | 'travel' | 'sick_leave' | 'manual'
  delegateId: string
  autoActivate: boolean
  description: string
}

export function DelegationManager() {
  const [delegates, setDelegates] = useState<Delegate[]>([
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@acmecorp.com',
      title: 'Deputy CFO',
      type: 'primary',
      status: 'active',
      permissions: [
        { module: 'documents', level: 'approve_full' },
        { module: 'meetings', level: 'approve_full' },
        { module: 'expenses', level: 'approve_limited', limit: 25000 }
      ]
    },
    {
      id: '2',
      name: 'Michael Chen',
      email: 'michael.chen@acmecorp.com',
      title: 'Senior Finance Director',
      type: 'vacation',
      status: 'inactive',
      activeFrom: '2024-01-15',
      activeTo: '2024-01-25',
      permissions: [
        { module: 'documents', level: 'comment' },
        { module: 'meetings', level: 'approve_limited' },
        { module: 'expenses', level: 'approve_limited', limit: 10000 }
      ]
    },
    {
      id: '3',
      name: 'Lisa Rodriguez',
      email: 'lisa.rodriguez@acmecorp.com',
      title: 'VP Operations',
      type: 'emergency',
      status: 'pending',
      permissions: [
        { module: 'documents', level: 'view' },
        { module: 'meetings', level: 'comment' },
        { module: 'compliance', level: 'approve_limited' }
      ]
    }
  ])

  const [delegationRules, setDelegationRules] = useState<DelegationRule[]>([
    {
      id: '1',
      name: 'Vacation Coverage',
      trigger: 'vacation',
      delegateId: '2',
      autoActivate: true,
      description: 'Automatically delegate to Michael Chen during scheduled vacation'
    },
    {
      id: '2',
      name: 'Emergency Escalation',
      trigger: 'manual',
      delegateId: '1',
      autoActivate: false,
      description: 'Manual delegation to Sarah Johnson for urgent matters'
    }
  ])

  const [showAddDelegate, setShowAddDelegate] = useState(false)
  const [showAddRule, setShowAddRule] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-600'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'primary':
        return 'bg-blue-100 text-blue-800'
      case 'vacation':
        return 'bg-purple-100 text-purple-800'
      case 'emergency':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getPermissionIcon = (module: string) => {
    switch (module) {
      case 'documents':
        return FileText
      case 'meetings':
        return Calendar
      case 'expenses':
        return DollarSign
      case 'compliance':
        return CheckCircle
      case 'settings':
        return Settings
      default:
        return FileText
    }
  }

  const getPermissionLevel = (level: string) => {
    switch (level) {
      case 'view':
        return 'View Only'
      case 'comment':
        return 'Comment & Review'
      case 'approve_limited':
        return 'Limited Approval'
      case 'approve_full':
        return 'Full Approval'
      default:
        return level
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Delegation Management</h3>
              <p className="text-gray-600">Configure deputies and coverage for your responsibilities</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddDelegate(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Delegate</span>
          </button>
        </div>
      </div>

      {/* Current Delegates */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Current Delegates</h3>
          <p className="text-sm text-gray-600 mt-1">People authorized to act on your behalf</p>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            {delegates.map(delegate => {
              return (
                <div key={delegate.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{delegate.name}</div>
                        <div className="text-sm text-gray-600">{delegate.title}</div>
                        <div className="text-xs text-gray-500">{delegate.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(delegate.type)}`}>
                        {delegate.type.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(delegate.status)}`}>
                        {delegate.status}
                      </span>
                      <button className="text-gray-400 hover:text-gray-600">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="text-gray-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Active Period */}
                  {(delegate.activeFrom || delegate.activeTo) && (
                    <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
                      <div className="flex items-center space-x-1 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Active: {delegate.activeFrom} to {delegate.activeTo}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Permissions */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Delegated Permissions:</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {delegate.permissions.map((permission, index) => {
                        const Icon = getPermissionIcon(permission.module)
                        return (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center space-x-2">
                              <Icon className="h-4 w-4 text-gray-600" />
                              <span className="text-sm text-gray-700 capitalize">{permission.module}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-medium text-gray-900">
                                {getPermissionLevel(permission.level)}
                              </div>
                              {permission.limit && (
                                <div className="text-xs text-gray-600">
                                  up to ${permission.limit.toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Delegation Rules */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Delegation Rules</h3>
              <p className="text-sm text-gray-600 mt-1">Automated delegation triggers and workflows</p>
            </div>
            <button
              onClick={() => setShowAddRule(true)}
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              <span>Add Rule</span>
            </button>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {delegationRules.map(rule => {
              const delegate = delegates.find(d => d.id === rule.delegateId)
              return (
                <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      rule.autoActivate ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {rule.autoActivate ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{rule.name}</div>
                      <div className="text-sm text-gray-600">{rule.description}</div>
                      <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                        <span>Trigger: {rule.trigger.replace('_', ' ')}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>Delegate to: {delegate?.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      rule.autoActivate ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {rule.autoActivate ? 'Auto' : 'Manual'}
                    </span>
                    <button className="text-gray-400 hover:text-gray-600">
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Coverage Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h4 className="font-medium text-gray-900">Current Coverage</h4>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Primary Delegate:</span>
              <span className="text-gray-900">Sarah Johnson</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Coverage Level:</span>
              <span className="text-green-600">Full Authority</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Last Activation:</span>
              <span className="text-gray-900">Never</span>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <h4 className="font-medium text-gray-900">Upcoming Delegations</h4>
          </div>
          <div className="space-y-2">
            <div className="p-2 bg-amber-50 border border-amber-200 rounded text-sm">
              <div className="font-medium text-amber-900">Vacation Coverage</div>
              <div className="text-amber-800">Michael Chen • Jan 15-25, 2024</div>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Override */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <h4 className="font-medium text-red-900">Emergency Override</h4>
              <p className="text-sm text-red-800">
                Immediately delegate all authority to your primary delegate
              </p>
            </div>
          </div>
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Activate Emergency Delegation
          </button>
        </div>
      </div>
    </div>
  )
}