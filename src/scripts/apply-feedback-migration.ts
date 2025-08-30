/**
 * Script to apply feedback system migration to the database
 */

import { config } from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

async function applyFeedbackMigration() {
  console.log('🔧 Applying Feedback System Migration')
  console.log('=====================================')
  
  try {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables (need SERVICE_ROLE_KEY for admin access)')
    }
    
    // Create admin client with service key
    console.log('\n1️⃣ Creating Supabase admin client...')
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    console.log('  ✅ Admin client created')
    
    // Check if table already exists
    console.log('\n2️⃣ Checking if feedback_submissions table exists...')
    const { data: existingTable, error: checkError } = await supabase
      .from('feedback_submissions')
      .select('count')
      .limit(1)
    
    if (!checkError) {
      console.log('  ✅ Table already exists, skipping migration')
      
      // Get table statistics
      const { count } = await supabase
        .from('feedback_submissions')
        .select('*', { count: 'exact', head: true })
      
      console.log(`  📊 Current records: ${count || 0}`)
      return
    }
    
    console.log('  ⚠️  Table does not exist, proceeding with migration')
    
    // Read migration file
    console.log('\n3️⃣ Reading migration file...')
    const migrationPath = path.resolve(process.cwd(), 'database/migrations/013-feedback-system.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    console.log('  ✅ Migration file loaded')
    
    // Apply migration
    console.log('\n4️⃣ Applying migration...')
    console.log('  ⚠️  Note: This script cannot directly execute raw SQL.')
    console.log('  📝 Please run the following SQL in your Supabase dashboard:')
    console.log('\n' + '='.repeat(60))
    console.log('-- Copy and paste this SQL into Supabase SQL Editor --')
    console.log('='.repeat(60))
    console.log(migrationSQL)
    console.log('='.repeat(60))
    
    console.log('\n📌 To apply this migration:')
    console.log('  1. Go to your Supabase dashboard')
    console.log('  2. Navigate to SQL Editor')
    console.log('  3. Paste the SQL above')
    console.log('  4. Click "Run"')
    
    // Test if we can at least create the table via API (simplified version)
    console.log('\n5️⃣ Attempting to verify database access...')
    const { error: testError } = await supabase
      .from('feedback_submissions')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.log('  ℹ️  Table needs to be created via Supabase dashboard')
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

// Run the script
applyFeedbackMigration().catch(console.error)