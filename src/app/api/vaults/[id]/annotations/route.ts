import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const vaultId = (await params).id
    const supabase = await createSupabaseServerClient()
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is a member of the vault
    const { data: vaultMember, error: memberError } = await supabase
      .from('vault_members')
      .select('id, role, status')
      .eq('vault_id', vaultId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (memberError || !vaultMember) {
      return NextResponse.json(
        { success: false, error: 'Access denied. You must be a vault member to view annotations.' },
        { status: 403 }
      )
    }

    // Get all assets in the vault
    const { data: vaultAssets, error: assetsError } = await supabase
      .from('vault_assets')
      .select(`
        asset_id,
        assets (
          id,
          file_name,
          file_type
        )
      `)
      .eq('vault_id', vaultId)

    if (assetsError) {
      console.error('Error fetching vault assets:', assetsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch vault assets' },
        { status: 500 }
      )
    }

    // Get asset IDs
    const assetIds = vaultAssets?.map(va => va.asset_id) || []

    if (assetIds.length === 0) {
      return NextResponse.json({
        success: true,
        annotations: [],
        metadata: {
          timestamp: new Date().toISOString(),
          vaultId,
          assetCount: 0,
          annotationCount: 0
        }
      })
    }

    // Fetch all annotations for these assets
    const { data: annotations, error: annotationsError } = await supabase
      .from('asset_annotations')
      .select(`
        id,
        asset_id,
        page_number,
        selected_text,
        comment_text,
        color,
        created_by,
        created_at,
        is_resolved,
        is_deleted,
        users!created_by (
          id,
          full_name,
          avatar_url
        ),
        annotation_replies (
          id
        )
      `)
      .in('asset_id', assetIds)
      .eq('vault_id', vaultId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (annotationsError) {
      console.error('Error fetching annotations:', annotationsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch annotations' },
        { status: 500 }
      )
    }

    // Create asset map for quick lookup
    const assetMap = new Map()
    vaultAssets?.forEach(va => {
      if (va.assets) {
        assetMap.set(va.asset_id, va.assets.file_name)
      }
    })

    // Transform annotations with asset names and reply counts
    const transformedAnnotations = annotations?.map(annotation => ({
      id: annotation.id,
      asset_id: annotation.asset_id,
      asset_name: assetMap.get(annotation.asset_id) || 'Unknown Asset',
      page_number: annotation.page_number,
      selected_text: annotation.selected_text,
      comment_text: annotation.comment_text,
      color: annotation.color,
      created_by: annotation.created_by,
      created_at: annotation.created_at,
      is_resolved: annotation.is_resolved,
      creator: {
        id: annotation.users?.id || annotation.created_by,
        full_name: annotation.users?.full_name || 'Unknown User',
        avatar_url: annotation.users?.avatar_url
      },
      replies_count: annotation.annotation_replies?.length || 0
    })) || []

    return NextResponse.json({
      success: true,
      annotations: transformedAnnotations,
      metadata: {
        timestamp: new Date().toISOString(),
        vaultId,
        assetCount: assetIds.length,
        annotationCount: transformedAnnotations.length
      }
    })

  } catch (error) {
    console.error('Error in GET /api/vaults/[id]/annotations:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}