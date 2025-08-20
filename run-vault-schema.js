const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

require('dotenv').config({ path: '.env.local' })

async function runVaultSchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    console.log('🗂️ Creating vault database schema...')
    
    // Read the vault schema file
    const schemaContent = fs.readFileSync('database-schema-vaults.sql', 'utf8')
    
    // Split into individual statements and execute them
    const statements = schemaContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`Found ${statements.length} SQL statements to execute...`)

    // Execute each statement individually
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.length > 0) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`)
        
        try {
          // Use raw HTTP request to execute SQL
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey
            },
            body: JSON.stringify({ sql: statement })
          })

          if (!response.ok) {
            const error = await response.text()
            console.log(`Statement ${i + 1} failed (continuing):`, error.substring(0, 200))
          }
        } catch (err) {
          console.log(`Statement ${i + 1} error (continuing):`, err.message)
        }
      }
    }

    console.log('✅ Vault schema execution completed!')

  } catch (error) {
    console.error('Error running vault schema:', error)
  }
}

runVaultSchema()