'use client'

import React, { useState, useCallback, useMemo, forwardRef } from 'react'
import { VirtualScrollList, VirtualScrollListRef, VirtualScrollListItem } from './virtual-scroll-list'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Phone,
  MessageSquare,
  FileText,
  AlertCircle,
  Check,
  X,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  ExternalLink
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { format, isToday, isTomorrow, isYesterday } from 'date-fns'

interface CalendarEvent {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  allDay?: boolean
  location?: string
  virtualMeetingUrl?: string
  type: 'meeting' | 'deadline' | 'reminder' | 'board-meeting' | 'committee-meeting' | 'other'
  status: 'confirmed' | 'tentative' | 'cancelled' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  attendees: Array<{
    id: string
    name: string
    email: string
    avatar?: string
    status: 'accepted' | 'declined' | 'pending' | 'tentative'
    role?: string
  }>
  organizer: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  attachments?: Array<{
    id: string
    name: string
    url: string
    type: string
  }>
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
    interval: number
    endDate?: string
  }
  createdAt: string
  updatedAt: string
}

interface CalendarEventsVirtualListProps {
  events: CalendarEvent[]
  height?: number | string
  searchTerm?: string
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  onEventClick?: (event: CalendarEvent) => void
  onEditEvent?: (event: CalendarEvent) => void
  onDeleteEvent?: (event: CalendarEvent) => void
  onJoinMeeting?: (event: CalendarEvent) => void
  onRSVP?: (event: CalendarEvent, status: 'accepted' | 'declined' | 'tentative') => void
  className?: string
  enableSelection?: boolean
  selectedEvents?: Set<string>
  onSelectionChange?: (selectedEvents: Set<string>) => void
  groupByDate?: boolean
  showTimeZone?: string
}

// Calendar event item component for virtual list
interface CalendarEventItemProps {
  item: VirtualScrollListItem
  index: number
  style: React.CSSProperties
}

