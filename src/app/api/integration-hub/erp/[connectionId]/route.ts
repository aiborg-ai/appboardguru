/**
 * ERP Connection Management API
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
 * GET /api/integration-hub/erp/[connectionId]
 * Get specific ERP connection details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  try {
    const { connectionId } = params;
    const erp = getERPService();
    
    const connection = erp.getConnection(connectionId);
    
    if (!connection) {
      return NextResponse.json(
        { success: false, error: 'ERP connection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: connection,
    });
  } catch (error) {
    console.error('Error getting ERP connection:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get ERP connection' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/integration-hub/erp/[connectionId]
 * Update ERP connection
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  try {
    const { connectionId } = params;
    const body = await request.json();
    const erp = getERPService();
    
    // Update connection configuration
    const connection = erp.getConnection(connectionId);
    if (!connection) {
      return NextResponse.json(
        { success: false, error: 'ERP connection not found' },
        { status: 404 }
      );
    }

    Object.assign(connection, body);

    return NextResponse.json({
      success: true,
      data: connection,
    });
  } catch (error) {
    console.error('Error updating ERP connection:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update ERP connection' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integration-hub/erp/[connectionId]
 * Delete ERP connection
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  try {
    const { connectionId } = params;
    const erp = getERPService();
    
    await erp.disconnectFromERP(connectionId);
    
    return NextResponse.json({
      success: true,
      message: 'ERP connection deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting ERP connection:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete ERP connection' },
      { status: 500 }
    );
  }
}