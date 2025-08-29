#!/usr/bin/env node

/**
 * Diagnostic Script: Verify Environment Variables
 * Agent: INFRA-05 (Infrastructure Orchestrator)
 * Purpose: Check all required environment variables for registration system
 * 
 * Usage: npx tsx src/scripts/verify-env.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
  console.log('📁 Loaded .env.local file')
} else {
  console.log('⚠️  No .env.local file found')
}

console.log('\n🔍 Environment Variable Verification\n')
console.log('=' .repeat(50))

// Required variables for registration system
const requiredVars = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    description: 'Supabase project URL',
    example: 'https://xxxxxxxxxxxx.supabase.co'
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    description: 'Supabase anonymous key (public)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Supabase service role key (secret)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    critical: true
  },
  {
    name: 'SMTP_HOST',
    description: 'Email server host',
    example: 'smtp.gmail.com'
  },
  {
    name: 'SMTP_PORT',
    description: 'Email server port',
    example: '587'
  },
  {
    name: 'SMTP_USER',
    description: 'Email username',
    example: 'your-email@gmail.com'
  },
  {
    name: 'SMTP_PASS',
    description: 'Email password or app password',
    example: 'your-app-password'
  },
  {
    name: 'ADMIN_EMAIL',
    description: 'Admin email for notifications',
    example: 'admin@example.com'
  }
]

let missingCritical = false
let missingOptional = []

requiredVars.forEach(varInfo => {
  const value = process.env[varInfo.name]
  const status = value ? '✅' : '❌'
  const displayValue = value 
    ? varInfo.name.includes('KEY') || varInfo.name.includes('PASS')
      ? `${value.substring(0, 10)}...${value.substring(value.length - 5)}`
      : value.substring(0, 50)
    : 'NOT SET'
  
  console.log(`${status} ${varInfo.name}`)
  console.log(`   Value: ${displayValue}`)
  console.log(`   Description: ${varInfo.description}`)
  
  if (!value) {
    console.log(`   Example: ${varInfo.example}`)
    if (varInfo.critical) {
      missingCritical = true
      console.log(`   ⚠️  CRITICAL: This variable is required for registration approval!`)
    } else {
      missingOptional.push(varInfo.name)
    }
  }
  console.log('')
})

console.log('=' .repeat(50))
console.log('\n📊 Summary:\n')

if (missingCritical) {
  console.log('❌ CRITICAL: Missing required environment variables!')
  console.log('   The registration approval system will NOT work without SUPABASE_SERVICE_ROLE_KEY')
  console.log('\n   To fix:')
  console.log('   1. Go to your Supabase project settings')
  console.log('   2. Navigate to Settings > API')
  console.log('   3. Copy the "service_role" key (keep it secret!)')
  console.log('   4. Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=your-key-here')
} else if (missingOptional.length > 0) {
  console.log('⚠️  Some optional variables are missing:')
  missingOptional.forEach(v => console.log(`   - ${v}`))
  console.log('\n   The system may work but some features might be limited.')
} else {
  console.log('✅ All environment variables are configured!')
  console.log('   The registration system should work correctly.')
}

// Test Supabase connection if variables are set
if (process.env['NEXT_PUBLIC_SUPABASE_URL'] && process.env['SUPABASE_SERVICE_ROLE_KEY']) {
  console.log('\n🔌 Testing Supabase Connection...')
  
  import('../lib/supabase-admin').then(async ({ supabaseAdmin }) => {
    try {
      const { count, error } = await supabaseAdmin
        .from('registration_requests')
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        console.log('   ❌ Connection failed:', error.message)
      } else {
        console.log('   ✅ Successfully connected to Supabase!')
        console.log(`   Found ${count} registration requests in database`)
      }
    } catch (error) {
      console.log('   ❌ Connection error:', error)
    }
  }).catch(error => {
    console.log('   ❌ Failed to load supabaseAdmin:', error.message)
  })
}