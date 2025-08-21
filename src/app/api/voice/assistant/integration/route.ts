import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { searchService } from '@/lib/services/search.service';
import { 
  SupabaseClient, 
  User,
  VoiceSession,
  ChatSession,
  EnhancedChatContext,
  VoiceDocumentInsight,
  VoiceEnhancedMeeting,
  VaultWithAssets,
  DocumentSummary,
  Meeting,
  MeetingPreparation
} from '@/types/voice';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface VoiceIntegrationRequest {
  organizationId: string;
  integrationType: 'chat_handoff' | 'document_analysis' | 'meeting_sync' | 'board_pack_insight' | 'full_context_sync';
  sourceSystem: 'voice_assistant' | 'ai_chat' | 'board_pack' | 'meeting_system' | 'document_manager';
  targetSystem: 'voice_assistant' | 'ai_chat' | 'board_pack' | 'meeting_system' | 'document_manager';
  contextData: IntegrationContext;
  options: IntegrationOptions;
}

export interface IntegrationContext {
  sessionId?: string;
  conversationHistory?: ConversationEntry[];
  currentFocus?: string;
  activeDocuments?: DocumentContext[];
  activeMeetings?: MeetingContext[];
  userPreferences?: UserPreferences;
  organizationContext?: OrganizationContext;
}

export interface ConversationEntry {
  id: string;
  timestamp: string;
  source: string;
  type: 'user_input' | 'system_response' | 'insight' | 'recommendation';
  content: string;
  metadata: Record<string, unknown>;
  confidence: number;
}

export interface DocumentContext {
  id: string;
  title: string;
  type: string;
  analysisStatus: 'pending' | 'processing' | 'completed' | 'failed';
  keyInsights: string[];
  relevanceScore: number;
  lastAccessed: string;
  aiSummary?: string;
  voiceNarration?: string;
}

export interface MeetingContext {
  id: string;
  title: string;
  date: string;
  type: string;
  preparationStatus: 'not_started' | 'in_progress' | 'completed';
  agendaItems: AgendaItem[];
  attendeeReadiness: AttendeeReadiness[];
}

export interface AgendaItem {
  id: string;
  title: string;
  type: string;
  duration: number;
  preparationRequired: boolean;
  relatedDocuments: string[];
}

export interface AttendeeReadiness {
  attendeeId: string;
  name: string;
  preparationComplete: boolean;
  documentsReviewed: number;
  questionsSubmitted: number;
}

export interface UserPreferences {
  voiceEnabled: boolean;
  responseStyle: 'concise' | 'detailed' | 'technical';
  proactivityLevel: 'minimal' | 'moderate' | 'aggressive';
  integrationSettings: IntegrationSettings;
}

export interface IntegrationSettings {
  autoSyncEnabled: boolean;
  crossSystemNotifications: boolean;
  contextPreservation: boolean;
  intelligentHandoff: boolean;
  unifiedSearch: boolean;
}

export interface OrganizationContext {
  id: string;
  name: string;
  industry: string;
  complianceRequirements: string[];
  governanceFramework: string;
  riskProfile: string;
}

export interface IntegrationOptions {
  preserveContext: boolean;
  enableBidirectionalSync: boolean;
  includeHistoricalData: boolean;
  generateInsights: boolean;
  optimizeForVoice: boolean;
  realTimeUpdates: boolean;
}

export interface VoiceIntegrationResponse {
  success: boolean;
  integrationId: string;
  syncedData: SyncedData;
  contextBridge: ContextBridge;
  enhancedCapabilities: EnhancedCapability[];
  recommendations: IntegrationRecommendation[];
  error?: string;
}

export interface SyncedData {
  conversationsTransferred: number;
  documentsLinked: number;
  meetingsIntegrated: number;
  insightsShared: number;
  contextElementsMerged: number;
}

export interface ContextBridge {
  bridgeId: string;
  sourceContext: Record<string, unknown>;
  targetContext: Record<string, unknown>;
  mappings: ContextMapping[];
  preservedElements: string[];
  enhancedElements: string[];
}

export interface ContextMapping {
  sourceField: string;
  targetField: string;
  transformationType: 'direct' | 'enhanced' | 'aggregated' | 'ai_processed';
  confidence: number;
}

