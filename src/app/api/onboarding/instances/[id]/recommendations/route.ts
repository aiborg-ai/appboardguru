import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { onboardingService } from '@/lib/services/onboarding-service';
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

    // Check if user has access to this onboarding
    const { data: onboarding, error: onboardingError } = await supabase
      .from('member_onboarding')
      .select('user_id, assigned_mentor_id')
      .eq('id', params.id)
      .single();

    if (onboardingError) throw onboardingError;

    const canAccess = onboarding.user_id === session.user.id ||
                     onboarding.assigned_mentor_id === session.user.id;

    if (!canAccess) {
      const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userRole || !['admin', 'board_admin'].includes(userRole.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const nextSteps = await onboardingService.getRecommendedNextSteps(params.id);

    return NextResponse.json({
      success: true,
      data: {
        next_steps: nextSteps,
        count: nextSteps.length
      }
    });
  } catch (error) {
    console.error('Error fetching onboarding recommendations:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch onboarding recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}