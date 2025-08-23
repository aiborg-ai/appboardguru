/**
 * Virtual Breakout Rooms Management Service
 * Secure executive sessions and committee-specific breakout rooms
 */

import { supabaseAdmin } from '@/lib/supabase-admin';
import { Database } from '@/types/database';
import { WebRTCBoardRoomService } from './webrtc-board-room.service';

type SupabaseClient = ReturnType<typeof supabaseAdmin>;

export interface BreakoutRoom {
  id: string;
  parentSessionId: string;
  name: string;
  type: 'executive_session' | 'committee_discussion' | 'private_consultation' | 'working_group';
  createdBy: string;
  maxParticipants: number;
  isPrivate: boolean;
  requiresApproval: boolean;
  autoReturnTime?: Date;
  encryptionKeyId: string;
  status: 'active' | 'paused' | 'ended';
  startTime: Date;
  endTime?: Date;
  participants: BreakoutParticipant[];
  metadata: Record<string, any>;
}

export interface BreakoutParticipant {
  id: string;
  participantId: string;
  userId: string;
  role: 'moderator' | 'participant' | 'observer';
  joinTime: Date;
  leaveTime?: Date;
  isPresent: boolean;
  permissions: BreakoutPermissions;
}

export interface BreakoutPermissions {
  canInviteOthers: boolean;
  canModerateDiscussion: boolean;
  canShareScreen: boolean;
  canRecord: boolean;
  canAccessDocuments: boolean;
  canMakeMotions: boolean;
}

export interface BreakoutInvitation {
  id: string;
  breakoutRoomId: string;
  invitedUserId: string;
  invitedBy: string;
  invitationMessage?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: Date;
  sentAt: Date;
}

export interface BreakoutRoomTransition {
  fromRoomId: string;
  toRoomId: string;
  participantId: string;
  transitionType: 'automatic' | 'manual' | 'requested';
  scheduledTime?: Date;
  reason?: string;
}

export interface ExecutiveSessionConfig {
  restrictedToDirectors: boolean;
  excludeObservers: boolean;
  requireUnanimousApproval: boolean;
  maxDuration: number; // in minutes
  autoMute: boolean;
  recordingRestricted: boolean;
}

export class BreakoutRoomsService {
  private supabase: SupabaseClient;
  private webrtcService: WebRTCBoardRoomService;
  private activeRooms: Map<string, BreakoutRoom> = new Map();
  private roomConnections: Map<string, WebRTCBoardRoomService> = new Map();
  private eventEmitter: EventTarget = new EventTarget();
  private autoReturnTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(webrtcService: WebRTCBoardRoomService) {
    this.supabase = supabaseAdmin();
    this.webrtcService = webrtcService;
  }

  /**
   * Create a new breakout room
   */
  async createBreakoutRoom(
    parentSessionId: string,
    roomConfig: Omit<BreakoutRoom, 'id' | 'startTime' | 'participants' | 'status'>
  ): Promise<BreakoutRoom> {
    const roomId = crypto.randomUUID();
    const encryptionKeyId = await this.generateRoomEncryptionKey(roomId);

    const breakoutRoom: BreakoutRoom = {
      id: roomId,
      parentSessionId,
      encryptionKeyId,
      startTime: new Date(),
      status: 'active',
      participants: [],
      ...roomConfig
    };

    // Store in database
    const { error } = await this.supabase
      .from('board_room_breakouts')
      .insert({
        id: roomId,
        parent_session_id: parentSessionId,
        breakout_name: roomConfig.name,
        breakout_type: roomConfig.type,
        created_by: roomConfig.createdBy,
        max_participants: roomConfig.maxParticipants,
        is_private: roomConfig.isPrivate,
        requires_approval: roomConfig.requiresApproval,
        auto_return_time: roomConfig.autoReturnTime?.toISOString(),
        encryption_key_id: encryptionKeyId,
        status: 'active',
        metadata: roomConfig.metadata || {}
      });

    if (error) {
      throw new Error(`Failed to create breakout room: ${error.message}`);
    }

    // Initialize WebRTC service for the room
    const roomWebRTC = new WebRTCBoardRoomService();
    await roomWebRTC.initializeSession(roomId, roomConfig.createdBy);
    this.roomConnections.set(roomId, roomWebRTC);

    // Set up auto-return timer if specified
    if (roomConfig.autoReturnTime) {
      this.setupAutoReturnTimer(roomId, roomConfig.autoReturnTime);
    }

    // Cache the room
    this.activeRooms.set(roomId, breakoutRoom);

    // Log security event
    await this.logSecurityEvent({
      event_type: 'breakout_room_created',
      session_id: parentSessionId,
      user_id: roomConfig.createdBy,
      event_description: `Breakout room "${roomConfig.name}" created`,
      severity_level: 'info',
      event_data: {
        room_id: roomId,
        room_type: roomConfig.type,
        is_private: roomConfig.isPrivate
      }
    });

    this.emit('breakoutRoomCreated', { room: breakoutRoom });
    return breakoutRoom;
  }

