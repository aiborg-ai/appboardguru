import { NextRequest } from 'next/server'
import { 
  applyDocumentOperation, 
  getOperationHistory 
} from '../../../../controllers/document-collaboration.controller'

/**
 * POST /api/collaboration/sessions/[sessionId]/operations
 * Apply document operation (insert, delete, format, etc.)
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
  
  return applyDocumentOperation(modifiedRequest)
}

/**
 * GET /api/collaboration/sessions/[sessionId]/operations
 * Get operation history with pagination
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
  
  return getOperationHistory(modifiedRequest)
}