const CalendarEventItem: React.FC<CalendarEventItemProps> = ({ item }) => {
  const event = item.data as CalendarEvent
  const [showAttendees, setShowAttendees] = useState(false)

  const getEventTypeConfig = (type: string) => {
    const configs = {
      'meeting': { 
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: Users,
        label: 'Meeting'
      },
      'board-meeting': { 
        color: 'bg-purple-50 text-purple-700 border-purple-200',
        icon: Users,
        label: 'Board Meeting'
      },
      'committee-meeting': { 
        color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        icon: Users,
        label: 'Committee'
      },
      'deadline': { 
        color: 'bg-red-50 text-red-700 border-red-200',
        icon: AlertCircle,
        label: 'Deadline'
      },
      'reminder': { 
        color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        icon: Clock,
        label: 'Reminder'
      },
      'other': { 
        color: 'bg-gray-50 text-gray-700 border-gray-200',
        icon: Calendar,
        label: 'Event'
      }
    }
    return configs[type as keyof typeof configs] || configs.other
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      'confirmed': { color: 'bg-green-100 text-green-800', label: 'Confirmed' },
      'tentative': { color: 'bg-yellow-100 text-yellow-800', label: 'Tentative' },
      'cancelled': { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
      'completed': { color: 'bg-gray-100 text-gray-800', label: 'Completed' }
    }
    return configs[status as keyof typeof configs] || configs.confirmed
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      'low': 'text-gray-500',
      'medium': 'text-blue-500',
      'high': 'text-orange-500',
      'critical': 'text-red-500'
    }
    return colors[priority as keyof typeof colors] || colors.medium
  }

  const formatEventTime = (startTime: string, endTime: string, allDay?: boolean) => {
    const start = new Date(startTime)
    const end = new Date(endTime)
    
    if (allDay) {
      return 'All day'
    }
    
    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`
  }

  const formatEventDate = (date: string) => {
    const eventDate = new Date(date)
    
    if (isToday(eventDate)) return 'Today'
    if (isTomorrow(eventDate)) return 'Tomorrow'
    if (isYesterday(eventDate)) return 'Yesterday'
    
    return format(eventDate, 'MMM d, yyyy')
  }

  const getAttendeeStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Check className="h-3 w-3 text-green-600" />
      case 'declined':
        return <X className="h-3 w-3 text-red-600" />
      case 'tentative':
        return <Clock className="h-3 w-3 text-yellow-600" />
      default:
        return <Clock className="h-3 w-3 text-gray-400" />
    }
  }

  const typeConfig = getEventTypeConfig(event.type)
  const statusConfig = getStatusConfig(event.status)
  const TypeIcon = typeConfig.icon

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Would call onEditEvent from props
  }, [])

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Would call onDeleteEvent from props
  }, [])

  const handleJoin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Would call onJoinMeeting from props
  }, [])

  const handleRSVP = useCallback((status: 'accepted' | 'declined' | 'tentative') => {
    // Would call onRSVP from props
  }, [])

  return (
    <Card className={cn(
      'mb-3 hover:shadow-md transition-all duration-200 cursor-pointer',
      event.status === 'cancelled' && 'opacity-60',
      event.priority === 'critical' && 'ring-2 ring-red-200'
    )}>
      <div className="p-4">
        <div className="flex items-start space-x-3">
          {/* Event Type Icon */}
          <div className={cn(
            'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border',
            typeConfig.color
          )}>
            <TypeIcon className="h-5 w-5" />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={cn(
                    'font-semibold truncate',
                    event.status === 'cancelled' ? 'text-gray-500 line-through' : 'text-gray-900'
                  )}>
                    {event.title}
                  </h3>
                  
                  <Badge className={cn('text-xs px-2 py-0.5 border', typeConfig.color)}>
                    {typeConfig.label}
                  </Badge>
                  
                  <Badge className={cn('text-xs px-2 py-0.5', statusConfig.color)}>
                    {statusConfig.label}
                  </Badge>

                  {event.priority !== 'medium' && (
                    <div className={cn('h-2 w-2 rounded-full', {
                      'bg-gray-400': event.priority === 'low',
                      'bg-orange-400': event.priority === 'high',
                      'bg-red-500': event.priority === 'critical'
                    })} />
                  )}
                </div>

                {/* Time and Date */}
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                  <span className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatEventDate(event.startTime)}
                  </span>
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatEventTime(event.startTime, event.endTime, event.allDay)}
                  </span>
                </div>

                {/* Location */}
                {(event.location || event.virtualMeetingUrl) && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    {event.location && (
                      <span className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {event.location}
                      </span>
                    )}
                    {event.virtualMeetingUrl && (
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-blue-600 hover:text-blue-700"
                        onClick={handleJoin}
                      >
                        <Video className="h-3 w-3 mr-1" />
                        Join Meeting
                      </Button>
                    )}
                  </div>
                )}

                {/* Description */}
                {event.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {event.description}
                  </p>
                )}

                {/* Attendees */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 mr-2">
                      {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex -space-x-1">
                      {event.attendees.slice(0, 5).map((attendee) => (
                        <div key={attendee.id} className="relative">
                          <Avatar className="h-6 w-6 border-2 border-white">
                            <AvatarImage src={attendee.avatar} alt={attendee.name} />
                            <AvatarFallback className="text-xs">
                              {attendee.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1">
                            {getAttendeeStatusIcon(attendee.status)}
                          </div>
                        </div>
                      ))}
                      {event.attendees.length > 5 && (
                        <div className="flex items-center justify-center h-6 w-6 bg-gray-100 rounded-full border-2 border-white text-xs text-gray-600">
                          +{event.attendees.length - 5}
                        </div>
                      )}
                    </div>
                  </div>

                  {showAttendees && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAttendees(false)}
                      className="text-xs h-6 px-2"
                    >
                      Hide
                    </Button>
                  )}
                </div>

                {/* Expanded Attendee List */}
                {showAttendees && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="space-y-2">
                      {event.attendees.map((attendee) => (
                        <div key={attendee.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={attendee.avatar} alt={attendee.name} />
                              <AvatarFallback className="text-xs">
                                {attendee.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-gray-900">{attendee.name}</span>
                            {attendee.role && (
                              <span className="text-gray-500 text-xs">({attendee.role})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {getAttendeeStatusIcon(attendee.status)}
                            <span className="text-xs text-gray-500 capitalize">
                              {attendee.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {event.attachments && event.attachments.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <FileText className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {event.attachments.length} attachment{event.attachments.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 ml-4">
                {/* RSVP Buttons for meetings */}
                {event.type.includes('meeting') && event.status !== 'cancelled' && (
                  <div className="flex items-center gap-1 mr-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => handleRSVP('accepted')}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                      onClick={() => handleRSVP('tentative')}
                    >
                      ?
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleRSVP('declined')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-gray-50"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Event
                    </DropdownMenuItem>
                    {event.virtualMeetingUrl && (
                      <DropdownMenuItem onClick={handleJoin}>
                        <Video className="h-4 w-4 mr-2" />
                        Join Meeting
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setShowAttendees(!showAttendees)}>
                      <Users className="h-4 w-4 mr-2" />
                      {showAttendees ? 'Hide' : 'Show'} Attendees
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in Calendar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

// Main CalendarEventsVirtualList component
export const CalendarEventsVirtualList = forwardRef<VirtualScrollListRef, CalendarEventsVirtualListProps>(
  ({
    events,
    height = 600,
    searchTerm,
    loading = false,
    hasMore = false,
    onLoadMore,
    onEventClick,
    onEditEvent,
    onDeleteEvent,
    onJoinMeeting,
    onRSVP,
    className,
    enableSelection = false,
    selectedEvents,
    onSelectionChange,
    groupByDate = false,
    showTimeZone
  }, ref) => {

    // Group events by date if enabled
    const processedEvents = useMemo(() => {
      if (!groupByDate) return events

      const grouped = events.reduce((acc, event) => {
        const date = format(new Date(event.startTime), 'yyyy-MM-dd')
        if (!acc[date]) acc[date] = []
        acc[date].push(event)
        return acc
      }, {} as Record<string, CalendarEvent[]>)

      // Flatten back to array with date headers
      const flattened: CalendarEvent[] = []
      Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, dateEvents]) => {
          // Add a synthetic header item
          flattened.push({
            id: `header-${date}`,
            title: format(new Date(date), 'EEEE, MMMM d, yyyy'),
            type: 'header' as any,
            status: 'confirmed',
            priority: 'medium',
            startTime: date,
            endTime: date,
            attendees: [],
            organizer: { id: '', name: '', email: '' },
            createdAt: date,
            updatedAt: date
          })
          flattened.push(...dateEvents.sort((a, b) => 
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          ))
        })

      return flattened
    }, [events, groupByDate])

    // Convert events to virtual list items
    const virtualItems = useMemo((): VirtualScrollListItem[] => {
      return processedEvents.map(event => ({
        id: event.id,
        data: event
      }))
    }, [processedEvents])

    // Dynamic height calculation based on content
    const getItemHeight = useCallback((index: number, item: VirtualScrollListItem) => {
      const event = item.data as CalendarEvent
      
      if (event.type === 'header') {
        return 50
      }
      
      // Base height
      let height = 140
      
      // Add height for description
      if (event.description && event.description.length > 0) {
        height += 20
      }
      
      // Add height for location/virtual meeting
      if (event.location || event.virtualMeetingUrl) {
        height += 20
      }
      
      // Add height for attachments
      if (event.attachments && event.attachments.length > 0) {
        height += 20
      }
      
      // Add height for many attendees
      if (event.attendees.length > 5) {
        height += 10
      }
      
      // Add padding
      height += 24
      
      return height
    }, [])

    const handleItemClick = useCallback((item: VirtualScrollListItem, index: number) => {
      const event = item.data as CalendarEvent
      if (event.type !== 'header') {
        onEventClick?.(event)
      }
    }, [onEventClick])

    return (
      <div className={cn('calendar-events-virtual-list', className)}>
        <VirtualScrollList
          ref={ref}
          items={virtualItems}
          itemComponent={CalendarEventItem}
          itemHeight={getItemHeight}
          height={height}
          estimatedItemHeight={160}
          searchTerm={searchTerm}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          enableSelection={enableSelection}
          selectedItems={selectedEvents}
          onSelectionChange={onSelectionChange}
          onItemClick={handleItemClick}
          enableKeyboardNavigation={true}
          overscan={3}
          loadMoreThreshold={5}
        />
      </div>
    )
  }
)

CalendarEventsVirtualList.displayName = 'CalendarEventsVirtualList'

export default CalendarEventsVirtualList