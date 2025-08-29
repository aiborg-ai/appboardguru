import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Test user creation to diagnose the exact failure point
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const email = url.searchParams.get('email') || 'test-' + Date.now() + '@example.com'
  const fullName = url.searchParams.get('name') || 'Test User'
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    email,
    fullName,
    steps: [] as any[],
    errors: [] as any[],
    success: false
  }
  
  // Step 1: Check if auth user exists
  try {
    diagnostics.steps.push({ step: 'Check existing auth user', status: 'started' })
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      diagnostics.errors.push({ step: 'List users', error: listError })
    } else {
      const exists = listData?.users?.some(u => u.email === email)
      diagnostics.steps.push({ 
        step: 'Check existing auth user', 
        status: 'completed',
        userExists: exists,
        totalUsers: listData?.users?.length || 0
      })
      
      if (exists) {
        diagnostics.steps.push({ step: 'User already exists', status: 'skipped' })
        const existingUser = listData?.users?.find(u => u.email === email)
        diagnostics.existingUserId = existingUser?.id
      }
    }
  } catch (e) {
    diagnostics.errors.push({ step: 'Check existing', error: String(e) })
  }
  
  // Step 2: Create auth user if doesn't exist
  if (!diagnostics.existingUserId) {
    try {
      diagnostics.steps.push({ step: 'Create auth user', status: 'started' })
      
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: fullName
        }
      })
      
      if (authError) {
        diagnostics.errors.push({ 
          step: 'Create auth user', 
          error: authError.message,
          code: authError.status
        })
      } else if (authData?.user) {
        diagnostics.steps.push({ 
          step: 'Create auth user', 
          status: 'success',
          userId: authData.user.id
        })
        diagnostics.userId = authData.user.id
      }
    } catch (e) {
      diagnostics.errors.push({ step: 'Create auth user', error: String(e) })
    }
  }
  
  // Step 3: Create/update users table record
  const userId = diagnostics.userId || diagnostics.existingUserId
  if (userId) {
    try {
      diagnostics.steps.push({ step: 'Create users table record', status: 'started' })
      
      // First try to insert
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          email,
          full_name: fullName,
          status: 'approved',
          role: 'director',
          password_set: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (insertError) {
        diagnostics.errors.push({ 
          step: 'Insert users record', 
          error: insertError.message,
          code: insertError.code,
          details: insertError.details
        })
        
        // If duplicate, try update
        if (insertError.code === '23505') {
          diagnostics.steps.push({ step: 'User exists, trying update', status: 'started' })
          
          const { data: updateData, error: updateError } = await supabaseAdmin
            .from('users')
            .update({
              status: 'approved',
              role: 'director',
              password_set: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single()
          
          if (updateError) {
            diagnostics.errors.push({ 
              step: 'Update users record', 
              error: updateError.message,
              code: updateError.code
            })
          } else {
            diagnostics.steps.push({ 
              step: 'Update users record', 
              status: 'success',
              data: updateData
            })
            diagnostics.success = true
          }
        }
      } else {
        diagnostics.steps.push({ 
          step: 'Insert users record', 
          status: 'success',
          data: insertData
        })
        diagnostics.success = true
      }
    } catch (e) {
      diagnostics.errors.push({ step: 'Users table operation', error: String(e) })
    }
  }
  
  // Step 4: Verify the user exists in users table
  if (userId) {
    try {
      const { data: verifyData, error: verifyError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (verifyError) {
        diagnostics.errors.push({ step: 'Verify user', error: verifyError.message })
      } else {
        diagnostics.finalUserRecord = verifyData
      }
    } catch (e) {
      diagnostics.errors.push({ step: 'Verify user', error: String(e) })
    }
  }
  
  return NextResponse.json(diagnostics, {
    status: diagnostics.success ? 200 : 400,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}