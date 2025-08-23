import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/collaboration/sessions/[sessionId]/cursors
 * Update cursor position
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  return NextResponse.json({
    success: true,
    message: 'Cursor position updated',
    sessionId: params.sessionId
  })
}

/**
 * GET /api/collaboration/sessions/[sessionId]/cursors
 * Get cursor positions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  return NextResponse.json({
    success: true,
    data: [],
    sessionId: params.sessionId
  })
}