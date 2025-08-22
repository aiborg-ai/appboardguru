import { NextRequest, NextResponse } from 'next/server';
import { OrganizationController } from '../../../../lib/api/controllers/organization.controller';

const controller = new OrganizationController();

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'check-slug':
      return controller.checkSlugAvailability(request);
    default:
      return controller.listOrganizations(request);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return controller.createOrganization(request);
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}