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
    const certificationType = searchParams.get('certification_type');
    const issuingOrganization = searchParams.get('issuing_organization');
    const isActive = searchParams.get('is_active');
    const includeUserStatus = searchParams.get('include_user_status') === 'true';

    const filters: any = {};
    if (certificationType) filters.certification_type = certificationType;
    if (issuingOrganization) filters.issuing_organization = issuingOrganization;
    if (isActive !== null) filters.is_active = isActive === 'true';
    if (includeUserStatus) filters.user_id = session.user.id;

    const certifications = await continuingEducationService.getCertifications(filters);

    return NextResponse.json({
      success: true,
      data: certifications,
      count: certifications.length
    });
  } catch (error) {
    console.error('Error fetching certifications:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch certifications',
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

    // Check if user has permission to create certifications
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
      issuing_organization,
      certification_type,
      requirements,
      badge_image_url,
      certificate_template,
      validity_months,
      renewal_requirements,
      credits
    } = body;

    if (!name || !certification_type) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: name, certification_type'
        },
        { status: 400 }
      );
    }

    const { data: certification, error } = await supabase
      .from('certifications')
      .insert({
        name,
        description,
        issuing_organization,
        certification_type,
        requirements,
        badge_image_url,
        certificate_template,
        validity_months,
        renewal_requirements,
        credits,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: certification
    });
  } catch (error) {
    console.error('Error creating certification:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create certification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}