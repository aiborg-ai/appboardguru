/**
 * Voice Collaboration API Endpoint
 * Handles spatial audio, screen sharing, annotations, and workflow automation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  VoiceCollaborationSession, 
  CreateVoiceSessionRequest,
  JoinVoiceSessionRequest,
  VoiceSessionResponse,
  VoiceParticipant,
  SpatialPosition,
  WebRTCConfiguration,
  VoiceCollaborationEvent,
  AudioProcessingSettings,
  ParticipantAudioSettings
} from '@/types/voice-collaboration';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// In-memory session storage for active sessions
// In production, use Redis or similar
const activeSessions = new Map<string, VoiceCollaborationSession>();
const sessionParticipants = new Map<string, Map<string, VoiceParticipant>>();
const sessionEvents = new Map<string, VoiceCollaborationEvent[]>();

// WebRTC STUN/TURN servers configuration
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Add TURN servers for production
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    console.log('Voice Collaboration API called with action:', action);

    switch (action) {
      case 'create_session':
        return await createSession(params as CreateVoiceSessionRequest);
      
      case 'join_session':
        return await joinSession(params as JoinVoiceSessionRequest);
      
      case 'leave_session':
        return await leaveSession(params);
      
      case 'update_spatial_position':
        return await updateSpatialPosition(params);
      
      case 'update_audio_settings':
        return await updateAudioSettings(params);
      
      case 'start_screen_share':
        return await startScreenShare(params);
      
      case 'stop_screen_share':
        return await stopScreenShare(params);
      
      case 'get_session':
        return await getSession(params);
      
      case 'list_sessions':
        return await listSessions(params);
      
      case 'end_session':
        return await endSession(params);
      
      case 'get_session_analytics':
        return await getSessionAnalytics(params);

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action specified' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Voice collaboration API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

async function createSession(params: CreateVoiceSessionRequest): Promise<NextResponse> {
  try {
    // Generate session ID
    const sessionId = `vs_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Get user info from authenticated session
    const userId = 'default-user'; // TODO: Get from authenticated session
    const organizationId = 'default-org'; // TODO: Get from user's organization

    // Create session object
    const session: VoiceCollaborationSession = {
      id: sessionId,
      organizationId,
      name: params.name,
      ...(params.description && { description: params.description }),
      hostUserId: userId,
      participants: [],
      status: 'scheduled',
      spatialAudioConfig: params.spatialAudioConfig,
      collaborationType: params.collaborationType,
      permissions: params.permissions,
      metadata: {
        recordingEnabled: params.permissions.allowRecording,
        transcriptEnabled: params.permissions.allowTranscription,
        summaryEnabled: true,
        relatedDocuments: [],
        tags: [],
        purpose: `${params.collaborationType} session`,
        expectedDuration: params.expectedDuration || 30
      },
      createdAt: new Date().toISOString()
    };

    // Store session in database
    const { error: dbError } = await (supabase as any)
      .from('voice_collaboration_sessions')
      .insert({
        id: sessionId,
        organization_id: organizationId,
        host_user_id: userId,
        name: params.name,
        description: params.description,
        collaboration_type: params.collaborationType,
        spatial_audio_config: session.spatialAudioConfig,
        permissions: session.permissions,
        metadata: session.metadata,
        status: 'scheduled',
        created_at: session.createdAt
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to create session in database' },
        { status: 500 }
      );
    }

    // Store in memory for active management
    activeSessions.set(sessionId, session);
    sessionParticipants.set(sessionId, new Map());
    sessionEvents.set(sessionId, []);

    // Send invitations if provided
    if (params.invitations && params.invitations.length > 0) {
      await sendSessionInvitations(sessionId, params.invitations, userId);
    }

    const response: VoiceSessionResponse = {
      success: true,
      session,
      webrtcConfig: generateWebRTCConfig(session.spatialAudioConfig),
      recommendations: [
        'Test your microphone and speakers before the session',
        'Use headphones for better spatial audio experience',
        'Ensure stable internet connection for optimal quality'
      ]
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create collaboration session' },
      { status: 500 }
    );
  }
}

async function joinSession(params: JoinVoiceSessionRequest): Promise<NextResponse> {
  try {
    const { sessionId, invitationId, audioSettings, spatialPosition } = params;
    const userId = 'default-user'; // TODO: Get from authenticated session

    // Get session from memory or database
    let session = activeSessions.get(sessionId);
    if (!session) {
      const { data: sessionData, error } = await (supabase as any)
        .from('voice_collaboration_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error || !sessionData) {
        return NextResponse.json(
          { success: false, error: 'Session not found' },
          { status: 404 }
        );
      }

      session = sessionData as VoiceCollaborationSession;
      activeSessions.set(sessionId, session);
    }

    // Check permissions and capacity
    if (session.status === 'ended') {
      return NextResponse.json(
        { success: false, error: 'Session has ended' },
        { status: 400 }
      );
    }

    const currentParticipants = sessionParticipants.get(sessionId) || new Map();
    if (currentParticipants.size >= session.permissions.maxParticipants) {
      return NextResponse.json(
        { success: false, error: 'Session is at maximum capacity' },
        { status: 400 }
      );
    }

    // Get user information
    const { data: userData } = await (supabase as any)
      .from('users')
      .select('id, full_name, role')
      .eq('id', userId)
      .single();

    // Create participant
    const participant: VoiceParticipant = {
      id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      displayName: userData?.full_name || 'Unknown User',
      role: userId === session.hostUserId ? 'host' : 'participant',
      spatialPosition: {
        ...getDefaultSpatialPosition(currentParticipants.size),
        ...spatialPosition
      },
      audioSettings: {
        volume: 100,
        isMuted: false,
        isDeafened: false,
        echoCancellation: true,
        noiseSuppression: true,
        spatialAudioEnabled: session.spatialAudioConfig.enabled,
        voiceActivation: true,
        voiceThreshold: -30,
        ...audioSettings
      },
      connectionStatus: 'connecting',
      joinedAt: new Date().toISOString(),
      permissions: {
        canSpeak: true,
        canScreenShare: session.permissions.allowScreenSharing,
        canAnnotate: session.permissions.allowAnnotations,
        canModerate: userId === session.hostUserId,
        canInviteOthers: userId === session.hostUserId,
        canTriggerWorkflow: session.permissions.allowVoiceCommands,
        canAccessRecordings: true
      },
      voiceStats: {
        totalSpeakingTime: 0,
        averageVolume: 0,
        wordCount: 0,
        interruptionCount: 0,
        emotionalTone: [],
        engagementScore: 50,
        attentionScore: 100
      }
    };

    // Add participant to session
    currentParticipants.set(participant.id, participant);
    sessionParticipants.set(sessionId, currentParticipants);

    // Update session status if first participant joining
    if (session.status === 'scheduled' && currentParticipants.size === 1) {
      session.status = 'active';
      session.startedAt = new Date().toISOString();
      activeSessions.set(sessionId, session);
      
      await (supabase as any)
        .from('voice_collaboration_sessions')
        .update({ 
          status: 'active',
          started_at: session.startedAt
        })
        .eq('id', sessionId);
    }

    // Log participant join event
    const joinEvent: VoiceCollaborationEvent = {
      type: 'participant_joined',
      sessionId,
      participantId: participant.id,
      timestamp: new Date().toISOString(),
      data: {
        userId,
        displayName: participant.displayName,
        role: participant.role,
        spatialPosition: participant.spatialPosition
      }
    };

    const events = sessionEvents.get(sessionId) || [];
    events.push(joinEvent);
    sessionEvents.set(sessionId, events);

    const response: VoiceSessionResponse = {
      success: true,
      session,
      participant,
      webrtcConfig: generateWebRTCConfig(session.spatialAudioConfig)
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Join session error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to join session' },
      { status: 500 }
    );
  }
}

async function leaveSession(params: any): Promise<NextResponse> {
  try {
    const { sessionId, participantId } = params;

    const participants = sessionParticipants.get(sessionId);
    if (!participants) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const participant = participants.get(participantId);
    if (!participant) {
      return NextResponse.json(
        { success: false, error: 'Participant not found' },
        { status: 404 }
      );
    }

    // Remove participant
    participants.delete(participantId);

    // Log leave event
    const leaveEvent: VoiceCollaborationEvent = {
      type: 'participant_left',
      sessionId,
      participantId,
      timestamp: new Date().toISOString(),
      data: {
        userId: participant.userId,
        displayName: participant.displayName,
        sessionDuration: Date.now() - new Date(participant.joinedAt).getTime()
      }
    };

    const events = sessionEvents.get(sessionId) || [];
    events.push(leaveEvent);
    sessionEvents.set(sessionId, events);

    // End session if no participants left
    if (participants.size === 0) {
      await endSessionInternal(sessionId);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Leave session error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to leave session' },
      { status: 500 }
    );
  }
}

async function updateSpatialPosition(params: any): Promise<NextResponse> {
  try {
    const { sessionId, participantId, spatialPosition } = params;

    const participants = sessionParticipants.get(sessionId);
    const participant = participants?.get(participantId);

    if (!participant) {
      return NextResponse.json(
        { success: false, error: 'Participant not found' },
        { status: 404 }
      );
    }

    // Update spatial position
    participant.spatialPosition = { ...participant.spatialPosition, ...spatialPosition };
    participant.lastActivity = new Date().toISOString();

    // Log position change event
    const positionEvent: VoiceCollaborationEvent = {
      type: 'spatial_position_changed',
      sessionId,
      participantId,
      timestamp: new Date().toISOString(),
      data: { spatialPosition: participant.spatialPosition }
    };

    const events = sessionEvents.get(sessionId) || [];
    events.push(positionEvent);
    sessionEvents.set(sessionId, events);

    return NextResponse.json({ success: true, spatialPosition: participant.spatialPosition });

  } catch (error) {
    console.error('Update spatial position error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update spatial position' },
      { status: 500 }
    );
  }
}

async function updateAudioSettings(params: any): Promise<NextResponse> {
  try {
    const { sessionId, participantId, audioSettings } = params;

    const participants = sessionParticipants.get(sessionId);
    const participant = participants?.get(participantId);

    if (!participant) {
      return NextResponse.json(
        { success: false, error: 'Participant not found' },
        { status: 404 }
      );
    }

    // Update audio settings
    participant.audioSettings = { ...participant.audioSettings, ...audioSettings };
    participant.lastActivity = new Date().toISOString();

    // Log mute/unmute events
    if ('isMuted' in audioSettings) {
      const muteEvent: VoiceCollaborationEvent = {
        type: audioSettings.isMuted ? 'participant_muted' : 'participant_unmuted',
        sessionId,
        participantId,
        timestamp: new Date().toISOString(),
        data: { audioSettings: participant.audioSettings }
      };

      const events = sessionEvents.get(sessionId) || [];
      events.push(muteEvent);
      sessionEvents.set(sessionId, events);
    }

    return NextResponse.json({ success: true, audioSettings: participant.audioSettings });

  } catch (error) {
    console.error('Update audio settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update audio settings' },
      { status: 500 }
    );
  }
}

async function startScreenShare(params: any): Promise<NextResponse> {
  try {
    const { sessionId, participantId, shareType = 'full_screen' } = params;

    const session = activeSessions.get(sessionId);
    const participants = sessionParticipants.get(sessionId);
    const participant = participants?.get(participantId);

    if (!session || !participant) {
      return NextResponse.json(
        { success: false, error: 'Session or participant not found' },
        { status: 404 }
      );
    }

    if (!session.permissions.allowScreenSharing || !participant.permissions.canScreenShare) {
      return NextResponse.json(
        { success: false, error: 'Screen sharing not allowed' },
        { status: 403 }
      );
    }

    // Create screen share object
    const screenShare = {
      id: `ss_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId,
      presenterId: participant.userId,
      presenterName: participant.displayName,
      type: shareType,
      status: 'starting' as const,
      voiceControls: {
        enabled: true,
        commands: [
          { phrase: 'next page', action: 'next_page' as const, enabled: true, requiresConfirmation: false },
          { phrase: 'previous page', action: 'previous_page' as const, enabled: true, requiresConfirmation: false },
          { phrase: 'zoom in', action: 'zoom_in' as const, enabled: true, requiresConfirmation: false },
          { phrase: 'zoom out', action: 'zoom_out' as const, enabled: true, requiresConfirmation: false }
        ],
        confirmationRequired: false,
        accessLevel: 'control' as const
      },
      annotations: [],
      startedAt: new Date().toISOString(),
      metadata: {
        resolution: { width: 1920, height: 1080 },
        frameRate: 30,
        bitrate: 2000000,
        quality: 'high' as const,
        audioIncluded: false
      }
    };

    // Log screen share event
    const shareEvent: VoiceCollaborationEvent = {
      type: 'screen_share_started',
      sessionId,
      participantId,
      timestamp: new Date().toISOString(),
      data: { screenShare }
    };

    const events = sessionEvents.get(sessionId) || [];
    events.push(shareEvent);
    sessionEvents.set(sessionId, events);

    return NextResponse.json({ success: true, screenShare });

  } catch (error) {
    console.error('Start screen share error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start screen share' },
      { status: 500 }
    );
  }
}

async function stopScreenShare(params: any): Promise<NextResponse> {
  try {
    const { sessionId, participantId, screenShareId } = params;

    // Log screen share stop event
    const stopEvent: VoiceCollaborationEvent = {
      type: 'screen_share_stopped',
      sessionId,
      participantId,
      timestamp: new Date().toISOString(),
      data: { screenShareId }
    };

    const events = sessionEvents.get(sessionId) || [];
    events.push(stopEvent);
    sessionEvents.set(sessionId, events);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Stop screen share error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to stop screen share' },
      { status: 500 }
    );
  }
}

async function getSession(params: any): Promise<NextResponse> {
  try {
    const { sessionId } = params;

    const session = activeSessions.get(sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const participants = Array.from(sessionParticipants.get(sessionId)?.values() || []);
    const events = sessionEvents.get(sessionId) || [];

    return NextResponse.json({
      success: true,
      session: { ...session, participants },
      events: events.slice(-50), // Last 50 events
      analytics: generateBasicAnalytics(sessionId, participants, events)
    });

  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get session' },
      { status: 500 }
    );
  }
}

async function listSessions(params: any): Promise<NextResponse> {
  try {
    const { organizationId, status, limit = 20 } = params;

    let query = supabase
      .from('voice_collaboration_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: sessions, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      sessions: sessions || [],
      totalCount: sessions?.length || 0
    });

  } catch (error) {
    console.error('List sessions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list sessions' },
      { status: 500 }
    );
  }
}

async function endSession(params: any): Promise<NextResponse> {
  try {
    const { sessionId } = params;
    await endSessionInternal(sessionId);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('End session error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to end session' },
      { status: 500 }
    );
  }
}

async function endSessionInternal(sessionId: string) {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  // Update session status
  session.status = 'ended';
  session.endedAt = new Date().toISOString();
  session.duration = session.startedAt 
    ? Math.floor((new Date().getTime() - new Date(session.startedAt).getTime()) / 1000)
    : 0;

  // Update database
  await (supabase as any)
    .from('voice_collaboration_sessions')
    .update({
      status: 'ended',
      ended_at: session.endedAt,
      duration: session.duration
    })
    .eq('id', sessionId);

  // Generate final analytics
  const participants = Array.from(sessionParticipants.get(sessionId)?.values() || []);
  const events = sessionEvents.get(sessionId) || [];
  const analytics = generateBasicAnalytics(sessionId, participants, events);

  // Store analytics
  await (supabase as any)
    .from('voice_collaboration_analytics')
    .insert({
      session_id: sessionId,
      organization_id: session.organizationId,
      analytics_data: analytics,
      generated_at: new Date().toISOString()
    });

  // Clean up memory
  activeSessions.delete(sessionId);
  sessionParticipants.delete(sessionId);
  sessionEvents.delete(sessionId);

  // Log session end event
  const endEvent: VoiceCollaborationEvent = {
    type: 'session_ended',
    sessionId,
    timestamp: new Date().toISOString(),
    data: { 
      duration: session.duration,
      participantCount: participants.length,
      analytics
    }
  };

  console.log('Session ended:', endEvent);
}

async function getSessionAnalytics(params: any): Promise<NextResponse> {
  try {
    const { sessionId } = params;

    const participants = Array.from(sessionParticipants.get(sessionId)?.values() || []);
    const events = sessionEvents.get(sessionId) || [];
    const analytics = generateBasicAnalytics(sessionId, participants, events);

    return NextResponse.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Get session analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get session analytics' },
      { status: 500 }
    );
  }
}

// Helper functions

function generateWebRTCConfig(spatialAudioConfig: any): WebRTCConfiguration {
  const audioProcessingSettings: AudioProcessingSettings = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    highpassFilter: true,
    spatialProcessing: spatialAudioConfig.enabled,
    voiceEnhancement: true,
    backgroundNoiseReduction: spatialAudioConfig.enabled ? 80 : 60
  };

  return {
    iceServers: ICE_SERVERS,
    audioConstraints: {
      sampleRate: 48000,
      channelCount: spatialAudioConfig.enabled ? 2 : 1,
      echoCancellation: audioProcessingSettings.echoCancellation,
      noiseSuppression: audioProcessingSettings.noiseSuppression,
      autoGainControl: audioProcessingSettings.autoGainControl
    },
    spatialAudioEnabled: spatialAudioConfig.enabled,
    processingSettings: audioProcessingSettings,
    maxBitrate: 128000,
    codecPreferences: ['opus', 'G722', 'PCMU', 'PCMA']
  };
}

function getDefaultSpatialPosition(participantCount: number): SpatialPosition {
  // Arrange participants in a circle for natural conversation
  const angle = (participantCount * 360 / 8) * (Math.PI / 180); // Max 8 positions
  const radius = 0.6; // Distance from center
  
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    z: 0,
    orientation: (angle * 180 / Math.PI + 180) % 360, // Face center
    zone: 'discussion'
  };
}

function generateBasicAnalytics(sessionId: string, participants: VoiceParticipant[], events: VoiceCollaborationEvent[]) {
  const now = Date.now();
  const totalParticipants = participants.length;
  
  // Calculate session duration
  const sessionStartEvent = events.find(e => e.type === 'session_started');
  const sessionEndEvent = events.find(e => e.type === 'session_ended');
  const duration = sessionEndEvent && sessionStartEvent 
    ? new Date(sessionEndEvent.timestamp).getTime() - new Date(sessionStartEvent.timestamp).getTime()
    : 0;

  // Calculate participation stats
  const participantStats = participants.map(p => ({
    userId: p.userId,
    speakingTime: p.voiceStats.totalSpeakingTime,
    wordCount: p.voiceStats.wordCount,
    averageWordsPerMinute: p.voiceStats.totalSpeakingTime > 0 
      ? Math.round((p.voiceStats.wordCount / p.voiceStats.totalSpeakingTime) * 60)
      : 0,
    silencePeriods: 0, // Would calculate from audio analysis
    interruptionCount: p.voiceStats.interruptionCount,
    questionsAsked: 0, // Would extract from transcript
    ideasContributed: 0, // Would analyze from content
    emotionalRange: p.voiceStats.emotionalTone,
    engagementLevel: p.voiceStats.engagementScore > 70 ? 'high' : 
                    p.voiceStats.engagementScore > 40 ? 'medium' : 'low',
    influenceScore: p.voiceStats.engagementScore
  }));

  return {
    sessionId,
    organizationId: activeSessions.get(sessionId)?.organizationId,
    participantStats,
    conversationFlow: [], // Would analyze from events
    emotionalJourney: {
      overall: { timestamp: new Date().toISOString(), emotion: 'neutral', intensity: 50, confidence: 80 },
      timeline: [],
      peaks: [],
      patterns: []
    },
    engagementMetrics: {
      overallEngagement: Math.round(participantStats.reduce((sum, p) => sum + (typeof p.engagementLevel === 'string' ? 
        p.engagementLevel === 'high' ? 80 : p.engagementLevel === 'medium' ? 50 : 20 : 50), 0) / totalParticipants),
      peakEngagementTime: Math.floor(duration / 2), // Placeholder
      lowEngagementPeriods: [],
      interactionDensity: events.length / (duration / 60000), // events per minute
      collaborationScore: 75 // Placeholder
    },
    productivityScore: {
      score: 70, // Placeholder calculation
      factors: {
        decisionsMade: 0,
        actionItemsCreated: 0,
        questionsResolved: 0,
        consensusReached: 0,
        timeOnTopic: 80,
        participationBalance: 75
      },
      timeAllocation: []
    },
    recommendations: [
      {
        type: 'engagement' as const,
        title: 'Encourage Participation',
        description: 'Some participants had low engagement. Consider using breakout sessions.',
        actionable: true,
        priority: 'medium' as const,
        estimatedImpact: 60,
        implementationEffort: 'low' as const
      }
    ],
    generatedAt: new Date().toISOString()
  };
}

async function sendSessionInvitations(sessionId: string, invitations: any[], hostUserId: string) {
  // Store invitations in database
  const invitationRecords = invitations.map(inv => ({
    session_id: sessionId,
    inviter_id: hostUserId,
    invitee_id: inv.inviteeId,
    invitee_email: inv.inviteeEmail,
    message: inv.message,
    permissions: inv.permissions,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h expiry
    status: 'pending',
    sent_at: new Date().toISOString()
  }));

  await (supabase as any)
    .from('voice_session_invitations')
    .insert(invitationRecords);

  // TODO: Send email invitations
  console.log('Invitations sent:', invitationRecords.length);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'health') {
    return NextResponse.json({
      success: true,
      status: 'healthy',
      activeSessions: activeSessions.size,
      totalParticipants: Array.from(sessionParticipants.values())
        .reduce((total, participants) => total + participants.size, 0),
      uptime: process.uptime()
    });
  }

  return NextResponse.json(
    { success: false, error: 'Invalid GET action' },
    { status: 400 }
  );
}