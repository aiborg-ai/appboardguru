import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface AssociationUpdate {
  type: 'board' | 'committee' | 'vault';
  id: string;
  action: 'add' | 'remove' | 'update_role';
  role?: string;
  current_role?: string;
}

/**
 * GET /api/boardmates/[id]/associations
 * Get a boardmate's current associations
 */
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

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const boardmateId = params.id;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Verify user has access to this organization
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json({ error: 'Access denied to organization' }, { status: 403 });
    }

    // Get boardmate's current associations using the view
    const { data: boardmate, error: boardmateError } = await supabaseAdmin
      .from('boardmate_profiles')
      .select('*')
      .eq('id', boardmateId)
      .eq('organization_id', organizationId)
      .single();

    if (boardmateError || !boardmate) {
      return NextResponse.json({ error: 'BoardMate not found' }, { status: 404 });
    }

    return NextResponse.json({
      boardmate: {
        id: boardmate.id,
        full_name: boardmate.full_name,
        email: boardmate.email,
        avatar_url: boardmate.avatar_url,
        board_memberships: Array.isArray(boardmate.board_memberships) ? boardmate.board_memberships : [],
        committee_memberships: Array.isArray(boardmate.committee_memberships) ? boardmate.committee_memberships : [],
        vault_memberships: Array.isArray(boardmate.vault_memberships) ? boardmate.vault_memberships : []
      }
    });

  } catch (error) {
    console.error('Error in GET /api/boardmates/[id]/associations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/boardmates/[id]/associations
 * Update a boardmate's associations
 */
export async function PUT(
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

    const body = await request.json();
    const { organization_id, updates }: { organization_id: string; updates: AssociationUpdate[] } = body;
    const boardmateId = params.id;

    if (!organization_id || !Array.isArray(updates)) {
      return NextResponse.json({
        error: 'Organization ID and updates array are required'
      }, { status: 400 });
    }

    // Verify user has admin access to this organization
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['owner', 'admin'])
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json({
        error: 'Access denied - admin role required'
      }, { status: 403 });
    }

    // Verify boardmate exists in this organization
    const { data: boardmateCheck } = await supabaseAdmin
      .from('organization_members')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('user_id', boardmateId)
      .single();

    if (!boardmateCheck) {
      return NextResponse.json({ error: 'BoardMate not found in organization' }, { status: 404 });
    }

    const results = [];
    const errors = [];

    // Process each update
    for (const update of updates) {
      try {
        switch (update.type) {
          case 'board':
            const boardResult = await handleBoardAssociation(boardmateId, organization_id, update, user.id);
            results.push({ type: 'board', id: update.id, ...boardResult });
            break;

          case 'committee':
            const committeeResult = await handleCommitteeAssociation(boardmateId, organization_id, update, user.id);
            results.push({ type: 'committee', id: update.id, ...committeeResult });
            break;

          case 'vault':
            const vaultResult = await handleVaultAssociation(boardmateId, organization_id, update, user.id);
            results.push({ type: 'vault', id: update.id, ...vaultResult });
            break;

          default:
            errors.push({ update, error: 'Invalid association type' });
        }
      } catch (error) {
        console.error(`Error processing ${update.type} update:`, error);
        errors.push({ update, error: 'Failed to process update' });
      }
    }

    return NextResponse.json({
      message: 'Association updates processed',
      results,
      errors,
      success_count: results.length,
      error_count: errors.length
    });

  } catch (error) {
    console.error('Error in PUT /api/boardmates/[id]/associations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions for handling different types of associations

async function handleBoardAssociation(
  userId: string,
  organizationId: string,
  update: AssociationUpdate,
  createdBy: string
) {
  switch (update.action) {
    case 'add':
      const { error: addError } = await supabaseAdmin
        .from('board_members')
        .insert({
          board_id: update.id,
          user_id: userId,
          organization_id: organizationId,
          role: update.role || 'board_member',
          status: 'active',
          appointed_date: new Date().toISOString().split('T')[0],
          created_by: createdBy,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (addError) throw addError;
      return { action: 'added', role: update.role };

    case 'remove':
      const { error: removeError } = await supabaseAdmin
        .from('board_members')
        .update({
          status: 'terminated',
          termination_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('board_id', update.id)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (removeError) throw removeError;
      return { action: 'removed' };

    case 'update_role':
      const { error: updateError } = await supabaseAdmin
        .from('board_members')
        .update({
          role: update.role,
          updated_at: new Date().toISOString()
        })
        .eq('board_id', update.id)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (updateError) throw updateError;
      return { action: 'role_updated', from_role: update.current_role, to_role: update.role };

    default:
      throw new Error('Invalid board action');
  }
}

async function handleCommitteeAssociation(
  userId: string,
  organizationId: string,
  update: AssociationUpdate,
  createdBy: string
) {
  // First get the board_id for the committee
  const { data: committee } = await supabaseAdmin
    .from('committees')
    .select('board_id')
    .eq('id', update.id)
    .single();

  if (!committee) {
    throw new Error('Committee not found');
  }

  switch (update.action) {
    case 'add':
      const { error: addError } = await supabaseAdmin
        .from('committee_members')
        .insert({
          committee_id: update.id,
          user_id: userId,
          board_id: committee.board_id,
          organization_id: organizationId,
          role: update.role || 'member',
          status: 'active',
          appointed_date: new Date().toISOString().split('T')[0],
          created_by: createdBy,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (addError) throw addError;
      return { action: 'added', role: update.role };

    case 'remove':
      const { error: removeError } = await supabaseAdmin
        .from('committee_members')
        .update({
          status: 'terminated',
          termination_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('committee_id', update.id)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (removeError) throw removeError;
      return { action: 'removed' };

    case 'update_role':
      const { error: updateError } = await supabaseAdmin
        .from('committee_members')
        .update({
          role: update.role,
          updated_at: new Date().toISOString()
        })
        .eq('committee_id', update.id)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (updateError) throw updateError;
      return { action: 'role_updated', from_role: update.current_role, to_role: update.role };

    default:
      throw new Error('Invalid committee action');
  }
}

async function handleVaultAssociation(
  userId: string,
  organizationId: string,
  update: AssociationUpdate,
  createdBy: string
) {
  switch (update.action) {
    case 'add':
      const { error: addError } = await supabaseAdmin
        .from('vault_members')
        .insert({
          vault_id: update.id,
          user_id: userId,
          organization_id: organizationId,
          role: update.role || 'contributor',
          status: 'active',
          joined_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (addError) throw addError;
      return { action: 'added', role: update.role };

    case 'remove':
      const { error: removeError } = await supabaseAdmin
        .from('vault_members')
        .update({
          status: 'left',
          left_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('vault_id', update.id)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (removeError) throw removeError;
      return { action: 'removed' };

    case 'update_role':
      const { error: updateError } = await supabaseAdmin
        .from('vault_members')
        .update({
          role: update.role,
          updated_at: new Date().toISOString()
        })
        .eq('vault_id', update.id)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (updateError) throw updateError;
      return { action: 'role_updated', from_role: update.current_role, to_role: update.role };

    default:
      throw new Error('Invalid vault action');
  }
}