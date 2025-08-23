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
    const { user_id, target_completion_date } = body;

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

    const enrollment = await trainingService.enrollInLearningPath(
      finalUserId,
      params.id,
      target_completion_date
    );

    return NextResponse.json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    console.error('Error enrolling in learning path:', error);
    
    if (error instanceof Error && error.message === 'Already enrolled in this learning path') {
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
        error: 'Failed to enroll in learning path',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}