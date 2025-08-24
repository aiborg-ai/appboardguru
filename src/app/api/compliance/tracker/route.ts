/**
 * Compliance Tracker API - Main Dashboard Endpoint
 * Provides comprehensive compliance tracking data and dashboard information
 */

import { NextRequest, NextResponse } from 'next/server'
import { ComplianceRepository } from '@/lib/repositories/compliance.repository.enhanced'
import { ComplianceDashboardData } from '@/types/compliance'

const complianceRepo = new ComplianceRepository()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json(
        { success: false, message: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Get comprehensive dashboard data
    const [
      frameworks,
      assessments,
      findings,
      remediationPlans,
      policies,
      metrics,
      alerts
    ] = await Promise.all([
      complianceRepo.getFrameworks(organizationId),
      complianceRepo.getAssessments(organizationId),
      complianceRepo.getFindings(organizationId),
      complianceRepo.getRemediationPlans(organizationId),
      complianceRepo.getPolicies(organizationId),
      complianceRepo.getComplianceMetrics(organizationId),
      complianceRepo.getAlerts(organizationId, true) // Unread only
    ])

    // Calculate dashboard summary
    const activeAssessments = assessments.filter(a => a.status === 'in-progress').length
    const openFindings = findings.filter(f => f.status !== 'compliant').length
    const overdueTasks = remediationPlans.filter(plan => {
      const targetDate = new Date(plan.targetDate)
      return targetDate < new Date() && plan.status !== 'completed'
    }).length

    // Recent activity (last 10 items)
    const recentActivity = [
      ...assessments.slice(0, 3).map(a => ({
        type: 'assessment' as const,
        title: a.name,
        status: a.status,
        date: a.updatedAt,
        user: a.assessor.name
      })),
      ...findings.slice(0, 3).map(f => ({
        type: 'finding' as const,
        title: f.title,
        status: f.status,
        date: f.updatedAt,
        user: f.assignedTo || 'Unassigned'
      })),
      ...remediationPlans.slice(0, 2).map(r => ({
        type: 'remediation' as const,
        title: r.title,
        status: r.status,
        date: r.updatedAt,
        user: r.assignedTo
      })),
      ...policies.slice(0, 2).map(p => ({
        type: 'policy' as const,
        title: p.name,
        status: p.status,
        date: p.updatedAt,
        user: p.createdBy
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)

    const dashboardData: ComplianceDashboardData = {
      summary: {
        totalFrameworks: frameworks.length,
        activeAssessments,
        openFindings,
        overdueTasks
      },
      metrics,
      recentActivity,
      alerts
    }

    return NextResponse.json({
      success: true,
      message: 'Compliance dashboard data retrieved successfully',
      data: dashboardData
    })

  } catch (error) {
    console.error('Compliance tracker error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch compliance data',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, organizationId, ...data } = body

    if (!organizationId) {
      return NextResponse.json(
        { success: false, message: 'Organization ID is required' },
        { status: 400 }
      )
    }

    let result

    switch (type) {
      case 'framework':
        result = await complianceRepo.createFramework({
          ...data,
          organizationId,
          isActive: true,
          createdBy: data.createdBy || 'system'
        })
        break

      case 'assessment':
        result = await complianceRepo.createAssessment(
          data,
          organizationId,
          data.createdBy || 'system'
        )
        break

      case 'finding':
        result = await complianceRepo.createFinding({
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        break

      case 'remediation':
        result = await complianceRepo.createRemediationPlan(data)
        break

      case 'policy':
        result = await complianceRepo.createPolicy({
          ...data,
          organizationId,
          createdBy: data.createdBy || 'system'
        })
        break

      case 'alert':
        result = await complianceRepo.createAlert({
          ...data,
          organizationId
        })
        break

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid type specified' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message: `${type} created successfully`,
      data: result
    })

  } catch (error) {
    console.error('Compliance creation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: `Failed to create ${request.headers.get('type')}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}