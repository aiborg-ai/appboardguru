import { NextRequest, NextResponse } from 'next/server';
import { CalendarController } from '../../../../../../lib/api/controllers/calendar.controller';

const controller = new CalendarController();

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  // Individual event access would be implemented here if needed
  return NextResponse.json(
    { 
      success: false, 
      error: 'Individual event access not implemented in v2' 
    },
    { status: 501 }
  );
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  return controller.updateEvent(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  return controller.deleteEvent(request, context);
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}