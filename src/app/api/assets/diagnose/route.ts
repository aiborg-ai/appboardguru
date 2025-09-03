import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

/**
 * Diagnostic endpoint to check upload prerequisites
 * Helps troubleshoot why uploads might be failing
 */
export async function GET(request: NextRequest) {
  try {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      checks: {},
      errors: [],
      warnings: [],
      recommendations: []
    }

    // 1. Check authentication
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    diagnostics.checks.authentication = {
      status: user ? 'pass' : 'fail',
      userId: user?.id || null,
      email: user?.email || null,
      error: authError?.message || null
    }

    if (!user) {
      diagnostics.errors.push('User not authenticated')
      diagnostics.recommendations.push('Please sign in to upload files')
      return NextResponse.json(diagnostics, { status: 401 })
    }

    // 2. Check organization membership
    const { data: userOrgs, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id, role, status, organizations(id, name, status)')
      .eq('user_id', user.id)
      .eq('status', 'active')

    diagnostics.checks.organization = {
      status: userOrgs && userOrgs.length > 0 ? 'pass' : 'fail',
      organizationCount: userOrgs?.length || 0,
      organizations: userOrgs?.map(o => ({
        id: o.organization_id,
        role: o.role,
        status: o.status,
        name: o.organizations?.name || 'Unknown'
      })) || [],
      error: orgError?.message || null
    }

    if (!userOrgs || userOrgs.length === 0) {
      diagnostics.errors.push('User has no organization')
      diagnostics.recommendations.push('User needs to be added to an organization before uploading files')
    }

    // 3. Check storage bucket existence
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    
    const assetsBucket = buckets?.find(b => b.id === 'assets' || b.name === 'assets')
    
    diagnostics.checks.storageBucket = {
      status: assetsBucket ? 'pass' : 'fail',
      bucketExists: !!assetsBucket,
      bucketDetails: assetsBucket ? {
        id: assetsBucket.id,
        name: assetsBucket.name,
        public: assetsBucket.public,
        created_at: assetsBucket.created_at
      } : null,
      allBuckets: buckets?.map(b => b.name) || [],
      error: bucketError?.message || null
    }

    if (!assetsBucket) {
      diagnostics.errors.push('Assets storage bucket does not exist')
      diagnostics.recommendations.push('Run the SQL migration: database/migrations/20250103_fix_storage_bucket_complete.sql')
    }

    // 4. Check storage policies (if bucket exists)
    if (assetsBucket) {
      try {
        // Try to list files in the bucket (will fail if no permissions)
        const testPath = `${user.id}/test`
        const { data: listData, error: listError } = await supabase.storage
          .from('assets')
          .list(testPath, { limit: 1 })

        diagnostics.checks.storagePermissions = {
          status: !listError ? 'pass' : 'warning',
          canList: !listError,
          error: listError?.message || null
        }

        if (listError && listError.message.includes('policy')) {
          diagnostics.warnings.push('Storage policies may be too restrictive')
          diagnostics.recommendations.push('Review RLS policies for the storage bucket')
        }
      } catch (err) {
        diagnostics.checks.storagePermissions = {
          status: 'warning',
          canList: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }
      }
    }

    // 5. Check database tables
    const tables = ['assets', 'organizations', 'organization_members', 'users', 'vault_members', 'vault_assets']
    diagnostics.checks.databaseTables = {}

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })

        diagnostics.checks.databaseTables[table] = {
          exists: !error,
          error: error?.message || null
        }

        if (error) {
          diagnostics.warnings.push(`Table '${table}' may have issues: ${error.message}`)
        }
      } catch (err) {
        diagnostics.checks.databaseTables[table] = {
          exists: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }
      }
    }

    // 6. Test file upload capability (dry run)
    if (assetsBucket && userOrgs && userOrgs.length > 0) {
      try {
        const testFileName = `test-${Date.now()}.txt`
        const testFilePath = `${user.id}/${userOrgs[0].organization_id}/diagnostics/${testFileName}`
        const testContent = new Blob(['diagnostic test'], { type: 'text/plain' })

        // Try to create a signed upload URL
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

        const { data: uploadData, error: uploadError } = await serviceSupabase.storage
          .from('assets')
          .createSignedUploadUrl(testFilePath)

        diagnostics.checks.uploadCapability = {
          status: uploadData ? 'pass' : 'fail',
          canCreateSignedUrl: !!uploadData,
          error: uploadError?.message || null
        }

        if (uploadError) {
          diagnostics.errors.push('Cannot create upload URLs')
          diagnostics.recommendations.push('Check service role key configuration')
        }

        // Clean up - try to delete the test path if it was created
        if (uploadData) {
          await serviceSupabase.storage
            .from('assets')
            .remove([testFilePath])
        }
      } catch (err) {
        diagnostics.checks.uploadCapability = {
          status: 'fail',
          canCreateSignedUrl: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }
      }
    }

    // 7. Environment check
    diagnostics.checks.environment = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      diagnostics.errors.push('Missing required Supabase environment variables')
      diagnostics.recommendations.push('Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set')
    }

    // 8. Overall status
    const hasErrors = diagnostics.errors.length > 0
    const hasWarnings = diagnostics.warnings.length > 0
    
    diagnostics.overallStatus = hasErrors ? 'fail' : (hasWarnings ? 'warning' : 'pass')
    diagnostics.canUpload = !hasErrors

    // 9. Recommendations summary
    if (diagnostics.overallStatus === 'pass') {
      diagnostics.summary = 'All checks passed. Uploads should work correctly.'
    } else if (diagnostics.overallStatus === 'warning') {
      diagnostics.summary = 'Some warnings detected but uploads may still work. Review warnings for optimal performance.'
    } else {
      diagnostics.summary = 'Critical issues detected. Uploads will not work until errors are resolved.'
    }

    // Add actionable steps if there are issues
    if (diagnostics.errors.length > 0) {
      diagnostics.actionableSteps = [
        '1. Review the errors listed above',
        '2. Follow the recommendations provided',
        '3. If storage bucket is missing, run the SQL migration',
        '4. Ensure user has proper organization membership',
        '5. Check environment variables are correctly set',
        '6. Re-run this diagnostic after making changes'
      ]
    }

    return NextResponse.json(diagnostics, { 
      status: diagnostics.overallStatus === 'fail' ? 500 : 200 
    })

  } catch (error) {
    console.error('Diagnostic error:', error)
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      overallStatus: 'error',
      error: 'Failed to run diagnostics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}