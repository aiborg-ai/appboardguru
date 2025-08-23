import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { mentoringService } from '@/lib/services/mentoring-service';
import { Database } from '@/types/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      status,
      notes,
      action_items,
      next_session_date,
      mentor_rating,
      mentee_rating,
      actual_duration
    } = body;

    // Check permissions - need to verify user is part of the relationship
    const { data: sessionData } = await supabase
      .from('mentorship_sessions')
      .select(`
        *,
        relationship:mentorship_relationships(mentor_id, mentee_id)
      `)
      .eq('id', params.id)
      .single();

    if (!sessionData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const canUpdate = sessionData.relationship.mentor_id === session.user.id ||
                     sessionData.relationship.mentee_id === session.user.id;

    if (!canUpdate) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate ratings if provided
    if (mentor_rating && (mentor_rating < 1 || mentor_rating > 5)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Mentor rating must be between 1 and 5'
        },
        { status: 400 }
      );
    }

    if (mentee_rating && (mentee_rating < 1 || mentee_rating > 5)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Mentee rating must be between 1 and 5'
        },
        { status: 400 }
      );
    }

    const updatedSession = await mentoringService.updateMentorshipSession(
      params.id,
      {
        status,
        notes,
        action_items,
        next_session_date,
        mentor_rating,
        mentee_rating,
        actual_duration
      }
    );

    return NextResponse.json({
      success: true,
      data: updatedSession
    });
  } catch (error) {
    console.error('Error updating mentorship session:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update mentorship session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}