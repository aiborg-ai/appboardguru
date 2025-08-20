const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

async function runSeedScript() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    console.log('Reading seed SQL file...')
    const sqlContent = fs.readFileSync('database-seed-vaults-test-data.sql', 'utf8')
    
    // Split SQL content into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`Found ${statements.length} SQL statements to execute...`)

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.length > 0) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`)
        
        // Use the SQL method if available
        const { error } = await supabase.sql(statement)
        
        if (error) {
          console.error(`Error in statement ${i + 1}:`, error)
          console.error('Statement:', statement.substring(0, 200) + '...')
          // Continue with other statements instead of failing completely
        }
      }
    }

    console.log('✅ Seed script execution completed!')
    process.exit(0)

  } catch (error) {
    console.error('Error reading or executing seed script:', error)
    process.exit(1)
  }
}

runSeedScript()