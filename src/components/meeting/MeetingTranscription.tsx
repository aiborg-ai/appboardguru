'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  Download, 
  Users, 
  Clock,
  FileText,
  Brain,
  Loader2,
  CheckCircle,
  AlertCircle,
  Volume2,
  VolumeX
} from 'lucide-react'

interface Participant {
  id: string
  name: string
  email?: string
}

interface TranscriptionSegment {
  id: string
  text: string
  startTime: number
  endTime: number
  speaker?: {
    id: string
    name: string
    confidence: number
  }
  confidence: number
  language?: string
}

interface MeetingTranscriptionProps {
  organizationId: string
  meetingTitle: string
  participants: Participant[]
  onTranscriptionComplete?: (transcriptionId: string) => void
}

type TranscriptionStatus = 'idle' | 'starting' | 'recording' | 'processing' | 'completed' | 'error'

export function MeetingTranscription({
  organizationId,
  meetingTitle,
  participants,
  onTranscriptionComplete
}: MeetingTranscriptionProps) {
  const [status, setStatus] = useState<TranscriptionStatus>('idle')
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [segments, setSegments] = useState<TranscriptionSegment[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const chunkIndexRef = useRef(0)

  // Format time display
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Start transcription session
  const startTranscription = async () => {
    try {
      setStatus('starting')
      setError(null)

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      })

      streamRef.current = stream

      // Start transcription session on server
      const response = await fetch('/api/meetings/transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          title: meetingTitle,
          participants,
          expectedLanguages: ['en']
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start transcription')
      }

      const result = await response.json()
      setTranscriptionId(result.transcriptionId)
      setSessionId(result.sessionId)

      // Setup media recorder for real-time streaming
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      mediaRecorderRef.current = mediaRecorder
      
      // Process audio chunks every 3 seconds
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && sessionId && transcriptionId) {
          await processAudioChunk(event.data, result.sessionId, result.transcriptionId)
        }
      }

      // Start recording with 3-second chunks
      mediaRecorder.start(3000)
      setIsRecording(true)
      setStatus('recording')

      // Start recording timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

    } catch (error) {
      console.error('Error starting transcription:', error)
      setError(error instanceof Error ? error.message : 'Failed to start transcription')
      setStatus('error')
      cleanup()
    }
  }

  // Process audio chunk for transcription
  const processAudioChunk = async (audioBlob: Blob, sessionId: string, transcriptionId: string) => {
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob)
      formData.append('transcriptionId', transcriptionId)
      formData.append('sessionId', sessionId)
      formData.append('chunkIndex', chunkIndexRef.current.toString())
      formData.append('isLiveStream', 'true')

      chunkIndexRef.current++

      const response = await fetch('/api/meetings/transcription/stream', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.transcription) {
          // Add new transcription segment to UI
          const newSegment: TranscriptionSegment = {
            id: result.transcription.segmentId,
            text: result.transcription.text,
            startTime: Date.now() - 3000, // Approximate based on chunk time
            endTime: Date.now(),
            speaker: result.transcription.speakerId ? {
              id: result.transcription.speakerId,
              name: participants.find(p => p.id === result.transcription.speakerId)?.name || 'Unknown',
              confidence: 0.8
            } : undefined,
            confidence: result.transcription.confidence,
            language: result.transcription.language
          }

          setSegments(prev => [...prev, newSegment])
        }
      }
    } catch (error) {
      console.warn('Error processing audio chunk:', error)
    }
  }

  // Stop transcription
  const stopTranscription = async () => {
    setStatus('processing')
    cleanup()

    if (transcriptionId) {
      // Generate meeting minutes
      try {
        const response = await fetch('/api/meetings/transcription/generate-minutes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transcriptionId,
            summaryStyle: 'detailed'
          }),
        })

        if (response.ok) {
          setStatus('completed')
          onTranscriptionComplete?.(transcriptionId)
        } else {
          throw new Error('Failed to generate meeting minutes')
        }
      } catch (error) {
        console.error('Error generating minutes:', error)
        setStatus('error')
        setError('Failed to generate meeting minutes')
      }
    }
  }

  // Cleanup resources
  const cleanup = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    setIsRecording(false)
  }

  // Toggle mute
  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }

  // Export transcription
  const exportTranscription = async (format: 'txt' | 'json') => {
    if (!transcriptionId) return

    try {
      const response = await fetch(`/api/meetings/transcription/export?id=${transcriptionId}&format=${format}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${meetingTitle.replace(/\s+/g, '_')}_transcript.${format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-2">{meetingTitle}</h2>
            <div className="flex items-center space-x-4 text-blue-100">
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{participants.length} participants</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{formatTime(recordingTime)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {status === 'recording' && (
              <div className="flex items-center space-x-1 bg-red-500 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">LIVE</span>
              </div>
            )}
            
            <div className="flex items-center space-x-1 bg-white/20 px-3 py-1 rounded-full">
              <Brain className="h-4 w-4" />
              <span className="text-sm font-medium">AI Powered</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {status === 'idle' && (
              <button
                onClick={startTranscription}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <Mic className="h-5 w-5" />
                <span>Start Transcription</span>
              </button>
            )}

            {status === 'starting' && (
              <button
                disabled
                className="flex items-center space-x-2 bg-gray-400 text-white px-6 py-3 rounded-lg font-medium"
              >
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Starting...</span>
              </button>
            )}

            {status === 'recording' && (
              <>
                <button
                  onClick={stopTranscription}
                  className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  <Square className="h-5 w-5" />
                  <span>Stop & Generate Minutes</span>
                </button>

                <button
                  onClick={toggleMute}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                    isMuted 
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>
              </>
            )}

            {status === 'processing' && (
              <div className="flex items-center space-x-2 text-blue-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="font-medium">Generating AI Meeting Minutes...</span>
              </div>
            )}

            {status === 'completed' && (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Transcription Complete</span>
              </div>
            )}

            {status === 'error' && (
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Error: {error}</span>
              </div>
            )}
          </div>

          {/* Export buttons */}
          {(status === 'completed' || segments.length > 0) && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => exportTranscription('txt')}
                className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>TXT</span>
              </button>
              <button
                onClick={() => exportTranscription('json')}
                className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>JSON</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Live Transcription Display */}
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <FileText className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Live Transcription</h3>
          {segments.length > 0 && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
              {segments.length} segments
            </span>
          )}
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {segments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mic className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500">
                {status === 'recording' 
                  ? 'Listening for speech...' 
                  : 'Start transcription to see live results'}
              </p>
            </div>
          ) : (
            segments.map((segment, index) => (
              <div key={segment.id} className="flex space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    {segment.speaker?.name?.charAt(0) || '?'}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-900">
                      {segment.speaker?.name || 'Unknown Speaker'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(segment.startTime).toLocaleTimeString()}
                    </span>
                    <span className="text-xs text-gray-400">
                      {Math.round(segment.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-gray-700">{segment.text}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}