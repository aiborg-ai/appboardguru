'use client'

import React, { useState, useEffect } from 'react'
import {
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Lock,
  Eye,
  Users,
  RefreshCw,
  Target,
  Zap
} from 'lucide-react'
import type { 
  SecurityTabProps, 
  SecurityPosture, 
  SecurityMetric, 
  SecurityAlert,
  SecurityLoadingState 
} from '@/types/security-types'

interface SecurityScoreProps {
  score: number
  previousScore?: number
  label: string
  description: string
}

function SecurityScore({ score, previousScore, label, description }: SecurityScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    if (score >= 50) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-100'
    if (score >= 70) return 'bg-yellow-100'
    if (score >= 50) return 'bg-orange-100'
    return 'bg-red-100'
  }

  const getTrendIcon = () => {
    if (!previousScore) return <Minus className="h-4 w-4 text-gray-400" />
    if (score > previousScore) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (score < previousScore) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const change = previousScore ? score - previousScore : 0

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <div className={`p-3 rounded-full ${getScoreBgColor(score)}`}>
          <Shield className={`h-6 w-6 ${getScoreColor(score)}`} />
        </div>
      </div>
      
      <div className="mt-4 flex items-baseline justify-between">
        <div className="flex items-baseline space-x-2">
          <span className={`text-3xl font-bold ${getScoreColor(score)}`}>
            {score}
          </span>
          <span className="text-sm text-gray-500">/100</span>
        </div>
        
        <div className="flex items-center space-x-1">
          {getTrendIcon()}
          {previousScore && (
            <span className={`text-xs font-medium ${
              change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
            }`}>
              {change > 0 ? '+' : ''}{change}
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              score >= 90 ? 'bg-green-500' :
              score >= 70 ? 'bg-yellow-500' :
              score >= 50 ? 'bg-orange-500' : 'bg-red-500'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  )
}

interface SecurityMetricCardProps {
  metric: SecurityMetric
}

function SecurityMetricCard({ metric }: SecurityMetricCardProps) {
  const getMetricIcon = (category: string) => {
    switch (category) {
      case 'authentication':
        return Lock
      case 'access':
        return Eye
      case 'threats':
        return AlertTriangle
      case 'compliance':
        return CheckCircle
      case 'data':
        return Shield
      default:
        return Activity
    }
  }

  const Icon = getMetricIcon(metric.category)
  const isPositiveTrend = metric.change_percentage > 0
  const isNegativeTrend = metric.change_percentage < 0

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Icon className="h-4 w-4 text-gray-600" />
          <h4 className="text-sm font-medium text-gray-900">{metric.name}</h4>
        </div>
        <div className={`flex items-center space-x-1 ${
          isPositiveTrend ? 'text-green-600' : 
          isNegativeTrend ? 'text-red-600' : 'text-gray-500'
        }`}>
          {isPositiveTrend && <TrendingUp className="h-3 w-3" />}
          {isNegativeTrend && <TrendingDown className="h-3 w-3" />}
          {!isPositiveTrend && !isNegativeTrend && <Minus className="h-3 w-3" />}
          <span className="text-xs font-medium">
            {metric.change_percentage > 0 ? '+' : ''}{metric.change_percentage.toFixed(1)}%
          </span>
        </div>
      </div>
      
      <div className="mt-2">
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-gray-900">
            {metric.value.toLocaleString()}
          </span>
          <span className="text-sm text-gray-500">{metric.unit}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Previous: {metric.previous_value.toLocaleString()} {metric.unit}
        </p>
      </div>
      
      {/* Threshold indicators */}
      {(metric.threshold_warning || metric.threshold_critical) && (
        <div className="mt-3 flex space-x-2">
          {metric.value >= metric.threshold_critical && (
            <div className="flex items-center space-x-1 text-xs text-red-600">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span>Critical</span>
            </div>
          )}
          {metric.value >= metric.threshold_warning && metric.value < metric.threshold_critical && (
            <div className="flex items-center space-x-1 text-xs text-yellow-600">
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span>Warning</span>
            </div>
          )}
          {metric.value < metric.threshold_warning && (
            <div className="flex items-center space-x-1 text-xs text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>Normal</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface SecurityAlertItemProps {
  alert: SecurityAlert
  onDismiss?: (alertId: string) => void
}

function SecurityAlertItem({ alert, onDismiss }: SecurityAlertItemProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return AlertTriangle
      case 'high':
        return AlertTriangle
      case 'medium':
        return Clock
      case 'low':
        return CheckCircle
      default:
        return AlertTriangle
    }
  }

  const Icon = getSeverityIcon(alert.severity)

  return (
    <div className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <Icon className="h-5 w-5 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium">{alert.title}</h4>
            <p className="text-xs mt-1 opacity-80">{alert.description}</p>
            <div className="flex items-center space-x-3 mt-2 text-xs opacity-70">
              <span>{new Date(alert.created_at).toLocaleString()}</span>
              <span className="capitalize">{alert.status.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
        
        {onDismiss && alert.status === 'open' && (
          <button
            onClick={() => onDismiss(alert.id)}
            className="text-xs opacity-60 hover:opacity-100 transition-opacity"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}

export function SecurityDashboard({ accountType, userId, organizationId }: SecurityTabProps) {
  const [securityPosture, setSecurityPosture] = useState<SecurityLoadingState<SecurityPosture>>({
    status: 'idle'
  })
  const [metrics, setMetrics] = useState<SecurityLoadingState<SecurityMetric[]>>({
    status: 'idle'
  })
  const [alerts, setAlerts] = useState<SecurityLoadingState<SecurityAlert[]>>({
    status: 'idle'
  })
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Mock data - in production, these would come from API calls
  const mockSecurityPosture: SecurityPosture = {
    overall_score: 87,
    authentication_score: 92,
    access_control_score: 85,
    data_protection_score: 89,
    compliance_score: 82,
    threat_detection_score: 88,
    last_assessment: new Date().toISOString(),
    trending: 'up'
  }

  const mockMetrics: SecurityMetric[] = [
    {
      id: '1',
      name: 'Active Sessions',
      value: 247,
      previous_value: 223,
      change_percentage: 10.8,
      trend: 'up',
      threshold_warning: 300,
      threshold_critical: 400,
      unit: 'sessions',
      category: 'authentication'
    },
    {
      id: '2',
      name: 'Failed Logins (24h)',
      value: 12,
      previous_value: 18,
      change_percentage: -33.3,
      trend: 'down',
      threshold_warning: 25,
      threshold_critical: 50,
      unit: 'attempts',
      category: 'authentication'
    },
    {
      id: '3',
      name: 'Security Events',
      value: 156,
      previous_value: 142,
      change_percentage: 9.9,
      trend: 'up',
      threshold_warning: 200,
      threshold_critical: 300,
      unit: 'events',
      category: 'threats'
    },
    {
      id: '4',
      name: 'Compliance Score',
      value: 94,
      previous_value: 91,
      change_percentage: 3.3,
      trend: 'up',
      threshold_warning: 80,
      threshold_critical: 70,
      unit: '%',
      category: 'compliance'
    }
  ]

  const mockAlerts: SecurityAlert[] = [
    {
      id: '1',
      title: 'Unusual Login Location Detected',
      description: 'User login from new geographic location requires verification',
      severity: 'medium',
      category: 'authentication',
      status: 'open',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      metadata: { user_id: userId, location: 'Unknown' }
    },
    {
      id: '2',
      title: 'Multiple Failed Login Attempts',
      description: 'Possible brute force attack detected on user account',
      severity: 'high',
      category: 'security_event',
      status: 'investigating',
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      metadata: { attempts: 15, source_ip: '192.168.1.100' }
    }
  ]

  const loadSecurityData = async () => {
    // Simulate API loading states
    setSecurityPosture({ status: 'loading' })
    setMetrics({ status: 'loading' })
    setAlerts({ status: 'loading' })

    setTimeout(() => {
      setSecurityPosture({ status: 'success', data: mockSecurityPosture })
      setMetrics({ status: 'success', data: mockMetrics })
      setAlerts({ status: 'success', data: mockAlerts })
      setLastRefresh(new Date())
    }, 1000)
  }

  const handleRefresh = () => {
    loadSecurityData()
  }

  const handleDismissAlert = (alertId: string) => {
    if (alerts.status === 'success') {
      const updatedAlerts = alerts.data.filter(alert => alert.id !== alertId)
      setAlerts({ status: 'success', data: updatedAlerts })
    }
  }

  useEffect(() => {
    loadSecurityData()
  }, [userId, organizationId])

  const isLoading = securityPosture.status === 'loading' || 
                   metrics.status === 'loading' || 
                   alerts.status === 'loading'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <span>Security Dashboard</span>
          </h2>
          <p className="text-gray-600 mt-1">
            Real-time security posture and threat monitoring
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Security Posture Scores */}
      {securityPosture.status === 'success' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <SecurityScore
            score={securityPosture.data.overall_score}
            previousScore={82}
            label="Overall Security"
            description="Comprehensive security health"
          />
          <SecurityScore
            score={securityPosture.data.authentication_score}
            previousScore={89}
            label="Authentication"
            description="Login and access security"
          />
          <SecurityScore
            score={securityPosture.data.access_control_score}
            previousScore={81}
            label="Access Control"
            description="Permission and authorization"
          />
          <SecurityScore
            score={securityPosture.data.data_protection_score}
            previousScore={86}
            label="Data Protection"
            description="Encryption and privacy"
          />
          <SecurityScore
            score={securityPosture.data.compliance_score}
            previousScore={79}
            label="Compliance"
            description="Regulatory adherence"
          />
          <SecurityScore
            score={securityPosture.data.threat_detection_score}
            previousScore={85}
            label="Threat Detection"
            description="Security monitoring"
          />
        </div>
      )}

      {/* Security Metrics */}
      {metrics.status === 'success' && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Security Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.data.map(metric => (
              <SecurityMetricCard key={metric.id} metric={metric} />
            ))}
          </div>
        </div>
      )}

      {/* Security Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Alerts */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Active Security Alerts</h3>
            {alerts.status === 'success' && (
              <span className="text-sm text-gray-500">
                {alerts.data.filter(alert => alert.status === 'open').length} active
              </span>
            )}
          </div>
          
          <div className="space-y-3">
            {alerts.status === 'loading' && (
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="animate-pulse flex space-x-3">
                  <div className="w-5 h-5 bg-gray-300 rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-3/4" />
                    <div className="h-3 bg-gray-300 rounded w-1/2" />
                  </div>
                </div>
              </div>
            )}
            
            {alerts.status === 'success' && (
              <>
                {alerts.data.filter(alert => alert.status === 'open').map(alert => (
                  <SecurityAlertItem
                    key={alert.id}
                    alert={alert}
                    onDismiss={handleDismissAlert}
                  />
                ))}
                
                {alerts.data.filter(alert => alert.status === 'open').length === 0 && (
                  <div className="p-6 text-center text-gray-500 border border-gray-200 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm">No active security alerts</p>
                    <p className="text-xs mt-1">Your security posture is looking good!</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          
          <div className="space-y-3">
            <button className="w-full p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Run Security Scan</h4>
                  <p className="text-xs text-gray-500">Comprehensive security assessment</p>
                </div>
              </div>
            </button>
            
            <button className="w-full p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Review User Access</h4>
                  <p className="text-xs text-gray-500">Check permissions and roles</p>
                </div>
              </div>
            </button>
            
            <button className="w-full p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Zap className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Generate Security Report</h4>
                  <p className="text-xs text-gray-500">Executive security summary</p>
                </div>
              </div>
            </button>
            
            {accountType === 'superuser' || accountType === 'administrator' && (
              <button className="w-full p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Security Incident Response</h4>
                    <p className="text-xs text-gray-500">Initiate incident management</p>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}