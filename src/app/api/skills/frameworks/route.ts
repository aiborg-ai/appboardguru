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
    const includeInactive = searchParams.get('include_inactive') === 'true';

    const frameworks = await skillsAssessmentService.getSkillFrameworks(includeInactive);

    return NextResponse.json({
      success: true,
      data: frameworks,
      count: frameworks.length
    });
  } catch (error) {
    console.error('Error fetching skill frameworks:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch skill frameworks',
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

    // Check if user has permission to create skill frameworks
    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!userRole || !['admin', 'hr_admin'].includes(userRole.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, version, framework_type } = body;

    if (!name || !framework_type) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: name, framework_type'
        },
        { status: 400 }
      );
    }

    const { data: framework, error } = await supabase
      .from('skill_frameworks')
      .insert({
        name,
        description,
        version: version || '1.0',
        framework_type,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: framework
    });
  } catch (error) {
    console.error('Error creating skill framework:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create skill framework',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}