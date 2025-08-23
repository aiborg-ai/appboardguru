import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { SituationMonitoringService } from '@/lib/services/situation-monitoring.service'
import type { Database } from '@/types/database'
import { z } from 'zod'

const ListAlertsSchema = z.object({
  severity: z.array(z.enum(['info', 'low', 'medium', 'high', 'critical', 'emergency'])).optional(),
  status: z.array(z.enum(['active', 'acknowledged', 'investigating', 'resolved', 'false_positive', 'escalated'])).optional(),
  source: z.array(z.enum(['news_feeds', 'social_media', 'market_data', 'regulatory_feeds', 'internal_systems', 'competitor_monitoring', 'sentiment_analysis', 'risk_indicators', 'operational_metrics', 'financial_indicators'])).optional(),
  category: z.array(z.enum(['operational', 'financial', 'regulatory', 'reputational', 'cybersecurity', 'legal', 'environmental', 'strategic'])).optional(),
  assigned_to: z.string().uuid().optional(),
  time_range: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
})

const UpdateAlertSchema = z.object({
  status: z.enum(['active', 'acknowledged', 'investigating', 'resolved', 'false_positive', 'escalated']).optional(),
  assigned_to: z.string().uuid().optional(),
  acknowledged_by: z.string().uuid().optional(),
  escalated_to: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

const ProcessMonitoringDataSchema = z.object({
  source: z.enum(['news_feeds', 'social_media', 'market_data', 'regulatory_feeds', 'internal_systems', 'competitor_monitoring', 'sentiment_analysis', 'risk_indicators', 'operational_metrics', 'financial_indicators']),
  content: z.any(),
  metadata: z.record(z.any())
})

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const monitoringService = new SituationMonitoringService(supabase)

    // Parse query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    
    // Convert array parameters
    ['severity', 'status', 'source', 'category'].forEach(param => {
      if (queryParams[param]) {
        queryParams[param] = queryParams[param].split(',')
      }
    })

    // Convert time_range if provided
    if (queryParams.start && queryParams.end) {
      queryParams.time_range = {
        start: queryParams.start,
        end: queryParams.end
      }
      delete queryParams.start
      delete queryParams.end
    }

    const validatedParams = ListAlertsSchema.parse({
      ...queryParams,
      page: queryParams.page ? parseInt(queryParams.page) : 1,
      limit: queryParams.limit ? parseInt(queryParams.limit) : 20
    })

    const result = await monitoringService.getActiveAlerts(validatedParams)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
        { status: result.error.statusCode || 400 }
      )
    }

    // Calculate pagination info
    const alerts = result.data
    const total = alerts.length
    const page = validatedParams.page
    const limit = validatedParams.limit
    const totalPages = Math.ceil(total / limit)
    
    // Apply pagination to results
    const from = (page - 1) * limit
    const to = from + limit
    const paginatedAlerts = alerts.slice(from, to)

    return NextResponse.json({
      alerts: paginatedAlerts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('GET /api/crisis/monitoring/alerts error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const monitoringService = new SituationMonitoringService(supabase)

    const body = await request.json()
    const validatedData = ProcessMonitoringDataSchema.parse(body)

    const result = await monitoringService.processMonitoringData(validatedData)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
        { status: result.error.statusCode || 400 }
      )
    }

    return NextResponse.json({
      alerts_generated: result.data.length,
      alerts: result.data
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/crisis/monitoring/alerts error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}