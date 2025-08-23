import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { CrisisPreparednessService } from '@/lib/services/crisis-preparedness.service'
import type { Database } from '@/types/database'
import { z } from 'zod'

const CreateScenarioSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1),
  category: z.enum(['operational', 'financial', 'regulatory', 'reputational', 'cybersecurity', 'legal', 'environmental', 'strategic']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  scenario_type: z.enum(['tabletop_exercise', 'functional_exercise', 'full_scale_exercise', 'walkthrough', 'simulation', 'stress_test']),
  complexity_level: z.enum(['basic', 'intermediate', 'advanced', 'expert']),
  estimated_duration_hours: z.number().min(0.5).max(24),
  participant_roles: z.array(z.string()).min(1),
  learning_objectives: z.array(z.object({
    objective: z.string(),
    skill_area: z.enum(['decision_making', 'communication', 'coordination', 'technical', 'leadership', 'compliance']),
    proficiency_level: z.enum(['awareness', 'basic', 'intermediate', 'advanced', 'expert']),
    measurable_outcome: z.string(),
    assessment_method: z.string()
  })).min(1),
  scenario_narrative: z.object({
    background: z.string().min(1),
    context_setting: z.object({
      location: z.string(),
      time_of_day: z.string(),
      day_of_week: z.string(),
      season: z.string(),
      external_conditions: z.array(z.string()),
      organizational_state: z.string()
    }),
    initial_conditions: z.array(z.string()),
    escalation_factors: z.array(z.string()),
    complicating_factors: z.array(z.string()),
    resolution_paths: z.array(z.string())
  })
})

const ScheduleExerciseSchema = z.object({
  scenario_id: z.string().uuid(),
  session_name: z.string().min(1).max(200),
  session_description: z.string().optional(),
  scheduled_start: z.string().datetime(),
  scheduled_end: z.string().datetime(),
  facilitators: z.array(z.string().uuid()).min(1),
  participants: z.array(z.object({
    user_id: z.string().uuid(),
    assigned_role: z.string(),
    simulation_role: z.string().optional(),
    participation_level: z.enum(['full', 'observer', 'evaluator', 'support'])
  })).min(1),
  observers: z.array(z.string().uuid()).optional()
})

const ListScenariosSchema = z.object({
  category: z.array(z.enum(['operational', 'financial', 'regulatory', 'reputational', 'cybersecurity', 'legal', 'environmental', 'strategic'])).optional(),
  severity: z.array(z.enum(['low', 'medium', 'high', 'critical'])).optional(),
  scenario_type: z.array(z.enum(['tabletop_exercise', 'functional_exercise', 'full_scale_exercise', 'walkthrough', 'simulation', 'stress_test'])).optional(),
  complexity_level: z.array(z.enum(['basic', 'intermediate', 'advanced', 'expert'])).optional(),
  tags: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
})

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })

    // Parse query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    
    // Convert array parameters
    ['category', 'severity', 'scenario_type', 'complexity_level', 'tags'].forEach(param => {
      if (queryParams[param]) {
        queryParams[param] = queryParams[param].split(',')
      }
    })

    const validatedParams = ListScenariosSchema.parse({
      ...queryParams,
      is_active: queryParams.is_active === 'true' ? true : queryParams.is_active === 'false' ? false : undefined,
      page: queryParams.page ? parseInt(queryParams.page) : 1,
      limit: queryParams.limit ? parseInt(queryParams.limit) : 20
    })

    // Build query
    let query = supabase
      .from('crisis_scenarios')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filters
    if (validatedParams.category) {
      query = query.in('category', validatedParams.category)
    }
    if (validatedParams.severity) {
      query = query.in('severity', validatedParams.severity)
    }
    if (validatedParams.scenario_type) {
      query = query.in('scenario_type', validatedParams.scenario_type)
    }
    if (validatedParams.complexity_level) {
      query = query.in('complexity_level', validatedParams.complexity_level)
    }
    if (validatedParams.is_active !== undefined) {
      query = query.eq('is_active', validatedParams.is_active)
    }
    if (validatedParams.tags && validatedParams.tags.length > 0) {
      query = query.overlaps('tags', validatedParams.tags)
    }

    // Pagination
    const from = (validatedParams.page - 1) * validatedParams.limit
    const to = from + validatedParams.limit - 1
    query = query.range(from, to)

    // Get count for pagination
    const { count } = await supabase
      .from('crisis_scenarios')
      .select('*', { count: 'exact', head: true })

    const { data: scenarios, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    const totalPages = Math.ceil((count || 0) / validatedParams.limit)

    return NextResponse.json({
      scenarios,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total: count || 0,
        totalPages,
        hasNext: validatedParams.page < totalPages,
        hasPrev: validatedParams.page > 1
      }
    })
  } catch (error) {
    console.error('GET /api/crisis/scenarios error:', error)
    
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
    const preparednessService = new CrisisPreparednessService(supabase)

    const body = await request.json()

    // Check if this is a scenario creation or exercise scheduling request
    if (body.scenario_id) {
      // This is an exercise scheduling request
      const validatedData = ScheduleExerciseSchema.parse(body)
      const result = await preparednessService.scheduleExercise(validatedData)

      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: result.error.statusCode || 400 }
        )
      }

      return NextResponse.json(result.data, { status: 201 })
    } else {
      // This is a scenario creation request
      const validatedData = CreateScenarioSchema.parse(body)
      const result = await preparednessService.createScenario(validatedData)

      if (!result.success) {
        return NextResponse.json(
          { error: result.error.message },
          { status: result.error.statusCode || 400 }
        )
      }

      return NextResponse.json(result.data, { status: 201 })
    }
  } catch (error) {
    console.error('POST /api/crisis/scenarios error:', error)
    
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