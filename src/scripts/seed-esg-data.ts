#!/usr/bin/env node

/**
 * ESG Data Seeding Script
 * 
 * This script seeds the database with sample ESG data for development and testing.
 * It can be run with different options to generate various types of datasets.
 * 
 * Usage:
 *   npm run seed:esg [options]
 *   
 * Options:
 *   --org-id <id>          Seed data for specific organization
 *   --user-id <id>         Use specific user ID for data creation
 *   --industry <type>      Industry type (technology|manufacturing|finance|healthcare|energy)
 *   --periods <number>     Number of historical periods to generate (default: 24)
 *   --demo                 Generate demo data for multiple organizations
 *   --clean                Clean existing ESG data before seeding
 *   --verbose              Verbose logging
 */

import { createClient } from '@supabase/supabase-js'
import { Command } from 'commander'
import { ESGDatasetFactory, ESGScorecardFactory, ESGMetricFactory } from '../__tests__/factories/esg.factory'
import { generateSampleESGData, ESGDataGenerator } from '../lib/test-utils/esg-data-generators'
import { ESG_METRICS_SEED_DATA } from '../lib/test-utils/esg-seed-data'
import type { OrganizationId, UserId } from '../types/esg'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey!)

interface SeedOptions {
  orgId?: string
  userId?: string
  industry?: 'technology' | 'manufacturing' | 'finance' | 'healthcare' | 'energy'
  periods?: number
  demo?: boolean
  clean?: boolean
  verbose?: boolean
}

class ESGDataSeeder {
  constructor(private options: SeedOptions) {}

  async run(): Promise<void> {
    try {
      console.log('🌱 Starting ESG data seeding...')
      
      if (this.options.clean) {
        await this.cleanExistingData()
      }

      if (this.options.demo) {
        await this.seedDemoData()
      } else {
        await this.seedSingleOrganization()
      }

      console.log('✅ ESG data seeding completed successfully!')
    } catch (error) {
      console.error('❌ ESG data seeding failed:', error)
      process.exit(1)
    }
  }

