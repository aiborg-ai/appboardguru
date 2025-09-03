import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Simple upload endpoint that bypasses complex logic
export async function POST(request: NextRequest) {
  try {
    console.log('Simple upload endpoint called')
    
    // Create service client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey) {
      console.error('Missing environment variables:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!serviceKey
      })
      return NextResponse.json({ 
        error: 'Server configuration error - missing environment variables',
        details: 'SUPABASE_SERVICE_ROLE_KEY must be set in Vercel environment variables'
      }, { status: 500 })
    }
    
    // Create service client for storage operations
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
    
    // Get user from auth header or session
    const authHeader = request.headers.get('authorization')
    let userId = null
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user } } = await supabase.auth.getUser(token)
      userId = user?.id
    }
    
    if (!userId) {
      // Try to get from cookie-based session
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id
    }
    
    // For testing, allow uploads without authentication
    if (!userId) {
      console.log('No authenticated user, using test mode')
      userId = 'test-user-' + Date.now()
    }
    
    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string || 'Untitled'
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    // Generate simple file path
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const fileExt = file.name.split('.').pop()
    const fileName = `${timestamp}-${randomId}.${fileExt}`
    const filePath = `uploads/${userId}/${fileName}`
    
    console.log('Uploading file:', {
      originalName: file.name,
      size: file.size,
      type: file.type,
      path: filePath
    })
    
    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Upload to storage using service role
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assets')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      })
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      
      // Check if bucket exists
      const { data: buckets } = await supabase.storage.listBuckets()
      const bucketExists = buckets?.some(b => b.id === 'assets')
      
      if (!bucketExists) {
        return NextResponse.json({ 
          error: 'Storage bucket "assets" does not exist',
          solution: 'Create the assets bucket in Supabase Dashboard > Storage'
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        error: 'Storage upload failed',
        details: uploadError.message 
      }, { status: 500 })
    }
    
    console.log('File uploaded successfully:', uploadData)
    
    // Try to create database record (optional - may fail if schema not updated)
    try {
      const assetData = {
        title: title,
        file_name: fileName,
        original_file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: fileExt || '',
        mime_type: file.type,
        owner_id: userId.startsWith('test-') ? null : userId,
        storage_bucket: 'assets',
        category: 'general',
        folder_path: '/',
        is_processed: false,
        processing_status: 'pending',
        visibility: 'private'
      }
      
      const { data: asset, error: dbError } = await supabase
        .from('assets')
        .insert(assetData)
        .select()
        .single()
      
      if (dbError) {
        console.error('Database insert error (non-fatal):', dbError)
        // Continue anyway - file is uploaded
      } else {
        console.log('Database record created:', asset)
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath)
      
      return NextResponse.json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          id: asset?.id || `temp-${timestamp}`,
          file_path: filePath,
          file_name: fileName,
          original_name: file.name,
          size: file.size,
          type: file.type,
          public_url: publicUrl,
          storage_path: uploadData.path
        }
      })
      
    } catch (dbErr) {
      console.error('Database operation failed (non-fatal):', dbErr)
      
      // Still return success since file was uploaded
      return NextResponse.json({
        success: true,
        message: 'File uploaded to storage (database record pending)',
        data: {
          id: `temp-${timestamp}`,
          file_path: filePath,
          file_name: fileName,
          original_name: file.name,
          size: file.size,
          type: file.type,
          storage_path: uploadData.path
        }
      })
    }
    
  } catch (error) {
    console.error('Upload endpoint error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Also support GET for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/assets/upload-simple',
    description: 'Simplified upload endpoint for debugging',
    env: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  })
}