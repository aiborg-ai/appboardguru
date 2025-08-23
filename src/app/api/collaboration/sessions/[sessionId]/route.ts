import { NextRequest } from 'next/server'
import { getCollaborationSession } from '../../../controllers/document-collaboration.controller'

/**
 * GET /api/collaboration/sessions/[sessionId]
 * Get collaboration session details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  // Add sessionId to the request URL for the controller to access
  const url = new URL(request.url)
  url.searchParams.set('sessionId', params.sessionId)
  
  // Create a new request with the modified URL
  const modifiedRequest = new NextRequest(url.toString(), request)
  
  return getCollaborationSession(modifiedRequest)
}