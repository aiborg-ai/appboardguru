/**
 * Extract and use the token from a failed redirect URL
 */

console.log('📋 Token Extraction Helper')
console.log('========================')
console.log('')

const failedUrl = process.argv[2]

if (!failedUrl) {
  console.log('Usage: npm run tsx src/scripts/extract-token-from-url.ts "<failed-url>"')
  console.log('')
  console.log('Example:')
  console.log('npm run tsx src/scripts/extract-token-from-url.ts "http://localhost:3000/#access_token=..."')
  process.exit(1)
}

try {
  // Parse the URL
  const url = new URL(failedUrl)
  const hashParams = new URLSearchParams(url.hash.substring(1))
  
  const accessToken = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')
  const expiresAt = hashParams.get('expires_at')
  const expiresIn = hashParams.get('expires_in')
  const tokenType = hashParams.get('token_type')
  
  console.log('✅ Tokens extracted successfully!')
  console.log('')
  console.log('📊 Token Details:')
  console.log('=================')
  console.log(`Type: ${tokenType}`)
  console.log(`Expires In: ${expiresIn} seconds`)
  console.log(`Expires At: ${new Date(Number(expiresAt) * 1000).toLocaleString()}`)
  console.log('')
  
  // Generate the manual authentication URL
  const productionUrl = 'https://appboardguru.vercel.app'
  const manualAuthUrl = `${productionUrl}/auth/magic-link-handler#access_token=${accessToken}&refresh_token=${refreshToken}&expires_at=${expiresAt}&expires_in=${expiresIn}&token_type=${tokenType}`
  
  console.log('🔗 SOLUTION - Visit this URL to complete authentication:')
  console.log('=========================================================')
  console.log(manualAuthUrl)
  console.log('')
  console.log('📝 Instructions:')
  console.log('1. Copy the URL above')
  console.log('2. Open it in your browser')
  console.log('3. The page will process your authentication')
  console.log('4. You will be redirected to the password setup page')
  
} catch (error) {
  console.error('❌ Failed to parse URL:', error)
  console.log('')
  console.log('Please make sure you copied the entire URL including the # part')
}