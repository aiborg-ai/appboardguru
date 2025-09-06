/**
 * Meeting Queries
 * CQRS Queries for retrieving meeting information
 */

import { Query } from '../command-bus';
import { Result } from '../../../01-shared/types/core.types';
import { ResultUtils } from '../../../01-shared/lib/result';
import { Meeting, MeetingStatus, MeetingType } from '../../../domain/entities/meeting.entity';
import { IMeetingRepository, MeetingStatistics, AttendeeStatistics } from '../../interfaces/repositories/meeting.repository.interface';
import type { MeetingId, UserId, BoardId, OrganizationId } from '../../../types/core';

/**
 * Get Meeting By ID Query
 */
export class GetMeetingQuery implements Query<Meeting> {
  readonly queryType = 'GetMeeting';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'GetMeeting';
  readonly timestamp = new Date();

  constructor(
    public readonly payload: {
      meetingId: MeetingId;
      userId: UserId;
    }
  ) {}

  private generateQueryId(): string {
    return `qry_get_meeting_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.meetingId) {
      return ResultUtils.fail(new Error('Meeting ID is required'));
    }

    if (!this.payload.userId) {
      return ResultUtils.fail(new Error('User ID is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Get Meeting Query Handler
 */
export class GetMeetingQueryHandler {
  constructor(private readonly meetingRepository: IMeetingRepository) {}

  async handle(query: GetMeetingQuery): Promise<Result<Meeting>> {
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[GetMeetingQuery] Executing:', {
      meetingId: query.payload.meetingId,
      userId: query.payload.userId
    });

    try {
      // Get meeting
      const meetingResult = await this.meetingRepository.findById(query.payload.meetingId);
      if (!meetingResult.success) {
        return meetingResult;
      }

      const meeting = meetingResult.data;

      // Check if user has access to the meeting
      const hasAccess = await this.meetingRepository.checkAccess(
        query.payload.meetingId,
        query.payload.userId
      );

      if (!hasAccess.success || !hasAccess.data) {
        return ResultUtils.fail(new Error('You do not have access to this meeting'));
      }

      console.log('[GetMeetingQuery] Success:', {
        meetingId: meeting.id,
        title: meeting.title
      });

      return ResultUtils.ok(meeting);
    } catch (error) {
      console.error('[GetMeetingQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get meeting')
      );
    }
  }
}

/**
 * List Meetings Query
 */
export class ListMeetingsQuery implements Query<{ meetings: Meeting[]; total: number }> {
  readonly queryType = 'ListMeetings';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'ListMeetings';
  readonly timestamp = new Date();

  constructor(
    public readonly payload: {
      userId: UserId;
      filters?: {
        boardId?: BoardId;
        organizationId?: OrganizationId;
        status?: MeetingStatus | MeetingStatus[];
        type?: MeetingType | MeetingType[];
        fromDate?: Date;
        toDate?: Date;
        tags?: string[];
        searchQuery?: string;
      };
      sortBy?: 'scheduledStart' | 'createdAt' | 'updatedAt' | 'title';
      sortOrder?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    }
  ) {}

  private generateQueryId(): string {
    return `qry_list_meetings_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.userId) {
      return ResultUtils.fail(new Error('User ID is required'));
    }

    if (this.payload.limit && this.payload.limit > 100) {
      return ResultUtils.fail(new Error('Limit cannot exceed 100'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * List Meetings Query Handler
 */
export class ListMeetingsQueryHandler {
  constructor(private readonly meetingRepository: IMeetingRepository) {}

  async handle(query: ListMeetingsQuery): Promise<Result<{ meetings: Meeting[]; total: number }>> {
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[ListMeetingsQuery] Executing:', {
      userId: query.payload.userId,
      filters: query.payload.filters
    });

    try {
      const result = await this.meetingRepository.list({
        filters: query.payload.filters,
        sortBy: query.payload.sortBy,
        sortOrder: query.payload.sortOrder,
        limit: query.payload.limit || 20,
        offset: query.payload.offset || 0
      });

      if (!result.success) {
        return result;
      }

      console.log('[ListMeetingsQuery] Success:', {
        count: result.data.meetings.length,
        total: result.data.total
      });

      return result;
    } catch (error) {
      console.error('[ListMeetingsQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to list meetings')
      );
    }
  }
}

/**
 * Get My Meetings Query
 */
export class GetMyMeetingsQuery implements Query<Meeting[]> {
  readonly queryType = 'GetMyMeetings';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'GetMyMeetings';
  readonly timestamp = new Date();