export interface EnhancedCapability {
  capability: string;
  description: string;
  availableIn: string[];
  requirements: string[];
  benefits: string[];
}

export interface IntegrationRecommendation {
  type: 'optimization' | 'feature_enhancement' | 'workflow_improvement' | 'user_experience';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  implementation: string;
  expectedBenefit: string;
  effort: 'low' | 'medium' | 'high';
}

export interface BoardPackIntegration {
  packId: string;
  packTitle: string;
  totalDocuments: number;
  analysisStatus: 'pending' | 'processing' | 'completed';
  voiceNarrationAvailable: boolean;
  keyInsights: BoardPackInsight[];
  voiceQueries: VoiceQuery[];
  discussionPoints: DiscussionPoint[];
  preparationGuidance: PreparationGuidance;
}

export interface BoardPackInsight {
  category: 'financial' | 'strategic' | 'risk' | 'governance' | 'operational';
  insight: string;
  relevance: number;
  confidence: number;
  supportingDocuments: string[];
  voiceExplanation?: string;
  followUpQuestions: string[];
}

export interface VoiceQuery {
  query: string;
  category: string;
  suggestedResponse: string;
  relatedDocuments: string[];
  confidence: number;
}

export interface DiscussionPoint {
  topic: string;
  context: string;
  suggestedQuestions: string[];
  preparationNotes: string[];
  timeAllocation: number;
}

export interface PreparationGuidance {
  estimatedReviewTime: number;
  priorityOrder: string[];
  readingSequence: ReadingSequence[];
  voiceBriefingAvailable: boolean;
  keyTopicsForDiscussion: string[];
}

export interface ReadingSequence {
  order: number;
  documentId: string;
  purpose: string;
  timeAllocation: number;
  preparationNotes: string[];
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
      return NextResponse.json({ error: 'AI integration service not configured' }, { status: 500 });
    }

    const body: VoiceIntegrationRequest = await request.json();
    
    if (!body.organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Verify user has access to organization
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', body.organizationId)
      .eq('user_id', user.id)
      .single();

    if (!orgAccess) {
      return NextResponse.json({ error: 'Access denied to organization' }, { status: 403 });
    }

    // Process integration based on type
    let integrationResult: VoiceIntegrationResponse;

    switch (body.integrationType) {
      case 'chat_handoff':
        integrationResult = await processChatHandoff(supabase, body, user.id);
        break;
      case 'document_analysis':
        integrationResult = await processDocumentAnalysisIntegration(supabase, body, user.id);
        break;
      case 'meeting_sync':
        integrationResult = await processMeetingSyncIntegration(supabase, body, user.id);
        break;
      case 'board_pack_insight':
        integrationResult = await processBoardPackIntegration(supabase, body, user.id);
        break;
      case 'full_context_sync':
        integrationResult = await processFullContextSync(supabase, body, user.id);
        break;
      default:
        throw new Error('Invalid integration type');
    }

    // Log integration activity
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        organization_id: body.organizationId,
        event_type: 'system_action',
        event_category: 'voice_integration',
        action: body.integrationType,
        resource_type: 'system_integration',
        event_description: `Voice assistant integration: ${body.sourceSystem} -> ${body.targetSystem}`,
        outcome: integrationResult.success ? 'success' : 'failure',
        details: {
          integration_type: body.integrationType,
          source_system: body.sourceSystem,
          target_system: body.targetSystem,
          synced_conversations: integrationResult.syncedData?.conversationsTransferred || 0,
          synced_documents: integrationResult.syncedData?.documentsLinked || 0,
          synced_meetings: integrationResult.syncedData?.meetingsIntegrated || 0,
          enhanced_capabilities: integrationResult.enhancedCapabilities?.length || 0
        },
      });

    return NextResponse.json(integrationResult);

  } catch (error) {
    console.error('Error processing voice integration:', error);
    return NextResponse.json({ 
      success: false,
      integrationId: '',
      syncedData: {
        conversationsTransferred: 0,
        documentsLinked: 0,
        meetingsIntegrated: 0,
        insightsShared: 0,
        contextElementsMerged: 0
      },
      contextBridge: {
        bridgeId: '',
        sourceContext: {},
        targetContext: {},
        mappings: [],
        preservedElements: [],
        enhancedElements: []
      },
      enhancedCapabilities: [],
      recommendations: [],
      error: 'Internal server error during integration processing'
    }, { status: 500 });
  }
}

