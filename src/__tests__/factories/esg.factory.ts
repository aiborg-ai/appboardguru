import { faker } from '@faker-js/faker'
import type {
  ESGScorecard,
  ESGMetric,
  ESGDataPoint,
  ESGConfiguration,
  ESGAnalytics,
  ESGBenchmark,
  ESGTrend,
  ESGRisk,
  ESGOpportunity,
  ESGRecommendation,
  ESGFramework,
  ESGCategory,
  ESGRating,
  OrganizationId,
  UserId
} from '@/types/esg'
import { ESGDataGenerator, generateSampleESGData } from '@/lib/test-utils/esg-data-generators'
import { ESG_METRICS_SEED_DATA } from '@/lib/test-utils/esg-seed-data'

// Base factory class for ESG entities
export class ESGFactory {
  static organizationId = (): OrganizationId => `org_${faker.string.uuid()}` as OrganizationId
  static userId = (): UserId => `user_${faker.string.uuid()}` as UserId
  static esgId = (): string => `esg_${faker.string.uuid()}`
  static period = (): string => faker.date.recent({ days: 365 }).toISOString().slice(0, 7) // YYYY-MM
  static framework = (): ESGFramework => faker.helpers.arrayElement(['GRI', 'SASB', 'TCFD', 'CDP', 'DJSI', 'MSCI'])
  static category = (): ESGCategory => faker.helpers.arrayElement(['Environmental', 'Social', 'Governance'])
  static rating = (): ESGRating => faker.helpers.arrayElement(['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'])
}

// ESG Metric Factory
export class ESGMetricFactory extends ESGFactory {
  static build(overrides: Partial<ESGMetric> = {}): ESGMetric {
    const category = overrides.category || this.category()
    const subcategories = {
      Environmental: ['Climate Change', 'Energy', 'Water', 'Waste', 'Biodiversity'],
      Social: ['Employee Wellbeing', 'Diversity & Inclusion', 'Health & Safety', 'Training & Development', 'Community'],
      Governance: ['Board Composition', 'Ethics & Compliance', 'Risk Management', 'Transparency', 'Executive Compensation']
    }
    
    return {
      id: this.esgId(),
      category,
      subcategory: faker.helpers.arrayElement(subcategories[category]),
      name: faker.company.buzzVerb() + ' ' + faker.company.buzzNoun(),
      description: faker.lorem.sentences(2),
      unit: faker.helpers.arrayElement(['%', 'tCO2e', 'MWh', 'm³', 'tonnes', 'score (1-10)', 'hours', 'USD', 'ratio']),
      target: faker.number.float({ min: 10, max: 1000, fractionDigits: 1 }),
      weight: faker.number.int({ min: 5, max: 20 }),
      framework: [this.framework()],
      dataSource: faker.helpers.arrayElement(['Internal Systems', 'External Provider', 'Manual Entry', 'IoT Sensors']),
      calculationMethod: faker.lorem.sentence(),
      reportingFrequency: faker.helpers.arrayElement(['Monthly', 'Quarterly', 'Annually']),
      isRequired: faker.datatype.boolean(),
      tags: faker.helpers.arrayElements(['sustainability', 'compliance', 'performance', 'social-impact', 'governance']),
      ...overrides
    }
  }

  static buildList(count: number, overrides: Partial<ESGMetric> = {}): ESGMetric[] {
    return Array.from({ length: count }, () => this.build(overrides))
  }

  static buildEnvironmentalMetric(overrides: Partial<ESGMetric> = {}): ESGMetric {
    return this.build({ category: 'Environmental', ...overrides })
  }

  static buildSocialMetric(overrides: Partial<ESGMetric> = {}): ESGMetric {
    return this.build({ category: 'Social', ...overrides })
  }

  static buildGovernanceMetric(overrides: Partial<ESGMetric> = {}): ESGMetric {
    return this.build({ category: 'Governance', ...overrides })
  }

  // Build metrics from seed data for realistic testing
  static buildFromSeedData(): ESGMetric[] {
    return ESG_METRICS_SEED_DATA.map(metric => ({
      ...metric,
      id: this.esgId()
    }))
  }
}

