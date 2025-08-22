import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { Database } from '@/types/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { assetId: string } }
) {
  try {
    const supabase = await createSupabaseServerClient() as any

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { assetId } = params

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

    // Get annotations for this asset  
    const { data: annotations, error: annotationsError } = await supabase
      .from('document_annotations')
      .select(`
        id,
        document_id,
        user_id,
        annotation_type,
        content,
        position_data,
        highlighted_text,
        page_number,
        created_at,
        updated_at
      `)
      .eq('document_id', assetId)
      .order('created_at', { ascending: false })

    if (annotationsError) {
      console.error('Error fetching annotations:', annotationsError)
      return NextResponse.json({ error: 'Failed to fetch annotations' }, { status: 500 })
    }

    // Transform to match the expected format
    const transformedAnnotations = annotations?.map((annotation: any) => ({
      id: annotation.id,
      type: annotation.annotation_type as 'comment' | 'question' | 'note' | 'voice',
      content: annotation.content,
      voiceUrl: undefined, // Not available in current schema
      sectionReference: {
        page: annotation.page_number || 1,
        coordinates: annotation.position_data ? (annotation.position_data as any) : undefined,
        text: annotation.highlighted_text || undefined
      },
      userId: annotation.user_id,
      userName: 'Unknown User', // Would need join with profiles table
      createdAt: annotation.created_at || new Date().toISOString(),
      updatedAt: annotation.updated_at || new Date().toISOString(),
      isShared: false, // Not available in current schema
      sharedWith: [], // Not available in current schema
      replies: [] // Would need separate table/query
    })) || []

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
    const supabase = await createSupabaseServerClient() as any

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { assetId } = params
    const body = await request.json()

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

    // Get user profile for display name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const userName = (profile as any)?.full_name || user.email?.split('@')[0] || 'Unknown User'

    // Create annotation insert data with proper optional properties
    const insertData: Database['public']['Tables']['document_annotations']['Insert'] = {
      document_id: assetId,
      user_id: user.id,
      annotation_type: body.type || 'comment',
      content: body.content,
      ...( body.sectionReference?.page ? { page_number: body.sectionReference.page } : {} ),
      ...( body.sectionReference?.coordinates ? { position_data: body.sectionReference.coordinates } : {} ),
      ...( body.sectionReference?.text ? { highlighted_text: body.sectionReference.text } : {} ),
    }

    // Create annotation
    const { data: newAnnotation, error: createError } = await supabase
      .from('document_annotations')
      .insert(insertData)
      .select()
      .single()

    if (createError) {
      console.error('Error creating annotation:', createError)
      return NextResponse.json({ error: 'Failed to create annotation' }, { status: 500 })
    }

    // Transform to match the expected format
    const transformedAnnotation = {
      id: (newAnnotation as any).id,
      type: (newAnnotation as any).annotation_type as 'comment' | 'question' | 'note' | 'voice',
      content: (newAnnotation as any).content,
      voiceUrl: undefined, // Not available in current schema
      sectionReference: {
        page: (newAnnotation as any).page_number || 1,
        coordinates: (newAnnotation as any).position_data ? ((newAnnotation as any).position_data as any) : undefined,
        text: (newAnnotation as any).highlighted_text || undefined
      },
      userId: (newAnnotation as any).user_id,
      userName: userName,
      createdAt: (newAnnotation as any).created_at || new Date().toISOString(),
      updatedAt: (newAnnotation as any).updated_at || new Date().toISOString(),
      isShared: false, // Not available in current schema
      sharedWith: [], // Not available in current schema
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