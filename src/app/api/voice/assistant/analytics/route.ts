import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { SupabaseClient, User, Organization, OrganizationAnalyticsData } from '@/types/voice';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface BoardAnalyticsRequest {
  organizationId: string;
  analysisType: 'revenue_trends' | 'risk_assessment' | 'compliance_status' | 'performance_kpis' | 'governance_health' | 'comprehensive';
  timeframe: '30d' | '90d' | '6m' | '1y' | 'ytd';
  includeForecasting?: boolean;
  includeBenchmarking?: boolean;
  voiceOptimized?: boolean;
}

export interface BoardAnalyticsResponse {
  success: boolean;
  analytics: BoardAnalytics;
  voiceSummary?: string;
  recommendations: AnalyticsRecommendation[];
  alerts: AnalyticsAlert[];
  error?: string;
}

export interface BoardAnalytics {
  type: string;
  timeframe: string;
  summary: string;
  keyMetrics: Record<string, MetricValue>;
  trends: TrendAnalysis[];
  comparisons: ComparisonData[];
  forecasts?: ForecastData[];
  benchmarks?: BenchmarkData[];
  riskFactors: RiskFactor[];
  opportunities: OpportunityData[];
  governanceScore: GovernanceScore;
  visualizationData: VisualizationConfig;
}

export interface MetricValue {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  significance: 'minor' | 'moderate' | 'major' | 'critical';
  benchmark?: number;
  target?: number;
}

export interface TrendAnalysis {
  metric: string;
  direction: 'upward' | 'downward' | 'stable' | 'volatile';
  strength: 'weak' | 'moderate' | 'strong';
  confidence: number;
  duration: string;
  inflectionPoints: string[];
  projectedDirection: 'continuing' | 'reversing' | 'uncertain';
}

export interface ComparisonData {
  type: 'period_over_period' | 'industry_benchmark' | 'peer_comparison';
  baseline: string;
  current: string;
  variance: number;
  variancePercent: number;
  significance: string;
  context: string;
}

export interface ForecastData {
  metric: string;
  timeframe: string;
  projectedValue: number;
  confidenceInterval: [number, number];
  confidence: number;
  assumptions: string[];
  scenarios: ScenarioData[];
}

export interface ScenarioData {
  name: 'optimistic' | 'realistic' | 'pessimistic';
  probability: number;
  projectedValue: number;
  keyFactors: string[];
}

export interface BenchmarkData {
  category: 'industry' | 'size_peer' | 'geography' | 'sector';
  metric: string;
  ourValue: number;
  benchmarkValue: number;
  percentile: number;
  interpretation: string;
}

