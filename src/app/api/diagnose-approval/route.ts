import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Comprehensive diagnostic for approval issues
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  const token = url.searchParams.get('token')
  const email = url.searchParams.get('email')
  
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    request: {
      id,
      tokenProvided: !!token,
      email
    },
    environment: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    },
    tests: [],
    errors: []
  }
  
  // Test 1: Check if we can create a Supabase client
  try {
    diagnostics.tests.push({ test: 'Create Supabase client', status: 'testing' })
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey) {
      diagnostics.errors.push('Missing Supabase configuration')
      diagnostics.tests.push({ test: 'Create Supabase client', status: 'failed', error: 'Missing config' })
    } else {
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
      diagnostics.tests.push({ test: 'Create Supabase client', status: 'success' })
      
      // Test 2: Check if we can query the database
      try {
        diagnostics.tests.push({ test: 'Query database', status: 'testing' })
        const { data, error } = await supabase
          .from('registration_requests')
          .select('count')
          .limit(1)
        
        if (error) {
          diagnostics.errors.push(`Database query error: ${error.message}`)
          diagnostics.tests.push({ test: 'Query database', status: 'failed', error: error.message })
        } else {
          diagnostics.tests.push({ test: 'Query database', status: 'success' })
        }
      } catch (e) {
        diagnostics.errors.push(`Database error: ${e}`)
        diagnostics.tests.push({ test: 'Query database', status: 'error', error: String(e) })
      }
      
      // Test 3: Check if we can access auth admin
      try {
        diagnostics.tests.push({ test: 'Access auth admin', status: 'testing' })
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1
        })
        
        if (authError) {
          diagnostics.errors.push(`Auth admin error: ${authError.message}`)
          diagnostics.tests.push({ test: 'Access auth admin', status: 'failed', error: authError.message })
        } else {
          diagnostics.tests.push({ test: 'Access auth admin', status: 'success', userCount: authData?.users?.length })
        }
      } catch (e) {
        diagnostics.errors.push(`Auth error: ${e}`)
        diagnostics.tests.push({ test: 'Access auth admin', status: 'error', error: String(e) })
      }
      
      // Test 4: Check specific registration if ID provided
      if (id) {
        try {
          diagnostics.tests.push({ test: 'Find registration', status: 'testing' })
          const { data: reg, error: regError } = await supabase
            .from('registration_requests')
            .select('*')
            .eq('id', id)
            .single()
          
          if (regError) {
            diagnostics.errors.push(`Registration not found: ${regError.message}`)
            diagnostics.tests.push({ test: 'Find registration', status: 'failed', error: regError.message })
          } else if (reg) {
            diagnostics.tests.push({ test: 'Find registration', status: 'success' })
            diagnostics.registration = {
              id: reg.id,
              email: reg.email,
              status: reg.status,
              hasToken: !!reg.approval_token,
              tokenMatches: token ? reg.approval_token === token : 'no token provided'
            }
          }
        } catch (e) {
          diagnostics.errors.push(`Registration error: ${e}`)
          diagnostics.tests.push({ test: 'Find registration', status: 'error', error: String(e) })
        }
      }
      
      // Test 5: Try to create a test user
      if (email) {
        try {
          diagnostics.tests.push({ test: 'Create test user', status: 'testing' })
          
          // Check if user exists
          const { data: listData } = await supabase.auth.admin.listUsers()
          const exists = listData?.users?.some(u => u.email === email)
          
          if (exists) {
            diagnostics.tests.push({ test: 'Create test user', status: 'skipped', reason: 'User already exists' })
          } else {
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
              email: email,
              email_confirm: true,
              user_metadata: {
                full_name: 'Test User'
              }
            })
            
            if (createError) {
              diagnostics.errors.push(`User creation failed: ${createError.message}`)
              diagnostics.tests.push({ test: 'Create test user', status: 'failed', error: createError.message })
            } else {
              diagnostics.tests.push({ test: 'Create test user', status: 'success', userId: newUser?.user?.id })
            }
          }
        } catch (e) {
          diagnostics.errors.push(`User creation error: ${e}`)
          diagnostics.tests.push({ test: 'Create test user', status: 'error', error: String(e) })
        }
      }
    }
  } catch (e) {
    diagnostics.errors.push(`Setup error: ${e}`)
    diagnostics.tests.push({ test: 'Initial setup', status: 'error', error: String(e) })
  }
  
  // Generate recommendations
  diagnostics.recommendations = []
  
  if (diagnostics.errors.length > 0) {
    if (diagnostics.errors.some((e: string) => e.includes('Missing Supabase'))) {
      diagnostics.recommendations.push('Check SUPABASE_SERVICE_ROLE_KEY environment variable in Vercel')
    }
    if (diagnostics.errors.some((e: string) => e.includes('JWT'))) {
      diagnostics.recommendations.push('Service role key may be invalid or expired')
    }
    if (diagnostics.errors.some((e: string) => e.includes('User creation'))) {
      diagnostics.recommendations.push('Use the bypass approval endpoint: /api/approve-bypass')
    }
  }
  
  // Add bypass URL if registration ID provided
  if (id && token) {
    diagnostics.bypassUrl = `${request.nextUrl.origin}/api/approve-bypass?id=${id}&token=${token}`
    diagnostics.recommendations.push(`Try bypass approval: ${diagnostics.bypassUrl}`)
  }
  
  return NextResponse.json(diagnostics, {
    status: diagnostics.errors.length > 0 ? 400 : 200,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}