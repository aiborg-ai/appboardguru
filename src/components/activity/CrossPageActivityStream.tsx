'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Activity, 
  FileText, 
  Building2, 
  Calendar, 
  Package, 
  Users,
  Eye,
  Edit,
  Plus,
  Share2,
  Download,
  Search,
  Clock,
  Filter,
  ChevronDown,
  ExternalLink,
  MoreHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu'
import { useActivities, useIntegrationActions } from '@/lib/stores/integration-store'
import { useOrganization } from '@/contexts/OrganizationContext'

interface ActivityStreamProps {
  entityType?: 'asset' | 'organization' | 'meeting' | 'vault' | 'user'
  entityId?: string
  limit?: number
  showFilters?: boolean
  compact?: boolean
  realTime?: boolean
}

// Mock real-time activities for demonstration
const mockRealtimeActivities = [
  {
    id: 'rt1',
    type: 'view' as const,
    entityType: 'asset' as const,
    entityId: '1',
    entityTitle: 'Q4 Financial Report 2024',
    description: 'Sarah Johnson viewed the financial report',
    timestamp: new Date().toISOString(),
    user: {
      id: 'user1',
      name: 'Sarah Johnson',
      email: 'sarah@techvision.com',
      avatar: '/avatars/sarah.jpg'
    },
    metadata: {
      organization: 'TechVision Solutions',
      location: 'Dashboard',
      duration: '5 minutes'
    }
  },
  {
    id: 'rt2',
    type: 'edit' as const,
    entityType: 'meeting' as const,
    entityId: '2',
    entityTitle: 'Board Meeting - January 2024',
    description: 'John Smith updated meeting agenda',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    user: {
      id: 'user2',
      name: 'John Smith',
      email: 'john@techvision.com',
      avatar: '/avatars/john.jpg'
    },
    metadata: {
      organization: 'TechVision Solutions',
      changes: ['Added agenda item', 'Updated meeting time']
    }
  },
  {
    id: 'rt3',
    type: 'create' as const,
    entityType: 'vault' as const,
    entityId: '3',
    entityTitle: 'Executive Strategy Vault',
    description: 'Maria Garcia created a new secure vault',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    user: {
      id: 'user3',
      name: 'Maria Garcia',
      email: 'maria@techvision.com',
      avatar: '/avatars/maria.jpg'
    },
    metadata: {
      organization: 'TechVision Solutions',
      permissions: ['Executive team access only']
    }
  }
]

