/**
 * Virtual Board Room API - Main Sessions Endpoint
 * Handles board room session creation, management, and coordination
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { WebRTCBoardRoomService } from '@/lib/services/webrtc-board-room.service';
import { BlockchainVotingService } from '@/lib/services/blockchain-voting.service';
import { BreakoutRoomsService } from '@/lib/services/breakout-rooms.service';
import { CollaborativeDocumentsService } from '@/lib/services/collaborative-documents.service';
import { BoardRoomSecurityService } from '@/lib/services/board-room-security.service';
import { BoardRoomOrchestrationService } from '@/lib/services/board-room-orchestration.service';
import { SecureRecordingService } from '@/lib/services/secure-recording.service';
import { z } from 'zod';

// Initialize services
const supabase = supabaseAdmin;
const webrtcService = new WebRTCBoardRoomService();
const votingService = new BlockchainVotingService();
const breakoutService = new BreakoutRoomsService(webrtcService);
const documentsService = new CollaborativeDocumentsService();
const securityService = new BoardRoomSecurityService();
const orchestrationService = new BoardRoomOrchestrationService(
  webrtcService,
  votingService,
  breakoutService,
  documentsService,
  securityService
);
const recordingService = new SecureRecordingService();

// Validation schemas
const CreateSessionSchema = z.object({
  organizationId: z.string().uuid(),
  sessionName: z.string().min(1).max(255),
  sessionType: z.enum(['board_meeting', 'committee_meeting', 'executive_session', 'special_meeting']),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
  maxParticipants: z.number().min(1).max(100).default(50),
  securityLevel: z.enum(['standard', 'high', 'maximum']).default('high'),
  requireMFA: z.boolean().default(true),
  requireDeviceAttestation: z.boolean().default(true),
  allowGuestAccess: z.boolean().default(false),
  recordingEnabled: z.boolean().default(true),
  orchestrationConfig: z.object({
    automationLevel: z.enum(['manual', 'assisted', 'fully_automated']).default('assisted'),
    template: z.string().optional(),
    customPhases: z.array(z.any()).optional(),
    documentPlan: z.array(z.any()).optional(),
    notificationPlan: z.array(z.any()).optional()
  }).optional(),
  metadata: z.record(z.any()).default({})
});

const JoinSessionSchema = z.object({
  participantRole: z.enum(['host', 'co_host', 'director', 'observer', 'secretary', 'legal_counsel']),
  deviceFingerprint: z.string().optional(),
  mfaChallengeId: z.string().optional(),
  mfaResponse: z.string().optional()
});

/**
 * GET /api/virtual-board-room
 * Get user's board room sessions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get authenticated user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Build query
    let query = supabase
      .from('board_room_sessions')
      .select(`
        *,
        organization:organizations(name),
        participants:board_room_participants(
          user_id,
          participant_role,
          is_present,
          join_time,
          leave_time
        ),
        votes:board_room_votes(
          id,
          motion_title,
          status,
          votes_for,
          votes_against,
          abstentions
        ),
        recordings:board_room_recordings(
          id,
          recording_type,
          status,
          duration_seconds
        )
      `)
      .range(offset, offset + limit - 1)
      .order('scheduled_start', { ascending: false });

    // Apply filters
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Check user has access to organization
    if (organizationId) {
      const { data: membership } = await supabase
        .from('organization_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .single();

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({
      sessions: sessions || [],
      pagination: {
        limit,
        offset,
        total: sessions?.length || 0
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/virtual-board-room
 * Create a new board room session
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateSessionSchema.parse(body);

    // Check user permissions for organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', validatedData.organizationId)
      .eq('status', 'active')
      .single();

    if (!membership || !['admin', 'director', 'secretary'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Generate encryption key for session
    const encryptionKeyId = await generateSessionEncryptionKey();

    // Create session record
    const sessionId = crypto.randomUUID();
    const sessionData = {
      id: sessionId,
      organization_id: validatedData.organizationId,
      created_by: user.id,
      session_name: validatedData.sessionName,
      session_type: validatedData.sessionType,
      scheduled_start: validatedData.scheduledStart,
      scheduled_end: validatedData.scheduledEnd,
      status: 'scheduled',
      encryption_key_id: encryptionKeyId,
      recording_enabled: validatedData.recordingEnabled,
      session_config: {
        maxParticipants: validatedData.maxParticipants,
        securityLevel: validatedData.securityLevel,
        requireMFA: validatedData.requireMFA,
        requireDeviceAttestation: validatedData.requireDeviceAttestation,
        allowGuestAccess: validatedData.allowGuestAccess
      },
      security_level: validatedData.securityLevel,
      max_participants: validatedData.maxParticipants,
      require_device_attestation: validatedData.requireDeviceAttestation,
      require_mfa: validatedData.requireMFA,
      allow_guest_access: validatedData.allowGuestAccess,
      metadata: validatedData.metadata
    };

    const { data: session, error: sessionError } = await supabase
      .from('board_room_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    // Create orchestration plan if requested
    let orchestration = null;
    if (validatedData.orchestrationConfig) {
      try {
        orchestration = await orchestrationService.createMeetingOrchestration(
          sessionId,
          user.id,
          validatedData.orchestrationConfig
        );
      } catch (orchestrationError) {
        console.error('Orchestration creation error:', orchestrationError);
        // Don't fail session creation if orchestration fails
      }
    }

    // Add creator as host participant
    const { error: participantError } = await supabase
      .from('board_room_participants')
      .insert({
        id: crypto.randomUUID(),
        session_id: sessionId,
        user_id: user.id,
        participant_role: 'host',
        voting_eligible: true,
        can_share_screen: true,
        can_record: true,
        access_level: 'admin'
      });

    if (participantError) {
      console.error('Participant creation error:', participantError);
    }

    // Log session creation
    await securityService.logSecurityEvent({
      sessionId,
      userId: user.id,
      eventType: 'session_created',
      eventCategory: 'data_access',
      severityLevel: 'info',
      description: `Board room session "${validatedData.sessionName}" created`,
      eventData: {
        sessionType: validatedData.sessionType,
        securityLevel: validatedData.securityLevel,
        participantLimit: validatedData.maxParticipants
      },
      riskScore: 0
    });

    return NextResponse.json({
      session,
      orchestration,
      message: 'Board room session created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to generate encryption key
async function generateSessionEncryptionKey(): Promise<string> {
  const keyId = crypto.randomUUID();
  const keyBuffer = crypto.getRandomValues(new Uint8Array(32));
  const keyHex = Array.from(keyBuffer, b => b.toString(16).padStart(2, '0')).join('');

  await supabase
    .from('board_room_encryption_keys')
    .insert({
      id: keyId,
      key_purpose: 'session',
      key_algorithm: 'AES-256-GCM',
      key_data_encrypted: keyHex,
      created_by: 'system'
    });

  return keyId;
}