  /**
   * Join a breakout room
   */
  async joinBreakoutRoom(
    roomId: string,
    participantId: string,
    userId: string,
    role: BreakoutParticipant['role'] = 'participant'
  ): Promise<BreakoutParticipant> {
    const room = await this.getBreakoutRoom(roomId);
    if (!room) {
      throw new Error('Breakout room not found');
    }

    // Check permissions and capacity
    await this.validateRoomAccess(room, userId);

    if (room.participants.length >= room.maxParticipants) {
      throw new Error('Breakout room is at capacity');
    }

    // Check if user is already in the room
    const existingParticipant = room.participants.find(p => p.userId === userId);
    if (existingParticipant && existingParticipant.isPresent) {
      return existingParticipant;
    }

    // Set role-based permissions
    const permissions = this.getRolePermissions(role, room.type);

    const participant: BreakoutParticipant = {
      id: crypto.randomUUID(),
      participantId,
      userId,
      role,
      joinTime: new Date(),
      isPresent: true,
      permissions
    };

    // Add to database
    const { error } = await this.supabase
      .from('board_room_breakout_participants')
      .insert({
        id: participant.id,
        breakout_id: roomId,
        participant_id: participantId,
        joined_at: participant.joinTime.toISOString(),
        is_present: true,
        role: role
      });

    if (error) {
      throw new Error(`Failed to join breakout room: ${error.message}`);
    }

    // Join WebRTC session
    const roomWebRTC = this.roomConnections.get(roomId);
    if (roomWebRTC) {
      await roomWebRTC.joinSession(role);
    }

    // Update room participants
    room.participants.push(participant);
    this.activeRooms.set(roomId, room);

    // Log security event
    await this.logSecurityEvent({
      event_type: 'breakout_room_joined',
      session_id: room.parentSessionId,
      user_id: userId,
      event_description: `User joined breakout room "${room.name}"`,
      severity_level: 'info',
      event_data: {
        room_id: roomId,
        participant_role: role
      }
    });

    this.emit('participantJoinedBreakout', { room, participant });
    return participant;
  }

  /**
   * Leave a breakout room
   */
  async leaveBreakoutRoom(roomId: string, userId: string): Promise<void> {
    const room = await this.getBreakoutRoom(roomId);
    if (!room) return;

    const participantIndex = room.participants.findIndex(p => p.userId === userId && p.isPresent);
    if (participantIndex === -1) return;

    const participant = room.participants[participantIndex];
    participant.isPresent = false;
    participant.leaveTime = new Date();

    // Update database
    await this.supabase
      .from('board_room_breakout_participants')
      .update({
        is_present: false,
        left_at: participant.leaveTime.toISOString()
      })
      .eq('id', participant.id);

    // Leave WebRTC session
    const roomWebRTC = this.roomConnections.get(roomId);
    if (roomWebRTC) {
      await roomWebRTC.leaveSession();
    }

    // Update room
    this.activeRooms.set(roomId, room);

    // Auto-close room if no participants remain
    const activeParticipants = room.participants.filter(p => p.isPresent);
    if (activeParticipants.length === 0) {
      await this.endBreakoutRoom(roomId, 'auto_close_empty');
    }

    this.emit('participantLeftBreakout', { room, participant });
  }