export default function CrossPageActivityStream({ 
  entityType, 
  entityId, 
  limit = 20,
  showFilters = true,
  compact = false,
  realTime = false
}: ActivityStreamProps) {
  const router = useRouter()
  const { currentOrganization } = useOrganization()
  const { trackActivity } = useIntegrationActions()
  const storedActivities = useActivities()
  
  const [filterTypes, setFilterTypes] = useState<string[]>([])
  const [filterEntityTypes, setFilterEntityTypes] = useState<string[]>([])
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d' | 'all'>('24h')
  const [realtimeActivities, setRealtimeActivities] = useState(mockRealtimeActivities)

  // Simulate real-time updates
  useEffect(() => {
    if (!realTime) return

    const interval = setInterval(() => {
      // Add a new mock activity every 30 seconds
      const newActivity = {
        id: `rt${Date.now()}`,
        type: ['view', 'edit', 'create', 'share'][Math.floor(Math.random() * 4)] as const,
        entityType: ['asset', 'meeting', 'organization', 'vault'][Math.floor(Math.random() * 4)] as const,
        entityId: `${Math.floor(Math.random() * 100)}`,
        entityTitle: `Sample Entity ${Math.floor(Math.random() * 100)}`,
        description: 'Real-time activity simulation',
        timestamp: new Date().toISOString(),
        user: {
          id: `user${Math.floor(Math.random() * 5)}`,
          name: ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown'][Math.floor(Math.random() * 4)],
          email: 'user@example.com',
          avatar: '/avatars/default.jpg'
        },
        metadata: {
          organization: currentOrganization?.name || 'Sample Organization'
        }
      }

      setRealtimeActivities(prev => [newActivity, ...prev.slice(0, 19)])
    }, 30000)

    return () => clearInterval(interval)
  }, [realTime, currentOrganization])

  // Combine stored and realtime activities
  const allActivities = useMemo(() => {
    const combined = [...realtimeActivities, ...storedActivities]
    return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [realtimeActivities, storedActivities])

  // Filter activities
  const filteredActivities = useMemo(() => {
    let activities = allActivities

    // Filter by entity if specified
    if (entityType && entityId) {
      activities = activities.filter(activity => 
        activity.entityType === entityType && activity.entityId === entityId
      )
    }

    // Filter by types
    if (filterTypes.length > 0) {
      activities = activities.filter(activity => filterTypes.includes(activity.type))
    }

    // Filter by entity types
    if (filterEntityTypes.length > 0) {
      activities = activities.filter(activity => filterEntityTypes.includes(activity.entityType))
    }

    // Filter by time range
    if (timeRange !== 'all') {
      const now = new Date()
      const timeThreshold = new Date()
      
      switch (timeRange) {
        case '1h':
          timeThreshold.setHours(now.getHours() - 1)
          break
        case '24h':
          timeThreshold.setDate(now.getDate() - 1)
          break
        case '7d':
          timeThreshold.setDate(now.getDate() - 7)
          break
        case '30d':
          timeThreshold.setDate(now.getDate() - 30)
          break
      }
      
      activities = activities.filter(activity => 
        new Date(activity.timestamp) >= timeThreshold
      )
    }

    return activities.slice(0, limit)
  }, [allActivities, entityType, entityId, filterTypes, filterEntityTypes, timeRange, limit])

  const getActivityIcon = (type: string, entityType: string) => {
    if (type === 'view') return Eye
    if (type === 'edit') return Edit
    if (type === 'create') return Plus
    if (type === 'share') return Share2
    if (type === 'download') return Download
    if (type === 'search') return Search
    
    // Fallback to entity type icon
    switch (entityType) {
      case 'asset': return FileText
      case 'meeting': return Calendar
      case 'organization': return Building2
      case 'vault': return Package
      case 'user': return Users
      default: return Activity
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'view': return 'text-blue-600 bg-blue-100'
      case 'edit': return 'text-orange-600 bg-orange-100'
      case 'create': return 'text-green-600 bg-green-100'
      case 'share': return 'text-purple-600 bg-purple-100'
      case 'download': return 'text-indigo-600 bg-indigo-100'
      case 'search': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diff = now.getTime() - time.getTime()
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
    
    return time.toLocaleDateString()
  }

  const handleActivityClick = (activity: any) => {
    // Track that we're viewing this activity
    trackActivity({
      type: 'view',
      entityType: activity.entityType,
      entityId: activity.entityId,
      entityTitle: activity.entityTitle,
      description: `Viewed from activity stream: ${activity.description}`
    })

    // Navigate to the entity
    const entityPath = activity.entityType === 'organization' 
      ? `/dashboard/organizations/${activity.entityId}`
      : `/dashboard/${activity.entityType}s/${activity.entityId}`
      
    router.push(entityPath)
  }

  const handleFilterChange = (type: 'types' | 'entityTypes', value: string, checked: boolean) => {
    if (type === 'types') {
      setFilterTypes(prev => 
        checked ? [...prev, value] : prev.filter(t => t !== value)
      )
    } else {
      setFilterEntityTypes(prev => 
        checked ? [...prev, value] : prev.filter(t => t !== value)
      )
    }
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Activity
            {realTime && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
          </h3>
          <Badge variant="secondary">{filteredActivities.length}</Badge>
        </div>
        <div className="space-y-2">
          {filteredActivities.slice(0, 5).map((activity) => {
            const ActivityIcon = getActivityIcon(activity.type, activity.entityType)
            const colorClass = getActivityColor(activity.type)
            
            return (
              <div
                key={activity.id}
                className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                onClick={() => handleActivityClick(activity)}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${colorClass}`}>
                  <ActivityIcon className="h-3 w-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 truncate">
                    {activity.description}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTimeAgo(activity.timestamp)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Activity Stream</h2>
            {realTime && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Live updates enabled
              </div>
            )}
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {filteredActivities.length} activities
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Activity Type
                {filterTypes.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {filterTypes.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {['view', 'edit', 'create', 'share', 'download', 'search'].map((type) => (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={filterTypes.includes(type)}
                  onCheckedChange={(checked) => handleFilterChange('types', type, checked)}
                  className="capitalize"
                >
                  {type}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Entity Type
                {filterEntityTypes.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {filterEntityTypes.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {['asset', 'meeting', 'organization', 'vault', 'user'].map((type) => (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={filterEntityTypes.includes(type)}
                  onCheckedChange={(checked) => handleFilterChange('entityTypes', type, checked)}
                  className="capitalize"
                >
                  {type}s
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Clock className="h-4 w-4 mr-1" />
                {timeRange === 'all' ? 'All time' : timeRange}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setTimeRange('1h')}>
                Last hour
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeRange('24h')}>
                Last 24 hours
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeRange('7d')}>
                Last 7 days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeRange('30d')}>
                Last 30 days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeRange('all')}>
                All time
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {(filterTypes.length > 0 || filterEntityTypes.length > 0) && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setFilterTypes([])
                setFilterEntityTypes([])
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Activities */}
      {filteredActivities.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No activity found</h3>
          <p className="text-gray-500">
            {filterTypes.length > 0 || filterEntityTypes.length > 0
              ? 'Try adjusting your filters to see more activities.'
              : 'Activity will appear here as you interact with the platform.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredActivities.map((activity) => {
            const ActivityIcon = getActivityIcon(activity.type, activity.entityType)
            const colorClass = getActivityColor(activity.type)
            
            return (
              <Card 
                key={activity.id} 
                className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleActivityClick(activity)}
              >
                <div className="flex items-start space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                    <ActivityIcon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {activity.type}
                        </span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {activity.entityType}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(activity.timestamp)}
                      </div>
                    </div>
                    
                    <h4 className="font-medium text-gray-900 mb-1">
                      {activity.entityTitle}
                    </h4>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {activity.description}
                    </p>
                    
                    {activity.user && (
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Avatar className="h-4 w-4">
                          <img 
                            src={activity.user.avatar || '/avatars/default.jpg'} 
                            alt={activity.user.name}
                            className="rounded-full"
                          />
                        </Avatar>
                        <span>{activity.user.name}</span>
                        {activity.metadata?.organization && (
                          <>
                            <span>•</span>
                            <span>{activity.metadata.organization}</span>
                          </>
                        )}
                      </div>
                    )}
                    
                    {activity.metadata && (
                      <div className="mt-2 flex items-center gap-2">
                        {activity.metadata.duration && (
                          <Badge variant="secondary" className="text-xs">
                            {activity.metadata.duration}
                          </Badge>
                        )}
                        {activity.metadata.changes && Array.isArray(activity.metadata.changes) && (
                          <Badge variant="secondary" className="text-xs">
                            {activity.metadata.changes.length} changes
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}