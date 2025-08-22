import { NextRequest, NextResponse } from 'next/server';
import { ComplianceController } from '../../../../lib/api/controllers/compliance.controller';

const controller = new ComplianceController();

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'rules':
      return controller.getRules(request);
    case 'audits':
      return controller.getAudits(request);
    case 'templates':
      return controller.getTemplates(request);
    case 'metrics':
      return controller.getMetrics(request);
    default:
      return controller.getRules(request);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'rules':
      return controller.createRule(request);
    case 'check':
      return controller.performComplianceCheck(request);
    default:
      return controller.createRule(request);
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}