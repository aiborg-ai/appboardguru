import { NextRequest, NextResponse } from 'next/server';
import { NotificationsController } from '../../../../../lib/api/controllers/notifications.controller';

const controller = new NotificationsController();

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  // Individual notification access would be implemented here if needed
  return NextResponse.json(
    { 
      success: false, 
      error: 'Individual notification access not implemented in v2' 
    },
    { status: 501 }
  );
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  return controller.updateNotification(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'read':
      return controller.markAsRead(request, context);
    default:
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid action. Supported actions: read' 
        },
        { status: 400 }
      );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  return controller.deleteNotification(request, context);
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}