  /**
   * Create executive session with enhanced security
   */
  async createExecutiveSession(
    parentSessionId: string,
    createdBy: string,
    config: ExecutiveSessionConfig
  ): Promise<BreakoutRoom> {
    // Get board directors only
    const { data: directors } = await this.supabase
      .from('board_room_participants')
      .select('user_id, participant_role')
      .eq('session_id', parentSessionId)
      .eq('participant_role', 'director');

    if (!directors || directors.length === 0) {
      throw new Error('No directors found for executive session');
    }

    const executiveRoom = await this.createBreakoutRoom(parentSessionId, {
      name: 'Executive Session',
      type: 'executive_session',
      createdBy,
      maxParticipants: directors.length,
      isPrivate: true,
      requiresApproval: config.requireUnanimousApproval,
      autoReturnTime: new Date(Date.now() + config.maxDuration * 60000),
      metadata: {
        executive_config: config,
        restricted_to_directors: config.restrictedToDirectors,
        recording_restricted: config.recordingRestricted
      }
    });

    // Auto-invite all directors
    if (config.restrictedToDirectors) {
      for (const director of directors) {
        await this.inviteToBreakoutRoom(
          executiveRoom.id,
          director.user_id,
          createdBy,
          'Executive session convened'
        );
      }
    }

    // Log high-security event
    await this.logSecurityEvent({
      event_type: 'executive_session_created',
      session_id: parentSessionId,
      user_id: createdBy,
      event_description: 'Executive session convened',
      severity_level: 'warning',
      event_data: {
        room_id: executiveRoom.id,
        config,
        director_count: directors.length
      }
    });

    return executiveRoom;
  }

  /**
   * Invite user to breakout room
   */
  async inviteToBreakoutRoom(
    roomId: string,
    invitedUserId: string,
    invitedBy: string,
    message?: string
  ): Promise<BreakoutInvitation> {
    const room = await this.getBreakoutRoom(roomId);
    if (!room) {
      throw new Error('Breakout room not found');
    }

    const invitation: BreakoutInvitation = {
      id: crypto.randomUUID(),
      breakoutRoomId: roomId,
      invitedUserId,
      invitedBy,
      invitationMessage: message,
      status: 'pending',
      expiresAt: new Date(Date.now() + 30 * 60000), // 30 minutes
      sentAt: new Date()
    };

    // Send notification
    await this.supabase
      .from('notifications')
      .insert({
        id: invitation.id,
        user_id: invitedUserId,
        type: 'breakout_room_invitation',
        title: `Invitation to ${room.name}`,
        message: message || `You've been invited to join the ${room.name} breakout room`,
        data: {
          breakout_room_id: roomId,
          invited_by: invitedBy,
          room_name: room.name,
          room_type: room.type
        },
        expires_at: invitation.expiresAt.toISOString()
      });

    this.emit('breakoutInvitationSent', { invitation, room });
    return invitation;
  }

  /**
   * Accept breakout room invitation
   */
  async acceptBreakoutInvitation(
    invitationId: string,
    participantId: string
  ): Promise<BreakoutParticipant> {
    const { data: notification, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (error || !notification) {
      throw new Error('Invitation not found');
    }

    if (notification.expires_at && new Date(notification.expires_at) < new Date()) {
      throw new Error('Invitation has expired');
    }

    const roomId = notification.data.breakout_room_id;
    const userId = notification.user_id;

    // Mark invitation as accepted
    await this.supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', invitationId);

    // Join the room
    return await this.joinBreakoutRoom(roomId, participantId, userId);
  }

  /**
   * Transfer participants between rooms
   */
  async transferParticipant(
    fromRoomId: string,
    toRoomId: string,
    userId: string,
    transitionType: BreakoutRoomTransition['transitionType'] = 'manual'
  ): Promise<void> {
    // Leave current room
    await this.leaveBreakoutRoom(fromRoomId, userId);

    // Get participant info
    const { data: participant } = await this.supabase
      .from('board_room_participants')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (participant) {
      // Join new room
      await this.joinBreakoutRoom(toRoomId, participant.id, userId);

      // Log transition
      const transition: BreakoutRoomTransition = {
        fromRoomId,
        toRoomId,
        participantId: participant.id,
        transitionType,
        scheduledTime: new Date()
      };

      this.emit('participantTransferred', { transition });
    }
  }

  /**
   * End a breakout room
   */
  async endBreakoutRoom(roomId: string, reason: string = 'manual'): Promise<void> {
    const room = await this.getBreakoutRoom(roomId);
    if (!room) return;

    // Remove all participants
    for (const participant of room.participants.filter(p => p.isPresent)) {
      await this.leaveBreakoutRoom(roomId, participant.userId);
    }

    // Update room status
    await this.supabase
      .from('board_room_breakouts')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('id', roomId);

    // Clean up WebRTC connection
    const roomWebRTC = this.roomConnections.get(roomId);
    if (roomWebRTC) {
      await roomWebRTC.leaveSession();
      this.roomConnections.delete(roomId);
    }

    // Clear auto-return timer
    const timer = this.autoReturnTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.autoReturnTimers.delete(roomId);
    }

    // Update cache
    room.status = 'ended';
    room.endTime = new Date();
    this.activeRooms.set(roomId, room);

    // Log event
    await this.logSecurityEvent({
      event_type: 'breakout_room_ended',
      session_id: room.parentSessionId,
      user_id: room.createdBy,
      event_description: `Breakout room "${room.name}" ended: ${reason}`,
      severity_level: 'info',
      event_data: {
        room_id: roomId,
        reason,
        duration_minutes: Math.round((Date.now() - room.startTime.getTime()) / 60000)
      }
    });

    this.emit('breakoutRoomEnded', { room, reason });
  }

