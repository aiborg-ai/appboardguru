/**
 * ERP Data Synchronization API
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
 * POST /api/integration-hub/erp/[connectionId]/sync
 * Sync data from ERP system
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  try {
    const { connectionId } = params;
    const body = await request.json();
    const { dataType = 'financial', fullSync = false } = body;
    
    const erp = getERPService();
    
    // Check if connection exists
    const connection = erp.getConnection(connectionId);
    if (!connection) {
      return NextResponse.json(
        { success: false, error: 'ERP connection not found' },
        { status: 404 }
      );
    }

    // Start sync process
    const syncResult = await erp.syncERPData(connectionId, dataType);
    
    return NextResponse.json({
      success: true,
      data: {
        recordsSync: syncResult.length,
        dataType,
        timestamp: new Date(),
        records: fullSync ? syncResult : syncResult.slice(0, 10), // Return sample or full data
      },
    });
  } catch (error) {
    console.error('Error syncing ERP data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync ERP data' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integration-hub/erp/[connectionId]/sync
 * Get sync status and history
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

    const syncStatus = {
      connectionId,
      status: connection.status,
      lastSync: connection.lastSync,
      syncStats: connection.syncStats,
      isAutoSyncEnabled: !!(connection as any)._autoSyncInterval,
    };

    return NextResponse.json({
      success: true,
      data: syncStatus,
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}