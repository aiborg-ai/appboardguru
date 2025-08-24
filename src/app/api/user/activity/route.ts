/**
 * User Activity API Endpoint
 * Delegates to UserController for consistent architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { UserController } from '@/lib/api/controllers/user.controller';

const userController = new UserController();

export async function GET(request: NextRequest): Promise<NextResponse> {
  return userController.getUserActivity(request);
}

export async function OPTIONS(): Promise<NextResponse> {
  return userController.handleOptions();
}