/**
 * Board Management Commands
 * CQRS Commands for managing boards
 */

import { Command } from '../command-bus';
import { Result } from '../../../01-shared/types/core.types';
import { ResultUtils } from '../../../01-shared/lib/result';
import { Board, BoardStatus, BoardMemberRole, Committee } from '../../../domain/entities/board.entity';
import { IBoardRepository } from '../../interfaces/repositories/board.repository.interface';
import { EventBus } from '../../../01-shared/lib/event-bus';
import type { BoardId, UserId } from '../../../types/core';
import { v4 as uuidv4 } from 'uuid';

/**
 * Update Board Command
 */
export class UpdateBoardCommand implements Command<Board> {
  readonly commandType = 'UpdateBoard';
  readonly commandId = this.generateCommandId();

  constructor(
    public readonly payload: {
      boardId: BoardId;
      updates: {
        name?: string;
        description?: string;
        settings?: any;
        nextMeetingDate?: Date;
      };
      updatedBy: UserId;
    }
  ) {}

  private generateCommandId(): string {
    return `cmd_update_board_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.boardId) {
      return ResultUtils.fail(new Error('Board ID is required'));
    }

    if (!this.payload.updatedBy) {
      return ResultUtils.fail(new Error('Updater ID is required'));
    }

    if (!this.payload.updates || Object.keys(this.payload.updates).length === 0) {
      return ResultUtils.fail(new Error('No updates provided'));
    }

    if (this.payload.updates.name && this.payload.updates.name.trim().length < 3) {
      return ResultUtils.fail(new Error('Board name must be at least 3 characters'));
    }

    if (this.payload.updates.nextMeetingDate && this.payload.updates.nextMeetingDate <= new Date()) {
      return ResultUtils.fail(new Error('Meeting date must be in the future'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Update Board Command Handler
 */
export class UpdateBoardCommandHandler {
  constructor(
    private readonly boardRepository: IBoardRepository,
    private readonly eventBus: EventBus
  ) {}

  async handle(command: UpdateBoardCommand): Promise<Result<Board>> {
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[UpdateBoardCommand] Executing:', {
      boardId: command.payload.boardId,
      updatedBy: command.payload.updatedBy
    });

    try {
      // Get the board
      const boardResult = await this.boardRepository.findById(command.payload.boardId);
      if (!boardResult.success) {
        return boardResult;
      }

      const board = boardResult.data;

      // Check if updater is a board member with appropriate role
      const member = board.getMember(command.payload.updatedBy);
      if (!member || (!member.isLeadership() && member.role !== BoardMemberRole.MEMBER)) {
        return ResultUtils.fail(new Error('Insufficient permissions to update board'));
      }

      // Apply updates
      if (command.payload.updates.settings) {
        const updateSettingsResult = board.updateSettings(
          command.payload.updates.settings,
          command.payload.updatedBy
        );
        if (!updateSettingsResult.success) {
          return ResultUtils.fail(updateSettingsResult.error);
        }
      }

      if (command.payload.updates.nextMeetingDate) {
        const scheduleMeetingResult = board.scheduleNextMeeting(
          command.payload.updates.nextMeetingDate,
          command.payload.updatedBy
        );
        if (!scheduleMeetingResult.success) {
          return ResultUtils.fail(scheduleMeetingResult.error);
        }
      }

      // Save to repository
      const saveResult = await this.boardRepository.update(command.payload.boardId, board);
      if (!saveResult.success) {
        return saveResult;
      }

      // Publish domain events
      await board.publishDomainEvents(this.eventBus);

      console.log('[UpdateBoardCommand] Success:', {
        boardId: board.id,
        updatedFields: Object.keys(command.payload.updates)
      });

      return ResultUtils.ok(saveResult.data);
    } catch (error) {
      console.error('[UpdateBoardCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to update board')
      );
    }
  }
}

/**
 * Archive Board Command
 */
export class ArchiveBoardCommand implements Command<void> {
  readonly commandType = 'ArchiveBoard';
  readonly commandId = this.generateCommandId();

  constructor(
    public readonly payload: {
      boardId: BoardId;
      reason: string;
      archivedBy: UserId;
    }
  ) {}

  private generateCommandId(): string {
    return `cmd_archive_board_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.boardId) {
      return ResultUtils.fail(new Error('Board ID is required'));
    }

    if (!this.payload.reason || this.payload.reason.trim().length < 10) {
      return ResultUtils.fail(new Error('Archive reason must be at least 10 characters'));
    }

