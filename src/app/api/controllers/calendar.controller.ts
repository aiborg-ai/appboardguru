/**
 * Calendar Controller
 * Consolidated controller for all calendar and event management features
 * Following enterprise architecture with Repository Pattern and Result<T> types
 * 
 * Consolidates 8 calendar API routes into a single controller:
 * - Calendar events CRUD operations
 * - Event attendee management
 * - Calendar views and subscriptions
 * - Availability scheduling
 * - Calendar export functionality
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { CalendarRepository } from '@/lib/repositories/calendar.repository'
import { CalendarService } from '@/lib/services/calendar.service'
import { NotificationService } from '@/lib/services/notification.service'
import { RepositoryFactory } from '@/lib/repositories'
import { Result } from '@/lib/repositories/result'
import { createUserId, createOrganizationId, createMeetingId } from '@/lib/utils/branded-type-helpers'
import { logError, logActivity } from '@/lib/utils/logging'
import { validateRequest } from '@/lib/utils/validation'
import { withAuth } from '@/lib/middleware/auth'
import { withRateLimit } from '@/lib/middleware/rate-limit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Calendar Event Types
export interface CalendarEvent {
  id?: string
  title: string
  description?: string
  startTime: string // ISO 8601
  endTime: string   // ISO 8601
  timezone: string
  location?: string
  meetingType: 'board_meeting' | 'committee_meeting' | 'general_meeting' | 'conference_call' | 'workshop' | 'other'
  organizationId?: string
  isRecurring?: boolean
  recurrenceRule?: string // RRULE format
  attendees: Array<{
    email: string
    name?: string
    role?: 'organizer' | 'required' | 'optional'
    status?: 'pending' | 'accepted' | 'declined' | 'tentative'
  }>
  metadata?: {
    agendaId?: string
    boardId?: string
    committeeId?: string
    documentIds?: string[]
    tags?: string[]
    priority?: 'low' | 'medium' | 'high' | 'urgent'
  }
  visibility: 'public' | 'private' | 'organization'
  reminderSettings?: {
    emailReminders: number[] // minutes before event
    inAppReminders: number[] // minutes before event
  }
}

interface CalendarAvailabilityRequest {
  organizationId?: string
  userIds: string[]
  startDate: string
  endDate: string
  duration: number // minutes
  workingHours?: {
    start: string // HH:MM format
    end: string   // HH:MM format
    timezone: string
    workDays: number[] // 0-6 (Sunday-Saturday)
  }
  excludeEventTypes?: string[]
}

interface CalendarExportRequest {
  format: 'ics' | 'csv' | 'pdf'
  dateRange: {
    start: string
    end: string
  }
  organizationId?: string
  eventTypes?: string[]
  includePrivateEvents?: boolean
}

// Validation Schemas
const calendarEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  startTime: z.string().datetime('Invalid start time format'),
  endTime: z.string().datetime('Invalid end time format'),
  timezone: z.string().min(1, 'Timezone is required'),
  location: z.string().max(300, 'Location too long').optional(),
  meetingType: z.enum(['board_meeting', 'committee_meeting', 'general_meeting', 'conference_call', 'workshop', 'other']),
  organizationId: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().optional(),
  attendees: z.array(z.object({
    email: z.string().email('Invalid email format'),
    name: z.string().optional(),
    role: z.enum(['organizer', 'required', 'optional']).optional(),
    status: z.enum(['pending', 'accepted', 'declined', 'tentative']).optional()
  })),
  metadata: z.object({
    agendaId: z.string().optional(),
    boardId: z.string().optional(),
    committeeId: z.string().optional(),
    documentIds: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional()
  }).optional(),
  visibility: z.enum(['public', 'private', 'organization']),
  reminderSettings: z.object({
    emailReminders: z.array(z.number()),
    inAppReminders: z.array(z.number())
  }).optional()
}).refine(data => new Date(data.startTime) < new Date(data.endTime), {
  message: 'End time must be after start time',
  path: ['endTime']
})

const availabilitySchema = z.object({
  organizationId: z.string().optional(),
  userIds: z.array(z.string()),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  duration: z.number().min(15).max(480), // 15 minutes to 8 hours
  workingHours: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
    end: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
    timezone: z.string(),
    workDays: z.array(z.number().min(0).max(6))
  }).optional(),
  excludeEventTypes: z.array(z.string()).optional()
})

const exportSchema = z.object({
  format: z.enum(['ics', 'csv', 'pdf']),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  organizationId: z.string().optional(),
  eventTypes: z.array(z.string()).optional(),
  includePrivateEvents: z.boolean().optional()
})

const attendeeUpdateSchema = z.object({
  attendees: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional(),
    role: z.enum(['organizer', 'required', 'optional']).optional(),
    status: z.enum(['pending', 'accepted', 'declined', 'tentative']).optional()
  }))
})

export class CalendarController {
  private calendarService: CalendarService
  private notificationService: NotificationService
  private repositoryFactory: RepositoryFactory

  constructor() {
    this.repositoryFactory = new RepositoryFactory(this.createSupabaseClient())
    this.calendarService = new CalendarService(this.repositoryFactory)
    this.notificationService = new NotificationService(this.repositoryFactory)
  }

  private createSupabaseClient() {
    const cookieStore = cookies()
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )
  }

  /**
   * GET /api/calendar/events
   * Retrieve calendar events with filtering and pagination
   */
  async getEvents(request: NextRequest): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const url = new URL(request.url)
      const startDate = url.searchParams.get('startDate')
      const endDate = url.searchParams.get('endDate')
      const organizationId = url.searchParams.get('organizationId')
      const meetingType = url.searchParams.get('meetingType')
      const limit = parseInt(url.searchParams.get('limit') || '50')
      const offset = parseInt(url.searchParams.get('offset') || '0')

      const eventsResult = await this.calendarService.getEvents({
        userId: createUserId(user.id),
        organizationId: organizationId ? createOrganizationId(organizationId) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        meetingType: meetingType as CalendarEvent['meetingType'] || undefined,
        limit,
        offset
      })

      if (!eventsResult.success) {
        return NextResponse.json(
          { success: false, error: eventsResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: eventsResult.data
      })

    } catch (error) {
      logError('Calendar events retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Events retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/calendar/events
   * Create a new calendar event
   */
  async createEvent(request: NextRequest): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, calendarEventSchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const eventData = validation.data as CalendarEvent

      // Create calendar event
      const eventResult = await this.calendarService.createEvent({
        ...eventData,
        organizationId: eventData.organizationId ? createOrganizationId(eventData.organizationId) : undefined,
        createdBy: createUserId(user.id)
      })

      if (!eventResult.success) {
        return NextResponse.json(
          { success: false, error: eventResult.error },
          { status: 500 }
        )
      }

      // Send invitations to attendees
      if (eventData.attendees.length > 0) {
        await this.notificationService.sendMeetingInvitations({
          eventId: eventResult.data.id,
          organizer: {
            email: user.email!,
            name: user.user_metadata?.name || user.email
          },
          attendees: eventData.attendees,
          eventDetails: eventData
        })
      }

      // Log event creation
      await logActivity({
        userId: user.id,
        action: 'calendar_event_created',
        details: {
          eventId: eventResult.data.id,
          meetingType: eventData.meetingType,
          attendeesCount: eventData.attendees.length,
          isRecurring: eventData.isRecurring || false
        }
      })

      return NextResponse.json({
        success: true,
        data: eventResult.data
      }, { status: 201 })

    } catch (error) {
      logError('Calendar event creation failed', error)
      return NextResponse.json(
        { success: false, error: 'Event creation failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/calendar/events/[id]
   * Get a specific calendar event
   */
  async getEvent(request: NextRequest, eventId: string): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const eventResult = await this.calendarService.getEventById({
        eventId: createMeetingId(eventId),
        userId: createUserId(user.id)
      })

      if (!eventResult.success) {
        return NextResponse.json(
          { success: false, error: eventResult.error },
          { status: eventResult.error === 'Event not found' ? 404 : 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: eventResult.data
      })

    } catch (error) {
      logError('Calendar event retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Event retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * PUT /api/calendar/events/[id]
   * Update a calendar event
   */
  async updateEvent(request: NextRequest, eventId: string): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, calendarEventSchema.partial())
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const updateData = validation.data

      const eventResult = await this.calendarService.updateEvent({
        eventId: createMeetingId(eventId),
        userId: createUserId(user.id),
        updateData: {
          ...updateData,
          organizationId: updateData.organizationId ? createOrganizationId(updateData.organizationId) : undefined
        }
      })

      if (!eventResult.success) {
        return NextResponse.json(
          { success: false, error: eventResult.error },
          { status: eventResult.error === 'Event not found' ? 404 : 500 }
        )
      }

      // Send update notifications if attendees were modified
      if (updateData.attendees) {
        await this.notificationService.sendMeetingUpdates({
          eventId,
          organizer: {
            email: user.email!,
            name: user.user_metadata?.name || user.email
          },
          changes: updateData
        })
      }

      // Log event update
      await logActivity({
        userId: user.id,
        action: 'calendar_event_updated',
        details: {
          eventId,
          changesCount: Object.keys(updateData).length
        }
      })

      return NextResponse.json({
        success: true,
        data: eventResult.data
      })

    } catch (error) {
      logError('Calendar event update failed', error)
      return NextResponse.json(
        { success: false, error: 'Event update failed' },
        { status: 500 }
      )
    }
  }

  /**
   * DELETE /api/calendar/events/[id]
   * Delete a calendar event
   */
  async deleteEvent(request: NextRequest, eventId: string): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const deleteResult = await this.calendarService.deleteEvent({
        eventId: createMeetingId(eventId),
        userId: createUserId(user.id)
      })

      if (!deleteResult.success) {
        return NextResponse.json(
          { success: false, error: deleteResult.error },
          { status: deleteResult.error === 'Event not found' ? 404 : 500 }
        )
      }

      // Send cancellation notifications
      await this.notificationService.sendMeetingCancellation({
        eventId,
        organizer: {
          email: user.email!,
          name: user.user_metadata?.name || user.email
        }
      })

      // Log event deletion
      await logActivity({
        userId: user.id,
        action: 'calendar_event_deleted',
        details: {
          eventId
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Event deleted successfully'
      })

    } catch (error) {
      logError('Calendar event deletion failed', error)
      return NextResponse.json(
        { success: false, error: 'Event deletion failed' },
        { status: 500 }
      )
    }
  }

  /**
   * PUT /api/calendar/events/[id]/attendees
   * Update event attendees
   */
  async updateAttendees(request: NextRequest, eventId: string): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, attendeeUpdateSchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const { attendees } = validation.data

      const attendeeResult = await this.calendarService.updateEventAttendees({
        eventId: createMeetingId(eventId),
        userId: createUserId(user.id),
        attendees
      })

      if (!attendeeResult.success) {
        return NextResponse.json(
          { success: false, error: attendeeResult.error },
          { status: attendeeResult.error === 'Event not found' ? 404 : 500 }
        )
      }

      // Send notifications to new attendees
      const newAttendees = attendees.filter(a => a.status === 'pending')
      if (newAttendees.length > 0) {
        await this.notificationService.sendMeetingInvitations({
          eventId,
          organizer: {
            email: user.email!,
            name: user.user_metadata?.name || user.email
          },
          attendees: newAttendees,
          isUpdate: true
        })
      }

      // Log attendee update
      await logActivity({
        userId: user.id,
        action: 'calendar_attendees_updated',
        details: {
          eventId,
          totalAttendees: attendees.length,
          newAttendees: newAttendees.length
        }
      })

      return NextResponse.json({
        success: true,
        data: attendeeResult.data
      })

    } catch (error) {
      logError('Calendar attendee update failed', error)
      return NextResponse.json(
        { success: false, error: 'Attendee update failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/calendar/availability
   * Find available time slots for scheduling
   */
  async checkAvailability(request: NextRequest): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, availabilitySchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const availabilityData = validation.data

      const availabilityResult = await this.calendarService.findAvailableSlots({
        organizationId: availabilityData.organizationId ? createOrganizationId(availabilityData.organizationId) : undefined,
        userIds: availabilityData.userIds.map(id => createUserId(id)),
        startDate: availabilityData.startDate,
        endDate: availabilityData.endDate,
        duration: availabilityData.duration,
        workingHours: availabilityData.workingHours,
        excludeEventTypes: availabilityData.excludeEventTypes,
        requestingUserId: createUserId(user.id)
      })

      if (!availabilityResult.success) {
        return NextResponse.json(
          { success: false, error: availabilityResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: availabilityResult.data
      })

    } catch (error) {
      logError('Calendar availability check failed', error)
      return NextResponse.json(
        { success: false, error: 'Availability check failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/calendar/export
   * Export calendar events in various formats
   */
  async exportEvents(request: NextRequest): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, exportSchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const exportData = validation.data

      const exportResult = await this.calendarService.exportEvents({
        userId: createUserId(user.id),
        organizationId: exportData.organizationId ? createOrganizationId(exportData.organizationId) : undefined,
        format: exportData.format,
        dateRange: exportData.dateRange,
        eventTypes: exportData.eventTypes,
        includePrivateEvents: exportData.includePrivateEvents || false
      })

      if (!exportResult.success) {
        return NextResponse.json(
          { success: false, error: exportResult.error },
          { status: 500 }
        )
      }

      // Set appropriate content type based on format
      const contentTypes = {
        ics: 'text/calendar',
        csv: 'text/csv',
        pdf: 'application/pdf'
      }

      // Log export activity
      await logActivity({
        userId: user.id,
        action: 'calendar_export',
        details: {
          format: exportData.format,
          dateRange: exportData.dateRange,
          eventsCount: exportResult.data.eventsCount
        }
      })

      return new Response(exportResult.data.content, {
        status: 200,
        headers: {
          'Content-Type': contentTypes[exportData.format],
          'Content-Disposition': `attachment; filename="calendar_export.${exportData.format}"`,
          'Cache-Control': 'no-store'
        }
      })

    } catch (error) {
      logError('Calendar export failed', error)
      return NextResponse.json(
        { success: false, error: 'Export failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/calendar/views
   * Get calendar view configurations
   */
  async getViews(request: NextRequest): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const url = new URL(request.url)
      const organizationId = url.searchParams.get('organizationId')

      const viewsResult = await this.calendarService.getCalendarViews({
        userId: createUserId(user.id),
        organizationId: organizationId ? createOrganizationId(organizationId) : undefined
      })

      if (!viewsResult.success) {
        return NextResponse.json(
          { success: false, error: viewsResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: viewsResult.data
      })

    } catch (error) {
      logError('Calendar views retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Views retrieval failed' },
        { status: 500 }
      )
    }
  }

  private async getCurrentUser() {
    try {
      const supabase = this.createSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      return user
    } catch (error) {
      logError('Failed to get current user', error)
      return null
    }
  }
}

// Export controller instance
export const calendarController = new CalendarController()

// Route handlers for different HTTP methods and endpoints
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting
  const rateLimitResult = await withRateLimit(request, {
    limit: 200, // 200 requests per minute for GET operations
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  if (pathname.includes('/views')) {
    return await calendarController.getViews(request)
  } else if (pathname.includes('/events/')) {
    const eventId = pathname.split('/events/')[1]?.split('/')[0]
    if (eventId) {
      return await calendarController.getEvent(request, eventId)
    }
  } else if (pathname.includes('/events')) {
    return await calendarController.getEvents(request)
  }
  
  return NextResponse.json(
    { success: false, error: 'Endpoint not found' },
    { status: 404 }
  )
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting with lower limits for POST operations
  const rateLimitResult = await withRateLimit(request, {
    limit: 50, // 50 requests per minute for write operations
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  if (pathname.includes('/availability')) {
    return await calendarController.checkAvailability(request)
  } else if (pathname.includes('/export')) {
    return await calendarController.exportEvents(request)
  } else if (pathname.includes('/events')) {
    return await calendarController.createEvent(request)
  }
  
  return NextResponse.json(
    { success: false, error: 'Endpoint not found' },
    { status: 404 }
  )
}

export async function PUT(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting for PUT operations
  const rateLimitResult = await withRateLimit(request, {
    limit: 50,
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const eventId = pathname.split('/events/')[1]?.split('/')[0]
  
  if (!eventId) {
    return NextResponse.json(
      { success: false, error: 'Event ID required' },
      { status: 400 }
    )
  }

  if (pathname.includes('/attendees')) {
    return await calendarController.updateAttendees(request, eventId)
  } else {
    return await calendarController.updateEvent(request, eventId)
  }
}

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting for DELETE operations
  const rateLimitResult = await withRateLimit(request, {
    limit: 30,
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const eventId = pathname.split('/events/')[1]?.split('/')[0]
  
  if (!eventId) {
    return NextResponse.json(
      { success: false, error: 'Event ID required' },
      { status: 400 }
    )
  }

  return await calendarController.deleteEvent(request, eventId)
}