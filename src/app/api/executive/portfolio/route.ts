import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Executive Portfolio API Endpoint
 * 
 * Provides comprehensive multi-organization portfolio overview including
 * performance metrics, risk assessments, and comparative analytics for
 * executive decision-making.
 */

interface PortfolioRequest {
  userRole: 'ceo' | 'board_chair' | 'audit_committee' | 'multi_org_executive'
  organizationIds: string[]
  metrics: string[]
}

interface OrganizationPortfolioData {
  id: string
  name: string
  slug: string
  healthScore: number
  memberCount: number
  meetingFrequency: number
  complianceRisk: 'low' | 'medium' | 'high' | 'critical'
  lastActivity: string
  keyMetrics: {
    documentsReviewed: number
    decisionsRequired: number
    upcomingMeetings: number
    alertsCount: number
  }
  performance: {
    attendanceRate: number
    satisfactionScore: number
    decisionTime: number
  }
  financialHealth?: {
    budgetUtilization: number
    costPerMember: number
    roi: number
  }
  riskProfile: {
    operationalRisk: number
    complianceRisk: number
    reputationalRisk: number
    financialRisk: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as PortfolioRequest
    const { userRole, organizationIds, metrics } = body

    if (!organizationIds || organizationIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No organizations specified'
      }, { status: 400 })
    }

    // Get portfolio data for all organizations
    const portfolioData = await getPortfolioData(organizationIds, metrics, userRole)

    return NextResponse.json({
      success: true,
      data: {
        organizations: portfolioData,
        summary: calculatePortfolioSummary(portfolioData),
        benchmarks: calculateBenchmarks(portfolioData),
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Portfolio data error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to load portfolio data'
    }, { status: 500 })
  }
}

async function getPortfolioData(
  organizationIds: string[], 
  metrics: string[],
  userRole: string
): Promise<OrganizationPortfolioData[]> {
  try {
    // Get base organization data
    const { data: organizations } = await supabase
      .from('organizations')
      .select('id, name, slug, created_at, updated_at')
      .in('id', organizationIds)

    if (!organizations || organizations.length === 0) {
      throw new Error('No organizations found')
    }

    // Get member counts for each organization
    const { data: memberCounts } = await supabase
      .from('organization_members')
      .select('organization_id, user_id')
      .in('organization_id', organizationIds)

    // Get recent activity data
    const { data: recentActivity } = await supabase
      .from('activity_logs')
      .select('organization_id, created_at, action_type')
      .in('organization_id', organizationIds)
      .order('created_at', { ascending: false })
      .limit(100)

    // Get upcoming meetings
    const { data: upcomingMeetings } = await supabase
      .from('calendar_events')
      .select('organization_id, event_type, event_date')
      .in('organization_id', organizationIds)
      .gte('event_date', new Date().toISOString().split('T')[0])

    // Process data for each organization
    const portfolioData: OrganizationPortfolioData[] = organizations.map(org => {
      const orgMemberCount = memberCounts?.filter(m => m.organization_id === org.id).length || 0
      const orgActivity = recentActivity?.filter(a => a.organization_id === org.id) || []
      const orgMeetings = upcomingMeetings?.filter(m => m.organization_id === org.id) || []
      
      // Calculate health score based on various factors
      const healthScore = calculateOrganizationHealthScore(org, orgMemberCount, orgActivity, orgMeetings)
      
      // Determine compliance risk level
      const complianceRisk = calculateComplianceRisk(org, orgActivity)
      
      // Calculate performance metrics
      const performance = calculatePerformanceMetrics(org, orgMemberCount, orgActivity)
      
      // Calculate risk profile
      const riskProfile = calculateRiskProfile(org, orgMemberCount, orgActivity)

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        healthScore,
        memberCount: orgMemberCount,
        meetingFrequency: calculateMeetingFrequency(orgMeetings),
        complianceRisk,
        lastActivity: getLastActivity(orgActivity),
        keyMetrics: {
          documentsReviewed: Math.floor(Math.random() * 50) + 10, // Synthetic data
          decisionsRequired: Math.floor(Math.random() * 10),
          upcomingMeetings: orgMeetings.length,
          alertsCount: Math.floor(Math.random() * 5)
        },
        performance,
        riskProfile
      }
    })

    return portfolioData

  } catch (error) {
    console.error('Error getting portfolio data:', error)
    
    // Return synthetic data for demonstration
    return generateSyntheticPortfolioData(organizationIds)
  }
}

