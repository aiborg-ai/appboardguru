/**
 * Voice Collaboration API Endpoint
 * Delegates to VoiceController for consistent architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { VoiceController } from '@/lib/api/controllers/voice.controller';

const voiceController = new VoiceController();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    console.log('Voice Collaboration API called with action:', action);

    // Create a new request with the params as body
    const newRequest = new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(params)
    });

    switch (action) {
      case 'create_session':
        return await voiceController.createSession(newRequest);
      
      case 'join_session':
        return await voiceController.joinSession(newRequest);
      
      case 'leave_session':
        return await voiceController.leaveSession(newRequest);
      
      case 'update_spatial_position':
        return await voiceController.updateSpatialPosition(newRequest);
      
      case 'get_session':
        // For GET-like operations, create a request with query params
        const getRequest = new NextRequest(`${request.url}?sessionId=${params.sessionId}`, {
          method: 'GET',
          headers: request.headers
        });
        return await voiceController.getSession(getRequest);
      
      case 'list_sessions':
        const listRequest = new NextRequest(`${request.url}?${new URLSearchParams(params)}`, {
          method: 'GET',
          headers: request.headers
        });
        return await voiceController.listSessions(listRequest);
      
      case 'end_session':
        return await voiceController.endSession(newRequest);
      
      case 'get_session_analytics':
        const analyticsRequest = new NextRequest(`${request.url}?sessionId=${params.sessionId}`, {
          method: 'GET',
          headers: request.headers
        });
        return await voiceController.getSessionAnalytics(analyticsRequest);
      
      // Legacy actions that still need implementation
      case 'start_screen_share':
        return await startScreenShare(params);
      
      case 'stop_screen_share':
        return await stopScreenShare(params);
      
      case 'update_audio_settings':
        return await updateAudioSettings(params);

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

// Helper functions for screen sharing (to be moved to controller later)
async function startScreenShare(params: Record<string, unknown>): Promise<NextResponse> {
  try {
    const { sessionId, participantId, shareType = 'full_screen' } = params;

    const screenShare = {
      id: `ss_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId,
      type: shareType,
      status: 'starting' as const,
      startedAt: new Date().toISOString()
    };

    return NextResponse.json({ success: true, screenShare });

  } catch (error) {
    console.error('Start screen share error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start screen share' },
      { status: 500 }
    );
  }
}

async function stopScreenShare(params: Record<string, unknown>): Promise<NextResponse> {
  try {
    const { sessionId, participantId, screenShareId } = params;
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Stop screen share error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to stop screen share' },
      { status: 500 }
    );
  }
}

async function updateAudioSettings(params: Record<string, unknown>): Promise<NextResponse> {
  try {
    const { sessionId, participantId, audioSettings } = params;
    return NextResponse.json({ success: true, audioSettings });

  } catch (error) {
    console.error('Update audio settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update audio settings' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'health') {
    return NextResponse.json({
      success: true,
      status: 'healthy',
      uptime: process.uptime()
    });
  }

  return NextResponse.json(
    { success: false, error: 'Invalid GET action' },
    { status: 400 }
  );
}