  constructor(
    public readonly payload: {
      userId: UserId;
      upcoming?: boolean;
      limit?: number;
      offset?: number;
    }
  ) {}

  private generateQueryId(): string {
    return `qry_my_meetings_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.userId) {
      return ResultUtils.fail(new Error('User ID is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Get My Meetings Query Handler
 */
export class GetMyMeetingsQueryHandler {
  constructor(private readonly meetingRepository: IMeetingRepository) {}

  async handle(query: GetMyMeetingsQuery): Promise<Result<Meeting[]>> {
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[GetMyMeetingsQuery] Executing:', {
      userId: query.payload.userId,
      upcoming: query.payload.upcoming
    });

    try {
      const options = {
        filters: query.payload.upcoming ? {
          fromDate: new Date(),
          status: ['scheduled'] as MeetingStatus[]
        } : undefined,
        sortBy: 'scheduledStart' as const,
        sortOrder: 'asc' as const,
        limit: query.payload.limit || 20,
        offset: query.payload.offset || 0
      };

      const result = await this.meetingRepository.findByAttendee(
        query.payload.userId,
        options
      );

      if (!result.success) {
        return result;
      }

      console.log('[GetMyMeetingsQuery] Success:', {
        count: result.data.length
      });

      return result;
    } catch (error) {
      console.error('[GetMyMeetingsQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get user meetings')
      );
    }
  }
}

/**
 * Get Meeting Statistics Query
 */
export class GetMeetingStatisticsQuery implements Query<MeetingStatistics> {
  readonly queryType = 'GetMeetingStatistics';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'GetMeetingStatistics';
  readonly timestamp = new Date();

  constructor(
    public readonly payload: {
      organizationId?: OrganizationId;
      boardId?: BoardId;
      fromDate?: Date;
      toDate?: Date;
    }
  ) {}

  private generateQueryId(): string {
    return `qry_meeting_stats_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    return ResultUtils.ok(undefined);
  }
}

/**
 * Get Meeting Statistics Query Handler
 */
export class GetMeetingStatisticsQueryHandler {
  constructor(private readonly meetingRepository: IMeetingRepository) {}

  async handle(query: GetMeetingStatisticsQuery): Promise<Result<MeetingStatistics>> {
    console.log('[GetMeetingStatisticsQuery] Executing:', query.payload);

    try {
      const result = await this.meetingRepository.getStatistics({
        organizationId: query.payload.organizationId,
        boardId: query.payload.boardId,
        fromDate: query.payload.fromDate,
        toDate: query.payload.toDate
      });

      if (!result.success) {
        return result;
      }

      console.log('[GetMeetingStatisticsQuery] Success:', result.data);

      return result;
    } catch (error) {
      console.error('[GetMeetingStatisticsQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get meeting statistics')
      );
    }
  }
}

/**
 * Get Attendee Statistics Query
 */
export class GetAttendeeStatisticsQuery implements Query<AttendeeStatistics> {
  readonly queryType = 'GetAttendeeStatistics';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'GetAttendeeStatistics';
  readonly timestamp = new Date();

  constructor(
    public readonly payload: {
      userId: UserId;
      fromDate?: Date;
      toDate?: Date;
    }
  ) {}

