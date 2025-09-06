/**
 * Meeting Repository Implementation
 * Adapter for meeting persistence using Supabase
 */

import { Result } from '../../01-shared/types/core.types';
import { ResultUtils } from '../../01-shared/lib/result';
import { 
  Meeting, 
  MeetingStatus, 
  MeetingType,
  AttendanceStatus,
  MeetingProps,
  MeetingAttendee,
  AgendaItem,
  MeetingLocation
} from '../../domain/entities/meeting.entity';
import { 
  IMeetingRepository,
  MeetingFilters,
  MeetingListOptions,
  MeetingStatistics,
  AttendeeStatistics
} from '../../application/interfaces/repositories/meeting.repository.interface';
import type { MeetingId, UserId, BoardId, OrganizationId } from '../../types/core';

/**
 * Meeting Repository Implementation
 */
export class MeetingRepositoryImpl implements IMeetingRepository {
  constructor(private readonly supabase: any) {}

  /**
   * Create a new meeting
   */
  async create(meeting: Meeting): Promise<Result<Meeting>> {
    try {
      const meetingData = this.domainToDb(meeting);
      
      const { data, error } = await this.supabase
        .from('meetings')
        .insert(meetingData)
        .select()
        .single();

      if (error) {
        console.error('[MeetingRepository] Create error:', error);
        return ResultUtils.fail(new Error(`Failed to create meeting: ${error.message}`));
      }

      // Insert attendees
      if (meeting.attendees.length > 0) {
        const attendeeData = meeting.attendees.map(a => ({
          meeting_id: meeting.id,
          user_id: a.userId,
          role: a.role,
          status: a.status,
          invited_at: a.invitedAt,
          responded_at: a.respondedAt,
          attended_at: a.attendedAt,
          notes: a.notes
        }));

        const { error: attendeeError } = await this.supabase
          .from('meeting_attendees')
          .insert(attendeeData);

        if (attendeeError) {
          console.error('[MeetingRepository] Attendee insert error:', attendeeError);
          // Rollback meeting creation
          await this.supabase.from('meetings').delete().eq('id', meeting.id);
          return ResultUtils.fail(new Error(`Failed to add attendees: ${attendeeError.message}`));
        }
      }

      // Insert agenda items
      if (meeting.agendaItems.length > 0) {
        const agendaData = meeting.agendaItems.map(item => ({
          meeting_id: meeting.id,
          item_id: item.id,
          title: item.title,
          description: item.description,
          presenter_id: item.presenter,
          duration_minutes: item.duration,
          order_index: item.order,
          attachments: item.attachments,
          discussion_notes: item.discussionNotes,
          decisions: item.decisions,
          action_items: item.actionItems,
          voting_results: item.votingResults
        }));

        const { error: agendaError } = await this.supabase
          .from('meeting_agenda_items')
          .insert(agendaData);

        if (agendaError) {
          console.error('[MeetingRepository] Agenda insert error:', agendaError);
        }
      }

      return ResultUtils.ok(meeting);
    } catch (error) {
      console.error('[MeetingRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to create meeting')
      );
    }
  }

  /**
   * Update an existing meeting
   */
  async update(meeting: Meeting): Promise<Result<Meeting>> {
    try {
      const meetingData = this.domainToDb(meeting);
      
      const { error } = await this.supabase
        .from('meetings')
        .update(meetingData)
        .eq('id', meeting.id);

      if (error) {
        console.error('[MeetingRepository] Update error:', error);
        return ResultUtils.fail(new Error(`Failed to update meeting: ${error.message}`));
      }

      // Update attendees (delete and re-insert for simplicity)
      await this.supabase
        .from('meeting_attendees')
        .delete()
        .eq('meeting_id', meeting.id);

      if (meeting.attendees.length > 0) {
        const attendeeData = meeting.attendees.map(a => ({
          meeting_id: meeting.id,
          user_id: a.userId,
          role: a.role,
          status: a.status,
          invited_at: a.invitedAt,
          responded_at: a.respondedAt,
          attended_at: a.attendedAt,
          notes: a.notes
        }));

        const { error: attendeeError } = await this.supabase
          .from('meeting_attendees')
          .insert(attendeeData);

        if (attendeeError) {
          console.error('[MeetingRepository] Attendee update error:', attendeeError);
        }
      }

      // Update agenda items
      await this.supabase
        .from('meeting_agenda_items')
        .delete()
        .eq('meeting_id', meeting.id);

      if (meeting.agendaItems.length > 0) {
        const agendaData = meeting.agendaItems.map(item => ({
          meeting_id: meeting.id,
          item_id: item.id,
          title: item.title,
          description: item.description,
          presenter_id: item.presenter,
          duration_minutes: item.duration,
          order_index: item.order,
          attachments: item.attachments,
          discussion_notes: item.discussionNotes,
          decisions: item.decisions,
          action_items: item.actionItems,
          voting_results: item.votingResults
        }));

        const { error: agendaError } = await this.supabase
          .from('meeting_agenda_items')
          .insert(agendaData);

        if (agendaError) {
          console.error('[MeetingRepository] Agenda update error:', agendaError);
        }
      }

      return ResultUtils.ok(meeting);
    } catch (error) {
      console.error('[MeetingRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to update meeting')
      );
    }
  }

  /**
   * Find meeting by ID
   */
  async findById(id: MeetingId): Promise<Result<Meeting>> {
    try {
      const { data: meetingData, error } = await this.supabase
        .from('meetings')
        .select(`
          *,
          meeting_attendees(
            user_id,
            role,
            status,
            invited_at,
            responded_at,
            attended_at,
            notes
          ),
          meeting_agenda_items(
            item_id,
            title,
            description,
            presenter_id,
            duration_minutes,
            order_index,
            attachments,
            discussion_notes,
            decisions,
            action_items,
            voting_results
          ),
          meeting_minutes(
            id,
            prepared_by,
            approved_by,
            content,
            key_decisions,
            action_items,
            next_meeting_date,
            attachments,
            created_at,
            approved_at
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return ResultUtils.fail(new Error('Meeting not found'));
        }
        console.error('[MeetingRepository] Find error:', error);
        return ResultUtils.fail(new Error(`Failed to find meeting: ${error.message}`));
      }

      const meeting = this.dbToDomain(meetingData);
      return ResultUtils.ok(meeting);
    } catch (error) {
      console.error('[MeetingRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find meeting')
      );
    }
  }

  /**
   * Find meetings by board
   */
  async findByBoard(boardId: BoardId, options?: MeetingListOptions): Promise<Result<Meeting[]>> {
    try {
      let query = this.supabase
        .from('meetings')
        .select('*')
        .eq('board_id', boardId);

      query = this.applyFilters(query, options?.filters);
      query = this.applySorting(query, options);
      query = this.applyPagination(query, options);

      const { data, error } = await query;

      if (error) {
        console.error('[MeetingRepository] Find by board error:', error);
        return ResultUtils.fail(new Error(`Failed to find meetings: ${error.message}`));
      }

      const meetings = data.map((d: any) => this.dbToDomain(d));
      return ResultUtils.ok(meetings);
    } catch (error) {
      console.error('[MeetingRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find meetings by board')
      );
    }
  }

  /**
   * Find meetings by organization
   */
  async findByOrganization(organizationId: OrganizationId, options?: MeetingListOptions): Promise<Result<Meeting[]>> {
    try {
      let query = this.supabase
        .from('meetings')
        .select('*')
        .eq('organization_id', organizationId);

      query = this.applyFilters(query, options?.filters);
      query = this.applySorting(query, options);
      query = this.applyPagination(query, options);

      const { data, error } = await query;

      if (error) {
        console.error('[MeetingRepository] Find by organization error:', error);
        return ResultUtils.fail(new Error(`Failed to find meetings: ${error.message}`));
      }

      const meetings = data.map((d: any) => this.dbToDomain(d));
      return ResultUtils.ok(meetings);
    } catch (error) {
      console.error('[MeetingRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find meetings by organization')
      );
    }
  }

  /**
   * Find meetings for a user (as attendee)
   */
  async findByAttendee(userId: UserId, options?: MeetingListOptions): Promise<Result<Meeting[]>> {
    try {
      // First get meeting IDs where user is an attendee
      const { data: attendeeData, error: attendeeError } = await this.supabase
        .from('meeting_attendees')
        .select('meeting_id')
        .eq('user_id', userId);

      if (attendeeError) {
        console.error('[MeetingRepository] Find attendee meetings error:', attendeeError);
        return ResultUtils.fail(new Error(`Failed to find meetings: ${attendeeError.message}`));
      }

      if (!attendeeData || attendeeData.length === 0) {
        return ResultUtils.ok([]);
      }

      const meetingIds = attendeeData.map((a: any) => a.meeting_id);

      let query = this.supabase
        .from('meetings')
        .select('*')
        .in('id', meetingIds);

      query = this.applyFilters(query, options?.filters);
      query = this.applySorting(query, options);
      query = this.applyPagination(query, options);

      const { data, error } = await query;

      if (error) {
        console.error('[MeetingRepository] Find by attendee error:', error);
        return ResultUtils.fail(new Error(`Failed to find meetings: ${error.message}`));
      }

      const meetings = data.map((d: any) => this.dbToDomain(d));
      return ResultUtils.ok(meetings);
    } catch (error) {
      console.error('[MeetingRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find meetings by attendee')
      );
    }
  }

  /**
   * Find upcoming meetings
   */
  async findUpcoming(options?: MeetingListOptions): Promise<Result<Meeting[]>> {
    try {
      const now = new Date();
      
      let query = this.supabase
        .from('meetings')
        .select('*')
        .gte('scheduled_start', now.toISOString())
        .in('status', ['scheduled']);

      query = this.applyFilters(query, options?.filters);
      query = this.applySorting(query, { ...options, sortBy: 'scheduledStart', sortOrder: 'asc' });
      query = this.applyPagination(query, options);

      const { data, error } = await query;

      if (error) {
        console.error('[MeetingRepository] Find upcoming error:', error);
        return ResultUtils.fail(new Error(`Failed to find upcoming meetings: ${error.message}`));
      }

      const meetings = data.map((d: any) => this.dbToDomain(d));
      return ResultUtils.ok(meetings);
    } catch (error) {
      console.error('[MeetingRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find upcoming meetings')
      );
    }
  }

  /**
   * Search meetings
   */
  async search(query: string, options?: MeetingListOptions): Promise<Result<Meeting[]>> {
    try {
      let dbQuery = this.supabase
        .from('meetings')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`);

      dbQuery = this.applyFilters(dbQuery, options?.filters);
      dbQuery = this.applySorting(dbQuery, options);
      dbQuery = this.applyPagination(dbQuery, options);

      const { data, error } = await dbQuery;

      if (error) {
        console.error('[MeetingRepository] Search error:', error);
        return ResultUtils.fail(new Error(`Failed to search meetings: ${error.message}`));
      }

      const meetings = data.map((d: any) => this.dbToDomain(d));
      return ResultUtils.ok(meetings);
    } catch (error) {
      console.error('[MeetingRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to search meetings')
      );
    }
  }

  /**
   * List meetings with filters
   */
  async list(options: MeetingListOptions): Promise<Result<{ meetings: Meeting[]; total: number }>> {
    try {
      let query = this.supabase
        .from('meetings')
        .select('*', { count: 'exact' });

      query = this.applyFilters(query, options.filters);
      query = this.applySorting(query, options);
      query = this.applyPagination(query, options);

      const { data, error, count } = await query;

      if (error) {
        console.error('[MeetingRepository] List error:', error);
        return ResultUtils.fail(new Error(`Failed to list meetings: ${error.message}`));
      }

      const meetings = data.map((d: any) => this.dbToDomain(d));
      return ResultUtils.ok({ meetings, total: count || 0 });
    } catch (error) {
      console.error('[MeetingRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to list meetings')
      );
    }
  }

  /**
   * Delete a meeting (soft delete)
   */
  async delete(id: MeetingId): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('meetings')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('[MeetingRepository] Delete error:', error);
        return ResultUtils.fail(new Error(`Failed to delete meeting: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[MeetingRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to delete meeting')
      );
    }
  }

  /**
   * Permanently delete a meeting
   */
  async permanentDelete(id: MeetingId): Promise<Result<void>> {
    try {
      // Delete related data first
      await this.supabase.from('meeting_attendees').delete().eq('meeting_id', id);
      await this.supabase.from('meeting_agenda_items').delete().eq('meeting_id', id);
      await this.supabase.from('meeting_minutes').delete().eq('meeting_id', id);

      const { error } = await this.supabase
        .from('meetings')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[MeetingRepository] Permanent delete error:', error);
        return ResultUtils.fail(new Error(`Failed to permanently delete meeting: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[MeetingRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to permanently delete meeting')
      );
    }
  }

  /**
   * Update attendee status
   */
  async updateAttendeeStatus(
    meetingId: MeetingId,
    userId: UserId,
    status: AttendanceStatus
  ): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('meeting_attendees')
        .update({ 
          status,
          responded_at: new Date().toISOString(),
          attended_at: status === 'attended' ? new Date().toISOString() : null
        })
        .eq('meeting_id', meetingId)
        .eq('user_id', userId);

      if (error) {
        console.error('[MeetingRepository] Update attendee status error:', error);
        return ResultUtils.fail(new Error(`Failed to update attendee status: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[MeetingRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to update attendee status')
      );
    }
  }

  /**
   * Add attendee to meeting
   */
  async addAttendee(
    meetingId: MeetingId,
    attendee: { userId: UserId; role: string }
  ): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('meeting_attendees')
        .insert({
          meeting_id: meetingId,
          user_id: attendee.userId,
          role: attendee.role,
          status: 'pending',
          invited_at: new Date().toISOString()
        });

      if (error) {
        console.error('[MeetingRepository] Add attendee error:', error);
        return ResultUtils.fail(new Error(`Failed to add attendee: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[MeetingRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to add attendee')
      );
    }
  }

  /**
   * Remove attendee from meeting
   */
  async removeAttendee(meetingId: MeetingId, userId: UserId): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('meeting_attendees')
        .delete()
        .eq('meeting_id', meetingId)
        .eq('user_id', userId);

      if (error) {
        console.error('[MeetingRepository] Remove attendee error:', error);
        return ResultUtils.fail(new Error(`Failed to remove attendee: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[MeetingRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to remove attendee')
      );
    }
  }

  /**
   * Get meeting statistics
   */
  async getStatistics(filters?: MeetingFilters): Promise<Result<MeetingStatistics>> {
    try {
      let query = this.supabase.from('meetings').select('*', { count: 'exact' });
      
      if (filters) {
        query = this.applyFilters(query, filters);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('[MeetingRepository] Get statistics error:', error);
        return ResultUtils.fail(new Error(`Failed to get statistics: ${error.message}`));
      }

      const byStatus: Record<MeetingStatus, number> = {
        draft: 0,
        scheduled: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0
      };

      const byType: Record<MeetingType, number> = {
        board: 0,
        committee: 0,
        special: 0,
        annual: 0,
        emergency: 0
      };

      let totalDuration = 0;
      let completedCount = 0;
      let quorumMetCount = 0;
      let cancelledCount = 0;

      data.forEach((meeting: any) => {
        byStatus[meeting.status as MeetingStatus]++;
        byType[meeting.type as MeetingType]++;

        if (meeting.status === 'completed' && meeting.actual_start && meeting.actual_end) {
          const duration = new Date(meeting.actual_end).getTime() - new Date(meeting.actual_start).getTime();
          totalDuration += duration;
          completedCount++;
          
          if (meeting.quorum_met) {
            quorumMetCount++;
          }
        }

        if (meeting.status === 'cancelled') {
          cancelledCount++;
        }
      });

      const statistics: MeetingStatistics = {
        totalMeetings: count || 0,
        byStatus,
        byType,
        averageDuration: completedCount > 0 ? totalDuration / completedCount / (1000 * 60) : 0,
        averageAttendance: 0, // Would need to join with attendees
        quorumMetRate: completedCount > 0 ? (quorumMetCount / completedCount) * 100 : 0,
        cancellationRate: count > 0 ? (cancelledCount / count) * 100 : 0
      };

      return ResultUtils.ok(statistics);
    } catch (error) {
      console.error('[MeetingRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get meeting statistics')
      );
    }
  }

  /**
   * Get attendee statistics
   */
  async getAttendeeStatistics(userId: UserId, dateRange?: { from: Date; to: Date }): Promise<Result<AttendeeStatistics>> {
    try {
      let query = this.supabase
        .from('meeting_attendees')
        .select('*, meetings(*)')
        .eq('user_id', userId);

      if (dateRange) {
        query = query
          .gte('meetings.scheduled_start', dateRange.from.toISOString())
          .lte('meetings.scheduled_start', dateRange.to.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('[MeetingRepository] Get attendee statistics error:', error);
        return ResultUtils.fail(new Error(`Failed to get attendee statistics: ${error.message}`));
      }

      const statistics: AttendeeStatistics = {
        userId,
        meetingsInvited: data.length,
        meetingsAttended: data.filter((a: any) => a.status === 'attended').length,
        attendanceRate: data.length > 0 ? 
          (data.filter((a: any) => a.status === 'attended').length / data.length) * 100 : 0,
        averageResponseTime: 0, // Would need to calculate from invited_at and responded_at
        roleDistribution: {}
      };

      // Calculate role distribution
      data.forEach((attendee: any) => {
        statistics.roleDistribution[attendee.role] = 
          (statistics.roleDistribution[attendee.role] || 0) + 1;
      });

      return ResultUtils.ok(statistics);
    } catch (error) {
      console.error('[MeetingRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get attendee statistics')
      );
    }
  }

  /**
   * Find meetings with conflicts
   */
  async findConflicts(
    scheduledStart: Date,
    scheduledEnd: Date,
    attendeeIds: UserId[]
  ): Promise<Result<Meeting[]>> {
    try {
      // Get meetings that overlap with the time range
      const { data: meetingData, error } = await this.supabase
        .from('meetings')
        .select('*, meeting_attendees(*)')
        .or(`scheduled_start.lte.${scheduledEnd.toISOString()},scheduled_end.gte.${scheduledStart.toISOString()}`)
        .in('status', ['scheduled', 'in_progress']);

      if (error) {
        console.error('[MeetingRepository] Find conflicts error:', error);
        return ResultUtils.fail(new Error(`Failed to find conflicts: ${error.message}`));
      }

      // Filter meetings that have attendee conflicts
      const conflictingMeetings = meetingData.filter((meeting: any) => {
        const meetingAttendeeIds = meeting.meeting_attendees.map((a: any) => a.user_id);
        return attendeeIds.some(id => meetingAttendeeIds.includes(id));
      });

      const meetings = conflictingMeetings.map((d: any) => this.dbToDomain(d));
      return ResultUtils.ok(meetings);
    } catch (error) {
      console.error('[MeetingRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find meeting conflicts')
      );
    }
  }

  /**
   * Find recurring meetings
   */
  async findRecurring(parentMeetingId: MeetingId): Promise<Result<Meeting[]>> {
    try {
      const { data, error } = await this.supabase
        .from('meetings')
        .select('*')
        .eq('parent_meeting_id', parentMeetingId)
        .order('scheduled_start', { ascending: true });

      if (error) {
        console.error('[MeetingRepository] Find recurring error:', error);
        return ResultUtils.fail(new Error(`Failed to find recurring meetings: ${error.message}`));
      }

      const meetings = data.map((d: any) => this.dbToDomain(d));
      return ResultUtils.ok(meetings);
    } catch (error) {
      console.error('[MeetingRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to find recurring meetings')
      );
    }
  }

  /**
   * Clone meeting as template
   */
  async cloneAsTemplate(meetingId: MeetingId): Promise<Result<Meeting>> {
    try {
      const findResult = await this.findById(meetingId);
      if (!findResult.success) {
        return findResult;
      }

      const originalMeeting = findResult.data;
      const newMeetingId = `meeting_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` as MeetingId;

      // Create a new meeting with same properties but new ID and status
      const clonedMeeting = Meeting.create({
        id: newMeetingId,
        title: `${originalMeeting.title} (Copy)`,
        description: originalMeeting.description,
        type: originalMeeting.type,
        boardId: originalMeeting.boardId,
        organizationId: originalMeeting.organizationId,
        scheduledStart: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        scheduledEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1 hour meeting
        location: originalMeeting.location,
        attendees: originalMeeting.attendees.map(a => ({ userId: a.userId, role: a.role })),
        agendaItems: originalMeeting.agendaItems.map(item => ({
          title: item.title,
          description: item.description,
          presenter: item.presenter,
          duration: item.duration,
          attachments: item.attachments
        })),
        quorumRequired: originalMeeting.quorumRequired,
        createdBy: originalMeeting.createdBy,
        chairperson: originalMeeting.chairperson,
        secretary: originalMeeting.secretary,
        tags: originalMeeting.tags
      });

      if (!clonedMeeting.success) {
        return clonedMeeting;
      }

      return await this.create(clonedMeeting.data);
    } catch (error) {
      console.error('[MeetingRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to clone meeting')
      );
    }
  }

  /**
   * Archive old meetings
   */
  async archiveOldMeetings(beforeDate: Date): Promise<Result<number>> {
    try {
      const { data, error } = await this.supabase
        .from('meetings')
        .update({ 
          status: 'archived',
          archived_at: new Date().toISOString()
        })
        .lt('scheduled_end', beforeDate.toISOString())
        .in('status', ['completed', 'cancelled'])
        .select();

      if (error) {
        console.error('[MeetingRepository] Archive old meetings error:', error);
        return ResultUtils.fail(new Error(`Failed to archive meetings: ${error.message}`));
      }

      return ResultUtils.ok(data.length);
    } catch (error) {
      console.error('[MeetingRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to archive old meetings')
      );
    }
  }

  /**
   * Check if user has access to meeting
   */
  async checkAccess(meetingId: MeetingId, userId: UserId): Promise<Result<boolean>> {
    try {
      // Check if user is an attendee
      const { data, error } = await this.supabase
        .from('meeting_attendees')
        .select('user_id')
        .eq('meeting_id', meetingId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[MeetingRepository] Check access error:', error);
        return ResultUtils.fail(new Error(`Failed to check access: ${error.message}`));
      }

      return ResultUtils.ok(!!data);
    } catch (error) {
      console.error('[MeetingRepository] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to check meeting access')
      );
    }
  }

  /**
   * Apply filters to query
   */
  private applyFilters(query: any, filters?: MeetingFilters): any {
    if (!filters) return query;

    if (filters.boardId) {
      query = query.eq('board_id', filters.boardId);
    }

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

    if (filters.type) {
      if (Array.isArray(filters.type)) {
        query = query.in('type', filters.type);
      } else {
        query = query.eq('type', filters.type);
      }
    }

    if (filters.createdBy) {
      query = query.eq('created_by', filters.createdBy);
    }

    if (filters.chairperson) {
      query = query.eq('chairperson', filters.chairperson);
    }

    if (filters.fromDate) {
      query = query.gte('scheduled_start', filters.fromDate.toISOString());
    }

    if (filters.toDate) {
      query = query.lte('scheduled_start', filters.toDate.toISOString());
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    if (filters.hasMinutes !== undefined) {
      if (filters.hasMinutes) {
        query = query.not('minutes', 'is', null);
      } else {
        query = query.is('minutes', null);
      }
    }

    return query;
  }

  /**
   * Apply sorting to query
   */
  private applySorting(query: any, options?: MeetingListOptions): any {
    const sortBy = options?.sortBy || 'scheduledStart';
    const sortOrder = options?.sortOrder || 'desc';

    const sortMap: Record<string, string> = {
      scheduledStart: 'scheduled_start',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      title: 'title'
    };

    const column = sortMap[sortBy] || 'scheduled_start';
    return query.order(column, { ascending: sortOrder === 'asc' });
  }

  /**
   * Apply pagination to query
   */
  private applyPagination(query: any, options?: MeetingListOptions): any {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    return query.range(offset, offset + limit - 1);
  }

  /**
   * Convert domain entity to database format
   */
  private domainToDb(meeting: Meeting): any {
    const props = meeting.toPersistence();
    
    return {
      id: props.id,
      title: props.title,
      description: props.description,
      type: props.type,
      status: props.status,
      board_id: props.boardId,
      organization_id: props.organizationId,
      scheduled_start: props.scheduledStart,
      scheduled_end: props.scheduledEnd,
      actual_start: props.actualStart,
      actual_end: props.actualEnd,
      location_type: props.location.type,
      location_physical_address: props.location.physicalAddress,
      location_virtual_link: props.location.virtualLink,
      location_virtual_platform: props.location.virtualPlatform,
      location_access_code: props.location.accessCode,
      location_dial_in_number: props.location.dialInNumber,
      quorum_required: props.quorumRequired,
      quorum_met: props.quorumMet,
      created_by: props.createdBy,
      chairperson: props.chairperson,
      secretary: props.secretary,
      documents: props.documents,
      recordings: props.recordings,
      notes: props.notes,
      tags: props.tags,
      created_at: props.createdAt,
      updated_at: props.updatedAt,
      cancelled_at: props.cancelledAt,
      cancel_reason: props.cancelReason,
      recurrence_pattern: props.recurrence?.pattern,
      recurrence_interval: props.recurrence?.interval,
      recurrence_days_of_week: props.recurrence?.daysOfWeek,
      recurrence_day_of_month: props.recurrence?.dayOfMonth,
      recurrence_month_of_year: props.recurrence?.monthOfYear,
      recurrence_end_date: props.recurrence?.endDate,
      recurrence_occurrences: props.recurrence?.occurrences
    };
  }

  /**
   * Convert database format to domain entity
   */
  private dbToDomain(data: any): Meeting {
    const location: MeetingLocation = {
      type: data.location_type,
      physicalAddress: data.location_physical_address,
      virtualLink: data.location_virtual_link,
      virtualPlatform: data.location_virtual_platform,
      accessCode: data.location_access_code,
      dialInNumber: data.location_dial_in_number
    };

    const attendees: MeetingAttendee[] = data.meeting_attendees?.map((a: any) => ({
      userId: a.user_id,
      role: a.role,
      status: a.status,
      invitedAt: new Date(a.invited_at),
      respondedAt: a.responded_at ? new Date(a.responded_at) : undefined,
      attendedAt: a.attended_at ? new Date(a.attended_at) : undefined,
      notes: a.notes
    })) || [];

    const agendaItems: AgendaItem[] = data.meeting_agenda_items?.map((item: any) => ({
      id: item.item_id,
      title: item.title,
      description: item.description,
      presenter: item.presenter_id,
      duration: item.duration_minutes,
      order: item.order_index,
      attachments: item.attachments,
      discussionNotes: item.discussion_notes,
      decisions: item.decisions,
      actionItems: item.action_items,
      votingResults: item.voting_results
    })) || [];

    const props: MeetingProps = {
      id: data.id,
      title: data.title,
      description: data.description,
      type: data.type,
      status: data.status,
      boardId: data.board_id,
      organizationId: data.organization_id,
      scheduledStart: new Date(data.scheduled_start),
      scheduledEnd: new Date(data.scheduled_end),
      actualStart: data.actual_start ? new Date(data.actual_start) : undefined,
      actualEnd: data.actual_end ? new Date(data.actual_end) : undefined,
      location,
      attendees,
      agendaItems,
      minutes: data.meeting_minutes?.[0], // Assuming one-to-one relationship
      recurrence: data.recurrence_pattern ? {
        pattern: data.recurrence_pattern,
        interval: data.recurrence_interval,
        daysOfWeek: data.recurrence_days_of_week,
        dayOfMonth: data.recurrence_day_of_month,
        monthOfYear: data.recurrence_month_of_year,
        endDate: data.recurrence_end_date ? new Date(data.recurrence_end_date) : undefined,
        occurrences: data.recurrence_occurrences
      } : undefined,
      quorumRequired: data.quorum_required,
      quorumMet: data.quorum_met,
      createdBy: data.created_by,
      chairperson: data.chairperson,
      secretary: data.secretary,
      documents: data.documents,
      recordings: data.recordings,
      notes: data.notes,
      tags: data.tags || [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      cancelledAt: data.cancelled_at ? new Date(data.cancelled_at) : undefined,
      cancelReason: data.cancel_reason
    };

    return Meeting.fromPersistence(props);
  }
}