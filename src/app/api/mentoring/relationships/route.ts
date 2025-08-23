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
    const userId = searchParams.get('user_id') || session.user.id;
    const role = searchParams.get('role') as 'mentor' | 'mentee' | 'both' | null;

    // Only allow users to view their own relationships unless they have admin role
    if (userId !== session.user.id) {
      const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userRole || !['admin', 'mentoring_admin'].includes(userRole.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const relationships = await mentoringService.getUserMentorships(
      userId,
      role || 'both'
    );

    return NextResponse.json({
      success: true,
      data: relationships,
      count: relationships.length
    });
  } catch (error) {
    console.error('Error fetching mentorship relationships:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch mentorship relationships',
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
      mentor_id,
      mentee_id,
      matching_criteria,
      goals,
      program_duration_months,
      meeting_frequency
    } = body;

    if (!mentor_id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required field: mentor_id'
        },
        { status: 400 }
      );
    }

    const finalMenteeId = mentee_id || session.user.id;

    // Only allow creating relationships for self as mentee unless admin
    if (finalMenteeId !== session.user.id) {
      const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userRole || !['admin', 'mentoring_admin'].includes(userRole.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const relationship = await mentoringService.createMentorshipRelationship({
      mentor_id,
      mentee_id: finalMenteeId,
      matching_criteria,
      goals,
      program_duration_months,
      meeting_frequency
    });

    return NextResponse.json({
      success: true,
      data: relationship
    });
  } catch (error) {
    console.error('Error creating mentorship relationship:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Mentor is not available') {
        return NextResponse.json(
          { 
            success: false,
            error: error.message
          },
          { status: 409 }
        );
      }
      if (error.message === 'Active mentorship relationship already exists') {
        return NextResponse.json(
          { 
            success: false,
            error: error.message
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create mentorship relationship',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}