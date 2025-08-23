/**
 * ERP Integration API
 */

import { NextRequest, NextResponse } from 'next/server';
import { ERPIntegrationService } from '@/lib/services/erp-integration.service';
import { IntegrationHubService } from '@/lib/services/integration-hub.service';

let erpService: ERPIntegrationService;

function getERPService(): ERPIntegrationService {
  if (!erpService) {
    const hub = new IntegrationHubService();
    erpService = new ERPIntegrationService(hub);
  }
  return erpService;
}

/**
 * GET /api/integration-hub/erp
 * Get all ERP connections
 */
export async function GET(request: NextRequest) {
  try {
    const erp = getERPService();
    const connections = erp.getAllConnections();

    return NextResponse.json({
      success: true,
      data: connections,
    });
  } catch (error) {
    console.error('Error getting ERP connections:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get ERP connections' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integration-hub/erp
 * Create new ERP connection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const erp = getERPService();
    
    const connectionId = await erp.createERPConnection(body);
    
    return NextResponse.json({
      success: true,
      data: { connectionId },
    });
  } catch (error) {
    console.error('Error creating ERP connection:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create ERP connection' },
      { status: 500 }
    );
  }
}