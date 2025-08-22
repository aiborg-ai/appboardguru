/**
 * Voice Transcription API Endpoint
 * Delegates to VoiceController for consistent architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { VoiceController } from '@/lib/api/controllers/voice.controller';

const voiceController = new VoiceController();

export async function POST(request: NextRequest): Promise<NextResponse> {
  return voiceController.transcribe(request);
}

export async function OPTIONS(): Promise<NextResponse> {
  return voiceController.handleOptions();
}