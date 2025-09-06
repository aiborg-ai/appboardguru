/**
 * Meeting Repository Interface
 * Port for meeting persistence operations
 */

import { Result } from '../../../01-shared/types/core.types';
import { Meeting, MeetingStatus, MeetingType, AttendanceStatus } from '../../../domain/entities/meeting.entity';
import type { MeetingId, UserId, BoardId, OrganizationId } from '../../../types/core';

export interface MeetingFilters {
  boardId?: BoardId;
  organizationId?: OrganizationId;
  status?: MeetingStatus | MeetingStatus[];
  type?: MeetingType | MeetingType[];
  createdBy?: UserId;
  chairperson?: UserId;
  attendeeId?: UserId;
  fromDate?: Date;
  toDate?: Date;
  tags?: string[];
  hasMinutes?: boolean;
  hasRecording?: boolean;
}

export interface MeetingListOptions {
  filters?: MeetingFilters;
  sortBy?: 'scheduledStart' | 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  includeAttendees?: boolean;
  includeAgenda?: boolean;
  includeMinutes?: boolean;
}

export interface MeetingStatistics {
  totalMeetings: number;
  byStatus: Record<MeetingStatus, number>;
  byType: Record<MeetingType, number>;
  averageDuration: number;
  averageAttendance: number;
  quorumMetRate: number;
  cancellationRate: number;
}

export interface AttendeeStatistics {
  userId: UserId;
  meetingsInvited: number;
  meetingsAttended: number;
  attendanceRate: number;
  averageResponseTime: number;
  roleDistribution: Record<string, number>;
}

/**
 * Meeting Repository Interface
 */
export interface IMeetingRepository {
  /**
   * Create a new meeting
   */
  create(meeting: Meeting): Promise<Result<Meeting>>;

  /**
   * Update an existing meeting
   */
  update(meeting: Meeting): Promise<Result<Meeting>>;

  /**
   * Find meeting by ID
   */
  findById(id: MeetingId): Promise<Result<Meeting>>;

  /**
   * Find meetings by board
   */
  findByBoard(boardId: BoardId, options?: MeetingListOptions): Promise<Result<Meeting[]>>;

  /**
   * Find meetings by organization
   */
  findByOrganization(organizationId: OrganizationId, options?: MeetingListOptions): Promise<Result<Meeting[]>>;

  /**
   * Find meetings for a user (as attendee)
   */
  findByAttendee(userId: UserId, options?: MeetingListOptions): Promise<Result<Meeting[]>>;

  /**
   * Find upcoming meetings
   */
  findUpcoming(options?: MeetingListOptions): Promise<Result<Meeting[]>>;

  /**
   * Search meetings
   */
  search(query: string, options?: MeetingListOptions): Promise<Result<Meeting[]>>;

  /**
   * List meetings with filters
   */
  list(options: MeetingListOptions): Promise<Result<{ meetings: Meeting[]; total: number }>>;

  /**
   * Delete a meeting (soft delete)
   */
  delete(id: MeetingId): Promise<Result<void>>;

  /**
   * Permanently delete a meeting
   */
  permanentDelete(id: MeetingId): Promise<Result<void>>;

  /**
   * Update attendee status
   */
  updateAttendeeStatus(
    meetingId: MeetingId,
    userId: UserId,
    status: AttendanceStatus
  ): Promise<Result<void>>;

  /**
   * Add attendee to meeting
   */
  addAttendee(
    meetingId: MeetingId,
    attendee: { userId: UserId; role: string }
  ): Promise<Result<void>>;

  /**
   * Remove attendee from meeting
   */
  removeAttendee(meetingId: MeetingId, userId: UserId): Promise<Result<void>>;

  /**
   * Get meeting statistics
   */
  getStatistics(filters?: MeetingFilters): Promise<Result<MeetingStatistics>>;

  /**
   * Get attendee statistics
   */
  getAttendeeStatistics(userId: UserId, dateRange?: { from: Date; to: Date }): Promise<Result<AttendeeStatistics>>;

  /**
   * Find meetings with conflicts
   */
  findConflicts(
    scheduledStart: Date,
    scheduledEnd: Date,
    attendeeIds: UserId[]
  ): Promise<Result<Meeting[]>>;

  /**
   * Find recurring meetings
   */
  findRecurring(parentMeetingId: MeetingId): Promise<Result<Meeting[]>>;

  /**
   * Clone meeting as template
   */
  cloneAsTemplate(meetingId: MeetingId): Promise<Result<Meeting>>;

  /**
   * Archive old meetings
   */
  archiveOldMeetings(beforeDate: Date): Promise<Result<number>>;

  /**
   * Check if user has access to meeting
   */
  checkAccess(meetingId: MeetingId, userId: UserId): Promise<Result<boolean>>;
}