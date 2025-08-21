'use client';

/**
 * Voice Biometric Authentication Component
 * Handles voice recording, enrollment, authentication, and real-time verification
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  MicOff, 
  Shield, 
  ShieldCheck, 
  ShieldAlert,
  Volume2,
  VolumeX,
  Settings,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import {
  VoiceAuthenticationRequest,
  VoiceAuthenticationResponse,
  BiometricEnrollmentRequest,
  BiometricEnrollmentResponse,
  AuthenticationContext,
  FallbackOption
} from '@/types/voice-biometric';

interface VoiceBiometricAuthProps {
  mode: 'enrollment' | 'authentication' | 'verification';
  context?: AuthenticationContext;
  onSuccess?: (result: VoiceAuthenticationResponse | BiometricEnrollmentResponse) => void;
  onError?: (error: string) => void;
  onFallback?: (option: FallbackOption) => void;
  showVisualFeedback?: boolean;
  enableEmotionAnalysis?: boolean;
  enableFraudDetection?: boolean;
  autoStart?: boolean;
  className?: string;
}

interface RecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  duration: number;
  audioLevel: number;
  hasPermission: boolean;
  error?: string;
}

interface EnrollmentState {
  currentSession: number;
  totalSessions: number;
  progress: number;
  qualityScore: number;
  isComplete: boolean;
}

const ENROLLMENT_PHRASES = [
  "BoardGuru is my secure board management platform",
  "I authorize access to my board documents and meetings",
  "My voice is my identity for secure authentication"
];

export default function VoiceBiometricAuth({
  mode,
  context,
  onSuccess,
  onError,
  onFallback,
  showVisualFeedback = true,
  enableEmotionAnalysis = false,
  enableFraudDetection = true,
  autoStart = false,
  className = ''
}: VoiceBiometricAuthProps) {
  // State management
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isProcessing: false,
    duration: 0,
    audioLevel: 0,
    hasPermission: false
  });

  const [enrollmentState, setEnrollmentState] = useState<EnrollmentState>({
    currentSession: 1,
    totalSessions: 3,
    progress: 0,
    qualityScore: 0,
    isComplete: false
  });

  const [authResult, setAuthResult] = useState<VoiceAuthenticationResponse | null>(null);
  const [currentPhrase, setCurrentPhrase] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio context and permissions
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100
          } 
        });
        
        streamRef.current = stream;
        setRecordingState(prev => ({ ...prev, hasPermission: true }));

        // Set up audio context for visualization
        if (showVisualFeedback) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          analyserRef.current = audioContextRef.current.createAnalyser();
          const source = audioContextRef.current.createMediaStreamSource(stream);
          source.connect(analyserRef.current);
          analyserRef.current.fftSize = 256;
        }

      } catch (error) {
        console.error('Failed to initialize audio:', error);
        setRecordingState(prev => ({ 
          ...prev, 
          hasPermission: false, 
          error: 'Microphone permission denied' 
        }));
      }
    };

    initializeAudio();

    // Set initial phrase for enrollment
    if (mode === 'enrollment') {
      setCurrentPhrase(ENROLLMENT_PHRASES[0]);
    }

    // Auto-start if requested
    if (autoStart && mode !== 'enrollment') {
      setTimeout(startRecording, 1000);
    }

    // Cleanup
    return () => {
      stopRecording();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [autoStart, mode, showVisualFeedback]);

  // Audio level monitoring
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
    const normalizedLevel = (average / 255) * 100;
    
    setRecordingState(prev => ({ ...prev, audioLevel: normalizedLevel }));

    if (recordingState.isRecording) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [recordingState.isRecording]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!streamRef.current || recordingState.isRecording) return;

    try {
      // Reset state
      recordedChunksRef.current = [];
      setRecordingState(prev => ({ 
        ...prev, 
        isRecording: true, 
        duration: 0, 
        error: undefined 
      }));
      setIsListening(true);

      // Create MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        await processAudioData(audioBlob);
      };

      // Start recording
      mediaRecorderRef.current.start(100); // Collect data every 100ms

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingState(prev => ({ ...prev, duration: prev.duration + 0.1 }));
      }, 100);

      // Start audio level monitoring
      if (showVisualFeedback) {
        updateAudioLevel();
      }

      // Auto-stop after reasonable duration
      setTimeout(() => {
        if (recordingState.isRecording) {
          stopRecording();
        }
      }, mode === 'enrollment' ? 8000 : 5000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      setRecordingState(prev => ({ 
        ...prev, 
        isRecording: false, 
        error: 'Failed to start recording' 
      }));
      onError?.('Failed to start recording');
    }
  }, [recordingState.isRecording, mode, showVisualFeedback, updateAudioLevel, onError]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.stop();
      setRecordingState(prev => ({ ...prev, isRecording: false }));
      setIsListening(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [recordingState.isRecording]);

  // Process recorded audio data
  const processAudioData = useCallback(async (audioBlob: Blob) => {
    setRecordingState(prev => ({ ...prev, isProcessing: true }));

    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      if (mode === 'enrollment') {
        // Handle enrollment
        const request: BiometricEnrollmentRequest = {
          audioData: base64Audio,
          sessionNumber: enrollmentState.currentSession,
          utterance: currentPhrase,
          format: 'webm',
          deviceInfo: {
            deviceType: 'web_browser',
            browser: navigator.userAgent,
            os: navigator.platform,
            userAgent: navigator.userAgent
          }
        };

        const response = await fetch('/api/voice/biometric', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operation: 'enroll', ...request })
        });

        const result: BiometricEnrollmentResponse = await response.json();

        if (result.success) {
          setEnrollmentState(prev => ({
            ...prev,
            progress: result.progress,
            qualityScore: result.qualityScore,
            isComplete: result.enrollmentComplete,
            currentSession: result.enrollmentComplete ? prev.currentSession : prev.currentSession + 1
          }));

          if (result.enrollmentComplete) {
            onSuccess?.(result);
          } else {
            // Move to next phrase
            const nextPhraseIndex = enrollmentState.currentSession % ENROLLMENT_PHRASES.length;
            setCurrentPhrase(ENROLLMENT_PHRASES[nextPhraseIndex]);
          }
        } else {
          onError?.(result.error || 'Enrollment failed');
        }
      } else {
        // Handle authentication/verification
        const request: VoiceAuthenticationRequest = {
          audioData: base64Audio,
          challengeType: 'text_independent',
          livenessRequired: true,
          format: 'webm',
          context: context || {
            purpose: 'login',
            riskLevel: 'medium',
            deviceTrust: 'trusted'
          }
        };

        const endpoint = mode === 'authentication' ? 'authenticate' : 'verify';
        const response = await fetch('/api/voice/biometric', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operation: endpoint, ...request })
        });

        const result: VoiceAuthenticationResponse = await response.json();
        setAuthResult(result);

        if (result.success) {
          onSuccess?.(result);
        } else {
          onError?.(result.errorDetails?.message || 'Authentication failed');
          
          if (result.fallbackOptions && result.fallbackOptions.length > 0) {
            onFallback?.(result.fallbackOptions[0]);
          }
        }
      }

    } catch (error) {
      console.error('Failed to process audio:', error);
      onError?.('Failed to process audio');
    } finally {
      setRecordingState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [mode, currentPhrase, enrollmentState.currentSession, context, onSuccess, onError, onFallback]);

  // Render audio visualization
  const renderAudioVisualization = () => {
    if (!showVisualFeedback || !recordingState.isRecording) return null;

    return (
      <div className="flex items-center justify-center space-x-1 h-16 mb-4">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className={`w-1 bg-blue-500 rounded-full transition-all duration-100 ${
              recordingState.audioLevel > (i * 5) ? 'opacity-100' : 'opacity-20'
            }`}
            style={{ 
              height: `${Math.max(4, (recordingState.audioLevel / 100) * 60)}px` 
            }}
          />
        ))}
      </div>
    );
  };

  // Render enrollment progress
  const renderEnrollmentProgress = () => {
    if (mode !== 'enrollment') return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Session {enrollmentState.currentSession} of {enrollmentState.totalSessions}
          </span>
          <Badge variant={enrollmentState.isComplete ? 'default' : 'secondary'}>
            {enrollmentState.isComplete ? 'Complete' : 'In Progress'}
          </Badge>
        </div>
        
        <Progress value={enrollmentState.progress} className="h-2" />
        
        {enrollmentState.qualityScore > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span>Audio Quality:</span>
            <span className={`font-medium ${
              enrollmentState.qualityScore >= 80 ? 'text-green-600' :
              enrollmentState.qualityScore >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {enrollmentState.qualityScore}%
            </span>
          </div>
        )}

        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium mb-1">Please say:</p>
          <p className="text-sm text-blue-700 italic">"{currentPhrase}"</p>
        </div>
      </div>
    );
  };

  // Render authentication result
  const renderAuthResult = () => {
    if (!authResult || mode === 'enrollment') return null;

    const isSuccess = authResult.success;
    const confidence = authResult.confidence;

    return (
      <div className="space-y-4">
        <div className={`flex items-center space-x-2 p-3 rounded-lg ${
          isSuccess ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {isSuccess ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <XCircle className="h-5 w-5" />
          )}
          <span className="font-medium">
            {isSuccess ? 'Authentication Successful' : 'Authentication Failed'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Confidence:</span>
            <span className="font-medium ml-2">{confidence}%</span>
          </div>
          <div>
            <span className="text-gray-600">Risk Level:</span>
            <span className={`font-medium ml-2 ${
              authResult.securityAssessment.overallRisk === 'low' ? 'text-green-600' :
              authResult.securityAssessment.overallRisk === 'medium' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {authResult.securityAssessment.overallRisk.replace('_', ' ')}
            </span>
          </div>
        </div>

        {authResult.securityAssessment.behavioralFactors.stressLevel > 60 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Elevated stress detected. Consider additional verification if this was unexpected.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  // Render main interface
  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center space-x-2">
          {mode === 'enrollment' ? (
            <>
              <Shield className="h-5 w-5" />
              <span>Voice Enrollment</span>
            </>
          ) : mode === 'authentication' ? (
            <>
              <ShieldCheck className="h-5 w-5" />
              <span>Voice Authentication</span>
            </>
          ) : (
            <>
              <ShieldAlert className="h-5 w-5" />
              <span>Voice Verification</span>
            </>
          )}
        </CardTitle>
        <CardDescription>
          {mode === 'enrollment' 
            ? 'Record your voice to set up secure authentication'
            : 'Speak to authenticate your identity'
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!recordingState.hasPermission ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Microphone permission is required for voice authentication.
              Please allow access and refresh the page.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Audio Visualization */}
            {renderAudioVisualization()}

            {/* Status Display */}
            <div className="text-center">
              {recordingState.isRecording ? (
                <div className="flex items-center justify-center space-x-2 text-red-600">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                  <span>Recording... {recordingState.duration.toFixed(1)}s</span>
                </div>
              ) : recordingState.isProcessing ? (
                <div className="flex items-center justify-center space-x-2 text-blue-600">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : isListening ? (
                <div className="flex items-center justify-center space-x-2 text-green-600">
                  <Volume2 className="h-4 w-4" />
                  <span>Listening...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2 text-gray-600">
                  <VolumeX className="h-4 w-4" />
                  <span>Ready</span>
                </div>
              )}
            </div>

            {/* Mode-specific content */}
            {mode === 'enrollment' && renderEnrollmentProgress()}
            {(mode === 'authentication' || mode === 'verification') && renderAuthResult()}

            {/* Error display */}
            {recordingState.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{recordingState.error}</AlertDescription>
              </Alert>
            )}

            {/* Controls */}
            <div className="flex justify-center space-x-2">
              <Button
                onClick={recordingState.isRecording ? stopRecording : startRecording}
                disabled={recordingState.isProcessing || !recordingState.hasPermission}
                variant={recordingState.isRecording ? "destructive" : "default"}
                size="lg"
              >
                {recordingState.isRecording ? (
                  <>
                    <MicOff className="h-4 w-4 mr-2" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Start Recording
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            {/* Settings (if shown) */}
            {showSettings && (
              <div className="border-t pt-4 space-y-2">
                <div className="text-sm text-gray-600">
                  <p>• Ensure you're in a quiet environment</p>
                  <p>• Speak clearly and naturally</p>
                  <p>• Keep the microphone close to your mouth</p>
                  {mode === 'enrollment' && (
                    <p>• Complete all {enrollmentState.totalSessions} sessions for best security</p>
                  )}
                </div>
              </div>
            )}

            {/* Fallback options */}
            {authResult && !authResult.success && authResult.fallbackOptions && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Alternative authentication:</p>
                {authResult.fallbackOptions.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => onFallback?.(option)}
                    className="w-full"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Use {option.method.replace('_', ' ')} ({option.estimatedTime}s)
                  </Button>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}