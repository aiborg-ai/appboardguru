/**
 * Schedule Meeting Command
 * CQRS Command for scheduling a new meeting
 */

import { Command } from '../command-bus';
import { Result } from '../../../01-shared/types/core.types';
import { ResultUtils } from '../../../01-shared/lib/result';
import { Meeting, MeetingType, MeetingLocation, MeetingRecurrence } from '../../../domain/entities/meeting.entity';
import { IMeetingRepository } from '../../interfaces/repositories/meeting.repository.interface';
import { EventBus } from '../../../01-shared/lib/event-bus';
import type { MeetingId, UserId, BoardId, OrganizationId } from '../../../types/core';

export interface ScheduleMeetingInput {
  title: string;
  description?: string;
  type: MeetingType;
  boardId: BoardId;
  organizationId: OrganizationId;
  scheduledStart: Date;
  scheduledEnd: Date;
  location: MeetingLocation;
  attendees: Array<{
    userId: UserId;
    role: 'chair' | 'secretary' | 'member' | 'observer' | 'guest';
  }>;
  agendaItems?: Array<{
    title: string;
    description?: string;
    presenter?: UserId;
    duration?: number;
    attachments?: string[];
  }>;
  quorumRequired: number;
  chairperson?: UserId;
  secretary?: UserId;
  recurrence?: MeetingRecurrence;
  tags?: string[];
  sendInvitations?: boolean;
  checkConflicts?: boolean;
}

/**
 * Schedule Meeting Command
 */
export class ScheduleMeetingCommand implements Command<Meeting> {
  readonly commandType = 'ScheduleMeeting';
  readonly commandId = this.generateCommandId();
  readonly commandName = 'ScheduleMeeting';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      input: ScheduleMeetingInput;
      scheduledBy: UserId;
    }
  ) {
    this.userId = payload.scheduledBy;
  }

  private generateCommandId(): string {
    return `cmd_schedule_meeting_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    const { input } = this.payload;

    if (!input.title || input.title.trim().length === 0) {
      return ResultUtils.fail(new Error('Meeting title is required'));
    }

    if (input.scheduledEnd <= input.scheduledStart) {
      return ResultUtils.fail(new Error('Meeting end time must be after start time'));
    }

    const duration = (input.scheduledEnd.getTime() - input.scheduledStart.getTime()) / (1000 * 60);
    if (duration < 15) {
      return ResultUtils.fail(new Error('Meeting must be at least 15 minutes long'));
    }

    if (!input.attendees || input.attendees.length === 0) {
      return ResultUtils.fail(new Error('At least one attendee is required'));
    }

    if (input.quorumRequired > input.attendees.length) {
      return ResultUtils.fail(new Error('Quorum cannot exceed number of attendees'));
    }

    // Validate location
    if (input.location.type === 'virtual' || input.location.type === 'hybrid') {
      if (!input.location.virtualLink) {
        return ResultUtils.fail(new Error('Virtual meeting link is required'));
      }
    }

    if (input.location.type === 'physical' || input.location.type === 'hybrid') {
      if (!input.location.physicalAddress) {
        return ResultUtils.fail(new Error('Physical address is required'));
      }
    }

    return ResultUtils.ok(undefined);
  }

  toJSON() {
    return {
      commandName: this.commandName,
      timestamp: this.timestamp,
      payload: this.payload
    };
  }
}

/**
 * Schedule Meeting Command Handler
 */
export class ScheduleMeetingCommandHandler {
  constructor(
    private readonly meetingRepository: IMeetingRepository,
    private readonly eventBus?: EventBus
  ) {}

  async handle(command: ScheduleMeetingCommand): Promise<Result<Meeting>> {
    // Validate command
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    const { input, scheduledBy } = command.payload;

    console.log('[ScheduleMeetingCommand] Executing:', {
      title: input.title,
      type: input.type,
      scheduledStart: input.scheduledStart,
      attendeeCount: input.attendees.length
    });

    try {
      // Check for conflicts if requested
      if (input.checkConflicts) {
        const attendeeIds = input.attendees.map(a => a.userId);
        const conflictsResult = await this.meetingRepository.findConflicts(
          input.scheduledStart,
          input.scheduledEnd,
          attendeeIds
        );

        if (conflictsResult.success && conflictsResult.data.length > 0) {
          console.warn('[ScheduleMeetingCommand] Conflicts found:', conflictsResult.data.length);
          // Could return error or just warn depending on business rules
        }
      }

      // Generate meeting ID
      const meetingId = this.generateMeetingId();

      // Create meeting entity
      const meetingResult = Meeting.create({
        id: meetingId,
        title: input.title,
        description: input.description,
        type: input.type,
        boardId: input.boardId,
        organizationId: input.organizationId,
        scheduledStart: input.scheduledStart,
        scheduledEnd: input.scheduledEnd,
        location: input.location,
        attendees: input.attendees,
        agendaItems: input.agendaItems,
        quorumRequired: input.quorumRequired,
        createdBy: scheduledBy,
        chairperson: input.chairperson,
        secretary: input.secretary,
        recurrence: input.recurrence,
        tags: input.tags
      });

      if (!meetingResult.success) {
        return meetingResult;
      }

      const meeting = meetingResult.data;

      // Save to repository
      const saveResult = await this.meetingRepository.create(meeting);
      if (!saveResult.success) {
        console.error('[ScheduleMeetingCommand] Failed to save:', saveResult.error);
        return saveResult;
      }

      // Publish events
      if (this.eventBus) {
        await meeting.publishDomainEvents(this.eventBus);

        // Emit meeting scheduled event for handlers
        await this.eventBus.publish({
          eventName: 'MeetingScheduled',
          aggregateId: meeting.id,
          payload: {
            meetingId: meeting.id,
            title: meeting.title,
            type: meeting.type,
            scheduledStart: meeting.scheduledStart,
            scheduledEnd: meeting.scheduledEnd,
            location: meeting.location,
            attendees: meeting.attendees,
            organizationId: meeting.organizationId,
            boardId: meeting.boardId,
            sendInvitations: input.sendInvitations
          }
        });
      }

      console.log('[ScheduleMeetingCommand] Success:', {
        meetingId: saveResult.data.id,
        title: saveResult.data.title
      });

      return saveResult;
    } catch (error) {
      console.error('[ScheduleMeetingCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to schedule meeting')
      );
    }
  }

  private generateMeetingId(): MeetingId {
    return `meeting_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` as MeetingId;
  }
}

/**
 * Factory function to create handler with dependencies
 */
export function createScheduleMeetingCommandHandler(dependencies: {
  meetingRepository: IMeetingRepository;
  eventBus?: EventBus;
}): ScheduleMeetingCommandHandler {
  return new ScheduleMeetingCommandHandler(
    dependencies.meetingRepository,
    dependencies.eventBus
  );
}