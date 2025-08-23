import { NextRequest } from 'next/server'
import { createMergeRequest } from '../../../../controllers/document-collaboration.controller'

/**
 * POST /api/collaboration/documents/[documentId]/merge-requests
 * Create merge request between branches
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  // Add documentId to the request URL for the controller to access
  const url = new URL(request.url)
  url.searchParams.set('documentId', params.documentId)
  
  // Create a new request with the modified URL
  const modifiedRequest = new NextRequest(url.toString(), request)
  
  return createMergeRequest(modifiedRequest)
}