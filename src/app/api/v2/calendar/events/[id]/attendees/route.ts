import { NextRequest, NextResponse } from 'next/server';
import { CalendarController } from '../../../../../../../lib/api/controllers/calendar.controller';

const controller = new CalendarController();

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  return controller.getAttendees(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  return controller.addAttendee(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  return controller.updateRsvp(request, context);
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}