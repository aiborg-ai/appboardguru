import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: assetId } = await params

    // Get asset with sharing information
    const { data: asset, error: fetchError } = await (supabase as any)
      .from('assets')
      .select(`
        *,
        asset_shares(
          shared_with_user_id,
          permission_level,
          is_active,
          expires_at,
          download_count
        )
      `)
      .eq('id', assetId)
      .eq('is_deleted', false)
      .single()

    if (fetchError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Check if user has download access
    const isOwner = asset.owner_id === user.id
    const userShare = asset.asset_shares?.find((share: any) => 
      share.shared_with_user_id === user.id && 
      share.is_active &&
      (!share.expires_at || new Date(share.expires_at) > new Date())
    )

    const hasDownloadAccess = isOwner || (
      userShare && ['download', 'edit', 'admin'].includes(userShare.permission_level)
    )

    if (!hasDownloadAccess) {
      return NextResponse.json({ 
        error: 'You do not have download permission for this asset' 
      }, { status: 403 })
    }

    // Get the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(asset.storage_bucket || 'assets')
      .download(asset.file_path)

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError)
      return NextResponse.json({ 
        error: 'Failed to download file' 
      }, { status: 500 })
    }

    // Update download count for the asset
    await (supabase as any)
      .from('assets')
      .update({ download_count: (asset.download_count || 0) + 1 })
      .eq('id', assetId)

    // Update download count for the specific share (if applicable)
    if (userShare) {
      await (supabase as any)
        .from('asset_shares')
        .update({ 
          download_count: (userShare.download_count || 0) + 1,
          accessed_at: new Date().toISOString()
        })
        .eq('asset_id', assetId)
        .eq('shared_with_user_id', user.id)
    }

    // Log activity using comprehensive logging system
    const { logAssetActivity, getRequestContext } = await import('@/lib/services/activity-logger')
    const requestContext = getRequestContext(request)
    
    await logAssetActivity(
      user.id,
      asset.organization_id || '',
      'downloaded',
      assetId,
      asset.title,
      {
        ...requestContext,
        file_name: asset.file_name,
        file_size: asset.file_size,
        file_type: asset.file_type,
        download_count: asset.download_count + 1,
        is_shared_access: !isOwner
      }
    )

    // Convert blob to buffer
    const buffer = await fileData.arrayBuffer()

    // Set response headers for file download
    const headers = new Headers()
    headers.set('Content-Type', asset.mime_type || 'application/octet-stream')
    headers.set('Content-Length', buffer.byteLength.toString())
    headers.set('Content-Disposition', `attachment; filename="${asset.original_file_name || asset.file_name}"`)
    headers.set('Cache-Control', 'private, no-cache')

    // Optional: Add watermark headers for tracking
    headers.set('X-Asset-Id', assetId)
    headers.set('X-Download-Time', new Date().toISOString())
    headers.set('X-Downloaded-By', user.id)

    return new Response(buffer, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('Asset download error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: assetId } = await params
    const body = await request.json()
    const { generateWatermark = false, watermarkText } = body

    // Get asset information
    const { data: asset, error: fetchError } = await (supabase as any)
      .from('assets')
      .select(`
        *,
        asset_shares(
          shared_with_user_id,
          permission_level,
          is_active,
          expires_at
        )
      `)
      .eq('id', assetId)
      .eq('is_deleted', false)
      .single()

    if (fetchError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Check download permissions
    const isOwner = asset.owner_id === user.id
    const hasDownloadAccess = isOwner || asset.asset_shares?.some((share: any) => 
      share.shared_with_user_id === user.id && 
      share.is_active &&
      ['download', 'edit', 'admin'].includes(share.permission_level) &&
      (!share.expires_at || new Date(share.expires_at) > new Date())
    )

    if (!hasDownloadAccess) {
      return NextResponse.json({ 
        error: 'You do not have download permission for this asset' 
      }, { status: 403 })
    }

    // Generate secure download URL
    const downloadToken = `${assetId}_${user.id}_${Date.now()}`
    const downloadUrl = `/api/assets/${assetId}/download?token=${downloadToken}`

    // In a real implementation, you might:
    // 1. Store the token temporarily in Redis with expiration
    // 2. Generate a signed URL for direct storage access
    // 3. Apply watermarking if requested

    if (generateWatermark) {
      // Placeholder for watermark generation
      console.log('Watermark would be applied with text:', watermarkText || `Downloaded by ${user.email} on ${new Date().toISOString()}`)
    }

    return NextResponse.json({ 
      downloadUrl,
      expires: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
      asset: {
        id: asset.id,
        title: asset.title,
        fileName: asset.file_name,
        fileSize: asset.file_size,
        fileType: asset.file_type
      }
    })

  } catch (error) {
    console.error('Generate download URL error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}