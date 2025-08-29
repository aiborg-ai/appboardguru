'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar'
import { 
  FileText, 
  AlertTriangle, 
  Target, 
  Shield,
  Activity 
} from 'lucide-react'

interface ActivityItem {
  type: 'assessment' | 'finding' | 'remediation' | 'policy'
  title: string
  status: string
  date: string
  user: string
}

interface RecentActivityProps {
  activities: ActivityItem[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'assessment':
        return <FileText className="h-4 w-4 text-blue-500" />
      case 'finding':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'remediation':
        return <Target className="h-4 w-4 text-green-500" />
      case 'policy':
        return <Shield className="h-4 w-4 text-purple-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'approved':
      case 'compliant':
        return 'bg-green-100 text-green-800'
      case 'in-progress':
      case 'under-review':
        return 'bg-blue-100 text-blue-800'
      case 'draft':
      case 'pending':
        return 'bg-gray-100 text-gray-800'
      case 'overdue':
      case 'non-compliant':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
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

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No recent activity</p>
        <p className="text-sm text-gray-500">Activity will appear here as team members work on compliance tasks</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-h-80 overflow-y-auto">
      {activities.map((activity, index) => (
        <div key={index} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
          <div className="flex-shrink-0 mt-1">
            {getActivityIcon(activity.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 leading-tight">
                  {activity.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`text-xs ${getStatusColor(activity.status)}`}>
                    {activity.status}
                  </Badge>
                  <span className="text-xs text-gray-500 capitalize">
                    {activity.type}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {getUserInitials(activity.user)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(activity.date)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}