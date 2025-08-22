/**
 * Metrics API Endpoint
 * Provides detailed performance metrics and monitoring data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { monitor } from '@/lib/monitoring'
import { telemetry, withTelemetry } from '@/lib/telemetry'

interface MetricsData {
  timestamp: string
  uptime: number
  performance: {
    api: {
      totalCalls: number
      averageDuration: number
      uniqueEndpoints: number
      slowestEndpoints: Array<{
        endpoint: string
        averageDuration: number
        callCount: number
        p95: number
        p99: number
      }>
      errorRate: number
    }
    database: {
      totalQueries: number
      averageDuration: number
      uniqueQueries: number
      slowestQueries: Array<{
        query: string
        averageDuration: number
        callCount: number
        p95: number
        p99: number
      }>
      errorRate: number
    }
    components: {
      totalRenders: number
      averageDuration: number
      uniqueComponents: number
      slowestComponents: Array<{
        component: string
        averageDuration: number
        renderCount: number
        p95: number
        p99: number
      }>
    }
  }
  system: {
    memory: {
      heapUsed: number
      heapTotal: number
      external: number
      arrayBuffers: number
      rss: number
    }
    cpu: {
      userTime: number
      systemTime: number
    }
    eventLoop: {
      delay: number
    }
  }
  business: {
    activeUsers: number
    totalUsers: number
    totalAssets: number
    totalOrganizations: number
    assetsUploadedToday: number
    meetingsToday: number
    organizationsCreatedThisWeek: number
  }
  errors: Array<{
    timestamp: string
    route?: string
    component?: string
    query?: string
    message: string
    count: number
  }>
}

async function getSystemMetrics() {
  const memUsage = process.memoryUsage()
  const cpuUsage = process.cpuUsage()
  
  return {
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024), // MB
      arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024), // MB
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
    },
    cpu: {
      userTime: cpuUsage.user,
      systemTime: cpuUsage.system
    },
    eventLoop: {
      delay: 0 // Would need a proper event loop delay measurement
    }
  }
}

async function getBusinessMetrics() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      activeUsersResult,
      totalUsersResult,
      totalAssetsResult,
      totalOrganizationsResult,
      assetsUploadedTodayResult,
      meetingsTodayResult,
      organizationsCreatedThisWeekResult
    ] = await Promise.allSettled([
      // Active users (signed in within last 24 hours)
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_sign_in_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      
      // Total users
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true }),
      
      // Total assets
      supabase
        .from('board_packs')
        .select('*', { count: 'exact', head: true })
        .is('archived_at', null),
      
      // Total organizations
      supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
      
      // Assets uploaded today
      supabase
        .from('board_packs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString()),
      
      // Meetings today
      supabase
        .from('meetings')
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_start', todayStart.toISOString())
        .lt('scheduled_start', new Date(todayStart.getTime() + 24 * 60 * 60 * 1000).toISOString()),
      
      // Organizations created this week
      supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekStart.toISOString())
    ])

    return {
      activeUsers: activeUsersResult.status === 'fulfilled' ? (activeUsersResult.value.count || 0) : 0,
      totalUsers: totalUsersResult.status === 'fulfilled' ? (totalUsersResult.value.count || 0) : 0,
      totalAssets: totalAssetsResult.status === 'fulfilled' ? (totalAssetsResult.value.count || 0) : 0,
      totalOrganizations: totalOrganizationsResult.status === 'fulfilled' ? (totalOrganizationsResult.value.count || 0) : 0,
      assetsUploadedToday: assetsUploadedTodayResult.status === 'fulfilled' ? (assetsUploadedTodayResult.value.count || 0) : 0,
      meetingsToday: meetingsTodayResult.status === 'fulfilled' ? (meetingsTodayResult.value.count || 0) : 0,
      organizationsCreatedThisWeek: organizationsCreatedThisWeekResult.status === 'fulfilled' ? (organizationsCreatedThisWeekResult.value.count || 0) : 0,
    }
  } catch (error) {
    console.error('Error fetching business metrics:', error)
    return {
      activeUsers: 0,
      totalUsers: 0,
      totalAssets: 0,
      totalOrganizations: 0,
      assetsUploadedToday: 0,
      meetingsToday: 0,
      organizationsCreatedThisWeek: 0,
    }
  }
}

function formatErrorsForMetrics(errors: any[]): MetricsData['errors'] {
  const errorCounts = new Map<string, { count: number; latest: any }>()
  
  errors.forEach(error => {
    const key = `${error.route || error.component || error.query}-${error.errorMessage}`
    if (errorCounts.has(key)) {
      const existing = errorCounts.get(key)!
      existing.count++
      if (error.timestamp > existing.latest.timestamp) {
        existing.latest = error
      }
    } else {
      errorCounts.set(key, { count: 1, latest: error })
    }
  })

  return Array.from(errorCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 20) // Top 20 errors
    .map(({ count, latest }) => ({
      timestamp: new Date(latest.timestamp).toISOString(),
      route: latest.route,
      component: latest.component,
      query: latest.query,
      message: latest.errorMessage,
      count
    }))
}

function getTopSlowestEndpoints(apiStats: any, limit: number = 10) {
  return Object.entries(apiStats)
    .map(([endpoint, stats]: [string, any]) => ({
      endpoint,
      averageDuration: stats.avg,
      callCount: stats.count,
      p95: stats.p95,
      p99: stats.p99
    }))
    .sort((a, b) => b.averageDuration - a.averageDuration)
    .slice(0, limit)
}

export const GET = withTelemetry(async (request: NextRequest) => {
  try {
    // Check for admin/internal access
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const adminToken = process.env.METRICS_ACCESS_TOKEN
    
    if (process.env.NODE_ENV === 'production' && (!token || !adminToken || token !== adminToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const includeSystem = searchParams.get('system') !== 'false'
    const includeBusiness = searchParams.get('business') !== 'false'
    const includeErrors = searchParams.get('errors') !== 'false'

    // Get all performance data
    const [systemMetrics, businessMetrics] = await Promise.all([
      includeSystem ? getSystemMetrics() : Promise.resolve(null),
      includeBusiness ? getBusinessMetrics() : Promise.resolve(null)
    ])

    // Get monitoring data
    const monitorStats = monitor.getStats()
    const detailedApiStats = monitor.getDetailedStats('apiCalls')
    const detailedDbStats = monitor.getDetailedStats('dbQueries')
    const detailedComponentStats = monitor.getDetailedStats('components')
    const errors = includeErrors ? monitor.getDetailedStats('errors') as any[] : []

    const metricsData: MetricsData = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      performance: {
        api: {
          totalCalls: monitorStats.apiCalls.totalCalls,
          averageDuration: monitorStats.apiCalls.averageDuration,
          uniqueEndpoints: monitorStats.apiCalls.uniqueEndpoints,
          slowestEndpoints: getTopSlowestEndpoints(detailedApiStats),
          errorRate: 0 // Calculate from error data
        },
        database: {
          totalQueries: monitorStats.dbQueries.totalCalls,
          averageDuration: monitorStats.dbQueries.averageDuration,
          uniqueQueries: monitorStats.dbQueries.uniqueEndpoints,
          slowestQueries: getTopSlowestEndpoints(detailedDbStats),
          errorRate: 0 // Calculate from error data
        },
        components: {
          totalRenders: monitorStats.components.totalCalls,
          averageDuration: monitorStats.components.averageDuration,
          uniqueComponents: monitorStats.components.uniqueEndpoints,
          slowestComponents: getTopSlowestEndpoints(detailedComponentStats)
        }
      },
      system: systemMetrics || {
        memory: { heapUsed: 0, heapTotal: 0, external: 0, arrayBuffers: 0, rss: 0 },
        cpu: { userTime: 0, systemTime: 0 },
        eventLoop: { delay: 0 }
      },
      business: businessMetrics || {
        activeUsers: 0,
        totalUsers: 0,
        totalAssets: 0,
        totalOrganizations: 0,
        assetsUploadedToday: 0,
        meetingsToday: 0,
        organizationsCreatedThisWeek: 0
      },
      errors: formatErrorsForMetrics(errors)
    }

    return NextResponse.json(metricsData, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Metrics API error:', error)
    telemetry.recordError(error as Error)
    
    return NextResponse.json({
      error: 'Failed to fetch metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}, 'metrics')

// Prometheus-compatible metrics endpoint
export const POST = withTelemetry(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    
    // Check for admin access
    const token = searchParams.get('token')
    const adminToken = process.env.METRICS_ACCESS_TOKEN
    
    if (process.env.NODE_ENV === 'production' && (!token || !adminToken || token !== adminToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Clear metrics if requested
    if (searchParams.get('action') === 'clear') {
      monitor.clear()
      return NextResponse.json({ message: 'Metrics cleared' })
    }

    // Generate Prometheus-style metrics
    const stats = monitor.getStats()
    const systemMetrics = await getSystemMetrics()
    const businessMetrics = await getBusinessMetrics()
    
    const prometheusMetrics = `
# HELP api_calls_total Total number of API calls
# TYPE api_calls_total counter
api_calls_total ${stats.apiCalls.totalCalls}

# HELP api_call_duration_average Average API call duration in milliseconds
# TYPE api_call_duration_average gauge
api_call_duration_average ${stats.apiCalls.averageDuration}

# HELP db_queries_total Total number of database queries
# TYPE db_queries_total counter
db_queries_total ${stats.dbQueries.totalCalls}

# HELP db_query_duration_average Average database query duration in milliseconds
# TYPE db_query_duration_average gauge
db_query_duration_average ${stats.dbQueries.averageDuration}

# HELP memory_heap_used_bytes Memory heap used in bytes
# TYPE memory_heap_used_bytes gauge
memory_heap_used_bytes ${systemMetrics.memory.heapUsed * 1024 * 1024}

# HELP memory_heap_total_bytes Memory heap total in bytes
# TYPE memory_heap_total_bytes gauge
memory_heap_total_bytes ${systemMetrics.memory.heapTotal * 1024 * 1024}

# HELP active_users Number of active users
# TYPE active_users gauge
active_users ${businessMetrics.activeUsers}

# HELP total_assets Number of total assets
# TYPE total_assets gauge
total_assets ${businessMetrics.totalAssets}

# HELP total_organizations Number of total organizations
# TYPE total_organizations gauge
total_organizations ${businessMetrics.totalOrganizations}

# HELP process_uptime_seconds Process uptime in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds ${process.uptime()}
`.trim()

    return new Response(prometheusMetrics, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })

  } catch (error) {
    console.error('Prometheus metrics error:', error)
    return NextResponse.json({
      error: 'Failed to generate Prometheus metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}, 'prometheus-metrics')