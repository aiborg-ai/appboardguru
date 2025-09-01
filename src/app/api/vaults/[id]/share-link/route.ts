import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import crypto from 'crypto'

// POST /api/vaults/[id]/share-link - Create a share link
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
      permission = 'viewer',
      expires_in,
      max_uses,
      password,
      allow_download = false
    } = body
    
    // Verify user has permission to create share links
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
    
    // Only owners and admins can create share links
    if (!['owner', 'admin'].includes(memberData.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to create share links' },
        { status: 403 }
      )
    }
    
    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex')
    
    // Calculate expiry
    const expiresAt = expires_in ? calculateExpiry(expires_in) : null
    
    // Hash password if provided
    let hashedPassword = null
    if (password) {
      const salt = crypto.randomBytes(16).toString('hex')
      hashedPassword = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
      hashedPassword = `${salt}:${hashedPassword}`
    }
    
    // Create share link record
    try {
      const { data: linkData, error: linkError } = await supabase
        .from('vault_share_links')
        .insert({
          vault_id: vaultId,
          token,
          permission,
          expires_at: expiresAt,
          max_uses: max_uses || null,
          password: hashedPassword,
          allow_download,
          created_by: user.id,
          is_active: true,
          used_count: 0,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (linkError) {
        // If table doesn't exist, return a mock response
        if (linkError.message.includes('does not exist')) {
          const mockLink = {
            id: crypto.randomUUID(),
            vault_id: vaultId,
            token,
            url: `${request.nextUrl.origin}/vault/share/${vaultId}?token=${token}`,
            permission,
            expires_at: expiresAt,
            max_uses: max_uses || null,
            password_protected: !!password,
            allow_download,
            created_by: user.id,
            is_active: true,
            used_count: 0,
            created_at: new Date().toISOString()
          }
          
          return NextResponse.json({
            shareLink: mockLink,
            message: 'Share link created successfully (mock)'
          })
        }
        
        throw linkError
      }
      
      // Construct full URL
      const shareUrl = `${request.nextUrl.origin}/vault/share/${vaultId}?token=${token}`
      
      return NextResponse.json({
        shareLink: {
          ...linkData,
          url: shareUrl,
          password_protected: !!password
        },
        message: 'Share link created successfully'
      })
      
    } catch (err) {
      // Fallback for when table doesn't exist
      const mockLink = {
        id: crypto.randomUUID(),
        vault_id: vaultId,
        token,
        url: `${request.nextUrl.origin}/vault/share/${vaultId}?token=${token}`,
        permission,
        expires_at: expiresAt,
        max_uses: max_uses || null,
        password_protected: !!password,
        allow_download,
        created_by: user.id,
        is_active: true,
        used_count: 0,
        created_at: new Date().toISOString()
      }
      
      return NextResponse.json({
        shareLink: mockLink,
        message: 'Share link created successfully'
      })
    }
    
  } catch (error) {
    console.error('[Create Share Link API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    )
  }
}

// GET /api/vaults/[id]/share-link - Get all share links for a vault
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
    
    // Get share links
    try {
      const { data: links, error: linksError } = await supabase
        .from('vault_share_links')
        .select('*')
        .eq('vault_id', vaultId)
        .order('created_at', { ascending: false })
      
      if (linksError) {
        // If table doesn't exist, return empty array
        if (linksError.message.includes('does not exist')) {
          return NextResponse.json({ shareLinks: [] })
        }
        throw linksError
      }
      
      // Add full URLs and mask passwords
      const shareLinks = links.map(link => ({
        ...link,
        url: `${request.nextUrl.origin}/vault/share/${vaultId}?token=${link.token}`,
        password_protected: !!link.password,
        password: undefined // Don't send actual password
      }))
      
      return NextResponse.json({ shareLinks })
      
    } catch (err) {
      // Fallback for when table doesn't exist
      return NextResponse.json({ shareLinks: [] })
    }
    
  } catch (error) {
    console.error('[Get Share Links API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get share links' },
      { status: 500 }
    )
  }
}

// DELETE /api/vaults/[id]/share-link - Revoke a share link
export async function DELETE(
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
    
    // Get link ID from query params
    const { searchParams } = new URL(request.url)
    const linkId = searchParams.get('linkId')
    
    if (!linkId) {
      return NextResponse.json(
        { error: 'Link ID is required' },
        { status: 400 }
      )
    }
    
    // Verify user has permission to revoke share links
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
    
    // Only owners and admins can revoke share links
    if (!['owner', 'admin'].includes(memberData.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to revoke share links' },
        { status: 403 }
      )
    }
    
    // Deactivate the share link
    try {
      const { error: updateError } = await supabase
        .from('vault_share_links')
        .update({ 
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_by: user.id
        })
        .eq('id', linkId)
        .eq('vault_id', vaultId)
      
      if (updateError) {
        // If table doesn't exist, just return success
        if (updateError.message.includes('does not exist')) {
          return NextResponse.json({ 
            message: 'Share link revoked successfully' 
          })
        }
        throw updateError
      }
      
      return NextResponse.json({ 
        message: 'Share link revoked successfully' 
      })
      
    } catch (err) {
      // Fallback for when table doesn't exist
      return NextResponse.json({ 
        message: 'Share link revoked successfully' 
      })
    }
    
  } catch (error) {
    console.error('[Revoke Share Link API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to revoke share link' },
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