import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    // Check if environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Supabase environment variables not configured');
      return NextResponse.json(
        { error: 'Server configuration error - Supabase not configured' },
        { status: 500 }
      );
    }
    
    const supabase = await createSupabaseServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's organizations
    const { data: organizations, error } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        role,
        status,
        is_primary,
        organizations (
          id,
          name,
          slug,
          description,
          logo_url,
          website,
          industry,
          organization_size,
          is_active
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active');
    
    if (error) {
      console.error('Error fetching organizations:', error);
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
    }
    
    // Transform the data to the expected format, filtering out null organizations
    const formattedOrganizations = organizations
      ?.filter(item => item.organizations !== null)
      ?.map(item => ({
        id: item.organizations.id,
        name: item.organizations.name,
        slug: item.organizations.slug,
        description: item.organizations.description,
        logo_url: item.organizations.logo_url,
        website: item.organizations.website,
        userRole: item.role,
        membershipStatus: item.status,
        isPrimary: item.is_primary
      })) || [];
    
    return NextResponse.json(formattedOrganizations);
  } catch (error) {
    console.error('Organizations API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch organizations',
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}