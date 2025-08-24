/**
 * Voice Annotation Player Component
 * Plays back voice annotations with transcription display and controls
 */

'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/atoms/Button'
import { Icon } from '@/components/atoms/Icon'
import { cn } from '@/lib/utils'
import { Play, Pause, RotateCcw, Volume2, VolumeX, Clock, FileText, User } from 'lucide-react'
import { AssetAnnotation } from '@/types/annotation-types'

export interface VoiceAnnotationPlayerProps {
  annotation: AssetAnnotation
  autoPlay?: boolean
  showTranscription?: boolean
  showUserInfo?: boolean
  showControls?: boolean
  compact?: boolean
  className?: string
  onPlaybackStart?: () => void
  onPlaybackEnd?: () => void
  onError?: (error: Error) => void
}

export const VoiceAnnotationPlayer = React.memo<VoiceAnnotationPlayerProps>(function VoiceAnnotationPlayer({
  annotation,
  autoPlay = false,
  showTranscription = true,
  showUserInfo = true,
  showControls = true,
  compact = false,
  className,
  onPlaybackStart,
  onPlaybackEnd,
  onError
}) {
  // State
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [duration, setDuration] = useState<number>(0)
  const [volume, setVolume] = useState<number>(1)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [showFullTranscription, setShowFullTranscription] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressRef = useRef<HTMLDivElement | null>(null)

  // Audio URL from annotation content
  const audioUrl = annotation.content.audioUrl
  const transcription = annotation.content.audioTranscription
  const audioDuration = annotation.content.audioDuration || 0

  // Initialize audio element
  useEffect(() => {
    if (!audioUrl) return

    const audio = new Audio()
    audio.preload = 'metadata'
    audio.crossOrigin = 'anonymous'
    
    audio.addEventListener('loadstart', () => setIsLoading(true))
    audio.addEventListener('canplay', () => setIsLoading(false))
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration || audioDuration)
    })
    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime)
    })
    audio.addEventListener('ended', () => {
      setIsPlaying(false)
      setCurrentTime(0)
      onPlaybackEnd?.()
    })
    audio.addEventListener('play', () => {
      setIsPlaying(true)
      onPlaybackStart?.()
    })
    audio.addEventListener('pause', () => {
      setIsPlaying(false)
    })
    audio.addEventListener('error', (e) => {
      const errorMessage = `Failed to load audio: ${audio.error?.message || 'Unknown error'}`
      setError(errorMessage)
      setIsLoading(false)
      onError?.(new Error(errorMessage))
    })

    audio.src = audioUrl
    audio.volume = volume
    audio.muted = isMuted
    audioRef.current = audio

    // Auto-play if requested
    if (autoPlay) {
      audio.play().catch(e => {
        console.warn('Auto-play failed:', e)
      })
    }

    return () => {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      audioRef.current = null
    }
  }, [audioUrl, audioDuration, autoPlay, volume, isMuted, onPlaybackStart, onPlaybackEnd, onError])

  // Play/pause toggle
  const togglePlayback = useCallback(async () => {
    if (!audioRef.current) return

    try {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        await audioRef.current.play()
      }
    } catch (error) {
      const errorMessage = `Playback failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      setError(errorMessage)
      onError?.(new Error(errorMessage))
    }
  }, [isPlaying, onError])

  // Seek to position
  const seekTo = useCallback((time: number) => {
    if (audioRef.current && duration > 0) {
      audioRef.current.currentTime = Math.max(0, Math.min(time, duration))
    }
  }, [duration])

  // Handle progress bar click
  const handleProgressClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || duration <= 0) return

    const rect = progressRef.current.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const clickRatio = clickX / rect.width
    const newTime = clickRatio * duration

    seekTo(newTime)
  }, [duration, seekTo])

  // Reset to beginning
  const resetToStart = useCallback(() => {
    seekTo(0)
  }, [seekTo])

  // Toggle volume
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev
      if (audioRef.current) {
        audioRef.current.muted = newMuted
      }
      return newMuted
    })
  }, [])

  // Format time
  const formatTime = useCallback((seconds: number): string => {
    if (!isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Truncate transcription for compact view
  const displayTranscription = showFullTranscription || !compact 
    ? transcription 
    : transcription?.length > 100 
      ? transcription.substring(0, 100) + '...'
      : transcription

  if (!audioUrl) {
    return (
      <div className={cn('p-3 bg-gray-50 rounded-md text-center text-gray-500', className)}>
        <FileText className="h-6 w-6 mx-auto mb-2 opacity-50" />
        <div className="text-sm">No audio available</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('p-3 bg-red-50 border border-red-200 rounded-md text-center text-red-600', className)}>
        <div className="text-sm font-medium">Audio Error</div>
        <div className="text-xs mt-1 opacity-75">{error}</div>
      </div>
    )
  }

  return (
    <div className={cn(
      'bg-white rounded-lg shadow-sm border overflow-hidden',
      compact ? 'p-2' : 'p-4',
      className
    )}>
      {/* Header with user info */}
      {showUserInfo && !compact && (
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{annotation.user.fullName}</div>
            <div className="text-xs text-gray-500">
              {new Date(annotation.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Audio Controls */}
      {showControls && (
        <div className={cn(
          'flex items-center space-x-3',
          compact ? 'mb-2' : 'mb-4'
        )}>
          {/* Play/Pause Button */}
          <Button
            onClick={togglePlayback}
            disabled={isLoading}
            variant="outline"
            size={compact ? 'sm' : 'default'}
            className="flex items-center space-x-1"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          {/* Progress Bar */}
          <div className="flex-1 flex items-center space-x-2">
            <span className="text-xs text-gray-500 font-mono min-w-[35px]">
              {formatTime(currentTime)}
            </span>
            
            <div
              ref={progressRef}
              onClick={handleProgressClick}
              className="flex-1 h-2 bg-gray-200 rounded-full cursor-pointer relative group"
            >
              <div
                className="h-2 bg-blue-500 rounded-full transition-all duration-150"
                style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
              />
              <div
                className="absolute top-1/2 w-3 h-3 bg-blue-600 rounded-full transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: duration > 0 ? `calc(${(currentTime / duration) * 100}% - 6px)` : '0px' }}
              />
            </div>
            
            <span className="text-xs text-gray-500 font-mono min-w-[35px]">
              {formatTime(duration)}
            </span>
          </div>

          {/* Volume and Reset Controls */}
          {!compact && (
            <div className="flex items-center space-x-1">
              <Button
                onClick={resetToStart}
                variant="ghost"
                size="sm"
                className="p-1"
                title="Reset to start"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
              
              <Button
                onClick={toggleMute}
                variant="ghost"
                size="sm"
                className="p-1"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Transcription */}
      {showTranscription && transcription && (
        <div className={cn(
          'bg-gray-50 rounded-md',
          compact ? 'p-2' : 'p-3'
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1">
              <FileText className="h-3 w-3 text-gray-500" />
              <span className="text-xs text-gray-600 font-medium">Transcription</span>
            </div>
            {compact && transcription.length > 100 && (
              <Button
                onClick={() => setShowFullTranscription(!showFullTranscription)}
                variant="ghost"
                size="sm"
                className="text-xs px-2 py-1 h-auto"
              >
                {showFullTranscription ? 'Less' : 'More'}
              </Button>
            )}
          </div>
          
          <div className={cn(
            'text-sm text-gray-700 leading-relaxed',
            compact && 'text-xs'
          )}>
            {displayTranscription}
          </div>
        </div>
      )}

      {/* Compact user info */}
      {showUserInfo && compact && (
        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
          <span>{annotation.user.fullName}</span>
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{new Date(annotation.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      )}
    </div>
  )
})

VoiceAnnotationPlayer.displayName = 'VoiceAnnotationPlayer'