async function processChatHandoff(
  supabase: SupabaseClient,
  request: VoiceIntegrationRequest,
  userId: string
): Promise<VoiceIntegrationResponse> {
  const integrationId = `chat_handoff_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  // Get existing chat conversations
  const { data: chatSessions } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('organization_id', request.organizationId)
    .order('created_at', { ascending: false })
    .limit(5);

  // Get voice assistant sessions
  const { data: voiceSessions } = await supabase
    .from('voice_assistant_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('organization_id', request.organizationId)
    .order('created_at', { ascending: false })
    .limit(5);

  // Create context bridge
  const contextBridge: ContextBridge = {
    bridgeId: `bridge_${integrationId}`,
    sourceContext: {
      voiceSessions: voiceSessions || [],
      conversationHistory: request.contextData.conversationHistory || []
    },
    targetContext: {
      chatSessions: chatSessions || [],
      enhancedContext: await enhanceContextForChat(request.contextData)
    },
    mappings: [
      {
        sourceField: 'voice_conversation',
        targetField: 'chat_message',
        transformationType: 'ai_processed',
        confidence: 0.9
      },
      {
        sourceField: 'voice_intent',
        targetField: 'chat_context',
        transformationType: 'enhanced',
        confidence: 0.85
      }
    ],
    preservedElements: ['user_preferences', 'organization_context', 'document_references'],
    enhancedElements: ['conversation_continuity', 'context_awareness', 'intelligent_suggestions']
  };

  // Generate enhanced chat context
  const enhancedChatContext = await generateEnhancedChatContext(
    request.contextData,
    voiceSessions || [],
    chatSessions || []
  );

  // Store bridged context
  await storeBridgedContext(supabase, integrationId, contextBridge, userId, request.organizationId);

  return {
    success: true,
    integrationId,
    syncedData: {
      conversationsTransferred: (request.contextData.conversationHistory?.length || 0),
      documentsLinked: (request.contextData.activeDocuments?.length || 0),
      meetingsIntegrated: (request.contextData.activeMeetings?.length || 0),
      insightsShared: calculateInsightsShared(request.contextData),
      contextElementsMerged: contextBridge.preservedElements.length + contextBridge.enhancedElements.length
    },
    contextBridge,
    enhancedCapabilities: [
      {
        capability: 'Seamless Voice-to-Chat Transition',
        description: 'Continue conversations seamlessly between voice and text interfaces',
        availableIn: ['voice_assistant', 'ai_chat'],
        requirements: ['Active sessions in both systems'],
        benefits: ['Improved user experience', 'Context continuity', 'Flexible interaction modes']
      },
      {
        capability: 'Enhanced Context Awareness',
        description: 'AI chat system gains voice conversation context for better responses',
        availableIn: ['ai_chat'],
        requirements: ['Voice session data', 'Integration enabled'],
        benefits: ['More relevant responses', 'Better understanding of user needs', 'Personalized interactions']
      }
    ],
    recommendations: [
      {
        type: 'user_experience',
        title: 'Enable Auto-Handoff',
        description: 'Automatically transition between voice and chat based on user context and device availability',
        priority: 'medium',
        implementation: 'Configure handoff triggers and user preferences',
        expectedBenefit: 'Smoother user experience across different interaction modes',
        effort: 'medium'
      }
    ]
  };
}

async function processDocumentAnalysisIntegration(
  supabase: SupabaseClient,
  request: VoiceIntegrationRequest,
  userId: string
): Promise<VoiceIntegrationResponse> {
  const integrationId = `doc_analysis_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // Get recent document activities
  const { data: documentActivities } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('organization_id', request.organizationId)
    .eq('resource_type', 'asset')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(50);

  // Get document summaries and analysis
  const activeDocuments = request.contextData.activeDocuments || [];
  const enhancedDocumentContext = await enhanceDocumentAnalysis(supabase, activeDocuments, request.organizationId);

  // Generate voice-optimized document insights
  const voiceOptimizedInsights = await generateVoiceDocumentInsights(enhancedDocumentContext);

  const contextBridge: ContextBridge = {
    bridgeId: `doc_bridge_${integrationId}`,
    sourceContext: {
      documentActivities: documentActivities || [],
      activeDocuments
    },
    targetContext: {
      enhancedDocuments: enhancedDocumentContext,
      voiceInsights: voiceOptimizedInsights
    },
    mappings: [
      {
        sourceField: 'document_summary',
        targetField: 'voice_narration',
        transformationType: 'ai_processed',
        confidence: 0.92
      },
      {
        sourceField: 'document_insights',
        targetField: 'voice_explanation',
        transformationType: 'enhanced',
        confidence: 0.88
      }
    ],
    preservedElements: ['document_metadata', 'analysis_results', 'user_annotations'],
    enhancedElements: ['voice_narration', 'audio_summaries', 'spoken_insights', 'question_prompts']
  };

  return {
    success: true,
    integrationId,
    syncedData: {
      conversationsTransferred: 0,
      documentsLinked: activeDocuments.length,
      meetingsIntegrated: 0,
      insightsShared: voiceOptimizedInsights.length,
      contextElementsMerged: contextBridge.preservedElements.length + contextBridge.enhancedElements.length
    },
    contextBridge,
    enhancedCapabilities: [
      {
        capability: 'Voice Document Narration',
        description: 'Automatically generate voice narration for document summaries and insights',
        availableIn: ['voice_assistant', 'document_viewer'],
        requirements: ['Document analysis completed', 'Voice synthesis enabled'],
        benefits: ['Hands-free document review', 'Accessibility improvements', 'Multitasking support']
      },
      {
        capability: 'Intelligent Document Q&A',
        description: 'Voice-enabled question answering about document content',
        availableIn: ['voice_assistant'],
        requirements: ['Document analysis data', 'AI processing enabled'],
        benefits: ['Quick information retrieval', 'Natural interaction', 'Deep document understanding']
      }
    ],
    recommendations: [
      {
        type: 'feature_enhancement',
        title: 'Implement Progressive Document Loading',
        description: 'Load document insights progressively as user requests them via voice',
        priority: 'medium',
        implementation: 'Implement lazy loading with voice triggers',
        expectedBenefit: 'Faster response times and reduced cognitive load',
        effort: 'medium'
      }
    ]
  };
}

