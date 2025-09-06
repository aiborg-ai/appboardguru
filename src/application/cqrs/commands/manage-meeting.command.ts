/**
 * Manage Meeting Commands
 * CQRS Commands for managing meeting lifecycle
 */

import { Command } from '../command-bus';
import { Result } from '../../../01-shared/types/core.types';
import { ResultUtils } from '../../../01-shared/lib/result';
import { Meeting, AttendanceStatus } from '../../../domain/entities/meeting.entity';
import { IMeetingRepository } from '../../interfaces/repositories/meeting.repository.interface';
import { EventBus } from '../../../01-shared/lib/event-bus';
import type { MeetingId, UserId } from '../../../types/core';

/**
 * Start Meeting Command
 */
export class StartMeetingCommand implements Command<Meeting> {
  readonly commandType = 'StartMeeting';
  readonly commandId = this.generateCommandId();
  readonly commandName = 'StartMeeting';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      meetingId: MeetingId;
      startedBy: UserId;
    }
  ) {
    this.userId = payload.startedBy;
  }

  private generateCommandId(): string {
    return `cmd_start_meeting_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.meetingId) {
      return ResultUtils.fail(new Error('Meeting ID is required'));
    }

    if (!this.payload.startedBy) {
      return ResultUtils.fail(new Error('User ID is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Start Meeting Command Handler
 */
export class StartMeetingCommandHandler {
  constructor(
    private readonly meetingRepository: IMeetingRepository,
    private readonly eventBus?: EventBus
  ) {}

  async handle(command: StartMeetingCommand): Promise<Result<Meeting>> {
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[StartMeetingCommand] Executing:', {
      meetingId: command.payload.meetingId,
      startedBy: command.payload.startedBy
    });

    try {
      // Get meeting
      const meetingResult = await this.meetingRepository.findById(command.payload.meetingId);
      if (!meetingResult.success) {
        return meetingResult;
      }

      const meeting = meetingResult.data;

      // Check if user is authorized to start the meeting
      if (!meeting.isChairperson(command.payload.startedBy) && 
          !meeting.isSecretary(command.payload.startedBy)) {
        return ResultUtils.fail(new Error('Only chairperson or secretary can start the meeting'));
      }

      // Start the meeting
      const startResult = meeting.startMeeting();
      if (!startResult.success) {
        return startResult;
      }

      // Save the updated meeting
      const saveResult = await this.meetingRepository.update(meeting);
      if (!saveResult.success) {
        return saveResult;
      }

      // Publish events
      if (this.eventBus) {
        await meeting.publishDomainEvents(this.eventBus);
      }

      console.log('[StartMeetingCommand] Success:', {
        meetingId: meeting.id,
        status: meeting.status
      });

      return ResultUtils.ok(meeting);
    } catch (error) {
      console.error('[StartMeetingCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to start meeting')
      );
    }
  }
}

/**
 * End Meeting Command
 */
export class EndMeetingCommand implements Command<Meeting> {
  readonly commandType = 'EndMeeting';
  readonly commandId = this.generateCommandId();
  readonly commandName = 'EndMeeting';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      meetingId: MeetingId;
      endedBy: UserId;
    }
  ) {
    this.userId = payload.endedBy;
  }

  private generateCommandId(): string {
    return `cmd_end_meeting_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.meetingId) {
      return ResultUtils.fail(new Error('Meeting ID is required'));
    }

    if (!this.payload.endedBy) {
      return ResultUtils.fail(new Error('User ID is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * End Meeting Command Handler
 */
export class EndMeetingCommandHandler {
  constructor(
    private readonly meetingRepository: IMeetingRepository,
    private readonly eventBus?: EventBus
  ) {}

  async handle(command: EndMeetingCommand): Promise<Result<Meeting>> {
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[EndMeetingCommand] Executing:', {
      meetingId: command.payload.meetingId,
      endedBy: command.payload.endedBy
    });

    try {
      // Get meeting
      const meetingResult = await this.meetingRepository.findById(command.payload.meetingId);
      if (!meetingResult.success) {
        return meetingResult;
      }

      const meeting = meetingResult.data;

      // Check if user is authorized to end the meeting
      if (!meeting.isChairperson(command.payload.endedBy) && 
          !meeting.isSecretary(command.payload.endedBy)) {
        return ResultUtils.fail(new Error('Only chairperson or secretary can end the meeting'));
      }

      // End the meeting
      const endResult = meeting.endMeeting();
      if (!endResult.success) {
        return endResult;
      }

      // Save the updated meeting
      const saveResult = await this.meetingRepository.update(meeting);
      if (!saveResult.success) {
        return saveResult;
      }

      // Publish events
      if (this.eventBus) {
        await meeting.publishDomainEvents(this.eventBus);
      }

      console.log('[EndMeetingCommand] Success:', {
        meetingId: meeting.id,
        status: meeting.status
      });

      return ResultUtils.ok(meeting);
    } catch (error) {
      console.error('[EndMeetingCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to end meeting')
      );
    }
  }
}

