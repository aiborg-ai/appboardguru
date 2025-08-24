/**
 * Training Courses API Endpoint
 * Delegates to TrainingController for consistent architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { TrainingController } from '@/lib/api/controllers/training.controller';

const trainingController = new TrainingController();

export async function GET(request: NextRequest): Promise<NextResponse> {
  return trainingController.getCourses(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return trainingController.createCourse(request);
}

export async function OPTIONS(): Promise<NextResponse> {
  return trainingController.handleOptions();
}