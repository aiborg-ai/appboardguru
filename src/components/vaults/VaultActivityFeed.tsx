'use client'

import React, { useState, useEffect } from 'react'
import { 
  Activity,
  FileText,
  Upload,
  Download,
  UserPlus,
  UserMinus,
  MessageSquare,
  Edit3,
  Trash2,
  Shield,
  Eye,
  Star,
  Clock,
  Filter,
  RefreshCw,
  Calendar,
  User,
  FolderOpen,
  CheckSquare,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase-client'

// Simple toast implementation
const toast = {
  error: (message: string) => console.error('Toast:', message),
  success: (message: string) => console.log('Toast:', message),
  info: (message: string) => console.info('Toast:', message)
}

interface ActivityItem {
  id: string
  type: string
  action: string
  description: string
  user: {
    id: string
    email: string
    full_name?: string
    avatar_url?: string
  }
  target?: {
    id: string
    name: string
    type: string
  }
  metadata?: any
  created_at: string
}

interface VaultActivityFeedProps {
  vaultId: string
}

export default function VaultActivityFeed({ vaultId }: VaultActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const [timeRange, setTimeRange] = useState('7days')
  const [refreshing, setRefreshing] = useState(false)
  
  // Mock activity data (replace with actual API call)
  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true)
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Mock activities
        const mockActivities: ActivityItem[] = [
          {
            id: '1',
            type: 'file',
            action: 'upload',
            description: 'uploaded Annual Strategy Review.pdf',
            user: {
              id: '1',
              email: 'john.doe@example.com',
              full_name: 'John Doe'
            },
            target: {
              id: '1',
              name: 'Annual Strategy Review.pdf',
              type: 'file'
            },
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '2',
            type: 'member',
            action: 'join',
            description: 'joined the vault',
            user: {
              id: '2',
              email: 'alice.smith@example.com',
              full_name: 'Alice Smith'
            },
            created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '3',
            type: 'file',
            action: 'comment',
            description: 'commented on Q4 Financial Report.xlsx',
            user: {
              id: '3',
              email: 'bob.johnson@example.com',
              full_name: 'Bob Johnson'
            },
            target: {
              id: '2',
              name: 'Q4 Financial Report.xlsx',
              type: 'file'
            },
            metadata: {
              comment: 'Great work on the revenue projections!'
            },
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '4',
            type: 'task',
            action: 'complete',
            description: 'completed task Review Board Agenda',
            user: {
              id: '1',
              email: 'john.doe@example.com',
              full_name: 'John Doe'
            },
            target: {
              id: '1',
              name: 'Review Board Agenda',
              type: 'task'
            },
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '5',
            type: 'file',
            action: 'download',
            description: 'downloaded Meeting Minutes.pdf',
            user: {
              id: '2',
              email: 'alice.smith@example.com',
              full_name: 'Alice Smith'
            },
            target: {
              id: '3',
              name: 'Meeting Minutes.pdf',
              type: 'file'
            },
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '6',
            type: 'vault',
            action: 'update',
            description: 'updated vault settings',
            user: {
              id: '1',
              email: 'john.doe@example.com',
              full_name: 'John Doe'
            },
            metadata: {
              changes: ['Enabled public sharing', 'Updated description']
            },
            created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '7',
            type: 'member',
            action: 'role_change',
            description: 'changed Alice Smith role to Editor',
            user: {
              id: '1',
              email: 'john.doe@example.com',
              full_name: 'John Doe'
            },
            target: {
              id: '2',
              name: 'Alice Smith',
              type: 'member'
            },
            metadata: {
              old_role: 'Viewer',
              new_role: 'Editor'
            },
            created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
        
        setActivities(mockActivities)
      } catch (error) {
        console.error('Error fetching activities:', error)
        toast.error('Failed to load activities')
      } finally {
        setLoading(false)
      }
    }
    
    fetchActivities()
  }, [vaultId, timeRange])
  
  // Get activity icon
  const getActivityIcon = (type: string, action: string) => {
    if (type === 'file') {
      switch (action) {
        case 'upload': return Upload
        case 'download': return Download
        case 'comment': return MessageSquare
        case 'edit': return Edit3
        case 'delete': return Trash2
        default: return FileText
      }
    }
    if (type === 'member') {
      switch (action) {
        case 'join': return UserPlus
        case 'leave': return UserMinus
        case 'role_change': return Shield
        default: return User
      }
    }
    if (type === 'task') {
      switch (action) {
        case 'complete': return CheckSquare
        case 'create': return CheckSquare
        default: return CheckSquare
      }
    }
    if (type === 'vault') {
      return FolderOpen
    }
    return Activity
  }
  
  // Get activity color
  const getActivityColor = (type: string, action: string) => {
    if (type === 'file') {
      switch (action) {
        case 'upload': return 'text-green-600'
        case 'download': return 'text-blue-600'
        case 'delete': return 'text-red-600'
        default: return 'text-gray-600'
      }
    }
    if (type === 'member') {
      switch (action) {
        case 'join': return 'text-green-600'
        case 'leave': return 'text-red-600'
        default: return 'text-blue-600'
      }
    }
    if (type === 'task') {
      return action === 'complete' ? 'text-green-600' : 'text-yellow-600'
    }
    return 'text-gray-600'
  }
  
  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60)
      return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes} minutes ago`
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours)
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24)
      return `${days} day${days > 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString()
    }
  }
  
  // Filter activities
  const filteredActivities = activities.filter(activity => {
    if (filterType !== 'all' && activity.type !== filterType) {
      return false
    }
    
    // Time range filtering
    const activityDate = new Date(activity.created_at)
    const now = new Date()
    const diffInDays = (now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24)
    
    switch (timeRange) {
      case '24hours':
        return diffInDays <= 1
      case '7days':
        return diffInDays <= 7
      case '30days':
        return diffInDays <= 30
      case 'all':
        return true
      default:
        return true
    }
  })
  
  // Group activities by date
  const groupedActivities = filteredActivities.reduce((acc, activity) => {
    const date = new Date(activity.created_at)
    const dateKey = date.toDateString()
    
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(activity)
    return acc
  }, {} as Record<string, ActivityItem[]>)
  
  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true)
    // TODO: Implement actual refresh
    await new Promise(resolve => setTimeout(resolve, 1000))
    setRefreshing(false)
    toast.success('Activity feed refreshed')
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-600">Loading activities...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Activity Feed
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Track all activities and changes in this vault
          </p>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="file">Files</SelectItem>
                <SelectItem value="member">Members</SelectItem>
                <SelectItem value="task">Tasks</SelectItem>
                <SelectItem value="vault">Vault</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24hours">Last 24 Hours</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex-1 text-right text-sm text-gray-500">
              Showing {filteredActivities.length} activities
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Activity Timeline */}
      {filteredActivities.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
            <p className="text-gray-500">
              {filterType !== 'all' || timeRange !== 'all'
                ? 'Try adjusting your filters to see more activities'
                : 'Activities will appear here as they happen'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedActivities).map(([dateKey, dateActivities]) => {
            const isToday = dateKey === new Date().toDateString()
            const isYesterday = dateKey === new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()
            
            return (
              <div key={dateKey}>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-medium text-gray-700">
                    {isToday ? 'Today' : isYesterday ? 'Yesterday' : dateKey}
                  </h3>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                
                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {dateActivities.map((activity, index) => {
                        const ActivityIcon = getActivityIcon(activity.type, activity.action)
                        const iconColor = getActivityColor(activity.type, activity.action)
                        
                        return (
                          <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "p-2 rounded-lg",
                                activity.type === 'file' && "bg-blue-50",
                                activity.type === 'member' && "bg-green-50",
                                activity.type === 'task' && "bg-yellow-50",
                                activity.type === 'vault' && "bg-purple-50"
                              )}>
                                <ActivityIcon className={cn("h-4 w-4", iconColor)} />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm">
                                      <span className="font-medium text-gray-900">
                                        {activity.user.full_name || activity.user.email}
                                      </span>
                                      {' '}
                                      <span className="text-gray-600">{activity.description}</span>
                                    </p>
                                    
                                    {activity.metadata?.comment && (
                                      <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-700 italic">
                                          "{activity.metadata.comment}"
                                        </p>
                                      </div>
                                    )}
                                    
                                    {activity.metadata?.changes && (
                                      <div className="mt-2">
                                        <ul className="text-sm text-gray-600 space-y-1">
                                          {activity.metadata.changes.map((change: string, i: number) => (
                                            <li key={i} className="flex items-center gap-2">
                                              <div className="w-1 h-1 bg-gray-400 rounded-full" />
                                              {change}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    
                                    {activity.metadata?.old_role && (
                                      <div className="mt-2 flex items-center gap-2 text-sm">
                                        <Badge variant="outline" className="text-xs">
                                          {activity.metadata.old_role}
                                        </Badge>
                                        <span className="text-gray-500">→</span>
                                        <Badge variant="outline" className="text-xs">
                                          {activity.metadata.new_role}
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-2 ml-4">
                                    <Avatar className="h-6 w-6">
                                      {activity.user.avatar_url ? (
                                        <AvatarImage src={activity.user.avatar_url} />
                                      ) : (
                                        <AvatarFallback className="text-xs">
                                          {activity.user.full_name?.[0] || activity.user.email[0].toUpperCase()}
                                        </AvatarFallback>
                                      )}
                                    </Avatar>
                                    <span className="text-xs text-gray-500">
                                      {formatTimeAgo(activity.created_at)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}