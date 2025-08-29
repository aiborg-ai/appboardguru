/**
 * Simplified user creation without debug dependencies
 */

import { supabaseAdmin } from './supabase-admin'

export async function createUserSimple(email: string, fullName: string) {
  try {
    console.log('Creating user:', email)
    
    // Step 1: Create auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        password_set: false
      }
    })

    if (authError) {
      console.error('Auth creation error:', authError)
      return { 
        success: false, 
        error: authError.message || 'Failed to create auth user',
        user: null,
        userRecord: null
      }
    }

    if (!authUser?.user) {
      return { 
        success: false, 
        error: 'No user returned from auth creation',
        user: null,
        userRecord: null
      }
    }

    const userId = authUser.user.id
    console.log('Auth user created:', userId)

    // Step 2: Wait for trigger
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Step 3: Check if users table record exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (existingUser) {
      console.log('User record exists (created by trigger)')
      return {
        success: true,
        error: null,
        user: authUser.user,
        userRecord: existingUser
      }
    }

    // Step 4: Manually create users table record if trigger didn't work
    console.log('Creating users table record manually')
    
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email: email,
        full_name: fullName,
        password_set: false,
        status: 'approved',
        role: 'director', // Valid: director, admin, pending
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      // Handle duplicate key error
      if (insertError.code === '23505') {
        console.log('User exists, updating...')
        
        const { data: updateData, error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            password_set: false,
            status: 'approved',
            role: 'director',
            full_name: fullName,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
          .single()

        if (updateError) {
          console.error('Update error:', updateError)
          return {
            success: false,
            error: `Failed to update user record: ${updateError.message}`,
            user: authUser.user,
            userRecord: null
          }
        }

        return {
          success: true,
          error: null,
          user: authUser.user,
          userRecord: updateData
        }
      }

      console.error('Insert error:', insertError)
      return {
        success: false,
        error: `Failed to create user record: ${insertError.message}`,
        user: authUser.user,
        userRecord: null
      }
    }

    return {
      success: true,
      error: null,
      user: authUser.user,
      userRecord: insertData
    }

  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      user: null,
      userRecord: null
    }
  }
}