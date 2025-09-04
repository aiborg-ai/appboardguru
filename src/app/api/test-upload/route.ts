import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Use service role key to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Generate unique filename
    const fileName = `test-${Date.now()}-${file.name}`
    
    // Step 1: Upload to storage
    console.log('Uploading to storage...')
    const { data: storageData, error: storageError } = await supabase.storage
      .from('assets')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      })
    
    if (storageError) {
      console.error('Storage upload error:', storageError)
      return NextResponse.json({ 
        error: 'Storage upload failed',
        details: storageError.message,
        step: 'storage_upload'
      }, { status: 500 })
    }
    
    console.log('Storage upload successful:', storageData.path)
    
    // Step 2: Insert into database
    console.log('Inserting into database...')
    const { data: assetData, error: dbError } = await supabase
      .from('assets')
      .insert({
        title: file.name,
        file_name: fileName,
        file_path: storageData.path,
        file_size: file.size,
        file_type: file.type.split('/')[1] || 'unknown',
        mime_type: file.type,
        category: 'document',
        owner_id: 'b2fc2f59-447c-495c-af05-31a30d6e364a', // Test user ID
        organization_id: 'acdfd0b9-526a-4706-aff7-67e32aef18a7', // Test org ID
        status: 'ready',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (dbError) {
      console.error('Database insert error:', dbError)
      // Try to clean up storage file
      await supabase.storage.from('assets').remove([storageData.path])
      
      return NextResponse.json({ 
        error: 'Database insert failed',
        details: dbError.message,
        code: dbError.code,
        hint: dbError.hint,
        step: 'database_insert'
      }, { status: 500 })
    }
    
    console.log('Database insert successful:', assetData.id)
    
    return NextResponse.json({ 
      success: true,
      asset: assetData,
      message: 'Upload successful'
    })
    
  } catch (error) {
    console.error('Test upload error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Test upload endpoint ready',
    instructions: 'POST a file to this endpoint to test upload'
  })
}