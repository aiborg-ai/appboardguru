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

    // Only allow users to view their own gap analysis unless they have admin role
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

    const gapAnalysis = await skillsAssessmentService.analyzeSkillGaps(
      userId,
      frameworkId || undefined
    );

    // Group gaps by priority for easier consumption
    const groupedGaps = {
      high_priority: gapAnalysis.filter(gap => gap.priority === 'high'),
      medium_priority: gapAnalysis.filter(gap => gap.priority === 'medium'),
      low_priority: gapAnalysis.filter(gap => gap.priority === 'low')
    };

    // Calculate summary statistics
    const summary = {
      total_gaps: gapAnalysis.length,
      high_priority_count: groupedGaps.high_priority.length,
      medium_priority_count: groupedGaps.medium_priority.length,
      low_priority_count: groupedGaps.low_priority.length,
      average_gap: gapAnalysis.length > 0 
        ? Math.round((gapAnalysis.reduce((sum, gap) => sum + gap.gap, 0) / gapAnalysis.length) * 100) / 100
        : 0,
      categories_affected: [...new Set(gapAnalysis.map(gap => gap.category))].length
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        gaps: gapAnalysis,
        grouped_gaps: groupedGaps
      }
    });
  } catch (error) {
    console.error('Error performing skill gap analysis:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to perform skill gap analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}