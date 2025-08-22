import { BaseRepository } from './base.repository'
import { Result, success, failure, RepositoryError } from './result'
import { 
  UserId, 
  OrganizationId, 
  CalendarEventId,
  MeetingId,
  QueryOptions, 
  PaginatedResult,
  Priority,
  createUserId,
  createOrganizationId,
  createCalendarEventId,
  createMeetingId
} from './types'
import type { Database } from '../../types/database'

type CalendarEvent = Database['public']['Tables']['calendar_events']['Row']
type CalendarEventInsert = Database['public']['Tables']['calendar_events']['Insert']
type CalendarEventUpdate = Database['public']['Tables']['calendar_events']['Update']
type CalendarAttendee = Database['public']['Tables']['calendar_attendees']['Row']
type Meeting = Database['public']['Tables']['meetings']['Row']

export interface CalendarEventWithDetails extends CalendarEvent {
  attendees?: Array<{
    id: string
    user_id: string
    status: 'pending' | 'accepted' | 'declined' | 'tentative'
    response_at: string | null
    user: {
      id: string
      full_name: string | null
      email: string
      avatar_url: string | null
    }
  }>
  meeting?: Meeting
  organization?: {
    id: string
    name: string
    slug: string
  }
  created_by_user?: {
    id: string
    full_name: string | null
    email: string
  }
}

export interface CalendarEventFilters {
  start_date?: Date
  end_date?: Date
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  event_type?: string
  organizationId?: OrganizationId
  attendeeId?: UserId
  createdBy?: UserId
  priority?: Priority
  isRecurring?: boolean
}

export interface CalendarEventCreateData {
  title: string
  description?: string
  start_time: Date
  end_time: Date
  timezone?: string
  location?: string
  event_type: string
  organization_id?: OrganizationId
  meeting_id?: MeetingId
  priority?: Priority
  is_recurring?: boolean
  recurrence_pattern?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
    interval: number
    end_date?: Date
    days_of_week?: number[]
    day_of_month?: number
  }
  is_all_day?: boolean
  reminder_minutes?: number[]
  metadata?: Record<string, any>
  attendees?: Array<{
    user_id: UserId
    role: 'organizer' | 'required' | 'optional' | 'resource'
    notify: boolean
  }>
}

export interface AttendeeResponse {
  event_id: CalendarEventId
  user_id: UserId
  status: 'accepted' | 'declined' | 'tentative'
  notes?: string
}

export interface CalendarStats {
  totalEvents: number
  upcomingEvents: number
  completedEvents: number
  cancelledEvents: number
  byEventType: Record<string, number>
  byStatus: Record<string, number>
  averageAttendance: number
  busyHours: Record<string, number>
  meetingTrends: {
    thisWeek: number
    thisMonth: number
    avgPerWeek: number
  }
}

export interface AvailabilitySlot {
  start_time: Date
  end_time: Date
  is_available: boolean
  event_title?: string
  event_type?: string
}

export class CalendarRepository extends BaseRepository {
  protected getEntityName(): string {
    return 'CalendarEvent'
  }

  protected getSearchFields(): string[] {
    return ['title', 'description', 'location']
  }

  async findById(id: CalendarEventId): Promise<Result<CalendarEvent>> {
    const { data, error } = await this.supabase
      .from('calendar_events')
      .select('*')
      .eq('id', id)
      .single()

    return this.createResult(data, error, 'findById')
  }

  async findWithDetails(id: CalendarEventId): Promise<Result<CalendarEventWithDetails>> {
    const { data, error } = await this.supabase
      .from('calendar_events')
      .select(`
        *,
        attendees:calendar_attendees(
          id, user_id, status, response_at,
          user:users(id, full_name, email, avatar_url)
        ),
        meeting:meetings(id, title, status),
        organization:organizations(id, name, slug),
        created_by_user:users!created_by(id, full_name, email)
      `)
      .eq('id', id)
      .single()

    return this.createResult(data as CalendarEventWithDetails, error, 'findWithDetails')
  }

