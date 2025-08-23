import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { CalendarService } from '../../lib/services/calendar.service'
import { BaseService } from '../../lib/services/base.service'
import { success, failure, RepositoryError } from '../../lib/repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

// Mock dependencies
vi.mock('../../lib/services/base.service')
vi.mock('../../lib/repositories/calendar.repository')

const mockSupabaseClient = {
  from: vi.fn(),
  auth: { getUser: vi.fn() }
} as unknown as SupabaseClient<Database>

const mockCalendarRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findWithDetails: vi.fn(),
  findByUser: vi.fn(),
  findByOrganization: vi.fn(),
  findUpcoming: vi.fn(),
  update: vi.fn(),
  cancel: vi.fn(),
  delete: vi.fn(),
  findConflicting: vi.fn(),
  findByDateRange: vi.fn(),
  bulkCreate: vi.fn()
}

const mockUserRepository = {
  findById: vi.fn(),
  findByIds: vi.fn()
}

const mockNotificationRepository = {
  create: vi.fn(),
  bulkCreate: vi.fn()
}

const mockAuditRepository = {
  create: vi.fn()
}

describe('CalendarService', () => {
  let calendarService: CalendarService

  beforeEach(() => {
    vi.clearAllMocks()
    
    vi.mocked(BaseService).mockImplementation(() => ({
      supabase: mockSupabaseClient,
      repositories: {
        calendar: mockCalendarRepository,
        users: mockUserRepository,
        notifications: mockNotificationRepository,
        audit: mockAuditRepository
      },
      logActivity: vi.fn(),
      validateRequired: vi.fn()
    } as any))

    calendarService = new CalendarService(mockSupabaseClient)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('createEvent', () => {
    it('should create event successfully without conflicts', async () => {
      const eventData = {
        title: 'Board Meeting',
        description: 'Monthly board meeting',
        start_time: new Date('2024-06-15T10:00:00Z'),
        end_time: new Date('2024-06-15T12:00:00Z'),
        location: 'Conference Room A',
        event_type: 'meeting' as const,
        organization_id: 'org_123',
        created_by: 'user_123',
        attendees: ['user_456', 'user_789'],
        is_recurring: false
      }

      const createdEvent = {
        id: 'event_123',
        ...eventData,
        status: 'confirmed' as const,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      }

      // Mock no conflicts found
      mockCalendarRepository.findConflicting.mockResolvedValue(success([]))
      mockCalendarRepository.create.mockResolvedValue(success(createdEvent))
      mockNotificationRepository.bulkCreate.mockResolvedValue(success([]))
      mockAuditRepository.create.mockResolvedValue(success({}))

      const result = await calendarService.createEvent(eventData)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        title: 'Board Meeting',
        event_type: 'meeting',
        status: 'confirmed'
      })
      expect(mockCalendarRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Board Meeting',
          status: 'confirmed'
        })
      )
    })

    it('should handle scheduling conflicts with appropriate severity', async () => {
      const eventData = {
        title: 'Conflicting Meeting',
        start_time: new Date('2024-06-15T10:00:00Z'),
        end_time: new Date('2024-06-15T12:00:00Z'),
        organization_id: 'org_123',
        created_by: 'user_123',
        attendees: ['user_456'],
        event_type: 'meeting' as const,
        is_recurring: false
      }

      const conflictingEvents = [
        {
          id: 'existing_event',
          title: 'Important Meeting',
          start_time: new Date('2024-06-15T10:30:00Z'),
          end_time: new Date('2024-06-15T11:30:00Z'),
          attendees: ['user_456'],
          priority: 'high'
        }
      ]

      mockCalendarRepository.findConflicting.mockResolvedValue(success(conflictingEvents))

      const result = await calendarService.createEvent(eventData)

      expect(result.success).toBe(false)
      expect(result.error.type).toBe('business_rule')
      expect(result.error.message).toContain('scheduling conflicts')
      expect(result.error.context?.conflicts).toHaveLength(1)
      expect(result.error.context?.severity).toBe('high')
    })

    it('should create recurring events successfully', async () => {
      const recurringEventData = {
        title: 'Weekly Team Sync',
        start_time: new Date('2024-06-15T09:00:00Z'),
        end_time: new Date('2024-06-15T10:00:00Z'),
        organization_id: 'org_123',
        created_by: 'user_123',
        attendees: ['user_456', 'user_789'],
        event_type: 'meeting' as const,
        is_recurring: true,
        recurrence_pattern: {
          type: 'weekly' as const,
          interval: 1,
          days_of_week: [1], // Monday
          end_date: new Date('2024-12-31T23:59:59Z')
        }
      }

      const generatedEvents = [
        { id: 'event_1', title: 'Weekly Team Sync', start_time: new Date('2024-06-15T09:00:00Z') },
        { id: 'event_2', title: 'Weekly Team Sync', start_time: new Date('2024-06-22T09:00:00Z') },
        { id: 'event_3', title: 'Weekly Team Sync', start_time: new Date('2024-06-29T09:00:00Z') }
      ]

      mockCalendarRepository.findConflicting.mockResolvedValue(success([]))
      mockCalendarRepository.bulkCreate.mockResolvedValue(success(generatedEvents))

      const result = await calendarService.scheduleRecurringEvent(recurringEventData)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(3)
      expect(mockCalendarRepository.bulkCreate).toHaveBeenCalled()
    })

    it('should validate event data thoroughly', async () => {
      const invalidEventData = {
        title: '', // Empty title
        start_time: new Date('2024-06-15T12:00:00Z'),
        end_time: new Date('2024-06-15T10:00:00Z'), // End before start
        organization_id: 'invalid-org-id', // Invalid format
        created_by: '',
        attendees: [],
        event_type: 'invalid_type' as any,
        is_recurring: false
      }

      const result = await calendarService.createEvent(invalidEventData)

      expect(result.success).toBe(false)
      expect(result.error.type).toBe('validation')
    })
  })

  describe('getEvent', () => {
    it('should get event with full details', async () => {
      const eventId = 'event_123'
      const mockEventWithDetails = {
        id: eventId,
        title: 'Board Meeting',
        start_time: new Date('2024-06-15T10:00:00Z'),
        attendees: [
          {
            user_id: 'user_456',
            status: 'accepted',
            user: {
              id: 'user_456',
              full_name: 'Jane Doe',
              email: 'jane@example.com'
            }
          }
        ],
        organization: {
          id: 'org_123',
          name: 'ACME Corp'
        }
      }

      mockCalendarRepository.findWithDetails.mockResolvedValue(success(mockEventWithDetails))

      const result = await calendarService.getEvent(eventId)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: eventId,
        title: 'Board Meeting'
      })
      expect(result.data.attendees).toHaveLength(1)
      expect(result.data.attendees[0].user.full_name).toBe('Jane Doe')
    })

    it('should handle event not found', async () => {
      const eventId = 'nonexistent'
      
      mockCalendarRepository.findWithDetails.mockResolvedValue(success(null))

      const result = await calendarService.getEvent(eventId)

      expect(result.success).toBe(false)
      expect(result.error.type).toBe('not_found')
    })
  })

  describe('updateEvent', () => {
    it('should update event and check for new conflicts', async () => {
      const eventId = 'event_123'
      const updateData = {
        title: 'Updated Board Meeting',
        start_time: new Date('2024-06-15T11:00:00Z'), // New time
        end_time: new Date('2024-06-15T13:00:00Z')
      }

      const existingEvent = {
        id: eventId,
        title: 'Board Meeting',
        start_time: new Date('2024-06-15T10:00:00Z'),
        end_time: new Date('2024-06-15T12:00:00Z'),
        attendees: ['user_456']
      }

      const updatedEvent = {
        ...existingEvent,
        ...updateData,
        updated_at: '2024-01-02T10:00:00Z'
      }

      mockCalendarRepository.findById.mockResolvedValue(success(existingEvent))
      mockCalendarRepository.findConflicting.mockResolvedValue(success([])) // No conflicts
      mockCalendarRepository.update.mockResolvedValue(success(updatedEvent))
      mockAuditRepository.create.mockResolvedValue(success({}))

      const result = await calendarService.updateEvent(eventId, updateData)

      expect(result.success).toBe(true)
      expect(result.data.title).toBe('Updated Board Meeting')
      expect(mockCalendarRepository.update).toHaveBeenCalledWith(eventId, updateData)
    })

    it('should prevent updates that create conflicts', async () => {
      const eventId = 'event_123'
      const updateData = {
        start_time: new Date('2024-06-15T14:00:00Z'),
        end_time: new Date('2024-06-15T16:00:00Z')
      }

      const existingEvent = { id: eventId, attendees: ['user_456'] }
      const conflictingEvents = [
        {
          id: 'other_event',
          title: 'Conflicting Event',
          start_time: new Date('2024-06-15T15:00:00Z')
        }
      ]

      mockCalendarRepository.findById.mockResolvedValue(success(existingEvent))
      mockCalendarRepository.findConflicting.mockResolvedValue(success(conflictingEvents))

      const result = await calendarService.updateEvent(eventId, updateData)

      expect(result.success).toBe(false)
      expect(result.error.type).toBe('business_rule')
      expect(result.error.message).toContain('conflicts')
    })
  })

  describe('deleteEvent', () => {
    it('should delete event and notify attendees', async () => {
      const eventId = 'event_123'
      const existingEvent = {
        id: eventId,
        title: 'Meeting to Delete',
        attendees: ['user_456', 'user_789']
      }

      mockCalendarRepository.findById.mockResolvedValue(success(existingEvent))
      mockCalendarRepository.delete.mockResolvedValue(success(undefined))
      mockNotificationRepository.bulkCreate.mockResolvedValue(success([]))
      mockAuditRepository.create.mockResolvedValue(success({}))

      const result = await calendarService.deleteEvent(eventId)

      expect(result.success).toBe(true)
      expect(mockCalendarRepository.delete).toHaveBeenCalledWith(eventId, expect.any(String))
    })

    it('should handle non-existent event deletion', async () => {
      const eventId = 'nonexistent'
      
      mockCalendarRepository.findById.mockResolvedValue(success(null))

      const result = await calendarService.deleteEvent(eventId)

      expect(result.success).toBe(false)
      expect(result.error.type).toBe('not_found')
    })
  })

  describe('getUserEvents', () => {
    it('should get user events within date range', async () => {
      const userId = 'user_123'
      const dateRange = {
        start: new Date('2024-06-01T00:00:00Z'),
        end: new Date('2024-06-30T23:59:59Z')
      }

      const mockEvents = [
        {
          id: 'event_1',
          title: 'Meeting 1',
          start_time: new Date('2024-06-15T10:00:00Z')
        },
        {
          id: 'event_2',
          title: 'Meeting 2',
          start_time: new Date('2024-06-20T14:00:00Z')
        }
      ]

      mockCalendarRepository.findByUser.mockResolvedValue(success(mockEvents))

      const result = await calendarService.getUserEvents(userId, dateRange)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(mockCalendarRepository.findByUser).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          start_date: dateRange.start,
          end_date: dateRange.end
        })
      )
    })

    it('should filter events by type and status', async () => {
      const userId = 'user_123'
      const dateRange = {
        start: new Date('2024-06-01T00:00:00Z'),
        end: new Date('2024-06-30T23:59:59Z')
      }

      const filters = {
        event_type: 'meeting' as const,
        status: 'confirmed' as const
      }

      mockCalendarRepository.findByUser.mockResolvedValue(success([]))

      const result = await calendarService.getUserEvents(userId, dateRange, filters)

      expect(result.success).toBe(true)
      expect(mockCalendarRepository.findByUser).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          ...filters,
          start_date: dateRange.start,
          end_date: dateRange.end
        })
      )
    })
  })

  describe('findAvailableSlots', () => {
    it('should find available time slots for attendees', async () => {
      const criteria = {
        attendees: ['user_123', 'user_456', 'user_789'],
        date_range: {
          start: new Date('2024-06-15T08:00:00Z'),
          end: new Date('2024-06-15T18:00:00Z')
        },
        duration_minutes: 60,
        working_hours: {
          start: '09:00',
          end: '17:00'
        },
        minimum_gap_minutes: 15
      }

      // Mock busy periods for each attendee
      const busyPeriods = [
        {
          attendee_id: 'user_123',
          events: [
            { start_time: new Date('2024-06-15T10:00:00Z'), end_time: new Date('2024-06-15T11:00:00Z') }
          ]
        },
        {
          attendee_id: 'user_456',
          events: [
            { start_time: new Date('2024-06-15T14:00:00Z'), end_time: new Date('2024-06-15T15:30:00Z') }
          ]
        }
      ]

      mockCalendarRepository.findByDateRange.mockResolvedValue(success(busyPeriods))

      const result = await calendarService.findAvailableSlots(criteria)

      expect(result.success).toBe(true)
      expect(result.data.length).toBeGreaterThan(0)
      
      // Verify slots don't conflict with busy periods
      result.data.forEach(slot => {
        expect(slot.start_time).toBeInstanceOf(Date)
        expect(slot.end_time).toBeInstanceOf(Date)
        expect(slot.duration_minutes).toBe(60)
        expect(slot.available_attendees).toEqual(expect.arrayContaining(['user_123', 'user_456', 'user_789']))
      })
    })

    it('should respect working hours constraints', async () => {
      const criteria = {
        attendees: ['user_123'],
        date_range: {
          start: new Date('2024-06-15T00:00:00Z'),
          end: new Date('2024-06-15T23:59:59Z')
        },
        duration_minutes: 30,
        working_hours: {
          start: '09:00',
          end: '17:00'
        }
      }

      mockCalendarRepository.findByDateRange.mockResolvedValue(success([]))

      const result = await calendarService.findAvailableSlots(criteria)

      expect(result.success).toBe(true)
      
      // All slots should be within working hours
      result.data.forEach(slot => {
        const hour = slot.start_time.getHours()
        expect(hour).toBeGreaterThanOrEqual(9)
        expect(hour).toBeLessThan(17)
      })
    })

    it('should handle cases with no available slots', async () => {
      const criteria = {
        attendees: ['user_123', 'user_456'],
        date_range: {
          start: new Date('2024-06-15T10:00:00Z'),
          end: new Date('2024-06-15T11:00:00Z') // Very short window
        },
        duration_minutes: 120, // 2 hours - longer than the window
        working_hours: {
          start: '09:00',
          end: '17:00'
        }
      }

      mockCalendarRepository.findByDateRange.mockResolvedValue(success([]))

      const result = await calendarService.findAvailableSlots(criteria)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(0)
    })
  })

  describe('sendEventReminders', () => {
    it('should send reminders to all attendees', async () => {
      const eventId = 'event_123'
      const mockEvent = {
        id: eventId,
        title: 'Upcoming Board Meeting',
        start_time: new Date('2024-06-15T10:00:00Z'),
        attendees: [
          { user_id: 'user_456', status: 'pending' },
          { user_id: 'user_789', status: 'accepted' }
        ]
      }

      const attendeeDetails = [
        { id: 'user_456', email: 'user456@example.com', full_name: 'User 456' },
        { id: 'user_789', email: 'user789@example.com', full_name: 'User 789' }
      ]

      mockCalendarRepository.findWithDetails.mockResolvedValue(success(mockEvent))
      mockUserRepository.findByIds.mockResolvedValue(success(attendeeDetails))
      mockNotificationRepository.bulkCreate.mockResolvedValue(success([]))

      const result = await calendarService.sendEventReminders(eventId)

      expect(result.success).toBe(true)
      expect(mockNotificationRepository.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            recipient_id: 'user_456',
            title: expect.stringContaining('Reminder'),
            type: 'event_reminder'
          }),
          expect.objectContaining({
            recipient_id: 'user_789',
            title: expect.stringContaining('Reminder'),
            type: 'event_reminder'
          })
        ])
      )
    })

    it('should skip reminders for cancelled events', async () => {
      const eventId = 'event_123'
      const cancelledEvent = {
        id: eventId,
        title: 'Cancelled Meeting',
        status: 'cancelled' as const,
        attendees: [{ user_id: 'user_456' }]
      }

      mockCalendarRepository.findWithDetails.mockResolvedValue(success(cancelledEvent))

      const result = await calendarService.sendEventReminders(eventId)

      expect(result.success).toBe(false)
      expect(result.error.type).toBe('business_rule')
      expect(result.error.message).toContain('cancelled')
    })
  })

  describe('Complex scheduling scenarios', () => {
    it('should handle all-day events correctly', async () => {
      const allDayEventData = {
        title: 'Company Holiday',
        start_time: new Date('2024-06-15T00:00:00Z'),
        end_time: new Date('2024-06-15T23:59:59Z'),
        is_all_day: true,
        event_type: 'holiday' as const,
        organization_id: 'org_123',
        created_by: 'user_123',
        attendees: [],
        is_recurring: false
      }

      mockCalendarRepository.findConflicting.mockResolvedValue(success([]))
      mockCalendarRepository.create.mockResolvedValue(success({ 
        id: 'holiday_123', 
        ...allDayEventData 
      }))

      const result = await calendarService.createEvent(allDayEventData)

      expect(result.success).toBe(true)
      expect(result.data.is_all_day).toBe(true)
    })

    it('should handle timezone considerations', async () => {
      const eventData = {
        title: 'Global Meeting',
        start_time: new Date('2024-06-15T14:00:00Z'), // 2 PM UTC
        end_time: new Date('2024-06-15T15:00:00Z'),
        timezone: 'America/New_York',
        event_type: 'meeting' as const,
        organization_id: 'org_123',
        created_by: 'user_123',
        attendees: ['user_456'],
        is_recurring: false
      }

      mockCalendarRepository.findConflicting.mockResolvedValue(success([]))
      mockCalendarRepository.create.mockResolvedValue(success({
        id: 'global_123',
        ...eventData
      }))

      const result = await calendarService.createEvent(eventData)

      expect(result.success).toBe(true)
      expect(result.data.timezone).toBe('America/New_York')
    })

    it('should calculate meeting conflicts with buffer time', async () => {
      const eventData = {
        title: 'Back-to-back Meeting',
        start_time: new Date('2024-06-15T12:00:00Z'),
        end_time: new Date('2024-06-15T13:00:00Z'),
        organization_id: 'org_123',
        created_by: 'user_123',
        attendees: ['user_456'],
        event_type: 'meeting' as const,
        is_recurring: false,
        buffer_minutes: 15 // 15 minutes buffer between meetings
      }

      const adjacentMeeting = {
        id: 'adjacent_meeting',
        title: 'Previous Meeting',
        start_time: new Date('2024-06-15T11:00:00Z'),
        end_time: new Date('2024-06-15T11:50:00Z'), // Ends 10 minutes before (less than 15min buffer)
        attendees: ['user_456']
      }

      mockCalendarRepository.findConflicting.mockResolvedValue(success([adjacentMeeting]))

      const result = await calendarService.createEvent(eventData)

      expect(result.success).toBe(false)
      expect(result.error.type).toBe('business_rule')
      expect(result.error.message).toContain('buffer time')
    })
  })

  describe('Performance and edge cases', () => {
    it('should handle large attendee lists efficiently', async () => {
      const largeAttendeeList = Array.from({ length: 100 }, (_, i) => `user_${i}`)
      
      const eventData = {
        title: 'Large Meeting',
        start_time: new Date('2024-06-15T10:00:00Z'),
        end_time: new Date('2024-06-15T12:00:00Z'),
        organization_id: 'org_123',
        created_by: 'user_123',
        attendees: largeAttendeeList,
        event_type: 'meeting' as const,
        is_recurring: false
      }

      mockCalendarRepository.findConflicting.mockResolvedValue(success([]))
      mockCalendarRepository.create.mockResolvedValue(success({
        id: 'large_event',
        ...eventData
      }))

      const result = await calendarService.createEvent(eventData)

      expect(result.success).toBe(true)
      expect(result.data.attendees).toHaveLength(100)
    })

    it('should handle invalid date ranges gracefully', async () => {
      const eventData = {
        title: 'Invalid Event',
        start_time: new Date('invalid-date'),
        end_time: new Date('2024-06-15T12:00:00Z'),
        organization_id: 'org_123',
        created_by: 'user_123',
        attendees: [],
        event_type: 'meeting' as const,
        is_recurring: false
      }

      const result = await calendarService.createEvent(eventData)

      expect(result.success).toBe(false)
      expect(result.error.type).toBe('validation')
    })

    it('should handle concurrent event creation race conditions', async () => {
      const eventData = {
        title: 'Race Condition Meeting',
        start_time: new Date('2024-06-15T10:00:00Z'),
        end_time: new Date('2024-06-15T11:00:00Z'),
        organization_id: 'org_123',
        created_by: 'user_123',
        attendees: ['user_456'],
        event_type: 'meeting' as const,
        is_recurring: false
      }

      // Simulate race condition where conflict check passes but creation fails due to concurrent insert
      mockCalendarRepository.findConflicting.mockResolvedValue(success([]))
      mockCalendarRepository.create.mockResolvedValue(
        failure(RepositoryError.conflict('Event slot was taken by another request'))
      )

      const result = await calendarService.createEvent(eventData)

      expect(result.success).toBe(false)
      expect(result.error.type).toBe('conflict')
    })

    it('should validate recurring event patterns thoroughly', async () => {
      const invalidRecurringPatterns = [
        // Invalid interval
        { type: 'weekly', interval: 0 },
        { type: 'weekly', interval: -1 },
        // Invalid days of week
        { type: 'weekly', interval: 1, days_of_week: [8, 9] }, // Invalid days
        // Missing end condition
        { type: 'daily', interval: 1 },
        // End date before start
        { 
          type: 'monthly', 
          interval: 1, 
          end_date: new Date('2024-01-01T00:00:00Z'),
          start_date: new Date('2024-06-15T10:00:00Z')
        }
      ]

      for (const pattern of invalidRecurringPatterns) {
        const eventData = {
          title: 'Invalid Recurring Event',
          start_time: new Date('2024-06-15T10:00:00Z'),
          end_time: new Date('2024-06-15T11:00:00Z'),
          organization_id: 'org_123',
          created_by: 'user_123',
          attendees: [],
          event_type: 'meeting' as const,
          is_recurring: true,
          recurrence_pattern: pattern
        }

        const result = await calendarService.scheduleRecurringEvent(eventData)
        expect(result.success).toBe(false)
        expect(result.error.type).toBe('validation')
      }
    })
  })
})