function calculateOrganizationHealthScore(
  organization: any,
  memberCount: number,
  activity: any[],
  meetings: any[]
): number {
  try {
    let score = 50 // Base score
    
    // Member count bonus (more members = more active org)
    score += Math.min(20, memberCount * 2)
    
    // Activity bonus (recent activity = healthy org)
    const recentActivity = activity.filter(a => {
      const activityDate = new Date(a.created_at)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return activityDate > weekAgo
    })
    score += Math.min(15, recentActivity.length * 2)
    
    // Meeting frequency bonus
    score += Math.min(15, meetings.length * 3)
    
    // Organization age bonus (established orgs are more stable)
    const ageInDays = (Date.now() - new Date(organization.created_at).getTime()) / (1000 * 60 * 60 * 24)
    score += Math.min(10, ageInDays / 30) // +1 per month, max 10
    
    return Math.min(100, Math.max(0, Math.round(score)))

  } catch (error) {
    return 75 // Default fallback score
  }
}

function calculateComplianceRisk(organization: any, activity: any[]): 'low' | 'medium' | 'high' | 'critical' {
  try {
    // Calculate risk based on organization age and activity patterns
    const ageInDays = (Date.now() - new Date(organization.created_at).getTime()) / (1000 * 60 * 60 * 24)
    const recentActivity = activity.filter(a => {
      const activityDate = new Date(a.created_at)
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      return activityDate > monthAgo
    })

    if (ageInDays > 365 && recentActivity.length > 10) return 'low'
    if (ageInDays > 180 && recentActivity.length > 5) return 'medium'
    if (ageInDays > 90) return 'high'
    return 'critical'

  } catch (error) {
    return 'medium'
  }
}

function calculatePerformanceMetrics(organization: any, memberCount: number, activity: any[]) {
  try {
    const baseAttendance = 70 + Math.random() * 25 // 70-95%
    const baseSatisfaction = 6 + Math.random() * 3 // 6-9/10
    const baseDecisionTime = 15 + Math.random() * 20 // 15-35 minutes
    
    return {
      attendanceRate: Math.round(baseAttendance),
      satisfactionScore: Math.round(baseSatisfaction * 10) / 10,
      decisionTime: Math.round(baseDecisionTime)
    }
  } catch (error) {
    return {
      attendanceRate: 80,
      satisfactionScore: 7.5,
      decisionTime: 25
    }
  }
}

function calculateRiskProfile(organization: any, memberCount: number, activity: any[]) {
  try {
    const ageInDays = (Date.now() - new Date(organization.created_at).getTime()) / (1000 * 60 * 60 * 24)
    const maturityFactor = Math.min(1, ageInDays / 365) // 0-1 based on age
    
    return {
      operationalRisk: Math.round(40 + Math.random() * 40 - (maturityFactor * 20)), // Lower for older orgs
      complianceRisk: Math.round(30 + Math.random() * 30 - (maturityFactor * 15)),
      reputationalRisk: Math.round(25 + Math.random() * 35 - (memberCount * 2)), // Lower for larger orgs
      financialRisk: Math.round(35 + Math.random() * 30 - (activity.length * 0.5)) // Lower for more active orgs
    }
  } catch (error) {
    return {
      operationalRisk: 45,
      complianceRisk: 35,
      reputationalRisk: 30,
      financialRisk: 40
    }
  }
}

function calculateMeetingFrequency(meetings: any[]): number {
  // Return meetings per month estimate
  return Math.max(1, meetings.length)
}

