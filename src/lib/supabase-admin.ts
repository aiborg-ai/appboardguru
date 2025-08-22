/**
 * Supabase Admin Client
 * Uses service role key for admin operations like user creation and management
 */

import { createClient } from '@supabase/supabase-js'
import { env, getAppUrl } from '@/config/environment'

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
  const { debugLogger, createOperationTracker } = await import('@/lib/debug-logger')
  const tracker = createOperationTracker('CREATE_USER_FOR_APPROVED_REGISTRATION', { email })
  
  debugLogger.authUserCreateStart(email, fullName)

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
      debugLogger.authUserCreateResult(email, false, { error: authError })
      throw authError
    }

    if (!authUser.user) {
      const error = 'Failed to create user - no user returned'
      debugLogger.authUserCreateResult(email, false, { error })
      throw new Error(error)
    }

    debugLogger.authUserCreateResult(email, true, { 
      userId: authUser.user.id,
      userEmail: authUser.user.email 
    })

    // Wait a moment for trigger to fire
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Check if user record was created by trigger
    debugLogger.usersTableInsertStart(email, authUser.user.id)
    
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authUser.user.id)
      .single()

    if (existingUser) {
      debugLogger.usersTableInsertResult(email, true, { 
        source: 'trigger',
        userId: existingUser.id,
        passwordSet: existingUser.password_set 
      })
    } else {
      // Trigger didn't work, manually insert into users table
      debugLogger.warning('TRIGGER_FAILED', email, 'Users table trigger did not fire, manually inserting')
      
      const { data: insertData, error: userInsertError } = await supabaseAdmin
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
        .single()

      if (userInsertError) {
        // If user already exists (race condition), try to update
        if (userInsertError.code === '23505') { // Unique constraint violation
          debugLogger.warning('RACE_CONDITION_DETECTED', email, 'User record exists, updating instead')
          
          const { data: updateData, error: updateError } = await supabaseAdmin
            .from('users')
            .update({ 
              password_set: false,
              status: 'approved',
              role: 'director',
              full_name: fullName
            })
            .eq('id', authUser.user.id)
            .select()
            .single()

          if (updateError) {
            debugLogger.usersTableInsertResult(email, false, { error: updateError })
            throw new Error(`Failed to update existing user record: ${updateError.message}`)
          } else {
            debugLogger.usersTableInsertResult(email, true, { 
              source: 'manual_update',
              data: updateData 
            })
          }
        } else {
          debugLogger.usersTableInsertResult(email, false, { error: userInsertError })
          throw new Error(`Failed to insert user record: ${userInsertError.message}`)
        }
      } else {
        debugLogger.usersTableInsertResult(email, true, { 
          source: 'manual_insert',
          data: insertData 
        })
      }
    }

    // Final verification - ensure user record exists
    const { data: finalUser, error: finalError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authUser.user.id)
      .single()

    if (finalError || !finalUser) {
      const error = `User record verification failed: ${finalError?.message || 'User not found'}`
      debugLogger.error('USER_VERIFICATION_FAILED', email, { error, userId: authUser.user.id })
      throw new Error(error)
    }

    debugLogger.info('USER_VERIFICATION_SUCCESS', email, {
      userId: finalUser.id,
      email: finalUser.email,
      passwordSet: finalUser.password_set,
      status: finalUser.status,
      role: finalUser.role
    })

    tracker.success({ 
      userId: authUser.user.id,
      usersTableRecord: !!finalUser 
    })
    
    return { 
      user: authUser.user, 
      success: true,
      userRecord: finalUser
    }

  } catch (error) {
    debugLogger.error('CREATE_USER_FAILED', email, {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    })
    
    tracker.error(error)
    return { 
      user: null, 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      userRecord: null
    }
  }
}

/**
 * Generate a secure magic link for password setup
 */
export async function generatePasswordSetupMagicLink(email: string) {
  try {
    const appUrl = getAppUrl()
    const redirectUrl = `${appUrl}/auth/set-password`
    
    console.log(`🔗 Generating magic link for ${email} with redirect: ${redirectUrl}`)
    
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: redirectUrl
      }
    })

    if (error) {
      console.error('❌ Supabase magic link generation error:', error)
      throw error
    }

    if (!data?.properties?.action_link) {
      console.error('❌ Magic link generation returned no action_link')
      throw new Error('Magic link generation failed - no action_link returned')
    }

    const magicLink = data.properties.action_link
    console.log(`✅ Generated magic link for ${email}`)
    console.log(`🔗 Magic link URL: ${magicLink.substring(0, 100)}...`)
    
    return { magicLink, success: true }

  } catch (error) {
    console.error('❌ Failed to generate magic link:', error)
    return { 
      magicLink: null, 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
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