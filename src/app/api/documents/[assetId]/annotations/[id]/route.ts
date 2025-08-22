import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { assetId: string; id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { assetId, id } = params
    const updates = await request.json()

    // Verify user has access to this asset
    const { data: asset, error: assetError } = await (supabase as any)
      .from('vault_assets')
      .select('*, vaults!inner(user_id)')
      .eq('id', assetId)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    if ((asset as any)?.vaults?.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify annotation exists and belongs to user
    const { data: annotation, error: annotationError } = await (supabase as any)
      .from('document_annotations')
      .select('*')
      .eq('id', id)
      .eq('asset_id', assetId)
      .eq('user_id', user.id)
      .single()

    if (annotationError || !annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (updates.content !== undefined) updateData.content = updates.content
    if (updates.type !== undefined) updateData.type = updates.type
    if (updates.voiceUrl !== undefined) updateData.voice_url = updates.voiceUrl
    if (updates.isShared !== undefined) updateData.is_shared = updates.isShared
    if (updates.sharedWith !== undefined) updateData.shared_with = updates.sharedWith

    // Update annotation
    const { data: updatedAnnotation, error: updateError } = await (supabase as any)
      .from('document_annotations')
      .update(updateData as any)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating annotation:', updateError)
      return NextResponse.json({ error: 'Failed to update annotation' }, { status: 500 })
    }

    // Transform to match the expected format
    const transformedAnnotation = {
      id: (updatedAnnotation as any)?.id,
      type: (updatedAnnotation as any)?.type,
      content: (updatedAnnotation as any)?.content,
      voiceUrl: (updatedAnnotation as any)?.voice_url,
      sectionReference: {
        page: (updatedAnnotation as any)?.page,
        coordinates: (updatedAnnotation as any)?.coordinates,
        text: (updatedAnnotation as any)?.reference_text
      },
      userId: (updatedAnnotation as any)?.user_id,
      userName: (updatedAnnotation as any)?.user_name,
      createdAt: (updatedAnnotation as any)?.created_at,
      updatedAt: (updatedAnnotation as any)?.updated_at,
      isShared: (updatedAnnotation as any)?.is_shared,
      sharedWith: (updatedAnnotation as any)?.shared_with || []
    }

    return NextResponse.json(transformedAnnotation)

  } catch (error) {
    console.error('Error updating annotation:', error)
    return NextResponse.json(
      { error: 'Failed to update annotation' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { assetId: string; id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { assetId, id } = params

    // Verify user has access to this asset
    const { data: asset, error: assetError } = await (supabase as any)
      .from('vault_assets')
      .select('*, vaults!inner(user_id)')
      .eq('id', assetId)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    if ((asset as any)?.vaults?.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify annotation exists and belongs to user
    const { data: annotation, error: annotationError } = await (supabase as any)
      .from('document_annotations')
      .select('*')
      .eq('id', id)
      .eq('asset_id', assetId)
      .eq('user_id', user.id)
      .single()

    if (annotationError || !annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 })
    }

    // Delete annotation replies first (foreign key constraint)
    const { error: repliesDeleteError } = await (supabase as any)
      .from('document_annotation_replies')
      .delete()
      .eq('annotation_id', id)

    if (repliesDeleteError) {
      console.error('Error deleting annotation replies:', repliesDeleteError)
    }

    // Delete annotation
    const { error: deleteError } = await (supabase as any)
      .from('document_annotations')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting annotation:', deleteError)
      return NextResponse.json({ error: 'Failed to delete annotation' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error) {
    console.error('Error deleting annotation:', error)
    return NextResponse.json(
      { error: 'Failed to delete annotation' },
      { status: 500 }
    )
  }
}