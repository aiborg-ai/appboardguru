/**
 * Board Entity - Core domain entity for board management
 * Implements business rules for board governance
 */

import { AggregateRoot } from '../core/aggregate-root';
import { ValueObject } from '@/01-shared/types/core.types';
import { Result, ResultUtils } from '@/01-shared/lib/result';

// Value Objects
export class BoardName extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  static create(name: string): Result<BoardName> {
    if (!name || name.trim().length < 3) {
      return ResultUtils.fail(new Error('Board name must be at least 3 characters'));
    }

    if (name.length > 100) {
      return ResultUtils.fail(new Error('Board name cannot exceed 100 characters'));
    }

    return ResultUtils.ok(new BoardName(name.trim()));
  }

  get value(): string {
    return this.props.value;
  }
}

export class BoardSettings extends ValueObject<{
  maxMembers: number;
  minQuorum: number;
  votingEnabled: boolean;
  documentSharingEnabled: boolean;
  meetingRecordingEnabled: boolean;
}> {
  static create(settings: Partial<BoardSettings['props']> = {}): BoardSettings {
    return new BoardSettings({
      maxMembers: settings.maxMembers || 20,
      minQuorum: settings.minQuorum || 3,
      votingEnabled: settings.votingEnabled !== false,
      documentSharingEnabled: settings.documentSharingEnabled !== false,
      meetingRecordingEnabled: settings.meetingRecordingEnabled !== false
    });
  }

  get maxMembers(): number {
    return this.props.maxMembers;
  }

  get minQuorum(): number {
    return this.props.minQuorum;
  }

  get votingEnabled(): boolean {
    return this.props.votingEnabled;
  }

  get documentSharingEnabled(): boolean {
    return this.props.documentSharingEnabled;
  }

  get meetingRecordingEnabled(): boolean {
    return this.props.meetingRecordingEnabled;
  }
}

// Board Status Enum
export enum BoardStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
  PENDING_SETUP = 'pending_setup'
}

// Board Member Role
export enum BoardMemberRole {
  CHAIRMAN = 'chairman',
  VICE_CHAIRMAN = 'vice_chairman',
  SECRETARY = 'secretary',
  TREASURER = 'treasurer',
  MEMBER = 'member',
  OBSERVER = 'observer'
}

// Board Member
export class BoardMember {
  constructor(
    public readonly userId: string,
    public readonly role: BoardMemberRole,
    public readonly joinedAt: Date,
    public readonly isVotingMember: boolean = true,
    public readonly committees: string[] = []
  ) {}

  hasVotingRights(): boolean {
    return this.isVotingMember && 
           this.role !== BoardMemberRole.OBSERVER;
  }

  isLeadership(): boolean {
    return [
      BoardMemberRole.CHAIRMAN,
      BoardMemberRole.VICE_CHAIRMAN,
      BoardMemberRole.SECRETARY,
      BoardMemberRole.TREASURER
    ].includes(this.role);
  }
}

// Board Entity
export class Board extends AggregateRoot {
  private name: BoardName;
  private organizationId: string;
  private status: BoardStatus;
  private settings: BoardSettings;
  private members: Map<string, BoardMember>;
  private description?: string;
  private establishedDate: Date;
  private nextMeetingDate?: Date;

  private constructor(
    id: string,
    name: BoardName,
    organizationId: string,
    status: BoardStatus,
    settings: BoardSettings,
    members: Map<string, BoardMember>,
    description?: string,
    establishedDate?: Date,
    nextMeetingDate?: Date,
    createdAt?: Date,
    updatedAt?: Date,
    version?: number
  ) {
    super(id, createdAt, updatedAt, version);
    this.name = name;
    this.organizationId = organizationId;
    this.status = status;
    this.settings = settings;
    this.members = members;
    this.description = description;
    this.establishedDate = establishedDate || new Date();
    this.nextMeetingDate = nextMeetingDate;
  }

