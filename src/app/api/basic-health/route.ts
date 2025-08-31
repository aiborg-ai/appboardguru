import { NextRequest, NextResponse } from 'next/server';

/**
 * Basic health check with zero dependencies
 * Used to verify the API layer is functioning
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    api: 'basic-health',
    message: 'API is responding - no external dependencies'
  }, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}