// ESG Data Point Factory
export class ESGDataPointFactory extends ESGFactory {
  static build(overrides: Partial<ESGDataPoint> = {}): ESGDataPoint {
    return {
      id: this.esgId(),
      metricId: overrides.metricId || this.esgId(),
      organizationId: overrides.organizationId || this.organizationId(),
      value: faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }),
      period: overrides.period || this.period(),
      unit: faker.helpers.arrayElement(['%', 'tCO2e', 'MWh']),
      dataSource: faker.helpers.arrayElement(['System', 'Manual', 'Import', 'API']),
      verificationStatus: faker.helpers.arrayElement(['Unverified', 'Internal', 'External', 'Certified']),
      notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
      createdAt: faker.date.recent().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      createdBy: overrides.createdBy || this.userId(),
      ...overrides
    }
  }

  static buildList(count: number, overrides: Partial<ESGDataPoint> = {}): ESGDataPoint[] {
    return Array.from({ length: count }, () => this.build(overrides))
  }

  static buildTimeSeries(
    metricId: string,
    organizationId: OrganizationId,
    userId: UserId,
    months: number = 12
  ): ESGDataPoint[] {
    const dataPoints: ESGDataPoint[] = []
    const baseValue = faker.number.float({ min: 50, max: 200 })
    
    for (let i = months; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const period = date.toISOString().slice(0, 7)
      
      // Add trend and variation
      const trend = i === months ? 0 : (months - i) * 0.02 // 2% improvement per month
      const variation = faker.number.float({ min: -0.1, max: 0.1 }) // ±10% variation
      const value = baseValue * (1 + trend + variation)
      
      dataPoints.push(this.build({
        metricId,
        organizationId,
        createdBy: userId,
        period,
        value: Math.max(0, value),
        createdAt: date.toISOString(),
        updatedAt: date.toISOString()
      }))
    }
    
    return dataPoints
  }
}

// ESG Configuration Factory
export class ESGConfigurationFactory extends ESGFactory {
  static build(overrides: Partial<ESGConfiguration> = {}): ESGConfiguration {
    return {
      organizationId: overrides.organizationId || this.organizationId(),
      framework: [this.framework()],
      reportingPeriod: faker.helpers.arrayElement(['Monthly', 'Quarterly', 'Annually']),
      industryBenchmarks: faker.datatype.boolean({ probability: 0.8 }),
      peerComparison: faker.datatype.boolean({ probability: 0.6 }),
      enabledCategories: faker.helpers.arrayElements(['Environmental', 'Social', 'Governance'], { min: 1, max: 3 }),
      customMetrics: [],
      weightings: [
        { category: 'Environmental', weight: faker.number.float({ min: 25, max: 40 }) },
        { category: 'Social', weight: faker.number.float({ min: 25, max: 40 }) },
        { category: 'Governance', weight: faker.number.float({ min: 25, max: 40 }) }
      ],
      dataQualityThresholds: {
        minimumVerificationLevel: faker.helpers.arrayElement(['Unverified', 'Internal', 'External', 'Certified']),
        dataFreshnessThreshold: faker.number.int({ min: 30, max: 180 }),
        completenessThreshold: faker.number.int({ min: 70, max: 100 })
      },
      notificationSettings: {
        scoreUpdates: faker.datatype.boolean(),
        benchmarkChanges: faker.datatype.boolean(),
        riskAlerts: faker.datatype.boolean(),
        opportunityAlerts: faker.datatype.boolean(),
        reportingDeadlines: faker.datatype.boolean(),
        dataQualityIssues: faker.datatype.boolean()
      },
      ...overrides
    }
  }
}

// ESG Scorecard Factory
export class ESGScorecardFactory extends ESGFactory {
  static build(overrides: Partial<ESGScorecard> = {}): ESGScorecard {
    const environmentalScore = faker.number.float({ min: 60, max: 95 })
    const socialScore = faker.number.float({ min: 60, max: 95 })
    const governanceScore = faker.number.float({ min: 60, max: 95 })
    const overallScore = (environmentalScore + socialScore + governanceScore) / 3
    
    return {
      id: this.esgId(),
      organizationId: overrides.organizationId || this.organizationId(),
      period: overrides.period || this.period(),
      framework: overrides.framework || this.framework(),
      overallScore: Math.round(overallScore * 10) / 10,
      overallRating: this.scoreToRating(overallScore),
      environmentalScore: Math.round(environmentalScore * 10) / 10,
      socialScore: Math.round(socialScore * 10) / 10,
      governanceScore: Math.round(governanceScore * 10) / 10,
      scores: [],
      benchmarks: [],
      trends: [],
      risks: [],
      opportunities: [],
      recommendations: [],
      createdAt: faker.date.recent().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      status: faker.helpers.arrayElement(['Draft', 'In Review', 'Approved', 'Published']),
      ...overrides
    }
  }