  /**
   * Get active breakout rooms for a session
   */
  async getActiveBreakoutRooms(sessionId: string): Promise<BreakoutRoom[]> {
    const { data: rooms, error } = await this.supabase
      .from('board_room_breakouts')
      .select('*')
      .eq('parent_session_id', sessionId)
      .eq('status', 'active');

    if (error) {
      throw new Error(`Failed to get breakout rooms: ${error.message}`);
    }

    const breakoutRooms: BreakoutRoom[] = [];

    for (const room of rooms || []) {
      const participants = await this.getBreakoutParticipants(room.id);
      
      breakoutRooms.push({
        id: room.id,
        parentSessionId: room.parent_session_id,
        name: room.breakout_name,
        type: room.breakout_type,
        createdBy: room.created_by,
        maxParticipants: room.max_participants,
        isPrivate: room.is_private,
        requiresApproval: room.requires_approval,
        autoReturnTime: room.auto_return_time ? new Date(room.auto_return_time) : undefined,
        encryptionKeyId: room.encryption_key_id,
        status: room.status,
        startTime: new Date(room.started_at || room.created_at),
        endTime: room.ended_at ? new Date(room.ended_at) : undefined,
        participants,
        metadata: room.metadata || {}
      });
    }

    return breakoutRooms;
  }

  /**
   * Get breakout room by ID
   */
  private async getBreakoutRoom(roomId: string): Promise<BreakoutRoom | null> {
    // Check cache first
    const cachedRoom = this.activeRooms.get(roomId);
    if (cachedRoom) return cachedRoom;

    // Load from database
    const { data: room, error } = await this.supabase
      .from('board_room_breakouts')
      .select('*')
      .eq('id', roomId)
      .single();

    if (error || !room) return null;

    const participants = await this.getBreakoutParticipants(roomId);

    const breakoutRoom: BreakoutRoom = {
      id: room.id,
      parentSessionId: room.parent_session_id,
      name: room.breakout_name,
      type: room.breakout_type,
      createdBy: room.created_by,
      maxParticipants: room.max_participants,
      isPrivate: room.is_private,
      requiresApproval: room.requires_approval,
      autoReturnTime: room.auto_return_time ? new Date(room.auto_return_time) : undefined,
      encryptionKeyId: room.encryption_key_id,
      status: room.status,
      startTime: new Date(room.started_at || room.created_at),
      endTime: room.ended_at ? new Date(room.ended_at) : undefined,
      participants,
      metadata: room.metadata || {}
    };

    this.activeRooms.set(roomId, breakoutRoom);
    return breakoutRoom;
  }

  /**
   * Get participants in a breakout room
   */
  private async getBreakoutParticipants(roomId: string): Promise<BreakoutParticipant[]> {
    const { data: participants, error } = await this.supabase
      .from('board_room_breakout_participants')
      .select(`
        id,
        participant_id,
        joined_at,
        left_at,
        is_present,
        role,
        board_room_participants!inner(user_id)
      `)
      .eq('breakout_id', roomId);

    if (error) return [];

    return participants.map(p => ({
      id: p.id,
      participantId: p.participant_id,
      userId: (p as any).board_room_participants.user_id,
      role: p.role as BreakoutParticipant['role'],
      joinTime: new Date(p.joined_at),
      leaveTime: p.left_at ? new Date(p.left_at) : undefined,
      isPresent: p.is_present,
      permissions: this.getRolePermissions(p.role as BreakoutParticipant['role'])
    }));
  }

