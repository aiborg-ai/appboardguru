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
    const categoryId = searchParams.get('category_id');
    const courseType = searchParams.get('course_type');
    const difficultyLevel = searchParams.get('difficulty_level');
    const isRequired = searchParams.get('is_required');
    const isActive = searchParams.get('is_active');
    const search = searchParams.get('search');
    const tags = searchParams.get('tags');

    const filters: any = {};
    if (categoryId) filters.category_id = categoryId;
    if (courseType) filters.course_type = courseType;
    if (difficultyLevel) filters.difficulty_level = difficultyLevel;
    if (isRequired !== null) filters.is_required = isRequired === 'true';
    if (isActive !== null) filters.is_active = isActive === 'true';
    if (search) filters.search = search;
    if (tags) filters.tags = tags.split(',').map(tag => tag.trim());

    const courses = await trainingService.getTrainingCourses(filters);

    return NextResponse.json({
      success: true,
      data: courses,
      count: courses.length
    });
  } catch (error) {
    console.error('Error fetching training courses:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch training courses',
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

    // Check if user has permission to create courses
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
      title,
      description,
      category_id,
      course_type,
      difficulty_level,
      estimated_duration_hours,
      content_url,
      content_data,
      prerequisites,
      learning_objectives,
      tags,
      is_required,
      provider_name,
      provider_url,
      credits,
      expiry_months,
      thumbnail_url
    } = body;

    // Validate required fields
    if (!title || !category_id || !course_type || !difficulty_level) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: title, category_id, course_type, difficulty_level'
        },
        { status: 400 }
      );
    }

    const { data: course, error } = await supabase
      .from('training_courses')
      .insert({
        title,
        description,
        category_id,
        course_type,
        difficulty_level: difficulty_level || 'beginner',
        estimated_duration_hours,
        content_url,
        content_data,
        prerequisites,
        learning_objectives: learning_objectives || [],
        tags: tags || [],
        is_required: is_required || false,
        is_active: true,
        provider_name,
        provider_url,
        credits,
        expiry_months,
        thumbnail_url,
        created_by: session.user.id
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: course
    });
  } catch (error) {
    console.error('Error creating training course:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create training course',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}