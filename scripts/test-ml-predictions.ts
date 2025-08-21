#!/usr/bin/env tsx
/**
 * ML Predictions Test Runner
 * Demonstrates the predictive intelligence system with sample data
 */

import { patternRecognitionEngine } from '../src/lib/services/pattern-recognition'
import { predictiveNotificationService } from '../src/lib/services/predictive-notifications'
import { generateCompleteTestDataset } from '../src/lib/test-utils/sample-data-generators'
import { createSupabaseServerClient } from '../src/lib/supabase-server'

// Color output functions
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
}

function colorize(color: keyof typeof colors, text: string): string {
  return `${colors[color]}${text}${colors.reset}`
}

function printHeader(title: string): void {
  console.log('\n' + '='.repeat(60))
  console.log(colorize('bright', title))
  console.log('='.repeat(60))
}

function printSubHeader(title: string): void {
  console.log('\n' + colorize('cyan', `▶ ${title}`))
  console.log('-'.repeat(40))
}

function printSuccess(message: string): void {
  console.log(colorize('green', `✓ ${message}`))
}

function printWarning(message: string): void {
  console.log(colorize('yellow', `⚠ ${message}`))
}

function printError(message: string): void {
  console.log(colorize('red', `✗ ${message}`))
}

function printInfo(message: string): void {
  console.log(colorize('blue', `ℹ ${message}`))
}

// Mock Supabase client for testing
interface MockSupabaseResponse {
  data: any[] | any
  error?: any
}

class MockSupabaseClient {
  private data: Map<string, any[]> = new Map()

  constructor() {
    // Initialize with empty data
    this.data.set('user_activity_logs', [])
    this.data.set('user_notifications', [])
    this.data.set('board_meetings', [])
    this.data.set('notification_patterns', [])
    this.data.set('anomaly_detections', [])
    this.data.set('predicted_notifications', [])
  }

  from(table: string) {
    return {
      select: (columns: string = '*') => ({
        eq: (column: string, value: any) => ({
          gte: (column: string, value: any) => ({
            lte: (column: string, value: any) => ({
              order: (column: string, options?: any) => ({
                limit: (count: number): MockSupabaseResponse => ({
                  data: this.data.get(table)?.slice(0, count) || []
                }),
                data: this.data.get(table) || []
              }),
              data: this.data.get(table) || []
            }),
            order: (column: string, options?: any): MockSupabaseResponse => ({
              data: this.data.get(table) || []
            }),
            data: this.data.get(table) || []
          }),
          order: (column: string, options?: any): MockSupabaseResponse => ({
            data: this.data.get(table) || []
          }),
          single: (): MockSupabaseResponse => ({
            data: this.data.get(table)?.[0] || null
          }),
          data: this.data.get(table) || []
        }),
        data: this.data.get(table) || []
      }),
      insert: (values: any): MockSupabaseResponse => ({
        data: Array.isArray(values) ? values.map((v: any, i: number) => ({ ...v, id: `${table}-${i}` })) : [{ ...values, id: `${table}-1` }],
        error: null
      }),
      update: (values: any) => ({
        eq: (column: string, value: any): MockSupabaseResponse => ({
          data: [{ ...values, id: `${table}-updated` }],
          error: null
        })
      }),
      upsert: (values: any): MockSupabaseResponse => ({
        data: Array.isArray(values) ? values : [values],
        error: null
      })
    }
  }

  setTestData(table: string, data: any[]) {
    this.data.set(table, data)
  }
}

async function runMLPredictionTests() {
  printHeader('🤖 BoardGuru ML Predictions Test Suite')
  printInfo('Testing predictive intelligence system with sample data...')

  const organizationId = 'test-org-demo-123'
  let mockSupabase: MockSupabaseClient

  try {
    // Generate comprehensive test dataset
    printSubHeader('Generating Test Dataset')
    const testDataset = generateCompleteTestDataset(organizationId)
    
    printSuccess(`Generated ${testDataset.userActivities.length} user activities`)
    printSuccess(`Generated ${testDataset.notifications.length} notifications`)
    printSuccess(`Generated ${testDataset.meetings.length} meetings`)
    printSuccess(`Total test records: ${testDataset.totalRecords}`)

    // Initialize mock Supabase with test data
    mockSupabase = new MockSupabaseClient()
    mockSupabase.setTestData('user_activity_logs', testDataset.userActivities)
    mockSupabase.setTestData('user_notifications', testDataset.notifications)
    mockSupabase.setTestData('board_meetings', testDataset.meetings)

    // Test 1: Pattern Recognition
    await testPatternRecognition(mockSupabase, organizationId)

    // Test 2: Anomaly Detection
    await testAnomalyDetection(mockSupabase, organizationId)

    // Test 3: User Engagement Profiles
    await testUserEngagementProfiles(mockSupabase, organizationId)

    // Test 4: Optimal Timing Prediction
    await testOptimalTimingPrediction(mockSupabase, organizationId)

    // Test 5: Smart Notification Generation
    await testSmartNotificationGeneration(mockSupabase, organizationId)

    // Test 6: Predictive Insights
    await testPredictiveInsights(mockSupabase, organizationId)

    // Test 7: Performance Metrics
    await testPerformanceMetrics(mockSupabase, organizationId)

    printHeader('🎉 All Tests Completed Successfully!')
    printSuccess('The predictive intelligence system is working correctly')

  } catch (error) {
    printError(`Test suite failed: ${error instanceof Error ? error.message : String(error)}`)
    console.error(error)
    process.exit(1)
  }
}

