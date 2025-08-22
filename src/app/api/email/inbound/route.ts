/**
 * Email Inbound Processing API - TEMPORARILY DISABLED FOR BUILD COMPATIBILITY
 * Handles webhook from email service providers (SendGrid, Mailgun, etc.)
 * Creates assets from email attachments following DDD architecture
 */

import { NextRequest, NextResponse } from 'next/server'

// Temporary placeholder implementations to prevent build errors
export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    success: false, 
    error: 'Email processing API temporarily disabled for build compatibility',
    code: 'SERVICE_UNAVAILABLE'
  }, { status: 503 })
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    success: false, 
    error: 'Email processing API temporarily disabled for build compatibility',
    code: 'SERVICE_UNAVAILABLE'
  }, { status: 503 })
}