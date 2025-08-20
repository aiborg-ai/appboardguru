import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema for vault creation
const createVaultSchema = z.object({
  // Organization data
  selectedOrganization: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
  }).nullable(),
  createNewOrganization: z.object({
    name: z.string().min(1, 'Organization name is required'),
    description: z.string().optional(),
    industry: z.string().min(1, 'Industry is required'),
    website: z.string().url().optional().or(z.literal('')),
  }).nullable(),

  // Assets
  selectedAssets: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    file_type: z.string(),
    file_size: z.number(),
    created_at: z.string(),
  })),

  // BoardMates
  selectedBoardMates: z.array(z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    full_name: z.string(),
    role: z.string(),
  })),
  newBoardMates: z.array(z.object({
    email: z.string().email(),
    full_name: z.string().min(1, 'Full name is required'),
    role: z.enum(['viewer', 'member', 'admin']),
  })),

  // Vault settings
  vaultName: z.string().min(1, 'Vault name is required'),
  vaultDescription: z.string().optional(),
  accessLevel: z.enum(['organization', 'restricted', 'private']),
  vaultType: z.enum(['board_pack', 'document_set', 'project', 'compliance']),
});

/**
 * POST /api/vaults/create
 * Create a new vault with comprehensive workflow
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate request body
    const validationResult = createVaultSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    let organizationId: string = '';
    let createdOrganization = null;

    // Begin transaction-like operations
    try {
      // Step 1: Handle organization creation/selection
      if (data.createNewOrganization) {
        // Create new organization
        const orgSlug = data.createNewOrganization.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        const { data: organization, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: data.createNewOrganization.name,
            slug: orgSlug,
            description: data.createNewOrganization.description,
            industry: data.createNewOrganization.industry,
            website: data.createNewOrganization.website || null,
            created_by: user.id,
            organization_size: 'startup', // Default size
            settings: {
              board_pack_auto_archive_days: 365,
              invitation_expires_hours: 72,
              max_members: 100,
              enable_audit_logs: true,
              require_2fa: false,
              allowed_file_types: ['pdf', 'docx', 'pptx', 'xlsx'],
            },
          })
          .select()
          .single();

        if (orgError) {
          throw new Error(`Failed to create organization: ${orgError.message}`);
        }

        organizationId = organization.id;
        createdOrganization = organization;

        // Add creator as organization owner
        await supabase
          .from('organization_members')
          .insert({
            organization_id: organizationId,
            user_id: user.id,
            role: 'owner',
            status: 'active',
            is_primary: true,
          });

      } else if (data.selectedOrganization) {
        organizationId = data.selectedOrganization.id;
        
        // Verify user has access to this organization
        const { data: membership, error: membershipError } = await supabase
          .from('organization_members')
          .select('role, status')
          .eq('organization_id', organizationId)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (membershipError || !membership) {
          return NextResponse.json(
            { error: 'You do not have access to this organization' },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Either select an organization or provide new organization data' },
          { status: 400 }
        );
      }

      // Step 2: Create the vault
      const { data: vault, error: vaultError } = await supabase
        .from('vaults')
        .insert({
          organization_id: organizationId,
          name: data.vaultName,
          description: data.vaultDescription || null,
          owner_id: user.id,
          vault_type: data.vaultType,
          access_level: data.accessLevel,
          settings: {
            auto_expire_days: data.accessLevel === 'private' ? 30 : 90,
            watermark_enabled: true,
            download_enabled: data.accessLevel !== 'restricted',
            annotation_enabled: true,
            collaboration_enabled: true,
          },
        })
        .select()
        .single();

      if (vaultError) {
        throw new Error(`Failed to create vault: ${vaultError.message}`);
      }

      // Step 3: Add assets to vault
      const assetUpdates = [];
      if (data.selectedAssets.length > 0) {
        for (const asset of data.selectedAssets) {
          assetUpdates.push(
            supabase
              .from('assets')
              .update({ 
                vault_id: vault.id,
                organization_id: organizationId,
              })
              .eq('id', asset.id)
              .eq('owner_id', user.id) // Security: only update user's own assets
          );
        }

        // Execute all asset updates
        const assetResults = await Promise.all(assetUpdates);
        const failedAssets = assetResults.filter(result => result.error);
        
        if (failedAssets.length > 0) {
          console.warn(`Failed to add ${failedAssets.length} assets to vault`);
        }
      }

      // Step 4: Handle BoardMates
      const boardMateErrors = [];
      
      // Add existing board mates to organization if needed
      for (const mate of data.selectedBoardMates) {
        // Check if user is already in the organization
        const { data: existingMembership } = await supabase
          .from('organization_members')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('user_id', mate.id)
          .single();

        if (!existingMembership) {
          // Add to organization
          const { error: memberError } = await supabase
            .from('organization_members')
            .insert({
              organization_id: organizationId,
              user_id: mate.id,
              role: 'member', // Default role for added members
              status: 'active',
              is_primary: false,
            });

          if (memberError) {
            boardMateErrors.push(`Failed to add ${mate.full_name} to organization`);
          }
        }
      }

      // Step 5: Send invitations to new board mates
      const invitationResults = [];
      for (const newMate of data.newBoardMates) {
        try {
          // Create user invitation
          const { data: invitation, error: inviteError } = await supabase
            .from('organization_invitations')
            .insert({
              organization_id: organizationId,
              email: newMate.email,
              full_name: newMate.full_name,
              role: newMate.role,
              invited_by: user.id,
              status: 'pending',
              expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72 hours
              invitation_data: {
                vault_id: vault.id,
                vault_name: vault.name,
                organization_name: createdOrganization?.name || data.selectedOrganization?.name,
              },
            })
            .select()
            .single();

          if (inviteError) {
            boardMateErrors.push(`Failed to create invitation for ${newMate.email}`);
          } else {
            invitationResults.push(invitation);
          }
        } catch (error) {
          boardMateErrors.push(`Failed to process invitation for ${newMate.email}`);
        }
      }

      // Step 6: Send notification emails (background task)
      if (invitationResults.length > 0) {
        // This would typically be handled by a background job
        // For now, we'll just log the invitations that need to be sent
        console.log(`${invitationResults.length} invitation emails need to be sent`);
      }

      // Step 7: Log audit events
      const auditEvents = [
        {
          organization_id: organizationId,
          user_id: user.id,
          event_type: 'user_action',
          event_category: 'vaults',
          action: 'create_vault',
          resource_type: 'vault',
          resource_id: vault.id,
          event_description: `Created vault "${vault.name}"`,
          outcome: 'success',
          details: {
            vault_type: vault.vault_type,
            access_level: vault.access_level,
            assets_count: data.selectedAssets.length,
            boardmates_count: data.selectedBoardMates.length,
            invitations_count: data.newBoardMates.length,
            created_organization: !!createdOrganization,
          },
        }
      ];

      if (createdOrganization) {
        auditEvents.push({
          organization_id: organizationId,
          user_id: user.id,
          event_type: 'user_action',
          event_category: 'organizations',
          action: 'create_organization',
          resource_type: 'organization',
          resource_id: organizationId,
          event_description: `Created organization "${createdOrganization.name}"`,
          outcome: 'success',
          details: {
            name: createdOrganization.name,
            slug: createdOrganization.slug,
            website: createdOrganization.website,
          } as any,
        });
      }

      await supabase
        .from('audit_logs')
        .insert(auditEvents);

      // Return success response
      return NextResponse.json({
        vault,
        organization: createdOrganization,
        assets_added: data.selectedAssets.length,
        boardmates_added: data.selectedBoardMates.length,
        invitations_sent: invitationResults.length,
        warnings: boardMateErrors.length > 0 ? boardMateErrors : undefined,
      }, { status: 201 });

    } catch (error) {
      console.error('Vault creation failed:', error);
      
      // Log failure audit event
      if (organizationId) {
        await supabase
          .from('audit_logs')
          .insert({
            organization_id: organizationId,
            user_id: user.id,
            event_type: 'user_action',
            event_category: 'vaults',
            action: 'create_vault',
            resource_type: 'vault',
            resource_id: null,
            event_description: `Failed to create vault "${data.vaultName}"`,
            outcome: 'failure',
            details: {
              error: error instanceof Error ? error.message : 'Unknown error',
              vault_name: data.vaultName,
            },
          });
      }

      return NextResponse.json(
        { error: 'Failed to create vault. Please try again.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in POST /api/vaults/create:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}