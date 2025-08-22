import { NextRequest, NextResponse } from 'next/server';
import { NotificationsController } from '../../../../lib/api/controllers/notifications.controller';

const controller = new NotificationsController();

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'count':
      return controller.getNotificationCount(request);
    case 'templates':
      return controller.getTemplates(request);
    case 'anomalies':
      return controller.getAnomalies(request);
    case 'predictions':
      return controller.getPredictions(request);
    default:
      return controller.getNotifications(request);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'bulk':
      return controller.bulkOperations(request);
    case 'analyze-patterns':
      return controller.analyzePatterns(request);
    default:
      return controller.createNotification(request);
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}