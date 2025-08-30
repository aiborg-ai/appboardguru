/**
 * Generate a magic link with production URL for testing
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import { config } from 'dotenv'
import path from 'path'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

async function generateProductionMagicLink(email: string, redirectUrl?: string) {
  const normalizedEmail = email.toLowerCase().trim()
  const productionUrl = redirectUrl || 'https://appboardguru.vercel.app'
  
  console.log('🔗 Generating Production Magic Link')
  console.log('====================================')
  console.log(`📧 Email: ${normalizedEmail}`)
  console.log(`🌐 Redirect URL: ${productionUrl}/auth/set-password`)
  console.log('')
  
  try {
    // Generate magic link with specific redirect URL
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
      options: {
        redirectTo: `${productionUrl}/auth/set-password`
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
    
    const magicLink = data.properties.action_link
    
    console.log('✅ Magic link generated successfully!')
    console.log('')
    console.log('🔗 MAGIC LINK (click or copy to browser):')
    console.log(magicLink)
    console.log('')
    
    // Parse and display components
    const url = new URL(magicLink)
    console.log('📊 Link Details:')
    console.log(`   Type: ${url.searchParams.get('type')}`)
    console.log(`   Redirect: ${url.searchParams.get('redirect_to')}`)
    console.log(`   Token: ${url.searchParams.get('token')?.substring(0, 20)}...`)
    console.log('')
    console.log('📝 Instructions:')
    console.log('1. Copy the magic link above')
    console.log('2. Open it in your browser')
    console.log('3. You should be redirected to the password setup page')
    console.log('4. If on localhost, replace the domain in the final URL')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Parse command line arguments
const email = process.argv[2] || 'hirendra.vikram@aiborg.ai'
const redirectUrl = process.argv[3] // Optional custom redirect URL

generateProductionMagicLink(email, redirectUrl).catch(console.error)