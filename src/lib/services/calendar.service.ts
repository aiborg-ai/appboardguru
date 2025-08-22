/**
 * Calendar Service
 * Business logic for event management and scheduling
 * Follows CLAUDE.md DDD architecture patterns
 */

import { BaseService } from './base.service';
import { CalendarRepository } from '../repositories/calendar.repository';
import { Result, Ok, Err } from '../result';
import { CalendarEvent, CreateEventData, UpdateEventData } from '../../types/entities/calendar.types';
import { EventId, UserId, OrganizationId } from '../../types/core';

export interface ICalendarService {
  createEvent(data: CreateEventData): Promise<Result<CalendarEvent>>;
  getEvent(eventId: EventId): Promise<Result<CalendarEvent>>;
  updateEvent(eventId: EventId, data: UpdateEventData): Promise<Result<CalendarEvent>>;
  deleteEvent(eventId: EventId): Promise<Result<void>>;
  getUserEvents(userId: UserId, dateRange: DateRange): Promise<Result<CalendarEvent[]>>;
  getOrganizationEvents(orgId: OrganizationId, dateRange: DateRange): Promise<Result<CalendarEvent[]>>;
  findAvailableSlots(criteria: AvailabilitySearchCriteria): Promise<Result<TimeSlot[]>>;
  scheduleRecurringEvent(data: RecurringEventData): Promise<Result<CalendarEvent[]>>;
  sendEventReminders(eventId: EventId): Promise<Result<void>>;
}

export interface DateRange {
  start: string; // ISO date string
  end: string;   // ISO date string
}

export interface TimeSlot {
  start: string;
  end: string;
  duration: number; // minutes
  attendeeAvailability: AttendeeAvailability[];
}

export interface AttendeeAvailability {
  userId: UserId;
  email: string;
  name: string;
  status: 'available' | 'busy' | 'tentative' | 'unknown';
  conflicts?: CalendarEvent[];
}

export interface AvailabilitySearchCriteria {
  attendees: UserId[];
  duration: number; // minutes
  dateRange: DateRange;
  timeConstraints?: TimeConstraints;
  excludeWeekends?: boolean;
  timezone?: string;
}

export interface TimeConstraints {
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
  daysOfWeek?: number[]; // 0-6, Sunday=0
}

export interface RecurringEventData extends CreateEventData {
  recurrence: RecurrencePattern;
  occurrenceCount?: number;
  endDate?: string;
}

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // every N days/weeks/months/years
  daysOfWeek?: number[]; // for weekly recurrence
  dayOfMonth?: number;   // for monthly recurrence
  monthOfYear?: number;  // for yearly recurrence
}

export interface EventReminder {
  type: 'email' | 'push' | 'sms';
  timing: number; // minutes before event
  sent: boolean;
  sentAt?: string;
}

export interface MeetingConflict {
  conflictType: 'time_overlap' | 'resource_conflict' | 'attendee_busy';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestedResolution?: string;
  affectedAttendees?: UserId[];
}

export class CalendarService extends BaseService implements ICalendarService {
  constructor(
    private readonly calendarRepository: CalendarRepository
  ) {
    super();
  }

