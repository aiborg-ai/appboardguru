import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { onboardingService } from '@/lib/services/onboarding-service';
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
    const { step_id, action, feedback, attachments, score, time_spent_minutes } = body;

    if (!step_id || !action) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: step_id, action'
        },
        { status: 400 }
      );
    }

    // Check if user has access to this onboarding
    const { data: onboarding, error: onboardingError } = await supabase
      .from('member_onboarding')
      .select('user_id, assigned_mentor_id')
      .eq('id', params.id)
      .single();

    if (onboardingError) throw onboardingError;

    const canUpdate = onboarding.user_id === session.user.id ||
                     onboarding.assigned_mentor_id === session.user.id;

    if (!canUpdate) {
      const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userRole || !['admin', 'board_admin'].includes(userRole.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    let result;
    
    switch (action) {
      case 'start':
        result = await onboardingService.startStep(params.id, step_id);
        break;
      
      case 'complete':
        result = await onboardingService.completeStep(params.id, step_id, {
          feedback,
          attachments,
          score,
          time_spent_minutes
        });
        break;
      
      case 'update':
        result = await onboardingService.updateStepProgress(params.id, step_id, {
          feedback,
          attachments,
          score,
          time_spent_minutes
        });
        break;
      
      default:
        return NextResponse.json(
          { 
            success: false,
            error: 'Invalid action. Supported actions: start, complete, update'
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error updating onboarding progress:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update onboarding progress',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}