async function testPatternRecognition(mockSupabase: MockSupabaseClient, organizationId: string) {
  printSubHeader('Testing Pattern Recognition Engine')

  try {
    // Override the Supabase client in the pattern recognition engine
    const originalCreateClient = require('../src/lib/supabase-server').createSupabaseServerClient
    // Mock the function properly
    const mockCreateClient = () => mockSupabase as any
    require('../src/lib/supabase-server').createSupabaseServerClient = mockCreateClient

    const patterns = await patternRecognitionEngine.analyzePatterns(organizationId, {
      lookbackDays: 30,
      patternTypes: ['timing', 'frequency', 'engagement', 'content'],
      minConfidence: 0.5
    })

    printSuccess(`Detected ${patterns.length} behavioral patterns`)

    patterns.slice(0, 3).forEach((pattern, index) => {
      console.log(colorize('white', `  Pattern ${index + 1}:`))
      console.log(`    Type: ${colorize('magenta', pattern.pattern_type)}`)
      console.log(`    Confidence: ${colorize('yellow', pattern.confidence.toFixed(2))}`)
      console.log(`    Description: ${pattern.description || 'N/A'}`)
    })

    // Test specific pattern types
    const timingPatterns = patterns.filter(p => p.pattern_type === 'timing')
    const engagementPatterns = patterns.filter(p => p.pattern_type === 'engagement')
    
    printInfo(`Found ${timingPatterns.length} timing patterns`)
    printInfo(`Found ${engagementPatterns.length} engagement patterns`)

    // Restore original client
    require('../src/lib/supabase-server').createSupabaseServerClient = originalCreateClient

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    printError(`Pattern recognition test failed: ${errorMessage}`)
    throw error
  }
}

async function testAnomalyDetection(mockSupabase: MockSupabaseClient, organizationId: string) {
  printSubHeader('Testing Anomaly Detection')

  try {
    const mockCreateClient = () => mockSupabase as any
    require('../src/lib/supabase-server').createSupabaseServerClient = mockCreateClient

    const anomalies = await patternRecognitionEngine.detectAnomalies(organizationId, {
      lookbackDays: 14,
      sensitivity: 'medium'
    })

    printSuccess(`Detected ${anomalies.length} anomalies`)

    anomalies.slice(0, 3).forEach((anomaly, index) => {
      console.log(colorize('white', `  Anomaly ${index + 1}:`))
      console.log(`    Type: ${colorize('red', anomaly.anomaly_type)}`)
      console.log(`    Severity: ${colorize('yellow', anomaly.severity)}`)
      console.log(`    Confidence: ${colorize('cyan', anomaly.confidence_score.toFixed(2))}`)
      console.log(`    User: ${anomaly.user_id || 'Multiple users'}`)
    })

    // Test different sensitivity levels
    const highSensitivity = await patternRecognitionEngine.detectAnomalies(organizationId, {
      lookbackDays: 7,
      sensitivity: 'high'
    })

    const lowSensitivity = await patternRecognitionEngine.detectAnomalies(organizationId, {
      lookbackDays: 7,
      sensitivity: 'low'
    })

    printInfo(`High sensitivity: ${highSensitivity.length} anomalies`)
    printInfo(`Low sensitivity: ${lowSensitivity.length} anomalies`)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    printError(`Anomaly detection test failed: ${errorMessage}`)
    throw error
  }
}