  static buildComplete(
    organizationId?: OrganizationId,
    userId?: UserId,
    industryType?: 'technology' | 'manufacturing' | 'finance' | 'healthcare' | 'energy'
  ): ESGScorecard {
    const orgId = organizationId || this.organizationId()
    const uId = userId || this.userId()
    const generator = new ESGDataGenerator(orgId, uId, new Date(), industryType || 'technology')
    
    return generator.generateScorecard(this.period())
  }

  static buildHighPerforming(overrides: Partial<ESGScorecard> = {}): ESGScorecard {
    return this.build({
      overallScore: faker.number.float({ min: 85, max: 98 }),
      overallRating: faker.helpers.arrayElement(['A+', 'A', 'A-']),
      environmentalScore: faker.number.float({ min: 85, max: 98 }),
      socialScore: faker.number.float({ min: 85, max: 98 }),
      governanceScore: faker.number.float({ min: 85, max: 98 }),
      status: 'Published',
      ...overrides
    })
  }

  static buildLowPerforming(overrides: Partial<ESGScorecard> = {}): ESGScorecard {
    return this.build({
      overallScore: faker.number.float({ min: 40, max: 65 }),
      overallRating: faker.helpers.arrayElement(['C', 'C-', 'D']),
      environmentalScore: faker.number.float({ min: 40, max: 65 }),
      socialScore: faker.number.float({ min: 40, max: 65 }),
      governanceScore: faker.number.float({ min: 40, max: 65 }),
      status: 'Draft',
      ...overrides
    })
  }

  private static scoreToRating(score: number): ESGRating {
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
}

// ESG Risk Factory
export class ESGRiskFactory extends ESGFactory {
  static build(overrides: Partial<ESGRisk> = {}): ESGRisk {
    return {
      id: this.esgId(),
      category: overrides.category || this.category(),
      title: faker.lorem.sentence({ min: 3, max: 6 }),
      description: faker.lorem.sentences(2),
      impact: faker.helpers.arrayElement(['Low', 'Medium', 'High', 'Critical']),
      likelihood: faker.helpers.arrayElement(['Low', 'Medium', 'High']),
      riskScore: faker.number.int({ min: 10, max: 100 }),
      mitigation: faker.helpers.multiple(() => faker.lorem.sentence(), { count: { min: 1, max: 4 } }),
      owner: faker.helpers.maybe(() => faker.person.fullName(), { probability: 0.7 }),
      dueDate: faker.helpers.maybe(() => faker.date.future().toISOString().slice(0, 10), { probability: 0.8 }),
      status: faker.helpers.arrayElement(['Identified', 'Assessing', 'Mitigating', 'Monitoring', 'Resolved']),
      ...overrides
    }
  }

  static buildList(count: number, overrides: Partial<ESGRisk> = {}): ESGRisk[] {
    return Array.from({ length: count }, () => this.build(overrides))
  }

  static buildCritical(overrides: Partial<ESGRisk> = {}): ESGRisk {
    return this.build({
      impact: 'Critical',
      likelihood: faker.helpers.arrayElement(['Medium', 'High']),
      riskScore: faker.number.int({ min: 80, max: 100 }),
      status: faker.helpers.arrayElement(['Identified', 'Assessing', 'Mitigating']),
      ...overrides
    })
  }
}

// ESG Opportunity Factory
export class ESGOpportunityFactory extends ESGFactory {
  static build(overrides: Partial<ESGOpportunity> = {}): ESGOpportunity {
    return {
      id: this.esgId(),
      category: overrides.category || this.category(),
      title: faker.lorem.sentence({ min: 3, max: 6 }),
      description: faker.lorem.sentences(2),
      potentialImpact: faker.helpers.arrayElement(['Low', 'Medium', 'High']),
      effort: faker.helpers.arrayElement(['Low', 'Medium', 'High']),
      timeframe: faker.helpers.arrayElement(['Short', 'Medium', 'Long']),
      estimatedValue: faker.helpers.maybe(() => faker.number.int({ min: 10000, max: 1000000 }), { probability: 0.7 }),
      actionItems: faker.helpers.multiple(() => faker.lorem.sentence(), { count: { min: 2, max: 5 } }),
      owner: faker.helpers.maybe(() => faker.person.fullName(), { probability: 0.7 }),
      status: faker.helpers.arrayElement(['Identified', 'Planning', 'In Progress', 'Implemented', 'Closed']),
      ...overrides
    }
  }

