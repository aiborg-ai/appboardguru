/**
 * Database Connection Test Utility
 * Tests Supabase connection and basic operations
 */

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'

export interface ConnectionTestResult {
  success: boolean
  message: string
  details?: Record<string, any>
  error?: Error
}

export interface DatabaseHealthCheck {
  connection: ConnectionTestResult
  authentication: ConnectionTestResult
  organizations: ConnectionTestResult
  permissions: ConnectionTestResult
  overall: boolean
}

/**
 * Test Supabase connection health
 */
export async function testSupabaseConnection(): Promise<ConnectionTestResult> {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Simple connection test - fixed count query
    const { count, error } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })

    if (error) {
      return {
        success: false,
        message: `Database connection failed: ${error.message}`,
        error: error as Error
      }
    }

    return {
      success: true,
      message: 'Database connection successful',
      details: { organizationCount: count }
    }
  } catch (error) {
    return {
      success: false,
      message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error as Error
    }
  }
}

/**
 * Test database authentication
 */
export async function testDatabaseAuth(): Promise<ConnectionTestResult> {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      return {
        success: false,
        message: `Authentication test failed: ${error.message}`,
        error: error as Error
      }
    }

    return {
      success: true,
      message: 'Authentication test successful',
      details: { 
        hasUser: !!user,
        userId: user?.id 
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Authentication test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error as Error
    }
  }
}

/**
 * Test organization-specific database operations
 */
export async function testOrganizationOperations(): Promise<ConnectionTestResult> {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Test basic read operation
    const { data, error } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        created_at,
        is_active
      `)
      .eq('is_active', true)
      .limit(5)

    if (error) {
      return {
        success: false,
        message: `Organization query failed: ${error.message}`,
        error: error as Error
      }
    }

    // Test schema validation - check if required columns exist
    const { data: schemaData, error: schemaError } = await supabase
      .from('organizations')
      .select('id, name, slug, created_by, is_active')
      .limit(1)

    if (schemaError) {
      return {
        success: false,
        message: `Schema validation failed: ${schemaError.message}`,
        error: schemaError as Error
      }
    }

    return {
      success: true,
      message: 'Organization operations test successful',
      details: {
        organizationCount: data?.length || 0,
        schemaValid: true
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Organization operations test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error as Error
    }
  }
}

/**
 * Test database permissions and constraints
 */
export async function testDatabasePermissions(): Promise<ConnectionTestResult> {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Test if we can read from organization_members (with proper RLS)
    const { data: members, error: membersError } = await supabase
      .from('organization_members')
      .select('id, organization_id, user_id, role')
      .limit(1)

    // Test if we can read from organization_invitations
    const { data: invitations, error: invitationsError } = await supabase
      .from('organization_invitations')
      .select('id, organization_id, email, status')
      .limit(1)

    const errors = []
    if (membersError) errors.push(`Members: ${membersError.message}`)
    if (invitationsError) errors.push(`Invitations: ${invitationsError.message}`)

    if (errors.length > 0) {
      return {
        success: false,
        message: `Permission test failed: ${errors.join(', ')}`,
        details: { errors }
      }
    }

    return {
      success: true,
      message: 'Database permissions test successful',
      details: {
        membersAccess: !membersError,
        invitationsAccess: !invitationsError
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Permission test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error as Error
    }
  }
}

/**
 * Comprehensive database health check
 */
export async function performDatabaseHealthCheck(): Promise<DatabaseHealthCheck> {
  console.log('🔍 Starting database health check...')
  
  const connection = await testSupabaseConnection()
  console.log(`📡 Connection: ${connection.success ? '✅' : '❌'} ${connection.message}`)
  
  const authentication = await testDatabaseAuth()
  console.log(`🔐 Authentication: ${authentication.success ? '✅' : '❌'} ${authentication.message}`)
  
  const organizations = await testOrganizationOperations()
  console.log(`🏢 Organizations: ${organizations.success ? '✅' : '❌'} ${organizations.message}`)
  
  const permissions = await testDatabasePermissions()
  console.log(`🛡️ Permissions: ${permissions.success ? '✅' : '❌'} ${permissions.message}`)
  
  const overall = connection.success && authentication.success && organizations.success && permissions.success
  
  console.log(`🎯 Overall Health: ${overall ? '✅ HEALTHY' : '❌ ISSUES DETECTED'}`)
  
  return {
    connection,
    authentication,
    organizations,
    permissions,
    overall
  }
}

/**
 * Test organization creation transaction
 */
export async function testOrganizationTransaction(testData?: {
  name: string
  slug: string
  created_by: string
}): Promise<ConnectionTestResult> {
  if (!testData) {
    return {
      success: false,
      message: 'Test data required for transaction test'
    }
  }

  try {
    const supabase = await createSupabaseServerClient()
    
    // Test transaction by creating and immediately rolling back
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: testData.name,
        slug: testData.slug,
        created_by: testData.created_by,
        is_active: true
      })
      .select()
      .single()

    if (orgError) {
      return {
        success: false,
        message: `Organization creation failed: ${orgError.message}`,
        error: orgError as Error
      }
    }

    // Test adding member
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: testData.created_by,
        role: 'owner',
        status: 'active',
        invited_by: testData.created_by,
        approved_by: testData.created_by
      })

    if (memberError) {
      // Clean up organization
      await supabase
        .from('organizations')
        .delete()
        .eq('id', org.id)

      return {
        success: false,
        message: `Member creation failed: ${memberError.message}`,
        error: memberError as Error
      }
    }

    // Clean up test data
    await supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', org.id)

    await supabase
      .from('organizations')
      .delete()
      .eq('id', org.id)

    return {
      success: true,
      message: 'Transaction test successful',
      details: {
        organizationId: org.id,
        transactionComplete: true
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Transaction test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error as Error
    }
  }
}

/**
 * Validate database schema integrity
 */
export async function validateDatabaseSchema(): Promise<ConnectionTestResult> {
  try {
    const supabase = await createSupabaseServerClient()
    
    const requiredTables = [
      'organizations',
      'organization_members', 
      'organization_invitations',
      'organization_features'
    ]

    const schemaChecks = []

    for (const table of requiredTables) {
      const { error } = await supabase
        .from(table as any)
        .select('*')
        .limit(0)

      schemaChecks.push({
        table,
        exists: !error,
        error: error?.message
      })
    }

    const missingTables = schemaChecks.filter(check => !check.exists)
    
    if (missingTables.length > 0) {
      return {
        success: false,
        message: `Missing tables: ${missingTables.map(t => t.table).join(', ')}`,
        details: { schemaChecks }
      }
    }

    return {
      success: true,
      message: 'Database schema validation successful',
      details: { schemaChecks }
    }
  } catch (error) {
    return {
      success: false,
      message: `Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error as Error
    }
  }
}