async function processMeetingSyncIntegration(
  supabase: SupabaseClient,
  request: VoiceIntegrationRequest,
  userId: string
): Promise<VoiceIntegrationResponse> {
  const integrationId = `meeting_sync_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // Get upcoming meetings
  const { data: upcomingMeetings } = await supabase
    .from('meetings')
    .select(`
      id, title, description, meeting_date, meeting_type, 
      agenda_items, attendees, status
    `)
    .eq('organization_id', request.organizationId)
    .gte('meeting_date', new Date().toISOString())
    .order('meeting_date', { ascending: true })
    .limit(10);

  // Get meeting preparations
  const { data: meetingPreparations } = await supabase
    .from('meeting_preparations')
    .select('*')
    .eq('user_id', userId)
    .eq('organization_id', request.organizationId)
    .order('generated_at', { ascending: false })
    .limit(10);

  // Enhance meetings with voice capabilities
  const voiceEnhancedMeetings = await enhanceMeetingsForVoice(
    upcomingMeetings || [],
    meetingPreparations || [],
    request.contextData
  );

  const contextBridge: ContextBridge = {
    bridgeId: `meeting_bridge_${integrationId}`,
    sourceContext: {
      upcomingMeetings: upcomingMeetings || [],
      preparations: meetingPreparations || []
    },
    targetContext: {
      voiceEnhancedMeetings,
      voiceBriefings: voiceEnhancedMeetings.map(m => m.voiceBriefing).filter(Boolean)
    },
    mappings: [
      {
        sourceField: 'meeting_agenda',
        targetField: 'voice_briefing',
        transformationType: 'ai_processed',
        confidence: 0.9
      },
      {
        sourceField: 'preparation_data',
        targetField: 'voice_guidance',
        transformationType: 'enhanced',
        confidence: 0.87
      }
    ],
    preservedElements: ['meeting_details', 'attendee_info', 'agenda_items'],
    enhancedElements: ['voice_briefings', 'preparation_reminders', 'intelligent_scheduling']
  };

  return {
    success: true,
    integrationId,
    syncedData: {
      conversationsTransferred: 0,
      documentsLinked: 0,
      meetingsIntegrated: voiceEnhancedMeetings.length,
      insightsShared: voiceEnhancedMeetings.filter(m => m.preparationInsights).length,
      contextElementsMerged: contextBridge.preservedElements.length + contextBridge.enhancedElements.length
    },
    contextBridge,
    enhancedCapabilities: [
      {
        capability: 'Voice Meeting Preparation',
        description: 'Get comprehensive meeting briefings through voice interface',
        availableIn: ['voice_assistant'],
        requirements: ['Meeting data', 'Preparation analysis'],
        benefits: ['Hands-free preparation', 'Comprehensive briefings', 'Time-efficient review']
      },
      {
        capability: 'Intelligent Meeting Reminders',
        description: 'Context-aware voice reminders for meeting preparation and attendance',
        availableIn: ['voice_assistant', 'notification_system'],
        requirements: ['Calendar integration', 'User preferences'],
        benefits: ['Never miss important meetings', 'Better preparation', 'Reduced stress']
      }
    ],
    recommendations: [
      {
        type: 'workflow_improvement',
        title: 'Implement Voice-Driven Meeting Follow-up',
        description: 'Enable users to dictate meeting notes and action items via voice',
        priority: 'high',
        implementation: 'Integrate voice recognition with meeting documentation system',
        expectedBenefit: 'Faster meeting documentation and improved follow-through',
        effort: 'medium'
      }
    ]
  };
}

async function processBoardPackIntegration(
  supabase: SupabaseClient,
  request: VoiceIntegrationRequest,
  userId: string
): Promise<VoiceIntegrationResponse> {
  const integrationId = `board_pack_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // Get board packs (assuming they're stored as special vaults or assets)
  const { data: boardPacks } = await supabase
    .from('vaults')
    .select(`
      id, name, description, created_at, updated_at,
      vault_assets(
        asset:assets(id, title, description, file_type, created_at, updated_at)
      )
    `)
    .eq('organization_id', request.organizationId)
    .ilike('name', '%board%')
    .order('updated_at', { ascending: false })
    .limit(5);

  // Get existing document summaries
  const { data: documentSummaries } = await supabase
    .from('document_summaries')
    .select('*')
    .eq('organization_id', request.organizationId)
    .order('created_at', { ascending: false })
    .limit(20);

  // Generate board pack integrations
  const boardPackIntegrations: BoardPackIntegration[] = await Promise.all(
    (boardPacks || []).map(async (pack: VaultWithAssets) => 
      await generateBoardPackIntegration(pack, documentSummaries || [], request.contextData)
    )
  );

  const contextBridge: ContextBridge = {
    bridgeId: `board_pack_bridge_${integrationId}`,
    sourceContext: {
      boardPacks: boardPacks || [],
      documentSummaries: documentSummaries || []
    },
    targetContext: {
      boardPackIntegrations,
      voiceEnabledPacks: boardPackIntegrations.filter(p => p.voiceNarrationAvailable)
    },
    mappings: [
      {
        sourceField: 'document_summary',
        targetField: 'voice_insight',
        transformationType: 'ai_processed',
        confidence: 0.91
      },
      {
        sourceField: 'board_pack_analysis',
        targetField: 'voice_briefing',
        transformationType: 'enhanced',
        confidence: 0.89
      }
    ],
    preservedElements: ['pack_metadata', 'document_analysis', 'governance_context'],
    enhancedElements: ['voice_narration', 'intelligent_insights', 'discussion_guidance', 'preparation_optimization']
  };

  return {
    success: true,
    integrationId,
    syncedData: {
      conversationsTransferred: 0,
      documentsLinked: boardPackIntegrations.reduce((sum, p) => sum + p.totalDocuments, 0),
      meetingsIntegrated: 0,
      insightsShared: boardPackIntegrations.reduce((sum, p) => sum + p.keyInsights.length, 0),
      contextElementsMerged: contextBridge.preservedElements.length + contextBridge.enhancedElements.length
    },
    contextBridge,
    enhancedCapabilities: [
      {
        capability: 'Board Pack Voice Navigation',
        description: 'Navigate and explore board packs using voice commands',
        availableIn: ['voice_assistant', 'board_pack_viewer'],
        requirements: ['Board pack analysis', 'Voice recognition'],
        benefits: ['Hands-free navigation', 'Efficient review', 'Accessibility improvements']
      },
      {
        capability: 'Intelligent Board Pack Insights',
        description: 'AI-generated insights and discussion points for board pack content',
        availableIn: ['voice_assistant', 'board_pack_system'],
        requirements: ['Document analysis', 'Governance context'],
        benefits: ['Better preparation', 'Focused discussions', 'Strategic insights']
      },
      {
        capability: 'Voice-Enabled Board Pack Preparation',
        description: 'Comprehensive preparation guidance delivered via voice',
        availableIn: ['voice_assistant'],
        requirements: ['Board pack data', 'Meeting context'],
        benefits: ['Efficient preparation', 'Comprehensive coverage', 'Time optimization']
      }
    ],
    recommendations: [
      {
        type: 'optimization',
        title: 'Implement Board Pack Voice Summaries',
        description: 'Generate concise voice summaries for each board pack section',
        priority: 'high',
        implementation: 'Use AI to create section-wise voice summaries with key takeaways',
        expectedBenefit: 'Faster board pack review and better understanding',
        effort: 'medium'
      },
      {
        type: 'feature_enhancement',
        title: 'Add Voice-Driven Discussion Points',
        description: 'Automatically generate discussion questions and talking points',
        priority: 'medium',
        implementation: 'Analyze board pack content to suggest relevant discussion topics',
        expectedBenefit: 'More productive board meetings with focused discussions',
        effort: 'medium'
      }
    ]
  };
}

