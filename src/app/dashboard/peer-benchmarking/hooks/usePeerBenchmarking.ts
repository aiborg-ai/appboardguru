'use client'

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'

// Types
export interface PeerOrganization {
  id: string
  name: string
  ticker?: string
  industry: string
  subIndustry?: string
  country: string
  marketCap: number
  revenue: number
  employees: number
  relevanceScore: number
  dataQuality: number
  lastUpdate: Date
  isPrimary: boolean
  isAspirational: boolean
}

export interface BenchmarkingMetric {
  id: string
  category: string
  subcategory?: string
  name: string
  value: number
  unit: string
  percentile: number
  quartile: 1 | 2 | 3 | 4
  trend: 'up' | 'down' | 'stable'
  peerAverage: number
  peerMedian: number
  industryBenchmark: number
  deviationFromMedian: number
  zScore: number
}

export interface GovernanceScore {
  overall: number
  boardEffectiveness: number
  riskManagement: number
  compliance: number
  transparency: number
  stakeholderEngagement: number
  ethicsAndCulture: number
  strategicOversight: number
}

export interface CompensationData {
  position: string
  executiveName?: string
  baseSalary: number
  cashBonus: number
  stockAwards: number
  totalCompensation: number
  percentileBase: number
  percentileTotal: number
  payRatio: number
  esgLinkedPercentage: number
}

export interface BoardCompositionData {
  boardSize: number
  independentDirectors: number
  independencePercentage: number
  genderDiversity: number
  ethnicDiversity: number
  internationalDiversity: number
  averageTenure: number
  averageAge: number
  financialExperts: number
  industryExperts: number
  separateChairCEO: boolean
  leadIndependentDirector: boolean
  meetingsPerYear: number
  averageAttendance: number
}

export interface ESGScores {
  totalScore: number
  environmentalScore: number
  socialScore: number
  governanceScore: number
  carbonIntensity: number
  renewableEnergy: number
  employeeSatisfaction: number
  safetyIncidentRate: number
  dataBreaches: number
  regulatoryFines: number
}

export interface BenchmarkingInsight {
  id: string
  type: 'gap' | 'opportunity' | 'risk' | 'best_practice' | 'trend'
  category: string
  title: string
  description: string
  currentPercentile: number
  targetPercentile: number
  potentialImprovement: number
  recommendations: string[]
  priority: number
  complexity: 'low' | 'medium' | 'high'
  estimatedTimeline: number
}

