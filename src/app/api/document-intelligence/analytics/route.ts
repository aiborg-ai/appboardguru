/**
 * Document Intelligence Analytics API Endpoint
 * Advanced analytics and metrics for document processing and user interactions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { documentIntelligenceAnalyticsService } from '@/lib/services/document-intelligence-analytics.service'
import { z } from 'zod'

// Request validation schemas
const DashboardRequestSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  timeRange: z.object({
    start: z.string().datetime('Invalid start date'),
    end: z.string().datetime('Invalid end date')
  }),
  options: z.object({
    includeRealTime: z.boolean().optional(),
    includePredictions: z.boolean().optional(),
    granularity: z.enum(['hour', 'day', 'week', 'month']).optional(),
    refreshCache: z.boolean().optional()
  }).optional()
})

const DetailedMetricsRequestSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  metricType: z.enum(['processing', 'usage', 'content', 'performance']),
  timeRange: z.object({
    start: z.string().datetime('Invalid start date'),
    end: z.string().datetime('Invalid end date')
  }),
  filters: z.record(z.any()).optional()
})

const EventTrackingSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  eventType: z.string().min(1, 'Event type is required'),
  metadata: z.record(z.any()).optional()
})

const WorkflowAnalysisRequestSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  timeRange: z.object({
    start: z.string().datetime('Invalid start date'),
    end: z.string().datetime('Invalid end date')
  })
})

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const operation = searchParams.get('operation') || 'dashboard'

    switch (operation) {
      case 'dashboard': {
        // Generate analytics dashboard
        const validatedData = DashboardRequestSchema.parse(body)
        
        const result = await documentIntelligenceAnalyticsService.generateAnalyticsDashboard(
          validatedData.organizationId,
          validatedData.timeRange,
          validatedData.options
        )

        if (!result.success) {
          return NextResponse.json({
            success: false,
            error: result.error || 'Failed to generate dashboard'
          }, { status: 500 })
        }

        // Store dashboard generation event
        await documentIntelligenceAnalyticsService.trackEvent({
          organizationId: validatedData.organizationId,
          userId: user.id,
          eventType: 'dashboard_generated',
          timestamp: new Date().toISOString(),
          metadata: {
            timeRange: validatedData.timeRange,
            options: validatedData.options
          }
        })

        return NextResponse.json({
          success: true,
          data: result.data
        })
      }

      case 'detailed-metrics': {
        // Get detailed metrics
        const validatedData = DetailedMetricsRequestSchema.parse(body)
        
        const result = await documentIntelligenceAnalyticsService.generateDetailedMetrics(
          validatedData.organizationId,
          validatedData.metricType,
          validatedData.timeRange,
          validatedData.filters
        )

        if (!result.success) {
          return NextResponse.json({
            success: false,
            error: result.error || 'Failed to generate detailed metrics'
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          data: result.data
        })
      }

      case 'track-event': {
        // Track analytics event
        const validatedData = EventTrackingSchema.parse(body)
        
        await documentIntelligenceAnalyticsService.trackEvent({
          organizationId: validatedData.organizationId,
          userId: user.id,
          eventType: validatedData.eventType,
          timestamp: new Date().toISOString(),
          metadata: validatedData.metadata
        })

        return NextResponse.json({
          success: true,
          message: 'Event tracked successfully'
        })
      }

      case 'workflow-analysis': {
        // Analyze workflow performance
        const validatedData = WorkflowAnalysisRequestSchema.parse(body)
        
        // Import workflow service for analysis
        const { documentWorkflowService } = await import('@/lib/services/document-workflow.service')
        
        const result = await documentWorkflowService.analyzeWorkflowPerformance(
          validatedData.workflowId,
          validatedData.timeRange
        )

        if (!result.success) {
          return NextResponse.json({
            success: false,
            error: result.error || 'Failed to analyze workflow performance'
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          data: result.data
        })
      }

      case 'export-data': {
        // Export analytics data
        const { organizationId, format, dataTypes, timeRange } = body
        
        if (!organizationId || !format || !dataTypes || !timeRange) {
          return NextResponse.json({
            success: false,
            error: 'Missing required fields: organizationId, format, dataTypes, timeRange'
          }, { status: 400 })
        }

        // Generate export data
        const exportData = await this.generateExportData(
          organizationId,
          dataTypes,
          timeRange,
          format
        )

        // Store export request
        const { data: exportRecord } = await supabase
          .from('analytics_exports')
          .insert({
            user_id: user.id,
            organization_id: organizationId,
            data_types: dataTypes,
            format,
            time_range: timeRange,
            status: 'completed',
            file_size: exportData.size || 0
          })
          .select()
          .single()

        return NextResponse.json({
          success: true,
          data: {
            exportId: exportRecord?.id,
            downloadUrl: exportData.url,
            format,
            size: exportData.size
          }
        })
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid operation'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Analytics API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const operation = searchParams.get('operation') || 'summary'
    const organizationId = searchParams.get('organizationId')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!organizationId) {
      return NextResponse.json({
        success: false,
        error: 'Organization ID is required'
      }, { status: 400 })
    }

    switch (operation) {
      case 'summary': {
        // Get analytics summary
        const timeRange = {
          start: searchParams.get('start') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end: searchParams.get('end') || new Date().toISOString()
        }

        const summary = await this.generateAnalyticsSummary(organizationId, timeRange)

        return NextResponse.json({
          success: true,
          data: summary
        })
      }

      case 'events': {
        // Get event log
        const eventTypes = searchParams.getAll('eventType')
        const timeRange = {
          start: searchParams.get('start'),
          end: searchParams.get('end')
        }

        const result = await documentIntelligenceAnalyticsService.getEventLog(
          organizationId,
          eventTypes.length > 0 ? eventTypes : undefined,
          timeRange.start && timeRange.end ? timeRange as any : undefined,
          limit
        )

        if (!result.success) {
          return NextResponse.json({
            success: false,
            error: result.error || 'Failed to retrieve event log'
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          data: result.data
        })
      }

      case 'usage-trends': {
        // Get usage trends
        const { data: usageTrends, error } = await supabase
          .from('usage_metrics')
          .select('*')
          .eq('organization_id', organizationId)
          .gte('created_at', searchParams.get('start') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .lte('created_at', searchParams.get('end') || new Date().toISOString())
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Database error:', error)
          return NextResponse.json({
            success: false,
            error: 'Failed to retrieve usage trends'
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          data: {
            trends: usageTrends,
            totalCount: usageTrends.length
          }
        })
      }

      case 'performance-metrics': {
        // Get performance metrics
        const { data: performanceData, error } = await supabase
          .from('performance_metrics')
          .select('*')
          .eq('organization_id', organizationId)
          .gte('created_at', searchParams.get('start') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .lte('created_at', searchParams.get('end') || new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) {
          console.error('Database error:', error)
          return NextResponse.json({
            success: false,
            error: 'Failed to retrieve performance metrics'
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          data: {
            metrics: performanceData,
            totalCount: performanceData.length
          }
        })
      }

      case 'user-engagement': {
        // Get user engagement metrics
        const { data: engagementData, error } = await supabase
          .from('user_engagement_metrics')
          .select('*')
          .eq('organization_id', organizationId)
          .gte('created_at', searchParams.get('start') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .lte('created_at', searchParams.get('end') || new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) {
          console.error('Database error:', error)
          return NextResponse.json({
            success: false,
            error: 'Failed to retrieve user engagement metrics'
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          data: {
            engagement: engagementData,
            totalCount: engagementData.length
          }
        })
      }

      case 'content-insights': {
        // Get content analysis insights
        const { data: contentInsights, error } = await supabase
          .from('content_analysis_insights')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) {
          console.error('Database error:', error)
          return NextResponse.json({
            success: false,
            error: 'Failed to retrieve content insights'
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          data: {
            insights: contentInsights,
            totalCount: contentInsights.length
          }
        })
      }

      case 'system-health': {
        // Get system health metrics
        const healthMetrics = await this.getSystemHealthMetrics(organizationId)

        return NextResponse.json({
          success: true,
          data: healthMetrics
        })
      }

      case 'cost-analytics': {
        // Get cost analytics
        const costAnalytics = await this.getCostAnalytics(organizationId, {
          start: searchParams.get('start') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: searchParams.get('end') || new Date().toISOString()
        })

        return NextResponse.json({
          success: true,
          data: costAnalytics
        })
      }

      case 'alerts': {
        // Get active alerts
        const { data: alerts, error } = await supabase
          .from('system_alerts')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('acknowledged', false)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) {
          console.error('Database error:', error)
          return NextResponse.json({
            success: false,
            error: 'Failed to retrieve alerts'
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          data: {
            alerts,
            totalCount: alerts.length
          }
        })
      }

      case 'recommendations': {
        // Get optimization recommendations
        const recommendations = await this.getOptimizationRecommendations(organizationId)

        return NextResponse.json({
          success: true,
          data: {
            recommendations
          }
        })
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid operation'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Get analytics API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const operation = searchParams.get('operation')
    const body = await request.json()

    switch (operation) {
      case 'acknowledge-alert': {
        // Acknowledge system alert
        const { alertId } = body
        
        if (!alertId) {
          return NextResponse.json({
            success: false,
            error: 'Alert ID is required'
          }, { status: 400 })
        }

        const { error } = await supabase
          .from('system_alerts')
          .update({ 
            acknowledged: true,
            acknowledged_by: user.id,
            acknowledged_at: new Date().toISOString()
          })
          .eq('id', alertId)

        if (error) {
          console.error('Database error:', error)
          return NextResponse.json({
            success: false,
            error: 'Failed to acknowledge alert'
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          message: 'Alert acknowledged successfully'
        })
      }

      case 'update-settings': {
        // Update analytics settings
        const { organizationId, settings } = body
        
        if (!organizationId || !settings) {
          return NextResponse.json({
            success: false,
            error: 'Organization ID and settings are required'
          }, { status: 400 })
        }

        const { error } = await supabase
          .from('analytics_settings')
          .upsert({
            organization_id: organizationId,
            settings,
            updated_by: user.id,
            updated_at: new Date().toISOString()
          })

        if (error) {
          console.error('Database error:', error)
          return NextResponse.json({
            success: false,
            error: 'Failed to update settings'
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          message: 'Settings updated successfully'
        })
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid operation'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Update analytics API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Helper methods (would normally be in a separate utility class)
async function generateAnalyticsSummary(organizationId: string, timeRange: any) {
  // Mock implementation - would generate actual summary
  return {
    totalDocuments: 156,
    documentsProcessed: 142,
    averageProcessingTime: 45.2,
    totalQueries: 89,
    averageResponseTime: 1.8,
    systemHealth: 94,
    topFeatures: [
      { feature: 'Document Summarization', usage: 67 },
      { feature: 'Q&A System', usage: 45 },
      { feature: 'Search', usage: 89 },
      { feature: 'Analysis', usage: 23 }
    ]
  }
}

async function getSystemHealthMetrics(organizationId: string) {
  // Mock implementation - would get actual health metrics
  return {
    overall: 94,
    components: {
      processing: 96,
      search: 92,
      analysis: 98,
      storage: 90
    },
    alerts: [],
    uptime: 99.9,
    lastUpdated: new Date().toISOString()
  }
}

async function getCostAnalytics(organizationId: string, timeRange: any) {
  // Mock implementation - would calculate actual costs
  return {
    totalCost: 245.67,
    costBreakdown: {
      processing: 156.23,
      storage: 45.12,
      analysis: 34.56,
      search: 9.76
    },
    trends: [],
    projections: {
      nextMonth: 267.84,
      confidence: 0.85
    }
  }
}

async function getOptimizationRecommendations(organizationId: string) {
  // Mock implementation - would generate actual recommendations
  return [
    {
      type: 'performance',
      title: 'Optimize Document Indexing',
      description: 'Consider batch indexing during off-peak hours to improve performance',
      impact: 'high',
      effort: 'medium'
    },
    {
      type: 'cost',
      title: 'Archive Old Documents',
      description: 'Move documents older than 2 years to cold storage to reduce costs',
      impact: 'medium',
      effort: 'low'
    }
  ]
}

async function generateExportData(organizationId: string, dataTypes: string[], timeRange: any, format: string) {
  // Mock implementation - would generate actual export
  return {
    url: `/api/exports/${Date.now()}.${format}`,
    size: 1024 * 1024 // 1MB
  }
}