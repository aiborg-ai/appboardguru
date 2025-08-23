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
    const roleType = searchParams.get('role_type');
    const experienceLevel = searchParams.get('experience_level');
    const isActive = searchParams.get('is_active');

    const filters: any = {};
    if (roleType) filters.role_type = roleType;
    if (experienceLevel) filters.experience_level = experienceLevel;
    if (isActive !== null) filters.is_active = isActive === 'true';

    const templates = await onboardingService.getOnboardingTemplates(filters);

    return NextResponse.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Error fetching onboarding templates:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch onboarding templates',
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
      name,
      description,
      role_type,
      experience_level,
      estimated_duration_days,
      steps
    } = body;

    // Validate required fields
    if (!name || !role_type || !experience_level) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: name, role_type, experience_level'
        },
        { status: 400 }
      );
    }

    // Create template
    const { data: template, error: templateError } = await supabase
      .from('onboarding_templates')
      .insert({
        name,
        description,
        role_type,
        experience_level,
        estimated_duration_days: estimated_duration_days || 30,
        is_active: true,
        created_by: session.user.id
      })
      .select()
      .single();

    if (templateError) throw templateError;

    // Create steps if provided
    if (steps && Array.isArray(steps) && steps.length > 0) {
      const stepsData = steps.map((step, index) => ({
        template_id: template.id,
        title: step.title,
        description: step.description,
        step_order: step.step_order || index + 1,
        step_type: step.step_type || 'document_review',
        estimated_duration_hours: step.estimated_duration_hours,
        is_required: step.is_required ?? true,
        prerequisites: step.prerequisites,
        resources: step.resources,
        completion_criteria: step.completion_criteria
      }));

      const { data: createdSteps, error: stepsError } = await supabase
        .from('onboarding_steps')
        .insert(stepsData)
        .select();

      if (stepsError) throw stepsError;

      return NextResponse.json({
        success: true,
        data: {
          template,
          steps: createdSteps
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error creating onboarding template:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create onboarding template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}