    if (!this.payload.archivedBy) {
      return ResultUtils.fail(new Error('Archiver ID is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Archive Board Command Handler
 */
export class ArchiveBoardCommandHandler {
  constructor(
    private readonly boardRepository: IBoardRepository,
    private readonly eventBus: EventBus
  ) {}

  async handle(command: ArchiveBoardCommand): Promise<Result<void>> {
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[ArchiveBoardCommand] Executing:', {
      boardId: command.payload.boardId,
      archivedBy: command.payload.archivedBy
    });

    try {
      // Get the board
      const boardResult = await this.boardRepository.findById(command.payload.boardId);
      if (!boardResult.success) {
        return ResultUtils.fail(boardResult.error);
      }

      const board = boardResult.data;

      // Check if archiver is a board chairman or admin
      const member = board.getMember(command.payload.archivedBy);
      if (!member || member.role !== BoardMemberRole.CHAIRMAN) {
        return ResultUtils.fail(new Error('Only the chairman can archive the board'));
      }

      // Archive the board
      const archiveResult = board.archive(command.payload.archivedBy, command.payload.reason);
      if (!archiveResult.success) {
        return archiveResult;
      }

      // Save to repository
      const saveResult = await this.boardRepository.update(command.payload.boardId, board);
      if (!saveResult.success) {
        return ResultUtils.fail(saveResult.error);
      }

      // Publish domain events
      await board.publishDomainEvents(this.eventBus);

      console.log('[ArchiveBoardCommand] Success:', {
        boardId: board.id
      });

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[ArchiveBoardCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to archive board')
      );
    }
  }
}

/**
 * Add Board Member Command
 */
export class AddBoardMemberCommand implements Command<void> {
  readonly commandType = 'AddBoardMember';
  readonly commandId = this.generateCommandId();

  constructor(
    public readonly payload: {
      boardId: BoardId;
      userId: UserId;
      role: BoardMemberRole;
      isVotingMember?: boolean;
      committees?: string[];
      termEndDate?: Date;
      addedBy: UserId;
    }
  ) {}

  private generateCommandId(): string {
    return `cmd_add_board_member_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.boardId) {
      return ResultUtils.fail(new Error('Board ID is required'));
    }

    if (!this.payload.userId) {
      return ResultUtils.fail(new Error('User ID is required'));
    }

    if (!this.payload.role) {
      return ResultUtils.fail(new Error('Member role is required'));
    }

    if (!this.payload.addedBy) {
      return ResultUtils.fail(new Error('Adder ID is required'));
    }

    if (this.payload.termEndDate && this.payload.termEndDate <= new Date()) {
      return ResultUtils.fail(new Error('Term end date must be in the future'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Add Board Member Command Handler
 */
export class AddBoardMemberCommandHandler {
  constructor(
    private readonly boardRepository: IBoardRepository,
    private readonly eventBus: EventBus
  ) {}

  async handle(command: AddBoardMemberCommand): Promise<Result<void>> {
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[AddBoardMemberCommand] Executing:', {
      boardId: command.payload.boardId,
      userId: command.payload.userId,
      role: command.payload.role
    });

    try {
      // Get the board
      const boardResult = await this.boardRepository.findById(command.payload.boardId);
      if (!boardResult.success) {
        return ResultUtils.fail(boardResult.error);
      }

      const board = boardResult.data;

      // Check if adder has permission (chairman or secretary)
      const adder = board.getMember(command.payload.addedBy);
      if (!adder || (adder.role !== BoardMemberRole.CHAIRMAN && adder.role !== BoardMemberRole.SECRETARY)) {
        return ResultUtils.fail(new Error('Only chairman or secretary can add members'));
      }

      // Check if user can be added
      const canAddResult = await this.boardRepository.canAddMember(
        command.payload.boardId,
        command.payload.userId
      );
      if (!canAddResult.success || !canAddResult.data) {
        return ResultUtils.fail(new Error('User cannot be added to this board'));
      }

      // Add the member
      const addMemberResult = board.addMember(
        command.payload.userId,
        command.payload.role,
        command.payload.addedBy,
        command.payload.isVotingMember !== false
      );
      if (!addMemberResult.success) {
        return addMemberResult;
      }

      // Save to repository
      const saveResult = await this.boardRepository.update(command.payload.boardId, board);
      if (!saveResult.success) {
        return ResultUtils.fail(saveResult.error);
      }

      // Publish domain events
      await board.publishDomainEvents(this.eventBus);

      console.log('[AddBoardMemberCommand] Success:', {
        boardId: board.id,
        userId: command.payload.userId,
        role: command.payload.role
      });

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[AddBoardMemberCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to add board member')
      );
    }
  }
}

/**
 * Remove Board Member Command
 */
export class RemoveBoardMemberCommand implements Command<void> {
  readonly commandType = 'RemoveBoardMember';
  readonly commandId = this.generateCommandId();

  constructor(
    public readonly payload: {
      boardId: BoardId;
      userId: UserId;
      reason: string;
      removedBy: UserId;
    }
  ) {}

  private generateCommandId(): string {
    return `cmd_remove_board_member_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.boardId) {
      return ResultUtils.fail(new Error('Board ID is required'));
    }

    if (!this.payload.userId) {
      return ResultUtils.fail(new Error('User ID is required'));
    }

    if (!this.payload.reason || this.payload.reason.trim().length < 5) {
      return ResultUtils.fail(new Error('Removal reason must be at least 5 characters'));
    }

    if (!this.payload.removedBy) {
      return ResultUtils.fail(new Error('Remover ID is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Remove Board Member Command Handler
 */
export class RemoveBoardMemberCommandHandler {
  constructor(
    private readonly boardRepository: IBoardRepository,
    private readonly eventBus: EventBus
  ) {}

  async handle(command: RemoveBoardMemberCommand): Promise<Result<void>> {
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[RemoveBoardMemberCommand] Executing:', {
      boardId: command.payload.boardId,
      userId: command.payload.userId
    });

    try {
      // Get the board
      const boardResult = await this.boardRepository.findById(command.payload.boardId);
      if (!boardResult.success) {
        return ResultUtils.fail(boardResult.error);
      }

      const board = boardResult.data;

      // Check if remover has permission (chairman only)
      const remover = board.getMember(command.payload.removedBy);
      if (!remover || remover.role !== BoardMemberRole.CHAIRMAN) {
        return ResultUtils.fail(new Error('Only chairman can remove members'));
      }

      // Remove the member
      const removeMemberResult = board.removeMember(
        command.payload.userId,
        command.payload.removedBy,
        command.payload.reason
      );
      if (!removeMemberResult.success) {
        return removeMemberResult;
      }

      // Save to repository
      const saveResult = await this.boardRepository.update(command.payload.boardId, board);
      if (!saveResult.success) {
        return ResultUtils.fail(saveResult.error);
      }

      // Publish domain events
      await board.publishDomainEvents(this.eventBus);

      console.log('[RemoveBoardMemberCommand] Success:', {
        boardId: board.id,
        userId: command.payload.userId
      });

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[RemoveBoardMemberCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to remove board member')
      );
    }
  }
}

/**
 * Create Committee Command
 */
export class CreateCommitteeCommand implements Command<void> {
  readonly commandType = 'CreateCommittee';
  readonly commandId = this.generateCommandId();

  constructor(
    public readonly payload: {
      boardId: BoardId;
      name: string;
      description: string;
      chairUserId: UserId;
      memberUserIds: UserId[];
      createdBy: UserId;
    }
  ) {}

  private generateCommandId(): string {
    return `cmd_create_committee_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.boardId) {
      return ResultUtils.fail(new Error('Board ID is required'));
    }

    if (!this.payload.name || this.payload.name.trim().length < 3) {
      return ResultUtils.fail(new Error('Committee name must be at least 3 characters'));
    }

    if (!this.payload.description || this.payload.description.trim().length < 10) {
      return ResultUtils.fail(new Error('Committee description must be at least 10 characters'));
    }

    if (!this.payload.chairUserId) {
      return ResultUtils.fail(new Error('Committee chair is required'));
    }

    if (!this.payload.memberUserIds || this.payload.memberUserIds.length === 0) {
      return ResultUtils.fail(new Error('Committee must have at least one member'));
    }

    if (!this.payload.createdBy) {
      return ResultUtils.fail(new Error('Creator ID is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Create Committee Command Handler
 */
export class CreateCommitteeCommandHandler {
  constructor(
    private readonly boardRepository: IBoardRepository,
    private readonly eventBus: EventBus
  ) {}

  async handle(command: CreateCommitteeCommand): Promise<Result<void>> {
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[CreateCommitteeCommand] Executing:', {
      boardId: command.payload.boardId,
      name: command.payload.name
    });

    try {
      // Get the board
      const boardResult = await this.boardRepository.findById(command.payload.boardId);
      if (!boardResult.success) {
        return ResultUtils.fail(boardResult.error);
      }

      const board = boardResult.data;

      // Check if creator has permission (chairman or secretary)
      const creator = board.getMember(command.payload.createdBy);
      if (!creator || (creator.role !== BoardMemberRole.CHAIRMAN && creator.role !== BoardMemberRole.SECRETARY)) {
        return ResultUtils.fail(new Error('Only chairman or secretary can create committees'));
      }

      // Generate committee ID
      const committeeId = `committee_${uuidv4()}`;

      // Create the committee
      const createCommitteeResult = board.createCommittee(
        committeeId,
        command.payload.name,
        command.payload.description,
        command.payload.chairUserId,
        command.payload.memberUserIds,
        command.payload.createdBy
      );
      if (!createCommitteeResult.success) {
        return createCommitteeResult;
      }

      // Save to repository
      const saveResult = await this.boardRepository.update(command.payload.boardId, board);
      if (!saveResult.success) {
        return ResultUtils.fail(saveResult.error);
      }

      // Publish domain events
      await board.publishDomainEvents(this.eventBus);

      console.log('[CreateCommitteeCommand] Success:', {
        boardId: board.id,
        committeeId,
        name: command.payload.name
      });

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[CreateCommitteeCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to create committee')
      );
    }
  }
}

/**
 * Conduct Election Command
 */
export class ConductElectionCommand implements Command<void> {
  readonly commandType = 'ConductElection';
  readonly commandId = this.generateCommandId();

  constructor(
    public readonly payload: {
      boardId: BoardId;
      electionDate: Date;
      conductedBy: UserId;
    }
  ) {}

  private generateCommandId(): string {
    return `cmd_conduct_election_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.boardId) {
      return ResultUtils.fail(new Error('Board ID is required'));
    }

    if (!this.payload.electionDate) {
      return ResultUtils.fail(new Error('Election date is required'));
    }

    if (!this.payload.conductedBy) {
      return ResultUtils.fail(new Error('Conductor ID is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Conduct Election Command Handler
 */
export class ConductElectionCommandHandler {
  constructor(
    private readonly boardRepository: IBoardRepository,
    private readonly eventBus: EventBus
  ) {}

  async handle(command: ConductElectionCommand): Promise<Result<void>> {
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[ConductElectionCommand] Executing:', {
      boardId: command.payload.boardId,
      electionDate: command.payload.electionDate
    });

    try {
      // Get the board
      const boardResult = await this.boardRepository.findById(command.payload.boardId);
      if (!boardResult.success) {
        return ResultUtils.fail(boardResult.error);
      }

      const board = boardResult.data;

      // Check if conductor has permission (chairman or secretary)
      const conductor = board.getMember(command.payload.conductedBy);
      if (!conductor || (conductor.role !== BoardMemberRole.CHAIRMAN && conductor.role !== BoardMemberRole.SECRETARY)) {
        return ResultUtils.fail(new Error('Only chairman or secretary can conduct elections'));
      }

      // Conduct the election
      const electionResult = board.conductElection(
        command.payload.electionDate,
        command.payload.conductedBy
      );
      if (!electionResult.success) {
        return electionResult;
      }

      // Save to repository
      const saveResult = await this.boardRepository.update(command.payload.boardId, board);
      if (!saveResult.success) {
        return ResultUtils.fail(saveResult.error);
      }

      // Publish domain events
      await board.publishDomainEvents(this.eventBus);

      console.log('[ConductElectionCommand] Success:', {
        boardId: board.id,
        electionDate: command.payload.electionDate
      });

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[ConductElectionCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to conduct election')
      );
    }
  }
}

/**
 * Factory functions to create command handlers with dependencies
 */
export function createUpdateBoardCommandHandler(dependencies: {
  boardRepository: IBoardRepository;
  eventBus: EventBus;
}): UpdateBoardCommandHandler {
  return new UpdateBoardCommandHandler(dependencies.boardRepository, dependencies.eventBus);
}

export function createArchiveBoardCommandHandler(dependencies: {
  boardRepository: IBoardRepository;
  eventBus: EventBus;
}): ArchiveBoardCommandHandler {
  return new ArchiveBoardCommandHandler(dependencies.boardRepository, dependencies.eventBus);
}

export function createAddBoardMemberCommandHandler(dependencies: {
  boardRepository: IBoardRepository;
  eventBus: EventBus;
}): AddBoardMemberCommandHandler {
  return new AddBoardMemberCommandHandler(dependencies.boardRepository, dependencies.eventBus);
}

export function createRemoveBoardMemberCommandHandler(dependencies: {
  boardRepository: IBoardRepository;
  eventBus: EventBus;
}): RemoveBoardMemberCommandHandler {
  return new RemoveBoardMemberCommandHandler(dependencies.boardRepository, dependencies.eventBus);
}

export function createCreateCommitteeCommandHandler(dependencies: {
  boardRepository: IBoardRepository;
  eventBus: EventBus;
}): CreateCommitteeCommandHandler {
  return new CreateCommitteeCommandHandler(dependencies.boardRepository, dependencies.eventBus);
}

export function createConductElectionCommandHandler(dependencies: {
  boardRepository: IBoardRepository;
  eventBus: EventBus;
}): ConductElectionCommandHandler {
  return new ConductElectionCommandHandler(dependencies.boardRepository, dependencies.eventBus);
}