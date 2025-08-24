/**
 * Notification Read API Endpoint
 * Delegates to NotificationsController for consistent architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { NotificationsController } from '@/lib/api/controllers/notifications.controller';

const notificationsController = new NotificationsController();

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  return notificationsController.markAsRead(request, context);
}

export async function OPTIONS(): Promise<NextResponse> {
  return notificationsController.handleOptions();
}