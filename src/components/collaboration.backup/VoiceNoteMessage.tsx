'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useVoiceRecording } from '@/hooks/useVoiceRecording'
import {
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  RotateCcw,
  Send,
  Download,
  Trash2,
  Clock,
  User
} from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Card, CardContent } from '@/components/molecules/cards/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/atoms/display/avatar'
import { Badge } from '@/components/atoms/display/badge'
import { Slider } from '@/features/shared/ui/slider'
import { formatDistanceToNow, format } from 'date-fns'

interface VoiceNoteMessageProps {
  messageId?: string
  audioUrl?: string
  duration?: number
  transcript?: string
  sender?: {
    id: string
    name: string
    avatar?: string
  }
  createdAt?: Date
  waveformData?: number[]
  isOwn?: boolean
  onSend?: (audioBlob: Blob, duration: number, transcript?: string) => void
  onDelete?: (messageId: string) => void
  className?: string
}

interface VoiceNoteRecorderProps {
  onSend: (audioBlob: Blob, duration: number, transcript?: string) => void
  onCancel?: () => void
  className?: string
}

// Voice Note Recorder Component
export function VoiceNoteRecorder({ onSend, onCancel, className = '' }: VoiceNoteRecorderProps) {
  const {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    audioUrl,
    waveformData,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    transcribeAudio
  } = useVoiceRecording({
    maxDuration: 300, // 5 minutes max
    enableTranscription: true
  })

  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcript, setTranscript] = useState<string>()
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(1)
  const audioRef = useRef<HTMLAudioElement>(null)

  const handleStartRecording = useCallback(async () => {
    try {
      await startRecording()
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  }, [startRecording])

  const handleStopRecording = useCallback(() => {
    stopRecording()
  }, [stopRecording])

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current || !audioUrl) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }, [isPlaying, audioUrl])

  const handleSeek = useCallback((newTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }, [])

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }, [])

  const handleSend = useCallback(async () => {
    if (!audioBlob) return

    // Transcribe if enabled
    if (transcribeAudio) {
      setIsTranscribing(true)
      try {
        const transcription = await transcribeAudio(audioBlob)
        setTranscript(transcription)
        onSend(audioBlob, duration, transcription)
      } catch (error) {
        console.error('Transcription failed:', error)
        onSend(audioBlob, duration)
      } finally {
        setIsTranscribing(false)
      }
    } else {
      onSend(audioBlob, duration)
    }

    // Clear recording
    clearRecording()
  }, [audioBlob, duration, transcribeAudio, onSend, clearRecording])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current
      
      const updateTime = () => setCurrentTime(audio.currentTime)
      const handleEnded = () => {
        setIsPlaying(false)
        setCurrentTime(0)
      }

      audio.addEventListener('timeupdate', updateTime)
      audio.addEventListener('ended', handleEnded)

      return () => {
        audio.removeEventListener('timeupdate', updateTime)
        audio.removeEventListener('ended', handleEnded)
      }
    }
  }, [audioUrl])

  return (
    <Card className={`w-full max-w-md ${className}`}>
      <CardContent className="p-4 space-y-4">
        {/* Recording Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              isRecording && !isPaused ? 'bg-red-500 animate-pulse' : 
              isPaused ? 'bg-yellow-500' : 
              'bg-gray-300'
            }`} />
            <span className="text-sm font-medium text-gray-700">
              {isRecording ? (isPaused ? 'Paused' : 'Recording') : 'Ready'}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            {formatTime(duration)}
          </div>
        </div>

        {/* Waveform Visualization */}
        <div className="h-16 bg-gray-100 rounded-lg flex items-center justify-center">
          {waveformData && waveformData.length > 0 ? (
            <div className="flex items-center space-x-0.5 h-full px-2">
              {waveformData.map((amplitude, index) => (
                <div
                  key={index}
                  className={`w-1 bg-blue-500 rounded-full transition-all duration-100 ${
                    isRecording && !isPaused ? 'animate-pulse' : ''
                  }`}
                  style={{
                    height: `${Math.max(2, amplitude * 100)}%`,
                    opacity: audioUrl && currentTime > 0 && index < (currentTime / duration) * waveformData.length ? 1 : 0.5
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-gray-500">
              <Volume2 className="h-8 w-8" />
              <span className="text-sm">Voice waveform will appear here</span>
            </div>
          )}
        </div>

        {/* Playback Controls (when audio exists) */}
        {audioUrl && (
          <div className="space-y-3">
            <audio
              ref={audioRef}
              src={audioUrl}
              preload="metadata"
              style={{ display: 'none' }}
            />
            
            {/* Playback Progress */}
            <div className="space-y-2">
              <Slider
                value={[currentTime]}
                max={duration}
                step={0.1}
                onValueChange={([value]) => handleSeek(value)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Playback and Volume Controls */}
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlayPause}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              
              <div className="flex items-center space-x-2 flex-1">
                <VolumeX className="h-4 w-4 text-gray-400" />
                <Slider
                  value={[volume]}
                  max={1}
                  step={0.1}
                  onValueChange={([value]) => handleVolumeChange(value)}
                  className="flex-1"
                />
                <Volume2 className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        )}

        {/* Transcription Display */}
        {(transcript || isTranscribing) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <User className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Transcription</span>
              {isTranscribing && (
                <Badge variant="secondary" className="text-xs">
                  Processing...
                </Badge>
              )}
            </div>
            <p className="text-sm text-blue-700">
              {isTranscribing ? 'Transcribing audio...' : transcript}
            </p>
          </div>
        )}

        {/* Recording Controls */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {!isRecording && !audioUrl ? (
              <Button onClick={handleStartRecording}>
                <Mic className="h-4 w-4 mr-2" />
                Record
              </Button>
            ) : isRecording ? (
              <>
                <Button
                  variant="outline"
                  onClick={isPaused ? resumeRecording : pauseRecording}
                >
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </Button>
                <Button variant="destructive" onClick={handleStopRecording}>
                  <Square className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={clearRecording}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button onClick={handleStartRecording}>
                  <Mic className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          <div className="flex space-x-2">
            {onCancel && (
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
            {audioUrl && (
              <Button 
                onClick={handleSend}
                disabled={isTranscribing}
              >
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Voice Note Message Display Component
export function VoiceNoteMessage({
  messageId,
  audioUrl,
  duration = 0,
  transcript,
  sender,
  createdAt,
  waveformData,
  isOwn = false,
  onDelete,
  className = ''
}: VoiceNoteMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(1)
  const [showTranscript, setShowTranscript] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current || !audioUrl) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }, [isPlaying, audioUrl])

  const handleSeek = useCallback((newTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }, [])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current
      
      const updateTime = () => setCurrentTime(audio.currentTime)
      const handleEnded = () => {
        setIsPlaying(false)
        setCurrentTime(0)
      }

      audio.addEventListener('timeupdate', updateTime)
      audio.addEventListener('ended', handleEnded)

      return () => {
        audio.removeEventListener('timeupdate', updateTime)
        audio.removeEventListener('ended', handleEnded)
      }
    }
  }, [audioUrl])

  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${className}`}>
      {/* Avatar */}
      {!isOwn && sender && (
        <Avatar className="h-8 w-8 mt-1">
          <AvatarImage src={sender.avatar} />
          <AvatarFallback className="text-xs">
            {sender.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Voice Message */}
      <div className={`flex-1 max-w-[80%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender Info */}
        {!isOwn && sender && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-700">
              {sender.name}
            </span>
            {createdAt && (
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(createdAt, { addSuffix: true })}
              </span>
            )}
          </div>
        )}

        {/* Voice Message Card */}
        <Card className={`${isOwn ? 'ml-auto' : ''}`}>
          <CardContent className="p-3 space-y-3">
            {/* Audio Element */}
            {audioUrl && (
              <audio
                ref={audioRef}
                src={audioUrl}
                preload="metadata"
                style={{ display: 'none' }}
              />
            )}

            {/* Waveform and Controls */}
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePlayPause}
                className="p-2"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>

              {/* Waveform */}
              <div className="flex-1 h-8 flex items-center">
                {waveformData && waveformData.length > 0 ? (
                  <div className="flex items-center space-x-0.5 h-full">
                    {waveformData.map((amplitude, index) => (
                      <div
                        key={index}
                        className="w-1 bg-blue-500 rounded-full transition-all duration-100"
                        style={{
                          height: `${Math.max(4, amplitude * 100)}%`,
                          opacity: currentTime > 0 && index < (currentTime / duration) * waveformData.length ? 1 : 0.3
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="w-full h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-2 bg-blue-500 rounded-full transition-all duration-100"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-500 min-w-[3rem] text-right">
                {formatTime(isPlaying ? currentTime : duration)}
              </div>
            </div>

            {/* Additional Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {transcript && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="text-xs px-2 py-1 h-6"
                  >
                    <User className="h-3 w-3 mr-1" />
                    {showTranscript ? 'Hide' : 'Show'} Text
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs px-2 py-1 h-6"
                >
                  <Download className="h-3 w-3" />
                </Button>
              </div>

              {isOwn && onDelete && messageId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(messageId)}
                  className="text-xs px-2 py-1 h-6 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Transcript */}
            {showTranscript && transcript && (
              <div className="bg-gray-50 border border-gray-200 rounded p-2">
                <p className="text-sm text-gray-700">{transcript}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Own Message Timestamp */}
        {isOwn && createdAt && (
          <div className="text-xs text-gray-500 mt-1 text-right">
            {format(createdAt, 'HH:mm')}
          </div>
        )}
      </div>
    </div>
  )
}