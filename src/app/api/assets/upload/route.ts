import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { AssetService } from '@/lib/services/asset.service'
import { AssetRepository, AssetUploadData } from '@/lib/repositories/asset.repository.enhanced'
import { createOrganizationId, createUserId } from '@/types/branded'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

interface UploadFormData {
  file: File
  title: string
  description?: string
  category?: string
  folderPath?: string
  tags?: string
  organizationId?: string
  vaultId?: string
}

function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '')
}

function sanitizeFolderPath(path: string): string {
  return path
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-zA-Z0-9\-_\/]/g, '_')
    .replace(/\/+/g, '/')
}

function validateFileType(mimeType: string): boolean {
  const allowedTypes = [
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
  return allowedTypes.includes(mimeType)
}

export async function POST(request: NextRequest) {
  let fileBuffer: ArrayBuffer | null = null;
  
  try {
    // Get authenticated user
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string || 'general'
    const folderPath = formData.get('folderPath') as string || '/'
    const organizationId = formData.get('organizationId') as string
    const vaultId = formData.get('vaultId') as string || null
    const tagsString = formData.get('tags') as string

    // Enhanced file validation
    const validationErrors: { field: string; message: string; code: string }[] = []

    // Basic validation
    if (!file) {
      validationErrors.push({
        field: 'file',
        message: 'No file provided. Please select a file to upload.',
        code: 'FILE_REQUIRED'
      })
    }

    if (!title || title.trim().length === 0) {
      validationErrors.push({
        field: 'title',
        message: 'Title is required. Please provide a descriptive title for your file.',
        code: 'TITLE_REQUIRED'
      })
    }

    if (!organizationId) {
      validationErrors.push({
        field: 'organizationId',
        message: 'Organization context is required for file uploads.',
        code: 'ORGANIZATION_REQUIRED'
      })
    }

    // Enhanced file validations
    if (file) {
      // Check for zero-byte files
      if (file.size === 0) {
        validationErrors.push({
          field: 'file',
          message: 'Empty files are not allowed. Please select a file with content.',
          code: 'FILE_EMPTY'
        })
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        validationErrors.push({
          field: 'file',
          message: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit. Please choose a smaller file.`,
          code: 'FILE_TOO_LARGE'
        })
      }

      // Check minimum file size (prevent accidentally small files)
      const MIN_FILE_SIZE = 10 // 10 bytes minimum
      if (file.size < MIN_FILE_SIZE) {
        validationErrors.push({
          field: 'file',
          message: 'File appears to be too small or corrupted. Please check the file and try again.',
          code: 'FILE_TOO_SMALL'
        })
      }

      // Validate file type
      if (!validateFileType(file.type)) {
        const allowedTypes = [
          'PDF', 'DOC/DOCX', 'PPT/PPTX', 'XLS/XLSX', 
          'TXT', 'JPG/PNG', 'MP4', 'ZIP'
        ]
        validationErrors.push({
          field: 'file',
          message: `File type "${file.type}" is not supported. Allowed types: ${allowedTypes.join(', ')}.`,
          code: 'INVALID_FILE_TYPE'
        })
      }

      // Check for potentially malicious file extensions
      const fileName = file.name.toLowerCase()
      const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.msi', '.jar', '.com']
      if (dangerousExtensions.some(ext => fileName.endsWith(ext))) {
        validationErrors.push({
          field: 'file',
          message: 'Executable files are not allowed for security reasons.',
          code: 'FILE_TYPE_BLOCKED'
        })
      }

      // Store file buffer for later use (avoid reading twice)
      try {
        fileBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(fileBuffer)
        
        // Check for executable signatures
        const executableSignatures = [
          Buffer.from([0x4D, 0x5A]), // PE executable
          Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF executable
          Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]), // Java class file
        ]
        
        if (executableSignatures.some(sig => buffer.subarray(0, sig.length).equals(sig))) {
          validationErrors.push({
            field: 'file',
            message: 'File appears to contain executable code and cannot be uploaded.',
            code: 'FILE_CONTAINS_EXECUTABLE'
          })
        }
      } catch (error) {
        console.warn('Could not validate file content:', error)
        // Don't fail upload for content validation errors, just log them
      }
    }

    // Return validation errors if any
    if (validationErrors.length > 0) {
      return NextResponse.json({ 
        error: 'File validation failed',
        code: 'VALIDATION_FAILED',
        validationErrors,
        message: validationErrors.map(err => err.message).join(' ')
      }, { status: 400 })
    }

    // Sanitize and validate input
    const sanitizedTitle = sanitizeInput(title)
    const sanitizedDescription = description ? sanitizeInput(description) : undefined
    const sanitizedCategory = sanitizeInput(category)
    const sanitizedFolderPath = sanitizeFolderPath(folderPath)
    const tags = tagsString ? 
      tagsString.split(',')
        .map(tag => sanitizeInput(tag))
        .filter(Boolean)
        .slice(0, 10) // Limit to 10 tags
      : []

    // Validate input lengths
    if (sanitizedTitle.length > 255) {
      return NextResponse.json({ 
        error: 'Title must be less than 255 characters',
        code: 'TITLE_TOO_LONG'
      }, { status: 400 })
    }

    if (sanitizedDescription && sanitizedDescription.length > 1000) {
      return NextResponse.json({ 
        error: 'Description must be less than 1000 characters',
        code: 'DESCRIPTION_TOO_LONG'
      }, { status: 400 })
    }

    // Create branded types
    const userIdResult = createUserId(user.id)
    const organizationIdResult = createOrganizationId(organizationId)

    if (!userIdResult.success) {
      return NextResponse.json({ 
        error: 'Invalid user ID',
        code: 'INVALID_USER_ID'
      }, { status: 400 })
    }

    if (!organizationIdResult.success) {
      return NextResponse.json({ 
        error: 'Invalid organization ID',
        code: 'INVALID_ORGANIZATION_ID'
      }, { status: 400 })
    }

    // Use the file buffer we already read (or read it now if validation was skipped)
    if (!fileBuffer) {
      fileBuffer = await file.arrayBuffer()
    }
    const buffer = Buffer.from(fileBuffer)

    // Prepare upload data
    const uploadData: AssetUploadData = {
      file: buffer,
      fileName: file.name,
      originalFileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      title: sanitizedTitle,
      description: sanitizedDescription,
      category: sanitizedCategory,
      tags,
      organizationId: organizationIdResult.data,
      vaultId: vaultId ? vaultId as any : undefined, // TODO: Create branded type
      folderPath: sanitizedFolderPath,
      uploadedBy: userIdResult.data
    }

    // Initialize services
    const assetRepository = new AssetRepository()
    const assetService = new AssetService(assetRepository)

    // Upload asset using service layer
    console.log('Starting upload with data:', {
      fileName: uploadData.fileName,
      fileSize: uploadData.fileSize,
      mimeType: uploadData.mimeType,
      organizationId: uploadData.organizationId,
      vaultId: uploadData.vaultId
    })
    
    const uploadResult = await assetService.uploadAsset(uploadData)

    if (!uploadResult.success) {
      console.error('Upload failed:', uploadResult.error)
      return NextResponse.json({ 
        error: uploadResult.error.message,
        code: 'UPLOAD_FAILED',
        details: uploadResult.error
      }, { status: 500 })
    }

    // Transform response data
    const asset = uploadResult.data
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
      owner: asset.uploaded_by_user ? {
        id: asset.uploaded_by_user.id,
        name: asset.uploaded_by_user.full_name || 'Unknown',
        email: asset.uploaded_by_user.email
      } : null,
      organization: asset.organization,
      vault: asset.vault,
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
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

// TODO: Implement bulk upload using the service layer
// For now, clients should call the single upload endpoint multiple times