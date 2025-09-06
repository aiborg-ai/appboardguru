/**
 * Board Queries
 * CQRS Queries for retrieving board information
 */

import { Query } from '../command-bus';
import { Result } from '../../../01-shared/types/core.types';
import { ResultUtils } from '../../../01-shared/lib/result';
import { Board, BoardMemberRole, Committee } from '../../../domain/entities/board.entity';
import { IBoardRepository, BoardStatistics, MemberStatistics } from '../../interfaces/repositories/board.repository.interface';
import type { BoardId, UserId, OrganizationId } from '../../../types/core';

/**
 * Get Board By ID Query
 */
export class GetBoardQuery implements Query<Board> {
  readonly queryType = 'GetBoard';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'GetBoard';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      boardId: BoardId;
      requestedBy: UserId;
    }
  ) {
    this.userId = payload.requestedBy;
  }

  private generateQueryId(): string {
    return `qry_get_board_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.boardId) {
      return ResultUtils.fail(new Error('Board ID is required'));
    }

    if (!this.payload.requestedBy) {
      return ResultUtils.fail(new Error('Requester ID is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Get Board Query Handler
 */
export class GetBoardQueryHandler {
  constructor(private readonly boardRepository: IBoardRepository) {}

  async handle(query: GetBoardQuery): Promise<Result<Board>> {
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[GetBoardQuery] Executing:', {
      boardId: query.payload.boardId,
      requestedBy: query.payload.requestedBy
    });

    try {
      // Get the board
      const boardResult = await this.boardRepository.findById(query.payload.boardId);
      if (!boardResult.success) {
        return boardResult;
      }

      const board = boardResult.data;

      // Check if requester is a board member
      const isMemberResult = await this.boardRepository.isUserBoardMember(
        query.payload.boardId,
        query.payload.requestedBy
      );

      if (!isMemberResult.success || !isMemberResult.data) {
        return ResultUtils.fail(new Error('Access denied: You are not a member of this board'));
      }

      console.log('[GetBoardQuery] Success:', {
        boardId: board.id,
        name: board.getName()
      });

      return ResultUtils.ok(board);
    } catch (error) {
      console.error('[GetBoardQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get board')
      );
    }
  }
}

/**
 * List Boards Query
 */
export class ListBoardsQuery implements Query<{ boards: Board[]; total: number }> {
  readonly queryType = 'ListBoards';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'ListBoards';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      requestedBy: UserId;
      filters?: {
        organizationId?: OrganizationId;
        status?: string | string[];
        boardType?: string | string[];
        memberUserId?: UserId;
        searchQuery?: string;
      };
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    }
  ) {
    this.userId = payload.requestedBy;
  }

  private generateQueryId(): string {
    return `qry_list_boards_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.requestedBy) {
      return ResultUtils.fail(new Error('Requester ID is required'));
    }

    if (this.payload.limit && this.payload.limit > 100) {
      return ResultUtils.fail(new Error('Limit cannot exceed 100'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * List Boards Query Handler
 */
export class ListBoardsQueryHandler {
  constructor(private readonly boardRepository: IBoardRepository) {}

  async handle(query: ListBoardsQuery): Promise<Result<{ boards: Board[]; total: number }>> {
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[ListBoardsQuery] Executing:', {
      requestedBy: query.payload.requestedBy,
      filters: query.payload.filters
    });

    try {
      // Apply filters based on user's access
      let filters = query.payload.filters || {};
      
      // If no specific filters, show boards where user is a member
      if (!filters.organizationId && !filters.memberUserId) {
        filters.memberUserId = query.payload.requestedBy;
      }

      const result = await this.boardRepository.list({
        filters: filters as any,
        sortBy: query.payload.sortBy as any,
        sortOrder: query.payload.sortOrder,
        limit: query.payload.limit || 20,
        offset: query.payload.offset || 0
      });

      if (!result.success) {
        return result;
      }

      console.log('[ListBoardsQuery] Success:', {
        count: result.data.boards.length,
        total: result.data.total
      });

      return result;
    } catch (error) {
      console.error('[ListBoardsQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to list boards')
      );
    }
  }
}

