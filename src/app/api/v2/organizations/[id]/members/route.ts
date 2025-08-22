import { NextRequest, NextResponse } from 'next/server';
import { OrganizationController } from '../../../../../../lib/api/controllers/organization.controller';

const controller = new OrganizationController();

export async function GET(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
  return controller.getMembers(request, context);
}

export async function POST(request: NextRequest, context: { params: { id: string } }): Promise<NextResponse> {
  return controller.addMember(request, context);
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}