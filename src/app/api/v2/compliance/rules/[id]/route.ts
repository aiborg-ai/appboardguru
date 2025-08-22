import { NextRequest, NextResponse } from 'next/server';
import { ComplianceController } from '../../../../../../lib/api/controllers/compliance.controller';

const controller = new ComplianceController();

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  // Individual rule access would be implemented here if needed
  return NextResponse.json(
    { 
      success: false, 
      error: 'Individual rule access not implemented in v2' 
    },
    { status: 501 }
  );
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  return controller.updateRule(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  // Rule deletion would be implemented here if needed
  return NextResponse.json(
    { 
      success: false, 
      error: 'Rule deletion not implemented in v2' 
    },
    { status: 501 }
  );
}

export async function OPTIONS(): Promise<NextResponse> {
  return controller.handleOptions();
}