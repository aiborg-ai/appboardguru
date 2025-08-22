const { createClient } = require('@supabase/supabase-js')

require('dotenv').config({ path: '.env.local' })

async function checkUsers() {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    console.log('Checking existing users...')
    
    const { data, error } = await supabase
      .from('users')
      .select('id, email, created_at')
      .limit(10)

    if (error) {
      console.error('Error fetching users:', error)
      return
    }

    console.log('Found users:', data)
    
    if (data && data.length > 0) {
      console.log('Using first user for test data:', data[0])
      return data[0].id
    } else {
      console.log('No users found')
      return null
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

checkUsers()