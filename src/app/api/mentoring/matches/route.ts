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
    const menteeId = searchParams.get('mentee_id') || session.user.id;
    const expertiseAreas = searchParams.get('expertise_areas');
    const industries = searchParams.get('industries');
    const boardRoles = searchParams.get('board_roles');
    const yearsExperienceMin = searchParams.get('years_experience_min');
    const languages = searchParams.get('languages');
    const timeZone = searchParams.get('time_zone');
    const meetingFrequency = searchParams.get('meeting_frequency');
    const mentoringStyle = searchParams.get('mentoring_style');
    const goals = searchParams.get('goals');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Only allow users to get matches for themselves unless they have admin role
    if (menteeId !== session.user.id) {
      const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userRole || !['admin', 'mentoring_admin'].includes(userRole.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const criteria: any = {};
    if (expertiseAreas) criteria.expertise_areas = expertiseAreas.split(',').map(s => s.trim());
    if (industries) criteria.industries = industries.split(',').map(s => s.trim());
    if (boardRoles) criteria.board_roles = boardRoles.split(',').map(s => s.trim());
    if (yearsExperienceMin) criteria.years_experience_min = parseInt(yearsExperienceMin);
    if (languages) criteria.languages = languages.split(',').map(s => s.trim());
    if (timeZone) criteria.time_zone = timeZone;
    if (meetingFrequency) criteria.meeting_frequency = meetingFrequency;
    if (mentoringStyle) criteria.mentoring_style = mentoringStyle;
    if (goals) criteria.goals = goals.split(',').map(s => s.trim());

    const matches = await mentoringService.findMentorMatches(menteeId, criteria, limit);

    return NextResponse.json({
      success: true,
      data: matches,
      count: matches.length
    });
  } catch (error) {
    console.error('Error finding mentor matches:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to find mentor matches',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}