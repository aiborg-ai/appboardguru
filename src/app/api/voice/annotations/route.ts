/**
 * Voice Annotations API Endpoint
 * Handles voice annotations on PDFs with speech-to-text and playback
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { 
  VoiceAnnotation, 
  CreateVoiceAnnotationRequest,
  VoiceAnnotationResponse,
  VoiceAnnotationContent,
  VoiceThread,
  VoiceThreadMessage,
  AnnotationPosition
} from '@/types/voice-collaboration';

// Supabase client will be initialized per request for proper authentication

// OpenRouter API for speech-to-text (using Whisper)
const OPENROUTER_API_KEY = process.env['OPENROUTER_API_KEY'];
const SPEECH_TO_TEXT_MODEL = 'openai/whisper-large-v3';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    console.log('Voice Annotations API called with action:', action);

    switch (action) {
      case 'create_annotation':
        return await createAnnotation(params as CreateVoiceAnnotationRequest);
      
      case 'get_annotations':
        return await getAnnotations(params);
      
      case 'update_annotation':
        return await updateAnnotation(params);
      
      case 'delete_annotation':
        return await deleteAnnotation(params);
      
      case 'create_thread':
        return await createVoiceThread(params);
      
      case 'add_thread_message':
        return await addThreadMessage(params);
      
      case 'get_thread_messages':
        return await getThreadMessages(params);
      
      case 'transcribe_audio':
        return await transcribeAudio(params);
      
      case 'generate_summary':
        return await generateAnnotationSummary(params);

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action specified' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Voice annotations API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

async function createAnnotation(params: CreateVoiceAnnotationRequest): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient() as any;
    const { audioData, documentId, position, type, priority = 'medium', tags = [] } = params;
    const userId = 'default-user'; // TODO: Get from authenticated session
    const sessionId = 'default-session'; // TODO: Get from request context

    // Transcribe audio using Whisper
    const transcriptionResult = await transcribeAudioData(audioData);
    
    if (!transcriptionResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to transcribe audio' },
        { status: 500 }
      );
    }

    // Get user information
    const { data: userData } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('id', userId)
      .single();

    // Generate annotation ID
    const annotationId = `va_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Store audio file (in production, use proper file storage)
    const audioUrl = await storeAudioData(audioData, annotationId);

    // Extract keywords from transcript
    const transcript = transcriptionResult.transcript || '';
    const keywords = extractKeywords(transcript);

    // Detect emotion and intent from transcript
    const emotionalAnalysis = await analyzeEmotion(transcript);

    // Create voice annotation content
    const content: VoiceAnnotationContent = {
      audioUrl,
      transcript: transcript,
      transcriptConfidence: transcriptionResult.confidence || 0,
      summary: transcript.length > 100 
        ? await generateSummary(transcript)
        : transcript,
      keywords,
      emotion: emotionalAnalysis
    };

    // Calculate duration from audio data
    const duration = estimateAudioDuration(audioData);

    // Create annotation object
    const annotation: VoiceAnnotation = {
      id: annotationId,
      sessionId: sessionId || 'standalone',
      documentId: documentId || '',
      authorId: userId,
      authorName: userData?.full_name || 'Unknown User',
      type,
      content,
      position: position || { x: 0, y: 0, width: 0, height: 0 },
      timestamp: new Date().toISOString(),
      duration,
      status: 'active',
      thread: [],
      tags,
      priority,
      metadata: {
        documentTitle: (await getDocumentTitle(documentId)) || 'Untitled Document',
        pageTitle: position?.page ? `Page ${position.page}` : 'Unknown Page',
        contextBefore: (await getContextBefore(documentId, position)) || '',
        contextAfter: (await getContextAfter(documentId, position)) || '',
        relatedAnnotations: await findRelatedAnnotations(content.keywords, documentId)
      }
    };

    // Store annotation in database
    const { error: dbError } = await supabase
      .from('voice_annotations')
      .insert({
        id: annotationId,
        session_id: sessionId,
        document_id: documentId,
        author_id: userId,
        author_name: userData?.full_name || 'Unknown User',
        type,
        content: content,
        position: position,
        timestamp: annotation.timestamp,
        duration,
        status: 'active',
        tags,
        priority,
        metadata: annotation.metadata
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to store annotation' },
        { status: 500 }
      );
    }

    // Check for workflow triggers
    const workflowActions = await checkWorkflowTriggers(transcriptionResult.transcript || '', userId);

    const response: VoiceAnnotationResponse = {
      success: true,
      annotation,
      ...(transcriptionResult.transcript && { transcript: transcriptionResult.transcript }),
      ...(transcriptionResult.confidence !== undefined && { confidence: transcriptionResult.confidence }),
      actions: workflowActions
    };

    // Log annotation creation event
    console.log('Voice annotation created:', {
      id: annotationId,
      documentId,
      transcript: (transcriptionResult.transcript || '').substring(0, 100) + '...',
      duration,
      keywords: keywords.slice(0, 5)
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Create annotation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create voice annotation' },
      { status: 500 }
    );
  }
}

async function getAnnotations(params: Record<string, unknown>): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient() as any;
    const { documentId, sessionId, type, status = 'active', limit = 50, offset = 0 } = params;

    let query = supabase
      .from('voice_annotations')
      .select('*')
      .eq('status', status)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (documentId) {
      query = query.eq('document_id', documentId);
    }

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data: annotations, error } = await query;

    if (error) {
      throw error;
    }

    // Get thread messages for each annotation
    const annotationsWithThreads = await Promise.all(
      (annotations || []).map(async (annotation: any) => {
        const { data: threadMessages } = await supabase
          .from('voice_annotation_replies')
          .select('*')
          .eq('annotation_id', annotation.id)
          .order('timestamp', { ascending: true });

        return {
          ...annotation,
          thread: threadMessages || []
        };
      })
    );

    return NextResponse.json({
      success: true,
      annotations: annotationsWithThreads,
      totalCount: annotationsWithThreads.length
    });

  } catch (error) {
    console.error('Get annotations error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve annotations' },
      { status: 500 }
    );
  }
}

async function updateAnnotation(params: Record<string, unknown>): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient() as any;
    const { annotationId, updates } = params;
    const userId = params.userId || 'default-user';

    // Check if user has permission to update this annotation
    const { data: annotation } = await supabase
      .from('voice_annotations')
      .select('author_id')
      .eq('id', annotationId)
      .single();

    if (!annotation || annotation.author_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('voice_annotations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', annotationId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Update annotation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update annotation' },
      { status: 500 }
    );
  }
}

async function deleteAnnotation(params: Record<string, unknown>): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient() as any;
    const { annotationId } = params;
    const userId = params.userId || 'default-user';

    // Check permission
    const { data: annotation } = await supabase
      .from('voice_annotations')
      .select('author_id')
      .eq('id', annotationId)
      .single();

    if (!annotation || annotation.author_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Soft delete by updating status
    const { error } = await supabase
      .from('voice_annotations')
      .update({ status: 'archived' })
      .eq('id', annotationId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete annotation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete annotation' },
      { status: 500 }
    );
  }
}

async function createVoiceThread(params: Record<string, unknown>): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient() as any;
    const { documentId, sectionId, title, description } = params;
    const userId = params.userId || 'default-user';

    const threadId = `vt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const thread: VoiceThread = {
      id: threadId,
      documentId,
      sectionId,
      title,
      description,
      participants: [userId],
      messages: [],
      status: 'open',
      priority: 'medium',
      tags: [],
      metadata: {
        documentSection: sectionId,
        relatedThreads: [],
        estimatedTime: 0,
        actualTime: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const { error } = await supabase
      .from('voice_threads')
      .insert({
        id: threadId,
        document_id: documentId,
        section_id: sectionId,
        title,
        description,
        participants: [userId],
        status: 'open',
        priority: 'medium',
        tags: [],
        metadata: thread.metadata,
        created_at: thread.createdAt,
        updated_at: thread.updatedAt
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, thread });

  } catch (error) {
    console.error('Create voice thread error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create voice thread' },
      { status: 500 }
    );
  }
}

async function addThreadMessage(params: Record<string, unknown>): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient() as any;
    const { threadId, audioData, replyToId } = params;
    const userId = params.userId || 'default-user';

    // Transcribe the voice message
    const transcriptionResult = await transcribeAudioData(audioData);
    
    if (!transcriptionResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to transcribe audio' },
        { status: 500 }
      );
    }

    const messageId = `vm_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const audioUrl = await storeAudioData(audioData, messageId);
    
    // Get user info
    const { data: userData } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', userId)
      .single();

    const content: VoiceAnnotationContent = {
      audioUrl,
      transcript: transcriptionResult.transcript || '',
      transcriptConfidence: transcriptionResult.confidence || 0,
      keywords: extractKeywords(transcriptionResult.transcript || '')
    };

    const message: VoiceThreadMessage = {
      id: messageId,
      threadId,
      authorId: userId,
      authorName: userData?.full_name || 'Unknown User',
      content,
      timestamp: new Date().toISOString(),
      replyToId,
      reactions: [],
      attachments: []
    };

    const { error } = await supabase
      .from('voice_thread_messages')
      .insert({
        id: messageId,
        thread_id: threadId,
        author_id: userId,
        author_name: userData?.full_name || 'Unknown User',
        content,
        timestamp: message.timestamp,
        reply_to_id: replyToId
      });

    if (error) {
      throw error;
    }

    // Update thread's updated_at timestamp
    await supabase
      .from('voice_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', threadId);

    return NextResponse.json({ success: true, message });

  } catch (error) {
    console.error('Add thread message error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add thread message' },
      { status: 500 }
    );
  }
}

async function getThreadMessages(params: Record<string, unknown>): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient() as any;
    const { threadId, limit = 50, offset = 0 } = params;

    const { data: messages, error } = await supabase
      .from('voice_thread_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('timestamp', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      messages: messages || []
    });

  } catch (error) {
    console.error('Get thread messages error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve thread messages' },
      { status: 500 }
    );
  }
}

async function transcribeAudio(params: Record<string, unknown>): Promise<NextResponse> {
  try {
    const { audioData } = params;
    const result = await transcribeAudioData(audioData);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Transcribe audio error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}

async function generateAnnotationSummary(params: Record<string, unknown>): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient() as any;
    const { annotationId } = params;

    const { data: annotation } = await supabase
      .from('voice_annotations')
      .select('content')
      .eq('id', annotationId)
      .single();

    if (!annotation) {
      return NextResponse.json(
        { success: false, error: 'Annotation not found' },
        { status: 404 }
      );
    }

    const summary = await generateSummary(annotation.content.transcript);

    return NextResponse.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('Generate summary error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}

// Helper functions

async function transcribeAudioData(audioData: string): Promise<{
  success: boolean;
  transcript?: string;
  confidence?: number;
  error?: string;
}> {
  try {
    if (!OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key not configured');
    }

    // Convert base64 to blob
    const audioBlob = base64ToBlob(audioData, 'audio/webm');
    
    // Create form data for Whisper API
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', SPEECH_TO_TEXT_MODEL);
    formData.append('language', 'en');
    formData.append('response_format', 'verbose_json');

    const response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000',
        'X-Title': 'BoardGuru Voice Annotations'
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Transcription failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    return {
      success: true,
      transcript: result.text || '',
      confidence: result.segments ? 
        result.segments.reduce((acc: number, seg: any) => acc + (seg.avg_logprob || 0), 0) / result.segments.length :
        0.8 // Default confidence
    };

  } catch (error) {
    console.error('Transcription error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown transcription error'
    };
  }
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  // Remove data URL prefix if present
  const base64Data = base64.includes(',') ? (base64.split(',')[1] || '') : base64;
  
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

async function storeAudioData(audioData: string, annotationId: string): Promise<string> {
  // In production, this would upload to Supabase Storage or similar
  // For now, return a placeholder URL
  return `/api/voice/audio/${annotationId}`;
}

function extractKeywords(text: string): string[] {
  // Simple keyword extraction - in production, use NLP libraries
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  const wordFreq = words.reduce((freq: Record<string, number>, word) => {
    freq[word] = (freq[word] || 0) + 1;
    return freq;
  }, {});
  
  return Object.entries(wordFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}

async function analyzeEmotion(text: string): Promise<any> {
  // Placeholder emotion analysis - in production, use sentiment analysis API
  const positiveWords = ['good', 'great', 'excellent', 'happy', 'pleased', 'satisfied'];
  const negativeWords = ['bad', 'terrible', 'awful', 'unhappy', 'disappointed', 'frustrated'];
  const urgentWords = ['urgent', 'critical', 'emergency', 'asap', 'immediately', 'quickly'];
  
  const lowerText = text.toLowerCase();
  
  let emotion = 'neutral';
  let intensity = 50;
  
  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
  const urgentCount = urgentWords.filter(word => lowerText.includes(word)).length;
  
  if (urgentCount > 0) {
    emotion = 'urgent';
    intensity = 80 + urgentCount * 10;
  } else if (positiveCount > negativeCount) {
    emotion = 'positive';
    intensity = 60 + positiveCount * 10;
  } else if (negativeCount > positiveCount) {
    emotion = 'negative';
    intensity = 60 + negativeCount * 10;
  }
  
  return {
    timestamp: new Date().toISOString(),
    emotion,
    intensity: Math.min(100, intensity),
    confidence: 75
  };
}

async function generateSummary(text: string): Promise<string> {
  // Simple summarization - take first sentence or trim to 100 chars
  const sentences = text.split(/[.!?]+/);
  const firstSentence = sentences[0]?.trim();
  
  if (firstSentence && firstSentence.length <= 100) {
    return firstSentence;
  }
  
  return text.length <= 100 ? text : text.substring(0, 97) + '...';
}

function estimateAudioDuration(audioData: string): number {
  // Rough estimation based on base64 size - in production, decode and analyze
  const sizeInBytes = (audioData.length * 3) / 4; // base64 to bytes
  const estimatedSeconds = sizeInBytes / 16000; // Assuming 16kbps
  return Math.max(1, Math.round(estimatedSeconds));
}

async function getDocumentTitle(documentId?: string): Promise<string | undefined> {
  if (!documentId) return undefined;
  
  try {
    const supabase = await createSupabaseServerClient() as any;
    const { data } = await supabase
      .from('assets')
      .select('name')
      .eq('id', documentId)
      .single();
    
    return data?.name;
  } catch {
    return undefined;
  }
}

async function getContextBefore(documentId?: string, position?: AnnotationPosition): Promise<string | undefined> {
  // In production, extract text before the annotation position
  return undefined;
}

async function getContextAfter(documentId?: string, position?: AnnotationPosition): Promise<string | undefined> {
  // In production, extract text after the annotation position
  return undefined;
}

async function findRelatedAnnotations(keywords: string[], documentId?: string): Promise<string[]> {
  if (!documentId || keywords.length === 0) return [];
  
  try {
    const supabase = await createSupabaseServerClient() as any;
    // Find annotations with similar keywords
    const { data: annotations } = await supabase
      .from('voice_annotations')
      .select('id, content')
      .eq('document_id', documentId)
      .limit(10);
    
    if (!annotations) return [];
    
    const related = annotations.filter((annotation: any) => {
      const annotationKeywords = annotation.content?.keywords || [];
      return keywords.some(keyword => annotationKeywords.includes(keyword));
    });
    
    return related.map((a: any) => a.id).slice(0, 5);
  } catch {
    return [];
  }
}

async function checkWorkflowTriggers(transcript: string, userId: string): Promise<any[]> {
  // Check for workflow trigger phrases in the transcript
  // This would integrate with the workflow automation system
  return [];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'health') {
    return NextResponse.json({
      success: true,
      status: 'healthy',
      services: {
        transcription: !!OPENROUTER_API_KEY,
        database: true, // Would check Supabase connection
        storage: true   // Would check file storage
      }
    });
  }

  return NextResponse.json(
    { success: false, error: 'Invalid GET action' },
    { status: 400 }
  );
}