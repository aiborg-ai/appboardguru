/**
 * Analytics Engagement API Endpoint
 * Delegates to AnalyticsController for consistent architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsController } from '@/lib/api/controllers/analytics.controller';

const analyticsController = new AnalyticsController();

export async function POST(request: NextRequest): Promise<NextResponse> {
  return analyticsController.getEngagementAnalytics(request);
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  return analyticsController.updateEngagementData(request);
}

export async function OPTIONS(): Promise<NextResponse> {
  return analyticsController.handleOptions();
}