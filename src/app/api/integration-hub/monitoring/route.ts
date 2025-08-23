/**
 * Integration Monitoring API
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
 * GET /api/integration-hub/monitoring
 * Get system overview and monitoring summary
 */
export async function GET(request: NextRequest) {
  try {
    const monitoring = getMonitoringService();
    
    // Get system overview
    const systemOverview = await monitoring.getSystemOverview();
    
    // Get active alerts
    const activeAlerts = await monitoring.getActiveAlerts();
    
    // Get recent dashboards
    const dashboards = await monitoring.getAllDashboards();
    const recentDashboards = dashboards
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        systemOverview,
        activeAlerts: activeAlerts.length,
        criticalAlerts: activeAlerts.filter(a => a.severity === 'critical').length,
        totalDashboards: dashboards.length,
        recentDashboards,
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    console.error('Error getting monitoring overview:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get monitoring overview' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integration-hub/monitoring
 * Create new monitoring dashboard
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const monitoring = getMonitoringService();
    
    const dashboardId = await monitoring.createDashboard(body);
    
    return NextResponse.json({
      success: true,
      data: { dashboardId },
    });
  } catch (error) {
    console.error('Error creating dashboard:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create dashboard' },
      { status: 500 }
    );
  }
}