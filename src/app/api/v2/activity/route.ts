import { NextRequest, NextResponse } from 'next/server';
import { ActivityController } from '../../../../lib/api/controllers/activity.controller';

const controller = new ActivityController();

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'logs':
      return controller.getActivityLogs(request);
    case 'metrics':
      return controller.getActivityMetrics(request);
    case 'export':
      return controller.exportActivityData(request);
    case 'dashboard':
      return controller.getDashboardData(request);
    case 'search':
      return controller.searchActivities(request);
    default:
      return controller.getActivityLogs(request);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'log':
      return controller.logActivity(request);
    case 'analytics':
      return controller.executeAnalyticsAction(request);
    default:
      return controller.logActivity(request);
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}