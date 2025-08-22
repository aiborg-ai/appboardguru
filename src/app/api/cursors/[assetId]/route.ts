/**
 * Cursor Tracking API Controller - TEMPORARILY DISABLED FOR BUILD COMPATIBILITY
 * GET /api/cursors/[assetId] - Get document cursors
 * POST /api/cursors/[assetId] - Update cursor position
 * DELETE /api/cursors/[assetId] - Remove cursor
 */

import { NextRequest, NextResponse } from 'next/server'

// Temporary placeholder implementations to prevent build errors
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    success: false, 
    error: 'Cursor tracking API temporarily disabled for build compatibility',
    code: 'SERVICE_UNAVAILABLE'
  }, { status: 503 })
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    success: false, 
    error: 'Cursor tracking API temporarily disabled for build compatibility',
    code: 'SERVICE_UNAVAILABLE'
  }, { status: 503 })
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({ 
    success: false, 
    error: 'Cursor tracking API temporarily disabled for build compatibility',
    code: 'SERVICE_UNAVAILABLE'
  }, { status: 503 })
}