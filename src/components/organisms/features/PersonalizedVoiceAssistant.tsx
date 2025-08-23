'use client';

/**
 * Personalized Voice Assistant Component
 * AI assistant that adapts to user's voice patterns and communication style
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/atoms/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/molecules/cards/card';
import { Badge } from '@/components/atoms/display/badge';
import { Alert, AlertDescription } from '@/components/atoms/feedback/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/atoms/display/progress';
import { 
  Mic, 
  MicOff, 
  Bot, 
  Volume2, 
  VolumeX,
  Settings,
  Brain,
  Heart,
  Zap,
  Users,
  TrendingUp,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Target,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  VoicePersonalizationProfile,
  EmotionAnalysisResult,
  CommunicationStyle,
  VoiceShortcut,
  PersonalizedResponse
} from '@/types/voice-biometric';

interface PersonalizedVoiceAssistantProps {
  userId: string;
  organizationId: string;
  onEmotionDetected?: (emotion: EmotionAnalysisResult) => void;
  onPersonalizationUpdate?: (profile: VoicePersonalizationProfile) => void;
  enableEmotionAnalysis?: boolean;
  enablePersonalization?: boolean;
  className?: string;
}

interface AssistantState {
  isListening: boolean;
  isProcessing: boolean;
  isInitialized: boolean;
  currentEmotion: EmotionAnalysisResult | null;
  personalizationProfile: VoicePersonalizationProfile | null;
  conversationContext: ConversationContext[];
  adaptationProgress: number;
}

interface ConversationContext {
  id: string;
  timestamp: string;
  userInput: string;
  assistantResponse: string;
  emotion: string;
  confidence: number;
  adaptationTrigger?: string;
}

interface AssistantResponse {
  text: string;
  audioUrl?: string;
  emotion?: string;
  adaptations?: PersonalizationAdaptation[];
  suggestions?: string[];
}

interface PersonalizationAdaptation {
  type: 'style' | 'pace' | 'tone' | 'verbosity';
  from: any;
  to: any;
  reason: string;
  confidence: number;
}

const DEFAULT_SHORTCUTS: VoiceShortcut[] = [
  {
    id: '1',
    phrase: 'show my dashboard',
    action: { type: 'navigation', target: '/dashboard' },
    frequency: 0,
    lastUsed: '',
    isActive: true
  },
  {
    id: '2', 
    phrase: 'schedule a meeting',
    action: { type: 'command', target: 'schedule_meeting' },
    frequency: 0,
    lastUsed: '',
    isActive: true
  },
  {
    id: '3',
    phrase: 'show board documents',
    action: { type: 'navigation', target: '/dashboard/documents' },
    frequency: 0,
    lastUsed: '',
    isActive: true
  }
];

export default function PersonalizedVoiceAssistant({
  userId,
  organizationId,
  onEmotionDetected,
  onPersonalizationUpdate,
  enableEmotionAnalysis = true,
  enablePersonalization = true,
  className = ''
}: PersonalizedVoiceAssistantProps) {
  const [assistantState, setAssistantState] = useState<AssistantState>({
    isListening: false,
    isProcessing: false,
    isInitialized: false,
    currentEmotion: null,
    personalizationProfile: null,
    conversationContext: [],
    adaptationProgress: 0
  });

  const [currentResponse, setCurrentResponse] = useState<AssistantResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'emotions' | 'personalization' | 'shortcuts'>('chat');
  const [isPlaying, setIsPlaying] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  // Initialize assistant
  useEffect(() => {
    initializeAssistant();
    return () => {
      cleanup();
    };
  }, [userId, organizationId]);

  const initializeAssistant = async () => {
    try {
      // Load personalization profile
      await loadPersonalizationProfile();
      
      // Initialize audio permissions
      await initializeAudio();
      
      setAssistantState(prev => ({ ...prev, isInitialized: true }));
    } catch (error) {
      console.error('Failed to initialize assistant:', error);
    }
  };

  const loadPersonalizationProfile = async () => {
    try {
      const response = await fetch('/api/voice/personalization', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      
      if (result.success && result.profile) {
        setAssistantState(prev => ({
          ...prev,
          personalizationProfile: result.profile,
          adaptationProgress: calculateAdaptationProgress(result.profile)
        }));
      } else {
        // Create default profile
        const defaultProfile = createDefaultPersonalizationProfile();
        setAssistantState(prev => ({
          ...prev,
          personalizationProfile: defaultProfile
        }));
      }
    } catch (error) {
      console.error('Failed to load personalization profile:', error);
    }
  };

  const initializeAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
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
      }, 8000);

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

      // Transcribe and analyze
      const analysisResponse = await fetch('/api/voice/biometric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'emotion_analysis',
          audioData: base64Audio,
          analysisType: 'comprehensive',
          context: 'assistant_interaction'
        })
      });

      const analysisResult = await analysisResponse.json();

      if (analysisResult.success) {
        const emotion = analysisResult.emotionAnalysis;
        setAssistantState(prev => ({ ...prev, currentEmotion: emotion }));
        onEmotionDetected?.(emotion);

        // Check for escalation
        if (emotion.escalationRecommended) {
          await handleEmotionalEscalation(emotion);
        }

        // Transcribe the audio
        const transcribeResponse = await fetch('/api/voice/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio: base64Audio,
            format: 'webm'
          })
        });

        const transcriptionResult = await transcribeResponse.json();
        
        if (transcriptionResult.success) {
          const userInput = transcriptionResult.text;
          
          // Check for voice shortcuts
          const shortcut = findVoiceShortcut(userInput);
          if (shortcut) {
            await executeVoiceShortcut(shortcut, userInput);
            return;
          }

          // Generate personalized response
          const response = await generatePersonalizedResponse(userInput, emotion);
          setCurrentResponse(response);

          // Update conversation context
          const contextEntry: ConversationContext = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            userInput,
            assistantResponse: response.text,
            emotion: emotion.dominantEmotion,
            confidence: emotion.analysisConfidence
          };

          setAssistantState(prev => ({
            ...prev,
            conversationContext: [contextEntry, ...prev.conversationContext.slice(0, 9)] // Keep last 10
          }));

          // Apply adaptations if any
          if (response.adaptations && response.adaptations.length > 0) {
            await applyPersonalizationAdaptations(response.adaptations);
          }

          // Play audio response if available
          if (response.audioUrl) {
            playAudioResponse(response.audioUrl);
          }
        }
      }

    } catch (error) {
      console.error('Failed to process voice input:', error);
      setCurrentResponse({
        text: "I'm sorry, I had trouble understanding that. Could you please try again?",
        emotion: 'apologetic'
      });
    } finally {
      setAssistantState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const generatePersonalizedResponse = async (
    userInput: string, 
    emotion: EmotionAnalysisResult
  ): Promise<AssistantResponse> => {
    try {
      const response = await fetch('/api/voice/personalized-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput,
          emotion,
          personalizationProfile: assistantState.personalizationProfile,
          conversationContext: assistantState.conversationContext.slice(0, 3) // Recent context
        })
      });

      const result = await response.json();
      
      if (result.success) {
        return result.response;
      } else {
        throw new Error('Failed to generate personalized response');
      }
      
    } catch (error) {
      console.error('Failed to generate personalized response:', error);
      
      // Fallback to basic response based on emotion
      return generateFallbackResponse(userInput, emotion);
    }
  };

  const generateFallbackResponse = (userInput: string, emotion: EmotionAnalysisResult): AssistantResponse => {
    const profile = assistantState.personalizationProfile;
    
    // Adapt response based on detected emotion and communication style
    if (emotion.stressLevel > 70) {
      return {
        text: profile?.communicationStyle.tone === 'friendly' 
          ? "I can sense you might be feeling stressed. I'm here to help make things easier for you. What can I assist you with today?"
          : "I detect some stress in your voice. How can I help address your concerns efficiently?",
        emotion: 'supportive',
        suggestions: ['Take a deep breath', 'Would you like me to summarize your tasks?', 'Should I reschedule any meetings?']
      };
    }

    if (emotion.urgencyLevel > 80) {
      return {
        text: profile?.communicationStyle.verbosity === 'concise'
          ? "I understand this is urgent. What do you need right now?"
          : "I can tell this is urgent. Let me help you quickly resolve whatever you need assistance with.",
        emotion: 'urgent',
        suggestions: ['Show critical tasks', 'Emergency contacts', 'Escalate to admin']
      };
    }

    // Default friendly response
    return {
      text: profile?.communicationStyle.formality === 'casual'
        ? "Hey there! I heard you, but I'm not quite sure how to help with that yet. Can you be a bit more specific?"
        : "I understand you're looking for assistance. Could you please provide more details about what you need help with?",
      emotion: 'friendly',
      suggestions: ['Ask about meetings', 'View documents', 'Check calendar']
    };
  };

  const findVoiceShortcut = (input: string): VoiceShortcut | null => {
    const profile = assistantState.personalizationProfile;
    if (!profile?.voiceShortcuts) return null;

    const normalizedInput = input.toLowerCase().trim();
    
    return profile.voiceShortcuts.find(shortcut => {
      const normalizedPhrase = shortcut.phrase.toLowerCase();
      return normalizedInput.includes(normalizedPhrase) ||
             calculateStringSimilarity(normalizedInput, normalizedPhrase) > 0.8;
    }) || null;
  };

  const executeVoiceShortcut = async (shortcut: VoiceShortcut, userInput: string) => {
    try {
      // Update frequency
      shortcut.frequency += 1;
      shortcut.lastUsed = new Date().toISOString();

      // Execute action
      if (shortcut.action.type === 'navigation') {
        window.location.href = shortcut.action.target;
      } else if (shortcut.action.type === 'command') {
        // Execute command via API
        await fetch('/api/voice/commands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: shortcut.action.target,
            parameters: shortcut.parameters,
            userInput
          })
        });
      }

      setCurrentResponse({
        text: `Executing: ${shortcut.phrase}`,
        emotion: 'helpful'
      });

    } catch (error) {
      console.error('Failed to execute voice shortcut:', error);
      setCurrentResponse({
        text: "I'm sorry, I couldn't execute that command right now.",
        emotion: 'apologetic'
      });
    }
  };

  const applyPersonalizationAdaptations = async (adaptations: PersonalizationAdaptation[]) => {
    try {
      if (!assistantState.personalizationProfile) return;
      const profile: VoicePersonalizationProfile = { 
        ...assistantState.personalizationProfile,
        userId: userId // Ensure userId is always set from props
      };

      let updated = false;

      adaptations.forEach(adaptation => {
        if (adaptation.confidence > 0.7) {
          switch (adaptation.type) {
            case 'style':
              if (profile.communicationStyle) {
                profile.communicationStyle = { ...profile.communicationStyle, ...adaptation.to };
                updated = true;
              }
              break;
            case 'pace':
              if (profile.communicationStyle) {
                profile.communicationStyle.pace = adaptation.to;
                updated = true;
              }
              break;
            // Add other adaptation types
          }
        }
      });

      if (updated) {
        setAssistantState(prev => ({ 
          ...prev, 
          personalizationProfile: profile,
          adaptationProgress: calculateAdaptationProgress(profile)
        }));
        
        // Save to backend
        await savePersonalizationProfile(profile);
        onPersonalizationUpdate?.(profile);
      }

    } catch (error) {
      console.error('Failed to apply personalization adaptations:', error);
    }
  };

  const handleEmotionalEscalation = async (emotion: EmotionAnalysisResult) => {
    try {
      await fetch('/api/voice/escalation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          organizationId,
          emotion,
          context: 'voice_assistant',
          escalationType: emotion.stressLevel > 80 ? 'emotional_distress' : 
                        emotion.urgencyLevel > 90 ? 'urgent_request' : 'attention_needed'
        })
      });

      setCurrentResponse({
        text: emotion.stressLevel > 80 
          ? "I've noticed you seem stressed. I've flagged this for additional support. Is there anything immediate I can help you with?"
          : "I can tell this is important to you. I've made sure the right people are aware. How else can I assist?",
        emotion: 'supportive'
      });

    } catch (error) {
      console.error('Failed to handle emotional escalation:', error);
    }
  };

  const playAudioResponse = (audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(error => console.error('Failed to play audio:', error));
      
      audioRef.current.onended = () => setIsPlaying(false);
    }
  };

  // Utility functions
  const calculateAdaptationProgress = (profile: VoicePersonalizationProfile): number => {
    if (!profile?.learningHistory) return 0;
    
    const history = profile.learningHistory;
    const totalInteractions = history.totalInteractions || 1;
    const adaptations = history.adaptationHistory?.length || 0;
    
    return Math.min(100, (adaptations / Math.max(1, totalInteractions / 10)) * 100);
  };

  const createDefaultPersonalizationProfile = (): VoicePersonalizationProfile => {
    return {
      userId,
      communicationStyle: {
        formality: 'professional',
        verbosity: 'balanced',
        pace: 'normal',
        tone: 'friendly',
        technicalLevel: 'intermediate'
      },
      preferredInteractionModes: ['voice_with_visual'],
      adaptiveSettings: {
        autoAdjustVolume: true,
        autoAdjustSpeechRate: false,
        adaptToBackground: true,
        learningEnabled: true,
        suggestionLevel: 'moderate',
        contextAwareness: true
      },
      voiceShortcuts: DEFAULT_SHORTCUTS,
      personalizedResponses: [],
      learningHistory: {
        totalInteractions: 0,
        successfulAuthentications: 0,
        averageAuthenticationTime: 0,
        commonPhrases: {},
        errorPatterns: [],
        improvementAreas: [],
        adaptationHistory: []
      },
      preferences: {
        voiceFeedback: true,
        visualFeedback: true,
        hapticFeedback: false,
        confidenceDisplay: true,
        debugMode: false,
        privacyMode: false,
        dataSharing: 'anonymous',
        retentionPeriod: 365
      }
    };
  };

  const calculateStringSimilarity = (str1: string, str2: string): number => {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));
    
    for (let i = 0; i <= len1; i++) matrix[0]![i] = i;
    for (let j = 0; j <= len2; j++) matrix[j]![0] = j;
    
    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[j]![i] = matrix[j - 1]![i - 1]!;
        } else {
          matrix[j]![i] = Math.min(
            matrix[j - 1]![i - 1]! + 1,
            matrix[j]![i - 1]! + 1,
            matrix[j - 1]![i]! + 1
          );
        }
      }
    }
    
    return 1 - matrix[len2]![len1]! / Math.max(len1, len2);
  };

  const savePersonalizationProfile = async (profile: VoicePersonalizationProfile) => {
    try {
      await fetch('/api/voice/personalization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile })
      });
    } catch (error) {
      console.error('Failed to save personalization profile:', error);
    }
  };

  // Render methods
  const renderChatInterface = () => (
    <div className="space-y-4">
      <div 
        ref={conversationRef}
        className="h-64 overflow-y-auto border rounded-lg p-4 space-y-3"
      >
        {assistantState.conversationContext.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Start a conversation by clicking the microphone button</p>
          </div>
        ) : (
          assistantState.conversationContext.map((context) => (
            <div key={context.id} className="space-y-2">
              <div className="flex justify-end">
                <div className="bg-blue-500 text-white p-3 rounded-lg max-w-xs">
                  {context.userInput}
                </div>
              </div>
              <div className="flex justify-start items-start space-x-2">
                <Bot className="h-6 w-6 text-blue-600 mt-2 flex-shrink-0" />
                <div className="bg-gray-100 p-3 rounded-lg max-w-xs">
                  {context.assistantResponse}
                  <div className="flex items-center mt-2 space-x-2">
                    <Badge variant="outline" className="text-xs">
                      <Heart className="h-3 w-3 mr-1" />
                      {context.emotion}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {Math.round(context.confidence * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        
        {currentResponse && (
          <div className="flex justify-start items-start space-x-2">
            <Bot className="h-6 w-6 text-blue-600 mt-2 flex-shrink-0" />
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg max-w-xs">
              {currentResponse.text}
              {currentResponse.suggestions && (
                <div className="mt-2 space-y-1">
                  {currentResponse.suggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      className="text-xs h-6 px-2"
                      onClick={() => {/* Handle suggestion click */}}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center space-x-4">
        <Button
          onClick={assistantState.isListening ? stopListening : startListening}
          disabled={assistantState.isProcessing || !assistantState.isInitialized}
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

        {currentResponse?.audioUrl && (
          <Button
            onClick={() => playAudioResponse(currentResponse.audioUrl!)}
            variant="outline"
            size="lg"
            disabled={isPlaying}
            className="rounded-full h-14 w-14"
          >
            {isPlaying ? (
              <VolumeX className="h-6 w-6" />
            ) : (
              <Volume2 className="h-6 w-6" />
            )}
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
        ) : (
          <span>Click the microphone to start talking</span>
        )}
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );

  const renderEmotionAnalysis = () => (
    <div className="space-y-4">
      {assistantState.currentEmotion ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {assistantState.currentEmotion.dominantEmotion}
              </div>
              <div className="text-sm text-gray-600">Dominant Emotion</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {assistantState.currentEmotion.stressLevel}%
              </div>
              <div className="text-sm text-gray-600">Stress Level</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Emotion Intensity</span>
              <span>{assistantState.currentEmotion.emotionIntensity}%</span>
            </div>
            <Progress value={assistantState.currentEmotion.emotionIntensity} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Urgency Level</span>
              <span>{assistantState.currentEmotion.urgencyLevel}%</span>
            </div>
            <Progress value={assistantState.currentEmotion.urgencyLevel} className="h-2" />
          </div>

          {assistantState.currentEmotion.escalationRecommended && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Emotional escalation detected. Additional support may be needed.
              </AlertDescription>
            </Alert>
          )}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Start talking to see emotion analysis</p>
        </div>
      )}
    </div>
  );

  const renderPersonalizationSettings = () => {
    const profile = assistantState.personalizationProfile;
    if (!profile) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Learning Progress</span>
          <span className="text-sm">{Math.round(assistantState.adaptationProgress)}%</span>
        </div>
        <Progress value={assistantState.adaptationProgress} className="h-2" />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Communication Style:</span>
            <div className="font-medium">{profile.communicationStyle.formality}</div>
          </div>
          <div>
            <span className="text-gray-600">Verbosity:</span>
            <div className="font-medium">{profile.communicationStyle.verbosity}</div>
          </div>
          <div>
            <span className="text-gray-600">Pace:</span>
            <div className="font-medium">{profile.communicationStyle.pace}</div>
          </div>
          <div>
            <span className="text-gray-600">Tone:</span>
            <div className="font-medium">{profile.communicationStyle.tone}</div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="text-sm font-medium mb-2">Recent Adaptations</div>
          {profile.learningHistory.adaptationHistory?.slice(0, 3).map((adaptation, index) => (
            <div key={index} className="text-xs text-gray-600 mb-1">
              <span className="font-medium">{adaptation.adaptationType}</span>: {adaptation.trigger}
            </div>
          )) || (
            <div className="text-xs text-gray-500">No recent adaptations</div>
          )}
        </div>
      </div>
    );
  };

  const renderVoiceShortcuts = () => {
    const shortcuts = assistantState.personalizationProfile?.voiceShortcuts || [];

    return (
      <div className="space-y-4">
        <div className="text-sm text-gray-600 mb-4">
          Use these voice commands for quick actions:
        </div>
        
        {shortcuts.map((shortcut) => (
          <div key={shortcut.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium text-sm">"{shortcut.phrase}"</div>
              <div className="text-xs text-gray-500">
                Used {shortcut.frequency} times
                {shortcut.lastUsed && (
                  <> • Last used {new Date(shortcut.lastUsed).toLocaleDateString()}</>
                )}
              </div>
            </div>
            <Badge variant={shortcut.isActive ? "default" : "secondary"}>
              {shortcut.action.type}
            </Badge>
          </div>
        ))}

        <Button variant="outline" className="w-full">
          <Lightbulb className="h-4 w-4 mr-2" />
          Suggest New Shortcuts
        </Button>
      </div>
    );
  };

  return (
    <Card className={`w-full max-w-2xl mx-auto ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <span>AI Voice Assistant</span>
          </div>
          <div className="flex items-center space-x-2">
            {assistantState.currentEmotion && (
              <Badge variant="outline">
                <Heart className="h-3 w-3 mr-1" />
                {assistantState.currentEmotion.dominantEmotion}
              </Badge>
            )}
            <Badge variant={assistantState.isInitialized ? "default" : "secondary"}>
              {assistantState.isInitialized ? "Ready" : "Initializing"}
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Personalized AI assistant that adapts to your voice patterns and communication style
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="chat" className="flex items-center space-x-1">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="emotions" className="flex items-center space-x-1">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Emotions</span>
            </TabsTrigger>
            <TabsTrigger value="personalization" className="flex items-center space-x-1">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Learning</span>
            </TabsTrigger>
            <TabsTrigger value="shortcuts" className="flex items-center space-x-1">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Shortcuts</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="chat" className="space-y-4">
              {renderChatInterface()}
            </TabsContent>

            <TabsContent value="emotions" className="space-y-4">
              {renderEmotionAnalysis()}
            </TabsContent>

            <TabsContent value="personalization" className="space-y-4">
              {renderPersonalizationSettings()}
            </TabsContent>

            <TabsContent value="shortcuts" className="space-y-4">
              {renderVoiceShortcuts()}
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}