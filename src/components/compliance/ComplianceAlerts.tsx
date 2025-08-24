'use client'

import React from 'react'
import { Badge } from '@/features/shared/ui/badge'
import { Button } from '@/features/shared/ui/button'
import { AlertTriangle, Clock, Bell, X } from 'lucide-react'
import { ComplianceAlert, CompliancePriority } from '@/types/compliance'

interface ComplianceAlertsProps {
  alerts: ComplianceAlert[]
  onDismiss?: (alertId: string) => void
  onViewDetails?: (alert: ComplianceAlert) => void
}

export function ComplianceAlerts({ alerts, onDismiss, onViewDetails }: ComplianceAlertsProps) {
  const getPriorityColor = (priority: CompliancePriority) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityIcon = (priority: CompliancePriority) => {
    switch (priority) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'low':
        return <Bell className="h-4 w-4 text-green-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`
    }
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8">
        <Bell className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <p className="text-gray-600">No active alerts</p>
        <p className="text-sm text-gray-500">All compliance items are on track</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-h-80 overflow-y-auto">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`p-4 rounded-lg border ${getPriorityColor(alert.priority)} relative group`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getPriorityIcon(alert.priority)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-medium text-sm leading-tight">
                  {alert.title}
                </h4>
                {onDismiss && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onDismiss(alert.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                {alert.message}
              </p>
              
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {alert.relatedEntity.type}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(alert.createdAt)}
                  </span>
                </div>
                
                {alert.dueDate && (
                  <span className="text-xs text-gray-600">
                    Due: {new Date(alert.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>

              {onViewDetails && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={() => onViewDetails(alert)}
                >
                  View Details
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}