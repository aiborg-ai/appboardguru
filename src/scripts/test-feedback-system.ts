#!/usr/bin/env node

/**
 * Comprehensive test script for the feedback system
 * Tests all components and provides diagnostics
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import fetch from 'node-fetch'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
const supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
const baseUrl = process.env['NEXT_PUBLIC_BASE_URL'] || 'http://localhost:3000'

// Test results tracking
const testResults: any[] = []
let passCount = 0
let failCount = 0

function logTest(name: string, passed: boolean, message?: string, details?: any) {
  const status = passed ? '✅' : '❌'
  console.log(`${status} ${name}`)
  if (message) console.log(`   ${message}`)
  if (details && !passed) console.log('   Details:', details)
  
  testResults.push({ name, passed, message, details })
  if (passed) passCount++
  else failCount++
}

async function testEnvironmentVariables() {
  console.log('\n🔍 Testing Environment Variables...')
  
  logTest(
    'NEXT_PUBLIC_SUPABASE_URL exists',
    !!supabaseUrl,
    supabaseUrl ? 'Found' : 'Missing - Check .env.local'
  )
  
  logTest(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY exists',
    !!supabaseAnonKey,
    supabaseAnonKey ? 'Found' : 'Missing - Check .env.local'
  )
  
  return !!supabaseUrl && !!supabaseAnonKey
}

async function testSupabaseConnection() {
  console.log('\n🔍 Testing Supabase Connection...')
  
  if (!supabaseUrl || !supabaseAnonKey) {
    logTest('Supabase connection', false, 'Missing credentials')
    return false
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      logTest('Supabase connection', false, 'Auth service error', error)
      return false
    }
    
    logTest('Supabase connection', true, 'Connected successfully')
    return true
  } catch (error) {
    logTest('Supabase connection', false, 'Connection failed', error)
    return false
  }
}

async function testDatabaseTable() {
  console.log('\n🔍 Testing Database Table...')
  
  if (!supabaseUrl || !supabaseAnonKey) {
    logTest('Database table check', false, 'Missing credentials')
    return false
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Check if table exists
    const { data, error } = await supabase
      .from('feedback_submissions')
      .select('id')
      .limit(1)
    
    if (error) {
      if (error.code === '42P01') {
        logTest('feedback_submissions table exists', false, 'Table does not exist - Run migration')
        console.log('\n📋 To fix: Run the migration SQL in Supabase Dashboard')
        return false
      } else if (error.code === '42501') {
        logTest('feedback_submissions table exists', true, 'Table exists but has permission issues')
        logTest('Table permissions', false, 'RLS policies may be too restrictive')
        return 'partial'
      } else {
        logTest('feedback_submissions table check', false, error.message, error)
        return false
      }
    }
    
    logTest('feedback_submissions table exists', true, 'Table found and accessible')
    
    // Check if we can count rows
    const { count } = await supabase
      .from('feedback_submissions')
      .select('*', { count: 'exact', head: true })
    
    logTest('Table row count', true, `Found ${count || 0} feedback submissions`)
    
    return true
  } catch (error) {
    logTest('Database table check', false, 'Unexpected error', error)
    return false
  }
}

async function testHealthEndpoint() {
  console.log('\n🔍 Testing Health Check Endpoint...')
  
  try {
    const response = await fetch(`${baseUrl}/api/feedback/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      logTest('Health endpoint accessible', false, `Status: ${response.status}`)
      return false
    }
    
    const health = await response.json()
    
    logTest('Health endpoint accessible', true, `Status: ${health.status}`)
    
    // Check individual components
    Object.entries(health.components).forEach(([component, status]: [string, any]) => {
      const isHealthy = status.status === 'healthy'
      logTest(
        `Health: ${component}`,
        isHealthy,
        status.message
      )
    })
    
    return health.status === 'healthy'
  } catch (error) {
    logTest('Health endpoint test', false, 'Failed to reach endpoint', error)
    return false
  }
}

async function testFeedbackSubmission() {
  console.log('\n🔍 Testing Feedback Submission...')
  
  const testFeedback = {
    type: 'bug',
    title: 'Test Feedback Submission',
    description: 'This is an automated test of the feedback system',
    screenshot: null
  }
  
  try {
    // Note: This will fail without authentication in production
    const response = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testFeedback)
    })
    
    const data = await response.json()
    
    if (response.status === 401) {
      logTest(
        'Feedback API reachable',
        true,
        'API responded (auth required as expected)'
      )
      logTest(
        'Feedback submission',
        false,
        'Authentication required (expected in production)'
      )
      return 'partial'
    }
    
    if (!response.ok) {
      logTest('Feedback submission', false, data.error || 'Submission failed', data)
      return false
    }
    
    logTest('Feedback submission', true, `Success! Reference: ${data.referenceId}`)
    
    if (data.warning) {
      console.log(`   ⚠️ Warning: ${data.warning}`)
    }
    
    return true
  } catch (error) {
    logTest('Feedback API test', false, 'Failed to reach API', error)
    return false
  }
}

async function runAllTests() {
  console.log('🚀 Feedback System Diagnostic Test')
  console.log('=====================================')
  
  // Run tests in sequence
  const envOk = await testEnvironmentVariables()
  if (!envOk) {
    console.log('\n⛔ Cannot continue without environment variables')
    return
  }
  
  const connectionOk = await testSupabaseConnection()
  const tableStatus = await testDatabaseTable()
  const healthOk = await testHealthEndpoint()
  const submissionStatus = await testFeedbackSubmission()
  
  // Summary
  console.log('\n📊 Test Summary')
  console.log('=====================================')
  console.log(`Total Tests: ${passCount + failCount}`)
  console.log(`✅ Passed: ${passCount}`)
  console.log(`❌ Failed: ${failCount}`)
  
  // Recommendations
  if (failCount > 0) {
    console.log('\n💡 Recommendations:')
    
    if (tableStatus === false) {
      console.log('1. Run the migration SQL in Supabase Dashboard:')
      console.log('   - Go to SQL Editor')
      console.log('   - Run the migration from database/migrations/013-feedback-system.sql')
    }
    
    if (tableStatus === 'partial') {
      console.log('1. Fix RLS policies in Supabase:')
      console.log('   - Go to Authentication > Policies')
      console.log('   - Check policies for feedback_submissions table')
      console.log('   - Consider temporarily disabling RLS for testing')
    }
    
    if (!healthOk) {
      console.log('2. Ensure the Next.js server is running:')
      console.log('   npm run dev')
    }
    
    const failedCritical = testResults.filter(t => 
      !t.passed && (t.name.includes('table') || t.name.includes('connection'))
    )
    
    if (failedCritical.length > 0) {
      console.log('\n⚠️ Critical issues found:')
      failedCritical.forEach(test => {
        console.log(`   - ${test.name}: ${test.message}`)
      })
    }
  } else {
    console.log('\n✅ All tests passed! Feedback system is fully operational.')
  }
  
  process.exit(failCount > 0 ? 1 : 0)
}

// Run tests
runAllTests().catch(console.error)