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

    const templateData = await onboardingService.getOnboardingTemplate(params.id);

    return NextResponse.json({
      success: true,
      data: templateData
    });
  } catch (error) {
    console.error('Error fetching onboarding template:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch onboarding template',
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
    const updates = {
      name: body.name,
      description: body.description,
      role_type: body.role_type,
      experience_level: body.experience_level,
      estimated_duration_days: body.estimated_duration_days,
      is_active: body.is_active,
      updated_at: new Date().toISOString()
    };

    const { data: template, error } = await supabase
      .from('onboarding_templates')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error updating onboarding template:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update onboarding template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Soft delete by setting is_active to false
    const { data: template, error } = await supabase
      .from('onboarding_templates')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Onboarding template deactivated successfully',
      data: template
    });
  } catch (error) {
    console.error('Error deactivating onboarding template:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to deactivate onboarding template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}