export interface RiskFactor {
  category: 'financial' | 'operational' | 'strategic' | 'compliance' | 'reputation';
  description: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  mitigation: string[];
  monitoring: string;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface OpportunityData {
  category: 'growth' | 'efficiency' | 'innovation' | 'market' | 'partnership';
  description: string;
  potential: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  timeframe: string;
  expectedReturn: number;
  prerequisites: string[];
  nextSteps: string[];
}

export interface GovernanceScore {
  overall: number;
  categories: {
    board_effectiveness: number;
    risk_management: number;
    compliance: number;
    transparency: number;
    stakeholder_engagement: number;
  };
  benchmarkPercentile: number;
  improvementAreas: string[];
  strengths: string[];
}

export interface VisualizationConfig {
  charts: ChartConfig[];
  dashboardUrl?: string;
  embeddedViews: EmbeddedView[];
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'gauge' | 'treemap' | 'heatmap';
  title: string;
  data: unknown;
  config: unknown;
  priority: 'high' | 'medium' | 'low';
}

export interface EmbeddedView {
  name: string;
  url: string;
  description: string;
  interactive: boolean;
}

export interface AnalyticsRecommendation {
  category: 'immediate_action' | 'strategic_planning' | 'monitoring' | 'investigation';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timeline: string;
  expectedImpact: string;
  resources: string[];
  dependencies: string[];
  successMetrics: string[];
}

export interface AnalyticsAlert {
  type: 'threshold_breach' | 'anomaly_detected' | 'trend_change' | 'forecast_deviation';
  severity: 'info' | 'warning' | 'critical';
  metric: string;
  description: string;
  value: number;
  threshold: number;
  trend: string;
  recommendedAction: string;
  escalationRequired: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'AI analytics not configured' }, { status: 500 });
    }

    const body: BoardAnalyticsRequest = await request.json();
    
    if (!body.organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Verify user has access to organization
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', body.organizationId)
      .eq('user_id', user.id)
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json({ error: 'Access denied to organization' }, { status: 403 });
    }

    // Generate board analytics based on type
    const analytics = await generateBoardAnalytics(supabase, body, user.id);
    
    // Generate voice-optimized summary if requested
    let voiceSummary = undefined;
    if (body.voiceOptimized) {
      voiceSummary = await generateVoiceSummary(analytics);
    }

    // Generate contextual recommendations
    const recommendations = await generateAnalyticsRecommendations(analytics, body.analysisType);
    
    // Generate alerts
    const alerts = await generateAnalyticsAlerts(analytics);

    // Log analytics request
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        organization_id: body.organizationId,
        event_type: 'user_action',
        event_category: 'analytics',
        action: 'generate_board_analytics',
        resource_type: 'board_analytics',
        event_description: `Generated ${body.analysisType} analytics for ${body.timeframe}`,
        outcome: 'success',
        details: {
          analysis_type: body.analysisType,
          timeframe: body.timeframe,
          voice_optimized: body.voiceOptimized,
          metrics_count: Object.keys(analytics.keyMetrics).length,
          recommendations_count: recommendations.length,
          alerts_count: alerts.length
        },
      });

    const response: BoardAnalyticsResponse = {
      success: true,
      analytics,
      ...(voiceSummary && { voiceSummary }),
      recommendations,
      alerts
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error generating board analytics:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error during analytics generation',
      analytics: {} as BoardAnalytics,
      recommendations: [],
      alerts: []
    }, { status: 500 });
  }
}

async function generateBoardAnalytics(
  supabase: SupabaseClient,
  request: BoardAnalyticsRequest,
  userId: string
): Promise<BoardAnalytics> {
  // Fetch organization data
  const orgData = await fetchOrganizationData(supabase, request.organizationId, request.timeframe);
  
  // Generate analytics based on type
  switch (request.analysisType) {
    case 'revenue_trends':
      return await generateRevenueTrendAnalysis(orgData, request);
    case 'risk_assessment':
      return await generateRiskAssessmentAnalysis(orgData, request);
    case 'compliance_status':
      return await generateComplianceStatusAnalysis(orgData, request);
    case 'performance_kpis':
      return await generatePerformanceKPIAnalysis(orgData, request);
    case 'governance_health':
      return await generateGovernanceHealthAnalysis(orgData, request);
    case 'comprehensive':
      return await generateComprehensiveAnalysis(orgData, request);
    default:
      throw new Error('Invalid analysis type');
  }
}

async function fetchOrganizationData(
  supabase: SupabaseClient,
  organizationId: string,
  timeframe: string
): Promise<OrganizationAnalyticsData> {
  const timeframeDate = getTimeframeDate(timeframe);
  
  // Fetch various data points
  const [
    organization,
    assets,
    meetings,
    compliance,
    financials,
    riskData,
    auditLogs
  ] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', organizationId).single(),
    supabase.from('assets').select('*').eq('organization_id', organizationId)
      .gte('created_at', timeframeDate),
    supabase.from('meetings').select('*').eq('organization_id', organizationId)
      .gte('meeting_date', timeframeDate),
    supabase.from('compliance_workflows').select('*').eq('organization_id', organizationId)
      .gte('created_at', timeframeDate),
    supabase.from('financial_metrics').select('*').eq('organization_id', organizationId)
      .gte('reporting_date', timeframeDate),
    supabase.from('risk_assessments').select('*').eq('organization_id', organizationId)
      .gte('assessment_date', timeframeDate),
    supabase.from('audit_logs').select('*').eq('organization_id', organizationId)
      .gte('created_at', timeframeDate).limit(1000)
  ]);

  return {
    organization: organization.data,
    assets: assets.data || [],
    meetings: meetings.data || [],
    compliance: compliance.data || [],
    financials: financials.data || [],
    risks: riskData.data || [],
    auditLogs: auditLogs.data || []
  };
}

