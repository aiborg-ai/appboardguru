import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { skillsAssessmentService } from '@/lib/services/skills-assessment-service';
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const includeAssessments = searchParams.get('include_assessments') === 'true';

    // Only include assessments for the requesting user unless they have admin role
    let finalUserId = userId;
    if (userId && userId !== session.user.id) {
      const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userRole || !['admin', 'hr_admin', 'manager'].includes(userRole.role)) {
        finalUserId = null; // Don't include assessments for unauthorized user
      }
    }

    const skills = await skillsAssessmentService.getSkillsWithAssessments(
      params.id,
      includeAssessments ? (finalUserId || session.user.id) : undefined
    );

    return NextResponse.json({
      success: true,
      data: skills,
      count: skills.length
    });
  } catch (error) {
    console.error('Error fetching skills:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch skills',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}