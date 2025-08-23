import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { onboardingService } from '@/lib/services/onboarding-service';
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

    // Only allow users to view their own onboardings unless they have admin role
    if (userId !== session.user.id) {
      // TODO: Add role-based access control
      const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userRole || !['admin', 'board_admin'].includes(userRole.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const onboardings = await onboardingService.getUserOnboardings(userId);

    return NextResponse.json({
      success: true,
      data: onboardings,
      count: onboardings.length
    });
  } catch (error) {
    console.error('Error fetching onboarding instances:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch onboarding instances',
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
      template_id,
      board_id,
      assigned_mentor_id,
      target_completion_date,
      start_date
    } = body;

    // Validate required fields
    if (!template_id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required field: template_id'
        },
        { status: 400 }
      );
    }

    const finalUserId = user_id || session.user.id;

    // Only allow creating onboarding for self unless admin
    if (finalUserId !== session.user.id) {
      const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userRole || !['admin', 'board_admin'].includes(userRole.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    // Check if user already has active onboarding for this template
    const { data: existingOnboarding } = await supabase
      .from('member_onboarding')
      .select('id, status')
      .eq('user_id', finalUserId)
      .eq('template_id', template_id)
      .in('status', ['not_started', 'in_progress'])
      .limit(1);

    if (existingOnboarding && existingOnboarding.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'User already has an active onboarding instance for this template'
        },
        { status: 409 }
      );
    }

    const onboarding = await onboardingService.createOnboardingInstance({
      user_id: finalUserId,
      template_id,
      board_id,
      assigned_mentor_id,
      target_completion_date,
      start_date
    });

    return NextResponse.json({
      success: true,
      data: onboarding
    });
  } catch (error) {
    console.error('Error creating onboarding instance:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create onboarding instance',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}