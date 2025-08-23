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
    const userId = searchParams.get('user_id') || session.user.id;
    const status = searchParams.get('status');
    const categoryId = searchParams.get('category_id');

    // Only allow users to view their own enrollments unless they have admin role
    if (userId !== session.user.id) {
      const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userRole || !['admin', 'training_admin'].includes(userRole.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const filters: any = {};
    if (status) filters.status = status;
    if (categoryId) filters.category_id = categoryId;

    const enrollments = await trainingService.getUserEnrollments(userId, filters);

    return NextResponse.json({
      success: true,
      data: enrollments,
      count: enrollments.length
    });
  } catch (error) {
    console.error('Error fetching training enrollments:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch training enrollments',
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
    const { course_id, user_id } = body;

    if (!course_id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required field: course_id'
        },
        { status: 400 }
      );
    }

    const finalUserId = user_id || session.user.id;

    // Only allow enrolling self unless admin
    if (finalUserId !== session.user.id) {
      const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userRole || !['admin', 'training_admin'].includes(userRole.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const enrollment = await trainingService.enrollInCourse(finalUserId, course_id);

    return NextResponse.json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    console.error('Error creating course enrollment:', error);
    
    if (error instanceof Error && error.message === 'Already enrolled in this course') {
      return NextResponse.json(
        { 
          success: false,
          error: error.message
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to enroll in course',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}