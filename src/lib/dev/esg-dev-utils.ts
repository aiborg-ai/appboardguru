/**
 * ESG Development Utilities
 * 
 * Convenient functions for generating and working with ESG data during development
 */

import type { OrganizationId, UserId, ESGFramework } from '@/types/esg'
import { generateSampleESGData, ESGDataGenerator } from '@/lib/test-utils/esg-data-generators'
import {
  ESGDatasetFactory,
  ESGScorecardFactory,
  ESGMetricFactory,
  ESGDataPointFactory
} from '@/__tests__/factories/esg.factory'

// Quick data generation for development
export const esgDevUtils = {
  // Generate a complete ESG dataset for quick testing
  generateQuickDataset: (
    orgId: OrganizationId = 'org_dev_test' as OrganizationId,
    userId: UserId = 'user_dev_test' as UserId,
    industry: 'technology' | 'manufacturing' | 'finance' | 'healthcare' | 'energy' = 'technology'
  ) => {
    console.log('🏗️ Generating ESG dataset for development...')
    const dataset = generateSampleESGData.fullDataset(orgId, userId, industry)
    
    console.log('📊 Generated:')
    console.log(`   • Configuration: ${dataset.configuration.framework.length} framework(s)`)
    console.log(`   • Metrics: ${dataset.metrics.length} standard metrics`)
    console.log(`   • Data Points: ${dataset.dataPoints.length} historical data points`)
    console.log(`   • Scorecard: ${dataset.scorecard.overallRating} (${dataset.scorecard.overallScore})`)
    console.log(`   • Benchmarks: ${dataset.benchmarks.length} industry comparisons`)
    
    return dataset
  },

  // Generate multiple organizations for comparison testing
  generateMultiOrgData: () => {
    console.log('🏢 Generating multi-organization ESG data...')
    const demoData = ESGDatasetFactory.buildForDemo()
    
    console.log('📈 Generated:')
    demoData.organizations.forEach((org, i) => {
      const dataset = demoData.datasets[i]
      console.log(`   • ${org.name} (${org.industry}): ${dataset.scorecard.overallRating} rating`)
    })
    
    return demoData
  },

  // Generate specific scorecard for testing scenarios
  generateScenarioScorecard: {
    highPerformer: (orgId?: OrganizationId) => {
      console.log('🏆 Generating high-performing ESG scorecard...')
      return ESGScorecardFactory.buildHighPerforming({ 
        organizationId: orgId || 'org_high_performer' as OrganizationId 
      })
    },
    
    lowPerformer: (orgId?: OrganizationId) => {
      console.log('📉 Generating low-performing ESG scorecard...')
      return ESGScorecardFactory.buildLowPerforming({ 
        organizationId: orgId || 'org_low_performer' as OrganizationId 
      })
    },
    
    improving: (orgId?: OrganizationId, userId?: UserId) => {
      console.log('📈 Generating improving ESG scorecard with trends...')
      const generator = new ESGDataGenerator(
        orgId || 'org_improving' as OrganizationId,
        userId || 'user_dev' as UserId,
        new Date(),
        'technology'
      )
      return generator.generateScorecard(new Date().toISOString().slice(0, 7))
    }
  },

  // Generate time series data for specific metrics
  generateMetricTimeSeries: (
    metricName: string,
    months = 12,
    orgId?: OrganizationId,
    userId?: UserId
  ) => {
    console.log(`📊 Generating ${months} months of data for ${metricName}...`)
    return ESGDataPointFactory.buildTimeSeries(
      metricName,
      orgId || 'org_metric_test' as OrganizationId,
      userId || 'user_dev' as UserId,
      months
    )
  },

  // Generate sample data for specific industries
  generateIndustryData: {
    technology: (orgId?: OrganizationId, userId?: UserId) => {
      return generateSampleESGData.forTechCompany(
        orgId || 'org_tech' as OrganizationId,
        userId || 'user_dev' as UserId
      ).generateScorecard(new Date().toISOString().slice(0, 7))
    },
    
    manufacturing: (orgId?: OrganizationId, userId?: UserId) => {
      return generateSampleESGData.forManufacturing(
        orgId || 'org_manufacturing' as OrganizationId,
        userId || 'user_dev' as UserId
      ).generateScorecard(new Date().toISOString().slice(0, 7))
    },
    
    finance: (orgId?: OrganizationId, userId?: UserId) => {
      return generateSampleESGData.forFinance(
        orgId || 'org_finance' as OrganizationId,
        userId || 'user_dev' as UserId
      ).generateScorecard(new Date().toISOString().slice(0, 7))
    }
  },

  // Generate data for specific ESG frameworks
  generateFrameworkData: (
    framework: ESGFramework,
    orgId?: OrganizationId,
    userId?: UserId
  ) => {
    console.log(`📋 Generating ESG data for ${framework} framework...`)
    const generator = new ESGDataGenerator(
      orgId || 'org_framework_test' as OrganizationId,
      userId || 'user_dev' as UserId
    )
    
    return generator.generateScorecard(
      new Date().toISOString().slice(0, 7),
      framework
    )
  },

  // Development helpers
  dev: {
    // Log a formatted scorecard summary
    logScorecardSummary: (scorecard: any) => {
      console.log('\n📊 ESG Scorecard Summary')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`Overall: ${scorecard.overallRating} (${scorecard.overallScore}/100)`)
      console.log(`Environmental: ${scorecard.environmentalScore}/100`)
      console.log(`Social: ${scorecard.socialScore}/100`)
      console.log(`Governance: ${scorecard.governanceScore}/100`)
      console.log(`Framework: ${scorecard.framework}`)
      console.log(`Period: ${scorecard.period}`)
      console.log(`Status: ${scorecard.status}`)
      
      if (scorecard.risks?.length > 0) {
        console.log(`\n⚠️  Risks: ${scorecard.risks.length}`)
        scorecard.risks.slice(0, 3).forEach((risk: any) => {
          console.log(`   • ${risk.title} (${risk.impact} impact)`)
        })
      }
      
      if (scorecard.opportunities?.length > 0) {
        console.log(`\n🎯 Opportunities: ${scorecard.opportunities.length}`)
        scorecard.opportunities.slice(0, 3).forEach((opp: any) => {
          console.log(`   • ${opp.title} (${opp.potentialImpact} impact)`)
        })
      }
      
      if (scorecard.recommendations?.length > 0) {
        console.log(`\n💡 Recommendations: ${scorecard.recommendations.length}`)
        scorecard.recommendations.slice(0, 3).forEach((rec: any) => {
          console.log(`   • ${rec.title} (${rec.priority} priority)`)
        })
      }
      console.log('')
    },

    // Validate generated data
    validateData: (dataset: any) => {
      const issues: string[] = []
      
      // Check scorecard
      if (!dataset.scorecard) {
        issues.push('Missing scorecard')
      } else {
        if (dataset.scorecard.overallScore < 0 || dataset.scorecard.overallScore > 100) {
          issues.push('Invalid overall score')
        }
        if (!dataset.scorecard.organizationId) {
          issues.push('Missing organization ID')
        }
      }
      
      // Check data points
      if (!dataset.dataPoints || dataset.dataPoints.length === 0) {
        issues.push('No data points generated')
      }
      
      // Check configuration
      if (!dataset.configuration) {
        issues.push('Missing configuration')
      }
      
      if (issues.length === 0) {
        console.log('✅ Data validation passed')
      } else {
        console.log('❌ Data validation issues:')
        issues.forEach(issue => console.log(`   • ${issue}`))
      }
      
      return issues.length === 0
    },

    // Compare scorecards
    compareScorecards: (scorecard1: any, scorecard2: any) => {
      console.log('\n🔍 Scorecard Comparison')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('                  Scorecard 1    Scorecard 2    Difference')
      console.log(`Overall:          ${scorecard1.overallScore.toFixed(1).padEnd(12)} ${scorecard2.overallScore.toFixed(1).padEnd(12)} ${(scorecard2.overallScore - scorecard1.overallScore).toFixed(1)}`)
      console.log(`Environmental:    ${scorecard1.environmentalScore.toFixed(1).padEnd(12)} ${scorecard2.environmentalScore.toFixed(1).padEnd(12)} ${(scorecard2.environmentalScore - scorecard1.environmentalScore).toFixed(1)}`)
      console.log(`Social:           ${scorecard1.socialScore.toFixed(1).padEnd(12)} ${scorecard2.socialScore.toFixed(1).padEnd(12)} ${(scorecard2.socialScore - scorecard1.socialScore).toFixed(1)}`)
      console.log(`Governance:       ${scorecard1.governanceScore.toFixed(1).padEnd(12)} ${scorecard2.governanceScore.toFixed(1).padEnd(12)} ${(scorecard2.governanceScore - scorecard1.governanceScore).toFixed(1)}`)
      console.log('')
    },

    // Generate test scenarios for debugging
    generateTestScenarios: () => {
      console.log('🧪 Generating test scenarios...')
      
      const scenarios = {
        baseline: esgDevUtils.generateScenarioScorecard.improving(),
        highPerformer: esgDevUtils.generateScenarioScorecard.highPerformer(),
        lowPerformer: esgDevUtils.generateScenarioScorecard.lowPerformer(),
        techCompany: esgDevUtils.generateIndustryData.technology(),
        manufacturingCompany: esgDevUtils.generateIndustryData.manufacturing()
      }
      
      console.log('📊 Generated test scenarios:')
      Object.entries(scenarios).forEach(([name, scorecard]) => {
        console.log(`   • ${name}: ${scorecard.overallRating} (${scorecard.overallScore})`)
      })
      
      return scenarios
    }
  }
}

// Browser console helpers (for development in browser)
if (typeof window !== 'undefined') {
  ;(window as any).esgDev = esgDevUtils
  console.log('🌱 ESG development utilities loaded! Use esgDev.* to generate sample data')
}

export default esgDevUtils