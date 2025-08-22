import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { Database } from '@/types/database'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { assetId: string; id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient() as any

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { assetId, id } = params
    const updates = await request.json()

    // Verify user has access to this asset
    const { data: asset, error: assetError } = await supabase
      .from('vault_assets')
      .select('*, vaults!inner(created_by)')
      .eq('asset_id', assetId)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    if ((asset as any)?.vaults?.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify annotation exists and belongs to user
    const { data: annotation, error: annotationError } = await supabase
      .from('document_annotations')
      .select('*')
      .eq('id', id)
      .eq('document_id', assetId)
      .eq('user_id', user.id)
      .single()

    if (annotationError || !annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 })
    }

    // Prepare update data with proper optional properties
    const updateData: Database['public']['Tables']['document_annotations']['Update'] = {
      updated_at: new Date().toISOString(),
      ...(updates.content !== undefined ? { content: updates.content } : {}),
      ...(updates.type !== undefined ? { annotation_type: updates.type } : {}),
      ...(updates.sectionReference?.page !== undefined ? { page_number: updates.sectionReference.page } : {}),
      ...(updates.sectionReference?.coordinates !== undefined ? { position_data: updates.sectionReference.coordinates } : {}),
      ...(updates.sectionReference?.text !== undefined ? { highlighted_text: updates.sectionReference.text } : {}),
    }

    // Update annotation
    const { data: updatedAnnotation, error: updateError } = await supabase
      .from('document_annotations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating annotation:', updateError)
      return NextResponse.json({ error: 'Failed to update annotation' }, { status: 500 })
    }

    // Transform to match the expected format
    const transformedAnnotation = {
      id: (updatedAnnotation as any).id,
      type: (updatedAnnotation as any).annotation_type as 'comment' | 'question' | 'note' | 'voice',
      content: (updatedAnnotation as any).content,
      voiceUrl: undefined, // Not available in current schema
      sectionReference: {
        page: (updatedAnnotation as any).page_number || 1,
        coordinates: (updatedAnnotation as any).position_data ? ((updatedAnnotation as any).position_data as any) : undefined,
        text: (updatedAnnotation as any).highlighted_text || undefined
      },
      userId: (updatedAnnotation as any).user_id,
      userName: 'Unknown User', // Would need join with profiles table
      createdAt: (updatedAnnotation as any).created_at || new Date().toISOString(),
      updatedAt: (updatedAnnotation as any).updated_at || new Date().toISOString(),
      isShared: false, // Not available in current schema
      sharedWith: [] // Not available in current schema
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
    const supabase = await createSupabaseServerClient() as any

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { assetId, id } = params

    // Verify user has access to this asset
    const { data: asset, error: assetError } = await supabase
      .from('vault_assets')
      .select('*, vaults!inner(created_by)')
      .eq('asset_id', assetId)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    if ((asset as any)?.vaults?.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify annotation exists and belongs to user
    const { data: annotation, error: annotationError } = await supabase
      .from('document_annotations')
      .select('*')
      .eq('id', id)
      .eq('document_id', assetId)
      .eq('user_id', user.id)
      .single()

    if (annotationError || !annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 })
    }

    // Note: No annotation replies table exists in current schema
    // Delete annotation directly
    const { error: deleteError } = await supabase
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