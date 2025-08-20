'use client'

import React, { useState } from 'react'
import { 
  ChevronDown, 
  ChevronRight, 
  MapPin, 
  Monitor, 
  Smartphone, 
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react'
import { format } from 'date-fns'
import type { ActivityLog, ActivityTranslation } from '@/lib/activity-translator'

interface ActivityTimelineItemProps {
  activity: ActivityLog
  translation: ActivityTranslation
}

export function ActivityTimelineItem({ activity, translation }: ActivityTimelineItemProps) {
  const [showDetails, setShowDetails] = useState(false)

  // Get outcome icon and color
  const getOutcomeDisplay = (outcome: string) => {
    switch (outcome) {
      case 'success':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' }
      case 'failure':
        return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' }
      case 'error':
        return { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50' }
      case 'blocked':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' }
      default:
        return { icon: Info, color: 'text-gray-500', bg: 'bg-gray-50' }
    }
  }

  // Get severity badge
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Get device icon
  const getDeviceIcon = (userAgent?: string) => {
    if (!userAgent) return Monitor
    const ua = userAgent.toLowerCase()
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('ios')) {
      return Smartphone
    }
    return Monitor
  }

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return format(date, 'MMM d, yyyy \'at\' h:mm a')
  }

  const outcomeDisplay = getOutcomeDisplay(activity.outcome)
  const OutcomeIcon = outcomeDisplay.icon
  const DeviceIcon = getDeviceIcon(activity.details.userAgent)

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-start space-x-4">
        {/* Activity Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${outcomeDisplay.bg} flex items-center justify-center`}>
          <span className="text-lg" role="img" aria-label={translation.category}>
            {translation.icon}
          </span>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Title and Description */}
              <div className="flex items-center space-x-2 mb-1">
                <h4 className={`text-sm font-medium ${translation.color}`}>
                  {translation.title}
                </h4>
                <OutcomeIcon className={`h-4 w-4 ${outcomeDisplay.color}`} />
                {activity.severity !== 'low' && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getSeverityBadge(activity.severity)}`}>
                    {activity.severity}
                  </span>
                )}
              </div>
              
              <p className="text-sm text-gray-600 mb-2">
                {translation.description}
              </p>

              {/* Category and timestamp */}
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-800">
                  {translation.category}
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatTimestamp(activity.timestamp)}</span>
                </span>
              </div>
            </div>

            {/* Details Toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex-shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label={showDetails ? 'Hide details' : 'Show details'}
            >
              {showDetails ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Expanded Details */}
          {showDetails && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {/* Technical Details */}
                <div className="space-y-2">
                  <h5 className="font-medium text-gray-900">Technical Details</h5>
                  <div className="space-y-1 text-gray-600">
                    <div className="flex justify-between">
                      <span>Event Type:</span>
                      <span className="font-mono text-xs">{activity.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Action:</span>
                      <span className="font-mono text-xs">{activity.action}</span>
                    </div>
                    {activity.details.resourceType && (
                      <div className="flex justify-between">
                        <span>Resource:</span>
                        <span className="font-mono text-xs">{activity.details.resourceType}</span>
                      </div>
                    )}
                    {activity.details.endpoint && (
                      <div className="flex justify-between">
                        <span>Endpoint:</span>
                        <span className="font-mono text-xs">{activity.details.endpoint}</span>
                      </div>
                    )}
                    {activity.details.responseStatus && (
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className={`font-mono text-xs ${
                          activity.details.responseStatus < 400 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {activity.details.responseStatus}
                        </span>
                      </div>
                    )}
                    {activity.details.responseTime && (
                      <div className="flex justify-between">
                        <span>Response Time:</span>
                        <span className="font-mono text-xs">{activity.details.responseTime}ms</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Context Information */}
                <div className="space-y-2">
                  <h5 className="font-medium text-gray-900">Context</h5>
                  <div className="space-y-1 text-gray-600">
                    {activity.details.ipAddress && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-3 w-3" />
                        <span className="text-xs">
                          IP: {activity.details.ipAddress === '::1' || activity.details.ipAddress === '127.0.0.1' 
                            ? 'localhost' 
                            : activity.details.ipAddress
                          }
                        </span>
                      </div>
                    )}
                    {activity.details.userAgent && (
                      <div className="flex items-start space-x-2">
                        <DeviceIcon className="h-3 w-3 mt-0.5" />
                        <span className="text-xs break-all">
                          {activity.details.userAgent}
                        </span>
                      </div>
                    )}
                    {activity.sessionId && (
                      <div className="flex justify-between">
                        <span>Session:</span>
                        <span className="font-mono text-xs">{activity.sessionId.slice(0, 8)}...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Metadata */}
              {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-2">Additional Information</h5>
                  <div className="bg-gray-50 rounded-md p-3">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all">
                      {JSON.stringify(activity.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}