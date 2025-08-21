'use client';

/**
 * Voice Assistant Component for BoardGuru
 * Intelligent board governance assistant with proactive insights and voice interaction
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Mic, 
  MicOff, 
  Bot, 
  Volume2, 
  VolumeX,
  Settings,
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Clock,
  FileText,
  Calendar,
  Shield,
  BarChart3,
  Zap,
  MessageSquare,
  Play,
  Pause,
  RotateCcw,
  Minimize2,
  Maximize2,
  X,
  Target
} from 'lucide-react';

interface VoiceAssistantProps {
  userId: string;
  organizationId: string;
  currentPage?: string;
  vaultId?: string;
  documentId?: string;
  meetingId?: string;
  onInsightGenerated?: (insight: ProactiveInsight) => void;
  onRecommendationMade?: (recommendation: BoardRecommendation) => void;
  className?: string;
  position?: 'floating' | 'embedded' | 'sidebar';
  minimized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

interface AssistantState {
  isInitialized: boolean;
  isListening: boolean;
  isProcessing: boolean;
  isConnected: boolean;
  sessionId: string | null;
  conversationHistory: ConversationEntry[];
  proactiveInsights: ProactiveInsight[];
  currentRecommendations: BoardRecommendation[];
  contextState: ContextState;
  interruptionContext: InterruptionContext | null;
}

interface ConversationEntry {
  id: string;
  timestamp: string;
  type: 'user_voice' | 'user_text' | 'assistant_voice' | 'assistant_text' | 'system_insight';
  content: string;
  audioUrl?: string;
  emotion?: string;
  stressLevel?: number;
  urgencyLevel?: number;
  confidence: number;
  intent?: VoiceIntent;
  followUpRequired?: boolean;
  escalationTriggered?: boolean;
}

interface ProactiveInsight {
  id: string;
  type: 'revenue_trend' | 'risk_assessment' | 'compliance_deadline' | 'meeting_prep' | 'document_relationship' | 'performance_metric';
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  recommendations: string[];
  relatedDocuments: string[];
  scheduledFor?: string;
  triggered: boolean;
  acknowledged: boolean;
  createdAt: string;
  expiresAt?: string;
}

interface BoardRecommendation {
  type: 'meeting_preparation' | 'document_review' | 'compliance_action' | 'risk_mitigation' | 'strategic_planning';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timeline: string;
  requiredActions: string[];
  relatedItems: string[];
  estimatedTime: number;
}

interface ContextState {
  currentFocus: 'dashboard' | 'documents' | 'meetings' | 'compliance' | 'analysis' | 'general';
  activeDocument?: string;
  activeMeeting?: string;
  activeVault?: string;
  currentPage?: string;
  recentDocuments: string[];
  upcomingMeetings: string[];
  pendingTasks: string[];
  riskAlerts: string[];
  complianceDeadlines: string[];
}

interface InterruptionContext {
  pausedAt: string;
  contextSummary: string;
  urgencyLevel: number;
  resumptionCue: string;
  preservedState: any;
}

interface VoiceIntent {
  intent: string;
  confidence: number;
  domain: 'board_governance' | 'document_management' | 'meeting_management' | 'compliance' | 'analytics' | 'general';
  action: string;
  parameters: Record<string, any>;
}

interface AssistantPreferences {
  responseMode: 'voice_only' | 'text_only' | 'voice_with_text';
  verbosityLevel: 'concise' | 'balanced' | 'detailed';
  proactiveLevel: 'minimal' | 'moderate' | 'aggressive';
  voicePersonality: 'professional' | 'friendly' | 'supportive';
  autoInterruption: boolean;
  contextPreservation: boolean;
}

const DEFAULT_PREFERENCES: AssistantPreferences = {
  responseMode: 'voice_with_text',
  verbosityLevel: 'balanced',
  proactiveLevel: 'moderate',
  voicePersonality: 'professional',
  autoInterruption: true,
  contextPreservation: true
};

export default function VoiceAssistant({
  userId,
  organizationId,
  currentPage,
  vaultId,
  documentId,
  meetingId,
  onInsightGenerated,
  onRecommendationMade,
  className = '',
  position = 'floating',
  minimized = false,
  onMinimize,
  onMaximize,
  onClose
}: VoiceAssistantProps) {
  const [assistantState, setAssistantState] = useState<AssistantState>({
    isInitialized: false,
    isListening: false,
    isProcessing: false,
    isConnected: false,
    sessionId: null,
    conversationHistory: [],
    proactiveInsights: [],
    currentRecommendations: [],
    contextState: {
      currentFocus: 'general',
      recentDocuments: [],
      upcomingMeetings: [],
      pendingTasks: [],
      riskAlerts: [],
      complianceDeadlines: []
    },
    interruptionContext: null
  });

  const [preferences, setPreferences] = useState<AssistantPreferences>(DEFAULT_PREFERENCES);
  const [activeTab, setActiveTab] = useState<'chat' | 'insights' | 'recommendations' | 'analytics' | 'settings'>('chat');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const proactiveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize assistant
  useEffect(() => {
    initializeAssistant();
    return () => {
      cleanup();
    };
  }, [userId, organizationId]);

  // Context change detection
  useEffect(() => {
    if (assistantState.isInitialized && assistantState.sessionId) {
      updateContext();
    }
  }, [currentPage, vaultId, documentId, meetingId]);

  // Proactive insights timer
  useEffect(() => {
    if (assistantState.isInitialized && preferences.proactiveLevel !== 'minimal') {
      startProactiveInsightsTimer();
    }
    return () => {
      if (proactiveTimerRef.current) {
        clearInterval(proactiveTimerRef.current);
      }
    };
  }, [assistantState.isInitialized, preferences.proactiveLevel]);

  const initializeAssistant = async () => {
    try {
      // Initialize audio permissions
      await initializeAudio();
      
      // Initialize session
      const response = await fetch('/api/voice/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'session_init',
          context: {
            organizationId,
            currentPage,
            vaultId,
            documentId,
            meetingId
          },
          preferences
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setAssistantState(prev => ({
          ...prev,
          isInitialized: true,
          isConnected: true,
          sessionId: result.sessionId,
          proactiveInsights: result.proactiveInsights || [],
          contextState: { ...prev.contextState, ...result.contextUpdates }
        }));

        // Add welcome message to conversation
        if (result.response.text) {
          addConversationEntry({
            type: 'assistant_text',
            content: result.response.text,
            confidence: result.response.confidence
          });
        }

        // Trigger initial insights callback
        if (result.proactiveInsights && onInsightGenerated) {
          result.proactiveInsights.forEach(onInsightGenerated);
        }
      }
    } catch (error) {
      console.error('Failed to initialize assistant:', error);
      setAssistantState(prev => ({ ...prev, isConnected: false }));
    }
  };

  const initializeAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });
      streamRef.current = stream;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (proactiveTimerRef.current) {
      clearInterval(proactiveTimerRef.current);
    }
  };

  const startListening = useCallback(async () => {
    if (!streamRef.current || assistantState.isListening) return;

    try {
      setAssistantState(prev => ({ ...prev, isListening: true }));

      const mediaRecorder = new MediaRecorder(streamRef.current);
      mediaRecorderRef.current = mediaRecorder;
      
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await processVoiceInput(audioBlob);
      };

      mediaRecorder.start();

      // Auto-stop after reasonable time
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 10000);

    } catch (error) {
      console.error('Failed to start listening:', error);
      setAssistantState(prev => ({ ...prev, isListening: false }));
    }
  }, [assistantState.isListening]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setAssistantState(prev => ({ ...prev, isListening: false }));
  }, []);

  const processVoiceInput = async (audioBlob: Blob) => {
    setAssistantState(prev => ({ ...prev, isProcessing: true }));

    try {
      // Convert to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Send to assistant API
      const response = await fetch('/api/voice/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: assistantState.sessionId,
          requestType: 'voice_query',
          audioData: base64Audio,
          context: {
            organizationId,
            currentPage,
            vaultId,
            documentId,
            meetingId
          },
          preferences
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Add assistant response to conversation
        addConversationEntry({
          type: result.response.audioUrl ? 'assistant_voice' : 'assistant_text',
          content: result.response.text,
          audioUrl: result.response.audioUrl,
          confidence: result.response.confidence,
          intent: result.response.intent
        });

        // Update insights and recommendations
        if (result.proactiveInsights) {
          setAssistantState(prev => ({
            ...prev,
            proactiveInsights: [...result.proactiveInsights, ...prev.proactiveInsights].slice(0, 20)
          }));
          
          if (onInsightGenerated) {
            result.proactiveInsights.forEach(onInsightGenerated);
          }
        }

        if (result.recommendations) {
          setAssistantState(prev => ({
            ...prev,
            currentRecommendations: result.recommendations
          }));
          
          if (onRecommendationMade) {
            result.recommendations.forEach(onRecommendationMade);
          }
        }

        // Play audio response if available
        if (result.response.audioUrl && preferences.responseMode !== 'text_only') {
          playAudioResponse(result.response.audioUrl);
        }

        // Handle interruption if needed
        if (result.interruption && result.interruption.canInterrupt) {
          handleSmartInterruption(result.interruption);
        }
      }

    } catch (error) {
      console.error('Failed to process voice input:', error);
      addConversationEntry({
        type: 'assistant_text',
        content: "I'm sorry, I had trouble processing that. Could you please try again?",
        confidence: 0.5
      });
    } finally {
      setAssistantState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const sendTextQuery = async (text: string) => {
    if (!text.trim()) return;

    setAssistantState(prev => ({ ...prev, isProcessing: true }));

    // Add user message to conversation
    addConversationEntry({
      type: 'user_text',
      content: text,
      confidence: 1.0
    });

    try {
      const response = await fetch('/api/voice/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: assistantState.sessionId,
          requestType: 'text_query',
          textInput: text,
          context: {
            organizationId,
            currentPage,
            vaultId,
            documentId,
            meetingId
          },
          preferences
        })
      });

      const result = await response.json();
      
      if (result.success) {
        addConversationEntry({
          type: 'assistant_text',
          content: result.response.text,
          confidence: result.response.confidence,
          intent: result.response.intent
        });

        // Update insights and recommendations (same as voice processing)
        if (result.proactiveInsights) {
          setAssistantState(prev => ({
            ...prev,
            proactiveInsights: [...result.proactiveInsights, ...prev.proactiveInsights].slice(0, 20)
          }));
        }

        if (result.recommendations) {
          setAssistantState(prev => ({
            ...prev,
            currentRecommendations: result.recommendations
          }));
        }
      }
    } catch (error) {
      console.error('Failed to send text query:', error);
      addConversationEntry({
        type: 'assistant_text',
        content: "I encountered an error processing your request. Please try again.",
        confidence: 0.5
      });
    } finally {
      setAssistantState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const addConversationEntry = (entry: Partial<ConversationEntry>) => {
    const fullEntry: ConversationEntry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      confidence: 0.9,
      ...entry
    } as ConversationEntry;

    setAssistantState(prev => ({
      ...prev,
      conversationHistory: [fullEntry, ...prev.conversationHistory.slice(0, 49)] // Keep last 50
    }));

    // Scroll to bottom
    setTimeout(() => {
      if (conversationRef.current) {
        conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
      }
    }, 100);
  };

  const playAudioResponse = (audioUrl: string) => {
    if (audioRef.current) {
      setCurrentlyPlaying(audioUrl);
      audioRef.current.src = audioUrl;
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(error => console.error('Failed to play audio:', error));
      
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setCurrentlyPlaying(null);
      };
    }
  };

  const startProactiveInsightsTimer = () => {
    const interval = preferences.proactiveLevel === 'aggressive' ? 30000 : 60000; // 30s or 60s
    
    proactiveTimerRef.current = setInterval(async () => {
      if (assistantState.sessionId && !assistantState.isProcessing) {
        try {
          const response = await fetch('/api/voice/assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: assistantState.sessionId,
              requestType: 'proactive_insight',
              context: {
                organizationId,
                currentPage,
                vaultId,
                documentId,
                meetingId
              },
              preferences
            })
          });

          const result = await response.json();
          
          if (result.success && result.proactiveInsights?.length > 0) {
            setAssistantState(prev => ({
              ...prev,
              proactiveInsights: [...result.proactiveInsights, ...prev.proactiveInsights].slice(0, 20)
            }));

            // Add system insight to conversation
            result.proactiveInsights.forEach((insight: ProactiveInsight) => {
              if (insight.urgency === 'high' || insight.urgency === 'critical') {
                addConversationEntry({
                  type: 'system_insight',
                  content: `💡 Proactive Insight: ${insight.title} - ${insight.description}`,
                  confidence: insight.confidence
                });

                if (onInsightGenerated) {
                  onInsightGenerated(insight);
                }
              }
            });
          }
        } catch (error) {
          console.error('Proactive insights error:', error);
        }
      }
    }, interval);
  };

  const updateContext = async () => {
    if (!assistantState.sessionId) return;

    const newContext = {
      organizationId,
      currentPage,
      vaultId,
      documentId,
      meetingId
    };

    // Check if context has actually changed
    const currentContext = assistantState.contextState;
    if (
      currentContext.currentPage === currentPage &&
      currentContext.activeVault === vaultId &&
      currentContext.activeDocument === documentId &&
      currentContext.activeMeeting === meetingId
    ) {
      return;
    }

    setAssistantState(prev => ({
      ...prev,
      contextState: {
        ...prev.contextState,
        currentPage,
        activeVault: vaultId,
        activeDocument: documentId,
        activeMeeting: meetingId
      }
    }));

    // Notify assistant of context change
    try {
      await fetch('/api/voice/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: assistantState.sessionId,
          requestType: 'context_resume',
          context: newContext,
          preferences
        })
      });
    } catch (error) {
      console.error('Context update error:', error);
    }
  };

  const handleSmartInterruption = (interruption: any) => {
    if (preferences.autoInterruption && assistantState.isListening) {
      // Preserve current context
      const interruptionContext: InterruptionContext = {
        pausedAt: new Date().toISOString(),
        contextSummary: 'Voice interaction interrupted for higher priority item',
        urgencyLevel: interruption.priority === 'emergency' ? 100 : 75,
        resumptionCue: 'Shall we continue where we left off?',
        preservedState: { ...assistantState }
      };

      setAssistantState(prev => ({
        ...prev,
        interruptionContext,
        isListening: false,
        isProcessing: false
      }));

      stopListening();
    }
  };

  const acknowledgeInsight = async (insightId: string) => {
    setAssistantState(prev => ({
      ...prev,
      proactiveInsights: prev.proactiveInsights.map(insight =>
        insight.id === insightId ? { ...insight, acknowledged: true } : insight
      )
    }));
  };

  const dismissInsight = (insightId: string) => {
    setAssistantState(prev => ({
      ...prev,
      proactiveInsights: prev.proactiveInsights.filter(insight => insight.id !== insightId)
    }));
  };

  // Render methods
  const renderChatInterface = () => (
    <div className="space-y-4">
      <ScrollArea 
        ref={conversationRef}
        className="h-80 border rounded-lg p-4"
      >
        {assistantState.conversationHistory.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Your BoardGuru AI Assistant is ready</p>
            <p className="text-sm">Click the microphone or type a message to start</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assistantState.conversationHistory.slice().reverse().map((entry) => (
              <div key={entry.id} className="space-y-2">
                {entry.type.startsWith('user') ? (
                  <div className="flex justify-end">
                    <div className="bg-blue-500 text-white p-3 rounded-lg max-w-md">
                      {entry.content}
                      {entry.emotion && (
                        <div className="text-xs mt-1 opacity-75">
                          {entry.emotion} • {Math.round(entry.confidence * 100)}%
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-start items-start space-x-2">
                    <Bot className="h-6 w-6 text-blue-600 mt-2 flex-shrink-0" />
                    <div className={`p-3 rounded-lg max-w-md ${
                      entry.type === 'system_insight' 
                        ? 'bg-yellow-50 border border-yellow-200' 
                        : 'bg-gray-100'
                    }`}>
                      {entry.content}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-2">
                          {entry.intent && (
                            <Badge variant="outline" className="text-xs">
                              {entry.intent.domain}
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500">
                            {Math.round(entry.confidence * 100)}%
                          </span>
                        </div>
                        {entry.audioUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playAudioResponse(entry.audioUrl!)}
                            disabled={isPlaying && currentlyPlaying === entry.audioUrl}
                          >
                            {isPlaying && currentlyPlaying === entry.audioUrl ? (
                              <Pause className="h-3 w-3" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="flex items-center justify-center space-x-4">
        <Button
          onClick={assistantState.isListening ? stopListening : startListening}
          disabled={assistantState.isProcessing || !assistantState.isConnected}
          size="lg"
          variant={assistantState.isListening ? "destructive" : "default"}
          className="rounded-full h-14 w-14"
        >
          {assistantState.isListening ? (
            <MicOff className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>

        {isPlaying && (
          <Button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.pause();
                setIsPlaying(false);
                setCurrentlyPlaying(null);
              }
            }}
            variant="outline"
            size="lg"
            className="rounded-full h-14 w-14"
          >
            <VolumeX className="h-6 w-6" />
          </Button>
        )}
      </div>

      <div className="text-center text-sm text-gray-600">
        {assistantState.isListening ? (
          <div className="flex items-center justify-center space-x-2 text-red-600">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            <span>Listening...</span>
          </div>
        ) : assistantState.isProcessing ? (
          <div className="flex items-center justify-center space-x-2 text-blue-600">
            <Brain className="h-4 w-4 animate-pulse" />
            <span>Processing...</span>
          </div>
        ) : !assistantState.isConnected ? (
          <div className="flex items-center justify-center space-x-2 text-orange-600">
            <AlertTriangle className="h-4 w-4" />
            <span>Connecting...</span>
          </div>
        ) : (
          <span>Voice or text input ready</span>
        )}
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );

  const renderProactiveInsights = () => (
    <div className="space-y-4">
      {assistantState.proactiveInsights.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No current insights</p>
          <p className="text-sm">I'll proactively suggest insights as I learn more about your work</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assistantState.proactiveInsights.map((insight) => (
            <Card key={insight.id} className={`${
              insight.urgency === 'critical' ? 'border-red-500' :
              insight.urgency === 'high' ? 'border-orange-500' :
              insight.urgency === 'medium' ? 'border-yellow-500' :
              'border-gray-200'
            }`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{insight.title}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant={
                      insight.urgency === 'critical' ? 'destructive' :
                      insight.urgency === 'high' ? 'default' :
                      'secondary'
                    }>
                      {insight.urgency}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissInsight(insight.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                {insight.recommendations.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Recommendations:</p>
                    {insight.recommendations.map((rec, index) => (
                      <p key={index} className="text-xs text-gray-600">• {rec}</p>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-500">
                    Confidence: {Math.round(insight.confidence * 100)}%
                  </span>
                  {!insight.acknowledged && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => acknowledgeInsight(insight.id)}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Acknowledge
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderRecommendations = () => (
    <div className="space-y-4">
      {assistantState.currentRecommendations.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No current recommendations</p>
          <p className="text-sm">Ask me about board governance topics to get personalized recommendations</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assistantState.currentRecommendations.map((rec, index) => (
            <Card key={index} className="border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{rec.title}</CardTitle>
                  <Badge variant={
                    rec.priority === 'urgent' ? 'destructive' :
                    rec.priority === 'high' ? 'default' :
                    'secondary'
                  }>
                    {rec.priority}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-xs">
                    <Clock className="h-3 w-3" />
                    <span>{rec.timeline} • ~{rec.estimatedTime} minutes</span>
                  </div>
                  {rec.requiredActions.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium">Required Actions:</p>
                      {rec.requiredActions.map((action, idx) => (
                        <p key={idx} className="text-xs text-gray-600">• {action}</p>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Response Mode</label>
          <select 
            value={preferences.responseMode}
            onChange={(e) => setPreferences(prev => ({ 
              ...prev, 
              responseMode: e.target.value as any 
            }))}
            className="w-full mt-1 p-2 border rounded"
          >
            <option value="voice_with_text">Voice + Text</option>
            <option value="voice_only">Voice Only</option>
            <option value="text_only">Text Only</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Verbosity Level</label>
          <select 
            value={preferences.verbosityLevel}
            onChange={(e) => setPreferences(prev => ({ 
              ...prev, 
              verbosityLevel: e.target.value as any 
            }))}
            className="w-full mt-1 p-2 border rounded"
          >
            <option value="concise">Concise</option>
            <option value="balanced">Balanced</option>
            <option value="detailed">Detailed</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Proactive Level</label>
          <select 
            value={preferences.proactiveLevel}
            onChange={(e) => setPreferences(prev => ({ 
              ...prev, 
              proactiveLevel: e.target.value as any 
            }))}
            className="w-full mt-1 p-2 border rounded"
          >
            <option value="minimal">Minimal</option>
            <option value="moderate">Moderate</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Voice Personality</label>
          <select 
            value={preferences.voicePersonality}
            onChange={(e) => setPreferences(prev => ({ 
              ...prev, 
              voicePersonality: e.target.value as any 
            }))}
            className="w-full mt-1 p-2 border rounded"
          >
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="supportive">Supportive</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="autoInterruption"
            checked={preferences.autoInterruption}
            onChange={(e) => setPreferences(prev => ({ 
              ...prev, 
              autoInterruption: e.target.checked 
            }))}
          />
          <label htmlFor="autoInterruption" className="text-sm">
            Allow smart interruptions
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="contextPreservation"
            checked={preferences.contextPreservation}
            onChange={(e) => setPreferences(prev => ({ 
              ...prev, 
              contextPreservation: e.target.checked 
            }))}
          />
          <label htmlFor="contextPreservation" className="text-sm">
            Preserve context during interruptions
          </label>
        </div>
      </div>

      <div className="pt-4 border-t">
        <h4 className="text-sm font-medium mb-2">Assistant Status</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Connection:</span>
            <Badge variant={assistantState.isConnected ? "default" : "destructive"}>
              {assistantState.isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span>Session:</span>
            <span className="font-mono text-xs">{assistantState.sessionId}</span>
          </div>
          <div className="flex justify-between">
            <span>Messages:</span>
            <span>{assistantState.conversationHistory.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Insights:</span>
            <span>{assistantState.proactiveInsights.length}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Main render based on position and state
  if (minimized && position === 'floating') {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <Button
          onClick={onMaximize}
          size="lg"
          className="rounded-full h-16 w-16 shadow-lg"
        >
          <Bot className="h-8 w-8" />
        </Button>
      </div>
    );
  }

  const cardClass = position === 'floating' 
    ? `fixed bottom-4 right-4 z-50 w-96 max-h-[70vh] ${className}`
    : position === 'sidebar'
    ? `h-full ${className}`
    : `w-full max-w-2xl mx-auto ${className}`;

  return (
    <Card className={cardClass}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-blue-600" />
            <span>BoardGuru AI Assistant</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={assistantState.isConnected ? "default" : "destructive"}>
              {assistantState.isConnected ? "Online" : "Offline"}
            </Badge>
            {position === 'floating' && (
              <div className="flex space-x-1">
                {onMinimize && (
                  <Button variant="ghost" size="sm" onClick={onMinimize}>
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                )}
                {onClose && (
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          AI-powered board governance assistant with proactive insights
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="chat" className="flex items-center space-x-1">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center space-x-1">
              <Lightbulb className="h-4 w-4" />
              <span className="hidden sm:inline">Insights</span>
              {assistantState.proactiveInsights.filter(i => !i.acknowledged).length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {assistantState.proactiveInsights.filter(i => !i.acknowledged).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center space-x-1">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Recs</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-1">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-1">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="chat">
              {renderChatInterface()}
            </TabsContent>

            <TabsContent value="insights">
              {renderProactiveInsights()}
            </TabsContent>

            <TabsContent value="recommendations">
              {renderRecommendations()}
            </TabsContent>

            <TabsContent value="analytics">
              <div className="text-center text-gray-500 py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Board Analytics</p>
                <p className="text-sm">Coming soon - Real-time governance metrics and trends</p>
              </div>
            </TabsContent>

            <TabsContent value="settings">
              {renderSettings()}
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}