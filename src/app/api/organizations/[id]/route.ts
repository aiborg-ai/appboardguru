import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// GET /api/organizations/[id] - Get organization details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organization with member info
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select(`
        *,
        organization_members!inner(
          role,
          user_id
        )
      `)
      .eq('id', params.id)
      .eq('organization_members.user_id', user.id)
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found or access denied' },
        { status: 404 }
      );
    }

    // Get member count
    const { count: memberCount } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', params.id);

    return NextResponse.json({
      ...organization,
      userRole: organization.organization_members[0]?.role || 'viewer',
      memberCount: memberCount || 0
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/organizations/[id] - Update organization
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user's role in the organization
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', params.id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'You are not a member of this organization' },
        { status: 403 }
      );
    }

    // Only owners and admins can update organization settings
    if (member.role !== 'owner' && member.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to update this organization' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Basic fields
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.website !== undefined) updateData.website = body.website;
    if (body.industry !== undefined) updateData.industry = body.industry;
    if (body.organization_size !== undefined) updateData.organization_size = body.organization_size;
    if (body.logo_url !== undefined) updateData.logo_url = body.logo_url;

    // JSON fields for complex settings
    if (body.settings !== undefined) updateData.settings = body.settings;
    if (body.compliance_settings !== undefined) updateData.compliance_settings = body.compliance_settings;
    if (body.billing_settings !== undefined) updateData.billing_settings = body.billing_settings;

    // Update organization
    const { data: updatedOrg, error: updateError } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating organization:', updateError);
      return NextResponse.json(
        { error: 'Failed to update organization' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('organization_activity_log').insert({
      organization_id: params.id,
      user_id: user.id,
      action: 'settings_updated',
      details: {
        fields_updated: Object.keys(updateData),
        updated_by: user.email
      }
    });

    return NextResponse.json(updatedOrg);
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/[id] - Delete organization (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is the owner
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', params.id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member || member.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only the organization owner can delete the organization' },
        { status: 403 }
      );
    }

    // Soft delete: set deleted_at timestamp
    const { error: deleteError } = await supabase
      .from('organizations')
      .update({
        deleted_at: new Date().toISOString(),
        deletion_scheduled_for: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        is_active: false
      })
      .eq('id', params.id);

    if (deleteError) {
      console.error('Error deleting organization:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete organization' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('organization_activity_log').insert({
      organization_id: params.id,
      user_id: user.id,
      action: 'organization_deleted',
      details: {
        deleted_by: user.email,
        scheduled_permanent_deletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    });

    return NextResponse.json({ 
      message: 'Organization scheduled for deletion. It will be permanently deleted in 30 days.' 
    });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}