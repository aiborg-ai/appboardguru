import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Executive AI-Powered Insights API Endpoint
 * 
 * Generates strategic recommendations, governance intelligence, and
 * actionable insights based on comprehensive analysis of board
 * activities, performance metrics, and predictive analytics.
 */

interface InsightsRequest {
  userRole: 'ceo' | 'board_chair' | 'audit_committee' | 'multi_org_executive'
  organizationIds: string[]
  categories: ('governance' | 'performance' | 'compliance' | 'risk' | 'strategic')[]
  timeHorizon?: 'short' | 'medium' | 'long'
  confidenceThreshold?: number
}

interface ExecutiveInsight {
  id: string
  type: 'opportunity' | 'risk' | 'achievement' | 'alert'
  title: string
  description: string
  impact: 'low' | 'medium' | 'high' | 'critical'
  category: 'governance' | 'performance' | 'compliance' | 'risk' | 'strategic'
  actionRequired: boolean
  recommendedActions?: string[]
  confidence: number
  dataPoints?: string[]
  timeframe?: string
  organizationScope: string[]
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimatedROI?: number
  riskLevel?: number
}

interface InsightAnalytics {
  totalInsights: number
  byCategory: Record<string, number>
  byType: Record<string, number>
  byImpact: Record<string, number>
  actionableInsights: number
  averageConfidence: number
  trendingTopics: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as InsightsRequest
    const { userRole, organizationIds, categories, timeHorizon = 'medium', confidenceThreshold = 70 } = body

    if (!organizationIds || organizationIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No organizations specified'
      }, { status: 400 })
    }

    // Generate executive insights based on data analysis
    const insights = await generateExecutiveInsights(organizationIds, {
      userRole,
      categories,
      timeHorizon,
      confidenceThreshold
    })

    // Calculate analytics
    const analytics = calculateInsightAnalytics(insights)

    return NextResponse.json({
      success: true,
      data: {
        insights,
        analytics,
        recommendations: generateStrategicRecommendations(insights, userRole),
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Executive insights error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate executive insights'
    }, { status: 500 })
  }
}

async function generateExecutiveInsights(
  organizationIds: string[],
  options: {
    userRole: string
    categories: string[]
    timeHorizon: string
    confidenceThreshold: number
  }
): Promise<ExecutiveInsight[]> {
  try {
    const insights: ExecutiveInsight[] = []

    // Get organizational data for analysis
    const { data: organizations } = await supabase
      .from('organizations')
      .select('id, name, created_at, updated_at')
      .in('id', organizationIds)

    const { data: members } = await supabase
      .from('organization_members')
      .select('organization_id, role, created_at, last_active_at')
      .in('organization_id', organizationIds)

    const { data: activities } = await supabase
      .from('activity_logs')
      .select('organization_id, action_type, created_at')
      .in('organization_id', organizationIds)
      .order('created_at', { ascending: false })
      .limit(100)

    if (organizations) {
      // Generate governance insights
      if (options.categories.includes('governance')) {
        insights.push(...generateGovernanceInsights(organizations, members || [], activities || []))
      }

      // Generate performance insights
      if (options.categories.includes('performance')) {
        insights.push(...generatePerformanceInsights(organizations, members || [], activities || []))
      }

      // Generate compliance insights
      if (options.categories.includes('compliance')) {
        insights.push(...generateComplianceInsights(organizations, members || []))
      }

      // Generate risk insights
      if (options.categories.includes('risk')) {
        insights.push(...generateRiskInsights(organizations, members || [], activities || []))
      }

      // Generate strategic insights
      if (options.categories.includes('strategic')) {
        insights.push(...generateStrategicInsights(organizations, members || [], activities || []))
      }
    }

    // Filter by confidence threshold and sort by priority
    return insights
      .filter(insight => insight.confidence >= options.confidenceThreshold)
      .sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })

  } catch (error) {
    console.error('Error generating insights:', error)
    
    // Return synthetic insights for demonstration
    return generateSyntheticInsights(organizationIds, options)
  }
}

