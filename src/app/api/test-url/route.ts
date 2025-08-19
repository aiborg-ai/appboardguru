import { NextRequest, NextResponse } from 'next/server'
import { getAppUrl, logUrlConfig } from '@/utils/url'

export async function GET(request: NextRequest) {
  // Log URL configuration for debugging
  logUrlConfig()
  
  const currentUrl = getAppUrl()
  
  return NextResponse.json({
    currentUrl,
    environmentVars: {
      APP_URL: process.env.APP_URL || 'not set',
      VERCEL_URL: process.env.VERCEL_URL || 'not set',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'not set',
      NODE_ENV: process.env.NODE_ENV || 'not set'
    },
    detectedHost: request.headers.get('host'),
    fullUrl: request.url
  })
}