import { NextRequest, NextResponse } from 'next/server';
import { CalendarController } from '../../../../lib/api/controllers/calendar.controller';

const controller = new CalendarController();

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'events':
      return controller.getEvents(request);
    case 'availability':
      return controller.checkAvailability(request);
    case 'conflicts':
      return controller.getConflicts(request);
    default:
      return controller.getEvents(request);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'events':
      return controller.createEvent(request);
    case 'schedule-meeting':
      return controller.scheduleMeeting(request);
    default:
      return controller.createEvent(request);
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}