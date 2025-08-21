import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import type { 
  VoiceTranslationSession,
  TranslateRequest,
  TranslateResponse,
  TranslationMetrics,
  UserLanguagePreferences
} from '@/types/voice-translation';

export interface UseVoiceTranslationOptions {
  autoStart?: boolean;
  realTime?: boolean;
  targetLanguages?: string[];
  qualityMode?: 'speed' | 'balanced' | 'accuracy';
  onTranslationComplete?: (result: TranslateResponse) => void;
  onError?: (error: Error) => void;
}

export interface VoiceTranslationState {
  isActive: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  currentSession: VoiceTranslationSession | null;
  translations: TranslateResponse[];
  metrics: TranslationMetrics[];
  error: string | null;
  userPreferences: UserLanguagePreferences | null;
}

export function useVoiceTranslation(options: UseVoiceTranslationOptions = {}) {
  const { toast } = useToast();
  const [state, setState] = useState<VoiceTranslationState>({
    isActive: false,
    isRecording: false,
    isProcessing: false,
    currentSession: null,
    translations: [],
    metrics: [],
    error: null,
    userPreferences: null
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load user language preferences
  const loadUserPreferences = useCallback(async () => {
    try {
      const response = await fetch('/api/voice/preferences');
      if (response.ok) {
        const preferences = await response.json();
        setState(prev => ({ ...prev, userPreferences: preferences }));
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
  }, []);

  // Initialize audio recording
  const initializeRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm'
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await processAudioBlob(audioBlob);
          audioChunksRef.current = [];
        }
      };

      return true;
    } catch (error) {
      console.error('Failed to initialize recording:', error);
      setState(prev => ({ ...prev, error: 'Failed to access microphone' }));
      options.onError?.(new Error('Failed to access microphone'));
      return false;
    }
  }, [options]);

  // Process audio blob
  const processAudioBlob = async (audioBlob: Blob) => {
    try {
      setState(prev => ({ ...prev, isProcessing: true }));

      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      await translateAudio(base64Audio);
    } catch (error) {
      console.error('Error processing audio:', error);
      setState(prev => ({ ...prev, error: 'Failed to process audio' }));
      options.onError?.(error as Error);
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  // Translate audio or text
  const translateAudio = async (audioData?: string, text?: string) => {
    try {
      const requestBody: TranslateRequest = {
        audio: audioData,
        text: text,
        targetLanguages: options.targetLanguages || state.userPreferences?.secondaryLanguages || ['es', 'fr'],
        sourceLanguage: state.userPreferences?.primaryLanguage || 'auto',
        sessionId: state.currentSession?.id,
        includeAudio: false,
        qualityMode: options.qualityMode || state.userPreferences?.translationQualityPreference || 'balanced',
        format: 'webm'
      };

      const response = await fetch('/api/voice/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Translation failed');
      }

      const result: TranslateResponse = await response.json();

      if (result.success) {
        setState(prev => ({
          ...prev,
          translations: [result, ...prev.translations.slice(0, 49)], // Keep last 50
          currentSession: result.sessionId 
            ? { ...prev.currentSession, id: result.sessionId } as VoiceTranslationSession
            : prev.currentSession
        }));

        options.onTranslationComplete?.(result);

        toast({
          title: "Translation Complete",
          description: `Translated to ${Object.keys(result.translations).length} languages`
        });

        return result;
      } else {
        throw new Error('Translation failed');
      }
    } catch (error) {
      console.error('Translation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      options.onError?.(error as Error);
      
      toast({
        title: "Translation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Start session
  const startSession = useCallback(async (sessionName?: string) => {
    try {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));

      const initialized = await initializeRecording();
      if (!initialized) return false;

      setState(prev => ({
        ...prev,
        isActive: true,
        currentSession: {
          id: `session_${Date.now()}`,
          userId: '', // Will be filled from auth context
          organizationId: '', // Will be filled from auth context  
          sessionName: sessionName || `Voice Session ${new Date().toLocaleString()}`,
          sourceLanguage: prev.userPreferences?.primaryLanguage || 'auto',
          targetLanguages: options.targetLanguages || prev.userPreferences?.secondaryLanguages || ['es', 'fr'],
          isActive: true,
          sessionType: 'realtime',
          participants: [],
          settings: {
            realTimeTranslation: options.realTime || true,
            autoDetectLanguage: true,
            confidenceThreshold: 0.7,
            includeAudio: false,
            speakerIdentification: false,
            customTerminology: true,
            qualityMode: options.qualityMode || 'balanced'
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }));

      return true;
    } catch (error) {
      console.error('Failed to start session:', error);
      setState(prev => ({ ...prev, error: 'Failed to start session' }));
      return false;
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [initializeRecording, options]);

  // Stop session
  const stopSession = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isProcessing: true }));

      if (state.isRecording) {
        await stopRecording();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      mediaRecorderRef.current = null;

      // End session on server if active
      if (state.currentSession?.id) {
        try {
          await fetch('/api/voice/translate', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: state.currentSession.id,
              action: 'end'
            }),
          });
        } catch (error) {
          console.error('Failed to end session on server:', error);
        }
      }

      setState(prev => ({
        ...prev,
        isActive: false,
        isRecording: false,
        currentSession: null
      }));

      return true;
    } catch (error) {
      console.error('Failed to stop session:', error);
      setState(prev => ({ ...prev, error: 'Failed to stop session' }));
      return false;
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [state.currentSession?.id, state.isRecording]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) {
      const initialized = await initializeRecording();
      if (!initialized) return false;
    }

    try {
      if (mediaRecorderRef.current?.state === 'inactive') {
        audioChunksRef.current = [];
        mediaRecorderRef.current.start(options.realTime ? 3000 : undefined); // 3s chunks for real-time
        setState(prev => ({ ...prev, isRecording: true, error: null }));
        
        toast({
          title: "Recording Started",
          description: options.realTime ? "Real-time translation active" : "Recording started"
        });

        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to start recording:', error);
      setState(prev => ({ ...prev, error: 'Failed to start recording' }));
      return false;
    }
  }, [initializeRecording, options.realTime, toast]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        setState(prev => ({ ...prev, isRecording: false }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setState(prev => ({ ...prev, error: 'Failed to stop recording' }));
      return false;
    }
  }, []);

  // Translate text directly
  const translateText = useCallback(async (text: string) => {
    return await translateAudio(undefined, text);
  }, []);

  // Get supported languages
  const getSupportedLanguages = useCallback(async () => {
    try {
      const response = await fetch('/api/voice/translate?action=languages');
      if (response.ok) {
        const data = await response.json();
        return data.supportedLanguages;
      }
      return {};
    } catch (error) {
      console.error('Failed to get supported languages:', error);
      return {};
    }
  }, []);

  // Get session history
  const getSessionHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/voice/translate?action=sessions');
      if (response.ok) {
        const data = await response.json();
        return data.sessions || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get session history:', error);
      return [];
    }
  }, []);

  // Clear translations
  const clearTranslations = useCallback(() => {
    setState(prev => ({ ...prev, translations: [] }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Auto-start session if requested
  useEffect(() => {
    if (options.autoStart) {
      startSession();
    }
  }, [options.autoStart, startSession]);

  // Load user preferences on mount
  useEffect(() => {
    loadUserPreferences();
  }, [loadUserPreferences]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    startSession,
    stopSession,
    startRecording,
    stopRecording,
    translateText,
    translateAudio,
    clearTranslations,
    clearError,
    
    // Utilities
    getSupportedLanguages,
    getSessionHistory,
    loadUserPreferences,
    
    // Computed properties
    hasActiveSession: state.isActive,
    canRecord: !state.isProcessing && state.isActive,
    translationCount: state.translations.length,
    lastTranslation: state.translations[0] || null,
    averageConfidence: state.translations.length > 0 
      ? state.translations.reduce((sum, t) => {
          const avgConfidence = Object.values(t.translations).reduce((s, trans) => s + trans.confidence, 0) / Object.keys(t.translations).length;
          return sum + avgConfidence;
        }, 0) / state.translations.length
      : 0
  };
}