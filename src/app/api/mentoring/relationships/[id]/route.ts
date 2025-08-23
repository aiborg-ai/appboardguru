import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { mentoringService } from '@/lib/services/mentoring-service';
import { Database } from '@/types/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const relationship = await mentoringService.getMentorshipDetails(params.id);

    // Check if user has access to this relationship
    if (relationship.mentor_id !== session.user.id && 
        relationship.mentee_id !== session.user.id) {
      const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userRole || !['admin', 'mentoring_admin'].includes(userRole.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    return NextResponse.json({
      success: true,
      data: relationship
    });
  } catch (error) {
    console.error('Error fetching mentorship relationship:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch mentorship relationship',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

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
      start_date,
      end_date,
      satisfaction_rating,
      completion_feedback,
      progress_notes
    } = body;

    // Check permissions
    const { data: existingRelationship } = await supabase
      .from('mentorship_relationships')
      .select('mentor_id, mentee_id')
      .eq('id', params.id)
      .single();

    if (!existingRelationship) {
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 });
    }

    const canUpdate = existingRelationship.mentor_id === session.user.id ||
                     existingRelationship.mentee_id === session.user.id;

    if (!canUpdate) {
      const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userRole || !['admin', 'mentoring_admin'].includes(userRole.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const relationship = await mentoringService.updateMentorshipStatus(
      params.id,
      status,
      {
        start_date,
        end_date,
        satisfaction_rating,
        completion_feedback,
        progress_notes
      }
    );

    return NextResponse.json({
      success: true,
      data: relationship
    });
  } catch (error) {
    console.error('Error updating mentorship relationship:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update mentorship relationship',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}