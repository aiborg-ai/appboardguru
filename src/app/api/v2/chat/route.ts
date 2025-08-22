import { NextRequest, NextResponse } from 'next/server';
import { ChatController } from '../../../../lib/api/controllers/chat.controller';

const controller = new ChatController();

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'enhanced':
      return controller.sendEnhancedMessage(request);
    case 'basic':
    default:
      return controller.sendBasicMessage(request);
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}