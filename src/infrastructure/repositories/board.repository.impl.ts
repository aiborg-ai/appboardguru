/**
 * Board Repository Implementation
 * Supabase implementation of board data access operations
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { IBoardRepository, BoardFilters, BoardListOptions, BoardStatistics, MemberStatistics, CommitteeFilters } from '@/application/interfaces/repositories/board.repository.interface';
import { Board, BoardName, BoardSettings, BoardStatus, BoardType, BoardMemberRole, BoardMember, Committee } from '@/domain/entities/board.entity';
import { Result, ResultUtils } from '@/01-shared/lib/result';
import type { BoardId, UserId, OrganizationId } from '@/types/core';

export class BoardRepositoryImpl implements IBoardRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Transform database record to domain entity
   */
  private async toDomain(data: any): Promise<Result<Board>> {
    try {
      // Parse members
      const members = new Map<string, BoardMember>();
      if (data.members && Array.isArray(data.members)) {
        data.members.forEach((m: any) => {
          members.set(m.userId, new BoardMember(
            m.userId,
            m.role as BoardMemberRole,
            new Date(m.joinedAt),
            m.isVotingMember,
            m.committees || [],
            m.termEndDate ? new Date(m.termEndDate) : undefined,
            m.attendanceRate || 100
          ));
        });
      }

      // Parse committees
      const committees = new Map<string, Committee>();
      if (data.committees && Array.isArray(data.committees)) {
        data.committees.forEach((c: any) => {
          committees.set(c.id, new Committee(
            c.id,
            c.name,
            c.description,
            c.chairUserId,
            c.memberUserIds || [],
            new Date(c.createdAt),
            c.isActive !== false
          ));
        });
      }

      // Create board name
      const nameResult = BoardName.create(data.name);
      if (!nameResult.success) {
        return ResultUtils.fail(nameResult.error);
      }

      // Create settings
      const settings = BoardSettings.create(data.settings || {});

      // Use reflection to create Board instance
      const board = Reflect.construct(Board, [
        data.id,
        nameResult.data,
        data.organization_id,
        data.board_type as BoardType || BoardType.BOARD_OF_DIRECTORS,
        data.status as BoardStatus,
        settings,
        members,
        committees,
        data.description,
        data.established_date ? new Date(data.established_date) : new Date(data.created_at),
        data.next_meeting_date ? new Date(data.next_meeting_date) : undefined,
        data.term_length,
        data.last_election_date ? new Date(data.last_election_date) : undefined,
        new Date(data.created_at),
        new Date(data.updated_at),
        data.version || 1
      ], Board);

      return ResultUtils.ok(board);
    } catch (error) {
      console.error('[BoardRepository] Failed to transform to domain:', error);
      return ResultUtils.fail(new Error('Failed to transform board data'));
    }
  }

  /**
   * Transform domain entity to database record
   */
  private toPersistence(board: Board): any {
    const json = board.toJSON();
    return {
      id: board.id,
      name: json.name,
      organization_id: json.organizationId,
      board_type: json.boardType,
      status: json.status,
      settings: json.settings,
      members: json.members,
      committees: json.committees,
      description: json.description,
      established_date: json.establishedDate,
      next_meeting_date: json.nextMeetingDate,
      term_length: json.termLength,
      last_election_date: json.lastElectionDate,
      created_at: json.createdAt,
      updated_at: json.updatedAt,
      version: json.version
    };
  }

  async create(board: Board): Promise<Result<Board>> {
    try {
      const data = this.toPersistence(board);
      
      const { data: created, error } = await this.supabase
        .from('boards')
        .insert(data)
        .select()
        .single();

      if (error) {
        console.error('[BoardRepository] Create error:', error);
        return ResultUtils.fail(new Error(error.message));
      }

      return this.toDomain(created);
    } catch (error) {
      console.error('[BoardRepository] Unexpected create error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to create board')
      );
    }
  }

  async update(boardId: BoardId, board: Board): Promise<Result<Board>> {
    try {
      const data = this.toPersistence(board);
      
      const { data: updated, error } = await this.supabase
        .from('boards')
        .update(data)
        .eq('id', boardId)
        .select()
        .single();

      if (error) {
        console.error('[BoardRepository] Update error:', error);
        return ResultUtils.fail(new Error(error.message));
      }

      if (!updated) {
        return ResultUtils.fail(new Error('Board not found'));
      }

      return this.toDomain(updated);
    } catch (error) {
      console.error('[BoardRepository] Unexpected update error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to update board')
      );
    }
  }

  async delete(boardId: BoardId): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('boards')
        .delete()
        .eq('id', boardId);

      if (error) {
        console.error('[BoardRepository] Delete error:', error);
        return ResultUtils.fail(new Error(error.message));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[BoardRepository] Unexpected delete error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to delete board')
      );
    }
  }

  async findById(boardId: BoardId): Promise<Result<Board>> {
    try {
      const { data, error } = await this.supabase
        .from('boards')
        .select('*')
        .eq('id', boardId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return ResultUtils.fail(new Error('Board not found'));
        }
        console.error('[BoardRepository] FindById error:', error);
        return ResultUtils.fail(new Error(error.message));
      }

      return this.toDomain(data);
    } catch (error) {
      console.error('[BoardRepository] Unexpected findById error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find board')
      );
    }
  }

  async list(options: BoardListOptions): Promise<Result<{ boards: Board[]; total: number }>> {
    try {
      let query = this.supabase
        .from('boards')
        .select('*', { count: 'exact' });

      // Apply filters
      if (options.filters) {
        const filters = options.filters;

        if (filters.organizationId) {
          query = query.eq('organization_id', filters.organizationId);
        }

        if (filters.status) {
          if (Array.isArray(filters.status)) {
            query = query.in('status', filters.status);
          } else {
            query = query.eq('status', filters.status);
          }
        }

        if (filters.boardType) {
          if (Array.isArray(filters.boardType)) {
            query = query.in('board_type', filters.boardType);
          } else {
            query = query.eq('board_type', filters.boardType);
          }
        }

        if (filters.searchQuery) {
          query = query.or(`name.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`);
        }

        if (filters.createdAfter) {
          query = query.gte('created_at', filters.createdAfter.toISOString());
        }

        if (filters.createdBefore) {
          query = query.lte('created_at', filters.createdBefore.toISOString());
        }

        if (filters.nextMeetingAfter) {
          query = query.gte('next_meeting_date', filters.nextMeetingAfter.toISOString());
        }

        if (filters.nextMeetingBefore) {
          query = query.lte('next_meeting_date', filters.nextMeetingBefore.toISOString());
        }
      }

      // Apply sorting
      const sortBy = options.sortBy || 'createdAt';
      const sortOrder = options.sortOrder || 'desc';
      const columnMap: Record<string, string> = {
        name: 'name',
        createdAt: 'created_at',
        establishedDate: 'established_date',
        nextMeetingDate: 'next_meeting_date',
        memberCount: 'member_count',
        status: 'status'
      };
      const column = columnMap[sortBy] || 'created_at';
      query = query.order(column, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const limit = options.limit || 20;
      const offset = options.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('[BoardRepository] List error:', error);
        return ResultUtils.fail(new Error(error.message));
      }

      const boards: Board[] = [];
      for (const record of data || []) {
        const boardResult = await this.toDomain(record);
        if (boardResult.success) {
          boards.push(boardResult.data);
        }
      }

      return ResultUtils.ok({
        boards,
        total: count || 0
      });
    } catch (error) {
      console.error('[BoardRepository] Unexpected list error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to list boards')
      );
    }
  }

  async findByOrganization(organizationId: OrganizationId): Promise<Result<Board[]>> {
    try {
      const { data, error } = await this.supabase
        .from('boards')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[BoardRepository] FindByOrganization error:', error);
        return ResultUtils.fail(new Error(error.message));
      }

      const boards: Board[] = [];
      for (const record of data || []) {
        const boardResult = await this.toDomain(record);
        if (boardResult.success) {
          boards.push(boardResult.data);
        }
      }

      return ResultUtils.ok(boards);
    } catch (error) {
      console.error('[BoardRepository] Unexpected findByOrganization error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find boards by organization')
      );
    }
  }

  async findByMember(userId: UserId, role?: BoardMemberRole): Promise<Result<Board[]>> {
    try {
      let query = this.supabase
        .from('boards')
        .select('*');

      // Filter by member presence in the members array
      query = query.contains('members', [{ userId }]);

      // If role is specified, further filter
      if (role) {
        query = query.contains('members', [{ userId, role }]);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('[BoardRepository] FindByMember error:', error);
        return ResultUtils.fail(new Error(error.message));
      }

      const boards: Board[] = [];
      for (const record of data || []) {
        const boardResult = await this.toDomain(record);
        if (boardResult.success) {
          boards.push(boardResult.data);
        }
      }

      return ResultUtils.ok(boards);
    } catch (error) {
      console.error('[BoardRepository] Unexpected findByMember error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find boards by member')
      );
    }
  }

  async findByChairman(chairmanUserId: UserId): Promise<Result<Board[]>> {
    return this.findByMember(chairmanUserId, BoardMemberRole.CHAIRMAN);
  }

  async search(query: string, limit: number = 10): Promise<Result<Board[]>> {
    try {
      const { data, error } = await this.supabase
        .from('boards')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(limit)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[BoardRepository] Search error:', error);
        return ResultUtils.fail(new Error(error.message));
      }

      const boards: Board[] = [];
      for (const record of data || []) {
        const boardResult = await this.toDomain(record);
        if (boardResult.success) {
          boards.push(boardResult.data);
        }
      }

      return ResultUtils.ok(boards);
    } catch (error) {
      console.error('[BoardRepository] Unexpected search error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to search boards')
      );
    }
  }

  async findByIds(boardIds: BoardId[]): Promise<Result<Board[]>> {
    try {
      const { data, error } = await this.supabase
        .from('boards')
        .select('*')
        .in('id', boardIds);

      if (error) {
        console.error('[BoardRepository] FindByIds error:', error);
        return ResultUtils.fail(new Error(error.message));
      }

      const boards: Board[] = [];
      for (const record of data || []) {
        const boardResult = await this.toDomain(record);
        if (boardResult.success) {
          boards.push(boardResult.data);
        }
      }

      return ResultUtils.ok(boards);
    } catch (error) {
      console.error('[BoardRepository] Unexpected findByIds error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find boards by IDs')
      );
    }
  }

  async bulkUpdateStatus(boardIds: BoardId[], status: BoardStatus): Promise<Result<number>> {
    try {
      const { data, error } = await this.supabase
        .from('boards')
        .update({ status, updated_at: new Date().toISOString() })
        .in('id', boardIds)
        .select();

      if (error) {
        console.error('[BoardRepository] BulkUpdateStatus error:', error);
        return ResultUtils.fail(new Error(error.message));
      }

      return ResultUtils.ok(data?.length || 0);
    } catch (error) {
      console.error('[BoardRepository] Unexpected bulkUpdateStatus error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to bulk update board status')
      );
    }
  }

  async archiveInactiveBoards(inactiveDays: number): Promise<Result<number>> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

      const { data, error } = await this.supabase
        .from('boards')
        .update({ 
          status: BoardStatus.ARCHIVED,
          updated_at: new Date().toISOString()
        })
        .eq('status', BoardStatus.INACTIVE)
        .lt('updated_at', cutoffDate.toISOString())
        .select();

      if (error) {
        console.error('[BoardRepository] ArchiveInactiveBoards error:', error);
        return ResultUtils.fail(new Error(error.message));
      }

      return ResultUtils.ok(data?.length || 0);
    } catch (error) {
      console.error('[BoardRepository] Unexpected archiveInactiveBoards error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to archive inactive boards')
      );
    }
  }

  // Simplified implementations for other methods - would need full implementation in production
  async addMember(boardId: BoardId, userId: UserId, role: BoardMemberRole, addedBy: UserId): Promise<Result<void>> {
    // Implementation would fetch board, add member, and save
    return ResultUtils.ok(undefined);
  }

  async removeMember(boardId: BoardId, userId: UserId, removedBy: UserId, reason: string): Promise<Result<void>> {
    // Implementation would fetch board, remove member, and save
    return ResultUtils.ok(undefined);
  }

  async updateMemberRole(boardId: BoardId, userId: UserId, newRole: BoardMemberRole, updatedBy: UserId): Promise<Result<void>> {
    // Implementation would fetch board, update member role, and save
    return ResultUtils.ok(undefined);
  }

  async updateMemberAttendance(boardId: BoardId, userId: UserId, attendanceRate: number): Promise<Result<void>> {
    // Implementation would fetch board, update attendance, and save
    return ResultUtils.ok(undefined);
  }

  async getMemberBoards(userId: UserId): Promise<Result<Board[]>> {
    return this.findByMember(userId);
  }

  async createCommittee(boardId: BoardId, committee: Committee, createdBy: UserId): Promise<Result<void>> {
    // Implementation would fetch board, add committee, and save
    return ResultUtils.ok(undefined);
  }

  async updateCommittee(boardId: BoardId, committeeId: string, updates: Partial<Committee>): Promise<Result<void>> {
    // Implementation would fetch board, update committee, and save
    return ResultUtils.ok(undefined);
  }

  async dissolveCommittee(boardId: BoardId, committeeId: string, dissolvedBy: UserId, reason: string): Promise<Result<void>> {
    // Implementation would fetch board, remove committee, and save
    return ResultUtils.ok(undefined);
  }

  async findCommittees(filters: CommitteeFilters): Promise<Result<Committee[]>> {
    // Implementation would query committees based on filters
    return ResultUtils.ok([]);
  }

  async getCommitteeMembers(boardId: BoardId, committeeId: string): Promise<Result<UserId[]>> {
    // Implementation would fetch committee and return member IDs
    return ResultUtils.ok([]);
  }

  async scheduleNextMeeting(boardId: BoardId, meetingDate: Date, scheduledBy: UserId): Promise<Result<void>> {
    // Implementation would fetch board, schedule meeting, and save
    return ResultUtils.ok(undefined);
  }

  async getUpcomingMeetings(days: number = 30): Promise<Result<{ boardId: BoardId; meetingDate: Date }[]>> {
    // Implementation would query boards with upcoming meetings
    return ResultUtils.ok([]);
  }

  async getMeetingHistory(boardId: BoardId, limit: number = 10): Promise<Result<{ date: Date; attendanceRate: number }[]>> {
    // Implementation would fetch meeting history from related tables
    return ResultUtils.ok([]);
  }

  async conductElection(boardId: BoardId, electionDate: Date, conductedBy: UserId): Promise<Result<void>> {
    // Implementation would fetch board, conduct election, and save
    return ResultUtils.ok(undefined);
  }

  async getBoardsWithExpiringTerms(days: number): Promise<Result<Board[]>> {
    // Implementation would query boards with expiring member terms
    return ResultUtils.ok([]);
  }

  async extendMemberTerm(boardId: BoardId, userId: UserId, newEndDate: Date): Promise<Result<void>> {
    // Implementation would fetch board, extend term, and save
    return ResultUtils.ok(undefined);
  }

  async getStatistics(organizationId?: OrganizationId, dateRange?: { from: Date; to: Date }): Promise<Result<BoardStatistics>> {
    // Implementation would aggregate statistics from boards
    const stats: BoardStatistics = {
      totalBoards: 0,
      activeBoards: 0,
      inactiveBoards: 0,
      archivedBoards: 0,
      pendingSetupBoards: 0,
      boardsByType: {} as Record<BoardType, number>,
      totalMembers: 0,
      averageMembersPerBoard: 0,
      averageQuorumSize: 0,
      averageAttendanceRate: 0,
      boardsWithQuorum: 0,
      totalCommittees: 0,
      averageCommitteesPerBoard: 0,
      boardsWithUpcomingMeetings: 0,
      boardsWithExpiredTerms: 0,
      membershipTrends: [],
      activityMetrics: {
        meetingsScheduled: 0,
        electionsHeld: 0,
        committeesCreated: 0,
        settingsUpdated: 0
      }
    };
    return ResultUtils.ok(stats);
  }

  async getMemberStatistics(userId: UserId): Promise<Result<MemberStatistics>> {
    // Implementation would aggregate member statistics
    const stats: MemberStatistics = {
      userId,
      boardCount: 0,
      roleDistribution: {} as Record<BoardMemberRole, number>,
      committeeCount: 0,
      averageAttendanceRate: 0,
      leadershipPositions: 0,
      votingPositions: 0,
      tenureInMonths: 0,
      upcomingTermExpirations: 0
    };
    return ResultUtils.ok(stats);
  }

  async getBoardActivity(boardId: BoardId, days: number = 30): Promise<Result<{ date: Date; eventType: string; count: number }[]>> {
    // Implementation would fetch activity logs
    return ResultUtils.ok([]);
  }

  async getAttendanceTrends(boardId: BoardId, months: number = 6): Promise<Result<{ month: string; rate: number }[]>> {
    // Implementation would aggregate attendance trends
    return ResultUtils.ok([]);
  }

  async nameExists(name: string, organizationId: OrganizationId, excludeBoardId?: BoardId): Promise<Result<boolean>> {
    try {
      let query = this.supabase
        .from('boards')
        .select('id')
        .eq('name', name)
        .eq('organization_id', organizationId);

      if (excludeBoardId) {
        query = query.neq('id', excludeBoardId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[BoardRepository] NameExists error:', error);
        return ResultUtils.fail(new Error(error.message));
      }

      return ResultUtils.ok((data?.length || 0) > 0);
    } catch (error) {
      console.error('[BoardRepository] Unexpected nameExists error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to check board name')
      );
    }
  }

  async canAddMember(boardId: BoardId, userId: UserId): Promise<Result<boolean>> {
    // Implementation would check if user can be added to board
    return ResultUtils.ok(true);
  }

  async hasActiveBoards(organizationId: OrganizationId): Promise<Result<boolean>> {
    try {
      const { data, error } = await this.supabase
        .from('boards')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('status', BoardStatus.ACTIVE)
        .limit(1);

      if (error) {
        console.error('[BoardRepository] HasActiveBoards error:', error);
        return ResultUtils.fail(new Error(error.message));
      }

      return ResultUtils.ok((data?.length || 0) > 0);
    } catch (error) {
      console.error('[BoardRepository] Unexpected hasActiveBoards error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to check active boards')
      );
    }
  }

  async isUserBoardMember(boardId: BoardId, userId: UserId): Promise<Result<boolean>> {
    try {
      const { data, error } = await this.supabase
        .from('boards')
        .select('members')
        .eq('id', boardId)
        .single();

      if (error) {
        console.error('[BoardRepository] IsUserBoardMember error:', error);
        return ResultUtils.fail(new Error(error.message));
      }

      const members = data?.members || [];
      const isMember = members.some((m: any) => m.userId === userId);

      return ResultUtils.ok(isMember);
    } catch (error) {
      console.error('[BoardRepository] Unexpected isUserBoardMember error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to check board membership')
      );
    }
  }

  async updateSettings(boardId: BoardId, settings: any, updatedBy: UserId): Promise<Result<void>> {
    // Implementation would fetch board, update settings, and save
    return ResultUtils.ok(undefined);
  }

  async getDefaultSettings(organizationId: OrganizationId): Promise<Result<any>> {
    // Implementation would fetch organization's default board settings
    return ResultUtils.ok({});
  }

  async validateQuorumRequirements(boardId: BoardId): Promise<Result<boolean>> {
    // Implementation would check if board meets quorum requirements
    return ResultUtils.ok(true);
  }
}