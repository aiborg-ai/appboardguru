/**
 * Collaboration Sessions API Endpoint
 * Delegates to CollaborationController for consistent architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { CollaborationController } from '@/lib/api/controllers/collaboration.controller';

const collaborationController = new CollaborationController();

export async function GET(request: NextRequest): Promise<NextResponse> {
  return collaborationController.getSessions(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return collaborationController.createSession(request);
}

export async function OPTIONS(): Promise<NextResponse> {
  return collaborationController.handleOptions();
}