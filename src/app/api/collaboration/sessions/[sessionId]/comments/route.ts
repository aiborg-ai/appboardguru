import { NextRequest } from 'next/server'
import { createComment } from '../../../../controllers/document-collaboration.controller'

/**
 * POST /api/collaboration/sessions/[sessionId]/comments
 * Add comment to document
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  // Add sessionId to the request URL for the controller to access
  const url = new URL(request.url)
  url.searchParams.set('sessionId', params.sessionId)
  
  // Create a new request with the modified URL
  const modifiedRequest = new NextRequest(url.toString(), request)
  
  return createComment(modifiedRequest)
}