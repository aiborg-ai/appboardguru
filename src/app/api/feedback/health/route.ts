import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NotificationService } from '@/lib/services/notification.service'

/**
 * Health check endpoint for the feedback system
 * Returns detailed status of all feedback system components
 */
export async function GET() {
  const startTime = Date.now()
  const health: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    components: {
      database: { status: 'unknown', message: '' },
      authentication: { status: 'unknown', message: '' },
      email: { status: 'unknown', message: '' },
      table: { status: 'unknown', message: '' }
    },
    checks: []
  }

  try {
    // 1. Check Supabase connection
    try {
      const supabase = await createSupabaseServerClient()
      health.components.database.status = 'healthy'
      health.components.database.message = 'Connected to Supabase'
      health.checks.push('✅ Database connection established')
    } catch (dbError) {
      health.components.database.status = 'unhealthy'
      health.components.database.message = 'Failed to connect to Supabase'
      health.status = 'degraded'
      health.checks.push('❌ Database connection failed')
    }

    // 2. Check authentication service
    try {
      const supabase = await createSupabaseServerClient()
      // Try to get session (might be null but shouldn't error)
      const { error } = await supabase.auth.getSession()
      
      if (error) {
        health.components.authentication.status = 'degraded'
        health.components.authentication.message = 'Auth service has errors: ' + error.message
        health.checks.push('⚠️ Authentication service degraded')
      } else {
        health.components.authentication.status = 'healthy'
        health.components.authentication.message = 'Auth service operational'
        health.checks.push('✅ Authentication service operational')
      }
    } catch (authError) {
      health.components.authentication.status = 'unhealthy'
      health.components.authentication.message = 'Auth service unreachable'
      health.status = 'degraded'
      health.checks.push('❌ Authentication service failed')
    }

    // 3. Check feedback_submissions table
    try {
      const supabase = await createSupabaseServerClient()
      const { data, error } = await supabase
        .from('feedback_submissions')
        .select('id')
        .limit(1)
      
      if (error) {
        if (error.code === '42P01') {
          health.components.table.status = 'unhealthy'
          health.components.table.message = 'Table does not exist'
          health.status = 'unhealthy'
          health.checks.push('❌ feedback_submissions table missing')
          health.remediation = {
            message: 'Run the migration to create the table',
            command: 'npm run feedback:setup'
          }
        } else if (error.code === '42501') {
          health.components.table.status = 'degraded'
          health.components.table.message = 'Permission issues detected'
          health.status = 'degraded'
          health.checks.push('⚠️ Table exists but has permission issues')
        } else {
          health.components.table.status = 'degraded'
          health.components.table.message = error.message
          health.checks.push('⚠️ Table query failed: ' + error.message)
        }
      } else {
        health.components.table.status = 'healthy'
        health.components.table.message = 'Table exists and is accessible'
        health.checks.push('✅ feedback_submissions table accessible')
        
        // Try to get count of recent submissions
        const { count } = await supabase
          .from('feedback_submissions')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        
        health.components.table.recentSubmissions = count || 0
      }
    } catch (tableError) {
      health.components.table.status = 'unhealthy'
      health.components.table.message = 'Failed to check table'
      health.status = 'unhealthy'
      health.checks.push('❌ Table check failed')
    }

    // 4. Check email service (non-critical)
    try {
      const supabase = await createSupabaseServerClient()
      const notificationService = new NotificationService(supabase)
      
      // Check if email config exists
      const emailEnabled = process.env['SMTP_HOST'] && process.env['SMTP_USER']
      
      if (emailEnabled) {
        health.components.email.status = 'healthy'
        health.components.email.message = 'Email service configured'
        health.checks.push('✅ Email service configured')
      } else {
        health.components.email.status = 'degraded'
        health.components.email.message = 'Email service not configured (non-critical)'
        health.checks.push('⚠️ Email service not configured')
      }
    } catch (emailError) {
      health.components.email.status = 'degraded'
      health.components.email.message = 'Email service check failed (non-critical)'
      health.checks.push('⚠️ Email service unavailable')
    }

    // 5. Overall health determination
    const unhealthyCount = Object.values(health.components).filter(
      (c: any) => c.status === 'unhealthy'
    ).length
    const degradedCount = Object.values(health.components).filter(
      (c: any) => c.status === 'degraded'
    ).length

    if (unhealthyCount > 0) {
      health.status = 'unhealthy'
      health.message = `${unhealthyCount} critical component(s) failing`
    } else if (degradedCount > 0) {
      health.status = 'degraded'
      health.message = `System operational with ${degradedCount} degraded component(s)`
    } else {
      health.status = 'healthy'
      health.message = 'All systems operational'
    }

    // Add response time
    health.responseTime = Date.now() - startTime + 'ms'

    // Return appropriate status code based on health
    const statusCode = health.status === 'healthy' ? 200 : 
                       health.status === 'degraded' ? 200 : 503

    return NextResponse.json(health, { status: statusCode })

  } catch (error) {
    console.error('[Feedback Health] Unexpected error:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Health check failed',
      responseTime: Date.now() - startTime + 'ms'
    }, { status: 503 })
  }
}

// Lightweight health check
export async function HEAD() {
  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase
      .from('feedback_submissions')
      .select('id')
      .limit(1)
    
    if (error && error.code === '42P01') {
      // Table doesn't exist
      return new NextResponse(null, { status: 503 })
    }
    
    return new NextResponse(null, { status: 200 })
  } catch {
    return new NextResponse(null, { status: 503 })
  }
}