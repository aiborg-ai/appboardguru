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

    // Check if user has admin role for analytics access
    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!userRole || !['admin', 'board_admin'].includes(userRole.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const roleType = searchParams.get('role_type');
    const experienceLevel = searchParams.get('experience_level');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const filters: any = {};
    if (roleType) filters.role_type = roleType;
    if (experienceLevel) filters.experience_level = experienceLevel;
    if (startDate && endDate) {
      filters.date_range = { start: startDate, end: endDate };
    }

    const analytics = await onboardingService.getOnboardingAnalytics(filters);

    // Additional analytics calculations
    const roleTypeBreakdown = analytics.data.reduce((acc: any, item: any) => {
      acc[item.role_type] = (acc[item.role_type] || 0) + 1;
      return acc;
    }, {});

    const experienceLevelBreakdown = analytics.data.reduce((acc: any, item: any) => {
      acc[item.experience_level] = (acc[item.experience_level] || 0) + 1;
      return acc;
    }, {});

    const progressDistribution = analytics.data.reduce((acc: any, item: any) => {
      const range = Math.floor((item.progress_percentage || 0) / 20) * 20;
      const key = `${range}-${range + 19}%`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total_onboardings: analytics.total_onboardings,
          completed_onboardings: analytics.completed_onboardings,
          in_progress_onboardings: analytics.in_progress_onboardings,
          overdue_onboardings: analytics.overdue_onboardings,
          completion_rate: Math.round(analytics.completion_rate * 100) / 100,
          average_progress: Math.round(analytics.average_progress * 100) / 100
        },
        breakdowns: {
          by_role_type: roleTypeBreakdown,
          by_experience_level: experienceLevelBreakdown,
          progress_distribution: progressDistribution
        },
        detailed_data: analytics.data
      }
    });
  } catch (error) {
    console.error('Error fetching onboarding analytics:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch onboarding analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}