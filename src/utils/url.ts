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