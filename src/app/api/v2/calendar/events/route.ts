import { NextRequest, NextResponse } from 'next/server';
import { CalendarController } from '../../../../../lib/api/controllers/calendar.controller';

const controller = new CalendarController();

export async function GET(request: NextRequest): Promise<NextResponse> {
  return controller.getEvents(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return controller.createEvent(request);
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}