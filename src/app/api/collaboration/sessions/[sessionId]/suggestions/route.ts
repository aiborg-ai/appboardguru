import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/collaboration/sessions/[sessionId]/suggestions
 * Create suggestion for text improvement
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  return NextResponse.json({
    success: true,
    message: 'Suggestion created for text improvement',
    data: {
      sessionId: params.sessionId,
      suggestionId: 'suggestion-' + Math.random().toString(36).substr(2, 9),
      status: 'created',
      createdAt: new Date().toISOString()
    }
  })
}