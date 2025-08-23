/**
 * Skills Matrix Analytics API
 * 
 * Provides endpoints for skills analysis, gap identification, succession planning,
 * and competency management.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { BoardAnalyticsService } from '../../../../lib/services/board-analytics.service'
import { BoardAnalyticsRepository } from '../../../../lib/repositories/board-analytics.repository'
import { createAPIHandler } from '../../../../lib/api/createAPIHandler'
import { z } from 'zod'

// Validation schemas
const SkillsMatrixRequestSchema = z.object({
  organizationId: z.string().uuid(),
  filters: z.object({
    skill_categories: z.array(z.string()).optional(),
    member_ids: z.array(z.string().uuid()).optional(),
    min_skill_level: z.number().min(1).max(10).optional(),
    verification_status: z.enum(['all', 'verified', 'unverified']).optional()
  }).optional(),
  metrics: z.array(z.string()).optional()
})

const SkillUpdateSchema = z.object({
  user_id: z.string().uuid(),
  skill_id: z.string().uuid(),
  level: z.number().min(1).max(10),
  verified: z.boolean().optional(),
  verification_method: z.enum(['self_assessed', 'peer_verified', 'certified', 'tested']).optional(),
  verifier_id: z.string().uuid().optional(),
  certifying_body: z.string().optional(),
  certificate_url: z.string().url().optional(),
  expiry_date: z.string().optional(),
  development_plan: z.string().optional()
})

const NewSkillSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(['technical', 'business', 'leadership', 'governance', 'domain']),
  description: z.string().optional(),
  industry: z.string().optional(),
  importance_level: z.number().min(1).max(10)
})

const SkillDevelopmentSchema = z.object({
  user_id: z.string().uuid(),
  skill_id: z.string().uuid(),
  development_type: z.enum(['training', 'mentoring', 'project', 'certification']),
  development_title: z.string().min(1),
  development_description: z.string().optional(),
  start_date: z.string(),
  target_completion_date: z.string().optional(),
  cost: z.number().min(0).optional(),
  provider: z.string().optional(),
  expected_skill_improvement: z.number().min(1).max(10).optional()
})

export const POST = createAPIHandler({
  requireAuth: true,
  handler: async (req: NextRequest) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const analyticsService = new BoardAnalyticsService(supabase)
    const analyticsRepository = new BoardAnalyticsRepository(supabase)

    try {
      const body = await req.json()
      const validatedData = SkillsMatrixRequestSchema.parse(body)

      const { organizationId, filters, metrics } = validatedData

      // Check authentication and permissions
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      const { data: membership } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!membership) {
        return NextResponse.json(
          { error: 'Access denied to organization' },
          { status: 403 }
        )
      }

      // Generate skills matrix analysis
      const results: Record<string, any> = {}

      if (!metrics || metrics.includes('skills_summary')) {
        const skillsResult = await analyticsService.generateSkillsMatrixAnalysis(organizationId)
        
        if (skillsResult.success) {
          results.skillsMatrix = skillsResult.data
        } else {
          console.error('Failed to generate skills matrix:', skillsResult.error)
        }
      }

      if (!metrics || metrics.includes('skills_aggregations')) {
        const aggregationsResult = await analyticsRepository.getSkillsAggregations(
          organizationId,
          filters
        )
        
        if (aggregationsResult.success) {
          results.aggregations = aggregationsResult.data
        }
      }

      if (!metrics || metrics.includes('gap_analysis')) {
        // Get detailed gap analysis
        if (results.skillsMatrix?.skill_gaps) {
          results.gapAnalysis = {
            critical_gaps: results.skillsMatrix.skill_gaps.filter((gap: any) => gap.gap_severity === 'critical'),
            high_priority_gaps: results.skillsMatrix.skill_gaps.filter((gap: any) => gap.gap_severity === 'high'),
            recommendations: results.skillsMatrix.recommendations,
            estimated_cost: calculateDevelopmentCosts(results.skillsMatrix.recommendations)
          }
        }
      }

      if (!metrics || metrics.includes('succession_planning')) {
        // Include succession planning data
        if (results.skillsMatrix?.succession_planning) {
          results.successionPlanning = {
            ...results.skillsMatrix.succession_planning,
            risk_summary: calculateSuccessionRiskSummary(results.skillsMatrix.succession_planning)
          }
        }
      }

      if (!metrics || metrics.includes('diversity_analysis')) {
        // Include diversity analysis
        if (results.skillsMatrix?.diversity_analysis) {
          results.diversityAnalysis = results.skillsMatrix.diversity_analysis
        }
      }

      // Calculate summary statistics
      if (results.skillsMatrix) {
        const skills = results.skillsMatrix as any
        
        results.summary = {
          totalSkills: Object.values(skills.current_skills || {}).reduce(
            (sum: number, category: any) => sum + Object.keys(category).length, 0
          ),
          totalSkillAssignments: Object.values(skills.current_skills || {}).reduce(
            (sum: number, category: any) => sum + Object.values(category).reduce(
              (catSum: number, members: any) => catSum + members.length, 0
            ), 0
          ),
          criticalGaps: skills.skill_gaps?.filter((gap: any) => gap.gap_severity === 'critical').length || 0,
          highRiskSuccessions: skills.succession_planning?.critical_roles?.filter(
            (role: any) => role.succession_risk === 'critical'
          ).length || 0,
          averageSkillLevel: calculateAverageSkillLevel(skills.current_skills),
          skillDistribution: calculateSkillDistribution(skills.current_skills)
        }
      }

      // Save analytics snapshot
      await analyticsRepository.saveAnalyticsSnapshot({
        snapshot_date: new Date().toISOString(),
        organization_id: organizationId,
        metric_type: 'skills_matrix',
        metric_value: results,
        metadata: {
          requested_metrics: metrics,
          filters: filters,
          user_id: user.id
        }
      })

      return NextResponse.json({
        success: true,
        data: results,
        timestamp: new Date().toISOString(),
        organizationId
      })

    } catch (error) {
      console.error('Skills matrix analytics error:', error)
      
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Invalid request data', 
            details: error.errors 
          },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
})

export const PUT = createAPIHandler({
  requireAuth: true,
  handler: async (req: NextRequest) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
      const body = await req.json()
      const validatedData = SkillUpdateSchema.parse(body)

      const { user_id, skill_id, level, verified, verification_method, verifier_id, certifying_body, certificate_url, expiry_date, development_plan } = validatedData

      // Check authentication
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Check permissions - user can update their own skills or admin can update any
      let canUpdate = user.id === user_id

      if (!canUpdate) {
        // Check if user has admin access to the organization
        const { data: memberOrg } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user_id)
          .eq('status', 'active')
          .single()

        if (memberOrg) {
          const { data: membership } = await supabase
            .from('organization_members')
            .select('role')
            .eq('organization_id', memberOrg.organization_id)
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single()

          canUpdate = membership && ['owner', 'admin'].includes(membership.role)
        }
      }

      if (!canUpdate) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      // Verify skill exists
      const { data: skill, error: skillError } = await supabase
        .from('skills')
        .select('id, name, category')
        .eq('id', skill_id)
        .single()

      if (skillError || !skill) {
        return NextResponse.json(
          { error: 'Skill not found' },
          { status: 404 }
        )
      }

      // Update user skill
      const skillUpdate: any = {
        user_id,
        skill_id,
        level,
        last_updated: new Date().toISOString()
      }

      if (verified !== undefined) skillUpdate.verified = verified
      if (verification_method) skillUpdate.verification_method = verification_method
      if (verifier_id) skillUpdate.verifier_id = verifier_id
      if (certifying_body) skillUpdate.certifying_body = certifying_body
      if (certificate_url) skillUpdate.certificate_url = certificate_url
      if (expiry_date) skillUpdate.expiry_date = expiry_date
      if (development_plan) skillUpdate.development_plan = development_plan

      // If verified by someone else, mark as verified and set validation date
      if (verifier_id && verifier_id !== user_id) {
        skillUpdate.verified = true
        skillUpdate.last_validated = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('user_skills')
        .upsert(skillUpdate)
        .select(`
          *,
          skills(name, category),
          users!user_id(full_name)
        `)

      if (error) {
        throw error
      }

      // Update performance metrics
      const { data: memberOrg } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user_id)
        .eq('status', 'active')
        .single()

      if (memberOrg) {
        await supabase
          .from('performance_metrics')
          .upsert({
            organization_id: memberOrg.organization_id,
            user_id: user_id,
            metric_category: 'skills',
            metric_name: `${skill.category}_skill_level`,
            metric_value: level,
            measurement_period: 'current',
            measurement_date: new Date().toISOString().split('T')[0],
            metadata: { 
              skill_id,
              skill_name: skill.name,
              updated_by: user.id,
              verified: verified || false
            }
          })
      }

      return NextResponse.json({
        success: true,
        message: 'Skill updated successfully',
        data: data?.[0],
        skillName: skill.name,
        skillCategory: skill.category,
        newLevel: level
      })

    } catch (error) {
      console.error('Skill update error:', error)
      
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Invalid request data', 
            details: error.errors 
          },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
})

// POST endpoint for creating new skills
export const PATCH = createAPIHandler({
  requireAuth: true,
  handler: async (req: NextRequest) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
      const body = await req.json()
      const validatedData = NewSkillSchema.parse(body)

      const { name, category, description, industry, importance_level } = validatedData

      // Check authentication
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Check if user is admin in any organization (skills are global)
      const { data: adminMemberships } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin'])
        .eq('status', 'active')

      if (!adminMemberships?.length) {
        return NextResponse.json(
          { error: 'Admin privileges required' },
          { status: 403 }
        )
      }

      // Check if skill already exists
      const { data: existingSkill } = await supabase
        .from('skills')
        .select('id, name')
        .eq('name', name)
        .eq('category', category)
        .single()

      if (existingSkill) {
        return NextResponse.json(
          { error: 'Skill already exists', existingSkill },
          { status: 409 }
        )
      }

      // Create new skill
      const { data, error } = await supabase
        .from('skills')
        .insert({
          name,
          category,
          description,
          industry,
          importance_level
        })
        .select()

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        message: 'Skill created successfully',
        data: data?.[0]
      })

    } catch (error) {
      console.error('Skill creation error:', error)
      
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Invalid request data', 
            details: error.errors 
          },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
})

// POST endpoint for skill development tracking
export const OPTIONS = createAPIHandler({
  requireAuth: true,
  handler: async (req: NextRequest) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
      const body = await req.json()
      const validatedData = SkillDevelopmentSchema.parse(body)

      const { user_id, skill_id, development_type, development_title, development_description, start_date, target_completion_date, cost, provider, expected_skill_improvement } = validatedData

      // Check authentication
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Check permissions
      let canCreate = user.id === user_id

      if (!canCreate) {
        const { data: memberOrg } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user_id)
          .eq('status', 'active')
          .single()

        if (memberOrg) {
          const { data: membership } = await supabase
            .from('organization_members')
            .select('role')
            .eq('organization_id', memberOrg.organization_id)
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single()

          canCreate = membership && ['owner', 'admin'].includes(membership.role)
        }
      }

      if (!canCreate) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      // Create skill development record
      const { data, error } = await supabase
        .from('skill_developments')
        .insert({
          user_id,
          skill_id,
          development_type,
          development_title,
          development_description,
          start_date,
          target_completion_date,
          cost,
          provider,
          skill_improvement_level: expected_skill_improvement
        })
        .select(`
          *,
          skills(name, category),
          users!user_id(full_name)
        `)

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        message: 'Skill development plan created successfully',
        data: data?.[0]
      })

    } catch (error) {
      console.error('Skill development creation error:', error)
      
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Invalid request data', 
            details: error.errors 
          },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
})

// Helper functions
function calculateDevelopmentCosts(recommendations: any[]): number {
  return recommendations.reduce((total, rec) => {
    // Estimate costs based on recommendation type
    const baseCosts = {
      hire: 150000, // Average board member compensation
      develop: 25000, // Training and development costs
      redistribute: 5000, // Internal reorganization costs
      external_advisor: 75000 // External advisor fees
    }
    
    return total + (baseCosts[rec.type as keyof typeof baseCosts] || 0)
  }, 0)
}

function calculateSuccessionRiskSummary(successionPlanning: any) {
  const risks = successionPlanning.critical_roles?.reduce((acc: any, role: any) => {
    acc[role.succession_risk] = (acc[role.succession_risk] || 0) + 1
    return acc
  }, {}) || {}

  return {
    total_roles: successionPlanning.critical_roles?.length || 0,
    risk_distribution: risks,
    average_readiness_time: successionPlanning.development_plans?.reduce(
      (sum: number, plan: any) => sum + plan.timeline_months, 0
    ) / (successionPlanning.development_plans?.length || 1),
    immediate_actions_needed: successionPlanning.critical_roles?.filter(
      (role: any) => role.succession_risk === 'critical' && role.backup_candidates.length === 0
    ).length || 0
  }
}

function calculateAverageSkillLevel(currentSkills: any): number {
  let totalLevels = 0
  let totalSkills = 0

  Object.values(currentSkills || {}).forEach((category: any) => {
    Object.values(category).forEach((members: any) => {
      members.forEach((member: any) => {
        totalLevels += member.level
        totalSkills++
      })
    })
  })

  return totalSkills > 0 ? Math.round((totalLevels / totalSkills) * 10) / 10 : 0
}

function calculateSkillDistribution(currentSkills: any) {
  const distribution: Record<string, number> = {}

  Object.entries(currentSkills || {}).forEach(([category, skills]: [string, any]) => {
    distribution[category] = Object.values(skills).reduce(
      (sum: number, members: any) => sum + members.length, 0
    )
  })

  return distribution
}