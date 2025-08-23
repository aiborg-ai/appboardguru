/**
 * Virtual Board Room Recordings API
 * Handles secure recording management for board room sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service-client';
import { SecureRecordingService } from '@/lib/services/secure-recording.service';
import { BoardRoomSecurityService } from '@/lib/services/board-room-security.service';
import { z } from 'zod';

const supabase = createSupabaseServiceClient();
const recordingService = new SecureRecordingService();
const securityService = new BoardRoomSecurityService();

const StartRecordingSchema = z.object({
  recordingType: z.enum(['audio_only', 'video', 'screen_share', 'full_session']),
  quality: z.enum(['low', 'medium', 'high', 'lossless']).default('high'),
  accessPermissions: z.object({
    viewers: z.array(z.string().uuid()).default([]),
    accessLevel: z.enum(['public', 'session_participants', 'directors_only', 'custom']).default('session_participants'),
    downloadAllowed: z.boolean().default(false),
    streamingAllowed: z.boolean().default(true),
    transcriptAccess: z.boolean().default(true),
    expiresAt: z.string().datetime().optional()
  }).default({}),
  retentionPolicy: z.object({
    retainUntil: z.string().datetime().optional(),
    autoDelete: z.boolean().default(false),
    backupRequired: z.boolean().default(true),
    archiveAfter: z.number().optional(),
    legalHold: z.boolean().default(false),
    complianceRequirements: z.array(z.string()).default([])
  }).default({}),
  complianceTags: z.array(z.string()).default([])
});

const GenerateAccessLinkSchema = z.object({
  expiresIn: z.number().min(60).max(86400).default(3600), // 1 minute to 24 hours
  permissions: z.array(z.enum(['view', 'download', 'transcript'])).default(['view']),
  watermark: z.boolean().default(true)
});

/**
 * GET /api/virtual-board-room/[sessionId]/recordings
 * Get all recordings for a board room session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const recordingType = searchParams.get('type');

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

    // Verify user access to session
    const { data: participant } = await supabase
      .from('board_room_participants')
      .select('participant_role, access_level')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!participant) {
      return NextResponse.json({ error: 'Not a participant in this session' }, { status: 403 });
    }

    // Build query
    let query = supabase
      .from('board_room_recordings')
      .select(`
        id,
        recording_type,
        file_size_bytes,
        duration_seconds,
        started_at,
        ended_at,
        started_by,
        status,
        access_permissions,
        retention_policy,
        compliance_tags,
        transcript_available,
        processing_metadata,
        created_at,
        updated_at
      `)
      .eq('session_id', sessionId)
      .order('started_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (recordingType) {
      query = query.eq('recording_type', recordingType);
    }

    const { data: recordings, error: recordingsError } = await query;

    if (recordingsError) {
      console.error('Recordings query error:', recordingsError);
      return NextResponse.json({ error: 'Failed to fetch recordings' }, { status: 500 });
    }

    // Filter recordings based on user permissions
    const filteredRecordings = (recordings || []).filter(recording => {
      const permissions = recording.access_permissions;
      
      // Check access level
      switch (permissions.accessLevel) {
        case 'public':
          return true;
        case 'session_participants':
          return true; // User is already verified as participant
        case 'directors_only':
          return ['director', 'host', 'co_host'].includes(participant.participant_role);
        case 'custom':
          return permissions.viewers.includes(user.id);
        default:
          return false;
      }
    });

    // Process recordings for response
    const processedRecordings = filteredRecordings.map(recording => ({
      id: recording.id,
      recordingType: recording.recording_type,
      fileSize: recording.file_size_bytes,
      duration: recording.duration_seconds,
      startedAt: recording.started_at,
      endedAt: recording.ended_at,
      startedBy: recording.started_by,
      status: recording.status,
      transcriptAvailable: recording.transcript_available,
      complianceTags: recording.compliance_tags || [],
      permissions: {
        canView: true, // If they can see it, they can view it
        canDownload: recording.access_permissions?.downloadAllowed || false,
        canStream: recording.access_permissions?.streamingAllowed || false,
        canAccessTranscript: recording.access_permissions?.transcriptAccess || false
      },
      qualityMetrics: recording.processing_metadata?.qualityMetrics || null,
      createdAt: recording.created_at
    }));

    return NextResponse.json({
      recordings: processedRecordings,
      userPermissions: {
        canStartRecording: ['host', 'co_host'].includes(participant.participant_role),
        canManageRecordings: ['host', 'co_host'].includes(participant.participant_role)
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/virtual-board-room/[sessionId]/recordings
 * Start a new recording
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

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
    const validatedData = StartRecordingSchema.parse(body);

    // Verify user permissions
    const { data: participant } = await supabase
      .from('board_room_participants')
      .select('participant_role, can_record')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!participant || !participant.can_record) {
      return NextResponse.json({ error: 'Insufficient permissions to start recording' }, { status: 403 });
    }

    // Verify session is active and recording is enabled
    const { data: session } = await supabase
      .from('board_room_sessions')
      .select('status, recording_enabled, security_level')
      .eq('id', sessionId)
      .single();

    if (!session || session.status !== 'active') {
      return NextResponse.json({ error: 'Session must be active to start recording' }, { status: 400 });
    }

    if (!session.recording_enabled) {
      return NextResponse.json({ error: 'Recording is not enabled for this session' }, { status: 400 });
    }

    // Check for existing active recordings of same type
    const { data: activeRecordings } = await supabase
      .from('board_room_recordings')
      .select('id')
      .eq('session_id', sessionId)
      .eq('recording_type', validatedData.recordingType)
      .eq('status', 'recording');

    if (activeRecordings && activeRecordings.length > 0) {
      return NextResponse.json({ 
        error: `A ${validatedData.recordingType} recording is already active` 
      }, { status: 400 });
    }

    // Start recording
    const recording = await recordingService.startRecording(
      sessionId,
      user.id,
      {
        recordingType: validatedData.recordingType,
        accessPermissions: validatedData.accessPermissions,
        retentionPolicy: validatedData.retentionPolicy,
        complianceTags: validatedData.complianceTags,
        quality: validatedData.quality
      }
    );

    // Log recording start
    await securityService.logSecurityEvent({
      sessionId,
      userId: user.id,
      eventType: 'recording_started',
      eventCategory: 'data_access',
      severityLevel: 'info',
      description: `Recording started: ${validatedData.recordingType}`,
      eventData: {
        recordingId: recording.id,
        recordingType: validatedData.recordingType,
        quality: validatedData.quality,
        complianceTags: validatedData.complianceTags
      },
      riskScore: 5
    });

    return NextResponse.json({
      recording: {
        id: recording.id,
        recordingType: recording.recordingType,
        status: recording.status,
        startedAt: recording.startedAt,
        quality: validatedData.quality,
        permissions: recording.accessPermissions,
        complianceTags: recording.complianceTags
      },
      message: 'Recording started successfully'
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

/**
 * PATCH /api/virtual-board-room/[sessionId]/recordings/[recordingId]
 * Stop a recording
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { sessionId: string; recordingId: string } }
) {
  try {
    const { sessionId, recordingId } = params;

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

    // Verify user permissions
    const { data: participant } = await supabase
      .from('board_room_participants')
      .select('participant_role, can_record')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!participant || !['host', 'co_host'].includes(participant.participant_role)) {
      return NextResponse.json({ error: 'Only hosts can stop recordings' }, { status: 403 });
    }

    // Verify recording exists and is active
    const { data: recording } = await supabase
      .from('board_room_recordings')
      .select('status, recording_type')
      .eq('id', recordingId)
      .eq('session_id', sessionId)
      .single();

    if (!recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    if (recording.status !== 'recording') {
      return NextResponse.json({ error: 'Recording is not active' }, { status: 400 });
    }

    // Stop recording
    const stoppedRecording = await recordingService.stopRecording(recordingId, user.id);

    // Log recording stop
    await securityService.logSecurityEvent({
      sessionId,
      userId: user.id,
      eventType: 'recording_stopped',
      eventCategory: 'data_access',
      severityLevel: 'info',
      description: `Recording stopped: ${recording.recording_type}`,
      eventData: {
        recordingId,
        duration: stoppedRecording.duration,
        fileSize: stoppedRecording.fileSize
      },
      riskScore: 0
    });

    return NextResponse.json({
      recording: {
        id: stoppedRecording.id,
        status: stoppedRecording.status,
        endedAt: stoppedRecording.endedAt,
        duration: stoppedRecording.duration,
        fileSize: stoppedRecording.fileSize
      },
      message: 'Recording stopped successfully'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}