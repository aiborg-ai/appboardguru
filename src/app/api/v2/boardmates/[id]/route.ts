import { NextRequest, NextResponse } from 'next/server';
import { BoardmatesController } from '../../../../../lib/api/controllers/boardmates.controller';

const controller = new BoardmatesController();

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'associations':
      return controller.getBoardmateAssociations(request, context);
    default:
      return controller.getBoardmate(request, context);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'association':
      return controller.updateBoardmateAssociation(request, context);
    default:
      return controller.updateBoardmate(request, context);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'association':
      return controller.deleteBoardmateAssociation(request, context);
    default:
      return controller.deleteBoardmate(request, context);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'association':
      return controller.createBoardmateAssociation(request, context);
    default:
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid action. Supported actions: association' 
        },
        { status: 400 }
      );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}