/**
 * Get My Boards Query
 */
export class GetMyBoardsQuery implements Query<Board[]> {
  readonly queryType = 'GetMyBoards';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'GetMyBoards';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      userId: UserId;
      role?: BoardMemberRole;
    }
  ) {
    this.userId = payload.userId;
  }

  private generateQueryId(): string {
    return `qry_my_boards_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.userId) {
      return ResultUtils.fail(new Error('User ID is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Get My Boards Query Handler
 */
export class GetMyBoardsQueryHandler {
  constructor(private readonly boardRepository: IBoardRepository) {}

  async handle(query: GetMyBoardsQuery): Promise<Result<Board[]>> {
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[GetMyBoardsQuery] Executing:', {
      userId: query.payload.userId,
      role: query.payload.role
    });

    try {
      const result = await this.boardRepository.findByMember(
        query.payload.userId,
        query.payload.role
      );

      if (!result.success) {
        return result;
      }

      console.log('[GetMyBoardsQuery] Success:', {
        count: result.data.length
      });

      return result;
    } catch (error) {
      console.error('[GetMyBoardsQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get user boards')
      );
    }
  }
}

/**
 * Search Boards Query
 */
export class SearchBoardsQuery implements Query<Board[]> {
  readonly queryType = 'SearchBoards';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'SearchBoards';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      searchQuery: string;
      requestedBy: UserId;
      limit?: number;
    }
  ) {
    this.userId = payload.requestedBy;
  }

  private generateQueryId(): string {
    return `qry_search_boards_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.searchQuery || this.payload.searchQuery.trim().length < 2) {
      return ResultUtils.fail(new Error('Search query must be at least 2 characters'));
    }

    if (!this.payload.requestedBy) {
      return ResultUtils.fail(new Error('Requester ID is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Search Boards Query Handler
 */
export class SearchBoardsQueryHandler {
  constructor(private readonly boardRepository: IBoardRepository) {}

  async handle(query: SearchBoardsQuery): Promise<Result<Board[]>> {
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[SearchBoardsQuery] Executing:', {
      searchQuery: query.payload.searchQuery,
      requestedBy: query.payload.requestedBy
    });

    try {
      const result = await this.boardRepository.search(
        query.payload.searchQuery,
        query.payload.limit || 10
      );

      if (!result.success) {
        return result;
      }

      // Filter to only boards where user is a member
      const userBoards = result.data.filter(board => 
        board.getMember(query.payload.requestedBy) !== undefined
      );

      console.log('[SearchBoardsQuery] Success:', {
        totalResults: result.data.length,
        userResults: userBoards.length
      });

      return ResultUtils.ok(userBoards);
    } catch (error) {
      console.error('[SearchBoardsQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to search boards')
      );
    }
  }
}

/**
 * Get Board Statistics Query
 */