function getTimeframeDate(timeframe: string): string {
  const now = new Date();
  switch (timeframe) {
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    case '6m':
      return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString();
    case '1y':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
    case 'ytd':
      return new Date(now.getFullYear(), 0, 1).toISOString();
    default:
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  }
}

async function generateRevenueTrendAnalysis(
  orgData: OrganizationAnalyticsData,
  request: BoardAnalyticsRequest
): Promise<BoardAnalytics> {
  // Extract revenue metrics from financial data
  const revenueData = orgData.financials.filter(f => f.metric_type === 'revenue');
  
  const currentRevenue = revenueData.length > 0 ? (revenueData[revenueData.length - 1]?.value ?? 0) : 0;
  const previousRevenue = revenueData.length > 1 ? (revenueData[revenueData.length - 2]?.value ?? 0) : 0;
  const revenueChange = currentRevenue - previousRevenue;
  const revenueChangePercent = previousRevenue > 0 ? (revenueChange / previousRevenue) * 100 : 0;

  return {
    type: 'revenue_trends',
    timeframe: request.timeframe,
    summary: `Revenue analysis for ${request.timeframe} shows ${revenueChange >= 0 ? 'growth' : 'decline'} of ${Math.abs(revenueChangePercent).toFixed(1)}%`,
    keyMetrics: {
      'Total Revenue': {
        current: currentRevenue,
        previous: previousRevenue,
        change: revenueChange,
        changePercent: revenueChangePercent,
        unit: 'USD',
        trend: revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'stable',
        significance: Math.abs(revenueChangePercent) > 20 ? 'major' : 
                    Math.abs(revenueChangePercent) > 10 ? 'moderate' : 'minor'
      },
      'Revenue Growth Rate': {
        current: revenueChangePercent,
        previous: 0, // Would calculate from previous period
        change: revenueChangePercent,
        changePercent: 0,
        unit: '%',
        trend: revenueChangePercent > 0 ? 'up' : 'down',
        significance: 'moderate'
      }
    },
    trends: [
      {
        metric: 'Revenue',
        direction: revenueChange > 0 ? 'upward' : 'downward',
        strength: Math.abs(revenueChangePercent) > 15 ? 'strong' : 'moderate',
        confidence: 0.85,
        duration: request.timeframe,
        inflectionPoints: [],
        projectedDirection: 'continuing'
      }
    ],
    comparisons: [],
    riskFactors: [],
    opportunities: [],
    governanceScore: {
      overall: 75,
      categories: {
        board_effectiveness: 80,
        risk_management: 75,
        compliance: 85,
        transparency: 70,
        stakeholder_engagement: 65
      },
      benchmarkPercentile: 70,
      improvementAreas: ['Stakeholder Engagement', 'Transparency'],
      strengths: ['Compliance', 'Board Effectiveness']
    },
    visualizationData: {
      charts: [
        {
          type: 'line',
          title: 'Revenue Trend',
          data: revenueData,
          config: { timeframe: request.timeframe },
          priority: 'high'
        }
      ],
      embeddedViews: []
    }
  };
}

