import { NextRequest, NextResponse } from 'next/server';
import { ComplianceController } from '../../../../../lib/api/controllers/compliance.controller';

const controller = new ComplianceController();

export async function GET(request: NextRequest): Promise<NextResponse> {
  return controller.getRules(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return controller.createRule(request);
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}