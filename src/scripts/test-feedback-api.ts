/**
 * Test script to diagnose feedback API issues
 */

import { config } from 'dotenv'
import path from 'path'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

async function testFeedbackAPI() {
  console.log('🔍 Testing Feedback API')
  console.log('=======================')
  
  try {
    // First, let's test if we can import the required modules
    console.log('\n1️⃣ Testing imports...')
    
    const { createSupabaseServerClient } = await import('../lib/supabase-server')
    console.log('  ✅ Supabase server client imported')
    
    const { NotificationService } = await import('../lib/services/notification.service')
    console.log('  ✅ NotificationService imported')
    
    const templates = await import('../lib/services/feedback-templates')
    console.log('  ✅ Feedback templates imported')
    
    // Test creating a supabase client
    console.log('\n2️⃣ Testing Supabase client creation...')
    const supabase = await createSupabaseServerClient()
    console.log('  ✅ Supabase client created')
    
    // Test getting a user
    console.log('\n3️⃣ Testing authentication...')
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.log('  ⚠️  No authenticated user (expected in script context):', error.message)
    } else if (user) {
      console.log('  ✅ User found:', user.email)
    } else {
      console.log('  ⚠️  No user found (expected in script context)')
    }
    
    // Test NotificationService initialization
    console.log('\n4️⃣ Testing NotificationService initialization...')
    try {
      const notificationService = new NotificationService(supabase)
      console.log('  ✅ NotificationService created successfully')
    } catch (err) {
      console.error('  ❌ Failed to create NotificationService:', err)
    }
    
    // Test template functions
    console.log('\n5️⃣ Testing template functions...')
    try {
      const adminTemplate = templates.createAdminFeedbackTemplate({
        type: 'bug',
        title: 'Test Bug',
        description: 'Test description',
        userEmail: 'test@example.com',
        userName: 'Test User',
        screenshot: '',
        timestamp: new Date().toISOString(),
        userAgent: 'TestAgent',
        url: 'http://test.com'
      })
      console.log('  ✅ Admin template created')
      
      const userTemplate = templates.createUserConfirmationTemplate({
        title: 'Test Bug',
        type: 'bug',
        userEmail: 'test@example.com',
        userName: 'Test User',
        timestamp: new Date().toISOString(),
        referenceId: 'TEST-123'
      })
      console.log('  ✅ User template created')
    } catch (err) {
      console.error('  ❌ Failed to create templates:', err)
    }
    
    console.log('\n✅ All tests completed!')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
  }
}

testFeedbackAPI().catch(console.error)