async function generateRiskAssessmentAnalysis(
  orgData: OrganizationAnalyticsData,
  request: BoardAnalyticsRequest
): Promise<BoardAnalytics> {
  const risks = orgData.risks;
  const highRisks = risks.filter(r => r.risk_level === 'high' || r.risk_level === 'critical');
  const averageRiskScore = risks.length > 0 ? 
    risks.reduce((sum: number, r) => sum + (r.risk_score || 0), 0) / risks.length : 0;

  return {
    type: 'risk_assessment',
    timeframe: request.timeframe,
    summary: `Risk assessment identifies ${highRisks.length} high-priority risks with average risk score of ${averageRiskScore.toFixed(1)}`,
    keyMetrics: {
      'Total Identified Risks': {
        current: risks.length,
        previous: 0, // Would get from previous period
        change: 0,
        changePercent: 0,
        unit: 'count',
        trend: 'stable',
        significance: 'moderate'
      },
      'High Priority Risks': {
        current: highRisks.length,
        previous: 0,
        change: 0,
        changePercent: 0,
        unit: 'count',
        trend: 'stable',
        significance: highRisks.length > 5 ? 'critical' : 'moderate'
      },
      'Average Risk Score': {
        current: averageRiskScore,
        previous: 0,
        change: 0,
        changePercent: 0,
        unit: 'score',
        trend: 'stable',
        significance: 'moderate'
      }
    },
    trends: [],
    comparisons: [],
    riskFactors: risks.map(r => ({
      category: (r.category || 'operational') as 'compliance' | 'financial' | 'strategic' | 'operational' | 'reputation',
      description: r.description || 'Risk description not available',
      likelihood: r.likelihood || 'medium',
      impact: r.impact || 'medium',
      riskScore: r.risk_score || 50,
      mitigation: r.mitigation_strategies || [],
      monitoring: r.monitoring_approach || 'Regular review',
      trend: 'stable'
    })),
    opportunities: [],
    governanceScore: {
      overall: 75,
      categories: {
        board_effectiveness: 80,
        risk_management: averageRiskScore > 70 ? 60 : 80,
        compliance: 85,
        transparency: 70,
        stakeholder_engagement: 65
      },
      benchmarkPercentile: 70,
      improvementAreas: ['Risk Management'],
      strengths: ['Compliance']
    },
    visualizationData: {
      charts: [
        {
          type: 'heatmap',
          title: 'Risk Heat Map',
          data: risks,
          config: { axes: ['likelihood', 'impact'] },
          priority: 'high'
        }
      ],
      embeddedViews: []
    }
  };
}

async function generateComplianceStatusAnalysis(
  orgData: OrganizationAnalyticsData,
  request: BoardAnalyticsRequest
): Promise<BoardAnalytics> {
  const workflows = orgData.compliance;
  const completedWorkflows = workflows.filter(w => w.status === 'completed');
  const overdueWorkflows = workflows.filter(w => 
    w.status !== 'completed' && new Date(w.due_date) < new Date()
  );
  
  const complianceRate = workflows.length > 0 ? 
    (completedWorkflows.length / workflows.length) * 100 : 100;

  return {
    type: 'compliance_status',
    timeframe: request.timeframe,
    summary: `Compliance rate of ${complianceRate.toFixed(1)}% with ${overdueWorkflows.length} overdue items`,
    keyMetrics: {
      'Compliance Rate': {
        current: complianceRate,
        previous: 0,
        change: 0,
        changePercent: 0,
        unit: '%',
        trend: complianceRate > 90 ? 'up' : 'down',
        significance: complianceRate < 80 ? 'critical' : 'moderate',
        target: 95
      },
      'Overdue Items': {
        current: overdueWorkflows.length,
        previous: 0,
        change: 0,
        changePercent: 0,
        unit: 'count',
        trend: overdueWorkflows.length > 0 ? 'up' : 'stable',
        significance: overdueWorkflows.length > 3 ? 'major' : 'minor'
      }
    },
    trends: [],
    comparisons: [],
    riskFactors: overdueWorkflows.map(w => ({
      category: 'compliance',
      description: `Overdue compliance workflow: ${w.workflow_name}`,
      likelihood: 'high',
      impact: 'medium',
      riskScore: 70,
      mitigation: ['Immediate completion', 'Process review'],
      monitoring: 'Daily review until resolved',
      trend: 'increasing'
    })),
    opportunities: [],
    governanceScore: {
      overall: complianceRate,
      categories: {
        board_effectiveness: 80,
        risk_management: 75,
        compliance: complianceRate,
        transparency: 70,
        stakeholder_engagement: 65
      },
      benchmarkPercentile: complianceRate > 90 ? 85 : 60,
      improvementAreas: complianceRate < 90 ? ['Compliance Processes'] : [],
      strengths: complianceRate > 90 ? ['Compliance'] : []
    },
    visualizationData: {
      charts: [
        {
          type: 'gauge',
          title: 'Compliance Rate',
          data: { value: complianceRate, target: 95 },
          config: { min: 0, max: 100 },
          priority: 'high'
        }
      ],
      embeddedViews: []
    }
  };
}

