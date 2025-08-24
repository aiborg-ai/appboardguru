/**
 * VoiceAnnotationRecorder Component
 * Records voice annotations for PDF documents with transcription
 */

'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/cards/card'
import { Badge } from '@/components/atoms/display/badge'
import { 
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  RotateCcw,
  Send,
  X,
  Volume2,
  Loader2,
  AlertCircle
} from 'lucide-react'

interface VoiceAnnotationRecorderProps {
  onSave: (audioBlob: Blob, transcript: string, duration: number) => Promise<void>
  onCancel: () => void
  maxDuration?: number // in seconds
  autoTranscribe?: boolean
  className?: string
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'completed' | 'playing'
type TranscriptionState = 'idle' | 'transcribing' | 'completed' | 'error'

export const VoiceAnnotationRecorder = React.memo<VoiceAnnotationRecorderProps>(function VoiceAnnotationRecorder({
  onSave,
  onCancel,
  maxDuration = 300, // 5 minutes default
  autoTranscribe = true,
  className
}) {
  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [transcriptionState, setTranscriptionState] = useState<TranscriptionState>('idle')
  const [duration, setDuration] = useState<number>(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [transcript, setTranscript] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  // Initialize media recorder
  const initializeRecorder = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm'
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)
        setRecordingState('completed')
        
        // Stop all tracks to free up the microphone
        stream.getTracks().forEach(track => track.stop())

        // Auto-transcribe if enabled
        if (autoTranscribe) {
          transcribeAudio(audioBlob)
        }
      }

      mediaRecorderRef.current = mediaRecorder
      setError(null)
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access microphone'
      setError(`Microphone access denied: ${errorMessage}`)
      return false
    }
  }, [autoTranscribe])

  // Start recording
  const startRecording = useCallback(async () => {
    const initialized = await initializeRecorder()
    if (!initialized) return

    audioChunksRef.current = []
    setDuration(0)
    setAudioBlob(null)
    setTranscript('')
    setTranscriptionState('idle')

    mediaRecorderRef.current?.start(100) // Record in 100ms chunks
    setRecordingState('recording')

    // Start duration timer
    intervalRef.current = setInterval(() => {
      setDuration(prev => {
        const newDuration = prev + 0.1
        // Auto-stop at max duration
        if (newDuration >= maxDuration) {
          stopRecording()
          return maxDuration
        }
        return newDuration
      })
    }, 100)
  }, [initializeRecorder, maxDuration])

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause()
      setRecordingState('paused')
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume()
      setRecordingState('recording')
      
      // Resume timer
      intervalRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 0.1
          if (newDuration >= maxDuration) {
            stopRecording()
            return maxDuration
          }
          return newDuration
        })
      }, 100)
    }
  }, [maxDuration])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Reset recording
  const resetRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    setRecordingState('idle')
    setTranscriptionState('idle')
    setDuration(0)
    setAudioBlob(null)
    setTranscript('')
    setError(null)
    audioChunksRef.current = []
  }, [])

  // Transcribe audio using OpenRouter API
  const transcribeAudio = useCallback(async (blob: Blob) => {
    setTranscriptionState('transcribing')
    
    try {
      const formData = new FormData()
      formData.append('audio', blob, 'voice-annotation.webm')
      formData.append('model', 'openai/whisper-large-v3')

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success) {
        setTranscript(data.transcript || '')
        setTranscriptionState('completed')
      } else {
        throw new Error(data.error || 'Transcription failed')
      }
    } catch (err) {
      console.error('Transcription error:', err)
      setTranscriptionState('error')
      setError(err instanceof Error ? err.message : 'Transcription failed')
    }
  }, [])

  // Play/pause audio
  const togglePlayback = useCallback(() => {
    if (!audioBlob) return

    if (recordingState === 'playing') {
      audioRef.current?.pause()
      setRecordingState('completed')
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(URL.createObjectURL(audioBlob))
        audioRef.current.onended = () => setRecordingState('completed')
      }
      audioRef.current.play()
      setRecordingState('playing')
    }
  }, [audioBlob, recordingState])

  // Save annotation
  const handleSave = useCallback(async () => {
    if (!audioBlob) return

    try {
      await onSave(audioBlob, transcript, duration)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save voice annotation')
    }
  }, [audioBlob, transcript, duration, onSave])

  // Format duration display
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get recording button color based on state
  const getRecordingButtonVariant = () => {
    switch (recordingState) {
      case 'recording': return 'destructive'
      case 'paused': return 'secondary'
      default: return 'default'
    }
  }

  return (
    <Card className={cn('p-4 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Mic className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-medium">Voice Annotation</h3>
          {recordingState === 'recording' && (
            <Badge variant="destructive" className="animate-pulse">
              Recording
            </Badge>
          )}
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Recording controls */}
      <div className="flex items-center justify-center space-x-3">
        {recordingState === 'idle' && (
          <Button
            onClick={startRecording}
            className="w-16 h-16 rounded-full"
            disabled={!!error}
          >
            <Mic className="h-6 w-6" />
          </Button>
        )}

        {(recordingState === 'recording' || recordingState === 'paused') && (
          <>
            <Button
              onClick={recordingState === 'recording' ? pauseRecording : resumeRecording}
              variant={getRecordingButtonVariant()}
              className="w-12 h-12 rounded-full"
            >
              {recordingState === 'recording' ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>
            
            <Button
              onClick={stopRecording}
              variant="secondary"
              className="w-12 h-12 rounded-full"
            >
              <Square className="h-5 w-5" />
            </Button>
          </>
        )}

        {(recordingState === 'completed' || recordingState === 'playing') && audioBlob && (
          <>
            <Button
              onClick={togglePlayback}
              variant="secondary"
              className="w-12 h-12 rounded-full"
            >
              {recordingState === 'playing' ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            
            <Button
              onClick={resetRecording}
              variant="ghost"
              className="w-10 h-10 rounded-full"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Duration display */}
      <div className="text-center">
        <div className="text-2xl font-mono font-bold text-gray-900">
          {formatDuration(duration)}
        </div>
        <div className="text-xs text-gray-500">
          Max: {formatDuration(maxDuration)}
        </div>
      </div>

      {/* Waveform visualization placeholder */}
      {(recordingState === 'recording' || recordingState === 'paused') && (
        <div className="h-8 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="flex space-x-1">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-blue-600 rounded animate-pulse"
                style={{
                  height: `${Math.random() * 20 + 4}px`,
                  animationDelay: `${i * 50}ms`
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Transcription */}
      {transcriptionState !== 'idle' && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Transcription</span>
            {transcriptionState === 'transcribing' && (
              <div className="flex items-center space-x-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs text-gray-500">Transcribing...</span>
              </div>
            )}
          </div>
          
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            {transcriptionState === 'transcribing' && (
              <div className="text-gray-500 italic">Processing audio...</div>
            )}
            {transcriptionState === 'completed' && (
              <div className="text-gray-900">
                {transcript || 'No speech detected'}
              </div>
            )}
            {transcriptionState === 'error' && (
              <div className="text-red-600">Transcription failed</div>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {recordingState === 'completed' && (
        <div className="flex items-center justify-end space-x-2 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetRecording}
          >
            Start Over
          </Button>
          <Button
            onClick={handleSave}
            disabled={!audioBlob}
            className="flex items-center space-x-1"
          >
            <Send className="h-4 w-4" />
            <span>Save Voice Note</span>
          </Button>
        </div>
      )}
    </Card>
  )
})

VoiceAnnotationRecorder.displayName = 'VoiceAnnotationRecorder'