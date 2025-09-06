/**
 * Meeting Domain Entity
 * Core business entity for board meetings
 */

import { AggregateRoot } from '../core';
import { Result } from '../../01-shared/types/core.types';
import { ResultUtils } from '../../01-shared/lib/result';
import type { MeetingId, UserId, BoardId, OrganizationId } from '../../types/core';

export type MeetingStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type MeetingType = 'board' | 'committee' | 'special' | 'annual' | 'emergency';
export type AttendeeRole = 'chair' | 'secretary' | 'member' | 'observer' | 'guest';
export type AttendanceStatus = 'pending' | 'accepted' | 'declined' | 'tentative' | 'attended' | 'absent';

export interface MeetingAttendee {
  userId: UserId;
  role: AttendeeRole;
  status: AttendanceStatus;
  invitedAt: Date;
  respondedAt?: Date;
  attendedAt?: Date;
  notes?: string;
}

export interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  presenter?: UserId;
  duration?: number; // minutes
  order: number;
  attachments?: string[];
  discussionNotes?: string;
  decisions?: string[];
  actionItems?: Array<{
    id: string;
    description: string;
    assignee: UserId;
    dueDate?: Date;
  }>;
  votingResults?: {
    inFavor: number;
    against: number;
    abstained: number;
    decision: string;
  };
}

export interface MeetingMinutes {
  id: string;
  meetingId: MeetingId;
  preparedBy: UserId;
  approvedBy?: UserId;
  content: string;
  keyDecisions: string[];
  actionItems: Array<{
    id: string;
    description: string;
    assignee: UserId;
    dueDate?: Date;
    status: 'pending' | 'in_progress' | 'completed';
  }>;
  nextMeetingDate?: Date;
  attachments?: string[];
  createdAt: Date;
  approvedAt?: Date;
}

export interface MeetingLocation {
  type: 'physical' | 'virtual' | 'hybrid';
  physicalAddress?: string;
  virtualLink?: string;
  virtualPlatform?: 'zoom' | 'teams' | 'meet' | 'other';
  accessCode?: string;
  dialInNumber?: string;
}

export interface MeetingRecurrence {
  pattern: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  interval: number; // e.g., every 2 weeks
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  dayOfMonth?: number; // 1-31
  monthOfYear?: number; // 1-12
  endDate?: Date;
  occurrences?: number; // max number of occurrences
}

export interface MeetingProps {
  id: MeetingId;
  title: string;
  description?: string;
  type: MeetingType;
  status: MeetingStatus;
  boardId: BoardId;
  organizationId: OrganizationId;
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  location: MeetingLocation;
  attendees: MeetingAttendee[];
  agendaItems: AgendaItem[];
  minutes?: MeetingMinutes;
  recurrence?: MeetingRecurrence;
  quorumRequired: number;
  quorumMet?: boolean;
  createdBy: UserId;
  chairperson?: UserId;
  secretary?: UserId;
  documents?: string[]; // Asset IDs
  recordings?: string[]; // Asset IDs
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date;
  cancelReason?: string;
}

/**
 * Meeting Domain Entity
 */
export class Meeting extends AggregateRoot {
  private _id: MeetingId;
  private _title: string;
  private _description?: string;
  private _type: MeetingType;
  private _status: MeetingStatus;
  private _boardId: BoardId;
  private _organizationId: OrganizationId;
  private _scheduledStart: Date;
  private _scheduledEnd: Date;
  private _actualStart?: Date;
  private _actualEnd?: Date;
  private _location: MeetingLocation;
  private _attendees: MeetingAttendee[];
  private _agendaItems: AgendaItem[];
  private _minutes?: MeetingMinutes;
  private _recurrence?: MeetingRecurrence;
  private _quorumRequired: number;
  private _quorumMet?: boolean;
  private _createdBy: UserId;
  private _chairperson?: UserId;
  private _secretary?: UserId;
  private _documents?: string[];
  private _recordings?: string[];
  private _notes?: string;
  private _tags?: string[];
  private _createdAt: Date;
  private _updatedAt: Date;
  private _cancelledAt?: Date;
  private _cancelReason?: string;

