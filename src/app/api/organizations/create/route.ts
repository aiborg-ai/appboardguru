import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema for organization creation
const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100),
  description: z.string().optional(),
  industry: z.string().min(1, 'Industry is required'),
  website: z.string().url().optional().or(z.literal('')),
  organizationSize: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
});

/**
 * POST /api/organizations/create
 * Create a new organization
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Organization creation API called');
    
    // Check if environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Supabase environment variables not configured:', {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      });
      return NextResponse.json(
        { error: 'Server configuration error - Supabase not configured' },
        { status: 500 }
      );
    }
    
    const supabase = await createSupabaseServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ 
        error: 'Authentication failed',
        details: authError.message 
      }, { status: 401 });
    }
    
    if (!user) {
      console.error('No user found in session');
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 });
    }
    
    console.log('Authenticated user:', user.email);
    
    const body = await request.json();
    console.log('Request body:', body);
    
    // Normalize industry value (replace spaces with underscores)
    if (body.industry && typeof body.industry === 'string') {
      body.industry = body.industry.replace(/\s+/g, '_');
      console.log('Normalized industry:', body.industry);
    }
    
    // Validate request body
    const validationResult = createOrganizationSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation failed:', {
        errors: validationResult.error.issues,
        receivedData: body
      });
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    
    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50); // Limit slug length
    
    // Check if slug already exists
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single();
    
    if (existingOrg) {
      // Add a random suffix if slug exists
      const uniqueSlug = `${slug}-${Math.random().toString(36).substr(2, 5)}`;
      
      // Create organization with unique slug
      // Try to create organization with minimal fields first
      const { data: organization, error: createError } = await supabase
        .from('organizations')
        .insert({
          name: data.name,
          slug: uniqueSlug,
          description: data.description || null,
          industry: data.industry,
          website: data.website || null,
          organization_size: data.organizationSize || 'startup',
          created_by: user.id,
          is_active: true,
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Detailed error creating organization:', {
          error: createError,
          code: createError.code,
          message: createError.message,
          details: createError.details,
          hint: createError.hint,
          data: {
            name: data.name,
            slug: uniqueSlug,
            industry: data.industry,
            organization_size: data.organizationSize
          }
        });
        return NextResponse.json(
          { error: 'Failed to create organization', details: createError.message, code: createError.code },
          { status: 500 }
        );
      }
      
      // Add creator as organization owner
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organization.id,
          user_id: user.id,
          role: 'owner',
          status: 'active',
          is_primary: true,
        });
      
      if (memberError) {
        console.warn('Failed to add user as organization owner:', memberError);
      }
      
      // Log the creation in audit logs
      await supabase
        .from('audit_logs')
        .insert({
          organization_id: organization.id,
          user_id: user.id,
          event_type: 'user_action',
          event_category: 'organizations',
          action: 'create_organization',
          resource_type: 'organization',
          resource_id: organization.id,
          event_description: `Created organization "${organization.name}"`,
          outcome: 'success',
          details: {
            slug: organization.slug,
            industry: organization.industry,
            website: organization.website
          }
        });
      
      return NextResponse.json({
        success: true,
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          description: organization.description,
          industry: organization.industry,
          website: organization.website,
          organization_size: organization.organization_size,
        },
        message: `Organization "${organization.name}" created successfully`
      }, { status: 201 });
      
    } else {
      // Create organization with original slug
      // Try to create organization with minimal fields first
      const { data: organization, error: createError } = await supabase
        .from('organizations')
        .insert({
          name: data.name,
          slug: slug,
          description: data.description || null,
          industry: data.industry,
          website: data.website || null,
          organization_size: data.organizationSize || 'startup',
          created_by: user.id,
          is_active: true,
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Detailed error creating organization:', {
          error: createError,
          code: createError.code,
          message: createError.message,
          details: createError.details,
          hint: createError.hint,
          data: {
            name: data.name,
            slug: slug,
            industry: data.industry,
            organization_size: data.organizationSize
          }
        });
        return NextResponse.json(
          { error: 'Failed to create organization', details: createError.message, code: createError.code },
          { status: 500 }
        );
      }
      
      // Add creator as organization owner
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organization.id,
          user_id: user.id,
          role: 'owner',
          status: 'active',
          is_primary: true,
        });
      
      if (memberError) {
        console.warn('Failed to add user as organization owner:', memberError);
      }
      
      // Log the creation in audit logs
      await supabase
        .from('audit_logs')
        .insert({
          organization_id: organization.id,
          user_id: user.id,
          event_type: 'user_action',
          event_category: 'organizations',
          action: 'create_organization',
          resource_type: 'organization',
          resource_id: organization.id,
          event_description: `Created organization "${organization.name}"`,
          outcome: 'success',
          details: {
            slug: organization.slug,
            industry: organization.industry,
            website: organization.website
          }
        });
      
      return NextResponse.json({
        success: true,
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          description: organization.description,
          industry: organization.industry,
          website: organization.website,
          organization_size: organization.organization_size,
        },
        message: `Organization "${organization.name}" created successfully`
      }, { status: 201 });
    }
    
  } catch (error) {
    console.error('Error in POST /api/organizations/create:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      { 
        error: 'Failed to create organization',
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}