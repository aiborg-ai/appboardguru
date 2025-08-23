import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { trainingService } from '@/lib/services/training-service';
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

    const courseDetails = await trainingService.getCourseDetails(params.id, session.user.id);

    return NextResponse.json({
      success: true,
      data: courseDetails
    });
  } catch (error) {
    console.error('Error fetching course details:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch course details',
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

    // Check permissions
    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    const { data: course } = await supabase
      .from('training_courses')
      .select('created_by')
      .eq('id', params.id)
      .single();

    const canUpdate = userRole && ['admin', 'training_admin'].includes(userRole.role) ||
                     (course && course.created_by === session.user.id);

    if (!canUpdate) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const updates = {
      title: body.title,
      description: body.description,
      category_id: body.category_id,
      course_type: body.course_type,
      difficulty_level: body.difficulty_level,
      estimated_duration_hours: body.estimated_duration_hours,
      content_url: body.content_url,
      content_data: body.content_data,
      prerequisites: body.prerequisites,
      learning_objectives: body.learning_objectives,
      tags: body.tags,
      is_required: body.is_required,
      is_active: body.is_active,
      provider_name: body.provider_name,
      provider_url: body.provider_url,
      credits: body.credits,
      expiry_months: body.expiry_months,
      thumbnail_url: body.thumbnail_url,
      updated_at: new Date().toISOString()
    };

    const { data: updatedCourse, error } = await supabase
      .from('training_courses')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: updatedCourse
    });
  } catch (error) {
    console.error('Error updating training course:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update training course',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!userRole || !['admin', 'training_admin'].includes(userRole.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Soft delete by setting is_active to false
    const { data: course, error } = await supabase
      .from('training_courses')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Training course deactivated successfully',
      data: course
    });
  } catch (error) {
    console.error('Error deactivating training course:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to deactivate training course',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}