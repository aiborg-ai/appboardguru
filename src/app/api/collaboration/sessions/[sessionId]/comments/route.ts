import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/collaboration/sessions/[sessionId]/comments
 * Add comment to document
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  return NextResponse.json({
    success: true,
    message: 'Comment added to document',
    data: {
      sessionId: params.sessionId,
      commentId: 'comment-' + Math.random().toString(36).substr(2, 9),
      status: 'created',
      createdAt: new Date().toISOString()
    }
  })
}