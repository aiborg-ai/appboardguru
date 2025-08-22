import { NextRequest, NextResponse } from 'next/server'
import { createTypedSupabaseClient, getAuthenticatedUser } from '@/lib/supabase-typed'
import type { AssetInsert, TypedSupabaseClient } from '@/types/api'
import { v4 as uuidv4 } from 'uuid'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Videos
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-ms-wmv',
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed'
]

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

// TODO: Implement thumbnail generation when needed

interface UploadFormData {
  file: File
  title: string
  description?: string
  category?: string
  folderPath?: string
  tags?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createTypedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string || 'general'
    const folderPath = formData.get('folderPath') as string || '/'
    const tagsString = formData.get('tags') as string
    const tags = tagsString ? tagsString.split(',').map((tag) => tag.trim()).filter(Boolean) : []

    // Validate file
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` 
      }, { status: 400 })
    }

    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: `File type ${file.type} is not allowed` 
      }, { status: 400 })
    }

    // Generate unique filename
    const fileExtension = getFileExtension(file.name)
    const uniqueFileName = `${uuidv4()}.${fileExtension}`
    const filePath = `${user.id}/${folderPath.replace(/^\//, '')}/${uniqueFileName}`.replace(/\/+/g, '/')

    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(fileBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assets')
      .upload(filePath, uint8Array, {
        contentType: file.type,
        metadata: {
          originalName: file.name,
          uploadedBy: user.id,
          title: title
        }
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ 
        error: 'Failed to upload file to storage' 
      }, { status: 500 })
    }

    // Generate thumbnail for images (server-side would use different approach)
    let thumbnailUrl: string | null = null
    if (file.type.startsWith('image/')) {
      // In a real implementation, you'd generate thumbnails server-side
      // For now, we'll just mark that a thumbnail could be generated
      thumbnailUrl = `/api/assets/thumbnail/${uploadData.path}`
    }

    // Create asset record in database
    const { data: asset, error: dbError } = await supabase
      .from('assets')
      .insert({
        owner_id: user.id,
        title,
        description: description || null,
        file_name: uniqueFileName,
        original_file_name: file.name,
        file_path: uploadData.path,
        file_size: file.size,
        file_type: fileExtension,
        mime_type: file.type,
        storage_bucket: 'assets',
        category,
        folder_path: folderPath,
        tags,
        thumbnail_url: thumbnailUrl,
        is_processed: true,
        processing_status: 'completed',
        visibility: 'private'
      })
      .select(`
        *,
        owner:users!assets_owner_id_fkey(id, name, email)
      `)
      .single()

    if (dbError) {
      console.error('Database insert error:', dbError)
      
      // Clean up uploaded file if database insert fails
      await supabase.storage
        .from('assets')
        .remove([uploadData.path])
      
      return NextResponse.json({ 
        error: 'Failed to create asset record' 
      }, { status: 500 })
    }

    // Log upload activity using comprehensive logging system
    const { logAssetActivity, getRequestContext } = await import('@/lib/services/activity-logger')
    const requestContext = getRequestContext(request)
    
    await logAssetActivity(
      user.id,
      asset.organization_id || '',
      'uploaded',
      asset.id,
      asset.title,
      {
        ...requestContext,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        category,
        folder_path: folderPath,
        original_file_name: file.name
      }
    )

    // Transform response data
    const responseAsset = {
      id: asset.id,
      title: asset.title,
      description: asset.description,
      fileName: asset.file_name,
      originalFileName: asset.original_file_name,
      fileSize: asset.file_size,
      fileType: asset.file_type,
      mimeType: asset.mime_type,
      category: asset.category,
      folderPath: asset.folder_path,
      tags: asset.tags,
      thumbnailUrl: asset.thumbnail_url,
      createdAt: asset.created_at,
      updatedAt: asset.updated_at,
      owner: asset.owner,
      isShared: false,
      sharedWith: [],
      downloadCount: 0,
      viewCount: 0
    }

    return NextResponse.json({ 
      success: true,
      asset: responseAsset,
      message: 'File uploaded successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Handle multiple file uploads
interface BulkUploadSettings {
  description?: string
  category?: string
  folderPath?: string
  tags?: string
}

interface UploadResult {
  success: boolean
  fileName: string
  asset?: {
    id: string
    title: string
    fileName: string
    fileSize: number
    fileType: string
    createdAt: string
  }
  error?: string
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createTypedSupabaseClient()
    const user = await getAuthenticatedUser(supabase)

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const bulkSettings: BulkUploadSettings = JSON.parse(formData.get('settings') as string || '{}')

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const uploadResults: UploadResult[] = []
    const errors: UploadResult[] = []

    // Process files concurrently (with a limit to avoid overwhelming the server)
    const CONCURRENT_UPLOADS = 3
    for (let i = 0; i < files.length; i += CONCURRENT_UPLOADS) {
      const batch = files.slice(i, i + CONCURRENT_UPLOADS)
      
      const batchPromises = batch.map(async (file, index) => {
        try {
          const actualIndex = i + index
          
          // Get file-specific settings or use bulk settings
          const fileTitle = formData.get(`title_${actualIndex}`) as string || 
                           file.name.split('.').slice(0, -1).join('.')
          const fileDescription = formData.get(`description_${actualIndex}`) as string || 
                                 bulkSettings.description || null
          const fileCategory = formData.get(`category_${actualIndex}`) as string || 
                              bulkSettings.category || 'general'
          const fileFolderPath = formData.get(`folderPath_${actualIndex}`) as string || 
                                bulkSettings.folderPath || '/'
          const fileTagsString = formData.get(`tags_${actualIndex}`) as string || 
                                bulkSettings.tags || ''
          const fileTags = fileTagsString ? fileTagsString.split(',').map((tag) => tag.trim()).filter(Boolean) : []

          // Validate file
          if (file.size > MAX_FILE_SIZE) {
            throw new Error(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`)
          }

          if (!ALLOWED_TYPES.includes(file.type)) {
            throw new Error(`File type ${file.type} is not allowed`)
          }

          // Generate unique filename
          const fileExtension = getFileExtension(file.name)
          const uniqueFileName = `${uuidv4()}.${fileExtension}`
          const filePath = `${user.id}/${fileFolderPath.replace(/^\//, '')}/${uniqueFileName}`.replace(/\/+/g, '/')

          // Convert file to buffer
          const fileBuffer = await file.arrayBuffer()
          const uint8Array = new Uint8Array(fileBuffer)

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('assets')
            .upload(filePath, uint8Array, {
              contentType: file.type,
              metadata: {
                originalName: file.name,
                uploadedBy: user.id,
                title: fileTitle
              }
            })

          if (uploadError) {
            throw new Error(`Storage upload failed: ${uploadError.message}`)
          }

          // Generate thumbnail for images
          let thumbnailUrl: string | null = null
          if (file.type.startsWith('image/')) {
            thumbnailUrl = `/api/assets/thumbnail/${uploadData.path}`
          }

          // Create asset record
          const { data: asset, error: dbError } = await supabase
            .from('assets')
            .insert({
              owner_id: user.id,
              title: fileTitle,
              description: fileDescription,
              file_name: uniqueFileName,
              original_file_name: file.name,
              file_path: uploadData.path,
              file_size: file.size,
              file_type: fileExtension,
              mime_type: file.type,
              storage_bucket: 'assets',
              category: fileCategory,
              folder_path: fileFolderPath,
              tags: fileTags,
              thumbnail_url: thumbnailUrl,
              is_processed: true,
              processing_status: 'completed',
              visibility: 'private'
            })
            .select()
            .single()

          if (dbError) {
            // Clean up uploaded file
            await supabase.storage.from('assets').remove([uploadData.path])
            throw new Error(`Database insert failed: ${dbError.message}`)
          }

          // Log activity
          await supabase
            .from('asset_activity_log')
            .insert({
              asset_id: asset.id,
              user_id: user.id,
              activity_type: 'upload',
              activity_details: {
                file_name: file.name,
                file_size: file.size,
                file_type: file.type,
                batch_upload: true,
                batch_index: actualIndex
              }
            })

          return {
            success: true,
            fileName: file.name,
            asset: {
              id: asset.id,
              title: asset.title,
              fileName: asset.file_name,
              fileSize: asset.file_size,
              fileType: asset.file_type,
              createdAt: asset.created_at
            }
          }

        } catch (error) {
          return {
            success: false,
            fileName: file.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      uploadResults.push(...batchResults.filter(r => r.success))
      errors.push(...batchResults.filter(r => !r.success))
    }

    return NextResponse.json({
      success: true,
      uploaded: uploadResults.length,
      failed: errors.length,
      results: uploadResults,
      errors: errors,
      message: `${uploadResults.length} files uploaded successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`
    })

  } catch (error) {
    console.error('Bulk upload error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}