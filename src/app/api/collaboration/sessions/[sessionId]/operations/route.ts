/**
 * Collaboration Operations API Endpoint
 * Delegates to CollaborationController for consistent architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { CollaborationController } from '@/lib/api/controllers/collaboration.controller';

const collaborationController = new CollaborationController();

export async function GET(
  request: NextRequest,
  context: { params: { sessionId: string } }
): Promise<NextResponse> {
  return collaborationController.getOperations(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: { sessionId: string } }
): Promise<NextResponse> {
  return collaborationController.applyOperation(request, context);
}

export async function OPTIONS(): Promise<NextResponse> {
  return collaborationController.handleOptions();
}