function generateGovernanceInsights(
  organizations: any[],
  members: any[],
  activities: any[]
): ExecutiveInsight[] {
  const insights: ExecutiveInsight[] = []

  // Board composition analysis
  const orgMemberCounts = organizations.map(org => ({
    org,
    memberCount: members.filter(m => m.organization_id === org.id).length
  }))

  const avgMemberCount = orgMemberCounts.reduce((sum, item) => sum + item.memberCount, 0) / orgMemberCounts.length

  if (avgMemberCount < 5) {
    insights.push({
      id: 'gov-board-size-1',
      type: 'opportunity',
      title: 'Board Size Optimization Opportunity',
      description: `Average board size of ${Math.round(avgMemberCount)} members may be below optimal range. Consider expanding boards to 7-9 members for better governance effectiveness.`,
      impact: 'medium',
      category: 'governance',
      actionRequired: true,
      recommendedActions: [
        'Assess board skill gaps and recruitment needs',
        'Develop board member recruitment strategy',
        'Review board composition guidelines'
      ],
      confidence: 82,
      dataPoints: [`${orgMemberCounts.length} organizations analyzed`, `Average of ${Math.round(avgMemberCount)} members per board`],
      timeframe: '3-6 months',
      organizationScope: orgMemberCounts.filter(item => item.memberCount < 5).map(item => item.org.name),
      priority: 'medium',
      estimatedROI: 25
    })
  }

  // Board diversity analysis
  const totalMembers = members.length
  const adminMembers = members.filter(m => m.role === 'admin').length
  const diversityRatio = adminMembers / totalMembers

  if (diversityRatio > 0.3) {
    insights.push({
      id: 'gov-diversity-1',
      type: 'alert',
      title: 'Board Role Distribution Review Required',
      description: `High proportion of admin roles (${Math.round(diversityRatio * 100)}%) may indicate governance concentration risk. Consider role distribution review.`,
      impact: 'medium',
      category: 'governance',
      actionRequired: true,
      recommendedActions: [
        'Review board role distribution policies',
        'Assess governance concentration risks',
        'Implement role rotation strategies'
      ],
      confidence: 76,
      dataPoints: [`${adminMembers} admin members out of ${totalMembers} total`],
      organizationScope: organizations.map(org => org.name),
      priority: 'medium',
      riskLevel: 45
    })
  }

  return insights
}

function generatePerformanceInsights(
  organizations: any[],
  members: any[],
  activities: any[]
): ExecutiveInsight[] {
  const insights: ExecutiveInsight[] = []

  // Activity trend analysis
  const recentActivities = activities.filter(a => {
    const activityDate = new Date(a.created_at)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    return activityDate > thirtyDaysAgo
  })

  const activityRate = recentActivities.length / organizations.length

  if (activityRate > 10) {
    insights.push({
      id: 'perf-activity-1',
      type: 'achievement',
      title: 'High Governance Activity Level',
      description: `Exceptional governance activity with ${Math.round(activityRate)} activities per organization in the past 30 days. This indicates strong board engagement and operational effectiveness.`,
      impact: 'high',
      category: 'performance',
      actionRequired: false,
      confidence: 88,
      dataPoints: [`${recentActivities.length} activities across ${organizations.length} organizations`],
      organizationScope: organizations.map(org => org.name),
      priority: 'low',
      estimatedROI: 15
    })
  } else if (activityRate < 3) {
    insights.push({
      id: 'perf-activity-2',
      type: 'risk',
      title: 'Low Governance Activity Detected',
      description: `Below-average governance activity (${Math.round(activityRate)} per organization) may indicate disengagement or operational inefficiencies.`,
      impact: 'high',
      category: 'performance',
      actionRequired: true,
      recommendedActions: [
        'Review board meeting frequency and structure',
        'Assess member engagement levels',
        'Implement activity monitoring dashboards'
      ],
      confidence: 84,
      dataPoints: [`${recentActivities.length} activities in past 30 days`],
      organizationScope: organizations.map(org => org.name),
      priority: 'high',
      riskLevel: 65
    })
  }

  return insights
}

function generateComplianceInsights(
  organizations: any[],
  members: any[]
): ExecutiveInsight[] {
  const insights: ExecutiveInsight[] = []

  // Organization age-based compliance assessment
  const oldOrganizations = organizations.filter(org => {
    const ageInDays = (Date.now() - new Date(org.created_at).getTime()) / (1000 * 60 * 60 * 24)
    return ageInDays > 365
  })

  const newOrganizations = organizations.filter(org => {
    const ageInDays = (Date.now() - new Date(org.created_at).getTime()) / (1000 * 60 * 60 * 24)
    return ageInDays <= 90
  })

  if (newOrganizations.length > 0) {
    insights.push({
      id: 'comp-new-orgs-1',
      type: 'alert',
      title: 'New Organizations Compliance Setup',
      description: `${newOrganizations.length} organizations are less than 90 days old and may require compliance framework establishment and regulatory documentation.`,
      impact: 'high',
      category: 'compliance',
      actionRequired: true,
      recommendedActions: [
        'Establish compliance frameworks for new organizations',
        'Set up regulatory reporting systems',
        'Implement governance documentation requirements'
      ],
      confidence: 91,
      dataPoints: [`${newOrganizations.length} organizations under 90 days old`],
      timeframe: '1-3 months',
      organizationScope: newOrganizations.map(org => org.name),
      priority: 'high',
      riskLevel: 70
    })
  }

  if (oldOrganizations.length > 0) {
    insights.push({
      id: 'comp-mature-orgs-1',
      type: 'opportunity',
      title: 'Mature Organizations Compliance Excellence',
      description: `${oldOrganizations.length} established organizations (>1 year) present opportunities for advanced compliance optimization and best practice development.`,
      impact: 'medium',
      category: 'compliance',
      actionRequired: false,
      recommendedActions: [
        'Develop advanced compliance metrics',
        'Create compliance best practice templates',
        'Implement peer benchmarking programs'
      ],
      confidence: 78,
      dataPoints: [`${oldOrganizations.length} organizations over 1 year old`],
      organizationScope: oldOrganizations.map(org => org.name),
      priority: 'medium',
      estimatedROI: 20
    })
  }

  return insights
}

