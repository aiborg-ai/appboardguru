import type {
  ESGDataPoint,
  ESGScorecard,
  ESGScore,
  ESGBenchmark,
  ESGTrend,
  ESGAnalytics,
  OrganizationId,
  UserId,
  ESGFramework,
  ESGCategory,
  ESGRating
} from '@/types/esg'
import {
  ESG_METRICS_SEED_DATA,
  ESG_RISKS_SEED_DATA,
  ESG_OPPORTUNITIES_SEED_DATA,
  ESG_RECOMMENDATIONS_SEED_DATA,
  DEFAULT_ESG_CONFIGURATION
} from './esg-seed-data'

// Utility functions for realistic data generation
const randomBetween = (min: number, max: number): number => {
  return Math.random() * (max - min) + min
}

const randomFromArray = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)]
}

const generateId = (): string => {
  return `esg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

const formatPeriod = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// Generate realistic ESG data points for a given time period
export class ESGDataGenerator {
  private organizationId: OrganizationId
  private userId: UserId
  private baseDate: Date
  private industryType: 'technology' | 'manufacturing' | 'finance' | 'healthcare' | 'energy'

  constructor(
    organizationId: OrganizationId,
    userId: UserId,
    baseDate = new Date(),
    industryType: 'technology' | 'manufacturing' | 'finance' | 'healthcare' | 'energy' = 'technology'
  ) {
    this.organizationId = organizationId
    this.userId = userId
    this.baseDate = baseDate
    this.industryType = industryType
  }

  // Generate historical data points for ESG metrics
  generateDataPoints(
    metricIds: string[],
    monthsBack = 24,
    variability = 0.1
  ): ESGDataPoint[] {
    const dataPoints: ESGDataPoint[] = []
    
    // Get baseline values based on industry type and metric
    const getBaselineValue = (metricName: string): number => {
      const baselines: Record<string, Record<string, number>> = {
        technology: {
          'Total GHG Emissions (Scope 1)': 800,
          'Total GHG Emissions (Scope 2)': 1500,
          'Total Energy Consumption': 4200,
          'Renewable Energy Percentage': 65,
          'Total Water Consumption': 8500,
          'Total Waste Generated': 350,
          'Waste Recycling Rate': 85,
          'Employee Satisfaction Score': 8.2,
          'Gender Diversity Ratio': 45,
          'Leadership Diversity': 38,
          'Lost Time Injury Rate': 0.3,
          'Training Hours per Employee': 45,
          'Community Investment': 125000,
          'Board Independence': 80,
          'Board Gender Diversity': 42,
          'Ethics Training Completion': 98,
          'Risk Assessment Coverage': 92,
          'Data Privacy Compliance': 94,
          'CEO Pay Ratio': 45
        },
        manufacturing: {
          'Total GHG Emissions (Scope 1)': 2400,
          'Total GHG Emissions (Scope 2)': 3200,
          'Total Energy Consumption': 8500,
          'Renewable Energy Percentage': 35,
          'Total Water Consumption': 15000,
          'Total Waste Generated': 1200,
          'Waste Recycling Rate': 75,
          'Employee Satisfaction Score': 7.8,
          'Gender Diversity Ratio': 35,
          'Leadership Diversity': 28,
          'Lost Time Injury Rate': 1.2,
          'Training Hours per Employee': 35,
          'Community Investment': 85000,
          'Board Independence': 75,
          'Board Gender Diversity': 30,
          'Ethics Training Completion': 95,
          'Risk Assessment Coverage': 88,
          'Data Privacy Compliance': 87,
          'CEO Pay Ratio': 65
        }
      }
      
      return baselines[this.industryType]?.[metricName] || 50
    }

    // Generate trend direction (improving, stable, declining)
    const getTrendDirection = (metricName: string): number => {
      // Environmental metrics generally improving over time
      if (metricName.includes('Renewable Energy') || metricName.includes('Recycling')) {
        return 0.02 // 2% improvement per month
      }
      if (metricName.includes('Emissions') || metricName.includes('Waste Generated')) {
        return -0.015 // 1.5% reduction per month
      }
      
      // Social metrics gradually improving
      if (metricName.includes('Satisfaction') || metricName.includes('Diversity')) {
        return 0.01 // 1% improvement per month
      }
      
      // Governance metrics slowly improving
      if (metricName.includes('Independence') || metricName.includes('Compliance')) {
        return 0.005 // 0.5% improvement per month
      }
      
      return 0 // Stable
    }

    metricIds.forEach(metricId => {
      const metric = ESG_METRICS_SEED_DATA.find(m => m.name === metricId)
      if (!metric) return

      const baseline = getBaselineValue(metric.name)
      const trend = getTrendDirection(metric.name)
      
      for (let i = monthsBack; i >= 0; i--) {
        const period = formatPeriod(addMonths(this.baseDate, -i))
        
        // Calculate value with trend and random variation
        const trendValue = baseline * (1 + (trend * (monthsBack - i)))
        const randomVariation = 1 + (Math.random() - 0.5) * 2 * variability
        let value = Math.max(0, trendValue * randomVariation)
        
        // Apply realistic constraints based on metric type
        if (metric.unit === '%') {
          value = Math.min(100, Math.max(0, value))
        }
        
        // Add some seasonal variations for certain metrics
        if (metric.name.includes('Energy') || metric.name.includes('Emissions')) {
          const seasonalFactor = 1 + 0.1 * Math.sin((i / 12) * 2 * Math.PI)
          value *= seasonalFactor
        }

        dataPoints.push({
          id: generateId(),
          metricId: metricId,
          organizationId: this.organizationId,
          value: Math.round(value * 100) / 100, // Round to 2 decimal places
          period,
          unit: metric.unit,
          dataSource: metric.dataSource || 'System Generated',
          verificationStatus: randomFromArray(['Internal', 'External', 'Certified']),
          notes: i === 0 ? 'Latest data point with updated methodology' : undefined,
          createdAt: addMonths(this.baseDate, -i + 1).toISOString(),
          updatedAt: addMonths(this.baseDate, -i + 1).toISOString(),
          createdBy: this.userId
        })
      }
    })

    return dataPoints
  }

  // Generate ESG scores based on data points
  generateESGScores(dataPoints: ESGDataPoint[], period: string): ESGScore[] {
    const scores: ESGScore[] = []
    const categories: ESGCategory[] = ['Environmental', 'Social', 'Governance']
    
    categories.forEach(category => {
      const categoryMetrics = ESG_METRICS_SEED_DATA.filter(m => m.category === category)
      const categoryDataPoints = dataPoints.filter(dp => 
        categoryMetrics.some(m => m.name === dp.metricId) && dp.period === period
      )
      
      // Calculate weighted average score for category
      let totalScore = 0
      let totalWeight = 0
      const breakdown: any[] = []
      
      categoryDataPoints.forEach(dp => {
        const metric = categoryMetrics.find(m => m.name === dp.metricId)
        if (!metric) return
        
        // Normalize value to 0-100 scale
        let normalizedScore: number
        if (metric.target) {
          normalizedScore = Math.min(100, (dp.value / metric.target) * 100)
        } else {
          // Use percentile-based normalization for metrics without targets
          normalizedScore = Math.min(100, dp.value)
        }
        
        const contribution = normalizedScore * metric.weight
        totalScore += contribution
        totalWeight += metric.weight
        
        breakdown.push({
          metricId: dp.metricId,
          metricName: metric.name,
          weight: metric.weight,
          rawValue: dp.value,
          normalizedScore,
          contribution
        })
      })
      
      const categoryScore = totalWeight > 0 ? totalScore / totalWeight : 0
      const percentile = this.calculatePercentile(categoryScore, category)
      
      scores.push({
        id: generateId(),
        organizationId: this.organizationId,
        category,
        score: Math.round(categoryScore * 10) / 10,
        maxScore: 100,
        percentile,
        period,
        framework: 'GRI',
        calculatedAt: new Date().toISOString(),
        breakdown
      })
    })
    
    return scores
  }

  // Generate ESG benchmarks
  generateBenchmarks(category?: ESGCategory): ESGBenchmark[] {
    const benchmarks: ESGBenchmark[] = []
    const categories = category ? [category] : ['Environmental', 'Social', 'Governance'] as ESGCategory[]
    
    categories.forEach(cat => {
      const categoryMetrics = ESG_METRICS_SEED_DATA.filter(m => m.category === cat)
      
      categoryMetrics.slice(0, 3).forEach(metric => { // Top 3 metrics per category
        const organizationScore = randomBetween(60, 95)
        const industryAverage = organizationScore * randomBetween(0.8, 1.2)
        const industryMedian = industryAverage * randomBetween(0.95, 1.05)
        const topQuartile = Math.max(industryAverage, industryMedian) * randomBetween(1.1, 1.3)
        const bestInClass = topQuartile * randomBetween(1.1, 1.4)
        
        benchmarks.push({
          category: cat,
          metric: metric.name,
          organizationScore: Math.round(organizationScore * 10) / 10,
          industryAverage: Math.round(industryAverage * 10) / 10,
          industryMedian: Math.round(industryMedian * 10) / 10,
          topQuartile: Math.round(topQuartile * 10) / 10,
          bestInClass: Math.round(bestInClass * 10) / 10,
          percentileRank: Math.round(randomBetween(40, 95))
        })
      })
    })
    
    return benchmarks
  }

  // Generate ESG trends
  generateTrends(dataPoints: ESGDataPoint[]): ESGTrend[] {
    const trends: ESGTrend[] = []
    const metricGroups = this.groupDataPointsByMetric(dataPoints)
    
    Object.entries(metricGroups).forEach(([metricId, points]) => {
      if (points.length < 2) return
      
      // Sort by period
      const sortedPoints = points.sort((a, b) => a.period.localeCompare(b.period))
      const latest = sortedPoints[sortedPoints.length - 1]
      const previous = sortedPoints[sortedPoints.length - 2]
      
      const changePercent = ((latest.value - previous.value) / previous.value) * 100
      let trend: 'Improving' | 'Stable' | 'Declining'
      
      if (Math.abs(changePercent) < 2) {
        trend = 'Stable'
      } else if (changePercent > 0) {
        // For some metrics, increase is improvement, for others it's decline
        const metric = ESG_METRICS_SEED_DATA.find(m => m.name === metricId)
        const isPositiveMetric = metric?.name.includes('Satisfaction') || 
                                metric?.name.includes('Diversity') ||
                                metric?.name.includes('Renewable') ||
                                metric?.name.includes('Recycling')
        trend = isPositiveMetric ? 'Improving' : 'Declining'
      } else {
        const metric = ESG_METRICS_SEED_DATA.find(m => m.name === metricId)
        const isNegativeMetric = metric?.name.includes('Emissions') ||
                                metric?.name.includes('Waste Generated') ||
                                metric?.name.includes('Injury')
        trend = isNegativeMetric ? 'Improving' : 'Declining'
      }
      
      const metric = ESG_METRICS_SEED_DATA.find(m => m.name === metricId)
      if (metric) {
        trends.push({
          category: metric.category,
          metric: metric.name,
          currentValue: latest.value,
          previousValue: previous.value,
          changePercent: Math.round(changePercent * 10) / 10,
          trend,
          periods: sortedPoints.slice(-12).map(p => ({
            period: p.period,
            value: p.value
          }))
        })
      }
    })
    
    return trends
  }

  // Generate complete ESG scorecard
  generateScorecard(
    period: string,
    framework: ESGFramework = 'GRI',
    monthsOfHistory = 24
  ): ESGScorecard {
    // Generate data points for all metrics
    const metricIds = ESG_METRICS_SEED_DATA.map(m => m.name)
    const dataPoints = this.generateDataPoints(metricIds, monthsOfHistory)
    
    // Generate scores
    const scores = this.generateESGScores(dataPoints, period)
    const environmentalScore = scores.find(s => s.category === 'Environmental')?.score || 0
    const socialScore = scores.find(s => s.category === 'Social')?.score || 0
    const governanceScore = scores.find(s => s.category === 'Governance')?.score || 0
    
    // Calculate overall score
    const overallScore = (environmentalScore + socialScore + governanceScore) / 3
    const overallRating = this.scoreToRating(overallScore)
    
    // Generate supporting data
    const benchmarks = this.generateBenchmarks()
    const trends = this.generateTrends(dataPoints)
    
    // Add IDs to risks, opportunities, and recommendations
    const risks = ESG_RISKS_SEED_DATA.map(risk => ({
      ...risk,
      id: generateId()
    }))
    
    const opportunities = ESG_OPPORTUNITIES_SEED_DATA.map(opp => ({
      ...opp,
      id: generateId()
    }))
    
    const recommendations = ESG_RECOMMENDATIONS_SEED_DATA.map(rec => ({
      ...rec,
      id: generateId()
    }))
    
    return {
      id: generateId(),
      organizationId: this.organizationId,
      period,
      framework,
      overallScore: Math.round(overallScore * 10) / 10,
      overallRating,
      environmentalScore: Math.round(environmentalScore * 10) / 10,
      socialScore: Math.round(socialScore * 10) / 10,
      governanceScore: Math.round(governanceScore * 10) / 10,
      scores,
      benchmarks,
      trends,
      risks,
      opportunities,
      recommendations,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'Published'
    }
  }

  // Generate ESG analytics
  generateAnalytics(period: string): ESGAnalytics {
    const performanceSummary = {
      overallImprovement: randomBetween(2, 8),
      categoryImprovements: {
        Environmental: randomBetween(3, 10),
        Social: randomBetween(1, 6),
        Governance: randomBetween(2, 7)
      },
      topPerformingMetrics: [
        'Renewable Energy Percentage',
        'Board Independence',
        'Ethics Training Completion'
      ],
      underperformingMetrics: [
        'Water Consumption',
        'Leadership Diversity',
        'CEO Pay Ratio'
      ],
      achievedTargets: Math.floor(randomBetween(8, 15)),
      totalTargets: 18
    }
    
    const industryComparison = {
      industryCode: this.industryType.toUpperCase(),
      industryName: this.industryType.charAt(0).toUpperCase() + this.industryType.slice(1),
      organizationRank: Math.floor(randomBetween(10, 50)),
      totalOrganizations: Math.floor(randomBetween(100, 500)),
      percentile: Math.floor(randomBetween(70, 95)),
      categoryComparisons: {
        Environmental: {
          score: randomBetween(75, 90),
          industryAverage: randomBetween(65, 80),
          industryMedian: randomBetween(68, 82),
          rank: Math.floor(randomBetween(8, 25)),
          percentile: Math.floor(randomBetween(80, 95))
        },
        Social: {
          score: randomBetween(70, 85),
          industryAverage: randomBetween(68, 78),
          industryMedian: randomBetween(70, 80),
          rank: Math.floor(randomBetween(12, 30)),
          percentile: Math.floor(randomBetween(75, 90))
        },
        Governance: {
          score: randomBetween(80, 95),
          industryAverage: randomBetween(75, 85),
          industryMedian: randomBetween(77, 87),
          rank: Math.floor(randomBetween(5, 20)),
          percentile: Math.floor(randomBetween(85, 98))
        }
      }
    }
    
    const trendAnalysis = {
      overallTrend: randomFromArray(['Improving', 'Stable']) as 'Improving' | 'Stable' | 'Declining',
      categoryTrends: {
        Environmental: 'Improving' as const,
        Social: randomFromArray(['Improving', 'Stable']) as 'Improving' | 'Stable' | 'Declining',
        Governance: 'Improving' as const
      },
      acceleratingMetrics: [
        'Renewable Energy Percentage',
        'Employee Satisfaction Score'
      ],
      decliningMetrics: [
        'Water Consumption'
      ],
      volatileMetrics: [
        'Training Hours per Employee',
        'Community Investment'
      ]
    }
    
    return {
      organizationId: this.organizationId,
      period,
      performanceSummary,
      industryComparison,
      trendAnalysis,
      materialityAssessment: [],
      riskHeatMap: {
        items: [],
        totalRiskScore: 0,
        riskDistribution: {}
      },
      opportunityMatrix: {
        items: [],
        totalValue: 0,
        quickWins: [],
        strategicBets: []
      }
    }
  }

  // Helper methods
  private calculatePercentile(score: number, category: ESGCategory): number {
    // Simplified percentile calculation based on score
    const basePercentile = Math.min(95, Math.max(5, (score / 100) * 85 + 10))
    
    // Add some category-specific adjustments
    const adjustments = {
      Environmental: 5, // Generally performing better
      Social: 0,
      Governance: 3
    }
    
    return Math.round(basePercentile + (adjustments[category] || 0))
  }
  
  private scoreToRating(score: number): ESGRating {
    if (score >= 97) return 'A+'
    if (score >= 93) return 'A'
    if (score >= 90) return 'A-'
    if (score >= 87) return 'B+'
    if (score >= 83) return 'B'
    if (score >= 80) return 'B-'
    if (score >= 77) return 'C+'
    if (score >= 73) return 'C'
    if (score >= 70) return 'C-'
    if (score >= 60) return 'D'
    return 'F'
  }
  
  private groupDataPointsByMetric(dataPoints: ESGDataPoint[]): Record<string, ESGDataPoint[]> {
    return dataPoints.reduce((groups, point) => {
      if (!groups[point.metricId]) {
        groups[point.metricId] = []
      }
      groups[point.metricId].push(point)
      return groups
    }, {} as Record<string, ESGDataPoint[]>)
  }
}

// Factory functions for easy data generation
export const generateSampleESGData = {
  // Quick generators for different scenarios
  
  forTechCompany: (organizationId: OrganizationId, userId: UserId) => {
    return new ESGDataGenerator(organizationId, userId, new Date(), 'technology')
  },
  
  forManufacturing: (organizationId: OrganizationId, userId: UserId) => {
    return new ESGDataGenerator(organizationId, userId, new Date(), 'manufacturing')
  },
  
  forFinance: (organizationId: OrganizationId, userId: UserId) => {
    return new ESGDataGenerator(organizationId, userId, new Date(), 'finance')
  },
  
  // Generate a complete dataset for testing
  fullDataset: (
    organizationId: OrganizationId,
    userId: UserId,
    industryType: 'technology' | 'manufacturing' | 'finance' | 'healthcare' | 'energy' = 'technology'
  ) => {
    const generator = new ESGDataGenerator(organizationId, userId, new Date(), industryType)
    const currentPeriod = formatPeriod(new Date())
    
    return {
      configuration: DEFAULT_ESG_CONFIGURATION(organizationId),
      metrics: ESG_METRICS_SEED_DATA,
      dataPoints: generator.generateDataPoints(ESG_METRICS_SEED_DATA.map(m => m.name), 24),
      scorecard: generator.generateScorecard(currentPeriod),
      analytics: generator.generateAnalytics(currentPeriod),
      benchmarks: generator.generateBenchmarks()
    }
  }
}

// Export the main generator class and utility functions
export { ESGDataGenerator }