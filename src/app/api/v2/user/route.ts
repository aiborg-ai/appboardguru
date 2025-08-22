import { NextRequest, NextResponse } from 'next/server';
import { UserController } from '../../../../lib/api/controllers/user.controller';

const controller = new UserController();

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'profile':
      return controller.getUserProfile(request);
    case 'preferences':
      return controller.getUserPreferences(request);
    case 'security':
      return controller.getSecuritySettings(request);
    case 'organizations':
      return controller.getUserOrganizations(request);
    default:
      return controller.getUserProfile(request);
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'profile':
      return controller.updateUserProfile(request);
    case 'preferences':
      return controller.updateUserPreferences(request);
    case 'password':
      return controller.changePassword(request);
    case 'security':
      return controller.updateSecuritySettings(request);
    default:
      return controller.updateUserProfile(request);
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'account':
      return controller.deleteAccount(request);
    default:
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid action. Supported actions: account' 
        },
        { status: 400 }
      );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}