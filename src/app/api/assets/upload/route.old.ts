import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { AssetService } from '@/lib/services/asset.service'
import { AssetRepository, AssetUploadData } from '@/lib/repositories/asset.repository.enhanced'
import { createOrganizationId, createUserId } from '@/types/branded'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// Configure route segment for larger body size
export const runtime = 'nodejs' // Use Node.js runtime instead of Edge

// Vercel has a 4.5MB limit for Edge Functions, but Node.js functions can handle up to 50MB
const MAX_FILE_SIZE = 4.5 * 1024 * 1024 // 4.5MB for Vercel Edge Functions
// For larger files, we'll need to implement chunked uploads or use direct Supabase uploads

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
    .replace(/[^a-zA-Z0-9\-_/]/g, '_')
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
    // Create Supabase client
    const supabase = await createSupabaseServerClient()
    
    // Try to get user from session (cookies) first
    let { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // If no user from cookies, try Authorization header
    if (!user) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        const { data, error } = await supabase.auth.getUser(token)
        if (!error && data?.user) {
          user = data.user
          authError = null
        }
      }
    }
    
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message || 'No user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('Authenticated user:', user.email, '(', user.id, ')')

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

    // Organization ID is optional - we'll fetch the user's default if not provided
    // Removed the validation error for missing organizationId

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
          message: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit. Due to Vercel deployment limits, please use files under 4.5MB or contact admin for direct upload link.`,
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

    // Simplify organization resolution - always get user's first active organization if not provided
    let finalOrganizationId = organizationId
    
    if (!finalOrganizationId) {
      console.log('No organization provided, fetching user\'s default organization...')
      
      // Get user's first active organization
      const { data: userOrg, error: orgError } = await supabase
        .from('organization_members')
        .select('organization_id, organizations(id, name, status)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('joined_at', { ascending: false })
        .limit(1)
        .single()
      
      if (userOrg?.organization_id) {
        finalOrganizationId = userOrg.organization_id
        console.log('Using user\'s organization:', finalOrganizationId)
      } else {
        // Special case: test director - auto-create organization
        if (user.email === 'test.director@appboardguru.com') {
          console.log('Test director detected - creating default organization')
          
          const { data: newOrg, error: createOrgError } = await supabase
            .from('organizations')
            .insert({
              name: 'Test Director Organization',
              slug: `test-director-org-${Date.now()}`,
              description: 'Auto-created organization for test director',
              created_by: user.id,
              status: 'active',
              industry: 'Technology',
              organization_size: 'medium'
            })
            .select()
            .single()
          
          if (newOrg && !createOrgError) {
            // Create membership
            await supabase
              .from('organization_members')
              .insert({
                organization_id: newOrg.id,
                user_id: user.id,
                role: 'owner',
                status: 'active',
                joined_at: new Date().toISOString()
              })
            
            finalOrganizationId = newOrg.id
            console.log('Created organization for test director:', finalOrganizationId)
          } else {
            console.error('Failed to create organization:', createOrgError)
            return NextResponse.json({ 
              error: 'No organization found. Please ensure you are a member of an organization.',
              code: 'NO_ORGANIZATION',
              details: { 
                userId: user.id,
                email: user.email,
                createError: createOrgError?.message 
              }
            }, { status: 400 })
          }
        } else {
          console.error('No organization found for user:', user.id)
          return NextResponse.json({ 
            error: 'No organization found. Please ensure you are a member of an organization.',
            code: 'NO_ORGANIZATION',
            details: { userId: user.id, email: user.email }
          }, { status: 400 })
        }
      }
    }
    
    // Create branded types
    const userIdResult = createUserId(user.id)
    const organizationIdResult = createOrganizationId(finalOrganizationId)

    if (!userIdResult.success) {
      return NextResponse.json({ 
        error: 'Invalid user ID',
        code: 'INVALID_USER_ID'
      }, { status: 400 })
    }

    if (!organizationIdResult.success) {
      console.error('Organization ID validation failed:', finalOrganizationId)
      return NextResponse.json({ 
        error: 'Invalid organization ID. Please select an organization.',
        code: 'INVALID_ORGANIZATION_ID',
        details: { providedId: organizationId, resolvedId: finalOrganizationId }
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

    // Initialize services with authenticated Supabase client
    const assetRepository = new AssetRepository(supabase)
    const assetService = new AssetService(assetRepository)

    // Upload asset using service layer
    console.log('Starting upload with data:', {
      fileName: uploadData.fileName,
      fileSize: uploadData.fileSize,
      mimeType: uploadData.mimeType,
      organizationId: uploadData.organizationId,
      vaultId: uploadData.vaultId,
      userId: uploadData.uploadedBy,
      category: uploadData.category,
      folderPath: uploadData.folderPath
    })
    
    const uploadResult = await assetService.uploadAsset(uploadData)

    if (!uploadResult.success) {
      console.error('Upload failed:', {
        error: uploadResult.error,
        message: uploadResult.error.message,
        code: uploadResult.error.code || 'UPLOAD_FAILED',
        details: uploadResult.error.details
      })
      
      // Return more detailed error information
      const errorCode = uploadResult.error.code || 'UPLOAD_FAILED'
      const statusCode = errorCode === 'STORAGE_BUCKET_NOT_FOUND' ? 503 : 
                        errorCode === 'STORAGE_PERMISSION_DENIED' ? 403 : 500
      
      return NextResponse.json({ 
        error: uploadResult.error.message,
        code: errorCode,
        details: uploadResult.error.details || uploadResult.error,
        solution: uploadResult.error.details?.solution
      }, { status: statusCode })
    }

    // Log successful upload
    console.log('Upload successful, raw data:', JSON.stringify(uploadResult.data, null, 2))
    console.log('Upload successful summary:', {
      assetId: uploadResult.data?.id,
      fileName: uploadResult.data?.file_name,
      fileSize: uploadResult.data?.file_size,
      storagePath: uploadResult.data?.file_path
    })
    
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
      owner: asset.owner ? {
        id: asset.owner.id,
        name: asset.owner.full_name || 'Unknown',
        email: asset.owner.email
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