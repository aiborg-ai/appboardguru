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

    // Only allow users to view their own profile unless they have admin role
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

    const profile = await mentoringService.getMentorProfile(userId);

    return NextResponse.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error fetching mentor profile:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch mentor profile',
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
      bio,
      expertise_areas,
      industries,
      board_roles,
      years_experience,
      max_mentees,
      is_available,
      languages,
      time_zone,
      preferred_communication,
      mentoring_style,
      achievements
    } = body;

    const profile = await mentoringService.upsertMentorProfile({
      user_id: session.user.id,
      bio,
      expertise_areas,
      industries,
      board_roles,
      years_experience,
      max_mentees,
      is_available,
      languages,
      time_zone,
      preferred_communication,
      mentoring_style,
      achievements
    });

    return NextResponse.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error creating/updating mentor profile:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create/update mentor profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}