  async createEvent(data: CreateEventData): Promise<Result<CalendarEvent>> {
    try {
      // Validate event data
      const validation = this.validateCreateEventData(data);
      if (!validation.isValid) {
        return Err(new Error(`Invalid event data: ${validation.errors.join(', ')}`));
      }

      // Check for conflicts
      const conflictCheck = await this.checkEventConflicts(data);
      if (conflictCheck.hasConflicts && conflictCheck.severity === 'high') {
        return Err(new Error(`Event conflicts found: ${conflictCheck.conflicts.map(c => c.description).join(', ')}`));
      }

      // Generate meeting room/resource if needed
      if (data.requiresRoom && !data.location) {
        const roomResult = await this.findAvailableRoom(data.startTime, data.endTime, data.attendees?.length || 1);
        if (roomResult.success) {
          data.location = roomResult.room;
        }
      }

      // Create event
      const eventData = {
        ...data,
        status: 'scheduled' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const event = await this.calendarRepository.create(eventData);

      // Send invitations to attendees
      if (data.attendees && data.attendees.length > 0) {
        await this.sendEventInvitations(event.id, data.attendees);
      }

      // Schedule reminders
      if (data.reminders && data.reminders.length > 0) {
        await this.scheduleEventReminders(event.id, data.reminders);
      }

      return Ok(event);
    } catch (error) {
      return this.handleError(error, 'Failed to create event');
    }
  }

  async getEvent(eventId: EventId): Promise<Result<CalendarEvent>> {
    try {
      const event = await this.calendarRepository.findById(eventId);
      
      if (!event) {
        return Err(new Error('Event not found'));
      }

      return Ok(event);
    } catch (error) {
      return this.handleError(error, 'Failed to get event');
    }
  }

  async updateEvent(eventId: EventId, data: UpdateEventData): Promise<Result<CalendarEvent>> {
    try {
      const existingEvent = await this.calendarRepository.findById(eventId);
      if (!existingEvent) {
        return Err(new Error('Event not found'));
      }

      // Check if this is a significant change that requires re-notification
      const isSignificantChange = this.isSignificantEventChange(existingEvent, data);

      const updateData = {
        ...data,
        updatedAt: new Date().toISOString(),
      };

      const updatedEvent = await this.calendarRepository.update(eventId, updateData);

      // Send update notifications if significant change
      if (isSignificantChange && updatedEvent.attendees) {
        await this.sendEventUpdateNotifications(updatedEvent.id, updatedEvent.attendees);
      }

      return Ok(updatedEvent);
    } catch (error) {
      return this.handleError(error, 'Failed to update event');
    }
  }

  async deleteEvent(eventId: EventId): Promise<Result<void>> {
    try {
      const event = await this.calendarRepository.findById(eventId);
      if (!event) {
        return Err(new Error('Event not found'));
      }

      // Send cancellation notifications
      if (event.attendees && event.attendees.length > 0) {
        await this.sendEventCancellationNotifications(eventId, event.attendees);
      }

      // Cancel scheduled reminders
      await this.cancelEventReminders(eventId);

      // Soft delete the event
      await this.calendarRepository.update(eventId, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return Ok(undefined);
    } catch (error) {
      return this.handleError(error, 'Failed to delete event');
    }
  }

  async getUserEvents(userId: UserId, dateRange: DateRange): Promise<Result<CalendarEvent[]>> {
    try {
      const events = await this.calendarRepository.findByUserAndDateRange(userId, dateRange);
      return Ok(events);
    } catch (error) {
      return this.handleError(error, 'Failed to get user events');
    }
  }

  async getOrganizationEvents(orgId: OrganizationId, dateRange: DateRange): Promise<Result<CalendarEvent[]>> {
    try {
      const events = await this.calendarRepository.findByOrganizationAndDateRange(orgId, dateRange);
      return Ok(events);
    } catch (error) {
      return this.handleError(error, 'Failed to get organization events');
    }
  }

  async findAvailableSlots(criteria: AvailabilitySearchCriteria): Promise<Result<TimeSlot[]>> {
    try {
      // Get existing events for all attendees in the date range
      const attendeeEvents = await Promise.all(
        criteria.attendees.map(userId => 
          this.calendarRepository.findByUserAndDateRange(userId, criteria.dateRange)
        )
      );

      // Flatten and sort events
      const allEvents = attendeeEvents.flat().sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      // Find gaps between events
      const availableSlots = this.findTimeSlots(
        criteria.dateRange,
        criteria.duration,
        allEvents,
        criteria.timeConstraints,
        criteria.excludeWeekends
      );

      // Check attendee availability for each slot
      const slotsWithAvailability = await Promise.all(
        availableSlots.map(async slot => {
          const attendeeAvailability = await this.checkAttendeeAvailability(
            criteria.attendees,
            slot.start,
            slot.end
          );

          return {
            ...slot,
            attendeeAvailability
          };
        })
      );

      return Ok(slotsWithAvailability);
    } catch (error) {
      return this.handleError(error, 'Failed to find available slots');
    }
  }

  async scheduleRecurringEvent(data: RecurringEventData): Promise<Result<CalendarEvent[]>> {
    try {
      const occurrences = this.generateRecurrenceOccurrences(data);
      const createdEvents: CalendarEvent[] = [];

      for (const occurrence of occurrences) {
        const eventData: CreateEventData = {
          ...data,
          startTime: occurrence.startTime,
          endTime: occurrence.endTime,
          isRecurring: true,
          recurrenceId: occurrence.recurrenceId,
        };

        const result = await this.createEvent(eventData);
        if (result.success) {
          createdEvents.push(result.data);
        }
      }

      return Ok(createdEvents);
    } catch (error) {
      return this.handleError(error, 'Failed to schedule recurring event');
    }
  }

  async sendEventReminders(eventId: EventId): Promise<Result<void>> {
    try {
      const event = await this.calendarRepository.findById(eventId);
      if (!event) {
        return Err(new Error('Event not found'));
      }

      // Send reminders to all attendees
      if (event.attendees && event.attendees.length > 0) {
        await Promise.all(
          event.attendees.map(userId => this.sendReminderToUser(userId, event))
        );
      }

      return Ok(undefined);
    } catch (error) {
      return this.handleError(error, 'Failed to send event reminders');
    }
  }

  private validateCreateEventData(data: CreateEventData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.title || data.title.trim().length === 0) {
      errors.push('Event title is required');
    }

    if (!data.startTime) {
      errors.push('Start time is required');
    }

    if (!data.endTime) {
      errors.push('End time is required');
    }

    if (data.startTime && data.endTime) {
      const start = new Date(data.startTime);
      const end = new Date(data.endTime);
      
      if (start >= end) {
        errors.push('End time must be after start time');
      }

      if (start < new Date()) {
        errors.push('Event cannot be scheduled in the past');
      }
    }

    if (!data.organizerId) {
      errors.push('Organizer ID is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async checkEventConflicts(data: CreateEventData): Promise<{ hasConflicts: boolean; conflicts: MeetingConflict[]; severity: 'low' | 'medium' | 'high' }> {
    const conflicts: MeetingConflict[] = [];

    // Check attendee conflicts
    if (data.attendees) {
      for (const attendeeId of data.attendees) {
        const attendeeEvents = await this.calendarRepository.findByUserAndDateRange(
          attendeeId,
          { start: data.startTime, end: data.endTime }
        );

        const overlappingEvents = attendeeEvents.filter(event => 
          this.eventsOverlap(
            { start: data.startTime, end: data.endTime },
            { start: event.startTime, end: event.endTime }
          )
        );

        if (overlappingEvents.length > 0) {
          conflicts.push({
            conflictType: 'attendee_busy',
            severity: 'high',
            description: `Attendee ${attendeeId} has ${overlappingEvents.length} conflicting event(s)`,
            affectedAttendees: [attendeeId]
          });
        }
      }
    }

    // Determine overall severity
    const severity = conflicts.length > 0 ? 
      conflicts.some(c => c.severity === 'high') ? 'high' :
      conflicts.some(c => c.severity === 'medium') ? 'medium' : 'low' : 'low';

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      severity
    };
  }

  private eventsOverlap(event1: { start: string; end: string }, event2: { start: string; end: string }): boolean {
    const start1 = new Date(event1.start).getTime();
    const end1 = new Date(event1.end).getTime();
    const start2 = new Date(event2.start).getTime();
    const end2 = new Date(event2.end).getTime();

    return start1 < end2 && end1 > start2;
  }

  private async findAvailableRoom(startTime: string, endTime: string, attendeeCount: number): Promise<{ success: boolean; room?: string }> {
    // TODO: Implement room booking logic
    return {
      success: true,
      room: `Conference Room ${Math.ceil(Math.random() * 5)}`
    };
  }

  private findTimeSlots(
    dateRange: DateRange,
    duration: number,
    existingEvents: CalendarEvent[],
    timeConstraints?: TimeConstraints,
    excludeWeekends?: boolean
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    // TODO: Implement time slot finding algorithm
    return slots;
  }

  private async checkAttendeeAvailability(attendees: UserId[], startTime: string, endTime: string): Promise<AttendeeAvailability[]> {
    // TODO: Check each attendee's availability
    return attendees.map(userId => ({
      userId,
      email: `user${userId}@example.com`,
      name: `User ${userId}`,
      status: 'available' as const
    }));
  }

  private generateRecurrenceOccurrences(data: RecurringEventData): Array<{ startTime: string; endTime: string; recurrenceId: string }> {
    const occurrences: Array<{ startTime: string; endTime: string; recurrenceId: string }> = [];
    // TODO: Generate recurring event occurrences based on pattern
    return occurrences;
  }

  private isSignificantEventChange(original: CalendarEvent, updates: UpdateEventData): boolean {
    return !!(
      updates.startTime && updates.startTime !== original.startTime ||
      updates.endTime && updates.endTime !== original.endTime ||
      updates.location && updates.location !== original.location ||
      updates.title && updates.title !== original.title
    );
  }

  private async sendEventInvitations(eventId: EventId, attendees: UserId[]): Promise<void> {
    // TODO: Send email invitations
    console.log(`Sending invitations for event ${eventId} to ${attendees.length} attendees`);
  }

  private async sendEventUpdateNotifications(eventId: EventId, attendees: UserId[]): Promise<void> {
    // TODO: Send update notifications
    console.log(`Sending update notifications for event ${eventId} to ${attendees.length} attendees`);
  }

  private async sendEventCancellationNotifications(eventId: EventId, attendees: UserId[]): Promise<void> {
    // TODO: Send cancellation notifications
    console.log(`Sending cancellation notifications for event ${eventId} to ${attendees.length} attendees`);
  }

  private async scheduleEventReminders(eventId: EventId, reminders: EventReminder[]): Promise<void> {
    // TODO: Schedule reminder jobs
    console.log(`Scheduling ${reminders.length} reminders for event ${eventId}`);
  }

  private async cancelEventReminders(eventId: EventId): Promise<void> {
    // TODO: Cancel scheduled reminders
    console.log(`Cancelling reminders for event ${eventId}`);
  }

  private async sendReminderToUser(userId: UserId, event: CalendarEvent): Promise<void> {
    // TODO: Send reminder notification
    console.log(`Sending reminder to user ${userId} for event ${event.id}`);
  }
}