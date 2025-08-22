/**
 * Calendar Entity Types
 * Type definitions for calendar and event-related entities
 */

import { EventId, UserId, OrganizationId, BaseEntity, ISODateString } from '../core';

export interface CalendarEvent extends BaseEntity {
  id: EventId;
  title: string;
  description?: string;
  startTime: ISODateString;
  endTime: ISODateString;
  location?: string;
  organizerId: UserId;
  organizationId: OrganizationId;
  attendees?: UserId[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  isRecurring?: boolean;
  recurrenceId?: string;
  recurrencePattern?: RecurrencePattern;
  reminders?: EventReminder[];
  requiresRoom?: boolean;
  isPrivate?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  cancelledAt?: ISODateString;
}

export interface CreateEventData {
  title: string;
  description?: string;
  startTime: ISODateString;
  endTime: ISODateString;
  location?: string;
  organizerId: UserId;
  organizationId: OrganizationId;
  attendees?: UserId[];
  requiresRoom?: boolean;
  isPrivate?: boolean;
  tags?: string[];
  reminders?: EventReminder[];
  metadata?: Record<string, unknown>;
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  startTime?: ISODateString;
  endTime?: ISODateString;
  location?: string;
  attendees?: UserId[];
  status?: CalendarEvent['status'];
  reminders?: EventReminder[];
  isPrivate?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface EventReminder {
  type: 'email' | 'push' | 'sms';
  timing: number; // minutes before event
  sent: boolean;
  sentAt?: ISODateString;
}

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // every N days/weeks/months/years
  daysOfWeek?: number[]; // for weekly recurrence
  dayOfMonth?: number;   // for monthly recurrence
  monthOfYear?: number;  // for yearly recurrence
  endDate?: ISODateString;
  occurrenceCount?: number;
}

export interface EventAttendee {
  userId: UserId;
  email: string;
  name: string;
  response: 'pending' | 'accepted' | 'declined' | 'tentative';
  respondedAt?: ISODateString;
  note?: string;
}

export interface EventConflict {
  type: 'time_overlap' | 'resource_conflict' | 'attendee_busy';
  severity: 'low' | 'medium' | 'high';
  description: string;
  conflictingEvent?: CalendarEvent;
  affectedAttendees?: UserId[];
}

export interface CalendarSettings {
  defaultView: 'month' | 'week' | 'day' | 'list';
  workingHours: {
    start: string; // "09:00"
    end: string;   // "17:00"
  };
  workingDays: number[]; // 0-6, Sunday=0
  timezone: string;
  reminderDefaults: {
    timing: number; // minutes before
    types: ('email' | 'push')[];
  };
  allowWeekendEvents: boolean;
  autoAcceptMeetings: boolean;
}

// Type guards and utilities
export const isEventActive = (event: CalendarEvent): boolean => {
  return event.status === 'scheduled' || event.status === 'in_progress';
};

export const isEventInFuture = (event: CalendarEvent): boolean => {
  return new Date(event.startTime) > new Date();
};

export const getEventDuration = (event: CalendarEvent): number => {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // minutes
};

export const formatEventTime = (event: CalendarEvent): string => {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  
  const startTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  if (start.toDateString() === end.toDateString()) {
    return `${startTime} - ${endTime}`;
  } else {
    return `${start.toLocaleDateString()} ${startTime} - ${end.toLocaleDateString()} ${endTime}`;
  }
};