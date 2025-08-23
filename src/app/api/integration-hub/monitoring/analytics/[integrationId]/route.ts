/**
 * Integration Analytics API
 */

import { NextRequest, NextResponse } from 'next/server';
import { IntegrationMonitoringService } from '@/lib/services/integration-monitoring.service';
import { IntegrationHubService } from '@/lib/services/integration-hub.service';

let monitoringService: IntegrationMonitoringService;

function getMonitoringService(): IntegrationMonitoringService {
  if (!monitoringService) {
    const hub = new IntegrationHubService();
    monitoringService = new IntegrationMonitoringService(hub);
  }
  return monitoringService;
}

/**
 * GET /api/integration-hub/monitoring/analytics/[integrationId]
 * Get comprehensive analytics for specific integration
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { integrationId: string } }
) {
  try {
    const { integrationId } = params;
    const { searchParams } = new URL(request.url);
    
    // Parse time range
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const relative = searchParams.get('relative') || '7d'; // default to 7 days
    
    let timeRange;
    if (startDate && endDate) {
      timeRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      };
    } else {
      const now = new Date();
      const duration = parseRelativeDuration(relative);
      timeRange = {
        start: new Date(now.getTime() - duration),
        end: now,
      };
    }
    
    const monitoring = getMonitoringService();
    
    // Get comprehensive analytics
    const analytics = await monitoring.getIntegrationAnalytics(integrationId, timeRange);
    
    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Error getting integration analytics:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get integration analytics' },
      { status: 500 }
    );
  }
}

// Helper function to parse relative duration strings
function parseRelativeDuration(relative: string): number {
  const match = relative.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000; // default to 7 days
  }
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000; // default to 7 days
  }
}