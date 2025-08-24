/**
 * Compliance Workflows API Endpoint
 * Delegates to ComplianceController for consistent architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { ComplianceController } from '@/lib/api/controllers/compliance.controller';

const complianceController = new ComplianceController();

export async function GET(request: NextRequest): Promise<NextResponse> {
  return complianceController.getRules(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return complianceController.createRule(request);
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  return complianceController.updateRule(request, context);
}

export async function OPTIONS(): Promise<NextResponse> {
  return complianceController.handleOptions();
}