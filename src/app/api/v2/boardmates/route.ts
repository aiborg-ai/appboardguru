import { NextRequest, NextResponse } from 'next/server';
import { BoardmatesController } from '../../../../lib/api/controllers/boardmates.controller';

const controller = new BoardmatesController();

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'invitations':
      return controller.getBoardmateInvitations(request);
    default:
      return controller.getBoardmates(request);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'invite':
      return controller.inviteBoardmate(request);
    default:
      return controller.createBoardmate(request);
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}