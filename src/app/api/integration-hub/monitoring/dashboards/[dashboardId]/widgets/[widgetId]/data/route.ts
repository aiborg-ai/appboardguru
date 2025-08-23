/**
 * Widget Data API
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
 * GET /api/integration-hub/monitoring/dashboards/[dashboardId]/widgets/[widgetId]/data
 * Get widget data for dashboard
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { dashboardId: string; widgetId: string } }
) {
  try {
    const { dashboardId, widgetId } = params;
    const { searchParams } = new URL(request.url);
    
    // Parse time range
    let timeRange;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const relative = searchParams.get('relative'); // e.g., '1h', '24h', '7d'
    
    if (startDate && endDate) {
      timeRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      };
    } else if (relative) {
      const now = new Date();
      const duration = this.parseRelativeDuration(relative);
      timeRange = {
        start: new Date(now.getTime() - duration),
        end: now,
      };
    }
    
    const monitoring = getMonitoringService();
    
    // Check if dashboard exists
    const dashboard = await monitoring.getDashboard(dashboardId);
    if (!dashboard) {
      return NextResponse.json(
        { success: false, error: 'Dashboard not found' },
        { status: 404 }
      );
    }

    // Get widget data
    const widgetData = await monitoring.getWidgetData(dashboardId, widgetId, timeRange);
    
    return NextResponse.json({
      success: true,
      data: {
        dashboardId,
        widgetId,
        timeRange,
        data: widgetData,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Error getting widget data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get widget data' },
      { status: 500 }
    );
  }
}

// Helper function to parse relative duration strings
function parseRelativeDuration(relative: string): number {
  const match = relative.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error('Invalid relative time format');
  }
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's':
      return value * 1000; // seconds to milliseconds
    case 'm':
      return value * 60 * 1000; // minutes to milliseconds
    case 'h':
      return value * 60 * 60 * 1000; // hours to milliseconds
    case 'd':
      return value * 24 * 60 * 60 * 1000; // days to milliseconds
    default:
      throw new Error('Invalid time unit');
  }
}