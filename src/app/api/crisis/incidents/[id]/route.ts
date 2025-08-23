import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { CrisisManagementService } from '@/lib/services/crisis-management.service'
import type { Database } from '@/types/database'
import { z } from 'zod'

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

interface RouteContext {
  params: { id: string }
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const crisisService = new CrisisManagementService(supabase)

    const result = await crisisService.getIncident(params.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
        { status: result.error.statusCode || 404 }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error(`GET /api/crisis/incidents/${params.id} error:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const crisisService = new CrisisManagementService(supabase)

    const body = await request.json()
    const validatedData = UpdateIncidentSchema.parse(body)

    const result = await crisisService.updateIncident(params.id, validatedData)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
        { status: result.error.statusCode || 400 }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error(`PUT /api/crisis/incidents/${params.id} error:`, error)
    
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

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Note: In a real crisis management system, incidents should rarely be deleted
    // Instead, they should be archived or marked as resolved
    const { error } = await supabase
      .from('crisis_incidents')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`DELETE /api/crisis/incidents/${params.id} error:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}