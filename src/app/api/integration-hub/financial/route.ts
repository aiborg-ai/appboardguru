/**
 * Financial Data Feeds Integration API
 */

import { NextRequest, NextResponse } from 'next/server';
import { FinancialDataFeedsService } from '@/lib/services/financial-data-feeds.service';
import { IntegrationHubService } from '@/lib/services/integration-hub.service';

let financialService: FinancialDataFeedsService;

function getFinancialService(): FinancialDataFeedsService {
  if (!financialService) {
    const hub = new IntegrationHubService();
    financialService = new FinancialDataFeedsService(hub);
  }
  return financialService;
}

/**
 * GET /api/integration-hub/financial
 * Get all financial data provider connections
 */
export async function GET(request: NextRequest) {
  try {
    const financial = getFinancialService();
    const connections = financial.getAllConnections();

    return NextResponse.json({
      success: true,
      data: connections,
    });
  } catch (error) {
    console.error('Error getting financial connections:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get financial connections' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integration-hub/financial
 * Create new financial data provider connection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const financial = getFinancialService();
    
    const connectionId = await financial.createFinancialConnection(body);
    
    return NextResponse.json({
      success: true,
      data: { connectionId },
    });
  } catch (error) {
    console.error('Error creating financial connection:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create financial connection' },
      { status: 500 }
    );
  }
}