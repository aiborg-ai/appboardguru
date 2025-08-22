import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { searchService } from '@/lib/services/search.service';
import {
  VoiceAssistantSession,
  VoiceAssistantRequest,
  VoiceAssistantResponse,
  ConversationEntry,
  VoiceIntent,
  ExtractedEntity,
  ProactiveInsight,
  BoardRecommendation,
  BoardAnalytics,
  SupabaseClient,
  User,
  EmotionAnalysis,
  VoiceAssistantContext,
  VoicePreferences,
  SearchResult,
  ContextualInfo
} from '@/types/voice';

const OPENROUTER_API_KEY = process.env['OPENROUTER_API_KEY'];
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'AI assistant not configured' }, { status: 500 });
    }

    const body: VoiceAssistantRequest = await request.json();
    
    if (!body.context?.organizationId) {
      return NextResponse.json({ error: 'Organization context is required' }, { status: 400 });
    }

    // Get or create session
    const session = await getOrCreateSession(supabase, user.id, body.context.organizationId, body.sessionId);
    
    // Process input (voice or text)
    let userInput = '';
    let emotion = null;
    let transcriptionConfidence = 1.0;

    if (body.audioData) {
      // Transcribe voice input
      const transcriptionResult = await transcribeVoiceInput(body.audioData);
      if (!transcriptionResult.success) {
        throw new Error('Voice transcription failed');
      }
      userInput = transcriptionResult.text;
      transcriptionConfidence = transcriptionResult.confidence;

      // Analyze emotion if enabled
      if (body.preferences?.proactiveLevel !== 'minimal') {
        emotion = await analyzeEmotion(body.audioData, user.id);
      }
    } else if (body.textInput) {
      userInput = body.textInput;
    }

    // Handle different request types
    let response: VoiceAssistantResponse;

    switch (body.requestType) {
      case 'session_init':
        response = await initializeSession(supabase, session, body.context);
        break;
      case 'voice_query':
      case 'text_query':
        response = await processQuery(supabase, session, userInput, body.context, emotion, body.preferences);
        break;
      case 'proactive_insight':
        response = await generateProactiveInsights(supabase, session, body.context);
        break;
      case 'context_resume':
        response = await resumeInterruptedContext(supabase, session);
        break;
      default:
        throw new Error('Invalid request type');
    }

    // Update session with new conversation entry
    if (userInput) {
      const historyEntry: Partial<ConversationEntry> = {
        type: body.audioData ? 'user_voice' : 'user_text',
        content: userInput,
        confidence: transcriptionConfidence,
        ...(emotion?.dominantEmotion && { emotion: emotion.dominantEmotion }),
        ...(emotion?.stressLevel !== undefined && { stressLevel: emotion.stressLevel }),
        ...(emotion?.urgencyLevel !== undefined && { urgencyLevel: emotion.urgencyLevel }),
      };
      
      if (response.response.intent) {
        historyEntry.intent = response.response.intent;
      }
      
      await updateSessionHistory(supabase, session.id, historyEntry);

      await updateSessionHistory(supabase, session.id, {
        type: response.response.audioUrl ? 'assistant_voice' : 'assistant_text',
        content: response.response.text,
        ...(response.response.audioUrl && { audioUrl: response.response.audioUrl }),
        confidence: response.response.confidence
      });
    }

    // Log assistant interaction
    await (supabase as any)
      .from('audit_logs')
      .insert({
        user_id: user.id,
        organization_id: body.context.organizationId,
        event_type: 'user_action',
        event_category: 'voice_assistant',
        action: body.requestType,
        resource_type: 'voice_assistant_session',
        resource_id: session.id,
        event_description: `Voice assistant ${body.requestType}`,
        outcome: response.success ? 'success' : 'failure',
        details: {
          session_id: session.id,
          input_type: body.audioData ? 'voice' : 'text',
          emotion: emotion,
          response_type: response.response.audioUrl ? 'voice' : 'text',
          confidence: response.response.confidence,
          proactive_insights_count: response.proactiveInsights?.length || 0
        },
      });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in voice assistant:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error during assistant processing',
      sessionId: ''
    }, { status: 500 });
  }
}