async function processFullContextSync(
  supabase: SupabaseClient,
  request: VoiceIntegrationRequest,
  userId: string
): Promise<VoiceIntegrationResponse> {
  const integrationId = `full_sync_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // Perform all integration types
  const [chatResult, docResult, meetingResult, boardPackResult] = await Promise.all([
    processChatHandoff(supabase, request, userId),
    processDocumentAnalysisIntegration(supabase, request, userId),
    processMeetingSyncIntegration(supabase, request, userId),
    processBoardPackIntegration(supabase, request, userId)
  ]);

  // Merge all results
  const combinedSyncedData = {
    conversationsTransferred: chatResult.syncedData.conversationsTransferred,
    documentsLinked: docResult.syncedData.documentsLinked + boardPackResult.syncedData.documentsLinked,
    meetingsIntegrated: meetingResult.syncedData.meetingsIntegrated,
    insightsShared: docResult.syncedData.insightsShared + boardPackResult.syncedData.insightsShared,
    contextElementsMerged: [chatResult, docResult, meetingResult, boardPackResult]
      .reduce((sum, result) => sum + result.syncedData.contextElementsMerged, 0)
  };

  const allEnhancedCapabilities = [
    ...chatResult.enhancedCapabilities,
    ...docResult.enhancedCapabilities,
    ...meetingResult.enhancedCapabilities,
    ...boardPackResult.enhancedCapabilities
  ];

  const allRecommendations = [
    ...chatResult.recommendations,
    ...docResult.recommendations,
    ...meetingResult.recommendations,
    ...boardPackResult.recommendations
  ];

  return {
    success: true,
    integrationId,
    syncedData: combinedSyncedData,
    contextBridge: {
      bridgeId: `full_bridge_${integrationId}`,
      sourceContext: {
        chat: chatResult.contextBridge.sourceContext,
        documents: docResult.contextBridge.sourceContext,
        meetings: meetingResult.contextBridge.sourceContext,
        boardPacks: boardPackResult.contextBridge.sourceContext
      },
      targetContext: {
        chat: chatResult.contextBridge.targetContext,
        documents: docResult.contextBridge.targetContext,
        meetings: meetingResult.contextBridge.targetContext,
        boardPacks: boardPackResult.contextBridge.targetContext
      },
      mappings: [
        ...chatResult.contextBridge.mappings,
        ...docResult.contextBridge.mappings,
        ...meetingResult.contextBridge.mappings,
        ...boardPackResult.contextBridge.mappings
      ],
      preservedElements: ['comprehensive_context', 'cross_system_continuity', 'unified_intelligence'],
      enhancedElements: ['full_voice_integration', 'intelligent_orchestration', 'seamless_experience']
    },
    enhancedCapabilities: allEnhancedCapabilities,
    recommendations: [
      ...allRecommendations,
      {
        type: 'optimization',
        title: 'Implement Unified Voice Command System',
        description: 'Create a single voice interface that can interact with all integrated systems',
        priority: 'high',
        implementation: 'Develop unified voice command router with intelligent system selection',
        expectedBenefit: 'Seamless user experience across all BoardGuru systems',
        effort: 'high'
      }
    ]
  };
}

// Helper functions
async function enhanceContextForChat(contextData: IntegrationContext): Promise<EnhancedChatContext> {
  // Enhance conversation context for chat system
  return {
    enhancedHistory: (contextData.conversationHistory?.map(entry => ({
      ...entry,
      chatOptimized: true,
      intelligentSuggestions: generateChatSuggestions(entry.content),
      confidence: (entry as any).confidence ?? 0.8
    })) || []) as ConversationEntry[],
    documentContext: contextData.activeDocuments?.map(doc => ({
      ...doc,
      chatRelevant: true,
      quickSummary: doc.aiSummary || 'No summary available'
    })) || [],
    combinedHistory: [],
    contextContinuity: true,
    intelligentTransitions: true
  };
}

function generateChatSuggestions(content: string): string[] {
  // Simple suggestion generation - would be enhanced with AI
  const suggestions = [];
  if (content.toLowerCase().includes('document')) {
    suggestions.push('Show me related documents');
  }
  if (content.toLowerCase().includes('meeting')) {
    suggestions.push('Schedule a follow-up meeting');
  }
  return suggestions.slice(0, 3);
}

async function generateEnhancedChatContext(
  contextData: IntegrationContext,
  voiceSessions: VoiceSession[],
  chatSessions: ChatSession[]
): Promise<EnhancedChatContext> {
  // Generate enhanced context by combining voice and chat history
  return {
    combinedHistory: [
      ...voiceSessions.map((s: any) => ({ ...s, source: 'voice' })),
      ...chatSessions.map((s: any) => ({ ...s, source: 'chat' }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    contextContinuity: true,
    intelligentTransitions: true
  };
}

function calculateInsightsShared(contextData: IntegrationContext): number {
  return (contextData.activeDocuments?.length || 0) + 
         (contextData.activeMeetings?.length || 0) + 
         (contextData.conversationHistory?.length || 0);
}

async function enhanceDocumentAnalysis(
  supabase: SupabaseClient,
  documents: DocumentContext[],
  organizationId: string
): Promise<DocumentContext[]> {
  // Enhance documents with additional analysis
  return Promise.all(documents.map(async (doc) => {
    // Get additional document metadata
    const { data: assetData } = await supabase
      .from('assets')
      .select('*')
      .eq('id', doc.id)
      .single();

    return {
      ...doc,
      enhancedAnalysis: true,
      metadata: assetData,
      voiceReady: true
    };
  }));
}

async function generateVoiceDocumentInsights(documents: DocumentContext[]): Promise<VoiceDocumentInsight[]> {
  return documents.map(doc => ({
    documentId: doc.id,
    voiceInsight: `This document contains key information about ${doc.title}`,
    spokenSummary: doc.aiSummary || 'Summary not available',
    keyPoints: doc.keyInsights,
    voiceQuestions: [
      `What are the main points in ${doc.title}?`,
      `Can you explain the key findings?`,
      `What should I focus on when reviewing this?`
    ]
  }));
}

async function enhanceMeetingsForVoice(
  meetings: Meeting[],
  preparations: MeetingPreparation[],
  contextData: IntegrationContext
): Promise<VoiceEnhancedMeeting[]> {
  return meetings.map(meeting => {
    const preparation = preparations.find(p => p.meetingId === meeting.id);
    
    return {
      ...meeting,
      voiceEnhanced: true,
      voiceBriefing: preparation ? {
        executiveSummary: `Meeting preparation for ${meeting.title}`,
        audioScript: `Briefing for ${meeting.title} meeting`,
        keyTalkingPoints: ['Review agenda', 'Check attendee list', 'Prepare discussion points'],
        anticipatedQuestions: ['What are the key agenda items?', 'Who are the main decision makers?'],
        criticalReminders: ['Complete preparation 24 hours before', 'Review all documents'],
        estimatedBriefingTime: 3
      } : null,
      preparationInsights: preparation ? preparation : null,
      voiceCommands: [
        `Brief me on ${meeting.title}`,
        `What do I need to prepare for this meeting?`,
        `Who's attending this meeting?`
      ]
    };
  });
}