async function testUserEngagementProfiles(mockSupabase: MockSupabaseClient, organizationId: string) {
  printSubHeader('Testing User Engagement Profiles')

  try {
    const mockCreateClient = () => mockSupabase as any
    require('../src/lib/supabase-server').createSupabaseServerClient = mockCreateClient

    const userIds = ['user-001', 'user-002', 'user-003', 'user-004', 'user-005']
    const profiles = await patternRecognitionEngine.generateUserEngagementProfiles(
      organizationId,
      userIds
    )

    printSuccess(`Generated ${profiles.length} user profiles`)

    profiles.slice(0, 3).forEach((profile, index) => {
      console.log(colorize('white', `  Profile ${index + 1}:`))
      console.log(`    User: ${colorize('green', profile.userId)}`)
      console.log(`    Segment: ${colorize('blue', profile.behaviorSegment)}`)
      console.log(`    Engagement Score: ${colorize('yellow', profile.engagementScore.toFixed(1))}`)
      console.log(`    Peak Hours: ${profile.activityPatterns.peakHours.join(', ')}`)
      console.log(`    Risk Factors: ${profile.riskFactors.length}`)
    })

    // Analyze user segments
    const segments = profiles.reduce((acc, profile) => {
      acc[profile.behaviorSegment] = (acc[profile.behaviorSegment] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    printInfo('User Segmentation:')
    Object.entries(segments).forEach(([segment, count]) => {
      console.log(`  ${segment}: ${count} users`)
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    printError(`User engagement profiling test failed: ${errorMessage}`)
    throw error
  }
}

async function testOptimalTimingPrediction(mockSupabase: MockSupabaseClient, organizationId: string) {
  printSubHeader('Testing Optimal Timing Predictions')

  try {
    const mockCreateClient = () => mockSupabase as any
    require('../src/lib/supabase-server').createSupabaseServerClient = mockCreateClient

    const testCases = [
      { userId: 'user-001', type: 'meeting_reminder' },
      { userId: 'user-002', type: 'document_shared' },
      { userId: 'user-003', type: 'approval_request' },
      { userId: 'user-004', type: 'board_announcement' }
    ]

    printSuccess('Testing timing predictions for different scenarios...')

    for (const testCase of testCases) {
      const prediction = await patternRecognitionEngine.predictOptimalTiming(
        testCase.userId,
        testCase.type,
        organizationId
      )

      console.log(colorize('white', `  ${testCase.userId} - ${testCase.type}:`))
      console.log(`    Optimal Hour: ${colorize('green', prediction.optimalHour.toString())}:00`)
      console.log(`    Confidence: ${colorize('yellow', (prediction.confidence * 100).toFixed(1))}%`)
      console.log(`    Expected Engagement: ${colorize('cyan', (prediction.expectedEngagementRate * 100).toFixed(1))}%`)
      console.log(`    Reasoning: ${prediction.reasoning}`)
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    printError(`Optimal timing prediction test failed: ${errorMessage}`)
    throw error
  }
}

async function testSmartNotificationGeneration(mockSupabase: MockSupabaseClient, organizationId: string) {
  printSubHeader('Testing Smart Notification Generation')

  try {
    const mockCreateClient = () => mockSupabase as any
    require('../src/lib/supabase-server').createSupabaseServerClient = mockCreateClient

    const smartRequests = [
      {
        userId: 'user-001',
        organizationId,
        type: 'meeting_reminder',
        category: 'governance',
        title: 'Board Meeting Tomorrow',
        message: 'Don\'t forget about the board meeting scheduled for tomorrow at 2 PM',
        priority: 'high',
        scheduleOptions: { allowDelay: true, maxDelayHours: 6 }
      },
      {
        userId: 'user-002',
        organizationId,
        type: 'document_shared',
        category: 'content',
        title: 'New Quarterly Report',
        message: 'The Q4 financial report has been uploaded to the vault',
        priority: 'medium',
        scheduleOptions: { allowDelay: true, maxDelayHours: 24 }
      },
      {
        userId: 'user-003',
        organizationId,
        type: 'approval_request',
        category: 'governance',
        title: 'Policy Update Approval',
        message: 'Your approval is needed for the updated compliance policy',
        priority: 'high',
        scheduleOptions: { allowDelay: false }
      }
    ]

    printSuccess('Generating optimized notifications...')

    for (const request of smartRequests) {
      const result = await predictiveNotificationService.generateSmartNotification(request)

      console.log(colorize('white', `  ${request.title}:`))
      console.log(`    User: ${colorize('green', request.userId)}`)
      console.log(`    Scheduled: ${colorize('yellow', new Date(result.scheduledTime).toLocaleString())}`)
      console.log(`    Confidence: ${colorize('cyan', (result.confidence * 100).toFixed(1))}%`)
      console.log(`    User Segment: ${colorize('magenta', result.optimization.userSegment)}`)
      console.log(`    Expected Engagement: ${colorize('blue', (result.optimization.expectedEngagement * 100).toFixed(1))}%`)
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    printError(`Smart notification generation test failed: ${errorMessage}`)
    throw error
  }
}

async function testPredictiveInsights(mockSupabase: MockSupabaseClient, organizationId: string) {
  printSubHeader('Testing Predictive Insights Generation')

  try {
    const mockCreateClient = () => mockSupabase as any
    require('../src/lib/supabase-server').createSupabaseServerClient = mockCreateClient

    const insights = await predictiveNotificationService.generatePredictiveInsights(
      organizationId,
      30
    )

    printSuccess(`Generated ${insights.insights.length} predictive insights`)

    insights.insights.slice(0, 5).forEach((insight, index) => {
      console.log(colorize('white', `  Insight ${index + 1}:`))
      console.log(`    Type: ${colorize('blue', insight.type)}`)
      console.log(`    Title: ${colorize('green', insight.title)}`)
      console.log(`    Impact: ${colorize(insight.impact === 'high' ? 'red' : 'yellow', insight.impact)}`)
      console.log(`    Confidence: ${colorize('cyan', (insight.confidence * 100).toFixed(1))}%`)
      console.log(`    Description: ${insight.description}`)
      if (insight.actionItems.length > 0) {
        console.log(`    Actions: ${insight.actionItems.slice(0, 2).join(', ')}`)
      }
    })

    // Display pattern insights
    printInfo('Pattern Analysis Summary:')
    if (insights.patterns.timing) {
      console.log(`  Peak engagement hours: ${insights.patterns.timing.peakHours || 'N/A'}`)
    }
    if (insights.patterns.engagement) {
      console.log(`  Average engagement rate: ${((insights.patterns.engagement.averageRate || 0) * 100).toFixed(1)}%`)
    }

    // Display recommendations
    printInfo('AI Recommendations:')
    insights.recommendations.slice(0, 3).forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`)
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    printError(`Predictive insights test failed: ${errorMessage}`)
    throw error
  }
}

async function testPerformanceMetrics(mockSupabase: MockSupabaseClient, organizationId: string) {
  printSubHeader('Testing Performance Metrics')

  try {
    const mockCreateClient = () => mockSupabase as any
    require('../src/lib/supabase-server').createSupabaseServerClient = mockCreateClient

    // Mock some prediction accuracy data
    mockSupabase.setTestData('predicted_notifications', [
      {
        prediction_id: 'pred-1',
        confidence_score: 0.85,
        is_successful: true,
        predicted_engagement_rate: 0.75,
        actual_engagement_rate: 0.78
      },
      {
        prediction_id: 'pred-2',
        confidence_score: 0.72,
        is_successful: true,
        predicted_engagement_rate: 0.60,
        actual_engagement_rate: 0.58
      },
      {
        prediction_id: 'pred-3',
        confidence_score: 0.90,
        is_successful: false,
        predicted_engagement_rate: 0.80,
        actual_engagement_rate: 0.45
      }
    ])

    mockSupabase.setTestData('prediction_accuracy_logs', [
      { accuracy_score: 0.82, prediction_error: 0.05, model_version: '1.2' }
    ])

    const performance = await predictiveNotificationService.generatePerformanceReport(organizationId)

    printSuccess('Performance Metrics Generated')

    console.log(colorize('white', '  Summary:'))
    console.log(`    Total Predictions: ${colorize('green', performance.summary.totalPredictions.toString())}`)
    console.log(`    Successful: ${colorize('green', performance.summary.successfulPredictions.toString())}`)
    console.log(`    Average Confidence: ${colorize('yellow', (performance.summary.averageConfidence * 100).toFixed(1))}%`)
    console.log(`    Accuracy Score: ${colorize('cyan', (performance.summary.accuracyScore * 100).toFixed(1))}%`)

    console.log(colorize('white', '  Model Performance:'))
    console.log(`    Prediction Accuracy: ${colorize('blue', (performance.metrics.predictionAccuracy * 100).toFixed(1))}%`)
    console.log(`    Engagement Error: ${colorize('yellow', (performance.metrics.engagementPredictionError * 100).toFixed(1))}%`)
    console.log(`    Calibration Score: ${colorize('green', (performance.metrics.confidenceCalibration * 100).toFixed(1))}%`)

    if (performance.trends && performance.trends.accuracyTrend) {
      console.log(colorize('white', '  Trends:'))
      console.log(`    Accuracy Trend: ${colorize('magenta', performance.trends.accuracyTrend)}`)
    }

    printInfo('AI Model Recommendations:')
    performance.recommendations.slice(0, 3).forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`)
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    printError(`Performance metrics test failed: ${errorMessage}`)
    throw error
  }
}

// Main execution
if (require.main === module) {
  runMLPredictionTests()
    .then(() => {
      printInfo('Test suite completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      printError(`Test suite failed: ${errorMessage}`)
      console.error(error)
      process.exit(1)
    })
}

export { runMLPredictionTests }