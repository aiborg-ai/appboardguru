/**
 * Voice Translation API Endpoint
 * Delegates to VoiceController for consistent architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { VoiceController } from '@/lib/api/controllers/voice.controller';

const voiceController = new VoiceController();

export async function POST(request: NextRequest): Promise<NextResponse> {
  return voiceController.translate(request);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  // TODO: Add these methods to the voice controller
  if (action === 'languages') {
    return NextResponse.json({
      success: true,
      supportedLanguages: {
        'en': 'English',
        'es': 'Spanish', 
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'zh': 'Chinese (Mandarin)',
        'ja': 'Japanese',
        'ko': 'Korean',
        'ar': 'Arabic',
        'hi': 'Hindi'
      }
    });
  }
  
  return NextResponse.json({ 
    error: 'Invalid action parameter' 
  }, { status: 400 });
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  // TODO: Add session management methods to voice controller
  return NextResponse.json({ 
    error: 'Session management not yet implemented in controller' 
  }, { status: 501 });
}

export async function OPTIONS(): Promise<NextResponse> {
  return voiceController.handleOptions();
}