import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClientSafe } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientSafe()
    
    if (!supabase) {
      return NextResponse.json({ 
        metrics: getMockMetrics(),
        governanceScore: getMockGovernanceScore(),
        compensation: getMockCompensation(),
        boardComposition: getMockBoardComposition(),
        esgScores: getMockESGScores(),
        insights: getMockInsights()
      })
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const period = searchParams.get('period') || 'annual'
    
    // For now, return mock data
    // In production, this would query the benchmarking tables
    return NextResponse.json({
      metrics: getMockMetrics(),
      governanceScore: getMockGovernanceScore(),
      compensation: getMockCompensation(),
      boardComposition: getMockBoardComposition(),
      esgScores: getMockESGScores(),
      insights: getMockInsights()
    })
    
  } catch (error) {
    console.error('Benchmarking metrics API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      metrics: getMockMetrics()
    }, { status: 500 })
  }
}

function getMockMetrics() {
  return [
    {
      id: '1',
      category: 'governance',
      subcategory: 'board',
      name: 'Board Independence',
      value: 85,
      unit: 'percentage',
      percentile: 78,
      quartile: 4,
      trend: 'up',
      peerAverage: 82,
      peerMedian: 83,
      industryBenchmark: 80,
      deviationFromMedian: 2.4,
      zScore: 0.8
    },
    {
      id: '2',
      category: 'governance',
      subcategory: 'meetings',
      name: 'Meeting Attendance Rate',
      value: 94,
      unit: 'percentage',
      percentile: 85,
      quartile: 4,
      trend: 'stable',
      peerAverage: 91,
      peerMedian: 92,
      industryBenchmark: 90,
      deviationFromMedian: 2.2,
      zScore: 1.2
    },
    {
      id: '3',
      category: 'financial',
      name: 'Revenue Growth',
      value: 18.5,
      unit: 'percentage',
      percentile: 72,
      quartile: 3,
      trend: 'up',
      peerAverage: 15.2,
      peerMedian: 14.8,
      industryBenchmark: 12.5,
      deviationFromMedian: 25,
      zScore: 1.5
    }
  ]
}

function getMockGovernanceScore() {
  return {
    overall: 82,
    boardEffectiveness: 88,
    riskManagement: 85,
    compliance: 91,
    transparency: 78,
    stakeholderEngagement: 76,
    ethicsAndCulture: 84,
    strategicOversight: 79
  }
}

function getMockCompensation() {
  return [
    {
      position: 'CEO',
      executiveName: 'John Smith',
      baseSalary: 1500000,
      cashBonus: 3000000,
      stockAwards: 8500000,
      totalCompensation: 13000000,
      percentileBase: 75,
      percentileTotal: 68,
      payRatio: 287,
      esgLinkedPercentage: 25
    },
    {
      position: 'CFO',
      executiveName: 'Jane Doe',
      baseSalary: 850000,
      cashBonus: 1200000,
      stockAwards: 3500000,
      totalCompensation: 5550000,
      percentileBase: 72,
      percentileTotal: 70,
      payRatio: 122,
      esgLinkedPercentage: 20
    }
  ]
}

function getMockBoardComposition() {
  return {
    boardSize: 11,
    independentDirectors: 9,
    independencePercentage: 82,
    genderDiversity: 36,
    ethnicDiversity: 27,
    internationalDiversity: 18,
    averageTenure: 6.5,
    averageAge: 62,
    financialExperts: 3,
    industryExperts: 4,
    separateChairCEO: true,
    leadIndependentDirector: true,
    meetingsPerYear: 8,
    averageAttendance: 94
  }
}

function getMockESGScores() {
  return {
    totalScore: 76,
    environmentalScore: 72,
    socialScore: 78,
    governanceScore: 82,
    carbonIntensity: 45.2,
    renewableEnergy: 35,
    employeeSatisfaction: 78,
    safetyIncidentRate: 0.8,
    dataBreaches: 0,
    regulatoryFines: 0
  }
}

function getMockInsights() {
  return [
    {
      id: '1',
      type: 'opportunity',
      category: 'governance',
      title: 'Board Diversity Enhancement Opportunity',
      description: 'Your board gender diversity (36%) is below the 75th percentile of your peer group (42%). Increasing diversity could improve decision-making and stakeholder perception.',
      currentPercentile: 58,
      targetPercentile: 75,
      potentialImprovement: 17,
      recommendations: [
        'Engage executive search firms with proven diversity track records',
        'Expand board recruitment beyond traditional networks',
        'Set specific diversity targets for the next 2-3 board appointments'
      ],
      priority: 85,
      complexity: 'medium',
      estimatedTimeline: 180
    },
    {
      id: '2',
      type: 'best_practice',
      category: 'compensation',
      title: 'ESG-Linked Compensation Leadership',
      description: 'Your 25% ESG-linked executive compensation exceeds 85% of peers, positioning you as a leader in sustainable governance.',
      currentPercentile: 85,
      targetPercentile: 90,
      potentialImprovement: 5,
      recommendations: [
        'Share your ESG compensation framework as a best practice',
        'Consider increasing ESG metrics weight to 30% to reach top decile',
        'Publish detailed ESG compensation methodology in proxy statements'
      ],
      priority: 65,
      complexity: 'low',
      estimatedTimeline: 90
    }
  ]
}