  static create(
    id: string,
    name: string,
    organizationId: string,
    createdByUserId: string,
    description?: string,
    settings?: Partial<BoardSettings['props']>
  ): Result<Board> {
    const nameResult = BoardName.create(name);
    if (!nameResult.success) {
      return ResultUtils.fail(nameResult.error);
    }

    const boardSettings = BoardSettings.create(settings);
    const members = new Map<string, BoardMember>();
    
    // Creator becomes the initial chairman
    members.set(createdByUserId, new BoardMember(
      createdByUserId,
      BoardMemberRole.CHAIRMAN,
      new Date(),
      true
    ));

    const board = new Board(
      id,
      nameResult.data,
      organizationId,
      BoardStatus.PENDING_SETUP,
      boardSettings,
      members,
      description
    );

    board.addDomainEvent('BoardCreated', {
      boardId: id,
      name: name,
      organizationId,
      createdBy: createdByUserId,
      settings: boardSettings.props
    });

    board.validate();
    return ResultUtils.ok(board);
  }

  // Business Methods
  addMember(
    userId: string,
    role: BoardMemberRole,
    addedBy: string,
    isVotingMember: boolean = true
  ): Result<void> {
    if (this.members.has(userId)) {
      return ResultUtils.fail(new Error('User is already a board member'));
    }

    if (this.members.size >= this.settings.maxMembers) {
      return ResultUtils.fail(new Error(`Board cannot exceed ${this.settings.maxMembers} members`));
    }

    // Check if adding a chairman when one exists
    if (role === BoardMemberRole.CHAIRMAN) {
      const currentChairman = Array.from(this.members.values())
        .find(m => m.role === BoardMemberRole.CHAIRMAN);
      
      if (currentChairman) {
        return ResultUtils.fail(new Error('Board already has a chairman'));
      }
    }

    this.members.set(userId, new BoardMember(
      userId,
      role,
      new Date(),
      isVotingMember
    ));

    this.updateVersion();

    this.addDomainEvent('BoardMemberAdded', {
      boardId: this.id,
      userId,
      role,
      addedBy,
      isVotingMember
    });

    return ResultUtils.ok(undefined);
  }

  removeMember(userId: string, removedBy: string, reason: string): Result<void> {
    const member = this.members.get(userId);
    
    if (!member) {
      return ResultUtils.fail(new Error('User is not a board member'));
    }

    // Cannot remove the last member
    if (this.members.size === 1) {
      return ResultUtils.fail(new Error('Cannot remove the last board member'));
    }

    // If removing chairman, ensure there's succession
    if (member.role === BoardMemberRole.CHAIRMAN && this.members.size > 1) {
      return ResultUtils.fail(new Error('Must appoint new chairman before removing current one'));
    }

    this.members.delete(userId);
    this.updateVersion();

    this.addDomainEvent('BoardMemberRemoved', {
      boardId: this.id,
      userId,
      removedBy,
      reason,
      previousRole: member.role
    });

    return ResultUtils.ok(undefined);
  }

  changeMemberRole(
    userId: string,
    newRole: BoardMemberRole,
    changedBy: string
  ): Result<void> {
    const member = this.members.get(userId);
    
    if (!member) {
      return ResultUtils.fail(new Error('User is not a board member'));
    }

    // Check if changing to chairman when one exists
    if (newRole === BoardMemberRole.CHAIRMAN) {
      const currentChairman = Array.from(this.members.values())
        .find(m => m.role === BoardMemberRole.CHAIRMAN && m.userId !== userId);
      
      if (currentChairman) {
        // Demote current chairman to member
        this.members.set(currentChairman.userId, new BoardMember(
          currentChairman.userId,
          BoardMemberRole.MEMBER,
          currentChairman.joinedAt,
          currentChairman.isVotingMember,
          currentChairman.committees
        ));
      }
    }

    const previousRole = member.role;
    
    this.members.set(userId, new BoardMember(
      userId,
      newRole,
      member.joinedAt,
      member.isVotingMember,
      member.committees
    ));

    this.updateVersion();

    this.addDomainEvent('BoardMemberRoleChanged', {
      boardId: this.id,
      userId,
      previousRole,
      newRole,
      changedBy
    });

    return ResultUtils.ok(undefined);
  }

  activate(): Result<void> {
    if (this.status === BoardStatus.ACTIVE) {
      return ResultUtils.fail(new Error('Board is already active'));
    }

    // Check minimum quorum
    const votingMembers = this.getVotingMembers();
    if (votingMembers.length < this.settings.minQuorum) {
      return ResultUtils.fail(
        new Error(`Board requires at least ${this.settings.minQuorum} voting members to activate`)
      );
    }

    // Check for chairman
    const hasChairman = Array.from(this.members.values())
      .some(m => m.role === BoardMemberRole.CHAIRMAN);
    
    if (!hasChairman) {
      return ResultUtils.fail(new Error('Board must have a chairman to activate'));
    }

    this.status = BoardStatus.ACTIVE;
    this.updateVersion();

    this.addDomainEvent('BoardActivated', {
      boardId: this.id,
      memberCount: this.members.size,
      votingMemberCount: votingMembers.length
    });

    return ResultUtils.ok(undefined);
  }