async function generatePerformanceKPIAnalysis(
  orgData: OrganizationAnalyticsData,
  request: BoardAnalyticsRequest
): Promise<BoardAnalytics> {
  // Extract KPIs from various data sources
  const assets = orgData.assets;
  const meetings = orgData.meetings;
  const auditLogs = orgData.auditLogs;

  const documentProcessingRate = assets.length;
  const meetingAttendanceRate = meetings.length > 0 ? 
    meetings.reduce((sum: number, m) => sum + ((m as unknown as {attendance_rate?: number}).attendance_rate || 80), 0) / meetings.length : 80;
  const userEngagementRate = auditLogs.filter(l => 
    l.event_category === 'user_action'
  ).length;

  return {
    type: 'performance_kpis',
    timeframe: request.timeframe,
    summary: `KPI analysis shows ${documentProcessingRate} documents processed, ${meetingAttendanceRate.toFixed(1)}% meeting attendance`,
    keyMetrics: {
      'Document Processing Rate': {
        current: documentProcessingRate,
        previous: 0,
        change: 0,
        changePercent: 0,
        unit: 'documents',
        trend: 'stable',
        significance: 'moderate'
      },
      'Meeting Attendance Rate': {
        current: meetingAttendanceRate,
        previous: 0,
        change: 0,
        changePercent: 0,
        unit: '%',
        trend: meetingAttendanceRate > 85 ? 'up' : 'down',
        significance: 'moderate',
        target: 90
      },
      'User Engagement': {
        current: userEngagementRate,
        previous: 0,
        change: 0,
        changePercent: 0,
        unit: 'actions',
        trend: 'stable',
        significance: 'moderate'
      }
    },
    trends: [],
    comparisons: [],
    riskFactors: [],
    opportunities: [
      {
        category: 'efficiency',
        description: 'Implement automated document processing to increase throughput',
        potential: 'high',
        effort: 'medium',
        timeframe: '3-6 months',
        expectedReturn: 25,
        prerequisites: ['Technology assessment', 'Budget approval'],
        nextSteps: ['Vendor evaluation', 'Pilot program']
      }
    ],
    governanceScore: {
      overall: 75,
      categories: {
        board_effectiveness: meetingAttendanceRate > 85 ? 85 : 70,
        risk_management: 75,
        compliance: 85,
        transparency: 70,
        stakeholder_engagement: userEngagementRate > 100 ? 80 : 65
      },
      benchmarkPercentile: 70,
      improvementAreas: ['Stakeholder Engagement'],
      strengths: ['Compliance']
    },
    visualizationData: {
      charts: [
        {
          type: 'bar',
          title: 'Key Performance Indicators',
          data: {
            document_processing: documentProcessingRate,
            meeting_attendance: meetingAttendanceRate,
            user_engagement: userEngagementRate
          },
          config: { orientation: 'horizontal' },
          priority: 'high'
        }
      ],
      embeddedViews: []
    }
  };
}

