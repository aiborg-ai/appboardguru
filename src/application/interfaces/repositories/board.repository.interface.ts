/**
 * Board Repository Interface
 * Defines the contract for board data access operations
 */

import { Result } from '@/01-shared/types/core.types';
import { Board, BoardStatus, BoardType, BoardMemberRole, Committee } from '@/domain/entities/board.entity';
import type { BoardId, UserId, OrganizationId } from '@/types/core';

export interface BoardFilters {
  organizationId?: OrganizationId;
  status?: BoardStatus | BoardStatus[];
  boardType?: BoardType | BoardType[];
  hasQuorum?: boolean;
  searchQuery?: string;
  chairmanUserId?: UserId;
  memberUserId?: UserId;
  createdAfter?: Date;
  createdBefore?: Date;
  nextMeetingAfter?: Date;
  nextMeetingBefore?: Date;
}

export interface BoardListOptions {
  filters?: BoardFilters;
  sortBy?: 'name' | 'createdAt' | 'establishedDate' | 'nextMeetingDate' | 'memberCount' | 'status';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface BoardStatistics {
  totalBoards: number;
  activeBoards: number;
  inactiveBoards: number;
  archivedBoards: number;
  pendingSetupBoards: number;
  boardsByType: Record<BoardType, number>;
  totalMembers: number;
  averageMembersPerBoard: number;
  averageQuorumSize: number;
  averageAttendanceRate: number;
  boardsWithQuorum: number;
  totalCommittees: number;
  averageCommitteesPerBoard: number;
  boardsWithUpcomingMeetings: number;
  boardsWithExpiredTerms: number;
  membershipTrends: {
    period: string;
    newMembers: number;
    departedMembers: number;
    netChange: number;
  }[];
  activityMetrics: {
    meetingsScheduled: number;
    electionsHeld: number;
    committeesCreated: number;
    settingsUpdated: number;
  };
}

export interface MemberStatistics {
  userId: UserId;
  boardCount: number;
  roleDistribution: Record<BoardMemberRole, number>;
  committeeCount: number;
  averageAttendanceRate: number;
  leadershipPositions: number;
  votingPositions: number;
  tenureInMonths: number;
  upcomingTermExpirations: number;
}

export interface CommitteeFilters {
  boardId?: BoardId;
  chairUserId?: UserId;
  memberUserId?: UserId;
  isActive?: boolean;
  searchQuery?: string;
}

export interface IBoardRepository {
  // Basic CRUD Operations
  create(board: Board): Promise<Result<Board>>;
  update(boardId: BoardId, board: Board): Promise<Result<Board>>;
  delete(boardId: BoardId): Promise<Result<void>>;
  findById(boardId: BoardId): Promise<Result<Board>>;
  
  // Query Operations
  list(options: BoardListOptions): Promise<Result<{ boards: Board[]; total: number }>>;
  findByOrganization(organizationId: OrganizationId): Promise<Result<Board[]>>;
  findByMember(userId: UserId, role?: BoardMemberRole): Promise<Result<Board[]>>;
  findByChairman(chairmanUserId: UserId): Promise<Result<Board[]>>;
  search(query: string, limit?: number): Promise<Result<Board[]>>;
  
  // Batch Operations
  findByIds(boardIds: BoardId[]): Promise<Result<Board[]>>;
  bulkUpdateStatus(boardIds: BoardId[], status: BoardStatus): Promise<Result<number>>;
  archiveInactiveBoards(inactiveDays: number): Promise<Result<number>>;
  
  // Member Management
  addMember(boardId: BoardId, userId: UserId, role: BoardMemberRole, addedBy: UserId): Promise<Result<void>>;
  removeMember(boardId: BoardId, userId: UserId, removedBy: UserId, reason: string): Promise<Result<void>>;
  updateMemberRole(boardId: BoardId, userId: UserId, newRole: BoardMemberRole, updatedBy: UserId): Promise<Result<void>>;
  updateMemberAttendance(boardId: BoardId, userId: UserId, attendanceRate: number): Promise<Result<void>>;
  getMemberBoards(userId: UserId): Promise<Result<Board[]>>;
  
  // Committee Management
  createCommittee(boardId: BoardId, committee: Committee, createdBy: UserId): Promise<Result<void>>;
  updateCommittee(boardId: BoardId, committeeId: string, updates: Partial<Committee>): Promise<Result<void>>;
  dissolveCommittee(boardId: BoardId, committeeId: string, dissolvedBy: UserId, reason: string): Promise<Result<void>>;
  findCommittees(filters: CommitteeFilters): Promise<Result<Committee[]>>;
  getCommitteeMembers(boardId: BoardId, committeeId: string): Promise<Result<UserId[]>>;
  
  // Meeting Management
  scheduleNextMeeting(boardId: BoardId, meetingDate: Date, scheduledBy: UserId): Promise<Result<void>>;
  getUpcomingMeetings(days?: number): Promise<Result<{ boardId: BoardId; meetingDate: Date }[]>>;
  getMeetingHistory(boardId: BoardId, limit?: number): Promise<Result<{ date: Date; attendanceRate: number }[]>>;
  
  // Election and Term Management
  conductElection(boardId: BoardId, electionDate: Date, conductedBy: UserId): Promise<Result<void>>;
  getBoardsWithExpiringTerms(days: number): Promise<Result<Board[]>>;
  extendMemberTerm(boardId: BoardId, userId: UserId, newEndDate: Date): Promise<Result<void>>;
  
  // Statistics and Analytics
  getStatistics(organizationId?: OrganizationId, dateRange?: { from: Date; to: Date }): Promise<Result<BoardStatistics>>;
  getMemberStatistics(userId: UserId): Promise<Result<MemberStatistics>>;
  getBoardActivity(boardId: BoardId, days?: number): Promise<Result<{ date: Date; eventType: string; count: number }[]>>;
  getAttendanceTrends(boardId: BoardId, months?: number): Promise<Result<{ month: string; rate: number }[]>>;
  
  // Validation Helpers
  nameExists(name: string, organizationId: OrganizationId, excludeBoardId?: BoardId): Promise<Result<boolean>>;
  canAddMember(boardId: BoardId, userId: UserId): Promise<Result<boolean>>;
  hasActiveBoards(organizationId: OrganizationId): Promise<Result<boolean>>;
  isUserBoardMember(boardId: BoardId, userId: UserId): Promise<Result<boolean>>;
  
  // Settings and Configuration
  updateSettings(boardId: BoardId, settings: any, updatedBy: UserId): Promise<Result<void>>;
  getDefaultSettings(organizationId: OrganizationId): Promise<Result<any>>;
  validateQuorumRequirements(boardId: BoardId): Promise<Result<boolean>>;
}