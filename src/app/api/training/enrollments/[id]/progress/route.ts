import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { trainingService } from '@/lib/services/training-service';
import { Database } from '@/types/database';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      module_id,
      module_title,
      progress_data,
      completed_at,
      score,
      time_spent_minutes,
      action 
    } = body;

    if (!module_id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required field: module_id'
        },
        { status: 400 }
      );
    }

    // Check if user owns this enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('training_enrollments')
      .select('user_id, course_id, status')
      .eq('id', params.id)
      .single();

    if (enrollmentError) throw enrollmentError;

    if (enrollment.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // If this is the first progress update and course hasn't been started, mark as started
    if (enrollment.status === 'enrolled') {
      await trainingService.startCourse(enrollment.user_id, enrollment.course_id);
    }

    // Handle different actions
    let progressUpdate: any = {
      module_title,
      progress_data,
      score,
      time_spent_minutes
    };

    if (action === 'complete' || completed_at) {
      progressUpdate.completed_at = completed_at || new Date().toISOString();
    }

    const progress = await trainingService.updateCourseProgress(
      params.id,
      module_id,
      progressUpdate
    );

    return NextResponse.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Error updating course progress:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update course progress',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, final_score, time_spent_minutes, certificate_url } = body;

    // Check if user owns this enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('training_enrollments')
      .select('user_id, course_id')
      .eq('id', params.id)
      .single();

    if (enrollmentError) throw enrollmentError;

    if (enrollment.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    let result;

    switch (action) {
      case 'start':
        result = await trainingService.startCourse(enrollment.user_id, enrollment.course_id);
        break;
      
      case 'complete':
        result = await trainingService.completeCourse(enrollment.user_id, enrollment.course_id, {
          final_score,
          time_spent_minutes,
          certificate_url
        });
        break;
      
      default:
        return NextResponse.json(
          { 
            success: false,
            error: 'Invalid action. Supported actions: start, complete'
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error updating enrollment status:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update enrollment status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}