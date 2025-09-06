/**
 * Create Board Command
 * CQRS Command for creating a new board
 */

import { Command } from '../command-bus';
import { Result } from '../../../01-shared/types/core.types';
import { ResultUtils } from '../../../01-shared/lib/result';
import { Board, BoardType, BoardSettings } from '../../../domain/entities/board.entity';
import { IBoardRepository } from '../../interfaces/repositories/board.repository.interface';
import { EventBus } from '../../../01-shared/lib/event-bus';
import type { BoardId, UserId, OrganizationId } from '../../../types/core';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create Board Command
 */
export class CreateBoardCommand implements Command<Board> {
  readonly commandType = 'CreateBoard';
  readonly commandId = this.generateCommandId();

  constructor(
    public readonly payload: {
      name: string;
      organizationId: OrganizationId;
      boardType?: BoardType;
      description?: string;
      settings?: Partial<BoardSettings['props']>;
      termLength?: number; // in months
      initialMembers?: Array<{
        userId: UserId;
        role: string;
        isVotingMember?: boolean;
      }>;
      createdBy: UserId;
    }
  ) {}

  private generateCommandId(): string {
    return `cmd_create_board_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.name || this.payload.name.trim().length < 3) {
      return ResultUtils.fail(new Error('Board name must be at least 3 characters'));
    }

    if (this.payload.name.length > 100) {
      return ResultUtils.fail(new Error('Board name cannot exceed 100 characters'));
    }

    if (!this.payload.organizationId) {
      return ResultUtils.fail(new Error('Organization ID is required'));
    }

    if (!this.payload.createdBy) {
      return ResultUtils.fail(new Error('Creator ID is required'));
    }

    if (this.payload.termLength && this.payload.termLength < 1) {
      return ResultUtils.fail(new Error('Term length must be at least 1 month'));
    }

    if (this.payload.settings) {
      const { minQuorum, maxMembers } = this.payload.settings;
      if (minQuorum && maxMembers && minQuorum > maxMembers) {
        return ResultUtils.fail(new Error('Minimum quorum cannot exceed maximum members'));
      }
      if (minQuorum && minQuorum < 2) {
        return ResultUtils.fail(new Error('Minimum quorum must be at least 2'));
      }
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Create Board Command Handler
 */
export class CreateBoardCommandHandler {
  constructor(
    private readonly boardRepository: IBoardRepository,
    private readonly eventBus: EventBus
  ) {}

  async handle(command: CreateBoardCommand): Promise<Result<Board>> {
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[CreateBoardCommand] Executing:', {
      name: command.payload.name,
      organizationId: command.payload.organizationId,
      createdBy: command.payload.createdBy
    });

    try {
      // Check if board name already exists in organization
      const nameExistsResult = await this.boardRepository.nameExists(
        command.payload.name,
        command.payload.organizationId
      );
      
      if (!nameExistsResult.success) {
        return nameExistsResult;
      }

      if (nameExistsResult.data) {
        return ResultUtils.fail(new Error('A board with this name already exists in the organization'));
      }

      // Generate board ID
      const boardId = `board_${uuidv4()}` as BoardId;

      // Create the board entity
      const boardResult = Board.create(
        boardId,
        command.payload.name,
        command.payload.organizationId,
        command.payload.createdBy,
        command.payload.boardType,
        command.payload.description,
        command.payload.settings,
        command.payload.termLength
      );

      if (!boardResult.success) {
        return boardResult;
      }

      const board = boardResult.data;

      // Add initial members if provided
      if (command.payload.initialMembers && command.payload.initialMembers.length > 0) {
        for (const member of command.payload.initialMembers) {
          // Skip the creator as they're already added as chairman
          if (member.userId === command.payload.createdBy) {
            continue;
          }

          const addMemberResult = board.addMember(
            member.userId,
            member.role as any,
            command.payload.createdBy,
            member.isVotingMember !== false
          );

          if (!addMemberResult.success) {
            console.warn(`[CreateBoardCommand] Failed to add member ${member.userId}:`, addMemberResult.error);
          }
        }
      }

      // Save to repository
      const saveResult = await this.boardRepository.create(board);
      if (!saveResult.success) {
        return saveResult;
      }

      // Publish domain events
      await board.publishDomainEvents(this.eventBus);

      // Publish additional creation event
      await this.eventBus.publish({
        eventType: 'BoardCreatedSuccessfully',
        aggregateId: boardId,
        eventData: {
          boardId,
          name: command.payload.name,
          organizationId: command.payload.organizationId,
          boardType: command.payload.boardType || BoardType.BOARD_OF_DIRECTORS,
          createdBy: command.payload.createdBy,
          memberCount: board.getMemberCount(),
          hasQuorum: board.hasQuorum()
        },
        occurredAt: new Date()
      });

      console.log('[CreateBoardCommand] Success:', {
        boardId: board.id,
        name: board.getName(),
        memberCount: board.getMemberCount()
      });

      return ResultUtils.ok(saveResult.data);
    } catch (error) {
      console.error('[CreateBoardCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to create board')
      );
    }
  }
}

/**
 * Factory function to create command handler with dependencies
 */
export function createCreateBoardCommandHandler(dependencies: {
  boardRepository: IBoardRepository;
  eventBus: EventBus;
}): CreateBoardCommandHandler {
  return new CreateBoardCommandHandler(dependencies.boardRepository, dependencies.eventBus);
}