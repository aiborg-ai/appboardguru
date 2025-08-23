import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { continuingEducationService } from '@/lib/services/continuing-education-service';
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

    const providers = await continuingEducationService.getLearningProviders(includeInactive);

    return NextResponse.json({
      success: true,
      data: providers,
      count: providers.length
    });
  } catch (error) {
    console.error('Error fetching learning providers:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch learning providers',
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

    // Check if user has permission to create providers
    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!userRole || !['admin', 'learning_admin'].includes(userRole.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      website_url,
      api_endpoint,
      api_key,
      provider_type,
      sync_frequency,
      supported_features,
      configuration
    } = body;

    if (!name || !provider_type) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: name, provider_type'
        },
        { status: 400 }
      );
    }

    const provider = await continuingEducationService.createLearningProvider({
      name,
      description,
      website_url,
      api_endpoint,
      api_key,
      provider_type,
      sync_frequency,
      supported_features,
      configuration
    });

    return NextResponse.json({
      success: true,
      data: provider
    });
  } catch (error) {
    console.error('Error creating learning provider:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create learning provider',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}