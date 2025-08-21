import { createSupabaseBrowserClient } from '@/lib/supabase'
import { Database } from '@/types/database'

type CalendarEvent = Database['public']['Tables']['calendar_events']['Row']
type CalendarEventInsert = Database['public']['Tables']['calendar_events']['Insert']
type CalendarEventUpdate = Database['public']['Tables']['calendar_events']['Update']
type CalendarView = Database['public']['Tables']['calendar_views']['Row']
type CalendarAttendee = Database['public']['Tables']['calendar_attendees']['Row']

export class CalendarService {
  private supabase = createSupabaseBrowserClient()

  // Event Management
  async getEvents(options: {
    startDate?: string
    endDate?: string
    organizationId?: string
    eventType?: string
    includeDeclined?: boolean
  } = {}) {
    const params = new URLSearchParams()
    
    if (options.startDate) params.append('start', options.startDate)
    if (options.endDate) params.append('end', options.endDate)
    if (options.organizationId) params.append('organization_id', options.organizationId)
    if (options.eventType) params.append('event_type', options.eventType)
    if (options.includeDeclined) params.append('include_declined', 'true')

    const response = await fetch(`/api/calendar/events?${params.toString()}`)
    return response.json()
  }

  async getEvent(eventId: string) {
    const response = await fetch(`/api/calendar/events/${eventId}`)
    return response.json()
  }

