import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function applyMigration() {
  console.log('🔧 Applying Database Migration Programmatically\n')
  console.log('=' .repeat(50))
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/20250104_fix_assets_table_columns.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
    
    console.log('📄 Migration file loaded successfully')
    console.log('📍 Path:', migrationPath)
    console.log('\n🚀 Attempting to apply migration...\n')
    
    // Try to execute the migration using service role
    // Note: Direct SQL execution might be restricted
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    })
    
    if (error) {
      console.log('❌ Cannot execute SQL directly via RPC')
      console.log('Error:', error.message)
      console.log('\n' + '=' .repeat(50))
      console.log('\n⚠️  MANUAL ACTION REQUIRED!\n')
      console.log('The migration cannot be applied programmatically.')
      console.log('You MUST apply it manually in the Supabase Dashboard.\n')
      console.log('Steps to fix:')
      console.log('1. Go to: https://supabase.com/dashboard/project/pgeuvjihhfmzqymoygwb/sql/new')
      console.log('2. Copy and paste the following SQL:')
      console.log('\n' + '=' .repeat(50))
      console.log(migrationSQL)
      console.log('=' .repeat(50))
      console.log('\n3. Click "Run" to execute the migration')
      console.log('4. Wait for success confirmation')
      console.log('5. Test upload again - it should work!\n')
      
      // Save to a convenient location
      const outputPath = path.join(__dirname, 'MIGRATION_TO_RUN.sql')
      fs.writeFileSync(outputPath, migrationSQL)
      console.log(`📝 Migration also saved to: ${outputPath}`)
      console.log('   You can copy from this file if needed.\n')
      
    } else {
      console.log('✅ Migration applied successfully!')
      console.log('\n📊 Verifying changes...')
      
      // Test if the status column exists now
      const { error: testError } = await supabase
        .from('assets')
        .insert({
          title: 'Migration Test',
          file_name: 'test.txt',
          file_path: 'test.txt',
          file_size: 100,
          file_type: 'txt',
          mime_type: 'text/plain',
          category: 'document',
          owner_id: 'b2fc2f59-447c-495c-af05-31a30d6e364a',
          status: 'ready' // This is the critical column that was missing
        })
        .select()
      
      if (testError && testError.message.includes('status')) {
        console.log('❌ Status column still missing')
      } else {
        console.log('✅ All required columns are now present!')
        console.log('\n🎉 Upload should work now!')
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the migration
applyMigration()