/**
 * Environment-aware URL generation utility
 * Handles both development (localhost) and production URLs correctly
 */

export function getAppUrl(): string {
  // Priority order for URL determination:
  // 1. APP_URL environment variable (explicitly set)
  // 2. VERCEL_URL for Vercel deployments
  // 3. NEXTAUTH_URL fallback
  // 4. localhost fallback for development
  
  if (process.env.APP_URL) {
    return process.env.APP_URL
  }
  
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL
  }
  
  return 'http://localhost:3000'
}

export function getApiUrl(endpoint: string): string {
  const baseUrl = getAppUrl()
  return `${baseUrl}/api/${endpoint.replace(/^\//, '')}`
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV
}

/**
 * Generate secure approval URLs for email
 */
export function generateApprovalUrls(registrationId: string, securityToken: string) {
  const baseUrl = getAppUrl()
  
  return {
    approveUrl: `${baseUrl}/api/approve-registration?id=${registrationId}&token=${securityToken}`,
    rejectUrl: `${baseUrl}/api/reject-registration?id=${registrationId}&token=${securityToken}`,
    adminPanelUrl: `${baseUrl}/admin/registrations`,
  }
}

/**
 * Log URL configuration for debugging
 */
export function logUrlConfig() {
  if (isDevelopment()) {
    console.log('🔗 URL Configuration:')
    console.log(`   App URL: ${getAppUrl()}`)
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log(`   VERCEL_URL: ${process.env.VERCEL_URL || 'not set'}`)
    console.log(`   APP_URL: ${process.env.APP_URL || 'not set'}`)
  }
}