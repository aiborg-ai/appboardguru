import { NextRequest } from 'next/server'
import { createSuggestion } from '../../../../controllers/document-collaboration.controller'

/**
 * POST /api/collaboration/sessions/[sessionId]/suggestions
 * Create suggestion for text improvement
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
  
  return createSuggestion(modifiedRequest)
}