async function generateGovernanceHealthAnalysis(
  orgData: OrganizationAnalyticsData,
  request: BoardAnalyticsRequest
): Promise<BoardAnalytics> {
  const meetings = orgData.meetings;
  const compliance = orgData.compliance;
  const risks = orgData.risks;
  
  const boardMeetingFrequency = meetings.length;
  const complianceRate = compliance.length > 0 ? 
    (compliance.filter(c => c.status === 'completed').length / compliance.length) * 100 : 100;
  const riskManagementScore = risks.length > 0 ? 
    100 - (risks.filter(r => r.risk_level === 'high').length / risks.length) * 100 : 85;

  const overallScore = (boardMeetingFrequency * 10 + complianceRate + riskManagementScore) / 3;

  return {
    type: 'governance_health',
    timeframe: request.timeframe,
    summary: `Governance health score of ${overallScore.toFixed(1)} with strong compliance but areas for improvement in risk management`,
    keyMetrics: {
      'Governance Health Score': {
        current: overallScore,
        previous: 0,
        change: 0,
        changePercent: 0,
        unit: 'score',
        trend: 'stable',
        significance: 'major',
        target: 90
      },
      'Board Meeting Frequency': {
        current: boardMeetingFrequency,
        previous: 0,
        change: 0,
        changePercent: 0,
        unit: 'meetings',
        trend: 'stable',
        significance: 'moderate'
      },
      'Compliance Rate': {
        current: complianceRate,
        previous: 0,
        change: 0,
        changePercent: 0,
        unit: '%',
        trend: complianceRate > 90 ? 'up' : 'down',
        significance: 'major'
      }
    },
    trends: [],
    comparisons: [],
    riskFactors: [],
    opportunities: [],
    governanceScore: {
      overall: overallScore,
      categories: {
        board_effectiveness: Math.min(boardMeetingFrequency * 20, 100),
        risk_management: riskManagementScore,
        compliance: complianceRate,
        transparency: 70,
        stakeholder_engagement: 65
      },
      benchmarkPercentile: overallScore > 80 ? 85 : 65,
      improvementAreas: overallScore < 80 ? ['Board Effectiveness', 'Risk Management'] : [],
      strengths: ['Compliance']
    },
    visualizationData: {
      charts: [
        {
          type: 'gauge',
          title: 'Governance Health Score',
          data: { value: overallScore, target: 90 },
          config: { min: 0, max: 100 },
          priority: 'high'
        }
      ],
      embeddedViews: []
    }
  };
}

async function generateComprehensiveAnalysis(
  orgData: OrganizationAnalyticsData,
  request: BoardAnalyticsRequest
): Promise<BoardAnalytics> {
  // Combine insights from all other analysis types
  const revenue = await generateRevenueTrendAnalysis(orgData, request);
  const risk = await generateRiskAssessmentAnalysis(orgData, request);
  const compliance = await generateComplianceStatusAnalysis(orgData, request);
  const performance = await generatePerformanceKPIAnalysis(orgData, request);
  const governance = await generateGovernanceHealthAnalysis(orgData, request);

  return {
    type: 'comprehensive',
    timeframe: request.timeframe,
    summary: `Comprehensive analysis showing mixed performance with strengths in compliance and opportunities in risk management`,
    keyMetrics: {
      ...revenue.keyMetrics,
      ...risk.keyMetrics,
      ...compliance.keyMetrics,
      ...performance.keyMetrics,
      ...governance.keyMetrics
    },
    trends: [
      ...revenue.trends,
      ...risk.trends,
      ...compliance.trends,
      ...performance.trends,
      ...governance.trends
    ],
    comparisons: [],
    riskFactors: [
      ...risk.riskFactors,
      ...compliance.riskFactors
    ],
    opportunities: [
      ...performance.opportunities
    ],
    governanceScore: governance.governanceScore,
    visualizationData: {
      charts: [
        ...revenue.visualizationData.charts,
        ...risk.visualizationData.charts,
        ...compliance.visualizationData.charts,
        ...performance.visualizationData.charts,
        ...governance.visualizationData.charts
      ],
      embeddedViews: []
    }
  };
}

async function generateVoiceSummary(analytics: BoardAnalytics): Promise<string> {
  try {
    const systemPrompt = `You are a BoardGuru AI analyst creating voice-optimized summaries of board analytics. 
    
Convert the following analytics data into a clear, conversational summary suitable for voice delivery. 
Focus on key insights, trends, and actionable recommendations. Use natural language and avoid jargon.
Keep it concise but comprehensive - aim for 2-3 paragraphs that a board member would find valuable.`;

    const userPrompt = `Analytics Data:
Type: ${analytics.type}
Timeframe: ${analytics.timeframe}
Summary: ${analytics.summary}

Key Metrics:
${Object.entries(analytics.keyMetrics).map(([key, value]) => 
  `${key}: ${value.current} ${value.unit} (${value.changePercent > 0 ? '+' : ''}${value.changePercent.toFixed(1)}%)`
).join('\n')}

Risk Factors: ${analytics.riskFactors.length} identified
Opportunities: ${analytics.opportunities.length} identified
Governance Score: ${analytics.governanceScore.overall.toFixed(1)}

Create a voice-optimized summary of these analytics.`;

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'BoardGuru Voice Analytics Summary'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 800
      })
    });

    if (response.ok) {
      const result = await response.json();
      return result.choices[0].message.content;
    }
  } catch (error) {
    console.error('Voice summary generation error:', error);
  }

  return `Here's your ${analytics.type} analysis for the ${analytics.timeframe} period. ${analytics.summary}. The overall governance score is ${analytics.governanceScore.overall.toFixed(1)} out of 100.`;
}

