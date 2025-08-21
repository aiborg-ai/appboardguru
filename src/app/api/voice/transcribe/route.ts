import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface TranscriptionRequest {
  audio: string; // Base64 encoded audio
  format?: 'wav' | 'mp3' | 'webm' | 'ogg';
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'Voice transcription not configured' }, { status: 500 });
    }

    const body: TranscriptionRequest = await request.json();
    
    if (!body.audio) {
      return NextResponse.json({ error: 'Audio data is required' }, { status: 400 });
    }

    // Convert base64 audio to a format suitable for OpenRouter
    const audioBuffer = Buffer.from(body.audio, 'base64');
    
    // Create a FormData object for multipart/form-data upload
    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { 
      type: `audio/${body.format || 'webm'}` 
    });
    
    formData.append('file', audioBlob, `audio.${body.format || 'webm'}`);
    formData.append('model', 'openai/whisper-1');
    formData.append('response_format', 'json');

    // Send transcription request to OpenRouter
    const transcriptionResponse = await fetch(`${OPENROUTER_API_URL.replace('/chat/completions', '/audio/transcriptions')}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'BoardGuru Voice Transcription',
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      const errorData = await transcriptionResponse.text();
      console.error('OpenRouter API error:', errorData);
      return NextResponse.json({ 
        error: 'Voice transcription failed', 
        details: errorData 
      }, { status: 500 });
    }

    const transcriptionData = await transcriptionResponse.json();
    
    // Log the transcription activity
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        event_type: 'user_action',
        event_category: 'voice',
        action: 'transcribe_audio',
        resource_type: 'voice_transcription',
        event_description: 'User transcribed voice input',
        outcome: 'success',
        details: {
          audio_format: body.format || 'webm',
          text_length: transcriptionData.text?.length || 0,
        },
      });

    return NextResponse.json({
      success: true,
      text: transcriptionData.text,
      confidence: transcriptionData.confidence,
    });

  } catch (error) {
    console.error('Error in voice transcription:', error);
    return NextResponse.json({ 
      error: 'Internal server error during transcription' 
    }, { status: 500 });
  }
}