  private async cleanExistingData(): Promise<void> {
    if (this.options.verbose) {
      console.log('🧹 Cleaning existing ESG data...')
    }

    const tables = [
      'esg_scorecards',
      'esg_data_points', 
      'esg_configurations',
      'esg_metrics',
      'esg_risks',
      'esg_opportunities',
      'esg_recommendations'
    ]

    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .neq('id', '') // Delete all records
        
        if (error && error.code !== '42P01') { // Ignore table doesn't exist error
          console.warn(`⚠️ Warning: Could not clean table ${table}:`, error.message)
        } else if (this.options.verbose) {
          console.log(`   ✓ Cleaned ${table}`)
        }
      } catch (err) {
        console.warn(`⚠️ Warning: Could not clean table ${table}:`, err)
      }
    }
  }

  private async seedSingleOrganization(): Promise<void> {
    const orgId = (this.options.orgId || `org_demo_${Date.now()}`) as OrganizationId
    const userId = (this.options.userId || `user_demo_${Date.now()}`) as UserId
    const industry = this.options.industry || 'technology'
    const periods = this.options.periods || 24

    console.log(`📊 Seeding ESG data for organization: ${orgId}`)
    console.log(`   Industry: ${industry}`)
    console.log(`   Historical periods: ${periods}`)

    // Generate comprehensive dataset
    const dataset = generateSampleESGData.fullDataset(orgId, userId, industry)

    // Seed base metrics (if table exists)
    await this.seedMetrics()

    // Seed configuration
    await this.seedConfiguration(dataset.configuration)

    // Seed data points
    await this.seedDataPoints(dataset.dataPoints)

    // Seed scorecard
    await this.seedScorecard(dataset.scorecard)

    console.log(`✅ Successfully seeded ESG data for ${orgId}`)
  }

  private async seedDemoData(): Promise<void> {
    console.log('🎭 Seeding demo data for multiple organizations...')

    const demoData = ESGDatasetFactory.buildForDemo()
    
    console.log(`   📈 Generated data for ${demoData.organizations.length} organizations`)
    
    for (let i = 0; i < demoData.organizations.length; i++) {
      const org = demoData.organizations[i]
      const user = demoData.users[i]
      const dataset = demoData.datasets[i]

      console.log(`   🏢 Seeding ${org.name} (${org.industry})...`)

      try {
        // Seed each organization's data
        await this.seedConfiguration(dataset.configuration)
        await this.seedDataPoints(dataset.dataPoints.slice(0, 50)) // Limit data points for demo
        await this.seedScorecard(dataset.scorecard)

        if (this.options.verbose) {
          console.log(`      ✓ Configuration: 1 record`)
          console.log(`      ✓ Data points: ${Math.min(dataset.dataPoints.length, 50)} records`)
          console.log(`      ✓ Scorecard: 1 record`)
        }
      } catch (error) {
        console.error(`      ❌ Failed to seed ${org.name}:`, error)
      }
    }

    // Seed shared metrics once
    await this.seedMetrics()
  }

  private async seedMetrics(): Promise<void> {
    if (this.options.verbose) {
      console.log('📏 Seeding ESG metrics...')
    }

    const metrics = ESGMetricFactory.buildFromSeedData()
    
    try {
      // Insert metrics in batches
      const batchSize = 10
      for (let i = 0; i < metrics.length; i += batchSize) {
        const batch = metrics.slice(i, i + batchSize)
        
        const { error } = await supabase
          .from('esg_metrics')
          .insert(batch.map(metric => ({
            id: metric.id,
            category: metric.category,
            subcategory: metric.subcategory,
            name: metric.name,
            description: metric.description,
            unit: metric.unit,
            target: metric.target,
            weight: metric.weight,
            framework: metric.framework,
            data_source: metric.dataSource,
            calculation_method: metric.calculationMethod,
            reporting_frequency: metric.reportingFrequency,
            is_required: metric.isRequired,
            tags: metric.tags,
            is_custom: false
          })))

        if (error) {
          console.warn(`⚠️ Warning: Could not insert metrics batch ${i/batchSize + 1}:`, error.message)
        }
      }

      if (this.options.verbose) {
        console.log(`   ✓ Inserted ${metrics.length} ESG metrics`)
      }
    } catch (error) {
      console.warn('⚠️ Warning: Could not seed metrics (table may not exist):', error)
    }
  }

  private async seedConfiguration(configuration: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('esg_configurations')
        .insert({
          organization_id: configuration.organizationId,
          framework: configuration.framework,
          reporting_period: configuration.reportingPeriod,
          industry_benchmarks: configuration.industryBenchmarks,
          peer_comparison: configuration.peerComparison,
          enabled_categories: configuration.enabledCategories,
          custom_metrics: configuration.customMetrics,
          weightings: configuration.weightings,
          data_quality_thresholds: configuration.dataQualityThresholds,
          notification_settings: configuration.notificationSettings
        })

      if (error) {
        console.warn('⚠️ Warning: Could not seed configuration (table may not exist):', error.message)
      } else if (this.options.verbose) {
        console.log('   ✓ Seeded ESG configuration')
      }
    } catch (error) {
      console.warn('⚠️ Warning: Could not seed configuration:', error)
    }
  }

  private async seedDataPoints(dataPoints: any[]): Promise<void> {
    if (dataPoints.length === 0) return

    try {
      // Insert data points in batches
      const batchSize = 50
      let insertedCount = 0

      for (let i = 0; i < dataPoints.length; i += batchSize) {
        const batch = dataPoints.slice(i, i + batchSize)
        
        const { error } = await supabase
          .from('esg_data_points')
          .insert(batch.map(dp => ({
            id: dp.id,
            metric_id: dp.metricId,
            organization_id: dp.organizationId,
            value: dp.value,
            period: dp.period,
            unit: dp.unit,
            data_source: dp.dataSource,
            verification_status: dp.verificationStatus,
            notes: dp.notes,
            created_by: dp.createdBy,
            created_at: dp.createdAt,
            updated_at: dp.updatedAt
          })))

        if (error) {
          console.warn(`⚠️ Warning: Could not insert data points batch ${i/batchSize + 1}:`, error.message)
        } else {
          insertedCount += batch.length
        }
      }

      if (this.options.verbose && insertedCount > 0) {
        console.log(`   ✓ Inserted ${insertedCount} data points`)
      }
    } catch (error) {
      console.warn('⚠️ Warning: Could not seed data points (table may not exist):', error)
    }
  }

  private async seedScorecard(scorecard: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('esg_scorecards')
        .insert({
          id: scorecard.id,
          organization_id: scorecard.organizationId,
          period: scorecard.period,
          framework: scorecard.framework,
          overall_score: scorecard.overallScore,
          overall_rating: scorecard.overallRating,
          environmental_score: scorecard.environmentalScore,
          social_score: scorecard.socialScore,
          governance_score: scorecard.governanceScore,
          status: scorecard.status,
          created_at: scorecard.createdAt,
          updated_at: scorecard.updatedAt
        })

      if (error) {
        console.warn('⚠️ Warning: Could not seed scorecard (table may not exist):', error.message)
      } else if (this.options.verbose) {
        console.log(`   ✓ Seeded ESG scorecard (${scorecard.overallRating} - ${scorecard.overallScore})`)
      }
    } catch (error) {
      console.warn('⚠️ Warning: Could not seed scorecard:', error)
    }
  }
}

// CLI setup
const program = new Command()

program
  .name('seed-esg-data')
  .description('Seed database with sample ESG data')
  .option('--org-id <id>', 'Organization ID to seed data for')
  .option('--user-id <id>', 'User ID to use for data creation')
  .option('--industry <type>', 'Industry type', 'technology')
  .option('--periods <number>', 'Number of historical periods to generate', '24')
  .option('--demo', 'Generate demo data for multiple organizations')
  .option('--clean', 'Clean existing ESG data before seeding')
  .option('--verbose', 'Verbose logging')

program.parse()

const options = program.opts()

// Validate options
if (options.industry && !['technology', 'manufacturing', 'finance', 'healthcare', 'energy'].includes(options.industry)) {
  console.error('❌ Invalid industry type. Must be one of: technology, manufacturing, finance, healthcare, energy')
  process.exit(1)
}

if (options.periods && (isNaN(options.periods) || options.periods < 1 || options.periods > 60)) {
  console.error('❌ Invalid periods value. Must be a number between 1 and 60')
  process.exit(1)
}

// Run the seeder
const seeder = new ESGDataSeeder({
  orgId: options.orgId,
  userId: options.userId,
  industry: options.industry,
  periods: parseInt(options.periods),
  demo: options.demo,
  clean: options.clean,
  verbose: options.verbose
})

seeder.run().catch((error) => {
  console.error('❌ Seeding failed:', error)
  process.exit(1)
})