  private generateQueryId(): string {
    return `qry_attendee_stats_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.userId) {
      return ResultUtils.fail(new Error('User ID is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Get Attendee Statistics Query Handler
 */
export class GetAttendeeStatisticsQueryHandler {
  constructor(private readonly meetingRepository: IMeetingRepository) {}

  async handle(query: GetAttendeeStatisticsQuery): Promise<Result<AttendeeStatistics>> {
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[GetAttendeeStatisticsQuery] Executing:', {
      userId: query.payload.userId,
      dateRange: {
        from: query.payload.fromDate,
        to: query.payload.toDate
      }
    });

    try {
      const result = await this.meetingRepository.getAttendeeStatistics(
        query.payload.userId,
        query.payload.fromDate && query.payload.toDate ? {
          from: query.payload.fromDate,
          to: query.payload.toDate
        } : undefined
      );

      if (!result.success) {
        return result;
      }

      console.log('[GetAttendeeStatisticsQuery] Success:', result.data);

      return result;
    } catch (error) {
      console.error('[GetAttendeeStatisticsQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get attendee statistics')
      );
    }
  }
}

/**
 * Check Meeting Conflicts Query
 */
export class CheckMeetingConflictsQuery implements Query<Meeting[]> {
  readonly queryType = 'CheckMeetingConflicts';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'CheckMeetingConflicts';
  readonly timestamp = new Date();

  constructor(
    public readonly payload: {
      scheduledStart: Date;
      scheduledEnd: Date;
      attendeeIds: UserId[];
    }
  ) {}

  private generateQueryId(): string {
    return `qry_check_conflicts_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.scheduledStart || !this.payload.scheduledEnd) {
      return ResultUtils.fail(new Error('Start and end dates are required'));
    }

    if (this.payload.scheduledEnd <= this.payload.scheduledStart) {
      return ResultUtils.fail(new Error('End date must be after start date'));
    }

    if (!this.payload.attendeeIds || this.payload.attendeeIds.length === 0) {
      return ResultUtils.fail(new Error('At least one attendee is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Check Meeting Conflicts Query Handler
 */
export class CheckMeetingConflictsQueryHandler {
  constructor(private readonly meetingRepository: IMeetingRepository) {}

  async handle(query: CheckMeetingConflictsQuery): Promise<Result<Meeting[]>> {
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[CheckMeetingConflictsQuery] Executing:', {
      scheduledStart: query.payload.scheduledStart,
      scheduledEnd: query.payload.scheduledEnd,
      attendeeCount: query.payload.attendeeIds.length
    });

    try {
      const result = await this.meetingRepository.findConflicts(
        query.payload.scheduledStart,
        query.payload.scheduledEnd,
        query.payload.attendeeIds
      );

      if (!result.success) {
        return result;
      }

      console.log('[CheckMeetingConflictsQuery] Success:', {
        conflictCount: result.data.length
      });

      return result;
    } catch (error) {
      console.error('[CheckMeetingConflictsQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to check meeting conflicts')
      );
    }
  }
}

/**
 * Factory functions to create query handlers with dependencies
 */
export function createGetMeetingQueryHandler(dependencies: {
  meetingRepository: IMeetingRepository;
}): GetMeetingQueryHandler {
  return new GetMeetingQueryHandler(dependencies.meetingRepository);
}

export function createListMeetingsQueryHandler(dependencies: {
  meetingRepository: IMeetingRepository;
}): ListMeetingsQueryHandler {
  return new ListMeetingsQueryHandler(dependencies.meetingRepository);
}

export function createGetMyMeetingsQueryHandler(dependencies: {
  meetingRepository: IMeetingRepository;
}): GetMyMeetingsQueryHandler {
  return new GetMyMeetingsQueryHandler(dependencies.meetingRepository);
}

export function createGetMeetingStatisticsQueryHandler(dependencies: {
  meetingRepository: IMeetingRepository;
}): GetMeetingStatisticsQueryHandler {
  return new GetMeetingStatisticsQueryHandler(dependencies.meetingRepository);
}

export function createGetAttendeeStatisticsQueryHandler(dependencies: {
  meetingRepository: IMeetingRepository;
}): GetAttendeeStatisticsQueryHandler {
  return new GetAttendeeStatisticsQueryHandler(dependencies.meetingRepository);
}

export function createCheckMeetingConflictsQueryHandler(dependencies: {
  meetingRepository: IMeetingRepository;
}): CheckMeetingConflictsQueryHandler {
  return new CheckMeetingConflictsQueryHandler(dependencies.meetingRepository);
}