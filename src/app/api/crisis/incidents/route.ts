import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { CrisisManagementService } from '@/lib/services/crisis-management.service'
import { IncidentResponseWorkflowService } from '@/lib/services/incident-response-workflows.service'
import type { Database } from '@/types/database'
import { z } from 'zod'

const CreateIncidentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  category: z.enum(['operational', 'financial', 'regulatory', 'reputational', 'cybersecurity', 'legal', 'environmental', 'strategic']),
  level: z.enum(['low', 'medium', 'high', 'critical']),
  source: z.string().min(1),
  impact_assessment: z.object({
    financial_impact: z.number().optional(),
    operational_impact: z.string().optional(),
    reputational_risk: z.string().optional(),
    regulatory_exposure: z.string().optional(),
    stakeholder_impact: z.array(z.string()).optional()
  }).optional(),
  metadata: z.record(z.any()).optional()
})

const UpdateIncidentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['monitoring', 'active', 'escalated', 'resolving', 'resolved', 'post_incident']).optional(),
  impact_assessment: z.object({
    financial_impact: z.number().optional(),
    operational_impact: z.string().optional(),
    reputational_risk: z.string().optional(),
    regulatory_exposure: z.string().optional(),
    stakeholder_impact: z.array(z.string()).optional()
  }).optional(),
  metadata: z.record(z.any()).optional()
})

const ListIncidentsSchema = z.object({
  status: z.array(z.enum(['monitoring', 'active', 'escalated', 'resolving', 'resolved', 'post_incident'])).optional(),
  level: z.array(z.enum(['low', 'medium', 'high', 'critical'])).optional(),
  category: z.array(z.enum(['operational', 'financial', 'regulatory', 'reputational', 'cybersecurity', 'legal', 'environmental', 'strategic'])).optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
})

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const crisisService = new CrisisManagementService(supabase)

    // Parse query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    
    // Convert array parameters
    if (queryParams.status) {
      queryParams.status = queryParams.status.split(',')
    }
    if (queryParams.level) {
      queryParams.level = queryParams.level.split(',')
    }
    if (queryParams.category) {
      queryParams.category = queryParams.category.split(',')
    }

    const validatedParams = ListIncidentsSchema.parse({
      ...queryParams,
      page: queryParams.page ? parseInt(queryParams.page) : 1,
      limit: queryParams.limit ? parseInt(queryParams.limit) : 20
    })

    const result = await crisisService.listIncidents(validatedParams)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
        { status: result.error.statusCode || 400 }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('GET /api/crisis/incidents error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const crisisService = new CrisisManagementService(supabase)
    const workflowService = new IncidentResponseWorkflowService(supabase)

    const body = await request.json()
    const validatedData = CreateIncidentSchema.parse(body)

    // Create incident
    const result = await crisisService.createIncident(validatedData)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
        { status: result.error.statusCode || 400 }
      )
    }

    const incident = result.data

    // Auto-trigger workflow if conditions are met
    if (incident.level === 'critical' || incident.level === 'high') {
      const workflowResult = await workflowService.detectAndClassifyIncident(
        incident.source,
        {
          incident_id: incident.id,
          title: incident.title,
          description: incident.description,
          category: incident.category,
          level: incident.level
        },
        { auto_trigger: true }
      )

      if (workflowResult.success) {
        // Include workflow execution info in response
        return NextResponse.json({
          incident: incident,
          workflow_execution: workflowResult.data.workflow_execution
        }, { status: 201 })
      }
    }

    return NextResponse.json(incident, { status: 201 })
  } catch (error) {
    console.error('POST /api/crisis/incidents error:', error)
    
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