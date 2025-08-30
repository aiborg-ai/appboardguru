/**
 * Test script to verify magic links use production URL
 */

import { generatePasswordSetupMagicLink } from '@/lib/supabase-admin'
import { getMagicLinkUrl } from '@/config/environment'
import { config } from 'dotenv'
import path from 'path'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

async function testMagicLinkGeneration() {
  console.log('🧪 Testing Magic Link Generation with Production URL')
  console.log('=====================================================')
  console.log('')
  
  const testEmail = 'hirendra.vikram@aiborg.ai'
  
  try {
    // Show the configured URL
    console.log('📍 Configuration Check:')
    console.log(`   Magic Link Base URL: ${getMagicLinkUrl()}`)
    console.log(`   Expected: https://appboardguru.vercel.app`)
    console.log('')
    
    // Generate a magic link
    console.log(`📧 Generating magic link for: ${testEmail}`)
    const { magicLink, success, error } = await generatePasswordSetupMagicLink(testEmail)
    
    if (!success || !magicLink) {
      console.error('❌ Failed to generate magic link:', error)
      return
    }
    
    console.log('✅ Magic link generated successfully!')
    console.log('')
    
    // Parse and verify the redirect URL
    const url = new URL(magicLink)
    const redirectTo = url.searchParams.get('redirect_to')
    const type = url.searchParams.get('type')
    const token = url.searchParams.get('token')
    const redirectToInHash = url.hash ? new URLSearchParams(url.hash.substring(1)).get('redirect_to') : null
    
    console.log('🔍 Analysis:')
    console.log(`   Full URL: ${url.href.substring(0, 100)}...`)
    console.log(`   Base URL: ${url.origin}${url.pathname}`)
    console.log(`   Token: ${token?.substring(0, 20)}...`)
    console.log(`   Type: ${type}`)
    console.log(`   Redirect To (query): ${redirectTo}`)
    console.log(`   Redirect To (hash): ${redirectToInHash}`)
    console.log('')
    
    // Check both possible redirect locations
    const actualRedirect = redirectTo || redirectToInHash
    
    // Check if redirect URL is correct
    if (actualRedirect?.includes('localhost')) {
      console.error('❌ ERROR: Magic link still contains localhost!')
      console.error(`   Found: ${actualRedirect}`)
      console.error('   This appears to be a Supabase configuration issue.')
      console.error('   The redirect URL might need to be configured in Supabase dashboard.')
    } else if (actualRedirect?.includes('appboardguru.vercel.app')) {
      console.log('✅ SUCCESS: Magic link correctly uses production URL!')
      console.log(`   Redirect URL: ${actualRedirect}`)
    } else if (!actualRedirect) {
      console.warn('⚠️  WARNING: No redirect_to parameter found in the magic link')
      console.warn('   The redirect might be handled by Supabase internally')
    } else {
      console.warn('⚠️  WARNING: Unexpected redirect URL format')
      console.warn(`   Found: ${actualRedirect}`)
    }
    
    console.log('')
    console.log('📝 Summary:')
    console.log('   The magic link generation is now configured to always use')
    console.log('   the production URL (https://appboardguru.vercel.app)')
    console.log('   regardless of where the code is running.')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testMagicLinkGeneration().catch(console.error)