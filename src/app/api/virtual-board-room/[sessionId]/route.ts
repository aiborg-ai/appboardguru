/**
 * Virtual Board Room Session API - Individual Session Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { WebRTCBoardRoomService } from '@/lib/services/webrtc-board-room.service';
import { BoardRoomSecurityService } from '@/lib/services/board-room-security.service';
import { BoardRoomOrchestrationService } from '@/lib/services/board-room-orchestration.service';
import { z } from 'zod';

const supabase = supabaseAdmin;
const webrtcService = new WebRTCBoardRoomService();
const securityService = new BoardRoomSecurityService();

const JoinSessionSchema = z.object({
  participantRole: z.enum(['host', 'co_host', 'director', 'observer', 'secretary', 'legal_counsel']),
  deviceFingerprint: z.string().optional(),
  mfaChallengeId: z.string().optional(),
  mfaResponse: z.string().optional()
});

const UpdateSessionSchema = z.object({
  sessionName: z.string().min(1).max(255).optional(),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
  status: z.enum(['scheduled', 'active', 'paused', 'ended', 'cancelled']).optional(),
  metadata: z.record(z.any()).optional()
});

/**
 * GET /api/virtual-board-room/[sessionId]
 * Get board room session details
 */
export async function GET(
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

    // Get session with related data
    const { data: session, error: sessionError } = await supabase
      .from('board_room_sessions')
      .select(`
        *,
        organization:organizations(id, name, settings),
        participants:board_room_participants(
          id,
          user_id,
          participant_role,
          is_present,
          join_time,
          leave_time,
          voting_eligible,
          can_share_screen,
          can_record,
          access_level,
          user:users(id, name, email)
        ),
        votes:board_room_votes(
          id,
          motion_title,
          motion_description,
          vote_type,
          status,
          votes_for,
          votes_against,
          abstentions,
          quorum_required,
          quorum_met,
          result,
          started_at,
          ended_at
        ),
        breakouts:board_room_breakouts(
          id,
          breakout_name,
          breakout_type,
          status,
          max_participants,
          is_private,
          started_at,
          ended_at,
          participants:board_room_breakout_participants(count)
        ),
        documents:board_room_documents(
          id,
          document_title,
          document_type,
          shared_by,
          shared_at,
          access_level,
          permissions,
          is_live_collaborative
        ),
        recordings:board_room_recordings(
          id,
          recording_type,
          status,
          duration_seconds,
          started_at,
          ended_at,
          access_permissions
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check user access to session
    const userParticipant = session.participants?.find((p: any) => p.user_id === user.id);
    if (!userParticipant) {
      // Check if user has organization access
      const { data: membership } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', session.organization_id)
        .eq('status', 'active')
        .single();

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Get session statistics
    const sessionStats = await getSessionStatistics(sessionId);

    // Get orchestration info if available
    const { data: orchestration } = await supabase
      .from('meeting_orchestrations')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    // Get security events summary
    const { data: securityEvents } = await supabase
      .from('board_room_security_events')
      .select('severity_level, count(*)')
      .eq('session_id', sessionId)
      .eq('resolved', false);

    return NextResponse.json({
      session,
      statistics: sessionStats,
      orchestration,
      securitySummary: securityEvents || [],
      userRole: userParticipant?.participant_role || 'observer'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/virtual-board-room/[sessionId]
 * Update board room session
 */
export async function PATCH(
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
    const validatedData = UpdateSessionSchema.parse(body);

    // Check user permissions
    const { data: participant } = await supabase
      .from('board_room_participants')
      .select('participant_role, access_level')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!participant || !['host', 'co_host'].includes(participant.participant_role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update session
    const { data: updatedSession, error: updateError } = await supabase
      .from('board_room_sessions')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      console.error('Session update error:', updateError);
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }

    // Log session update
    await securityService.logSecurityEvent({
      sessionId,
      userId: user.id,
      eventType: 'session_updated',
      eventCategory: 'data_access',
      severityLevel: 'info',
      description: 'Board room session updated',
      eventData: validatedData,
      riskScore: 5
    });

    return NextResponse.json({
      session: updatedSession,
      message: 'Session updated successfully'
    });

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
 * DELETE /api/virtual-board-room/[sessionId]
 * Cancel/delete board room session
 */
export async function DELETE(
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

    // Check user permissions
    const { data: participant } = await supabase
      .from('board_room_participants')
      .select('participant_role, access_level')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!participant || participant.participant_role !== 'host') {
      return NextResponse.json({ error: 'Only session host can delete session' }, { status: 403 });
    }

    // Get session to check status
    const { data: session } = await supabase
      .from('board_room_sessions')
      .select('status, session_name')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status === 'active') {
      return NextResponse.json({ error: 'Cannot delete active session' }, { status: 400 });
    }

    // Soft delete the session
    const { error: deleteError } = await supabase
      .from('board_room_sessions')
      .update({
        status: 'cancelled',
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (deleteError) {
      console.error('Session deletion error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
    }

    // Log session deletion
    await securityService.logSecurityEvent({
      sessionId,
      userId: user.id,
      eventType: 'session_deleted',
      eventCategory: 'data_access',
      severityLevel: 'warning',
      description: `Board room session "${session.session_name}" deleted`,
      eventData: { sessionId, sessionName: session.session_name },
      riskScore: 15
    });

    return NextResponse.json({
      message: 'Session cancelled successfully'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to get session statistics
async function getSessionStatistics(sessionId: string) {
  try {
    const [participantsCount, votesCount, documentsCount, recordingsCount] = await Promise.all([
      supabase
        .from('board_room_participants')
        .select('id', { count: 'exact' })
        .eq('session_id', sessionId),
      
      supabase
        .from('board_room_votes')
        .select('id', { count: 'exact' })
        .eq('session_id', sessionId),
      
      supabase
        .from('board_room_documents')
        .select('id', { count: 'exact' })
        .eq('session_id', sessionId),
      
      supabase
        .from('board_room_recordings')
        .select('id', { count: 'exact' })
        .eq('session_id', sessionId)
    ]);

    return {
      participantsCount: participantsCount.count || 0,
      votesCount: votesCount.count || 0,
      documentsCount: documentsCount.count || 0,
      recordingsCount: recordingsCount.count || 0
    };
  } catch (error) {
    console.error('Statistics error:', error);
    return {
      participantsCount: 0,
      votesCount: 0,
      documentsCount: 0,
      recordingsCount: 0
    };
  }
}