async function generateBoardPackIntegration(
  pack: VaultWithAssets,
  documentSummaries: DocumentSummary[],
  contextData: IntegrationContext
): Promise<BoardPackIntegration> {
  const packDocuments = pack.vault_assets || [];
  const totalDocuments = packDocuments.length;

  return {
    packId: pack.id,
    packTitle: pack.name,
    totalDocuments,
    analysisStatus: totalDocuments > 0 ? 'completed' : 'pending',
    voiceNarrationAvailable: true,
    keyInsights: [
      {
        category: 'strategic',
        insight: `Board pack contains ${totalDocuments} documents requiring review`,
        relevance: 0.9,
        confidence: 0.85,
        supportingDocuments: packDocuments.map((d: any) => d.asset.id),
        followUpQuestions: [
          'What are the key strategic decisions?',
          'Are there any risk factors to consider?',
          'What preparation is needed?'
        ]
      }
    ],
    voiceQueries: [
      {
        query: `Summarize the ${pack.name} board pack`,
        category: 'summary',
        suggestedResponse: `The ${pack.name} contains ${totalDocuments} documents covering key governance topics`,
        relatedDocuments: packDocuments.map((d: any) => d.asset.id),
        confidence: 0.8
      }
    ],
    discussionPoints: [
      {
        topic: 'Key Decisions',
        context: 'Strategic decisions requiring board approval',
        suggestedQuestions: ['What are the implications?', 'What are the alternatives?'],
        preparationNotes: ['Review supporting analysis', 'Consider stakeholder impact'],
        timeAllocation: 30
      }
    ],
    preparationGuidance: {
      estimatedReviewTime: totalDocuments * 10, // 10 minutes per document
      priorityOrder: packDocuments.map((d: any) => d.asset.id),
      readingSequence: packDocuments.map((d: any, index: number) => ({
        order: index + 1,
        documentId: d.asset.id,
        purpose: 'Review and understand content',
        timeAllocation: 10,
        preparationNotes: ['Focus on key decisions', 'Note questions for discussion']
      })),
      voiceBriefingAvailable: true,
      keyTopicsForDiscussion: ['Strategic direction', 'Risk management', 'Financial performance']
    }
  };
}

