import { NextRequest, NextResponse } from 'next/server';
import { OrganizationController } from '../../../../../lib/api/controllers/organization.controller';

const controller = new OrganizationController();

export async function GET(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
  return controller.getOrganization(request, context);
}

export async function PUT(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
  return controller.updateOrganization(request, context);
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
  return controller.deleteOrganization(request, context);
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}