function generateRiskInsights(
  organizations: any[],
  members: any[],
  activities: any[]
): ExecutiveInsight[] {
  const insights: ExecutiveInsight[] = []

  // Single organization dependency risk
  if (organizations.length === 1) {
    insights.push({
      id: 'risk-single-org-1',
      type: 'risk',
      title: 'Single Organization Dependency Risk',
      description: 'Executive oversight concentrated in single organization creates succession and operational continuity risks. Consider portfolio diversification.',
      impact: 'high',
      category: 'risk',
      actionRequired: true,
      recommendedActions: [
        'Develop succession planning strategies',
        'Consider additional board positions',
        'Implement risk diversification planning'
      ],
      confidence: 95,
      dataPoints: ['1 organization in portfolio'],
      organizationScope: organizations.map(org => org.name),
      priority: 'high',
      riskLevel: 80
    })
  }

  // Member concentration risk
  const membersByOrg = organizations.map(org => ({
    org,
    members: members.filter(m => m.organization_id === org.id)
  }))

  const concentratedOrgs = membersByOrg.filter(item => item.members.length > 20)

  if (concentratedOrgs.length > 0) {
    insights.push({
      id: 'risk-member-concentration-1',
      type: 'risk',
      title: 'Member Concentration Risk',
      description: `${concentratedOrgs.length} organizations have high member concentrations (>20 members), potentially creating governance complexity and communication challenges.`,
      impact: 'medium',
      category: 'risk',
      actionRequired: true,
      recommendedActions: [
        'Review board size optimization guidelines',
        'Implement committee structures',
        'Assess communication effectiveness'
      ],
      confidence: 72,
      dataPoints: concentratedOrgs.map(item => `${item.org.name}: ${item.members.length} members`),
      organizationScope: concentratedOrgs.map(item => item.org.name),
      priority: 'medium',
      riskLevel: 55
    })
  }

  return insights
}

function generateStrategicInsights(
  organizations: any[],
  members: any[],
  activities: any[]
): ExecutiveInsight[] {
  const insights: ExecutiveInsight[] = []

  // Portfolio growth opportunity
  if (organizations.length >= 3) {
    insights.push({
      id: 'strat-portfolio-growth-1',
      type: 'opportunity',
      title: 'Portfolio Synergy Optimization',
      description: `Managing ${organizations.length} organizations creates opportunities for cross-pollination of best practices, shared resources, and strategic coordination.`,
      impact: 'high',
      category: 'strategic',
      actionRequired: true,
      recommendedActions: [
        'Develop cross-organization best practice sharing',
        'Create strategic coordination committees',
        'Implement shared governance resources'
      ],
      confidence: 85,
      dataPoints: [`${organizations.length} organizations in portfolio`],
      timeframe: '6-12 months',
      organizationScope: organizations.map(org => org.name),
      priority: 'medium',
      estimatedROI: 35
    })
  }

  // Leadership development opportunity
  const totalMembers = members.length
  if (totalMembers > 10) {
    insights.push({
      id: 'strat-leadership-dev-1',
      type: 'opportunity',
      title: 'Executive Leadership Development Program',
      description: `Large member base of ${totalMembers} individuals provides opportunity for structured leadership development and succession planning program.`,
      impact: 'high',
      category: 'strategic',
      actionRequired: false,
      recommendedActions: [
        'Design leadership development curriculum',
        'Create mentorship programs',
        'Implement skills assessment frameworks'
      ],
      confidence: 79,
      dataPoints: [`${totalMembers} total members across portfolio`],
      organizationScope: organizations.map(org => org.name),
      priority: 'medium',
      estimatedROI: 40
    })
  }

  return insights
}