/**
 * Cancel Meeting Command
 */
export class CancelMeetingCommand implements Command<Meeting> {
  readonly commandType = 'CancelMeeting';
  readonly commandId = this.generateCommandId();
  readonly commandName = 'CancelMeeting';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      meetingId: MeetingId;
      cancelledBy: UserId;
      reason: string;
      notifyAttendees?: boolean;
    }
  ) {
    this.userId = payload.cancelledBy;
  }

  private generateCommandId(): string {
    return `cmd_cancel_meeting_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.meetingId) {
      return ResultUtils.fail(new Error('Meeting ID is required'));
    }

    if (!this.payload.cancelledBy) {
      return ResultUtils.fail(new Error('User ID is required'));
    }

    if (!this.payload.reason || this.payload.reason.trim().length === 0) {
      return ResultUtils.fail(new Error('Cancellation reason is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Cancel Meeting Command Handler
 */
export class CancelMeetingCommandHandler {
  constructor(
    private readonly meetingRepository: IMeetingRepository,
    private readonly eventBus?: EventBus
  ) {}

  async handle(command: CancelMeetingCommand): Promise<Result<Meeting>> {
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[CancelMeetingCommand] Executing:', {
      meetingId: command.payload.meetingId,
      cancelledBy: command.payload.cancelledBy,
      reason: command.payload.reason
    });

    try {
      // Get meeting
      const meetingResult = await this.meetingRepository.findById(command.payload.meetingId);
      if (!meetingResult.success) {
        return meetingResult;
      }

      const meeting = meetingResult.data;

      // Check if user is authorized to cancel the meeting
      if (!meeting.isChairperson(command.payload.cancelledBy) && 
          meeting.createdBy !== command.payload.cancelledBy) {
        return ResultUtils.fail(new Error('Only chairperson or meeting creator can cancel the meeting'));
      }

      // Cancel the meeting
      const cancelResult = meeting.cancelMeeting(command.payload.reason);
      if (!cancelResult.success) {
        return cancelResult;
      }

      // Save the updated meeting
      const saveResult = await this.meetingRepository.update(meeting);
      if (!saveResult.success) {
        return saveResult;
      }

      // Publish events
      if (this.eventBus) {
        await meeting.publishDomainEvents(this.eventBus);

        if (command.payload.notifyAttendees) {
          await this.eventBus.publish({
            eventName: 'MeetingCancelledNotification',
            aggregateId: meeting.id,
            payload: {
              meetingId: meeting.id,
              title: meeting.title,
              scheduledStart: meeting.scheduledStart,
              reason: command.payload.reason,
              attendees: meeting.attendees.map(a => a.userId)
            }
          });
        }
      }

      console.log('[CancelMeetingCommand] Success:', {
        meetingId: meeting.id,
        status: meeting.status
      });

      return ResultUtils.ok(meeting);
    } catch (error) {
      console.error('[CancelMeetingCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to cancel meeting')
      );
    }
  }
}

/**
 * Update Attendee Status Command
 */
export class UpdateAttendeeStatusCommand implements Command<void> {
  readonly commandType = 'UpdateAttendeeStatus';
  readonly commandId = this.generateCommandId();
  readonly commandName = 'UpdateAttendeeStatus';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      meetingId: MeetingId;
      attendeeId: UserId;
      status: AttendanceStatus;
    }
  ) {
    this.userId = payload.attendeeId;
  }

  private generateCommandId(): string {
    return `cmd_update_attendee_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.meetingId) {
      return ResultUtils.fail(new Error('Meeting ID is required'));
    }

    if (!this.payload.attendeeId) {
      return ResultUtils.fail(new Error('Attendee ID is required'));
    }

    if (!this.payload.status) {
      return ResultUtils.fail(new Error('Status is required'));
    }

    const validStatuses: AttendanceStatus[] = ['pending', 'accepted', 'declined', 'tentative', 'attended', 'absent'];
    if (!validStatuses.includes(this.payload.status)) {
      return ResultUtils.fail(new Error('Invalid attendance status'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Update Attendee Status Command Handler
 */
export class UpdateAttendeeStatusCommandHandler {
  constructor(
    private readonly meetingRepository: IMeetingRepository,
    private readonly eventBus?: EventBus
  ) {}

  async handle(command: UpdateAttendeeStatusCommand): Promise<Result<void>> {
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[UpdateAttendeeStatusCommand] Executing:', {
      meetingId: command.payload.meetingId,
      attendeeId: command.payload.attendeeId,
      status: command.payload.status
    });

    try {
      // Get meeting
      const meetingResult = await this.meetingRepository.findById(command.payload.meetingId);
      if (!meetingResult.success) {
        return ResultUtils.fail(new Error('Meeting not found'));
      }

      const meeting = meetingResult.data;

      // Check if user is an attendee
      if (!meeting.isAttendee(command.payload.attendeeId)) {
        return ResultUtils.fail(new Error('User is not an attendee of this meeting'));
      }

      // Update attendee status
      const updateResult = meeting.updateAttendeeStatus(
        command.payload.attendeeId,
        command.payload.status
      );
      
      if (!updateResult.success) {
        return updateResult;
      }

      // Save the updated meeting
      const saveResult = await this.meetingRepository.update(meeting);
      if (!saveResult.success) {
        return ResultUtils.fail(new Error('Failed to save meeting'));
      }

      // Publish events
      if (this.eventBus) {
        await meeting.publishDomainEvents(this.eventBus);
      }

      console.log('[UpdateAttendeeStatusCommand] Success:', {
        meetingId: meeting.id,
        attendeeId: command.payload.attendeeId,
        newStatus: command.payload.status
      });

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[UpdateAttendeeStatusCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to update attendee status')
      );
    }
  }
}

/**
 * Add Meeting Minutes Command
 */
export class AddMeetingMinutesCommand implements Command<Meeting> {
  readonly commandType = 'AddMeetingMinutes';
  readonly commandId = this.generateCommandId();
  readonly commandName = 'AddMeetingMinutes';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      meetingId: MeetingId;
      preparedBy: UserId;
      content: string;
      keyDecisions: string[];
      actionItems: Array<{
        description: string;
        assignee: UserId;
        dueDate?: Date;
        status: 'pending' | 'in_progress' | 'completed';
      }>;
      nextMeetingDate?: Date;
      attachments?: string[];
    }
  ) {
    this.userId = payload.preparedBy;
  }

  private generateCommandId(): string {
    return `cmd_add_minutes_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.meetingId) {
      return ResultUtils.fail(new Error('Meeting ID is required'));
    }

    if (!this.payload.preparedBy) {
      return ResultUtils.fail(new Error('Prepared by user ID is required'));
    }

    if (!this.payload.content || this.payload.content.trim().length === 0) {
      return ResultUtils.fail(new Error('Minutes content is required'));
    }

    if (!this.payload.keyDecisions || this.payload.keyDecisions.length === 0) {
      return ResultUtils.fail(new Error('At least one key decision is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Add Meeting Minutes Command Handler
 */
export class AddMeetingMinutesCommandHandler {
  constructor(
    private readonly meetingRepository: IMeetingRepository,
    private readonly eventBus?: EventBus
  ) {}

  async handle(command: AddMeetingMinutesCommand): Promise<Result<Meeting>> {
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[AddMeetingMinutesCommand] Executing:', {
      meetingId: command.payload.meetingId,
      preparedBy: command.payload.preparedBy
    });

    try {
      // Get meeting
      const meetingResult = await this.meetingRepository.findById(command.payload.meetingId);
      if (!meetingResult.success) {
        return meetingResult;
      }

      const meeting = meetingResult.data;

      // Check if user is authorized to add minutes
      if (!meeting.isSecretary(command.payload.preparedBy) && 
          !meeting.isChairperson(command.payload.preparedBy)) {
        return ResultUtils.fail(new Error('Only secretary or chairperson can add minutes'));
      }

      // Add minutes to the meeting
      const addMinutesResult = meeting.addMinutes({
        preparedBy: command.payload.preparedBy,
        content: command.payload.content,
        keyDecisions: command.payload.keyDecisions,
        actionItems: command.payload.actionItems,
        nextMeetingDate: command.payload.nextMeetingDate,
        attachments: command.payload.attachments
      });

      if (!addMinutesResult.success) {
        return addMinutesResult;
      }

      // Save the updated meeting
      const saveResult = await this.meetingRepository.update(meeting);
      if (!saveResult.success) {
        return saveResult;
      }

      // Publish events
      if (this.eventBus) {
        await meeting.publishDomainEvents(this.eventBus);
      }

      console.log('[AddMeetingMinutesCommand] Success:', {
        meetingId: meeting.id,
        minutesAdded: true
      });

      return ResultUtils.ok(meeting);
    } catch (error) {
      console.error('[AddMeetingMinutesCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to add meeting minutes')
      );
    }
  }
}

/**
 * Factory functions to create command handlers with dependencies
 */
export function createStartMeetingCommandHandler(dependencies: {
  meetingRepository: IMeetingRepository;
  eventBus?: EventBus;
}): StartMeetingCommandHandler {
  return new StartMeetingCommandHandler(
    dependencies.meetingRepository,
    dependencies.eventBus
  );
}

export function createEndMeetingCommandHandler(dependencies: {
  meetingRepository: IMeetingRepository;
  eventBus?: EventBus;
}): EndMeetingCommandHandler {
  return new EndMeetingCommandHandler(
    dependencies.meetingRepository,
    dependencies.eventBus
  );
}

export function createCancelMeetingCommandHandler(dependencies: {
  meetingRepository: IMeetingRepository;
  eventBus?: EventBus;
}): CancelMeetingCommandHandler {
  return new CancelMeetingCommandHandler(
    dependencies.meetingRepository,
    dependencies.eventBus
  );
}

export function createUpdateAttendeeStatusCommandHandler(dependencies: {
  meetingRepository: IMeetingRepository;
  eventBus?: EventBus;
}): UpdateAttendeeStatusCommandHandler {
  return new UpdateAttendeeStatusCommandHandler(
    dependencies.meetingRepository,
    dependencies.eventBus
  );
}

export function createAddMeetingMinutesCommandHandler(dependencies: {
  meetingRepository: IMeetingRepository;
  eventBus?: EventBus;
}): AddMeetingMinutesCommandHandler {
  return new AddMeetingMinutesCommandHandler(
    dependencies.meetingRepository,
    dependencies.eventBus
  );
}