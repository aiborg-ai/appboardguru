/**
 * Supabase Admin Client
 * Uses service role key for admin operations like user creation and management
 */

import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/environment'

if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
}

// Admin client with service role key for server-side operations
export const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * Create a new user account without password for first-time setup
 */
export async function createUserForApprovedRegistration(email: string, fullName: string) {
  try {
    // Create auth user without password
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      email_confirm: true, // Skip email confirmation since they're already approved
      user_metadata: {
        full_name: fullName,
        password_set: false
      }
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      throw authError
    }

    if (!authUser.user) {
      throw new Error('Failed to create user - no user returned')
    }

    // Manually insert into users table to ensure it's populated correctly
    // (in case the trigger function doesn't work or there's a timing issue)
    const { error: userInsertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.user.id,
        email: email,
        full_name: fullName,
        password_set: false,
        status: 'approved',
        role: 'director' // Default role for approved registrations
      })
      .select()

    if (userInsertError) {
      // If user already exists (due to trigger), just update the password_set flag
      if (userInsertError.code === '23505') { // Unique constraint violation
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ 
            password_set: false,
            status: 'approved',
            role: 'director'
          })
          .eq('id', authUser.user.id)

        if (updateError) {
          console.error('Error updating existing user:', updateError)
        } else {
          console.log(`✅ Updated existing user record for ${email}`)
        }
      } else {
        console.error('Error inserting user record:', userInsertError)
      }
    } else {
      console.log(`✅ Created user record for ${email}`)
    }

    console.log(`✅ Created auth user for ${email}`)
    return { user: authUser.user, success: true }

  } catch (error) {
    console.error('Failed to create user for approved registration:', error)
    return { user: null, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Generate a secure magic link for password setup
 */
export async function generatePasswordSetupMagicLink(email: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/set-password`
      }
    })

    if (error) {
      console.error('Error generating magic link:', error)
      throw error
    }

    console.log(`✅ Generated magic link for ${email}`)
    return { magicLink: data.properties?.action_link, success: true }

  } catch (error) {
    console.error('Failed to generate magic link:', error)
    return { magicLink: null, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Update user password after magic link verification
 */
export async function updateUserPassword(userId: string, password: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: password,
      user_metadata: {
        password_set: true
      }
    })

    if (error) {
      console.error('Error updating user password:', error)
      throw error
    }

    // Update the users table to mark password as set
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update({ password_set: true })
      .eq('id', userId)

    if (dbError) {
      console.error('Error updating users table:', dbError)
      // Don't throw here as the auth password was set successfully
    }

    console.log(`✅ Updated password for user ${userId}`)
    return { success: true }

  } catch (error) {
    console.error('Failed to update user password:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Get user details by email
 */
export async function getUserByEmail(email: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1
    })

    if (error) throw error

    const user = data.users.find(u => u.email === email)
    return { user, success: true }

  } catch (error) {
    console.error('Failed to get user by email:', error)
    return { user: null, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Check if user needs to set password
 */
export async function userNeedsPasswordSetup(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('password_set')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error checking password setup status:', error)
      return false
    }

    return !data?.password_set
  } catch (error) {
    console.error('Failed to check password setup status:', error)
    return false
  }
}