  static buildList(count: number, overrides: Partial<ESGOpportunity> = {}): ESGOpportunity[] {
    return Array.from({ length: count }, () => this.build(overrides))
  }

  static buildQuickWin(overrides: Partial<ESGOpportunity> = {}): ESGOpportunity {
    return this.build({
      potentialImpact: faker.helpers.arrayElement(['Medium', 'High']),
      effort: 'Low',
      timeframe: 'Short',
      estimatedValue: faker.number.int({ min: 50000, max: 200000 }),
      ...overrides
    })
  }
}

// ESG Benchmark Factory
export class ESGBenchmarkFactory extends ESGFactory {
  static build(overrides: Partial<ESGBenchmark> = {}): ESGBenchmark {
    const organizationScore = faker.number.float({ min: 60, max: 95 })
    const industryAverage = organizationScore * faker.number.float({ min: 0.8, max: 1.2 })
    
    return {
      category: overrides.category || this.category(),
      metric: faker.company.buzzVerb() + ' ' + faker.company.buzzNoun(),
      organizationScore: Math.round(organizationScore * 10) / 10,
      industryAverage: Math.round(industryAverage * 10) / 10,
      industryMedian: Math.round(industryAverage * faker.number.float({ min: 0.95, max: 1.05 }) * 10) / 10,
      topQuartile: Math.round(industryAverage * faker.number.float({ min: 1.1, max: 1.3 }) * 10) / 10,
      bestInClass: Math.round(industryAverage * faker.number.float({ min: 1.3, max: 1.6 }) * 10) / 10,
      percentileRank: faker.number.int({ min: 40, max: 95 }),
      ...overrides
    }
  }

  static buildList(count: number, overrides: Partial<ESGBenchmark> = {}): ESGBenchmark[] {
    return Array.from({ length: count }, () => this.build(overrides))
  }
}

// Comprehensive factory for full ESG dataset
export class ESGDatasetFactory extends ESGFactory {
  static build(
    organizationId?: OrganizationId,
    userId?: UserId,
    industryType: 'technology' | 'manufacturing' | 'finance' | 'healthcare' | 'energy' = 'technology'
  ) {
    const orgId = organizationId || this.organizationId()
    const uId = userId || this.userId()
    
    return generateSampleESGData.fullDataset(orgId, uId, industryType)
  }

  static buildForDemo(): {
    organizations: { id: OrganizationId, name: string, industry: string }[],
    users: { id: UserId, name: string }[],
    datasets: any[]
  } {
    const organizations = [
      { id: this.organizationId(), name: 'TechCorp Solutions', industry: 'technology' },
      { id: this.organizationId(), name: 'GreenManufacturing Inc', industry: 'manufacturing' },
      { id: this.organizationId(), name: 'Sustainable Finance Ltd', industry: 'finance' }
    ] as const
    
    const users = [
      { id: this.userId(), name: 'Sarah Chen' },
      { id: this.userId(), name: 'Michael Rodriguez' },
      { id: this.userId(), name: 'Emily Thompson' }
    ]
    
    const datasets = organizations.map((org, index) => 
      this.build(org.id, users[index].id, org.industry as any)
    )
    
    return { organizations, users, datasets }
  }
}

// Export all factories for easy importing
export {
  ESGFactory,
  ESGMetricFactory,
  ESGDataPointFactory,
  ESGConfigurationFactory,
  ESGScorecardFactory,
  ESGRiskFactory,
  ESGOpportunityFactory,
  ESGBenchmarkFactory,
  ESGDatasetFactory
}