#!/usr/bin/env node

/**
 * ESG Demo Script
 * 
 * Quick demonstration of the ESG scorecard system with sample data generation.
 * This script shows how to use the ESG factories and generators.
 */

const { ESGDatasetFactory, ESGScorecardFactory } = require('../__tests__/factories/esg.factory.ts')
const { generateSampleESGData } = require('../lib/test-utils/esg-data-generators.ts')
const esgDevUtils = require('../lib/dev/esg-dev-utils.ts').default

async function runESGDemo() {
  console.log('🌱 ESG Scorecard System Demo')
  console.log('════════════════════════════════════════\n')

  try {
    // Demo 1: Quick single organization dataset
    console.log('📊 Demo 1: Single Organization Dataset')
    console.log('─────────────────────────────────────────')
    
    const singleOrgData = esgDevUtils.generateQuickDataset(
      'demo_org_001',
      'demo_user_001', 
      'technology'
    )
    
    esgDevUtils.dev.logScorecardSummary(singleOrgData.scorecard)
    
    // Demo 2: Multiple organizations comparison
    console.log('🏢 Demo 2: Multi-Organization Comparison')
    console.log('─────────────────────────────────────────')
    
    const multiOrgData = esgDevUtils.generateMultiOrgData()
    
    console.log('\n📈 Organization Performance Comparison:')
    multiOrgData.organizations.forEach((org, i) => {
      const scorecard = multiOrgData.datasets[i].scorecard
      console.log(`   ${org.name}: ${scorecard.overallRating} (${scorecard.overallScore}/100) - ${org.industry}`)
    })

    // Demo 3: Performance scenarios
    console.log('\n🎯 Demo 3: Performance Scenarios')
    console.log('─────────────────────────────────────────')
    
    const scenarios = esgDevUtils.dev.generateTestScenarios()
    
    console.log('\n🔍 Comparing High vs Low Performer:')
    esgDevUtils.dev.compareScorecards(scenarios.lowPerformer, scenarios.highPerformer)

    // Demo 4: Industry variations
    console.log('🏭 Demo 4: Industry Variations')
    console.log('─────────────────────────────────────────')
    
    const industries = ['technology', 'manufacturing', 'finance']
    const industryScores = {}
    
    industries.forEach(industry => {
      const data = generateSampleESGData.fullDataset('demo_org', 'demo_user', industry)
      industryScores[industry] = data.scorecard.overallScore
    })
    
    console.log('📊 Average ESG Scores by Industry:')
    Object.entries(industryScores).forEach(([industry, score]) => {
      console.log(`   ${industry.charAt(0).toUpperCase() + industry.slice(1)}: ${score.toFixed(1)}/100`)
    })

    // Demo 5: Data validation
    console.log('\n✅ Demo 5: Data Validation')
    console.log('─────────────────────────────────────────')
    
    const validationResult = esgDevUtils.dev.validateData(singleOrgData)
    
    if (validationResult) {
      console.log('All generated data passes validation checks!')
    }

    // Demo 6: Sample API payload
    console.log('\n🔌 Demo 6: Sample API Payload Structure')
    console.log('─────────────────────────────────────────')
    
    const apiPayload = {
      scorecard: {
        id: singleOrgData.scorecard.id,
        organizationId: singleOrgData.scorecard.organizationId,
        overallScore: singleOrgData.scorecard.overallScore,
        overallRating: singleOrgData.scorecard.overallRating,
        framework: singleOrgData.scorecard.framework,
        period: singleOrgData.scorecard.period,
        categoryScores: {
          environmental: singleOrgData.scorecard.environmentalScore,
          social: singleOrgData.scorecard.socialScore,
          governance: singleOrgData.scorecard.governanceScore
        }
      },
      metadata: {
        metricsCount: singleOrgData.metrics.length,
        dataPointsCount: singleOrgData.dataPoints.length,
        benchmarksCount: singleOrgData.benchmarks.length,
        risksCount: singleOrgData.scorecard.risks.length,
        opportunitiesCount: singleOrgData.scorecard.opportunities.length,
        recommendationsCount: singleOrgData.scorecard.recommendations.length
      }
    }
    
    console.log('Sample API Response Structure:')
    console.log(JSON.stringify(apiPayload, null, 2))

    console.log('\n✨ ESG Demo completed successfully!')
    console.log('\n💡 Next Steps:')
    console.log('   • Use the generated data with the ESG API endpoints')
    console.log('   • Test the ESG scorecard UI components')
    console.log('   • Run the seeding script: npm run seed:esg --demo')
    console.log('   • Explore the ESG settings tab in the dashboard')

  } catch (error) {
    console.error('❌ Demo failed:', error)
    process.exit(1)
  }
}

// Only run if called directly
if (require.main === module) {
  runESGDemo().catch(error => {
    console.error('Demo execution failed:', error)
    process.exit(1)
  })
}

module.exports = { runESGDemo }