export class GetBoardStatisticsQuery implements Query<BoardStatistics> {
  readonly queryType = 'GetBoardStatistics';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'GetBoardStatistics';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      requestedBy: UserId;
      organizationId?: OrganizationId;
      dateRange?: {
        from: Date;
        to: Date;
      };
    }
  ) {
    this.userId = payload.requestedBy;
  }

  private generateQueryId(): string {
    return `qry_board_stats_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.requestedBy) {
      return ResultUtils.fail(new Error('Requester ID is required'));
    }

    if (this.payload.dateRange) {
      if (this.payload.dateRange.from >= this.payload.dateRange.to) {
        return ResultUtils.fail(new Error('Invalid date range'));
      }
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Get Board Statistics Query Handler
 */
export class GetBoardStatisticsQueryHandler {
  constructor(private readonly boardRepository: IBoardRepository) {}

  async handle(query: GetBoardStatisticsQuery): Promise<Result<BoardStatistics>> {
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[GetBoardStatisticsQuery] Executing:', {
      requestedBy: query.payload.requestedBy,
      organizationId: query.payload.organizationId
    });

    try {
      // Check if requester has access to organization statistics
      // In a real implementation, would check user's role and permissions

      const result = await this.boardRepository.getStatistics(
        query.payload.organizationId,
        query.payload.dateRange
      );

      if (!result.success) {
        return result;
      }

      console.log('[GetBoardStatisticsQuery] Success:', {
        totalBoards: result.data.totalBoards,
        activeBoards: result.data.activeBoards
      });

      return result;
    } catch (error) {
      console.error('[GetBoardStatisticsQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get board statistics')
      );
    }
  }
}

/**
 * Get Member Statistics Query
 */
export class GetMemberStatisticsQuery implements Query<MemberStatistics> {
  readonly queryType = 'GetMemberStatistics';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'GetMemberStatistics';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      userId: UserId;
      requestedBy: UserId;
    }
  ) {
    this.userId = payload.requestedBy;
  }

  private generateQueryId(): string {
    return `qry_member_stats_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.userId) {
      return ResultUtils.fail(new Error('User ID is required'));
    }

    if (!this.payload.requestedBy) {
      return ResultUtils.fail(new Error('Requester ID is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Get Member Statistics Query Handler
 */
export class GetMemberStatisticsQueryHandler {
  constructor(private readonly boardRepository: IBoardRepository) {}

  async handle(query: GetMemberStatisticsQuery): Promise<Result<MemberStatistics>> {
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[GetMemberStatisticsQuery] Executing:', {
      userId: query.payload.userId,
      requestedBy: query.payload.requestedBy
    });

    try {
      // Check if requester can view this member's statistics
      // Users can view their own statistics, or admins can view any
      if (query.payload.userId !== query.payload.requestedBy) {
        // Would check admin permissions here
      }

      const result = await this.boardRepository.getMemberStatistics(query.payload.userId);

      if (!result.success) {
        return result;
      }

      console.log('[GetMemberStatisticsQuery] Success:', {
        userId: query.payload.userId,
        boardCount: result.data.boardCount
      });

      return result;
    } catch (error) {
      console.error('[GetMemberStatisticsQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get member statistics')
      );
    }
  }
}

/**
 * Get Board Committees Query
 */
export class GetBoardCommitteesQuery implements Query<Committee[]> {
  readonly queryType = 'GetBoardCommittees';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'GetBoardCommittees';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      boardId: BoardId;
      requestedBy: UserId;
      activeOnly?: boolean;
    }
  ) {
    this.userId = payload.requestedBy;
  }

  private generateQueryId(): string {
    return `qry_board_committees_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.boardId) {
      return ResultUtils.fail(new Error('Board ID is required'));
    }

    if (!this.payload.requestedBy) {
      return ResultUtils.fail(new Error('Requester ID is required'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Get Board Committees Query Handler
 */
export class GetBoardCommitteesQueryHandler {
  constructor(private readonly boardRepository: IBoardRepository) {}

  async handle(query: GetBoardCommitteesQuery): Promise<Result<Committee[]>> {
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[GetBoardCommitteesQuery] Executing:', {
      boardId: query.payload.boardId,
      requestedBy: query.payload.requestedBy
    });

    try {
      // Check if requester is a board member
      const isMemberResult = await this.boardRepository.isUserBoardMember(
        query.payload.boardId,
        query.payload.requestedBy
      );

      if (!isMemberResult.success || !isMemberResult.data) {
        return ResultUtils.fail(new Error('Access denied: You are not a member of this board'));
      }

      // Get the board to access its committees
      const boardResult = await this.boardRepository.findById(query.payload.boardId);
      if (!boardResult.success) {
        return boardResult;
      }

      const board = boardResult.data;
      let committees = board.getCommittees();

      // Filter to active only if requested
      if (query.payload.activeOnly) {
        committees = committees.filter(c => c.isActive);
      }

      console.log('[GetBoardCommitteesQuery] Success:', {
        boardId: query.payload.boardId,
        committeeCount: committees.length
      });

      return ResultUtils.ok(committees);
    } catch (error) {
      console.error('[GetBoardCommitteesQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get board committees')
      );
    }
  }
}

/**
 * Get Upcoming Meetings Query
 */
export class GetUpcomingMeetingsQuery implements Query<{ boardId: BoardId; meetingDate: Date }[]> {
  readonly queryType = 'GetUpcomingMeetings';
  readonly queryId = this.generateQueryId();
  readonly queryName = 'GetUpcomingMeetings';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      requestedBy: UserId;
      days?: number;
      boardId?: BoardId;
    }
  ) {
    this.userId = payload.requestedBy;
  }

  private generateQueryId(): string {
    return `qry_upcoming_meetings_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.requestedBy) {
      return ResultUtils.fail(new Error('Requester ID is required'));
    }

    if (this.payload.days && this.payload.days < 1) {
      return ResultUtils.fail(new Error('Days must be at least 1'));
    }

    return ResultUtils.ok(undefined);
  }
}