async function generateAnalyticsRecommendations(
  analytics: BoardAnalytics,
  analysisType: string
): Promise<AnalyticsRecommendation[]> {
  const recommendations: AnalyticsRecommendation[] = [];

  // Generate recommendations based on analytics
  if (analytics.governanceScore.overall < 75) {
    recommendations.push({
      category: 'strategic_planning',
      title: 'Improve Governance Framework',
      description: 'Implement comprehensive governance improvements to reach industry standards',
      priority: 'high',
      timeline: '3-6 months',
      expectedImpact: 'Significant improvement in governance score and regulatory compliance',
      resources: ['Board members', 'Governance consultant', 'Legal counsel'],
      dependencies: ['Board approval', 'Budget allocation'],
      successMetrics: ['Governance score > 80', 'Compliance rate > 95%']
    });
  }

  if (analytics.riskFactors.filter(r => r.likelihood === 'high').length > 3) {
    recommendations.push({
      category: 'immediate_action',
      title: 'Address High-Risk Items',
      description: 'Immediate attention required for high-probability risk factors',
      priority: 'urgent',
      timeline: '1-2 weeks',
      expectedImpact: 'Reduced risk exposure and improved operational stability',
      resources: ['Risk management team', 'Department heads'],
      dependencies: ['Risk assessment completion'],
      successMetrics: ['High-risk items < 3', 'Average risk score < 60']
    });
  }

  return recommendations;
}

async function generateAnalyticsAlerts(analytics: BoardAnalytics): Promise<AnalyticsAlert[]> {
  const alerts: AnalyticsAlert[] = [];

  // Check for threshold breaches
  Object.entries(analytics.keyMetrics).forEach(([metric, data]) => {
    if (data.target && data.current < data.target * 0.9) {
      alerts.push({
        type: 'threshold_breach',
        severity: data.current < data.target * 0.8 ? 'critical' : 'warning',
        metric,
        description: `${metric} is below target threshold`,
        value: data.current,
        threshold: data.target,
        trend: data.trend,
        recommendedAction: `Review ${metric.toLowerCase()} processes and implement improvement measures`,
        escalationRequired: data.current < data.target * 0.8
      });
    }
  });

  // Check for critical risks
  analytics.riskFactors.forEach(risk => {
    if (risk.likelihood === 'high' && (risk.impact === 'high' || risk.impact === 'critical')) {
      alerts.push({
        type: 'anomaly_detected',
        severity: 'critical',
        metric: 'Risk Level',
        description: `High-impact risk detected: ${risk.description}`,
        value: risk.riskScore,
        threshold: 70,
        trend: risk.trend,
        recommendedAction: risk.mitigation.join(', '),
        escalationRequired: true
      });
    }
  });

  return alerts;
}

// GET endpoint for retrieving cached analytics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const organizationId = url.searchParams.get('organizationId');
    const analysisType = url.searchParams.get('analysisType');

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    // Get cached analytics if available
    const { data: cachedAnalytics } = await supabase
      .from('cached_analytics')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('analysis_type', analysisType || 'comprehensive')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (cachedAnalytics) {
      return NextResponse.json({
        success: true,
        analytics: JSON.parse(cachedAnalytics.analytics_data),
        cached: true,
        generatedAt: cachedAnalytics.created_at
      });
    }

    return NextResponse.json({
      success: false,
      error: 'No recent analytics found. Generate new analytics.',
      cached: false
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch analytics data' 
    }, { status: 500 });
  }
}