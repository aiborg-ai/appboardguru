/**
 * Presence API Controller - TEMPORARILY DISABLED FOR BUILD COMPATIBILITY
 * RESTful API for user presence and document collaboration
 * Following CLAUDE.md API patterns with Result handling
 */

import { NextRequest, NextResponse } from 'next/server'

// Temporary placeholder implementations to prevent build errors
export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    success: false, 
    error: 'Presence API temporarily disabled for build compatibility',
    code: 'SERVICE_UNAVAILABLE'
  }, { status: 503 })
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    success: false, 
    error: 'Presence API temporarily disabled for build compatibility',
    code: 'SERVICE_UNAVAILABLE'
  }, { status: 503 })
}

export async function PUT(request: NextRequest) {
  return NextResponse.json({ 
    success: false, 
    error: 'Presence API temporarily disabled for build compatibility',
    code: 'SERVICE_UNAVAILABLE'
  }, { status: 503 })
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({ 
    success: false, 
    error: 'Presence API temporarily disabled for build compatibility',
    code: 'SERVICE_UNAVAILABLE'
  }, { status: 503 })
}