/**
 * Organization Members API Endpoint
 * Delegates to OrganizationController for consistent architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { OrganizationController } from '@/lib/api/controllers/organization.controller';

const organizationController = new OrganizationController();

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  return organizationController.getMembers(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  return organizationController.updateMember(request, context);
}

export async function OPTIONS(): Promise<NextResponse> {
  return organizationController.handleOptions();
}