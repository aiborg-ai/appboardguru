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
    const expertiseAreas = searchParams.get('expertise_areas');
    const industries = searchParams.get('industries');
    const boardRoles = searchParams.get('board_roles');
    const yearsExperienceMin = searchParams.get('years_experience_min');
    const languages = searchParams.get('languages');
    const timeZone = searchParams.get('time_zone');
    const limit = parseInt(searchParams.get('limit') || '20');

    const filters: any = { limit };
    if (expertiseAreas) filters.expertise_areas = expertiseAreas.split(',').map(s => s.trim());
    if (industries) filters.industries = industries.split(',').map(s => s.trim());
    if (boardRoles) filters.board_roles = boardRoles.split(',').map(s => s.trim());
    if (yearsExperienceMin) filters.years_experience_min = parseInt(yearsExperienceMin);
    if (languages) filters.languages = languages.split(',').map(s => s.trim());
    if (timeZone) filters.time_zone = timeZone;

    const mentors = await mentoringService.getAvailableMentors(filters);

    return NextResponse.json({
      success: true,
      data: mentors,
      count: mentors.length
    });
  } catch (error) {
    console.error('Error fetching available mentors:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch available mentors',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}