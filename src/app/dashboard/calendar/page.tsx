'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { CalendarService } from '@/lib/calendar-service'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Settings,
  Download,
  Filter
} from 'lucide-react'
import { InfoTooltip, InfoSection } from '@/components/atoms/feedback/info-tooltip'
import CreateEventModal from '@/features/calendar/CreateEventModal'

interface CalendarEvent {
  id: string
  title: string
  description?: string
  start_datetime: string
  end_datetime: string
  color: string
  event_type: string
  status: string
  location?: string
  attendees?: any[]
}

const EVENT_COLORS = {
  meeting: '#3B82F6',
  personal: '#10B981',
  deadline: '#EF4444',
  reminder: '#F59E0B',
  holiday: '#8B5CF6'
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const calendarService = new CalendarService()

  useEffect(() => {
    loadEvents()
  }, [currentDate, viewMode])

  const loadEvents = async () => {
    try {
      setLoading(true)
      setError(null)

      // Calculate date range based on view mode
      const startDate = getViewStartDate()
      const endDate = getViewEndDate()

      const response = await calendarService.getEvents({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })

      if (response.events) {
        setEvents(response.events)
      } else {
        setError(response.error || 'Failed to load events')
      }
    } catch (err) {
      setError('Failed to load calendar events')
      console.error('Calendar load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getViewStartDate = () => {
    const date = new Date(currentDate)
    switch (viewMode) {
      case 'month':
        return new Date(date.getFullYear(), date.getMonth(), 1)
      case 'week': {
        const dayOfWeek = date.getDay()
        const startOfWeek = new Date(date)
        startOfWeek.setDate(date.getDate() - dayOfWeek)
        return startOfWeek
      }
      case 'day':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate())
    }
  }

  const getViewEndDate = () => {
    const date = new Date(currentDate)
    switch (viewMode) {
      case 'month':
        return new Date(date.getFullYear(), date.getMonth() + 1, 0)
      case 'week': {
        const dayOfWeek = date.getDay()
        const endOfWeek = new Date(date)
        endOfWeek.setDate(date.getDate() + (6 - dayOfWeek))
        return endOfWeek
      }
      case 'day':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
    }
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    
    switch (viewMode) {
      case 'month':
        newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1))
        break
      case 'week':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7))
        break
      case 'day':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1))
        break
    }
    
    setCurrentDate(newDate)
  }

  const formatDateRange = () => {
    const startDate = getViewStartDate()
    const endDate = getViewEndDate()
    
    switch (viewMode) {
      case 'month':
        return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      case 'week':
        return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      case 'day':
        return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    }
  }

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return events.filter(event => {
      const eventDate = new Date(event.start_datetime).toISOString().split('T')[0]
      return eventDate === dateStr
    })
  }

  const renderMonthView = () => {
    const startDate = getViewStartDate()
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
    const firstDayOfWeek = startDate.getDay()
    
    const days = []
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50" />)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dayEvents = getEventsForDate(date)
      const isToday = date.toDateString() === new Date().toDateString()
      
      days.push(
        <div key={day} className={`h-24 border border-gray-200 p-1 ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}>
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
            {day}
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 2).map(event => (
              <div
                key={event.id}
                className="text-xs p-1 rounded truncate"
                style={{ backgroundColor: event.color + '20', color: event.color }}
                title={event.title}
              >
                {event.title}
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500">
                +{dayEvents.length - 2} more
              </div>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-gray-100 p-2 text-center text-sm font-medium text-gray-700 border-b">
            {day}
          </div>
        ))}
        {days}
      </div>
    )
  }

  const renderEventsList = () => {
    const todaysEvents = events.filter(event => {
      const eventDate = new Date(event.start_datetime).toDateString()
      const today = new Date().toDateString()
      return eventDate === today
    })

    const upcomingEvents = events.filter(event => {
      const eventDate = new Date(event.start_datetime)
      const today = new Date()
      return eventDate > today
    }).slice(0, 5)

    return (
      <div className="space-y-6">
        {/* Today's Events */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Today's Events</h3>
          {todaysEvents.length > 0 ? (
            <div className="space-y-2">
              {todaysEvents.map(event => (
                <div key={event.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-start space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full mt-1.5"
                      style={{ backgroundColor: event.color }}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{event.title}</h4>
                      {event.description && (
                        <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(event.start_datetime).toLocaleTimeString('en-US', { 
                              hour: 'numeric', minute: '2-digit', hour12: true 
                            })}
                          </span>
                        </div>
                        {event.location && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>{event.location}</span>
                          </div>
                        )}
                        {event.attendees && event.attendees.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>{event.attendees.length} attendees</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No events scheduled for today</p>
          )}
        </div>

        {/* Upcoming Events */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Upcoming Events</h3>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-2">
              {upcomingEvents.map(event => (
                <div key={event.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-start space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full mt-1.5"
                      style={{ backgroundColor: event.color }}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{event.title}</h4>
                      <div className="text-sm text-gray-600 mt-1">
                        {new Date(event.start_datetime).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short', 
                          day: 'numeric'
                        })} at {new Date(event.start_datetime).toLocaleTimeString('en-US', { 
                          hour: 'numeric', minute: '2-digit', hour12: true 
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No upcoming events</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="h-8 w-8 text-indigo-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                Calendar
                <InfoTooltip
                  content={
                    <InfoSection
                      title="Board Calendar System"
                      description="Comprehensive scheduling and meeting management system designed for board governance and executive coordination."
                      features={[
                        "Multiple view modes: Month, Week, and Day views",
                        "Event categorization with color coding",
                        "Attendee management and notifications",
                        "Location tracking for in-person meetings",
                        "Export functionality for external calendars",
                        "Real-time synchronization across devices",
                        "Meeting statistics and analytics",
                        "Integration with board document vaults"
                      ]}
                      tips={[
                        "Use color-coded event types for quick identification",
                        "Export events to sync with your personal calendar",
                        "Set up location details for hybrid meetings",
                        "Track attendance for compliance reporting"
                      ]}
                    />
                  }
                  side="right"
                />
              </h1>
              <p className="text-gray-600">Manage your meetings and events</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                {(['month', 'week', 'day'] as const).map(mode => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode(mode)}
                    className="text-xs px-3 py-1"
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Button>
                ))}
              </div>
              <InfoTooltip
                content="Switch between Month view for overview, Week view for detailed planning, or Day view for focused scheduling."
                size="sm"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <InfoTooltip
                content="Export your calendar events to sync with external calendar applications like Outlook, Google Calendar, or Apple Calendar."
                size="sm"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Event
              </Button>
              <InfoTooltip
                content="Create new board meetings, deadlines, reminders, or personal events. All events support attendee management, location details, and integration with board documents."
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <h2 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
                {formatDateRange()}
              </h2>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="text-blue-600"
            >
              Today
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg border border-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading calendar...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="text-red-500 mb-2">⚠️ Error loading calendar</div>
              <p className="text-gray-600 text-sm">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadEvents}
                className="mt-3"
              >
                Retry
              </Button>
            </div>
          ) : viewMode === 'month' ? (
            <div className="p-4">
              {renderMonthView()}
            </div>
          ) : (
            <div className="p-4">
              {renderEventsList()}
            </div>
          )}
        </div>

        {/* Calendar Legend */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            Event Types
            <InfoTooltip
              content="Different event types are color-coded for easy identification. Board meetings (blue), personal events (green), deadlines (red), reminders (yellow), and holidays (purple)."
              size="sm"
            />
          </h3>
          <div className="flex flex-wrap gap-4">
            {Object.entries(EVENT_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm text-gray-700 capitalize">{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{events.length}</p>
                <p className="text-sm text-gray-600">Total Events</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {events.filter(e => e.event_type === 'meeting').length}
                </p>
                <p className="text-sm text-gray-600">Meetings</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {events.reduce((total, event) => total + (event.attendees?.length || 0), 0)}
                </p>
                <p className="text-sm text-gray-600">Total Attendees</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <MapPin className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {events.filter(e => e.location).length}
                </p>
                <p className="text-sm text-gray-600">In-Person Events</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadEvents}
      />
    </DashboardLayout>
  )
}