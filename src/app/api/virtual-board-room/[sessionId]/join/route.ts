/**
 * Virtual Board Room Join Session API
 * Handles secure session joining with MFA and device attestation
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
  participantRole: z.enum(['host', 'co_host', 'director', 'observer', 'secretary', 'legal_counsel']).optional(),
  deviceFingerprint: z.string(),
  mfaChallengeId: z.string().optional(),
  mfaResponse: z.string().optional(),
  deviceInfo: z.object({
    deviceName: z.string(),
    deviceType: z.enum(['desktop', 'laptop', 'tablet', 'mobile', 'browser']),
    operatingSystem: z.string().optional(),
    browserInfo: z.record(z.any()).optional()
  })
});

/**
 * POST /api/virtual-board-room/[sessionId]/join
 * Join a board room session with security verification
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
    const validatedData = JoinSessionSchema.parse(body);

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('board_room_sessions')
      .select(`
        *,
        organization:organizations(id, name)
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check session status
    if (session.status === 'ended' || session.status === 'cancelled') {
      return NextResponse.json({ error: 'Session is not active' }, { status: 400 });
    }

    // Check if session has started
    const now = new Date();
    const scheduledStart = new Date(session.scheduled_start);
    const earlyJoinWindow = 15 * 60 * 1000; // 15 minutes before

    if (now < new Date(scheduledStart.getTime() - earlyJoinWindow)) {
      return NextResponse.json({ 
        error: 'Session has not started yet',
        canJoinAt: new Date(scheduledStart.getTime() - earlyJoinWindow).toISOString()
      }, { status: 400 });
    }

    // Check user organization membership
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', session.organization_id)
      .eq('status', 'active')
      .single();

    if (!membership && !session.allow_guest_access) {
      return NextResponse.json({ error: 'Access denied - not a member of organization' }, { status: 403 });
    }

    // Step 1: Device Attestation
    let deviceAttestation = null;
    if (session.require_device_attestation) {
      try {
        // Check if device is already trusted
        const deviceTrusted = await securityService.verifyDeviceTrust(user.id, validatedData.deviceFingerprint);
        
        if (!deviceTrusted) {
          // Attest new device
          deviceAttestation = await securityService.attestDevice(
            user.id,
            validatedData.deviceInfo,
            crypto.randomBytes(16).toString('hex') // Challenge
          );

          // If device trust level is too low, require approval
          if (deviceAttestation.trustLevel === 'basic' && session.security_level === 'maximum') {
            return NextResponse.json({
              error: 'Device requires approval for maximum security sessions',
              requiresApproval: true,
              deviceAttestationId: deviceAttestation.id
            }, { status: 403 });
          }
        }
      } catch (attestationError) {
        console.error('Device attestation failed:', attestationError);
        return NextResponse.json({ error: 'Device attestation failed' }, { status: 403 });
      }
    }

    // Step 2: MFA Verification
    let mfaVerified = false;
    if (session.require_mfa) {
      if (validatedData.mfaChallengeId && validatedData.mfaResponse) {
        // Verify existing MFA challenge
        try {
          mfaVerified = await securityService.verifyMFA(
            validatedData.mfaChallengeId,
            validatedData.mfaResponse,
            validatedData.deviceFingerprint
          );
        } catch (mfaError) {
          console.error('MFA verification failed:', mfaError);
          return NextResponse.json({ error: 'MFA verification failed' }, { status: 403 });
        }
      } else {
        // Initiate MFA challenge
        const mfaChallenge = await securityService.initiateMFA(
          sessionId,
          user.id,
          'totp', // Default method, could be user preference
          validatedData.deviceFingerprint
        );

        return NextResponse.json({
          requiresMFA: true,
          mfaChallengeId: mfaChallenge.id,
          mfaMethod: mfaChallenge.method,
          message: 'MFA verification required'
        }, { status: 200 });
      }
    } else {
      mfaVerified = true; // MFA not required
    }

    if (!mfaVerified && session.require_mfa) {
      return NextResponse.json({ error: 'MFA verification required' }, { status: 403 });
    }

    // Step 3: Network Security Check
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const networkSecurity = await securityService.monitorNetworkSecurity(
      sessionId,
      clientIP,
      userAgent
    );

    if (networkSecurity.blocked) {
      return NextResponse.json({ 
        error: 'Network security check failed',
        reason: networkSecurity.blockedReason
      }, { status: 403 });
    }

    // Step 4: Check existing participation
    let existingParticipant = await supabase
      .from('board_room_participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    let participantRole = validatedData.participantRole || 'observer';
    
    // If user is already a participant, use existing role unless they're upgrading
    if (existingParticipant.data) {
      participantRole = existingParticipant.data.participant_role;
      
      if (existingParticipant.data.is_present) {
        return NextResponse.json({
          error: 'Already joined session',
          participantId: existingParticipant.data.id
        }, { status: 400 });
      }
    } else {
      // Determine participant role based on organization membership
      if (membership) {
        const roleMapping: Record<string, string> = {
          'admin': 'host',
          'director': 'director',
          'secretary': 'secretary',
          'member': 'observer'
        };
        participantRole = roleMapping[membership.role] || 'observer';
      }

      // Create new participant record
      const { data: newParticipant, error: participantError } = await supabase
        .from('board_room_participants')
        .insert({
          id: crypto.randomUUID(),
          session_id: sessionId,
          user_id: user.id,
          participant_role: participantRole,
          is_present: false, // Will be set to true after successful join
          device_trusted: deviceAttestation?.trustLevel !== 'basic',
          device_fingerprint: validatedData.deviceFingerprint,
          voting_eligible: ['host', 'co_host', 'director'].includes(participantRole),
          can_share_screen: ['host', 'co_host', 'director'].includes(participantRole),
          can_record: ['host', 'co_host'].includes(participantRole),
          access_level: participantRole === 'host' ? 'admin' : 
                       ['co_host', 'director'].includes(participantRole) ? 'elevated' : 'standard'
        })
        .select()
        .single();

      if (participantError) {
        console.error('Participant creation error:', participantError);
        return NextResponse.json({ error: 'Failed to join session' }, { status: 500 });
      }

      existingParticipant = { data: newParticipant };
    }

    // Step 5: Join WebRTC session
    try {
      await webrtcService.initializeSession(sessionId, user.id);
      await webrtcService.joinSession(participantRole);
    } catch (webrtcError) {
      console.error('WebRTC join error:', webrtcError);
      return NextResponse.json({ error: 'Failed to join video session' }, { status: 500 });
    }

    // Step 6: Update participant status
    const { error: updateError } = await supabase
      .from('board_room_participants')
      .update({
        is_present: true,
        join_time: new Date().toISOString(),
        connection_quality: {
          networkSecurity: networkSecurity.riskScore,
          deviceTrust: deviceAttestation?.trustLevel || 'basic'
        }
      })
      .eq('id', existingParticipant.data.id);

    if (updateError) {
      console.error('Participant update error:', updateError);
    }

    // Step 7: Start session if this is the first participant and orchestration is configured
    const { data: orchestration } = await supabase
      .from('meeting_orchestrations')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (orchestration && session.status === 'scheduled' && participantRole === 'host') {
      // Auto-start session for host
      await supabase
        .from('board_room_sessions')
        .update({
          status: 'active',
          actual_start: new Date().toISOString()
        })
        .eq('id', sessionId);

      // Start orchestration if configured
      // This would be handled by the orchestration service
    }

    // Step 8: Get session details for response
    const { data: updatedSession } = await supabase
      .from('board_room_sessions')
      .select(`
        *,
        participants:board_room_participants(
          id,
          user_id,
          participant_role,
          is_present,
          user:users(id, name, email)
        )
      `)
      .eq('id', sessionId)
      .single();

    // Log successful join
    await securityService.logSecurityEvent({
      sessionId,
      userId: user.id,
      eventType: 'session_joined',
      eventCategory: 'authentication',
      severityLevel: 'info',
      description: `User joined session as ${participantRole}`,
      sourceIP: clientIP,
      userAgent,
      deviceFingerprint: validatedData.deviceFingerprint,
      eventData: {
        participantRole,
        mfaVerified,
        deviceTrusted: deviceAttestation?.trustLevel !== 'basic',
        networkRiskScore: networkSecurity.riskScore
      },
      riskScore: networkSecurity.riskScore
    });

    return NextResponse.json({
      success: true,
      session: updatedSession,
      participant: existingParticipant.data,
      webrtcConfig: {
        sessionId,
        participantId: existingParticipant.data.id,
        role: participantRole,
        permissions: {
          canVote: existingParticipant.data.voting_eligible,
          canShareScreen: existingParticipant.data.can_share_screen,
          canRecord: existingParticipant.data.can_record
        }
      },
      securityStatus: {
        mfaVerified,
        deviceTrusted: deviceAttestation?.trustLevel !== 'basic',
        networkSecure: networkSecurity.riskScore < 50
      },
      message: 'Successfully joined board room session'
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