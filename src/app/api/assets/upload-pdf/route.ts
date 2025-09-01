/**
 * API endpoint for uploading and storing PDF reports as assets
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { Database } from '@/types/database'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // Get the PDF data and metadata from the request
    const formData = await request.formData()
    const pdfBlob = formData.get('pdf') as Blob
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string || 'reports'
    const organizationId = formData.get('organizationId') as string

    if (!pdfBlob || !title) {
      return NextResponse.json(
        { success: false, error: 'PDF file and title are required' },
        { status: 400 }
      )
    }

    // Create Supabase client with proper cookie handling
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Convert Blob to ArrayBuffer then to Buffer
    const arrayBuffer = await pdfBlob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Generate unique file name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `annual-report-${timestamp}.pdf`
    const filePath = `reports/${user.id}/${fileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assets')
      .upload(filePath, buffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: 'Failed to upload PDF to storage' },
        { status: 500 }
      )
    }

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('assets')
      .getPublicUrl(filePath)

    // Create asset record in database
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .insert({
        title,
        description,
        category,
        file_name: fileName,
        original_file_name: title + '.pdf',
        file_path: filePath,
        file_size: buffer.length,
        file_type: 'pdf',
        mime_type: 'application/pdf',
        owner_id: user.id,
        storage_bucket: 'assets',
        preview_url: publicUrl,
        visibility: 'private',
        is_processed: true,
        processing_status: 'completed',
        tags: ['annual-report', 'ai-generated', new Date().getFullYear().toString()]
      })
      .select()
      .single()

    if (assetError) {
      console.error('Asset creation error:', assetError)
      // Try to clean up the uploaded file
      await supabase.storage.from('assets').remove([filePath])
      return NextResponse.json(
        { success: false, error: 'Failed to create asset record' },
        { status: 500 }
      )
    }

    // If organization ID is provided, link the asset to the organization
    if (organizationId && asset) {
      const { error: linkError } = await supabase
        .from('vault_assets')
        .insert({
          asset_id: asset.id,
          organization_id: organizationId,
          vault_id: organizationId, // Using org ID as vault ID for now
          added_by_user_id: user.id,
          visibility: 'organization',
          is_featured: true,
          folder_path: '/reports/annual'
        })

      if (linkError) {
        console.error('Warning: Failed to link asset to organization:', linkError)
        // Don't fail the whole operation, just log the warning
      }
    }

    // Log the activity
    if (asset) {
      await supabase.rpc('log_asset_activity', {
        p_asset_id: asset.id,
        p_user_id: user.id,
        p_activity_type: 'created',
        p_details: {
          source: 'annual-report-ai',
          title,
          description
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        asset,
        publicUrl
      },
      message: 'PDF report successfully saved to assets'
    })

  } catch (error) {
    console.error('Error uploading PDF asset:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to upload PDF asset' 
      },
      { status: 500 }
    )
  }
}