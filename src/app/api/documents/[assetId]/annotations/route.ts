import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { assetId: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { assetId } = params

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

    // Get annotations for this asset
    const { data: annotations, error: annotationsError } = await (supabase as any)
      .from('document_annotations')
      .select(`
        *,
        replies:document_annotation_replies(*)
      `)
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false })

    if (annotationsError) {
      console.error('Error fetching annotations:', annotationsError)
      return NextResponse.json({ error: 'Failed to fetch annotations' }, { status: 500 })
    }

    // Transform to match the expected format
    const transformedAnnotations = (annotations as any[])?.map((annotation: any) => ({
      id: annotation.id,
      type: annotation.type,
      content: annotation.content,
      voiceUrl: annotation.voice_url,
      sectionReference: {
        page: annotation.page,
        coordinates: annotation.coordinates,
        text: annotation.reference_text
      },
      userId: annotation.user_id,
      userName: annotation.user_name,
      createdAt: annotation.created_at,
      updatedAt: annotation.updated_at,
      isShared: annotation.is_shared,
      sharedWith: annotation.shared_with || [],
      replies: (annotation.replies as any[])?.map((reply: any) => ({
        id: reply.id,
        type: 'comment',
        content: reply.content,
        sectionReference: {
          page: annotation.page,
          coordinates: annotation.coordinates,
          text: annotation.reference_text
        },
        userId: reply.user_id,
        userName: reply.user_name,
        createdAt: reply.created_at,
        updatedAt: reply.updated_at,
        isShared: false,
        sharedWith: []
      })) || []
    }))

    return NextResponse.json(transformedAnnotations)

  } catch (error) {
    console.error('Error fetching annotations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch annotations' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { assetId: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { assetId } = params
    const body = await request.json()

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

    // Get user profile for display name
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const userName = profile?.full_name || user.email?.split('@')[0] || 'Unknown User'

    // Create annotation
    const { data: newAnnotation, error: createError } = await (supabase as any)
      .from('document_annotations')
      .insert({
        asset_id: assetId,
        user_id: user.id,
        user_name: userName,
        type: body.type,
        content: body.content,
        voice_url: body.voiceUrl,
        page: body.sectionReference?.page,
        coordinates: body.sectionReference?.coordinates,
        reference_text: body.sectionReference?.text,
        is_shared: body.isShared || false,
        shared_with: body.sharedWith || []
      } as any)
      .select()
      .single()

    if (createError) {
      console.error('Error creating annotation:', createError)
      return NextResponse.json({ error: 'Failed to create annotation' }, { status: 500 })
    }

    // Transform to match the expected format
    const transformedAnnotation = {
      id: (newAnnotation as any)?.id,
      type: (newAnnotation as any)?.type,
      content: (newAnnotation as any)?.content,
      voiceUrl: (newAnnotation as any)?.voice_url,
      sectionReference: {
        page: (newAnnotation as any)?.page,
        coordinates: (newAnnotation as any)?.coordinates,
        text: (newAnnotation as any)?.reference_text
      },
      userId: (newAnnotation as any)?.user_id,
      userName: (newAnnotation as any)?.user_name,
      createdAt: (newAnnotation as any)?.created_at,
      updatedAt: (newAnnotation as any)?.updated_at,
      isShared: (newAnnotation as any)?.is_shared,
      sharedWith: (newAnnotation as any)?.shared_with || [],
      replies: []
    }

    return NextResponse.json(transformedAnnotation, { status: 201 })

  } catch (error) {
    console.error('Error creating annotation:', error)
    return NextResponse.json(
      { error: 'Failed to create annotation' },
      { status: 500 }
    )
  }
}