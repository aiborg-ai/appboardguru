import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface TranslateRequest {
  audio?: string; // Base64 encoded audio for voice translation
  text?: string; // Text for text-only translation
  sourceLanguage?: string; // Auto-detect if not provided
  targetLanguages: string[]; // Languages to translate to
  sessionId?: string; // For real-time sessions
  speakerId?: string; // For speaker identification
  format?: 'wav' | 'mp3' | 'webm' | 'ogg';
  includeAudio?: boolean; // Whether to return audio translation
}

interface TranslationResponse {
  success: boolean;
  sessionId?: string;
  translations: {
    [languageCode: string]: {
      text: string;
      confidence: number;
      audioUrl?: string;
    };
  };
  detectedLanguage?: string;
  speakerId?: string;
  timestamp?: number;
  originalText?: string;
}

// Supported languages with their codes and names
const SUPPORTED_LANGUAGES = {
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
  'hi': 'Hindi',
  'th': 'Thai',
  'vi': 'Vietnamese',
  'id': 'Indonesian',
  'ms': 'Malay',
  'tl': 'Filipino',
  'nl': 'Dutch',
  'sv': 'Swedish',
  'da': 'Danish',
  'no': 'Norwegian',
  'fi': 'Finnish',
  'pl': 'Polish',
  'cs': 'Czech',
  'hu': 'Hungarian',
  'ro': 'Romanian',
  'bg': 'Bulgarian',
  'hr': 'Croatian'
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'Voice translation not configured' }, { status: 500 });
    }

    const body: TranslateRequest = await request.json();
    
    if (!body.audio && !body.text) {
      return NextResponse.json({ error: 'Either audio or text is required' }, { status: 400 });
    }

    if (!body.targetLanguages || body.targetLanguages.length === 0) {
      return NextResponse.json({ error: 'At least one target language is required' }, { status: 400 });
    }

    // Validate target languages
    const invalidLanguages = body.targetLanguages.filter(lang => !SUPPORTED_LANGUAGES[lang as keyof typeof SUPPORTED_LANGUAGES]);
    if (invalidLanguages.length > 0) {
      return NextResponse.json({ 
        error: `Unsupported languages: ${invalidLanguages.join(', ')}`,
        supportedLanguages: Object.keys(SUPPORTED_LANGUAGES)
      }, { status: 400 });
    }

    let originalText = body.text;
    let detectedLanguage = body.sourceLanguage;

    // If audio is provided, first transcribe it
    if (body.audio) {
      const transcriptionResult = await transcribeAudio(body.audio, body.format);
      if (!transcriptionResult.success) {
        return NextResponse.json({ 
          error: 'Failed to transcribe audio',
          details: transcriptionResult.error 
        }, { status: 500 });
      }
      
      originalText = transcriptionResult.text;
      detectedLanguage = transcriptionResult.detectedLanguage || 'auto';
    }

    if (!originalText || originalText.trim().length === 0) {
      return NextResponse.json({ error: 'No text to translate' }, { status: 400 });
    }

    // Get user's organization for custom terminology
    const { data: userOrg } = await supabase
      .from('organization_memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const organizationId = userOrg?.organization_id;

    // Get custom terminology for better translations
    let customTerminology = {};
    if (organizationId) {
      const { data: terminology } = await supabase
        .from('custom_terminology')
        .select('term, translations, context_category')
        .eq('organization_id', organizationId)
        .eq('is_organization_wide', true);

      if (terminology) {
        customTerminology = terminology.reduce((acc, term) => {
          acc[term.term] = term.translations;
          return acc;
        }, {} as Record<string, any>);
      }
    }

    // Perform translations
    const translations: Record<string, { text: string; confidence: number; audioUrl?: string }> = {};
    
    for (const targetLang of body.targetLanguages) {
      const translationResult = await translateText(
        originalText,
        detectedLanguage || 'auto',
        targetLang,
        customTerminology
      );

      if (translationResult.success) {
        translations[targetLang] = {
          text: translationResult.text,
          confidence: translationResult.confidence || 0,
        };

        // Generate audio if requested
        if (body.includeAudio) {
          const audioResult = await generateAudio(translationResult.text, targetLang);
          if (audioResult.success) {
            translations[targetLang].audioUrl = audioResult.audioUrl || undefined;
          }
        }
      }
    }

    // Create or update translation session
    let sessionId = body.sessionId;
    if (!sessionId && organizationId) {
      const { data: session } = await supabase
        .from('voice_translation_sessions')
        .insert({
          user_id: user.id,
          organization_id: organizationId,
          source_language: detectedLanguage || 'auto',
          target_languages: body.targetLanguages,
          session_type: 'realtime',
          is_active: true
        })
        .select('id')
        .single();

      sessionId = session?.id;
    }

    // Store translation entry
    if (sessionId && organizationId) {
      await supabase
        .from('voice_translations')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          organization_id: organizationId,
          original_text: originalText,
          original_language: detectedLanguage || 'unknown',
          translations: translations,
          confidence_scores: Object.fromEntries(
            Object.entries(translations).map(([lang, data]) => [lang, data.confidence])
          ),
          speaker_id: body.speakerId,
          timestamp_offset: Date.now()
        });
    }

    // Log translation metrics
    if (organizationId) {
      for (const [targetLang, result] of Object.entries(translations)) {
        await supabase
          .from('translation_metrics')
          .insert({
            user_id: user.id,
            organization_id: organizationId,
            session_id: sessionId,
            source_language: detectedLanguage || 'unknown',
            target_language: targetLang,
            total_words: originalText.split(' ').length,
            total_phrases: 1,
            accuracy_score: result.confidence,
            confidence_avg: result.confidence,
            latency_ms: Date.now() - ((body as any).timestamp || Date.now())
          });
      }
    }

    // Log audit entry
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        event_type: 'user_action',
        event_category: 'voice_translation',
        action: 'translate_content',
        resource_type: 'translation',
        resource_id: sessionId,
        event_description: `User translated content to ${body.targetLanguages.join(', ')}`,
        outcome: 'success',
        details: {
          source_language: detectedLanguage,
          target_languages: body.targetLanguages,
          text_length: originalText.length,
          has_audio: !!body.audio,
          include_audio_output: !!body.includeAudio
        }
      });

    const response: TranslationResponse = {
      success: true,
      sessionId,
      translations,
      detectedLanguage,
      speakerId: body.speakerId,
      timestamp: Date.now(),
      originalText
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in voice translation:', error);
    return NextResponse.json({ 
      error: 'Internal server error during translation' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'languages') {
      return NextResponse.json({
        success: true,
        supportedLanguages: SUPPORTED_LANGUAGES
      });
    }

    if (action === 'sessions') {
      const { data: sessions } = await supabase
        .from('voice_translation_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      return NextResponse.json({
        success: true,
        sessions: sessions || []
      });
    }

    return NextResponse.json({ 
      error: 'Invalid action parameter' 
    }, { status: 400 });

  } catch (error) {
    console.error('Error in translation GET:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Helper function to transcribe audio
async function transcribeAudio(audioData: string, format?: string) {
  try {
    const audioBuffer = Buffer.from(audioData, 'base64');
    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { 
      type: `audio/${format || 'webm'}` 
    });
    
    formData.append('file', audioBlob, `audio.${format || 'webm'}`);
    formData.append('model', 'openai/whisper-1');
    formData.append('response_format', 'verbose_json');

    const response = await fetch(`${OPENROUTER_API_URL.replace('/chat/completions', '/audio/transcriptions')}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'BoardGuru Voice Translation',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.text();
      return { success: false, error: errorData };
    }

    const data = await response.json();
    return {
      success: true,
      text: data.text,
      detectedLanguage: data.language,
      confidence: data.confidence || 0.95
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Helper function to translate text
async function translateText(
  text: string, 
  sourceLanguage: string, 
  targetLanguage: string, 
  customTerminology: Record<string, any>
) {
  try {
    const terminologyContext = Object.keys(customTerminology).length > 0 
      ? `Use these custom translations when appropriate: ${JSON.stringify(customTerminology, null, 2)}\n\n`
      : '';

    const prompt = `${terminologyContext}Translate the following text from ${sourceLanguage === 'auto' ? 'the detected language' : sourceLanguage} to ${targetLanguage}. 
    
Provide only the translation without any explanations or additional text. 
Maintain the tone, formality, and context appropriate for business/board meeting communications.
    
Text to translate: "${text}"

Translation:`;

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'BoardGuru Voice Translation',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.1, // Low temperature for consistent translations
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return { success: false, error: errorData };
    }

    const data = await response.json();
    const translatedText = data.choices?.[0]?.message?.content?.trim() || '';

    return {
      success: true,
      text: translatedText,
      confidence: 0.85 // Base confidence, could be enhanced with quality metrics
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Helper function to generate audio (placeholder - would need TTS service)
async function generateAudio(text: string, language: string) {
  // This would integrate with a TTS service like ElevenLabs, Google TTS, etc.
  // For now, return a placeholder
  return {
    success: false,
    audioUrl: null,
    error: 'Audio generation not yet implemented'
  };
}

// PUT endpoint to update translation session
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, action, ...updateData } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    if (action === 'end') {
      const { error } = await supabase
        .from('voice_translation_sessions')
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Session ended' });
    }

    if (action === 'update') {
      const allowedFields = ['session_name', 'target_languages', 'settings'];
      const filteredData = Object.fromEntries(
        Object.entries(updateData).filter(([key]) => allowedFields.includes(key))
      );

      if (Object.keys(filteredData).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
      }

      const { error } = await supabase
        .from('voice_translation_sessions')
        .update({
          ...filteredData,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Session updated' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error updating translation session:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}