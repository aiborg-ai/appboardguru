import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { skillsAssessmentService } from '@/lib/services/skills-assessment-service';
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
    const frameworkId = searchParams.get('framework_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const includeBenchmarks = searchParams.get('include_benchmarks') === 'true';
    const role = searchParams.get('role');

    // Only allow users to view their own metrics unless they have admin role
    if (userId !== session.user.id) {
      const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userRole || !['admin', 'hr_admin', 'manager'].includes(userRole.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const dateRange = startDate && endDate ? { start: startDate, end: endDate } : undefined;

    if (includeBenchmarks) {
      const benchmarkComparison = await skillsAssessmentService.getBenchmarkComparison(
        userId,
        frameworkId || undefined,
        role || undefined
      );

      return NextResponse.json({
        success: true,
        data: benchmarkComparison
      });
    } else {
      const performanceMetrics = await skillsAssessmentService.getPerformanceMetrics(
        userId,
        frameworkId || undefined,
        dateRange
      );

      return NextResponse.json({
        success: true,
        data: performanceMetrics
      });
    }
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch performance metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}