  async createEvent(eventData: CalendarEventInsert & {
    attendees?: Array<{ email: string; role?: string }>
    reminders?: Array<{ reminder_type: string; minutes_before: number }>
  }) {
    const response = await fetch('/api/calendar/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    })
    return response.json()
  }

  async updateEvent(eventId: string, eventData: CalendarEventUpdate) {
    const response = await fetch(`/api/calendar/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    })
    return response.json()
  }

  async deleteEvent(eventId: string, deleteRecurring = false) {
    const params = deleteRecurring ? '?delete_recurring=true' : ''
    const response = await fetch(`/api/calendar/events/${eventId}${params}`, {
      method: 'DELETE'
    })
    return response.json()
  }

  // Attendee Management
  async getAttendees(eventId: string) {
    const response = await fetch(`/api/calendar/events/${eventId}/attendees`)
    return response.json()
  }

  async addAttendee(eventId: string, attendeeData: {
    email: string
    role?: string
    can_edit?: boolean
    can_invite_others?: boolean
  }) {
    const response = await fetch(`/api/calendar/events/${eventId}/attendees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attendeeData)
    })
    return response.json()
  }

  async updateRsvp(eventId: string, rsvpData: {
    rsvp_status: 'pending' | 'accepted' | 'declined' | 'tentative'
    rsvp_note?: string
  }) {
    const response = await fetch(`/api/calendar/events/${eventId}/attendees`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rsvpData)
    })
    return response.json()
  }

  async removeAttendee(eventId: string, email: string) {
    const response = await fetch(`/api/calendar/events/${eventId}/attendees?email=${encodeURIComponent(email)}`, {
      method: 'DELETE'
    })
    return response.json()
  }

  // Calendar Views & Preferences
  async getCalendarView() {
    const response = await fetch('/api/calendar/views')
    return response.json()
  }

  async updateCalendarView(viewData: Partial<CalendarView>) {
    const response = await fetch('/api/calendar/views', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(viewData)
    })
    return response.json()
  }

  // Availability
  async checkAvailability(userIds: string[], startDatetime: string, endDatetime: string, durationMinutes = 60) {
    const params = new URLSearchParams({
      user_ids: JSON.stringify(userIds),
      start_datetime: startDatetime,
      end_datetime: endDatetime,
      duration_minutes: durationMinutes.toString()
    })

    const response = await fetch(`/api/calendar/availability?${params.toString()}`)
    return response.json()
  }

  async getMyAvailability() {
    const response = await fetch('/api/calendar/availability')
    return response.json()
  }

  async setAvailability(availabilityData: {
    day_of_week: number
    start_time: string
    end_time: string
    timezone?: string
    availability_type?: 'available' | 'busy' | 'tentative'
  }) {
    const response = await fetch('/api/calendar/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(availabilityData)
    })
    return response.json()
  }

  // Calendar Subscriptions
  async getSubscriptions(includeOwned = false) {
    const params = includeOwned ? '?include_owned=true' : ''
    const response = await fetch(`/api/calendar/subscriptions${params}`)
    return response.json()
  }

  async subscribeToCalendar(subscriptionData: {
    calendar_owner_email: string
    name: string
    description?: string
    permission_level?: 'read' | 'write' | 'admin'
    color?: string
  }) {
    const response = await fetch('/api/calendar/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscriptionData)
    })
    return response.json()
  }

  async updateSubscription(subscriptionId: string, updateData: {
    name?: string
    description?: string
    is_visible?: boolean
    color?: string
    status?: 'active' | 'paused' | 'cancelled'
  }) {
    const response = await fetch(`/api/calendar/subscriptions?id=${subscriptionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    })
    return response.json()
  }

  async unsubscribeFromCalendar(subscriptionId: string) {
    const response = await fetch(`/api/calendar/subscriptions?id=${subscriptionId}`, {
      method: 'DELETE'
    })
    return response.json()
  }

  // Export
  async exportCalendar(options: {
    startDate?: string
    endDate?: string
    eventTypes?: string[]
    organizationId?: string
    format?: 'ical' | 'json' | 'csv'
  } = {}) {
    const params = new URLSearchParams()
    
    if (options.startDate) params.append('start_date', options.startDate)
    if (options.endDate) params.append('end_date', options.endDate)
    if (options.eventTypes) params.append('event_types', options.eventTypes.join(','))
    if (options.organizationId) params.append('organization_id', options.organizationId)
    if (options.format) params.append('format', options.format)

    const response = await fetch(`/api/calendar/export?${params.toString()}`)
    
    if (options.format === 'ical' || options.format === 'csv') {
      return response.blob()
    }
    
    return response.json()
  }

  // Utility functions
  formatEventForCalendar(event: CalendarEvent & { attendees?: CalendarAttendee[] }) {
    return {
      id: event.id,
      title: event.title,
      start: event.start_datetime,
      end: event.end_datetime,
      allDay: event.all_day,
      backgroundColor: event.color,
      borderColor: event.color,
      textColor: this.getContrastColor(event.color),
      extendedProps: {
        description: event.description,
        location: event.location,
        virtual_meeting_url: event.virtual_meeting_url,
        event_type: event.event_type,
        status: event.status,
        visibility: event.visibility,
        category: event.category,
        tags: event.tags,
        attendees: event.attendees || [],
        is_recurring: event.is_recurring,
        organization_id: event.organization_id
      }
    }
  }

  private getContrastColor(hexColor: string): string {
    // Remove # if present
    const color = hexColor.replace('#', '')
    
    // Convert to RGB
    const r = parseInt(color.substr(0, 2), 16)
    const g = parseInt(color.substr(2, 2), 16)
    const b = parseInt(color.substr(4, 2), 16)
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    
    return luminance > 0.5 ? '#000000' : '#FFFFFF'
  }

  generateRecurrenceRule(pattern: {
    freq: 'daily' | 'weekly' | 'monthly' | 'yearly'
    interval?: number
    until?: string
    count?: number
    byDay?: string[]
  }) {
    return {
      freq: pattern.freq.toUpperCase(),
      interval: pattern.interval || 1,
      until: pattern.until,
      count: pattern.count,
      byday: pattern.byDay?.join(',')
    }
  }

  generateEventSuggestions(title: string): Partial<CalendarEventInsert> {
    const suggestions: Record<string, Partial<CalendarEventInsert>> = {
      'board meeting': {
        event_type: 'meeting',
        category: 'Board Meetings',
        color: '#DC2626'
      },
      'committee meeting': {
        event_type: 'meeting',
        category: 'Committee Meetings',
        color: '#059669'
      },
      'annual report': {
        event_type: 'deadline',
        category: 'Deadlines',
        color: '#DC2626'
      },
      'esg': {
        event_type: 'meeting',
        category: 'ESG',
        color: '#059669'
      },
      'compliance': {
        event_type: 'meeting',
        category: 'Compliance',
        color: '#7C3AED'
      }
    }

    const lowerTitle = title.toLowerCase()
    
    for (const [keyword, suggestion] of Object.entries(suggestions)) {
      if (lowerTitle.includes(keyword)) {
        return suggestion
      }
    }

    return {
      event_type: 'meeting',
      color: '#3B82F6'
    }
  }
}