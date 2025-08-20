'use client'

import React from 'react'
import { 
  TrendingUp, 
  Shield, 
  Eye, 
  Edit, 
  Users, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react'

interface ActivityStats {
  total: number
  byType: Record<string, number>
  byOutcome: Record<string, number>
  bySeverity: Record<string, number>
  recentSignIns: number
  failedAttempts: number
}

interface ActivityStatsWidgetProps {
  stats: ActivityStats
}

export function ActivityStatsWidget({ stats }: ActivityStatsWidgetProps) {
  // Calculate success rate
  const successRate = stats.total > 0 
    ? Math.round((stats.byOutcome.success || 0) / stats.total * 100)
    : 0

  // Get type display info
  const getTypeDisplayInfo = (type: string) => {
    switch (type) {
      case 'authentication':
        return { icon: Shield, label: 'Authentication', color: 'text-green-600' }
      case 'data_access':
        return { icon: Eye, label: 'Data Access', color: 'text-blue-600' }
      case 'data_modification':
        return { icon: Edit, label: 'Data Changes', color: 'text-orange-600' }
      case 'authorization':
        return { icon: Users, label: 'Permissions', color: 'text-purple-600' }
      case 'user_action':
        return { icon: Activity, label: 'User Actions', color: 'text-gray-600' }
      default:
        return { icon: Activity, label: type, color: 'text-gray-600' }
    }
  }

  // Calculate percentage for progress bars
  const getPercentage = (value: number, total: number) => {
    return total > 0 ? (value / total) * 100 : 0
  }

  // Check if there are security concerns
  const hasSecurityConcerns = stats.failedAttempts > 0 || 
    (stats.bySeverity.high || 0) > 0 || 
    (stats.bySeverity.critical || 0) > 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Activities */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Activity className="h-8 w-8 text-blue-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                Total Activities
              </dt>
              <dd className="text-2xl font-semibold text-gray-900">
                {stats.total.toLocaleString()}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      {/* Success Rate */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <CheckCircle className={`h-8 w-8 ${successRate >= 95 ? 'text-green-600' : successRate >= 90 ? 'text-yellow-600' : 'text-red-600'}`} />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                Success Rate
              </dt>
              <dd className={`text-2xl font-semibold ${successRate >= 95 ? 'text-green-600' : successRate >= 90 ? 'text-yellow-600' : 'text-red-600'}`}>
                {successRate}%
              </dd>
            </dl>
          </div>
        </div>
      </div>

      {/* Recent Sign-ins */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Shield className="h-8 w-8 text-green-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                Recent Sign-ins
              </dt>
              <dd className="text-2xl font-semibold text-gray-900">
                {stats.recentSignIns}
              </dd>
              <dd className="text-xs text-gray-500">
                Last 7 days
              </dd>
            </dl>
          </div>
        </div>
      </div>

      {/* Security Status */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {hasSecurityConcerns ? (
              <AlertTriangle className="h-8 w-8 text-red-600" />
            ) : (
              <Shield className="h-8 w-8 text-green-600" />
            )}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                Security Status
              </dt>
              <dd className={`text-2xl font-semibold ${hasSecurityConcerns ? 'text-red-600' : 'text-green-600'}`}>
                {hasSecurityConcerns ? 'Attention' : 'Good'}
              </dd>
              {stats.failedAttempts > 0 && (
                <dd className="text-xs text-red-500">
                  {stats.failedAttempts} failed attempts
                </dd>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Activity Types Breakdown */}
      {Object.keys(stats.byType).length > 0 && (
        <div className="bg-white rounded-lg border p-6 md:col-span-2">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Types</h3>
          <div className="space-y-3">
            {Object.entries(stats.byType)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([type, count]) => {
                const typeInfo = getTypeDisplayInfo(type)
                const percentage = getPercentage(count, stats.total)
                const IconComponent = typeInfo.icon
                
                return (
                  <div key={type} className="flex items-center">
                    <div className="flex items-center space-x-2 flex-shrink-0 w-32">
                      <IconComponent className={`h-4 w-4 ${typeInfo.color}`} />
                      <span className="text-sm font-medium text-gray-700">
                        {typeInfo.label}
                      </span>
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-16 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {count}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">
                        ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Outcome Breakdown */}
      {Object.keys(stats.byOutcome).length > 0 && (
        <div className="bg-white rounded-lg border p-6 md:col-span-2">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Outcomes</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(stats.byOutcome).map(([outcome, count]) => {
              const percentage = getPercentage(count, stats.total)
              
              let outcomeColor = 'text-gray-600'
              let bgColor = 'bg-gray-100'
              let outcomeIcon = Activity
              
              switch (outcome) {
                case 'success':
                  outcomeColor = 'text-green-600'
                  bgColor = 'bg-green-100'
                  outcomeIcon = CheckCircle
                  break
                case 'failure':
                case 'error':
                case 'blocked':
                  outcomeColor = 'text-red-600'
                  bgColor = 'bg-red-100'
                  outcomeIcon = XCircle
                  break
              }
              
              const OutcomeIcon = outcomeIcon
              
              return (
                <div key={outcome} className={`${bgColor} rounded-lg p-4 text-center`}>
                  <OutcomeIcon className={`h-6 w-6 ${outcomeColor} mx-auto mb-2`} />
                  <div className={`text-xl font-semibold ${outcomeColor}`}>
                    {count}
                  </div>
                  <div className="text-xs text-gray-600 capitalize">
                    {outcome}
                  </div>
                  <div className="text-xs text-gray-500">
                    ({percentage.toFixed(0)}%)
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Severity Levels */}
      {Object.keys(stats.bySeverity).length > 0 && (
        <div className="bg-white rounded-lg border p-6 lg:col-span-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Severity Levels</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {['low', 'medium', 'high', 'critical'].map((severity) => {
              const count = stats.bySeverity[severity] || 0
              const percentage = getPercentage(count, stats.total)
              
              let severityColor = ''
              let bgColor = ''
              
              switch (severity) {
                case 'low':
                  severityColor = 'text-green-600'
                  bgColor = 'bg-green-100'
                  break
                case 'medium':
                  severityColor = 'text-yellow-600'
                  bgColor = 'bg-yellow-100'
                  break
                case 'high':
                  severityColor = 'text-orange-600'
                  bgColor = 'bg-orange-100'
                  break
                case 'critical':
                  severityColor = 'text-red-600'
                  bgColor = 'bg-red-100'
                  break
              }
              
              return (
                <div key={severity} className={`${bgColor} rounded-lg p-4 text-center`}>
                  <div className={`text-2xl font-semibold ${severityColor}`}>
                    {count}
                  </div>
                  <div className="text-sm text-gray-700 capitalize font-medium">
                    {severity}
                  </div>
                  <div className="text-xs text-gray-500">
                    ({percentage.toFixed(0)}%)
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}