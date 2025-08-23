import { NextRequest } from 'next/server'
import { 
  createCollaborationSession, 
  listCollaborationSessions 
} from '../../controllers/document-collaboration.controller'

/**
 * POST /api/collaboration/sessions
 * Create new collaboration session
 */
export async function POST(request: NextRequest) {
  return createCollaborationSession(request)
}

/**
 * GET /api/collaboration/sessions
 * List collaboration sessions with filtering
 */
export async function GET(request: NextRequest) {
  return listCollaborationSessions(request)
}