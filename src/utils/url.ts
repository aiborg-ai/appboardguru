/**
 * Environment-aware URL generation utility
 * Handles both development (localhost) and production URLs correctly
 */

import { getAppUrl as getConfigAppUrl, isProduction, isDevelopment } from '@/config/environment'

export function getAppUrl(): string {
  return getConfigAppUrl()
}

export function getApiUrl(endpoint: string): string {
  const baseUrl = getAppUrl()
  return `${baseUrl}/api/${endpoint.replace(/^\//, '')}`
}

/**
 * Generate secure approval URLs for email
 * Updated to use bypass route that doesn't fail if user creation fails
 */
export function generateApprovalUrls(registrationId: string, securityToken: string) {
  const baseUrl = getAppUrl()
  
  return {
    // Use bypass route that approves even if user creation fails
    approveUrl: `${baseUrl}/api/approve-bypass?id=${registrationId}&token=${securityToken}`,
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
    console.log(`   Environment: ${process.env['NODE_ENV'] || 'development'}`)
    console.log(`   VERCEL_URL: ${process.env['VERCEL_URL'] || 'not set'}`)
    console.log(`   APP_URL: ${process.env['APP_URL'] || 'not set'}`)
  }
}