  private constructor(props: MeetingProps) {
    super();
    this._id = props.id;
    this._title = props.title;
    this._description = props.description;
    this._type = props.type;
    this._status = props.status;
    this._boardId = props.boardId;
    this._organizationId = props.organizationId;
    this._scheduledStart = props.scheduledStart;
    this._scheduledEnd = props.scheduledEnd;
    this._actualStart = props.actualStart;
    this._actualEnd = props.actualEnd;
    this._location = props.location;
    this._attendees = props.attendees;
    this._agendaItems = props.agendaItems;
    this._minutes = props.minutes;
    this._recurrence = props.recurrence;
    this._quorumRequired = props.quorumRequired;
    this._quorumMet = props.quorumMet;
    this._createdBy = props.createdBy;
    this._chairperson = props.chairperson;
    this._secretary = props.secretary;
    this._documents = props.documents;
    this._recordings = props.recordings;
    this._notes = props.notes;
    this._tags = props.tags;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._cancelledAt = props.cancelledAt;
    this._cancelReason = props.cancelReason;
  }

  // Getters
  get id(): MeetingId { return this._id; }
  get title(): string { return this._title; }
  get description(): string | undefined { return this._description; }
  get type(): MeetingType { return this._type; }
  get status(): MeetingStatus { return this._status; }
  get boardId(): BoardId { return this._boardId; }
  get organizationId(): OrganizationId { return this._organizationId; }
  get scheduledStart(): Date { return this._scheduledStart; }
  get scheduledEnd(): Date { return this._scheduledEnd; }
  get actualStart(): Date | undefined { return this._actualStart; }
  get actualEnd(): Date | undefined { return this._actualEnd; }
  get location(): MeetingLocation { return this._location; }
  get attendees(): MeetingAttendee[] { return this._attendees; }
  get agendaItems(): AgendaItem[] { return this._agendaItems; }
  get minutes(): MeetingMinutes | undefined { return this._minutes; }
  get recurrence(): MeetingRecurrence | undefined { return this._recurrence; }
  get quorumRequired(): number { return this._quorumRequired; }
  get quorumMet(): boolean | undefined { return this._quorumMet; }
  get createdBy(): UserId { return this._createdBy; }
  get chairperson(): UserId | undefined { return this._chairperson; }
  get secretary(): UserId | undefined { return this._secretary; }
  get documents(): string[] | undefined { return this._documents; }
  get recordings(): string[] | undefined { return this._recordings; }
  get notes(): string | undefined { return this._notes; }
  get tags(): string[] | undefined { return this._tags; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
  get cancelledAt(): Date | undefined { return this._cancelledAt; }
  get cancelReason(): string | undefined { return this._cancelReason; }

  /**
   * Factory method to create a new meeting
   */
  static create(params: {
    id: MeetingId;
    title: string;
    description?: string;
    type: MeetingType;
    boardId: BoardId;
    organizationId: OrganizationId;
    scheduledStart: Date;
    scheduledEnd: Date;
    location: MeetingLocation;
    attendees: Array<{ userId: UserId; role: AttendeeRole }>;
    agendaItems?: Omit<AgendaItem, 'id'>[];
    quorumRequired: number;
    createdBy: UserId;
    chairperson?: UserId;
    secretary?: UserId;
    recurrence?: MeetingRecurrence;
    tags?: string[];
  }): Result<Meeting> {
    // Validate required fields
    if (!params.title || params.title.trim().length === 0) {
      return ResultUtils.fail(new Error('Meeting title is required'));
    }

    if (params.title.length > 200) {
      return ResultUtils.fail(new Error('Meeting title must be less than 200 characters'));
    }

    // Validate dates
    if (params.scheduledEnd <= params.scheduledStart) {
      return ResultUtils.fail(new Error('Meeting end time must be after start time'));
    }

    const duration = (params.scheduledEnd.getTime() - params.scheduledStart.getTime()) / (1000 * 60);
    if (duration < 15) {
      return ResultUtils.fail(new Error('Meeting must be at least 15 minutes long'));
    }

    if (duration > 480) { // 8 hours
      return ResultUtils.fail(new Error('Meeting cannot exceed 8 hours'));
    }

    // Validate attendees
    if (!params.attendees || params.attendees.length === 0) {
      return ResultUtils.fail(new Error('At least one attendee is required'));
    }

    // Validate quorum
    if (params.quorumRequired < 1) {
      return ResultUtils.fail(new Error('Quorum must be at least 1'));
    }

    if (params.quorumRequired > params.attendees.length) {
      return ResultUtils.fail(new Error('Quorum cannot exceed number of attendees'));
    }

    // Validate location
    if (params.location.type === 'virtual' || params.location.type === 'hybrid') {
      if (!params.location.virtualLink) {
        return ResultUtils.fail(new Error('Virtual meeting link is required'));
      }
    }

    if (params.location.type === 'physical' || params.location.type === 'hybrid') {
      if (!params.location.physicalAddress) {
        return ResultUtils.fail(new Error('Physical address is required'));
      }
    }

    // Create attendee objects with default status
    const attendees: MeetingAttendee[] = params.attendees.map(a => ({
      userId: a.userId,
      role: a.role,
      status: 'pending' as AttendanceStatus,
      invitedAt: new Date()
    }));

    // Create agenda items with IDs
    const agendaItems: AgendaItem[] = (params.agendaItems || []).map((item, index) => ({
      ...item,
      id: `agenda_${Date.now()}_${index}`,
      order: index + 1
    }));

    const meeting = new Meeting({
      id: params.id,
      title: params.title,
      description: params.description,
      type: params.type,
      status: 'scheduled',
      boardId: params.boardId,
      organizationId: params.organizationId,
      scheduledStart: params.scheduledStart,
      scheduledEnd: params.scheduledEnd,
      location: params.location,
      attendees,
      agendaItems,
      recurrence: params.recurrence,
      quorumRequired: params.quorumRequired,
      createdBy: params.createdBy,
      chairperson: params.chairperson,
      secretary: params.secretary,
      tags: params.tags,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Add domain event
    meeting.addDomainEvent('MeetingScheduled', {
      meetingId: meeting.id,
      title: meeting.title,
      scheduledStart: meeting.scheduledStart,
      attendeeCount: meeting.attendees.length,
      boardId: meeting.boardId
    });

    return ResultUtils.ok(meeting);
  }

  /**
   * Start the meeting
   */
  startMeeting(): Result<void> {
    if (this._status !== 'scheduled') {
      return ResultUtils.fail(new Error('Only scheduled meetings can be started'));
    }

    const now = new Date();
    const minutesEarly = (this._scheduledStart.getTime() - now.getTime()) / (1000 * 60);
    
    if (minutesEarly > 15) {
      return ResultUtils.fail(new Error('Meeting cannot be started more than 15 minutes early'));
    }

    this._status = 'in_progress';
    this._actualStart = now;
    this._updatedAt = now;

    // Check quorum
    const presentCount = this._attendees.filter(a => a.status === 'attended').length;
    this._quorumMet = presentCount >= this._quorumRequired;

    this.addDomainEvent('MeetingStarted', {
      meetingId: this.id,
      startedAt: this._actualStart,
      quorumMet: this._quorumMet
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * End the meeting
   */
  endMeeting(): Result<void> {
    if (this._status !== 'in_progress') {
      return ResultUtils.fail(new Error('Only in-progress meetings can be ended'));
    }

    const now = new Date();
    this._status = 'completed';
    this._actualEnd = now;
    this._updatedAt = now;

    this.addDomainEvent('MeetingEnded', {
      meetingId: this.id,
      endedAt: this._actualEnd,
      duration: this._actualStart ? 
        (this._actualEnd.getTime() - this._actualStart.getTime()) / (1000 * 60) : 0
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Cancel the meeting
   */
  cancelMeeting(reason: string): Result<void> {
    if (this._status === 'completed') {
      return ResultUtils.fail(new Error('Completed meetings cannot be cancelled'));
    }

    if (this._status === 'cancelled') {
      return ResultUtils.fail(new Error('Meeting is already cancelled'));
    }

    if (!reason || reason.trim().length === 0) {
      return ResultUtils.fail(new Error('Cancellation reason is required'));
    }

    const now = new Date();
    this._status = 'cancelled';
    this._cancelledAt = now;
    this._cancelReason = reason;
    this._updatedAt = now;

    this.addDomainEvent('MeetingCancelled', {
      meetingId: this.id,
      cancelledAt: this._cancelledAt,
      reason: this._cancelReason
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Update attendee status
   */
  updateAttendeeStatus(userId: UserId, status: AttendanceStatus): Result<void> {
    const attendee = this._attendees.find(a => a.userId === userId);
    if (!attendee) {
      return ResultUtils.fail(new Error('Attendee not found'));
    }

    const previousStatus = attendee.status;
    attendee.status = status;
    attendee.respondedAt = new Date();

    if (status === 'attended') {
      attendee.attendedAt = new Date();
    }

    this._updatedAt = new Date();

    this.addDomainEvent('AttendeeStatusUpdated', {
      meetingId: this.id,
      userId,
      previousStatus,
      newStatus: status
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Add agenda item
   */
  addAgendaItem(item: Omit<AgendaItem, 'id' | 'order'>): Result<void> {
    if (!item.title || item.title.trim().length === 0) {
      return ResultUtils.fail(new Error('Agenda item title is required'));
    }

    const newItem: AgendaItem = {
      ...item,
      id: `agenda_${Date.now()}_${this._agendaItems.length}`,
      order: this._agendaItems.length + 1
    };

    this._agendaItems.push(newItem);
    this._updatedAt = new Date();

    this.addDomainEvent('AgendaItemAdded', {
      meetingId: this.id,
      itemId: newItem.id,
      title: newItem.title
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Remove agenda item
   */
  removeAgendaItem(itemId: string): Result<void> {
    const index = this._agendaItems.findIndex(item => item.id === itemId);
    if (index === -1) {
      return ResultUtils.fail(new Error('Agenda item not found'));
    }

    const removedItem = this._agendaItems.splice(index, 1)[0];
    
    // Reorder remaining items
    this._agendaItems.forEach((item, idx) => {
      item.order = idx + 1;
    });

    this._updatedAt = new Date();

    this.addDomainEvent('AgendaItemRemoved', {
      meetingId: this.id,
      itemId: removedItem.id,
      title: removedItem.title
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Add meeting minutes
   */
  addMinutes(minutes: Omit<MeetingMinutes, 'id' | 'meetingId' | 'createdAt'>): Result<void> {
    if (this._status !== 'completed' && this._status !== 'in_progress') {
      return ResultUtils.fail(new Error('Minutes can only be added to in-progress or completed meetings'));
    }

    if (this._minutes) {
      return ResultUtils.fail(new Error('Minutes already exist for this meeting'));
    }

    this._minutes = {
      ...minutes,
      id: `minutes_${Date.now()}`,
      meetingId: this.id,
      createdAt: new Date()
    };

    this._updatedAt = new Date();

    this.addDomainEvent('MinutesAdded', {
      meetingId: this.id,
      minutesId: this._minutes.id,
      preparedBy: this._minutes.preparedBy
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Approve minutes
   */
  approveMinutes(approvedBy: UserId): Result<void> {
    if (!this._minutes) {
      return ResultUtils.fail(new Error('No minutes to approve'));
    }

    if (this._minutes.approvedBy) {
      return ResultUtils.fail(new Error('Minutes already approved'));
    }

    this._minutes.approvedBy = approvedBy;
    this._minutes.approvedAt = new Date();
    this._updatedAt = new Date();

    this.addDomainEvent('MinutesApproved', {
      meetingId: this.id,
      minutesId: this._minutes.id,
      approvedBy
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Add document to meeting
   */
  addDocument(documentId: string): Result<void> {
    if (!this._documents) {
      this._documents = [];
    }

    if (this._documents.includes(documentId)) {
      return ResultUtils.fail(new Error('Document already added to meeting'));
    }

    this._documents.push(documentId);
    this._updatedAt = new Date();

    this.addDomainEvent('DocumentAddedToMeeting', {
      meetingId: this.id,
      documentId
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Check if user is an attendee
   */
  isAttendee(userId: UserId): boolean {
    return this._attendees.some(a => a.userId === userId);
  }

  /**
   * Check if user is the chairperson
   */
  isChairperson(userId: UserId): boolean {
    return this._chairperson === userId;
  }

  /**
   * Check if user is the secretary
   */
  isSecretary(userId: UserId): boolean {
    return this._secretary === userId;
  }

  /**
   * Get attendee count by status
   */
  getAttendeeCountByStatus(status: AttendanceStatus): number {
    return this._attendees.filter(a => a.status === status).length;
  }

  /**
   * Check if meeting has quorum
   */
  hasQuorum(): boolean {
    const presentCount = this.getAttendeeCountByStatus('attended');
    return presentCount >= this._quorumRequired;
  }

  /**
   * Convert to plain object for persistence
   */
  toPersistence(): MeetingProps {
    return {
      id: this._id,
      title: this._title,
      description: this._description,
      type: this._type,
      status: this._status,
      boardId: this._boardId,
      organizationId: this._organizationId,
      scheduledStart: this._scheduledStart,
      scheduledEnd: this._scheduledEnd,
      actualStart: this._actualStart,
      actualEnd: this._actualEnd,
      location: this._location,
      attendees: this._attendees,
      agendaItems: this._agendaItems,
      minutes: this._minutes,
      recurrence: this._recurrence,
      quorumRequired: this._quorumRequired,
      quorumMet: this._quorumMet,
      createdBy: this._createdBy,
      chairperson: this._chairperson,
      secretary: this._secretary,
      documents: this._documents,
      recordings: this._recordings,
      notes: this._notes,
      tags: this._tags,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      cancelledAt: this._cancelledAt,
      cancelReason: this._cancelReason
    };
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(props: MeetingProps): Meeting {
    return new Meeting(props);
  }
}