async function getOrCreateSession(
  supabase: SupabaseClient, 
  userId: string, 
  organizationId: string, 
  sessionId?: string
): Promise<VoiceAssistantSession> {
  if (sessionId) {
    // Try to fetch existing session
    const { data: existingSession } = await (supabase as any)
      .from('voice_assistant_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (existingSession) {
      return JSON.parse(existingSession.session_data);
    }
  }

  // Create new session
  const newSession: VoiceAssistantSession = {
    id: `vas_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
    userId,
    organizationId,
    conversationHistory: [],
    contextState: {
      currentFocus: 'general',
      recentDocuments: [],
      upcomingMeetings: [],
      pendingTasks: [],
      riskAlerts: [],
      complianceDeadlines: []
    },
    proactiveInsights: [],
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    isActive: true
  };

  // Store in database
  await (supabase as any)
    .from('voice_assistant_sessions')
    .insert({
      id: newSession.id,
      user_id: userId,
      organization_id: organizationId,
      session_data: JSON.stringify(newSession),
      is_active: true,
      created_at: newSession.createdAt,
      last_activity: newSession.lastActivity
    });

  return newSession;
}

async function transcribeVoiceInput(audioData: string): Promise<{ success: boolean; text: string; confidence: number }> {
  try {
    const transcribeResponse = await fetch('/api/voice/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio: audioData,
        format: 'webm'
      })
    });

    const result = await transcribeResponse.json();
    
    if (result.success) {
      return {
        success: true,
        text: result.text,
        confidence: result.confidence || 0.9
      };
    } else {
      throw new Error('Transcription failed');
    }
  } catch (error) {
    console.error('Voice transcription error:', error);
    return { success: false, text: '', confidence: 0 };
  }
}

async function analyzeEmotion(audioData: string, userId: string): Promise<EmotionAnalysis | null> {
  try {
    const emotionResponse = await fetch('/api/voice/biometric', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'emotion_analysis',
        audioData,
        analysisType: 'comprehensive',
        context: 'assistant_interaction'
      })
    });

    const result = await emotionResponse.json();
    return result.success ? result.emotionAnalysis : null;
  } catch (error) {
    console.error('Emotion analysis error:', error);
    return null;
  }
}

async function initializeSession(
  supabase: SupabaseClient,
  session: VoiceAssistantSession,
  context: VoiceAssistantContext
): Promise<VoiceAssistantResponse> {
  // Get initial context from user's current state
  const initialContext = await buildInitialContext(supabase, session.userId, session.organizationId, context);
  
  // Generate initial proactive insights
  const insights = await generateInitialInsights(supabase, session.userId, session.organizationId);

  const welcomeMessage = `Welcome to your BoardGuru AI Assistant. I'm here to help with board governance, document analysis, and meeting preparation. I can see you're ${initialContext.currentActivity}. How can I assist you today?`;

  return {
    success: true,
    sessionId: session.id,
    response: {
      text: welcomeMessage,
      confidence: 1.0
    },
    proactiveInsights: insights,
    contextUpdates: initialContext as any
  };
}

async function processQuery(
  supabase: SupabaseClient,
  session: VoiceAssistantSession,
  userInput: string,
  context: VoiceAssistantContext,
  emotion: EmotionAnalysis | null,
  preferences: VoicePreferences | undefined
): Promise<VoiceAssistantResponse> {
  // Extract intent and entities
  const intent = await extractIntent(userInput, context);
  const entities = await extractEntities(userInput);

  // Search for relevant documents and context
  const searchResults = await searchRelevantContent(supabase, userInput, context.organizationId, intent);

  // Generate board-specific intelligence
  const boardAnalytics = await generateBoardAnalytics(supabase, intent, context.organizationId);

  // Build enhanced context for AI
  const enhancedContext = await buildEnhancedContext(
    supabase, 
    session, 
    userInput, 
    intent, 
    entities, 
    searchResults,
    emotion,
    context
  );

  // Generate AI response
  const aiResponse = await generateIntelligentResponse(enhancedContext, preferences);

  // Check for proactive opportunities
  const proactiveInsights = await generateContextualInsights(supabase, session, intent, entities, context);

  // Generate recommendations
  const recommendations = await generateBoardRecommendations(intent, entities, searchResults, boardAnalytics);

  return {
    success: true,
    sessionId: session.id,
    response: {
      text: aiResponse.message,
      confidence: aiResponse.confidence,
      intent,
      emotion: emotion?.dominantEmotion
    },
    proactiveInsights,
    recommendations,
    ...(boardAnalytics && { analytics: boardAnalytics }),
    followUpSuggestions: aiResponse.suggestions || []
  };
}

async function extractIntent(userInput: string, context: VoiceAssistantContext): Promise<VoiceIntent> {
  // Use AI to extract intent from user input
  const systemPrompt = `You are a board governance intent classifier. Analyze the user input and extract the intent, domain, action, and parameters.

Available domains:
- board_governance: Board meetings, governance, oversight, strategic decisions
- document_management: Document review, analysis, upload, organization  
- meeting_management: Meeting scheduling, agenda, minutes, attendees
- compliance: Regulatory compliance, deadlines, requirements, reporting
- analytics: Financial analysis, performance metrics, trends, forecasting
- general: General queries, help, navigation

Respond with JSON containing: intent, confidence, domain, action, parameters`;

  const userPrompt = `Context: ${JSON.stringify(context)}
User Input: "${userInput}"

Extract the intent and classify appropriately.`;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'BoardGuru Intent Extraction'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    });

    if (response.ok) {
      const result = await response.json();
      const jsonMatch = result.choices[0].message.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
  } catch (error) {
    console.error('Intent extraction error:', error);
  }

  // Fallback intent
  return {
    intent: 'general_query',
    confidence: 0.5,
    domain: 'general',
    action: 'answer_question',
    parameters: {}
  };
}

async function extractEntities(userInput: string): Promise<ExtractedEntity[]> {
  // Simple entity extraction - could be enhanced with NER
  const entities: ExtractedEntity[] = [];
  
  // Date patterns
  const dateRegex = /\b(today|tomorrow|yesterday|next week|last week|\d{1,2}\/\d{1,2}\/\d{4})\b/gi;
  const dates = userInput.match(dateRegex);
  if (dates) {
    dates.forEach(date => {
      entities.push({
        type: 'date',
        value: date,
        confidence: 0.8,
        context: 'temporal_reference'
      });
    });
  }

  // Meeting-related terms
  const meetingRegex = /\b(board meeting|AGM|annual general meeting|committee meeting|quarterly meeting)\b/gi;
  const meetings = userInput.match(meetingRegex);
  if (meetings) {
    meetings.forEach(meeting => {
      entities.push({
        type: 'meeting',
        value: meeting,
        confidence: 0.9,
        context: 'meeting_reference'
      });
    });
  }

  // Document types
  const docRegex = /\b(financial report|annual report|minutes|agenda|presentation|policy|procedure)\b/gi;
  const docs = userInput.match(docRegex);
  if (docs) {
    docs.forEach(doc => {
      entities.push({
        type: 'document',
        value: doc,
        confidence: 0.8,
        context: 'document_reference'
      });
    });
  }

  return entities;
}

async function searchRelevantContent(
  supabase: SupabaseClient,
  query: string,
  organizationId: string,
  intent: VoiceIntent
): Promise<SearchResult[]> {
  try {
    const searchRequest = {
      query,
      context_scope: 'organization' as const,
      context_id: organizationId,
      limit: 10,
      search_type: 'hybrid' as const
    };

    const searchResponse = await searchService.search(searchRequest);
    return (searchResponse.results || []) as any;
  } catch (error) {
    console.error('Content search error:', error);
    return [];
  }
}

async function generateBoardAnalytics(
  supabase: SupabaseClient,
  intent: VoiceIntent,
  organizationId: string
): Promise<BoardAnalytics | undefined> {
  if (intent.domain !== 'analytics') return undefined;

  // This would integrate with actual analytics data
  return {
    type: 'governance_health',
    summary: 'Board governance metrics show strong compliance with minor areas for improvement.',
    keyMetrics: {
      'Compliance Score': 87,
      'Meeting Attendance': 92,
      'Document Review Rate': 78,
      'Risk Assessment': 85
    },
    trends: [
      {
        metric: 'Compliance Score',
        current: 87,
        previous: 82,
        change: 5,
        direction: 'up',
        significance: 'moderate'
      }
    ],
    alerts: [
      {
        type: 'warning',
        message: 'Document review rate below target threshold',
        threshold: 85,
        current: 78,
        recommendedAction: 'Schedule additional review sessions'
      }
    ]
  };
}

async function buildEnhancedContext(
  supabase: SupabaseClient,
  session: VoiceAssistantSession,
  userInput: string,
  intent: VoiceIntent,
  entities: ExtractedEntity[],
  searchResults: SearchResult[],
  emotion: EmotionAnalysis | null,
  context: VoiceAssistantContext
): Promise<string> {
  const contextParts = [
    `User Query: "${userInput}"`,
    `Intent: ${intent.intent} (${intent.domain})`,
    `Entities: ${entities.map(e => `${e.type}:${e.value}`).join(', ')}`,
    `Current Context: ${context.currentPage || 'dashboard'}`,
    `Organization: ${context.organizationId}`
  ];

  if (emotion) {
    contextParts.push(`User Emotion: ${emotion.dominantEmotion} (stress: ${emotion.stressLevel}%, urgency: ${emotion.urgencyLevel}%)`);
  }

  if (searchResults.length > 0) {
    contextParts.push(`Relevant Documents: ${searchResults.slice(0, 3).map(r => r.asset.title).join(', ')}`);
  }

  if (session.conversationHistory.length > 0) {
    const recentHistory = session.conversationHistory.slice(-3);
    contextParts.push(`Recent Conversation: ${recentHistory.map(h => `${h.type}: ${h.content.substring(0, 100)}`).join(' | ')}`);
  }

  return contextParts.join('\n');
}

async function generateIntelligentResponse(
  enhancedContext: string,
  preferences: VoicePreferences | undefined
): Promise<{ message: string; confidence: number; suggestions?: string[] }> {
  const systemPrompt = `You are BoardGuru AI Assistant, a specialized AI for corporate governance and board management. You provide intelligent, context-aware assistance for board members, executives, and governance professionals.

Your expertise includes:
- Board governance and compliance
- Financial analysis and reporting
- Risk assessment and management
- Meeting preparation and management
- Strategic planning and decision support
- Document analysis and insights
- Regulatory compliance

Communication style: ${preferences?.voicePersonality || 'professional'} and ${preferences?.verbosityLevel || 'balanced'}
Response mode: ${preferences?.responseMode || 'text_only'}

Provide specific, actionable insights. Reference relevant documents when appropriate. Be proactive in suggesting next steps.`;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'BoardGuru AI Assistant'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: enhancedContext }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (response.ok) {
      const result = await response.json();
      const message = result.choices[0].message.content;
      
      return {
        message,
        confidence: 0.9,
        suggestions: generateFollowUpSuggestions(message)
      };
    }
  } catch (error) {
    console.error('AI response generation error:', error);
  }

  return {
    message: "I'm here to help with board governance and management. Could you please provide more details about what you'd like assistance with?",
    confidence: 0.7
  };
}

function generateFollowUpSuggestions(response: string): string[] {
  const suggestions = [];
  
  if (response.toLowerCase().includes('document')) {
    suggestions.push('Show me related documents');
  }
  if (response.toLowerCase().includes('meeting')) {
    suggestions.push('Schedule a follow-up meeting');
  }
  if (response.toLowerCase().includes('risk')) {
    suggestions.push('Review risk assessment details');
  }
  if (response.toLowerCase().includes('compliance')) {
    suggestions.push('Check compliance status');
  }
  
  return suggestions.slice(0, 3);
}

// Additional helper functions would continue here...
async function generateContextualInsights(
  supabase: SupabaseClient,
  session: VoiceAssistantSession,
  intent: VoiceIntent,
  entities: ExtractedEntity[],
  context: VoiceAssistantContext
): Promise<ProactiveInsight[]> {
  // Implementation for generating contextual insights
  return [];
}

async function generateBoardRecommendations(
  intent: VoiceIntent,
  entities: ExtractedEntity[],
  searchResults: SearchResult[],
  analytics?: BoardAnalytics
): Promise<BoardRecommendation[]> {
  // Implementation for generating board recommendations
  return [];
}

async function generateProactiveInsights(
  supabase: SupabaseClient,
  session: VoiceAssistantSession,
  context: VoiceAssistantContext
): Promise<VoiceAssistantResponse> {
  // Implementation for proactive insights
  return {
    success: true,
    sessionId: session.id,
    response: {
      text: 'Here are some proactive insights based on your current context.',
      confidence: 0.8
    }
  };
}

async function resumeInterruptedContext(
  supabase: SupabaseClient,
  session: VoiceAssistantSession
): Promise<VoiceAssistantResponse> {
  // Implementation for resuming interrupted context
  return {
    success: true,
    sessionId: session.id,
    response: {
      text: 'Resuming our previous conversation...',
      confidence: 0.9
    }
  };
}

async function buildInitialContext(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string,
  context: VoiceAssistantContext
): Promise<ContextualInfo> {
  // Implementation for building initial context
  return {
    currentActivity: 'reviewing your dashboard'
  };
}

async function generateInitialInsights(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<ProactiveInsight[]> {
  // Implementation for generating initial insights
  return [];
}

async function updateSessionHistory(
  supabase: SupabaseClient,
  sessionId: string,
  entry: Partial<ConversationEntry>
): Promise<void> {
  // Implementation for updating session history
  try {
    const fullEntry: ConversationEntry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      confidence: 0.9,
      ...entry
    } as ConversationEntry;

    // Update session in database with new conversation entry
    const { data: session } = await (supabase as any)
      .from('voice_assistant_sessions')
      .select('session_data')
      .eq('id', sessionId)
      .single();

    if (session) {
      const sessionData = JSON.parse(session.session_data);
      sessionData.conversationHistory.unshift(fullEntry);
      
      // Keep only last 50 entries
      sessionData.conversationHistory = sessionData.conversationHistory.slice(0, 50);
      sessionData.lastActivity = new Date().toISOString();

      await (supabase as any)
        .from('voice_assistant_sessions')
        .update({
          session_data: JSON.stringify(sessionData),
          last_activity: sessionData.lastActivity
        })
        .eq('id', sessionId);
    }
  } catch (error) {
    console.error('Failed to update session history:', error);
  }
}

// GET endpoint for retrieving session data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const organizationId = url.searchParams.get('organizationId');

    if (sessionId) {
      // Get specific session
      const { data: session, error } = await (supabase as any)
        .from('voice_assistant_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (error || !session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        session: JSON.parse(session.session_data)
      });
    } else if (organizationId) {
      // Get user's sessions for organization
      const { data: sessions, error } = await (supabase as any)
        .from('voice_assistant_sessions')
        .select('id, created_at, last_activity, is_active')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .order('last_activity', { ascending: false })
        .limit(10);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        sessions: sessions || []
      });
    } else {
      return NextResponse.json({ error: 'sessionId or organizationId required' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error fetching voice assistant session:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch session data' 
    }, { status: 500 });
  }
}

// DELETE endpoint for ending sessions
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Deactivate session
    const { error } = await (supabase as any)
      .from('voice_assistant_sessions')
      .update({ is_active: false })
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error ending voice assistant session:', error);
    return NextResponse.json({ 
      error: 'Failed to end session' 
    }, { status: 500 });
  }
}