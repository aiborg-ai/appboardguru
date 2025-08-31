/**
 * Financial Market Data API
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
 * GET /api/integration-hub/financial/[connectionId]/market-data
 * Get real-time market data for symbols
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    const { connectionId } = params;
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols');
    const dataType = searchParams.get('type') || 'current';
    
    if (!symbolsParam) {
      return NextResponse.json(
        { success: false, error: 'Symbols parameter is required' },
        { status: 400 }
      );
    }

    const symbols = symbolsParam.split(',').map(s => s.trim());
    const financial = getFinancialService();
    
    // Check if connection exists
    const connection = financial.getConnection(connectionId);
    if (!connection) {
      return NextResponse.json(
        { success: false, error: 'Financial connection not found' },
        { status: 404 }
      );
    }

    let marketData;
    
    switch (dataType) {
      case 'current':
        marketData = await financial.getMarketData(connectionId, symbols);
        break;
      case 'historical':
        const startDate = searchParams.get('startDate') 
          ? new Date(searchParams.get('startDate')!) 
          : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        const endDate = searchParams.get('endDate') 
          ? new Date(searchParams.get('endDate')!) 
          : new Date();
        const interval = searchParams.get('interval') as any || '1DAY';
        
        if (symbols.length > 1) {
          return NextResponse.json(
            { success: false, error: 'Historical data supports only one symbol at a time' },
            { status: 400 }
          );
        }
        
        marketData = await financial.getHistoricalData(connectionId, symbols[0], startDate, endDate, interval);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid data type. Use "current" or "historical"' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        symbols,
        dataType,
        timestamp: new Date(),
        marketData,
      },
    });
  } catch (error) {
    console.error('Error getting market data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get market data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integration-hub/financial/[connectionId]/market-data
 * Subscribe to real-time market data
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    const { connectionId } = params;
    const body = await request.json();
    const { symbols, fields, interval = 'REAL_TIME' } = body;
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Symbols array is required' },
        { status: 400 }
      );
    }

    const financial = getFinancialService();
    
    // Check if connection exists
    const connection = financial.getConnection(connectionId);
    if (!connection) {
      return NextResponse.json(
        { success: false, error: 'Financial connection not found' },
        { status: 404 }
      );
    }

    // Create real-time subscription
    const subscriptionId = await financial.subscribeRealTimeData(
      connectionId, 
      symbols, 
      fields || ['price', 'change', 'volume']
    );
    
    return NextResponse.json({
      success: true,
      data: { subscriptionId, symbols, fields },
    });
  } catch (error) {
    console.error('Error subscribing to market data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to subscribe to market data' },
      { status: 500 }
    );
  }
}