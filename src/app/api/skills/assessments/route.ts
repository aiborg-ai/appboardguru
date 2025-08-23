import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { skillsAssessmentService } from '@/lib/services/skills-assessment-service';
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
    const frameworkId = searchParams.get('framework_id');
    const category = searchParams.get('category');

    // Only allow users to view their own assessments unless they have admin role
    if (userId !== session.user.id) {
      const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userRole || !['admin', 'hr_admin', 'manager'].includes(userRole.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const assessments = await skillsAssessmentService.getUserSkillAssessments(
      userId,
      frameworkId || undefined,
      category || undefined
    );

    return NextResponse.json({
      success: true,
      data: assessments,
      count: assessments.length
    });
  } catch (error) {
    console.error('Error fetching skill assessments:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch skill assessments',
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
      user_id,
      skill_id,
      assessment_date,
      current_level,
      target_level,
      self_assessment_score,
      manager_assessment_score,
      peer_assessment_score,
      evidence,
      development_plan,
      next_review_date
    } = body;

    if (!skill_id || current_level === undefined) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: skill_id, current_level'
        },
        { status: 400 }
      );
    }

    // Validate current_level is between 1 and 5
    if (current_level < 1 || current_level > 5) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Current level must be between 1 and 5'
        },
        { status: 400 }
      );
    }

    const finalUserId = user_id || session.user.id;

    // Only allow creating assessments for self unless admin/manager
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

    const assessment = await skillsAssessmentService.upsertSkillAssessment({
      user_id: finalUserId,
      skill_id,
      assessment_date,
      current_level,
      target_level,
      self_assessment_score,
      manager_assessment_score,
      peer_assessment_score,
      evidence,
      development_plan,
      next_review_date,
      assessor_id: session.user.id
    });

    return NextResponse.json({
      success: true,
      data: assessment
    });
  } catch (error) {
    console.error('Error creating skill assessment:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create skill assessment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}