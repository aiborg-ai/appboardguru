/**
 * Legal System Integration API
 */

import { NextRequest, NextResponse } from 'next/server';
import { LegalIntegrationService } from '@/lib/services/legal-integration.service';
import { IntegrationHubService } from '@/lib/services/integration-hub.service';

let legalService: LegalIntegrationService;

function getLegalService(): LegalIntegrationService {
  if (!legalService) {
    const hub = new IntegrationHubService();
    legalService = new LegalIntegrationService(hub);
  }
  return legalService;
}

/**
 * GET /api/integration-hub/legal
 * Get all legal system connections
 */
export async function GET(request: NextRequest) {
  try {
    const legal = getLegalService();
    const connections = legal.getAllConnections();

    return NextResponse.json({
      success: true,
      data: connections,
    });
  } catch (error) {
    console.error('Error getting legal connections:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get legal connections' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integration-hub/legal
 * Create new legal system connection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const legal = getLegalService();
    
    const connectionId = await legal.createLegalConnection(body);
    
    return NextResponse.json({
      success: true,
      data: { connectionId },
    });
  } catch (error) {
    console.error('Error creating legal connection:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create legal connection' },
      { status: 500 }
    );
  }
}