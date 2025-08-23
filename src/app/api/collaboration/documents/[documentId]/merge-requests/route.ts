import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/collaboration/documents/[documentId]/merge-requests
 * Create merge request between branches
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  return NextResponse.json({
    success: true,
    message: 'Merge request created between branches',
    data: {
      documentId: params.documentId,
      mergeRequestId: 'mr-' + Math.random().toString(36).substr(2, 9),
      status: 'created',
      createdAt: new Date().toISOString()
    }
  })
}