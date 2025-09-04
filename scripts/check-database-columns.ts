import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkDatabaseColumns() {
  console.log('🔍 Checking Assets Table Columns\n')
  console.log('=' .repeat(50))
  
  try {
    // Get column information from information_schema
    const { data, error } = await supabase
      .rpc('get_table_columns', { 
        table_name: 'assets' 
      })
      .single()
      
    if (error) {
      // Try a simpler approach - just select from assets with limit 0
      console.log('Using alternative method to check columns...\n')
      
      const { data: sample, error: sampleError } = await supabase
        .from('assets')
        .select('*')
        .limit(0)
      
      if (sampleError) {
        console.error('❌ Cannot query assets table:', sampleError.message)
        
        // Try to get any information about the table
        const { data: testInsert, error: testError } = await supabase
          .from('assets')
          .insert({
            title: 'Test',
            file_name: 'test.txt',
            file_path: 'test.txt',
            file_size: 100,
            file_type: 'txt',
            mime_type: 'text/plain',
            category: 'document',
            owner_id: 'b2fc2f59-447c-495c-af05-31a30d6e364a'
          })
          .select()
        
        if (testError) {
          console.log('\n❌ Test insert failed with error:')
          console.log('Message:', testError.message)
          console.log('Code:', testError.code)
          console.log('Details:', testError.details)
          console.log('Hint:', testError.hint)
          
          // Parse error message to find missing columns
          if (testError.message.includes('column')) {
            console.log('\n📋 Missing columns detected from error:')
            const missingColumns = testError.message.match(/'([^']+)' column/g)
            if (missingColumns) {
              missingColumns.forEach(col => {
                const colName = col.match(/'([^']+)'/)?.[1]
                console.log(`  ❌ ${colName}`)
              })
            }
          }
        }
      } else {
        console.log('✅ Assets table exists and is queryable')
        console.log('\nNote: Cannot determine exact columns with this method')
      }
    } else {
      console.log('📋 Current columns in assets table:')
      console.log(data)
    }
    
    // Check required columns
    const requiredColumns = [
      'id',
      'title', 
      'file_name',
      'file_path',
      'file_size',
      'file_type',
      'mime_type',
      'category',
      'owner_id',
      'status',              // Critical missing column
      'original_file_name',  // Missing column
      'folder_path',         // Missing column
      'storage_bucket',      // Missing column
      'is_processed',        // Missing column
      'processing_status',   // Missing column
      'visibility',          // Missing column
      'organization_id',     // Missing column
      'created_at',
      'updated_at'
    ]
    
    console.log('\n📝 Required columns check:')
    console.log('The following columns MUST exist for upload to work:\n')
    
    requiredColumns.forEach(col => {
      console.log(`  - ${col}`)
    })
    
    console.log('\n' + '=' .repeat(50))
    console.log('\n⚠️  IMPORTANT: The migration MUST be applied!')
    console.log('\nTo fix this issue:')
    console.log('1. Go to Supabase Dashboard > SQL Editor')
    console.log('2. Copy the contents of:')
    console.log('   database/migrations/20250104_fix_assets_table_columns.sql')
    console.log('3. Run the SQL in the SQL Editor')
    console.log('4. Verify all columns are added')
    console.log('\nThe error "Could not find the \'status\' column" means')
    console.log('the migration has NOT been applied yet!\n')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Create RPC function if it doesn't exist
async function createRpcFunction() {
  const createFunction = `
CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
RETURNS json AS $$
BEGIN
  RETURN (
    SELECT json_agg(json_build_object(
      'column_name', column_name,
      'data_type', data_type,
      'is_nullable', is_nullable,
      'column_default', column_default
    ))
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND information_schema.columns.table_name = get_table_columns.table_name
    ORDER BY ordinal_position
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`
  
  const { error } = await supabase.rpc('exec_sql', { sql: createFunction })
  if (!error) {
    console.log('Created helper function\n')
  }
}

// Run the check
checkDatabaseColumns()