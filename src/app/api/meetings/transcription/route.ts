/**
 * Meeting Transcription API Endpoints
 * Handles AI-powered meeting transcription with OpenRouter integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createTypedSupabaseClient, getAuthenticatedUser } from '@/lib/supabase-typed';
import { MeetingTranscriptionService } from '@/lib/services/meeting-transcription.service';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * POST /api/meetings/transcription - Start a new meeting transcription
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createTypedSupabaseClient();
    const user = await getAuthenticatedUser(supabase);

    const body = await request.json();
    const { organizationId, title, participants, expectedLanguages } = body;

    // Validate input
    if (!organizationId || !title || !participants || !Array.isArray(participants)) {
      return NextResponse.json({
        error: 'Missing required fields: organizationId, title, participants'
      }, { status: 400 });
    }

    if (participants.length === 0) {
      return NextResponse.json({
        error: 'At least one participant is required'
      }, { status: 400 });
    }

    // Start transcription session
    const meetingTranscriptionService = new MeetingTranscriptionService();
    const result = await meetingTranscriptionService.startMeetingTranscription(
      user.id,
      organizationId,
      {
        title,
        participants: participants.map((p: any) => ({
          name: p.name,
          email: p.email
        })),
        expectedLanguages: expectedLanguages || ['en']
      }
    );

    return NextResponse.json({
      success: true,
      transcriptionId: result.transcriptionId,
      sessionId: result.sessionId,
      message: 'Meeting transcription started successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error starting meeting transcription:', error);
    return NextResponse.json({
      error: 'Failed to start meeting transcription',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/meetings/transcription?transcriptionId=xxx - Get transcription status/data
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createTypedSupabaseClient();
    const user = await getAuthenticatedUser(supabase);

    const url = new URL(request.url);
    const transcriptionId = url.searchParams.get('transcriptionId');

    if (!transcriptionId) {
      return NextResponse.json({
        error: 'transcriptionId parameter is required'
      }, { status: 400 });
    }

    // Get transcription data
    const { data: transcription, error } = await supabase
      .from('meeting_transcriptions')
      .select(`
        id,
        title,
        status,
        participants,
        transcript_data,
        summary,
        action_items,
        decisions,
        language_stats,
        created_at,
        updated_at,
        completed_at
      `)
      .eq('id', transcriptionId)
      .single();

    if (error || !transcription) {
      return NextResponse.json({
        error: 'Transcription not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      transcription: {
        id: transcription.id,
        title: transcription.title,
        status: transcription.status,
        participants: transcription.participants || [],
        segments: transcription.transcript_data?.segments || [],
        summary: transcription.summary,
        actionItems: transcription.action_items || [],
        decisions: transcription.decisions || [],
        languageStats: transcription.language_stats || {},
        createdAt: transcription.created_at,
        updatedAt: transcription.updated_at,
        completedAt: transcription.completed_at
      }
    });

  } catch (error) {
    console.error('Error fetching transcription:', error);
    return NextResponse.json({
      error: 'Failed to fetch transcription',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/meetings/transcription - Add transcription segment
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createTypedSupabaseClient();
    const user = await getAuthenticatedUser(supabase);

    const body = await request.json();
    const { 
      transcriptionId, 
      sessionId, 
      text, 
      startTime, 
      endTime, 
      confidence,
      detectedLanguage,
      speakerAudioProfile
    } = body;

    // Validate input
    if (!transcriptionId || !sessionId || !text || startTime === undefined || endTime === undefined) {
      return NextResponse.json({
        error: 'Missing required fields: transcriptionId, sessionId, text, startTime, endTime'
      }, { status: 400 });
    }

    // Add transcription segment
    const meetingTranscriptionService = new MeetingTranscriptionService();
    const result = await meetingTranscriptionService.addTranscriptionSegment(
      sessionId,
      transcriptionId,
      {
        text: text.trim(),
        startTime: Number(startTime),
        endTime: Number(endTime),
        confidence: Number(confidence) || 0.8,
        detectedLanguage,
        speakerAudioProfile: speakerAudioProfile ? 
          new ArrayBuffer(speakerAudioProfile.length) : undefined
      },
      user.id
    );

    return NextResponse.json({
      success: true,
      segmentId: result.segmentId,
      speakerId: result.speakerId,
      message: 'Transcription segment added successfully'
    });

  } catch (error) {
    console.error('Error adding transcription segment:', error);
    return NextResponse.json({
      error: 'Failed to add transcription segment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}