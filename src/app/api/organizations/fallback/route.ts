import { NextRequest, NextResponse } from 'next/server';

/**
 * True fallback API that always returns an empty array
 * No dependencies on Supabase or any external services
 * Used when all other organization APIs fail
 */
export async function GET(request: NextRequest) {
  console.log('[Fallback API] Returning empty organizations array - no dependencies');
  
  // Always return empty array with success status
  // This ensures the UI can still function even when all services are down
  return NextResponse.json([], { 
    status: 200,
    headers: {
      'X-Fallback': 'true',
      'Cache-Control': 'no-store'
    }
  });
}