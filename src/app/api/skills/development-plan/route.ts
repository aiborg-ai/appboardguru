import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { skillsAssessmentService } from '@/lib/services/skills-assessment-service';
import { Database } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      user_id,
      framework_id,
      target_completion_months,
      focus_areas,
      include_mentoring
    } = body;

    const finalUserId = user_id || session.user.id;

    // Only allow creating development plans for self unless admin/manager
    if (finalUserId !== session.user.id) {
      const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userRole || !['admin', 'hr_admin', 'manager'].includes(userRole.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const developmentPlan = await skillsAssessmentService.generateDevelopmentPlan(
      finalUserId,
      {
        framework_id,
        target_completion_months,
        focus_areas,
        include_mentoring
      }
    );

    return NextResponse.json({
      success: true,
      data: developmentPlan
    });
  } catch (error) {
    console.error('Error generating development plan:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate development plan',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}