  /**
   * Validate room access permissions
   */
  private async validateRoomAccess(room: BreakoutRoom, userId: string): Promise<void> {
    // Check if user is participant in parent session
    const { data: participant } = await this.supabase
      .from('board_room_participants')
      .select('participant_role')
      .eq('session_id', room.parentSessionId)
      .eq('user_id', userId)
      .single();

    if (!participant) {
      throw new Error('User is not a participant in the parent session');
    }

    // Executive session restrictions
    if (room.type === 'executive_session' && room.metadata.restricted_to_directors) {
      if (participant.participant_role !== 'director') {
        throw new Error('Executive session is restricted to directors only');
      }
    }

    // Private room with approval requirement
    if (room.isPrivate && room.requiresApproval) {
      // Check for pending invitation
      const { data: invitation } = await this.supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'breakout_room_invitation')
        .eq('data->breakout_room_id', room.id)
        .eq('read', false)
        .single();

      if (!invitation) {
        throw new Error('Invitation required to join this private room');
      }
    }
  }

  /**
   * Get role-based permissions
   */
  private getRolePermissions(
    role: BreakoutParticipant['role'],
    roomType?: BreakoutRoom['type']
  ): BreakoutPermissions {
    const basePermissions: BreakoutPermissions = {
      canInviteOthers: false,
      canModerateDiscussion: false,
      canShareScreen: false,
      canRecord: false,
      canAccessDocuments: true,
      canMakeMotions: false
    };

    switch (role) {
      case 'moderator':
        return {
          ...basePermissions,
          canInviteOthers: true,
          canModerateDiscussion: true,
          canShareScreen: true,
          canRecord: roomType !== 'executive_session',
          canMakeMotions: true
        };

      case 'participant':
        return {
          ...basePermissions,
          canShareScreen: true,
          canMakeMotions: roomType !== 'executive_session'
        };

      case 'observer':
        return {
          ...basePermissions,
          canShareScreen: false,
          canMakeMotions: false
        };

      default:
        return basePermissions;
    }
  }

  /**
   * Generate encryption key for room
   */
  private async generateRoomEncryptionKey(roomId: string): Promise<string> {
    const keyId = crypto.randomUUID();
    
    // Generate AES-256 key
    const keyBuffer = crypto.getRandomValues(new Uint8Array(32));
    const keyHex = Array.from(keyBuffer, b => b.toString(16).padStart(2, '0')).join('');

    // Store encrypted key (in production, use proper key management)
    await this.supabase
      .from('board_room_encryption_keys')
      .insert({
        id: keyId,
        key_purpose: 'session',
        key_algorithm: 'AES-256-GCM',
        key_data_encrypted: keyHex, // Would be properly encrypted in production
        created_by: 'system'
      });

    return keyId;
  }

  /**
   * Set up auto-return timer
   */
  private setupAutoReturnTimer(roomId: string, returnTime: Date): void {
    const timeUntilReturn = returnTime.getTime() - Date.now();
    
    if (timeUntilReturn > 0) {
      const timer = setTimeout(async () => {
        await this.endBreakoutRoom(roomId, 'auto_return_timeout');
      }, timeUntilReturn);

      this.autoReturnTimers.set(roomId, timer);
    }
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(event: {
    event_type: string;
    session_id?: string;
    user_id?: string;
    event_description: string;
    severity_level: 'info' | 'warning' | 'critical';
    event_data: any;
  }): Promise<void> {
    await this.supabase
      .from('board_room_security_events')
      .insert({
        event_type: event.event_type,
        event_category: 'breakout_management',
        session_id: event.session_id,
        user_id: event.user_id,
        event_description: event.event_description,
        severity_level: event.severity_level,
        event_data: event.event_data
      });
  }

  /**
   * Event emission helper
   */
  private emit(eventType: string, data?: any): void {
    this.eventEmitter.dispatchEvent(new CustomEvent(eventType, { detail: data }));
  }

  /**
   * Add event listener
   */
  on(eventType: string, listener: EventListener): void {
    this.eventEmitter.addEventListener(eventType, listener);
  }

  /**
   * Remove event listener
   */
  off(eventType: string, listener: EventListener): void {
    this.eventEmitter.removeEventListener(eventType, listener);
  }
}

export default BreakoutRoomsService;