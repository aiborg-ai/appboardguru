import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'

// POST /api/vaults/[id]/share - Share vault with users
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const vaultId = params.id
  
  try {
    const supabase = createSupabaseBrowserClient()
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get request body
    const body = await request.json()
    const { 
      user_ids,
      emails,
      permission = 'viewer',
      message,
      expires_in,
      require_auth = true
    } = body
    
    // Verify user has permission to share this vault
    const { data: memberData, error: memberError } = await supabase
      .from('vault_members')
      .select('role')
      .eq('vault_id', vaultId)
      .eq('user_id', user.id)
      .single()
    
    if (memberError || !memberData) {
      return NextResponse.json(
        { error: 'You do not have access to this vault' },
        { status: 403 }
      )
    }
    
    // Only owners and admins can share
    if (!['owner', 'admin'].includes(memberData.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to share this vault' },
        { status: 403 }
      )
    }
    
    const results = {
      success: [],
      failed: []
    }
    
    // Share with registered users (by user IDs)
    if (user_ids && user_ids.length > 0) {
      for (const userId of user_ids) {
        try {
          // Check if user is already a member
          const { data: existingMember } = await supabase
            .from('vault_members')
            .select('id')
            .eq('vault_id', vaultId)
            .eq('user_id', userId)
            .single()
          
          if (existingMember) {
            // Update existing member's role
            const { error: updateError } = await supabase
              .from('vault_members')
              .update({
                role: permission,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingMember.id)
            
            if (updateError) {
              results.failed.push({ userId, error: updateError.message })
            } else {
              results.success.push({ userId, action: 'updated' })
            }
          } else {
            // Add new member
            const { error: insertError } = await supabase
              .from('vault_members')
              .insert({
                vault_id: vaultId,
                user_id: userId,
                role: permission,
                status: 'active',
                invited_by: user.id,
                invited_at: new Date().toISOString()
              })
            
            if (insertError) {
              results.failed.push({ userId, error: insertError.message })
            } else {
              results.success.push({ userId, action: 'added' })
            }
          }
        } catch (err) {
          results.failed.push({ 
            userId, 
            error: err instanceof Error ? err.message : 'Unknown error' 
          })
        }
      }
    }
    
    // Share with external users (by email)
    if (emails && emails.length > 0) {
      for (const email of emails) {
        try {
          // Create invitation record
          const { error: inviteError } = await supabase
            .from('vault_invitations')
            .insert({
              vault_id: vaultId,
              email,
              role: permission,
              message,
              expires_at: expires_in ? calculateExpiry(expires_in) : null,
              invited_by: user.id,
              require_auth,
              status: 'pending',
              created_at: new Date().toISOString()
            })
          
          if (inviteError) {
            // If table doesn't exist, create a simple record in vault_members with pending status
            if (inviteError.message.includes('does not exist')) {
              const { error: fallbackError } = await supabase
                .from('vault_members')
                .insert({
                  vault_id: vaultId,
                  user_id: user.id, // Temporary, will be updated when user accepts
                  role: permission,
                  status: 'invited',
                  metadata: {
                    invited_email: email,
                    message,
                    expires_at: expires_in ? calculateExpiry(expires_in) : null,
                    require_auth
                  }
                })
              
              if (fallbackError) {
                results.failed.push({ email, error: fallbackError.message })
              } else {
                results.success.push({ email, action: 'invited' })
                // TODO: Send invitation email
              }
            } else {
              results.failed.push({ email, error: inviteError.message })
            }
          } else {
            results.success.push({ email, action: 'invited' })
            // TODO: Send invitation email
          }
        } catch (err) {
          results.failed.push({ 
            email, 
            error: err instanceof Error ? err.message : 'Unknown error' 
          })
        }
      }
    }
    
    // Log activity
    try {
      await supabase
        .from('activity_logs')
        .insert({
          organization_id: vaultId,
          performed_by: user.id,
          action: 'vault_shared',
          resource_type: 'vault',
          resource_id: vaultId,
          metadata: {
            shared_with: [...(user_ids || []), ...(emails || [])],
            permission,
            results
          }
        })
    } catch (activityError) {
      console.error('Failed to log activity:', activityError)
    }
    
    return NextResponse.json({
      message: 'Vault shared successfully',
      results
    })
    
  } catch (error) {
    console.error('[Share Vault API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to share vault' },
      { status: 500 }
    )
  }
}

// GET /api/vaults/[id]/share - Get share settings and current shares
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const vaultId = params.id
  
  try {
    const supabase = createSupabaseBrowserClient()
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify user has access to this vault
    const { data: memberData, error: memberError } = await supabase
      .from('vault_members')
      .select('role')
      .eq('vault_id', vaultId)
      .eq('user_id', user.id)
      .single()
    
    if (memberError || !memberData) {
      return NextResponse.json(
        { error: 'You do not have access to this vault' },
        { status: 403 }
      )
    }
    
    // Get current members
    const { data: members, error: membersError } = await supabase
      .from('vault_members')
      .select(`
        id,
        role,
        status,
        joined_at,
        invited_at,
        last_accessed_at,
        user_id
      `)
      .eq('vault_id', vaultId)
    
    if (membersError) {
      console.error('Error fetching members:', membersError)
    }
    
    // Get pending invitations
    let invitations = []
    try {
      const { data: inviteData, error: inviteError } = await supabase
        .from('vault_invitations')
        .select('*')
        .eq('vault_id', vaultId)
        .eq('status', 'pending')
      
      if (!inviteError && inviteData) {
        invitations = inviteData
      }
    } catch (err) {
      // Table might not exist, ignore error
      console.log('Invitations table not found')
    }
    
    // Get share links
    let shareLinks = []
    try {
      const { data: linkData, error: linkError } = await supabase
        .from('vault_share_links')
        .select('*')
        .eq('vault_id', vaultId)
        .eq('is_active', true)
      
      if (!linkError && linkData) {
        shareLinks = linkData
      }
    } catch (err) {
      // Table might not exist, ignore error
      console.log('Share links table not found')
    }
    
    return NextResponse.json({
      members: members || [],
      invitations,
      shareLinks
    })
    
  } catch (error) {
    console.error('[Get Share Info API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get share information' },
      { status: 500 }
    )
  }
}

// Helper function to calculate expiry date
function calculateExpiry(period: string): string {
  const now = new Date()
  
  switch (period) {
    case '1h':
      now.setHours(now.getHours() + 1)
      break
    case '24h':
      now.setHours(now.getHours() + 24)
      break
    case '7d':
      now.setDate(now.getDate() + 7)
      break
    case '30d':
      now.setDate(now.getDate() + 30)
      break
    case '90d':
      now.setDate(now.getDate() + 90)
      break
    case '1y':
      now.setFullYear(now.getFullYear() + 1)
      break
    default:
      // Default to 30 days
      now.setDate(now.getDate() + 30)
  }
  
  return now.toISOString()
}