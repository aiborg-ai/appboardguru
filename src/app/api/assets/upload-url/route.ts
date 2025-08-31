import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

// This route generates a presigned URL for direct uploads to Supabase Storage
// This bypasses the Vercel function size limit

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get request data
    const { fileName, fileType, fileSize, organizationId } = await request.json()

    // Validate input
    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        code: 'MISSING_FIELDS'
      }, { status: 400 })
    }

    // For files larger than 4.5MB, generate a presigned upload URL
    const MAX_DIRECT_SIZE = 100 * 1024 * 1024 // 100MB max for direct uploads
    
    if (fileSize > MAX_DIRECT_SIZE) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 100MB.',
        code: 'FILE_TOO_LARGE'
      }, { status: 400 })
    }

    // Resolve organization ID if needed
    let finalOrgId = organizationId
    
    console.log('Upload URL request - Organization resolution:', {
      providedOrgId: organizationId,
      userId: user.id,
      userEmail: user.email
    })
    
    if (!finalOrgId || finalOrgId.startsWith('org-')) {
      // Get user's first organization
      const { data: userOrgs, error: orgError } = await supabase
        .from('organization_members')
        .select('organization_id, organizations(id, name)')
        .eq('user_id', user.id)
        .eq('status', 'active')
      
      console.log('User organizations query result:', {
        found: userOrgs?.length || 0,
        error: orgError?.message,
        orgs: userOrgs
      })
      
      if (userOrgs && userOrgs.length > 0) {
        finalOrgId = userOrgs[0].organization_id
        console.log('Using organization:', finalOrgId)
      } else {
        // Try to get any organization the user created
        const { data: createdOrg } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('created_by', user.id)
          .single()
        
        if (createdOrg) {
          finalOrgId = createdOrg.id
          console.log('Using created organization:', finalOrgId)
        } else {
          // Special handling for test director - auto-create organization if needed
          if (user.email === 'test.director@appboardguru.com') {
            console.log('Test director detected - creating default organization')
            
            // Create organization for test director
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
              
              finalOrgId = newOrg.id
              console.log('Created organization for test director:', finalOrgId)
            } else {
              console.error('Failed to create organization for test director:', createOrgError)
              return NextResponse.json({ 
                error: 'Failed to create organization. Please try again.',
                code: 'ORG_CREATION_FAILED',
                details: {
                  userId: user.id,
                  email: user.email,
                  error: createOrgError?.message
                }
              }, { status: 500 })
            }
          } else {
            console.error('No organization found for user:', {
              userId: user.id,
              email: user.email,
              providedOrgId: organizationId
            })
            
            return NextResponse.json({ 
              error: 'No organization found for user. Please ensure you are a member of an organization.',
              code: 'NO_ORGANIZATION',
              details: {
                userId: user.id,
                providedOrgId: organizationId
              }
            }, { status: 400 })
          }
        }
      }
    }

    // Generate unique file path
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 9)
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || ''
    const uniqueFileName = `${timestamp}-${randomString}.${fileExtension}`
    const filePath = `${user.id}/${finalOrgId}/uploads/${uniqueFileName}`

    // Create a service client for generating the signed URL
    // Note: In production, you should use the service role key for this
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    )

    // Generate a signed upload URL (valid for 1 hour)
    const { data: uploadData, error: uploadError } = await serviceSupabase.storage
      .from('assets')
      .createSignedUploadUrl(filePath, {
        upsert: false // Don't overwrite existing files
      })

    if (uploadError) {
      console.error('Failed to create signed URL:', uploadError)
      return NextResponse.json({ 
        error: 'Failed to generate upload URL',
        code: 'UPLOAD_URL_FAILED',
        details: uploadError.message
      }, { status: 500 })
    }

    // Return the signed URL and metadata for the frontend to use
    return NextResponse.json({
      success: true,
      uploadUrl: uploadData.signedUrl,
      token: uploadData.token,
      path: filePath,
      fileName: uniqueFileName,
      originalFileName: fileName,
      expiresIn: 3600, // 1 hour
      metadata: {
        userId: user.id,
        organizationId: finalOrgId,
        fileType,
        fileSize
      },
      instructions: 'Use this URL to upload the file directly from the browser using PUT method'
    })

  } catch (error) {
    console.error('Error generating upload URL:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

// Get upload status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')

    if (!filePath) {
      return NextResponse.json({ 
        error: 'File path required',
        code: 'PATH_REQUIRED'
      }, { status: 400 })
    }

    // Check if file exists
    const { data, error } = await supabase.storage
      .from('assets')
      .list(filePath.split('/').slice(0, -1).join('/'), {
        search: filePath.split('/').pop()
      })

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to check file status',
        code: 'STATUS_CHECK_FAILED'
      }, { status: 500 })
    }

    const fileExists = data && data.length > 0

    return NextResponse.json({
      success: true,
      exists: fileExists,
      file: fileExists ? data[0] : null
    })

  } catch (error) {
    console.error('Error checking upload status:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}