  async findByUser(
    userId: UserId,
    filters: CalendarEventFilters = {},
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<CalendarEventWithDetails>>> {
    let query = this.supabase
      .from('calendar_events')
      .select(`
        *,
        attendees:calendar_attendees!inner(
          id, user_id, status, response_at,
          user:users(id, full_name, email, avatar_url)
        ),
        organization:organizations(id, name, slug),
        created_by_user:users!created_by(id, full_name, email)
      `, { count: 'exact' })
      .or(`created_by.eq.${userId},attendees.user_id.eq.${userId}`)

    query = this.applyFilters(query, filters)
    query = this.applyQueryOptions(query, options)

    const { data, error, count } = await query

    return this.createPaginatedResult(data as CalendarEventWithDetails[] || [], count, options, error)
  }

  async findByOrganization(
    organizationId: OrganizationId,
    userId: UserId,
    filters: CalendarEventFilters = {},
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<CalendarEventWithDetails>>> {
    // Check user has access to organization
    const permissionCheck = await this.checkOrganizationPermission(userId, organizationId)
    if (!permissionCheck.success) {
      return permissionCheck
    }

    let query = this.supabase
      .from('calendar_events')
      .select(`
        *,
        attendees:calendar_attendees(
          id, user_id, status, response_at,
          user:users(id, full_name, email, avatar_url)
        ),
        organization:organizations(id, name, slug),
        created_by_user:users!created_by(id, full_name, email)
      `, { count: 'exact' })
      .eq('organization_id', organizationId)

    query = this.applyFilters(query, filters)
    query = this.applyQueryOptions(query, options)

    const { data, error, count } = await query

    return this.createPaginatedResult(data as CalendarEventWithDetails[] || [], count, options, error)
  }

  async findUpcoming(
    userId: UserId,
    daysAhead: number = 30,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResult<CalendarEventWithDetails>>> {
    const now = new Date()
    const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

    let query = this.supabase
      .from('calendar_events')
      .select(`
        *,
        attendees:calendar_attendees!inner(
          id, user_id, status, response_at,
          user:users(id, full_name, email, avatar_url)
        ),
        organization:organizations(id, name, slug)
      `, { count: 'exact' })
      .or(`created_by.eq.${userId},attendees.user_id.eq.${userId}`)
      .gte('start_time', now.toISOString())
      .lte('start_time', future.toISOString())
      .eq('status', 'scheduled')
      .order('start_time', { ascending: true })

    query = this.applyQueryOptions(query, options)

    const { data, error, count } = await query

    return this.createPaginatedResult(data as CalendarEventWithDetails[] || [], count, options, error)
  }

  async create(
    eventData: CalendarEventCreateData,
    createdBy: UserId
  ): Promise<Result<CalendarEvent>> {
    // Validate required fields
    const validation = this.validateRequired(eventData, [
      'title', 'start_time', 'end_time', 'event_type'
    ])
    if (!validation.success) {
      return validation
    }

    // Validate time range
    if (eventData.start_time >= eventData.end_time) {
      return failure(RepositoryError.validation('End time must be after start time'))
    }

    return await this.transaction(async (client) => {
      // Create the event
      const insertData: CalendarEventInsert = {
        title: eventData.title,
        description: eventData.description,
        start_time: eventData.start_time.toISOString(),
        end_time: eventData.end_time.toISOString(),
        timezone: eventData.timezone || 'UTC',
        location: eventData.location,
        event_type: eventData.event_type,
        organization_id: eventData.organization_id,
        meeting_id: eventData.meeting_id,
        created_by: createdBy,
        priority: eventData.priority || 'medium',
        is_recurring: eventData.is_recurring || false,
        recurrence_pattern: eventData.recurrence_pattern,
        is_all_day: eventData.is_all_day || false,
        reminder_minutes: eventData.reminder_minutes || [15],
        status: 'scheduled',
        metadata: eventData.metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: event, error: eventError } = await client
        .from('calendar_events')
        .insert(insertData)
        .select()
        .single()

      if (eventError || !event) {
        throw RepositoryError.fromSupabaseError(eventError, 'create event')
      }

      // Add attendees
      if (eventData.attendees && eventData.attendees.length > 0) {
        const attendeeInserts = eventData.attendees.map(attendee => ({
          event_id: event.id,
          user_id: attendee.user_id,
          role: attendee.role,
          status: attendee.user_id === createdBy ? 'accepted' : 'pending',
          notify_user: attendee.notify,
          created_at: new Date().toISOString()
        }))

        const { error: attendeeError } = await client
          .from('calendar_attendees')
          .insert(attendeeInserts)

        if (attendeeError) {
          throw RepositoryError.fromSupabaseError(attendeeError, 'add attendees')
        }
      }

      // Log event creation
      await this.logActivity({
        user_id: createdBy,
        organization_id: eventData.organization_id,
        event_type: 'calendar_management',
        event_category: 'event_lifecycle',
        action: 'create',
        resource_type: 'calendar_event',
        resource_id: event.id,
        event_description: `Calendar event created: ${event.title}`,
        outcome: 'success',
        severity: 'low',
        details: {
          event_type: event.event_type,
          start_time: event.start_time,
          attendee_count: eventData.attendees?.length || 0
        }
      })

      return event
    })
  }

  async update(
    id: CalendarEventId,
    updates: Partial<CalendarEventCreateData>,
    updatedBy: UserId
  ): Promise<Result<CalendarEvent>> {
    // Validate time range if both times are being updated
    if (updates.start_time && updates.end_time && updates.start_time >= updates.end_time) {
      return failure(RepositoryError.validation('End time must be after start time'))
    }

    const updateData: CalendarEventUpdate = {
      ...updates,
      start_time: updates.start_time?.toISOString(),
      end_time: updates.end_time?.toISOString(),
      updated_at: new Date().toISOString()
    }

    // Remove attendees from update data as they're handled separately
    delete (updateData as any).attendees

    const { data, error } = await this.supabase
      .from('calendar_events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    const result = this.createResult(data, error, 'update')
    
    if (result.success && data) {
      await this.logActivity({
        user_id: updatedBy,
        organization_id: data.organization_id ? createOrganizationId(data.organization_id) : undefined,
        event_type: 'calendar_management',
        event_category: 'event_lifecycle',
        action: 'update',
        resource_type: 'calendar_event',
        resource_id: data.id,
        event_description: `Calendar event updated: ${data.title}`,
        outcome: 'success',
        severity: 'low',
        details: Object.keys(updates)
      })
    }

    return result
  }

  async cancel(id: CalendarEventId, cancelledBy: UserId, reason?: string): Promise<Result<CalendarEvent>> {
    const { data, error } = await this.supabase
      .from('calendar_events')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        cancelled_by: cancelledBy,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    const result = this.createResult(data, error, 'cancel')
    
    if (result.success && data) {
      await this.logActivity({
        user_id: cancelledBy,
        organization_id: data.organization_id ? createOrganizationId(data.organization_id) : undefined,
        event_type: 'calendar_management',
        event_category: 'event_lifecycle',
        action: 'cancel',
        resource_type: 'calendar_event',
        resource_id: data.id,
        event_description: `Calendar event cancelled: ${data.title}`,
        outcome: 'success',
        severity: 'low',
        details: { reason }
      })
    }

    return result
  }

  async delete(id: CalendarEventId, deletedBy: UserId): Promise<Result<void>> {
    // First get event details for logging
    const eventResult = await this.findById(id)
    if (!eventResult.success) {
      return eventResult
    }

    const { error } = await this.supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'delete'))
    }

    await this.logActivity({
      user_id: deletedBy,
      organization_id: eventResult.data.organization_id ? createOrganizationId(eventResult.data.organization_id) : undefined,
      event_type: 'calendar_management',
      event_category: 'event_lifecycle',
      action: 'delete',
      resource_type: 'calendar_event',
      resource_id: id,
      event_description: `Calendar event deleted: ${eventResult.data.title}`,
      outcome: 'success',
      severity: 'medium'
    })

    return success(undefined)
  }

  async respondToEvent(response: AttendeeResponse): Promise<Result<CalendarAttendee>> {
    const { data, error } = await this.supabase
      .from('calendar_attendees')
      .update({
        status: response.status,
        response_at: new Date().toISOString(),
        response_notes: response.notes,
        updated_at: new Date().toISOString()
      })
      .eq('event_id', response.event_id)
      .eq('user_id', response.user_id)
      .select()
      .single()

    const result = this.createResult(data, error, 'respondToEvent')
    
    if (result.success && data) {
      await this.logActivity({
        user_id: response.user_id,
        event_type: 'calendar_management',
        event_category: 'event_response',
        action: 'respond',
        resource_type: 'calendar_event',
        resource_id: response.event_id,
        event_description: `Responded to event: ${response.status}`,
        outcome: 'success',
        severity: 'low'
      })
    }

    return result
  }

  async getAvailability(
    userId: UserId,
    startDate: Date,
    endDate: Date,
    slotDurationMinutes: number = 30
  ): Promise<Result<AvailabilitySlot[]>> {
    const { data: events, error } = await this.supabase
      .from('calendar_events')
      .select('title, start_time, end_time, event_type')
      .or(`created_by.eq.${userId},calendar_attendees.user_id.eq.${userId}`)
      .gte('start_time', startDate.toISOString())
      .lte('end_time', endDate.toISOString())
      .eq('status', 'scheduled')
      .order('start_time', { ascending: true })

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'getAvailability'))
    }

    const slots: AvailabilitySlot[] = []
    const current = new Date(startDate)
    
    while (current < endDate) {
      const slotStart = new Date(current)
      const slotEnd = new Date(current.getTime() + slotDurationMinutes * 60 * 1000)
      
      // Check if this slot conflicts with any events
      const conflictingEvent = events?.find(event => {
        const eventStart = new Date(event.start_time)
        const eventEnd = new Date(event.end_time)
        return (slotStart < eventEnd && slotEnd > eventStart)
      })

      slots.push({
        start_time: slotStart,
        end_time: slotEnd,
        is_available: !conflictingEvent,
        event_title: conflictingEvent?.title,
        event_type: conflictingEvent?.event_type
      })

      current.setTime(current.getTime() + slotDurationMinutes * 60 * 1000)
    }

    return success(slots)
  }

  async getStats(
    userId?: UserId,
    organizationId?: OrganizationId,
    dateRange?: { start: Date; end: Date }
  ): Promise<Result<CalendarStats>> {
    let query = this.supabase
      .from('calendar_events')
      .select('id, event_type, status, start_time, created_at')

    if (userId) {
      query = query.or(`created_by.eq.${userId},calendar_attendees.user_id.eq.${userId}`)
    }
    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }
    if (dateRange) {
      query = query
        .gte('start_time', dateRange.start.toISOString())
        .lte('start_time', dateRange.end.toISOString())
    }

    const { data: events, error } = await query

    if (error) {
      return failure(RepositoryError.fromSupabaseError(error, 'getStats'))
    }

    const stats: CalendarStats = {
      totalEvents: events?.length || 0,
      upcomingEvents: 0,
      completedEvents: 0,
      cancelledEvents: 0,
      byEventType: {},
      byStatus: {},
      averageAttendance: 0, // TODO: calculate from attendees
      busyHours: {},
      meetingTrends: {
        thisWeek: 0,
        thisMonth: 0,
        avgPerWeek: 0
      }
    }

    if (events) {
      const now = new Date()
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      events.forEach(event => {
        // Count by status
        stats.byStatus[event.status] = (stats.byStatus[event.status] || 0) + 1
        if (event.status === 'scheduled' && new Date(event.start_time) > now) {
          stats.upcomingEvents++
        } else if (event.status === 'completed') {
          stats.completedEvents++
        } else if (event.status === 'cancelled') {
          stats.cancelledEvents++
        }

        // Count by event type
        stats.byEventType[event.event_type] = (stats.byEventType[event.event_type] || 0) + 1

        // Count meeting trends
        const createdAt = new Date(event.created_at)
        if (createdAt >= thisWeek) stats.meetingTrends.thisWeek++
        if (createdAt >= thisMonth) stats.meetingTrends.thisMonth++

        // Track busy hours
        const hour = new Date(event.start_time).getHours()
        stats.busyHours[hour] = (stats.busyHours[hour] || 0) + 1
      })

      // Calculate average meetings per week
      const weeksInRange = dateRange 
        ? Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (7 * 24 * 60 * 60 * 1000))
        : 4 // Default to 4 weeks
      stats.meetingTrends.avgPerWeek = events.length / weeksInRange
    }

    return success(stats)
  }

  private applyFilters(query: any, filters: CalendarEventFilters): any {
    if (filters.start_date) {
      query = query.gte('start_time', filters.start_date.toISOString())
    }
    if (filters.end_date) {
      query = query.lte('end_time', filters.end_date.toISOString())
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.event_type) {
      query = query.eq('event_type', filters.event_type)
    }
    if (filters.organizationId) {
      query = query.eq('organization_id', filters.organizationId)
    }
    if (filters.createdBy) {
      query = query.eq('created_by', filters.createdBy)
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority)
    }
    if (filters.isRecurring !== undefined) {
      query = query.eq('is_recurring', filters.isRecurring)
    }

    return query
  }
}