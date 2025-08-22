"use client";

import * as React from 'react';
import { Button, type ButtonProps } from '@/components/atoms/Button';
import { Icon } from '@/components/atoms/Icon';
import { useOptimizedCallback, useOptimizedMemo } from '@/components/hooks';
import { cn } from '@/lib/utils';

export interface VoiceInputButtonProps extends Omit<ButtonProps, 'onClick' | 'children'> {
  onTranscription: (text: string) => void;
  onError?: (error: Error) => void;
  onStart?: () => void;
  onStop?: () => void;
  showLabel?: boolean;
  pulseWhenRecording?: boolean;
}

// Custom hook for voice input logic with proper error handling
const useVoiceInput = () => {
  const [isRecording, setIsRecording] = React.useState(false);
  const [isTranscribing, setIsTranscribing] = React.useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);

  const cleanup = React.useCallback(() => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      // Clean up stream tracks
      const stream = mediaRecorderRef.current.stream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
    setIsRecording(false);
    setIsTranscribing(false);
  }, []);

  const startRecording = useOptimizedCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      return false;
    }
  }, [], 'startRecording');

  const stopRecording = useOptimizedCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        resolve(null);
        return;
      }

      const mediaRecorder = mediaRecorderRef.current;
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        
        // Clean up stream
        if (mediaRecorder.stream) {
          mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        
        resolve(audioBlob);
      };

      mediaRecorder.stop();
      setIsRecording(false);
    });
  }, [isRecording], 'stopRecording');

  const transcribeAudio = useOptimizedCallback(async (audioBlob: Blob): Promise<string> => {
    setIsTranscribing(true);
    
    try {
      const reader = new FileReader();
      
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64Audio,
          format: audioBlob.type.includes('webm') ? 'webm' : 'wav',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Transcription failed');
      }

      return data.text?.trim() || '';
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    } finally {
      setIsTranscribing(false);
    }
  }, [], 'transcribeAudio');

  // Cleanup on unmount
  React.useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    transcribeAudio,
    cleanup,
  };
};

export const VoiceInputButton = React.memo<VoiceInputButtonProps>(({
  onTranscription,
  onError,
  onStart,
  onStop,
  showLabel = false,
  pulseWhenRecording = true,
  disabled = false,
  size = 'default',
  variant = 'outline',
  className,
  ...props
}) => {
  const {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    transcribeAudio,
  } = useVoiceInput();

  const handleClick = useOptimizedCallback(async () => {
    if (isRecording) {
      onStop?.();
      try {
        const audioBlob = await stopRecording();
        if (audioBlob) {
          const text = await transcribeAudio(audioBlob);
          if (text) {
            onTranscription(text);
          }
        }
      } catch (error) {
        onError?.(error as Error);
      }
    } else {
      onStart?.();
      const success = await startRecording();
      if (!success) {
        onError?.(new Error('Failed to start recording'));
      }
    }
  }, [
    isRecording,
    onStart,
    onStop,
    onTranscription,
    onError,
    startRecording,
    stopRecording,
    transcribeAudio,
  ], 'handleClick');

  const isLoading = isTranscribing;
  const isActive = isRecording || isTranscribing;

  const buttonIcon = useOptimizedMemo(() => {
    if (isLoading) {
      return <Icon name="Loader2" size="sm" className="animate-spin" />;
    } else if (isRecording) {
      return <Icon name="MicOff" size="sm" />;
    } else {
      return <Icon name="Mic" size="sm" />;
    }
  }, [isLoading, isRecording], 'buttonIcon');

  const buttonLabel = useOptimizedMemo(() => {
    if (isRecording) return 'Stop';
    if (isTranscribing) return 'Processing...';
    return 'Voice';
  }, [isRecording, isTranscribing], 'buttonLabel');

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isLoading}
      variant={variant}
      size={size}
      className={cn(
        'transition-all duration-200',
        isRecording && [
          'bg-red-100 border-red-300 text-red-700 hover:bg-red-200',
          pulseWhenRecording && 'animate-pulse'
        ],
        isTranscribing && 'opacity-75',
        className
      )}
      aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
      aria-pressed={isActive}
      {...props}
    >
      {buttonIcon}
      {showLabel && size !== 'icon' && (
        <span className="ml-2">
          {buttonLabel}
        </span>
      )}
    </Button>
  );
});

VoiceInputButton.displayName = "VoiceInputButton";