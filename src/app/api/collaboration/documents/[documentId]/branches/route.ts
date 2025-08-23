import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/collaboration/documents/[documentId]/branches
 * Create new document branch
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  return NextResponse.json({
    success: true,
    message: 'Document branch created',
    data: {
      documentId: params.documentId,
      branchId: 'branch-' + Math.random().toString(36).substr(2, 9),
      name: 'new-branch',
      status: 'created',
      createdAt: new Date().toISOString()
    }
  })
}