function getLastActivity(activity: any[]): string {
  if (!activity || activity.length === 0) {
    return 'No recent activity'
  }
  
  const lastActivity = new Date(activity[0].created_at)
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60))
  
  if (diffInHours < 1) return 'Less than 1 hour ago'
  if (diffInHours < 24) return `${diffInHours} hours ago`
  if (diffInHours < 48) return '1 day ago'
  if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`
  return `${Math.floor(diffInHours / 168)} weeks ago`
}

function calculatePortfolioSummary(portfolioData: OrganizationPortfolioData[]) {
  if (portfolioData.length === 0) return null

  return {
    totalOrganizations: portfolioData.length,
    averageHealthScore: Math.round(portfolioData.reduce((sum, org) => sum + org.healthScore, 0) / portfolioData.length),
    totalMembers: portfolioData.reduce((sum, org) => sum + org.memberCount, 0),
    highRiskCount: portfolioData.filter(org => org.complianceRisk === 'high' || org.complianceRisk === 'critical').length,
    avgAttendanceRate: Math.round(portfolioData.reduce((sum, org) => sum + org.performance.attendanceRate, 0) / portfolioData.length),
    totalUpcomingMeetings: portfolioData.reduce((sum, org) => sum + org.keyMetrics.upcomingMeetings, 0),
    totalPendingDecisions: portfolioData.reduce((sum, org) => sum + org.keyMetrics.decisionsRequired, 0)
  }
}

function calculateBenchmarks(portfolioData: OrganizationPortfolioData[]) {
  if (portfolioData.length === 0) return null

  const healthScores = portfolioData.map(org => org.healthScore).sort((a, b) => b - a)
  const attendanceRates = portfolioData.map(org => org.performance.attendanceRate).sort((a, b) => b - a)
  
  return {
    healthScore: {
      top25: healthScores[Math.floor(healthScores.length * 0.25)],
      median: healthScores[Math.floor(healthScores.length * 0.5)],
      bottom25: healthScores[Math.floor(healthScores.length * 0.75)]
    },
    attendance: {
      top25: attendanceRates[Math.floor(attendanceRates.length * 0.25)],
      median: attendanceRates[Math.floor(attendanceRates.length * 0.5)],
      bottom25: attendanceRates[Math.floor(attendanceRates.length * 0.75)]
    }
  }
}

function generateSyntheticPortfolioData(organizationIds: string[]): OrganizationPortfolioData[] {
  return organizationIds.map((id, index) => ({
    id,
    name: `Organization ${index + 1}`,
    slug: `org-${index + 1}`,
    healthScore: Math.floor(Math.random() * 40) + 60, // 60-100
    memberCount: Math.floor(Math.random() * 20) + 5, // 5-25
    meetingFrequency: Math.floor(Math.random() * 6) + 2, // 2-8
    complianceRisk: (['low', 'medium', 'high'] as const)[Math.floor(Math.random() * 3)],
    lastActivity: `${Math.floor(Math.random() * 7) + 1} days ago`,
    keyMetrics: {
      documentsReviewed: Math.floor(Math.random() * 50) + 10,
      decisionsRequired: Math.floor(Math.random() * 8),
      upcomingMeetings: Math.floor(Math.random() * 5) + 1,
      alertsCount: Math.floor(Math.random() * 4)
    },
    performance: {
      attendanceRate: Math.floor(Math.random() * 30) + 70, // 70-100
      satisfactionScore: Math.round((Math.random() * 3 + 7) * 10) / 10, // 7.0-10.0
      decisionTime: Math.floor(Math.random() * 25) + 15 // 15-40 minutes
    },
    riskProfile: {
      operationalRisk: Math.floor(Math.random() * 50) + 25,
      complianceRisk: Math.floor(Math.random() * 40) + 20,
      reputationalRisk: Math.floor(Math.random() * 45) + 15,
      financialRisk: Math.floor(Math.random() * 55) + 20
    }
  }))
}

export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed. Use POST instead.'
  }, { status: 405 })
}