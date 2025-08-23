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

    const onboarding = await onboardingService.getOnboardingWithProgress(params.id);

    // Check if user has access to this onboarding
    if (onboarding.user_id !== session.user.id && 
        onboarding.assigned_mentor_id !== session.user.id) {
      // Check if user has admin role
      const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userRole || !['admin', 'board_admin'].includes(userRole.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    return NextResponse.json({
      success: true,
      data: onboarding
    });
  } catch (error) {
    console.error('Error fetching onboarding details:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch onboarding details',
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
    const { status, notes, assigned_mentor_id, target_completion_date } = body;

    // Get the onboarding to check permissions
    const { data: existingOnboarding, error: fetchError } = await supabase
      .from('member_onboarding')
      .select('user_id, assigned_mentor_id')
      .eq('id', params.id)
      .single();

    if (fetchError) throw fetchError;

    // Check permissions
    const canUpdate = existingOnboarding.user_id === session.user.id ||
                     existingOnboarding.assigned_mentor_id === session.user.id;

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

    const updates: any = {};
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (assigned_mentor_id) updates.assigned_mentor_id = assigned_mentor_id;
    if (target_completion_date) updates.target_completion_date = target_completion_date;

    const onboarding = await onboardingService.updateOnboardingStatus(
      params.id,
      status || existingOnboarding.status,
      updates
    );

    return NextResponse.json({
      success: true,
      data: onboarding
    });
  } catch (error) {
    console.error('Error updating onboarding:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update onboarding',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}