async function storeBridgedContext(
  supabase: SupabaseClient,
  integrationId: string,
  contextBridge: ContextBridge,
  userId: string,
  organizationId: string
): Promise<void> {
  try {
    await supabase
      .from('voice_integrations')
      .insert({
        id: integrationId,
        user_id: userId,
        organization_id: organizationId,
        bridge_id: contextBridge.bridgeId,
        bridge_data: JSON.stringify(contextBridge),
        created_at: new Date().toISOString(),
        is_active: true
      });
  } catch (error) {
    console.error('Failed to store bridged context:', error);
  }
}

// GET endpoint for retrieving integration data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const integrationId = url.searchParams.get('integrationId');
    const organizationId = url.searchParams.get('organizationId');
    const integrationType = url.searchParams.get('integrationType');

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    if (integrationId) {
      // Get specific integration
      const { data: integration, error } = await supabase
        .from('voice_integrations')
        .select('*')
        .eq('id', integrationId)
        .eq('user_id', user.id)
        .single();

      if (error || !integration) {
        return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        integration: {
          ...integration,
          bridgeData: JSON.parse(integration.bridge_data)
        }
      });
    } else {
      // Get user's integrations for organization
      let query = supabase
        .from('voice_integrations')
        .select('id, bridge_id, created_at, is_active')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (integrationType) {
        // Note: would need to add integration_type column to properly filter
      }

      const { data: integrations, error } = await query;

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        integrations: integrations || []
      });
    }

  } catch (error) {
    console.error('Error fetching voice integration:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch integration data' 
    }, { status: 500 });
  }
}