/**
 * Voice Annotation Recorder Component
 * Records voice notes for PDF annotations with transcription integration
 */

'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/atoms/Button'
import { Icon } from '@/components/atoms/Icon'
import { cn } from '@/lib/utils'
import { Mic, MicOff, Square, Play, Pause, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export interface VoiceAnnotationRecorderProps {
  onRecordingComplete: (audioData: {
    audioBlob: Blob
    audioUrl: string
    duration: number
    transcription?: string
  }) => void
  onError?: (error: Error) => void
  onStart?: () => void
  onStop?: () => void
  autoTranscribe?: boolean
  maxDuration?: number // in seconds
  className?: string
  disabled?: boolean
}

type RecordingState = 'idle' | 'recording' | 'processing' | 'completed' | 'error'

export const VoiceAnnotationRecorder = React.memo<VoiceAnnotationRecorderProps>(function VoiceAnnotationRecorder({
  onRecordingComplete,
  onError,
  onStart,
  onStop,
  autoTranscribe = true,
  maxDuration = 300, // 5 minutes default
  className,
  disabled = false
}) {
  // State
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [duration, setDuration] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [recordedAudio, setRecordedAudio] = useState<{
    blob: Blob
    url: string
    transcription?: string
  } | null>(null)
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      mediaRecorderRef.current = null
    }
    
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current = null
    }
  }, [])

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      })

      streamRef.current = stream
      audioChunksRef.current = []

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/wav'
      })

      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) {
          setRecordingState('error')
          onError?.(new Error('No audio data recorded'))
          return
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType
        })
        const audioUrl = URL.createObjectURL(audioBlob)

        setRecordedAudio({ blob: audioBlob, url: audioUrl })

        if (autoTranscribe) {
          setRecordingState('processing')
          try {
            const transcription = await transcribeAudio(audioBlob)
            const finalAudio = { blob: audioBlob, url: audioUrl, transcription }
            setRecordedAudio(finalAudio)
            setRecordingState('completed')
          } catch (error) {
            // Still complete without transcription
            setRecordingState('completed')
            console.warn('Transcription failed:', error)
          }
        } else {
          setRecordingState('completed')
        }
      }

      mediaRecorder.start(250) // Collect data every 250ms
      setRecordingState('recording')
      setDuration(0)
      onStart?.()

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1
          if (newDuration >= maxDuration) {
            stopRecording()
          }
          return newDuration
        })
      }, 1000)

    } catch (error) {
      setRecordingState('error')
      onError?.(error instanceof Error ? error : new Error('Failed to start recording'))
    }
  }, [autoTranscribe, maxDuration, onStart, onError])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    onStop?.()
  }, [onStop])

  // Transcribe audio using existing voice API
  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
    const reader = new FileReader()
    
    const base64Audio = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const result = reader.result as string
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(audioBlob)
    })

    const response = await fetch('/api/voice/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio: base64Audio,
        format: audioBlob.type.includes('webm') ? 'webm' : 'wav'
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Transcription failed')
    }

    return data.text?.trim() || ''
  }, [])

  // Play recorded audio
  const togglePlayback = useCallback(() => {
    if (!recordedAudio) return

    if (isPlaying) {
      audioElementRef.current?.pause()
    } else {
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio(recordedAudio.url)
        audioElementRef.current.onended = () => setIsPlaying(false)
        audioElementRef.current.onerror = () => {
          setIsPlaying(false)
          onError?.(new Error('Failed to play audio'))
        }
      }
      audioElementRef.current.play()
    }
    
    setIsPlaying(!isPlaying)
  }, [recordedAudio, isPlaying, onError])

  // Save recording
  const saveRecording = useCallback(() => {
    if (!recordedAudio) return

    onRecordingComplete({
      audioBlob: recordedAudio.blob,
      audioUrl: recordedAudio.url,
      duration,
      transcription: recordedAudio.transcription
    })

    // Reset state
    setRecordingState('idle')
    setDuration(0)
    setRecordedAudio(null)
    setIsPlaying(false)
  }, [recordedAudio, duration, onRecordingComplete])

  // Cancel recording
  const cancelRecording = useCallback(() => {
    cleanup()
    setRecordingState('idle')
    setDuration(0)
    setRecordedAudio(null)
    setIsPlaying(false)
    
    // Clean up blob URL
    if (recordedAudio?.url) {
      URL.revokeObjectURL(recordedAudio.url)
    }
  }, [cleanup, recordedAudio])

  // Format duration
  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
      if (recordedAudio?.url) {
        URL.revokeObjectURL(recordedAudio.url)
      }
    }
  }, [cleanup, recordedAudio])

  const isRecording = recordingState === 'recording'
  const isProcessing = recordingState === 'processing'
  const isCompleted = recordingState === 'completed'
  const hasError = recordingState === 'error'

  return (
    <div className={cn('flex flex-col space-y-3 p-4 bg-white rounded-lg shadow-sm border', className)}>
      {/* Recording Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isRecording && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-red-600">Recording</span>
            </div>
          )}
          {isProcessing && (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-sm font-medium text-blue-600">Processing</span>
            </div>
          )}
          {isCompleted && (
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-600">Ready</span>
            </div>
          )}
          {hasError && (
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-600">Error</span>
            </div>
          )}
        </div>

        {/* Duration */}
        <div className="text-sm text-gray-500 font-mono">
          {formatDuration(duration)}
          {maxDuration && (
            <span className="text-gray-400"> / {formatDuration(maxDuration)}</span>
          )}
        </div>
      </div>

      {/* Recording Controls */}
      <div className="flex items-center justify-center space-x-3">
        {recordingState === 'idle' && (
          <Button
            onClick={startRecording}
            disabled={disabled}
            variant="outline"
            size="lg"
            className="flex items-center space-x-2 hover:bg-red-50 hover:border-red-300"
          >
            <Mic className="h-5 w-5 text-red-500" />
            <span>Start Recording</span>
          </Button>
        )}

        {isRecording && (
          <Button
            onClick={stopRecording}
            variant="outline"
            size="lg"
            className="flex items-center space-x-2 bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
          >
            <Square className="h-4 w-4 fill-current" />
            <span>Stop</span>
          </Button>
        )}

        {isProcessing && (
          <Button disabled variant="outline" size="lg" className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing...</span>
          </Button>
        )}

        {(isCompleted || hasError) && (
          <>
            <Button
              onClick={cancelRecording}
              variant="outline"
              size="sm"
              className="text-gray-600 hover:text-gray-800"
            >
              Cancel
            </Button>
            
            {recordedAudio && (
              <Button
                onClick={togglePlayback}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </Button>
            )}

            <Button
              onClick={saveRecording}
              disabled={!recordedAudio || hasError}
              variant="default"
              size="lg"
              className="flex items-center space-x-2"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Save Voice Note</span>
            </Button>
          </>
        )}
      </div>

      {/* Transcription Preview */}
      {isCompleted && recordedAudio?.transcription && (
        <div className="mt-3 p-3 bg-gray-50 rounded-md">
          <div className="text-xs text-gray-500 mb-1">Transcription:</div>
          <div className="text-sm text-gray-700">{recordedAudio.transcription}</div>
        </div>
      )}

      {/* Progress Bar */}
      {maxDuration && (isRecording || duration > 0) && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              duration >= maxDuration * 0.9 ? 'bg-red-500' : 'bg-blue-500'
            )}
            style={{ width: `${Math.min((duration / maxDuration) * 100, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
})

VoiceAnnotationRecorder.displayName = 'VoiceAnnotationRecorder'