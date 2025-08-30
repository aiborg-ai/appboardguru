/**
 * Fix magic link by manually constructing with correct redirect URL
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import { config } from 'dotenv'
import path from 'path'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

async function fixMagicLinkRedirect(email: string) {
  const normalizedEmail = email.toLowerCase().trim()
  
  console.log('🔧 Magic Link Redirect Fix')
  console.log('===========================')
  console.log(`📧 Email: ${normalizedEmail}`)
  console.log('')
  
  try {
    // First, generate a standard magic link
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
      options: {
        redirectTo: 'https://appboardguru.vercel.app/auth/set-password'
      }
    })
    
    if (error) {
      console.error('❌ Failed to generate magic link:', error)
      return
    }
    
    if (!data?.properties?.action_link) {
      console.error('❌ No action_link returned')
      return
    }
    
    const originalLink = data.properties.action_link
    console.log('📍 Original magic link generated')
    
    // Parse the original link
    const url = new URL(originalLink)
    const token = url.searchParams.get('token')
    const type = url.searchParams.get('type')
    
    // Construct corrected links for different environments
    const baseUrl = 'https://pgeuvjihhfmzqymoygwb.supabase.co/auth/v1/verify'
    
    // Production link
    const productionLink = `${baseUrl}?token=${token}&type=${type}&redirect_to=${encodeURIComponent('https://appboardguru.vercel.app/auth/set-password')}`
    
    // Localhost link (for local testing)
    const localhostLink = `${baseUrl}?token=${token}&type=${type}&redirect_to=${encodeURIComponent('http://localhost:3000/auth/set-password')}`
    
    console.log('✅ Magic Links Generated!')
    console.log('')
    console.log('🌐 FOR PRODUCTION (Vercel):')
    console.log('============================')
    console.log(productionLink)
    console.log('')
    console.log('💻 FOR LOCAL DEVELOPMENT:')
    console.log('=========================')
    console.log(localhostLink)
    console.log('')
    console.log('📝 Instructions:')
    console.log('1. Copy the appropriate link based on where you\'re testing')
    console.log('2. Open it in your browser')
    console.log('3. You should be redirected to the password setup page')
    console.log('')
    console.log('⚠️  Note: The link expires in 1 hour and can only be used once')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the fix
const email = process.argv[2] || 'hirendra.vikram@aiborg.ai'
fixMagicLinkRedirect(email).catch(console.error)