  archive(archivedBy: string, reason: string): Result<void> {
    if (this.status === BoardStatus.ARCHIVED) {
      return ResultUtils.fail(new Error('Board is already archived'));
    }

    this.status = BoardStatus.ARCHIVED;
    this.updateVersion();

    this.addDomainEvent('BoardArchived', {
      boardId: this.id,
      archivedBy,
      reason,
      previousStatus: this.status
    });

    return ResultUtils.ok(undefined);
  }

  scheduleNextMeeting(date: Date, scheduledBy: string): Result<void> {
    if (date <= new Date()) {
      return ResultUtils.fail(new Error('Meeting date must be in the future'));
    }

    this.nextMeetingDate = date;
    this.updateVersion();

    this.addDomainEvent('BoardMeetingScheduled', {
      boardId: this.id,
      meetingDate: date,
      scheduledBy
    });

    return ResultUtils.ok(undefined);
  }

  updateSettings(settings: Partial<BoardSettings['props']>, updatedBy: string): Result<void> {
    const newSettings = BoardSettings.create({
      ...this.settings.props,
      ...settings
    });

    // Validate new settings
    if (newSettings.minQuorum > newSettings.maxMembers) {
      return ResultUtils.fail(new Error('Minimum quorum cannot exceed maximum members'));
    }

    if (newSettings.minQuorum < 2) {
      return ResultUtils.fail(new Error('Minimum quorum must be at least 2'));
    }

    this.settings = newSettings;
    this.updateVersion();

    this.addDomainEvent('BoardSettingsUpdated', {
      boardId: this.id,
      settings: newSettings.props,
      updatedBy
    });

    return ResultUtils.ok(undefined);
  }

  // Getters
  getName(): string {
    return this.name.value;
  }

  getOrganizationId(): string {
    return this.organizationId;
  }

  getStatus(): BoardStatus {
    return this.status;
  }

  getSettings(): BoardSettings {
    return this.settings;
  }

  getMembers(): BoardMember[] {
    return Array.from(this.members.values());
  }

  getMember(userId: string): BoardMember | undefined {
    return this.members.get(userId);
  }

  getVotingMembers(): BoardMember[] {
    return Array.from(this.members.values())
      .filter(m => m.hasVotingRights());
  }

  getMemberCount(): number {
    return this.members.size;
  }

  getDescription(): string | undefined {
    return this.description;
  }

  getEstablishedDate(): Date {
    return this.establishedDate;
  }

  getNextMeetingDate(): Date | undefined {
    return this.nextMeetingDate;
  }

  hasQuorum(): boolean {
    return this.getVotingMembers().length >= this.settings.minQuorum;
  }

  isActive(): boolean {
    return this.status === BoardStatus.ACTIVE;
  }

  canAddMembers(): boolean {
    return this.members.size < this.settings.maxMembers;
  }

  validate(): void {
    if (!this.id) {
      throw new Error('Board ID is required');
    }

    if (!this.name) {
      throw new Error('Board name is required');
    }

    if (!this.organizationId) {
      throw new Error('Organization ID is required');
    }

    if (!this.status) {
      throw new Error('Board status is required');
    }

    if (!this.settings) {
      throw new Error('Board settings are required');
    }

    if (this.members.size === 0) {
      throw new Error('Board must have at least one member');
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name.value,
      organizationId: this.organizationId,
      status: this.status,
      settings: this.settings.props,
      members: Array.from(this.members.entries()).map(([userId, member]) => ({
        userId,
        role: member.role,
        joinedAt: member.joinedAt,
        isVotingMember: member.isVotingMember,
        committees: member.committees
      })),
      description: this.description,
      establishedDate: this.establishedDate,
      nextMeetingDate: this.nextMeetingDate,
      memberCount: this.members.size,
      votingMemberCount: this.getVotingMembers().length,
      hasQuorum: this.hasQuorum(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version
    };
  }
}