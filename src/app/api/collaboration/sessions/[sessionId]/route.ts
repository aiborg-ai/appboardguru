import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/collaboration/sessions/[sessionId]
 * Get collaboration session details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  return NextResponse.json({
    success: true,
    message: 'Collaboration session details endpoint',
    data: {
      sessionId: params.sessionId,
      status: 'active',
      participants: [],
      document: null,
      permissions: {},
      createdAt: new Date().toISOString()
    }
  })
}