// Hook for peer benchmarking data
export function usePeerBenchmarking(
  organizationId?: string,
  peerGroup: string = 'default',
  timePeriod: 'quarterly' | 'annual' | 'ltm' = 'annual'
) {
  const [peerOrganizations, setPeerOrganizations] = useState<PeerOrganization[]>([])
  const [benchmarkingMetrics, setBenchmarkingMetrics] = useState<BenchmarkingMetric[]>([])
  const [governanceScore, setGovernanceScore] = useState<GovernanceScore | null>(null)
  const [compensationData, setCompensationData] = useState<CompensationData[]>([])
  const [boardComposition, setBoardComposition] = useState<BoardCompositionData | null>(null)
  const [esgScores, setESGScores] = useState<ESGScores | null>(null)
  const [insights, setInsights] = useState<BenchmarkingInsight[]>([])
  
  const [loadingPeers, setLoadingPeers] = useState(true)
  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch peer organizations
  const fetchPeerOrganizations = useCallback(async () => {
    if (!organizationId) return
    
    try {
      setLoadingPeers(true)
      const response = await fetch(
        `/api/benchmarking/peers?organizationId=${organizationId}&groupId=${peerGroup}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setPeerOrganizations(data.peers || getMockPeerOrganizations())
      } else {
        // Use mock data as fallback
        setPeerOrganizations(getMockPeerOrganizations())
      }
    } catch (error) {
      console.error('Error fetching peer organizations:', error)
      setPeerOrganizations(getMockPeerOrganizations())
    } finally {
      setLoadingPeers(false)
    }
  }, [organizationId, peerGroup])
  
  // Fetch benchmarking metrics
  const fetchBenchmarkingMetrics = useCallback(async () => {
    if (!organizationId) return
    
    try {
      setLoadingMetrics(true)
      const response = await fetch(
        `/api/benchmarking/metrics?organizationId=${organizationId}&period=${timePeriod}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setBenchmarkingMetrics(data.metrics || getMockBenchmarkingMetrics())
        setGovernanceScore(data.governanceScore || getMockGovernanceScore())
        setCompensationData(data.compensation || getMockCompensationData())
        setBoardComposition(data.boardComposition || getMockBoardComposition())
        setESGScores(data.esgScores || getMockESGScores())
        setInsights(data.insights || getMockInsights())
      } else {
        // Use mock data as fallback
        setBenchmarkingMetrics(getMockBenchmarkingMetrics())
        setGovernanceScore(getMockGovernanceScore())
        setCompensationData(getMockCompensationData())
        setBoardComposition(getMockBoardComposition())
        setESGScores(getMockESGScores())
        setInsights(getMockInsights())
      }
    } catch (error) {
      console.error('Error fetching benchmarking metrics:', error)
      // Use mock data
      setBenchmarkingMetrics(getMockBenchmarkingMetrics())
      setGovernanceScore(getMockGovernanceScore())
      setCompensationData(getMockCompensationData())
      setBoardComposition(getMockBoardComposition())
      setESGScores(getMockESGScores())
      setInsights(getMockInsights())
    } finally {
      setLoadingMetrics(false)
    }
  }, [organizationId, timePeriod])
  
  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchPeerOrganizations(),
      fetchBenchmarkingMetrics()
    ])
  }, [fetchPeerOrganizations, fetchBenchmarkingMetrics])
  
  // Initial data fetch
  useEffect(() => {
    if (organizationId) {
      refreshData()
    }
  }, [organizationId, peerGroup, timePeriod])
  
  return {
    peerOrganizations,
    benchmarkingMetrics,
    governanceScore,
    compensationData,
    boardComposition,
    esgScores,
    insights,
    loadingPeers,
    loadingMetrics,
    error,
    refreshData
  }
}

// Mock data functions for development
function getMockPeerOrganizations(): PeerOrganization[] {
  return [
    {
      id: '1',
      name: 'Global Tech Corp',
      ticker: 'GTC',
      industry: 'Technology',
      subIndustry: 'Software',
      country: 'United States',
      marketCap: 125000000000,
      revenue: 45000000000,
      employees: 75000,
      relevanceScore: 95,
      dataQuality: 98,
      lastUpdate: new Date(),
      isPrimary: true,
      isAspirational: false
    },
    {
      id: '2',
      name: 'Innovation Industries',
      ticker: 'INOV',
      industry: 'Technology',
      subIndustry: 'Hardware',
      country: 'United States',
      marketCap: 98000000000,
      revenue: 38000000000,
      employees: 62000,
      relevanceScore: 92,
      dataQuality: 96,
      lastUpdate: new Date(),
      isPrimary: true,
      isAspirational: false
    },
    {
      id: '3',
      name: 'Digital Solutions Inc',
      ticker: 'DSI',
      industry: 'Technology',
      subIndustry: 'Cloud Services',
      country: 'United States',
      marketCap: 156000000000,
      revenue: 52000000000,
      employees: 89000,
      relevanceScore: 88,
      dataQuality: 94,
      lastUpdate: new Date(),
      isPrimary: false,
      isAspirational: true
    }
  ]
}

function getMockBenchmarkingMetrics(): BenchmarkingMetric[] {
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

function getMockGovernanceScore(): GovernanceScore {
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

function getMockCompensationData(): CompensationData[] {
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

function getMockBoardComposition(): BoardCompositionData {
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

function getMockESGScores(): ESGScores {
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

function getMockInsights(): BenchmarkingInsight[] {
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