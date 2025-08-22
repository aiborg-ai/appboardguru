import { NextRequest, NextResponse } from 'next/server';
import { ChatController } from '../../../../../../lib/api/controllers/chat.controller';

const controller = new ChatController();

export async function GET(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
  return controller.getChatSession(request, context);
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
  return controller.deleteChatSession(request, context);
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}