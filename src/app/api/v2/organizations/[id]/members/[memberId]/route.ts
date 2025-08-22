import { NextRequest, NextResponse } from 'next/server';
import { OrganizationController } from '../../../../../../../lib/api/controllers/organization.controller';

const controller = new OrganizationController();

export async function PUT(request: NextRequest, context: { params: { id: string; memberId: string } }): Promise<NextResponse> {
  return controller.updateMember(request, context);
}

export async function DELETE(request: NextRequest, context: { params: { id: string; memberId: string } }): Promise<NextResponse> {
  return controller.removeMember(request, context);
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}