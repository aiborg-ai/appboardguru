/**
 * Integration Hub API Endpoint
 * Delegates to IntegrationController for consistent architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { IntegrationController } from '@/lib/api/controllers/integration.controller';

const integrationController = new IntegrationController();

export async function GET(request: NextRequest): Promise<NextResponse> {
  return integrationController.getHubStatus(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return integrationController.manageHub(request);
}

export async function OPTIONS(): Promise<NextResponse> {
  return integrationController.handleOptions();
}