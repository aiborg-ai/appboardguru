/**
 * Meeting Minutes Generation API
 * AI-powered meeting minutes generation from transcriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createTypedSupabaseClient, getAuthenticatedUser } from '@/lib/supabase-typed';
import { MeetingTranscriptionService } from '@/lib/services/meeting-transcription.service';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * POST /api/meetings/transcription/generate-minutes - Generate AI meeting minutes
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createTypedSupabaseClient();
    const user = await getAuthenticatedUser(supabase);

    const body = await request.json();
    const { 
      transcriptionId, 
      includeFullTranscript = false,
      summaryStyle = 'detailed',
      language = 'en'
    } = body;

    // Validate input
    if (!transcriptionId) {
      return NextResponse.json({
        error: 'transcriptionId is required'
      }, { status: 400 });
    }

    if (!['detailed', 'concise', 'action-oriented'].includes(summaryStyle)) {
      return NextResponse.json({
        error: 'summaryStyle must be one of: detailed, concise, action-oriented'
      }, { status: 400 });
    }

    // Check if transcription exists and is accessible
    const { data: transcription, error: fetchError } = await supabase
      .from('meeting_transcriptions')
      .select('id, title, status, created_by, organization_id')
      .eq('id', transcriptionId)
      .single();

    if (fetchError || !transcription) {
      return NextResponse.json({
        error: 'Transcription not found'
      }, { status: 404 });
    }

    // Check if user has access (same organization or is creator)
    const { data: userOrg } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!userOrg || userOrg.organization_id !== transcription.organization_id) {
      return NextResponse.json({
        error: 'Access denied to this transcription'
      }, { status: 403 });
    }

    // Generate meeting minutes using AI
    const meetingTranscriptionService = new MeetingTranscriptionService();
    const meetingMinutes = await meetingTranscriptionService.generateMeetingMinutes(
      transcriptionId,
      user.id,
      {
        includeFullTranscript,
        summaryStyle: summaryStyle as 'detailed' | 'concise' | 'action-oriented',
        language
      }
    );

    // Log the generation
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        organization_id: transcription.organization_id,
        event_type: 'user_action',
        event_category: 'meeting_transcription',
        action: 'generate_minutes',
        resource_type: 'meeting_minutes',
        resource_id: transcriptionId,
        event_description: `Generated AI meeting minutes for: "${transcription.title}"`,
        outcome: 'success',
        details: {
          summary_style: summaryStyle,
          include_full_transcript: includeFullTranscript,
          language,
          agenda_items: meetingMinutes.agenda.length,
          action_items: meetingMinutes.actionItems.length,
          decisions: meetingMinutes.decisions.length
        }
      });

    return NextResponse.json({
      success: true,
      meetingMinutes,
      message: 'Meeting minutes generated successfully'
    });

  } catch (error) {
    console.error('Error generating meeting minutes:', error);
    return NextResponse.json({
      error: 'Failed to generate meeting minutes',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}