import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { mentoringService } from '@/lib/services/mentoring-service';
import { Database } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const relationshipId = searchParams.get('relationship_id');
    const upcoming = searchParams.get('upcoming') === 'true';

    if (upcoming) {
      // Get upcoming sessions for the user
      const sessions = await mentoringService.getUpcomingSessions(session.user.id);
      return NextResponse.json({
        success: true,
        data: sessions,
        count: sessions.length
      });
    } else if (relationshipId) {
      // Check permissions for the relationship
      const { data: relationship } = await supabase
        .from('mentorship_relationships')
        .select('mentor_id, mentee_id')
        .eq('id', relationshipId)
        .single();

      if (!relationship ||
          (relationship.mentor_id !== session.user.id && 
           relationship.mentee_id !== session.user.id)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      const sessions = await mentoringService.getMentorshipSessions(relationshipId);
      return NextResponse.json({
        success: true,
        data: sessions,
        count: sessions.length
      });
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required parameter: relationship_id or upcoming=true'
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error fetching mentorship sessions:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch mentorship sessions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      relationship_id,
      scheduled_at,
      duration_minutes,
      session_type,
      agenda
    } = body;

    if (!relationship_id || !scheduled_at) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: relationship_id, scheduled_at'
        },
        { status: 400 }
      );
    }

    // Check permissions for the relationship
    const { data: relationship } = await supabase
      .from('mentorship_relationships')
      .select('mentor_id, mentee_id, status')
      .eq('id', relationship_id)
      .single();

    if (!relationship) {
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 });
    }

    if (relationship.status !== 'active') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Cannot schedule sessions for inactive relationships'
        },
        { status: 400 }
      );
    }

    const canSchedule = relationship.mentor_id === session.user.id ||
                       relationship.mentee_id === session.user.id;

    if (!canSchedule) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const mentorshipSession = await mentoringService.createMentorshipSession({
      relationship_id,
      scheduled_at,
      duration_minutes,
      session_type,
      agenda
    });

    return NextResponse.json({
      success: true,
      data: mentorshipSession
    });
  } catch (error) {
    console.error('Error creating mentorship session:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create mentorship session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}