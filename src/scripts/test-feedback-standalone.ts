/**
 * Standalone test for feedback API components
 */

import { config } from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

async function testFeedbackStandalone() {
  console.log('🔍 Testing Feedback API Components (Standalone)')
  console.log('===============================================')
  
  try {
    // Test environment variables
    console.log('\n1️⃣ Testing environment variables...')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables')
    }
    console.log('  ✅ Environment variables loaded')
    
    // Create a standalone Supabase client
    console.log('\n2️⃣ Creating standalone Supabase client...')
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    console.log('  ✅ Supabase client created')
    
    // Test NotificationService
    console.log('\n3️⃣ Testing NotificationService...')
    const { NotificationService } = await import('../lib/services/notification.service')
    const notificationService = new NotificationService(supabase)
    console.log('  ✅ NotificationService initialized')
    
    // Test feedback templates
    console.log('\n4️⃣ Testing feedback templates...')
    const templates = await import('../lib/services/feedback-templates')
    
    const adminTemplate = templates.createAdminFeedbackTemplate({
      type: 'bug',
      title: 'Test Bug Report',
      description: 'This is a test bug report from the standalone test script',
      userEmail: 'test@example.com',
      userName: 'Test User',
      screenshot: '',
      timestamp: new Date().toISOString(),
      userAgent: 'TestAgent/1.0',
      url: 'http://localhost:3000/test'
    })
    console.log('  ✅ Admin template created')
    console.log('     Subject:', adminTemplate.subject)
    
    const userTemplate = templates.createUserConfirmationTemplate({
      title: 'Test Bug Report',
      type: 'bug',
      userEmail: 'test@example.com',
      userName: 'Test User',
      timestamp: new Date().toISOString(),
      referenceId: 'TEST-123456'
    })
    console.log('  ✅ User confirmation template created')
    console.log('     Subject:', userTemplate.subject)
    
    // Test database connection
    console.log('\n5️⃣ Testing database connection...')
    const { data, error } = await supabase
      .from('feedback_submissions')
      .select('count')
      .limit(1)
    
    if (error) {
      console.log('  ⚠️  Database query failed:', error.message)
      console.log('     (This is expected if the table doesn\'t exist yet)')
    } else {
      console.log('  ✅ Database connection successful')
    }
    
    // Test authentication (will fail without a session, which is expected)
    console.log('\n6️⃣ Testing authentication...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('  ⚠️  No authenticated user (expected in standalone context)')
    } else {
      console.log('  ✅ User found:', user.email)
    }
    
    console.log('\n✅ All standalone tests completed successfully!')
    console.log('\n📝 Summary:')
    console.log('  - Environment variables: ✅')
    console.log('  - Supabase client: ✅')
    console.log('  - NotificationService: ✅')
    console.log('  - Feedback templates: ✅')
    console.log('  - Database connection: Tested')
    console.log('  - Authentication: Tested')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
testFeedbackStandalone().catch(console.error)