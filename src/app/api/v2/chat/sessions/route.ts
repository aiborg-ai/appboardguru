import { NextRequest, NextResponse } from 'next/server';
import { ChatController } from '../../../../../lib/api/controllers/chat.controller';

const controller = new ChatController();

export async function GET(request: NextRequest): Promise<NextResponse> {
  return controller.getChatSessions(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return controller.createChatSession(request);
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}