'use client'

import React, { useState } from 'react'
import {
  BarChart3,
  HardDrive,
  Zap,
  Users,
  FileText,
  Calendar,
  Download,
  Upload,
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Activity,
  Database
} from 'lucide-react'

interface ResourceQuota {
  id: string
  name: string
  description: string
  current: number
  limit: number
  unit: string
  icon: React.ComponentType<any>
  color: string
  resetPeriod: 'daily' | 'weekly' | 'monthly' | 'never'
  resetDate?: string
}

interface UsageMetric {
  id: string
  name: string
  value: number
  change: number
  period: string
  trend: 'up' | 'down' | 'stable'
}

export function ResourceQuotas() {
  const accountType = 'user' // This would come from context/auth in real app

  // Different quotas based on account type
  const getQuotasForAccountType = (type: string): ResourceQuota[] => {
    const baseQuotas = {
      superuser: {
        storage: { limit: -1, current: 2500 }, // -1 means unlimited
        apiCalls: { limit: -1, current: 125000 },
        sessions: { limit: 100, current: 15 },
        directReports: { limit: -1, current: 25 },
        workflows: { limit: -1, current: 35 },
        exports: { limit: -1, current: 15 }
      },
      administrator: {
        storage: { limit: 1000, current: 450 },
        apiCalls: { limit: 100000, current: 35000 },
        sessions: { limit: 50, current: 8 },
        directReports: { limit: 100, current: 15 },
        workflows: { limit: 50, current: 12 },
        exports: { limit: 10, current: 3 }
      },
      user: {
        storage: { limit: 100, current: 65 },
        apiCalls: { limit: 10000, current: 3500 },
        sessions: { limit: 10, current: 3 },
        directReports: { limit: 10, current: 5 },
        workflows: { limit: 5, current: 2 },
        exports: { limit: 1, current: 0.5 }
      },
      viewer: {
        storage: { limit: 0, current: 0 },
        apiCalls: { limit: 1000, current: 150 },
        sessions: { limit: 3, current: 1 },
        directReports: { limit: 0, current: 0 },
        workflows: { limit: 0, current: 0 },
        exports: { limit: 0.1, current: 0.02 }
      }
    }

    const quotas = baseQuotas[type as keyof typeof baseQuotas] || baseQuotas.user

    return [
      {
        id: 'storage',
        name: 'Storage Quota',
        description: 'Document and file storage space',
        current: quotas.storage.current,
        limit: quotas.storage.limit,
        unit: 'GB',
        icon: HardDrive,
        color: 'blue',
        resetPeriod: 'never'
      },
      {
        id: 'apiCalls',
        name: 'API Calls',
        description: 'Monthly API request limit',
        current: quotas.apiCalls.current,
        limit: quotas.apiCalls.limit,
        unit: 'calls',
        icon: Zap,
        color: 'purple',
        resetPeriod: 'monthly',
        resetDate: '2024-02-01'
      },
      {
        id: 'sessions',
        name: 'Concurrent Sessions',
        description: 'Maximum simultaneous login sessions',
        current: quotas.sessions.current,
        limit: quotas.sessions.limit,
        unit: 'sessions',
        icon: Users,
        color: 'green',
        resetPeriod: 'never'
      },
      {
        id: 'directReports',
        name: 'Direct Reports',
        description: 'Users you can directly manage',
        current: quotas.directReports.current,
        limit: quotas.directReports.limit,
        unit: 'users',
        icon: Users,
        color: 'orange',
        resetPeriod: 'never'
      },
      {
        id: 'workflows',
        name: 'Custom Workflows',
        description: 'Number of custom automation workflows',
        current: quotas.workflows.current,
        limit: quotas.workflows.limit,
        unit: 'workflows',
        icon: Activity,
        color: 'indigo',
        resetPeriod: 'never'
      },
      {
        id: 'exports',
        name: 'Daily Export Limit',
        description: 'Data export volume per day',
        current: quotas.exports.current,
        limit: quotas.exports.limit,
        unit: 'GB',
        icon: Download,
        color: 'red',
        resetPeriod: 'daily',
        resetDate: 'Tomorrow 12:00 AM'
      }
    ]
  }

  const [quotas] = useState<ResourceQuota[]>(getQuotasForAccountType(accountType))

  const [usageMetrics] = useState<UsageMetric[]>([
    {
      id: '1',
      name: 'Documents Created',
      value: 145,
      change: 12,
      period: 'this month',
      trend: 'up'
    },
    {
      id: '2',
      name: 'Meetings Attended',
      value: 28,
      change: -3,
      period: 'this month',
      trend: 'down'
    },
    {
      id: '3',
      name: 'Active Collaborations',
      value: 15,
      change: 5,
      period: 'this week',
      trend: 'up'
    },
    {
      id: '4',
      name: 'System Login Hours',
      value: 142,
      change: 0,
      period: 'this month',
      trend: 'stable'
    }
  ])

  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0 // Unlimited
    if (limit === 0) return 0
    return Math.min((current / limit) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'red'
    if (percentage >= 70) return 'yellow'
    return 'green'
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const getColorClasses = (color: string) => {
    const colors = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-600', bar: 'bg-blue-600' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600', bar: 'bg-purple-600' },
      green: { bg: 'bg-green-100', text: 'text-green-600', bar: 'bg-green-600' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-600', bar: 'bg-orange-600' },
      indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', bar: 'bg-indigo-600' },
      red: { bg: 'bg-red-100', text: 'text-red-600', bar: 'bg-red-600' },
      yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', bar: 'bg-yellow-600' }
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  return (
    <div className="space-y-6">
      {/* Account Type Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Resource Usage & Quotas</h3>
              <p className="text-gray-600">
                Current account type: <span className="font-medium capitalize text-blue-600">{accountType}</span>
              </p>
            </div>
          </div>
          <button className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100">
            Upgrade Plan
          </button>
        </div>
      </div>

      {/* Resource Quotas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quotas.map(quota => {
          const Icon = quota.icon
          const percentage = getUsagePercentage(quota.current, quota.limit)
          const usageColor = getUsageColor(percentage)
          const colorClasses = getColorClasses(quota.color)
          
          return (
            <div key={quota.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-lg ${colorClasses.bg}`}>
                    <Icon className={`h-5 w-5 ${colorClasses.text}`} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{quota.name}</h4>
                    <p className="text-xs text-gray-600">{quota.description}</p>
                  </div>
                </div>
                {percentage >= 90 && (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Usage:</span>
                  <span className="font-medium text-gray-900">
                    {formatNumber(quota.current)} {quota.unit}
                    {quota.limit !== -1 && ` / ${formatNumber(quota.limit)} ${quota.unit}`}
                  </span>
                </div>
                
                {quota.limit !== -1 && quota.limit > 0 && (
                  <>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          usageColor === 'red' ? 'bg-red-600' :
                          usageColor === 'yellow' ? 'bg-yellow-600' : 'bg-green-600'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500">
                      {percentage.toFixed(1)}% used
                    </div>
                  </>
                )}
                
                {quota.limit === -1 && (
                  <div className="text-xs text-green-600 font-medium">
                    Unlimited
                  </div>
                )}
                
                {quota.resetDate && (
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>Resets: {quota.resetDate}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Usage Trends */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Usage Metrics</h3>
          <p className="text-sm text-gray-600 mt-1">Your activity and engagement statistics</p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {usageMetrics.map(metric => (
              <div key={metric.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">{metric.name}</h4>
                  <div className={`p-1 rounded ${
                    metric.trend === 'up' ? 'bg-green-100' :
                    metric.trend === 'down' ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    <TrendingUp className={`h-3 w-3 ${
                      metric.trend === 'up' ? 'text-green-600' :
                      metric.trend === 'down' ? 'text-red-600 transform rotate-180' : 'text-gray-600'
                    }`} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {metric.value}
                </div>
                <div className="text-xs text-gray-500">
                  <span className={
                    metric.trend === 'up' ? 'text-green-600' :
                    metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }>
                    {metric.change > 0 ? '+' : ''}{metric.change}
                  </span>
                  {' '}{metric.period}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Account Comparison */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Account Type Comparison</h3>
          <p className="text-sm text-gray-600 mt-1">Compare limits across different account types</p>
        </div>
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-900">Resource</th>
                  <th className="text-center py-2 font-medium text-gray-600">Viewer</th>
                  <th className="text-center py-2 font-medium text-green-600">User (Current)</th>
                  <th className="text-center py-2 font-medium text-gray-600">Administrator</th>
                  <th className="text-center py-2 font-medium text-gray-600">Superuser</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-2 font-medium text-gray-900">Storage</td>
                  <td className="text-center py-2 text-gray-600">Read-only</td>
                  <td className="text-center py-2 text-green-600 font-medium">100 GB</td>
                  <td className="text-center py-2 text-gray-600">1 TB</td>
                  <td className="text-center py-2 text-gray-600">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-gray-900">API Calls</td>
                  <td className="text-center py-2 text-gray-600">1K/month</td>
                  <td className="text-center py-2 text-green-600 font-medium">10K/month</td>
                  <td className="text-center py-2 text-gray-600">100K/month</td>
                  <td className="text-center py-2 text-gray-600">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-gray-900">Sessions</td>
                  <td className="text-center py-2 text-gray-600">3</td>
                  <td className="text-center py-2 text-green-600 font-medium">10</td>
                  <td className="text-center py-2 text-gray-600">50</td>
                  <td className="text-center py-2 text-gray-600">100</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-gray-900">Workflows</td>
                  <td className="text-center py-2 text-gray-600">0</td>
                  <td className="text-center py-2 text-green-600 font-medium">5</td>
                  <td className="text-center py-2 text-gray-600">50</td>
                  <td className="text-center py-2 text-gray-600">Unlimited</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Resource Optimization */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900">Resource Optimization Tips</h4>
            <div className="mt-2 space-y-1 text-sm text-amber-800">
              <p>• Clean up unused documents to free storage space</p>
              <p>• Close inactive browser sessions to stay within limits</p>
              <p>• Consider upgrading to Administrator for increased quotas</p>
              <p>• Use bulk operations to optimize API call usage</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}