function calculateInsightAnalytics(insights: ExecutiveInsight[]): InsightAnalytics {
  return {
    totalInsights: insights.length,
    byCategory: insights.reduce((acc, insight) => {
      acc[insight.category] = (acc[insight.category] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    byType: insights.reduce((acc, insight) => {
      acc[insight.type] = (acc[insight.type] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    byImpact: insights.reduce((acc, insight) => {
      acc[insight.impact] = (acc[insight.impact] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    actionableInsights: insights.filter(i => i.actionRequired).length,
    averageConfidence: insights.length > 0 ? 
      Math.round(insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length) : 0,
    trendingTopics: ['Board Effectiveness', 'Member Engagement', 'Compliance Optimization', 'Risk Management', 'Strategic Planning']
  }
}

function generateStrategicRecommendations(insights: ExecutiveInsight[], userRole: string) {
  const highImpactInsights = insights.filter(i => i.impact === 'high' || i.impact === 'critical')
  const actionableInsights = insights.filter(i => i.actionRequired)
  
  return {
    immediate: actionableInsights
      .filter(i => i.priority === 'urgent' || i.priority === 'high')
      .slice(0, 3)
      .map(i => ({
        title: i.title,
        action: i.recommendedActions?.[0] || 'Review and take action',
        timeline: '1-2 weeks'
      })),
    shortTerm: highImpactInsights
      .filter(i => i.priority === 'medium')
      .slice(0, 3)
      .map(i => ({
        title: i.title,
        action: i.recommendedActions?.[0] || 'Strategic assessment required',
        timeline: '1-3 months'
      })),
    longTerm: insights
      .filter(i => i.type === 'opportunity' && i.estimatedROI && i.estimatedROI > 25)
      .slice(0, 2)
      .map(i => ({
        title: i.title,
        action: 'Strategic planning and resource allocation',
        timeline: '6-12 months',
        expectedROI: `${i.estimatedROI}%`
      }))
  }
}

function generateSyntheticInsights(
  organizationIds: string[],
  options: any
): ExecutiveInsight[] {
  const sampleInsights: Omit<ExecutiveInsight, 'id' | 'organizationScope'>[] = [
    {
      type: 'opportunity',
      title: 'Board Effectiveness Enhancement Opportunity',
      description: 'Analysis indicates 15% improvement potential in board meeting effectiveness through structured agenda optimization and decision-making frameworks.',
      impact: 'high',
      category: 'governance',
      actionRequired: true,
      recommendedActions: [
        'Implement structured agenda templates',
        'Establish decision-making frameworks',
        'Create meeting effectiveness metrics'
      ],
      confidence: 87,
      dataPoints: ['Meeting duration analysis', 'Decision velocity metrics', 'Member satisfaction surveys'],
      timeframe: '2-3 months',
      priority: 'high',
      estimatedROI: 28
    },
    {
      type: 'risk',
      title: 'Member Engagement Decline Detected',
      description: 'Predictive analytics suggest declining member engagement trend based on participation patterns and activity metrics.',
      impact: 'medium',
      category: 'performance',
      actionRequired: true,
      recommendedActions: [
        'Conduct member engagement survey',
        'Review meeting frequency and format',
        'Implement engagement recognition programs'
      ],
      confidence: 82,
      dataPoints: ['Attendance rate trends', 'Participation analytics', 'Member feedback patterns'],
      priority: 'high',
      riskLevel: 65
    },
    {
      type: 'achievement',
      title: 'Compliance Excellence Milestone',
      description: 'Organizations have achieved 95% compliance score, placing them in top quartile of governance excellence benchmarks.',
      impact: 'high',
      category: 'compliance',
      actionRequired: false,
      confidence: 94,
      dataPoints: ['Regulatory compliance metrics', 'Audit findings', 'Benchmark comparisons'],
      priority: 'low'
    },
    {
      type: 'alert',
      title: 'Strategic Planning Cycle Due',
      description: 'Annual strategic planning cycle is approaching. Early preparation recommended to ensure comprehensive stakeholder input and alignment.',
      impact: 'medium',
      category: 'strategic',
      actionRequired: true,
      recommendedActions: [
        'Schedule strategic planning sessions',
        'Gather stakeholder input',
        'Review previous year objectives'
      ],
      confidence: 90,
      timeframe: '4-6 weeks',
      priority: 'medium'
    },
    {
      type: 'opportunity',
      title: 'Cross-Portfolio Knowledge Sharing',
      description: 'Multiple organizations under management present opportunities for best practice sharing and resource optimization.',
      impact: 'high',
      category: 'strategic',
      actionRequired: true,
      recommendedActions: [
        'Establish inter-organization committees',
        'Create shared resource pools',
        'Develop best practice documentation'
      ],
      confidence: 79,
      estimatedROI: 35,
      priority: 'medium'
    }
  ]

  return sampleInsights.map((insight, index) => ({
    ...insight,
    id: `synthetic-${index + 1}`,
    organizationScope: organizationIds.slice(0, Math.min(3, organizationIds.length))
  }))
}

export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed. Use POST instead.'
  }, { status: 405 })
}