/**
 * Get Upcoming Meetings Query Handler
 */
export class GetUpcomingMeetingsQueryHandler {
  constructor(private readonly boardRepository: IBoardRepository) {}

  async handle(query: GetUpcomingMeetingsQuery): Promise<Result<{ boardId: BoardId; meetingDate: Date }[]>> {
    const validationResult = query.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    console.log('[GetUpcomingMeetingsQuery] Executing:', {
      requestedBy: query.payload.requestedBy,
      days: query.payload.days
    });

    try {
      const result = await this.boardRepository.getUpcomingMeetings(query.payload.days || 30);

      if (!result.success) {
        return result;
      }

      // Filter to only meetings for boards where user is a member
      const filteredMeetings: { boardId: BoardId; meetingDate: Date }[] = [];
      for (const meeting of result.data) {
        const isMemberResult = await this.boardRepository.isUserBoardMember(
          meeting.boardId,
          query.payload.requestedBy
        );
        if (isMemberResult.success && isMemberResult.data) {
          filteredMeetings.push(meeting);
        }
      }

      console.log('[GetUpcomingMeetingsQuery] Success:', {
        totalMeetings: result.data.length,
        userMeetings: filteredMeetings.length
      });

      return ResultUtils.ok(filteredMeetings);
    } catch (error) {
      console.error('[GetUpcomingMeetingsQuery] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get upcoming meetings')
      );
    }
  }
}

/**
 * Factory functions to create query handlers with dependencies
 */
export function createGetBoardQueryHandler(dependencies: {
  boardRepository: IBoardRepository;
}): GetBoardQueryHandler {
  return new GetBoardQueryHandler(dependencies.boardRepository);
}

export function createListBoardsQueryHandler(dependencies: {
  boardRepository: IBoardRepository;
}): ListBoardsQueryHandler {
  return new ListBoardsQueryHandler(dependencies.boardRepository);
}

export function createGetMyBoardsQueryHandler(dependencies: {
  boardRepository: IBoardRepository;
}): GetMyBoardsQueryHandler {
  return new GetMyBoardsQueryHandler(dependencies.boardRepository);
}

export function createSearchBoardsQueryHandler(dependencies: {
  boardRepository: IBoardRepository;
}): SearchBoardsQueryHandler {
  return new SearchBoardsQueryHandler(dependencies.boardRepository);
}

export function createGetBoardStatisticsQueryHandler(dependencies: {
  boardRepository: IBoardRepository;
}): GetBoardStatisticsQueryHandler {
  return new GetBoardStatisticsQueryHandler(dependencies.boardRepository);
}

export function createGetMemberStatisticsQueryHandler(dependencies: {
  boardRepository: IBoardRepository;
}): GetMemberStatisticsQueryHandler {
  return new GetMemberStatisticsQueryHandler(dependencies.boardRepository);
}

export function createGetBoardCommitteesQueryHandler(dependencies: {
  boardRepository: IBoardRepository;
}): GetBoardCommitteesQueryHandler {
  return new GetBoardCommitteesQueryHandler(dependencies.boardRepository);
}

export function createGetUpcomingMeetingsQueryHandler(dependencies: {
  boardRepository: IBoardRepository;
}): GetUpcomingMeetingsQueryHandler {
  return new GetUpcomingMeetingsQueryHandler(dependencies.boardRepository);
}