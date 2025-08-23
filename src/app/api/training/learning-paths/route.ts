import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { trainingService } from '@/lib/services/training-service';
import { Database } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetRole = searchParams.get('target_role');
    const difficultyLevel = searchParams.get('difficulty_level');
    const isActive = searchParams.get('is_active');

    const filters: any = {};
    if (targetRole) filters.target_role = targetRole;
    if (difficultyLevel) filters.difficulty_level = difficultyLevel;
    if (isActive !== null) filters.is_active = isActive === 'true';

    const learningPaths = await trainingService.getLearningPaths(filters);

    return NextResponse.json({
      success: true,
      data: learningPaths,
      count: learningPaths.length
    });
  } catch (error) {
    console.error('Error fetching learning paths:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch learning paths',
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

    // Check if user has permission to create learning paths
    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!userRole || !['admin', 'training_admin'].includes(userRole.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      target_role,
      difficulty_level,
      estimated_duration_months,
      required_courses,
      optional_courses,
      milestones,
      prerequisites,
      learning_outcomes,
      is_template
    } = body;

    if (!name || !difficulty_level) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: name, difficulty_level'
        },
        { status: 400 }
      );
    }

    const { data: learningPath, error } = await supabase
      .from('learning_paths')
      .insert({
        name,
        description,
        target_role,
        difficulty_level,
        estimated_duration_months,
        required_courses: required_courses || [],
        optional_courses: optional_courses || [],
        milestones,
        prerequisites,
        learning_outcomes: learning_outcomes || [],
        is_template: is_template || false,
        is_active: true,
        created_by: session.user.id
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: learningPath
    });
  } catch (error) {
    console.error('Error creating learning path:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create learning path',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}