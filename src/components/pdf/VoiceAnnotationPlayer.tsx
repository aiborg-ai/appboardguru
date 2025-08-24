/**
 * VoiceAnnotationPlayer Component
 * Plays back voice annotations with waveform visualization
 */

'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/display/badge'
import { 
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Download,
  Trash2,
  MessageSquare,
  User,
  Calendar
} from 'lucide-react'

interface VoiceAnnotationPlayerProps {
  audioUrl: string
  transcript?: string
  duration: number
  createdBy: string
  createdAt: string
  userName?: string
  userAvatar?: string
  onDelete?: () => void
  onReply?: () => void
  className?: string
  compact?: boolean
}

type PlaybackState = 'idle' | 'playing' | 'paused' | 'loading' | 'error'

export const VoiceAnnotationPlayer = React.memo<VoiceAnnotationPlayerProps>(function VoiceAnnotationPlayer({
  audioUrl,
  transcript,
  duration,
  createdBy,
  createdAt,
  userName = 'Unknown User',
  userAvatar,
  onDelete,
  onReply,
  className,
  compact = false
}) {
  // Playback state
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle')
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [volume, setVolume] = useState<number>(1)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [playbackRate, setPlaybackRate] = useState<number>(1)
  const [showTranscript, setShowTranscript] = useState<boolean>(false)

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  // Initialize audio
  useEffect(() => {
    const audio = new Audio(audioUrl)
    
    audio.addEventListener('loadstart', () => setPlaybackState('loading'))
    audio.addEventListener('canplaythrough', () => {
      if (playbackState === 'loading') {
        setPlaybackState('idle')
      }
    })
    audio.addEventListener('error', () => setPlaybackState('error'))
    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime)
    })
    audio.addEventListener('ended', () => {
      setPlaybackState('idle')
      setCurrentTime(0)
    })
    
    audio.volume = volume
    audio.muted = isMuted
    audio.playbackRate = playbackRate
    
    audioRef.current = audio
    
    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [audioUrl, volume, isMuted, playbackRate, playbackState])

  // Play/pause toggle
  const togglePlayback = useCallback(async () => {
    if (!audioRef.current) return

    try {
      if (playbackState === 'playing') {
        audioRef.current.pause()
        setPlaybackState('paused')
      } else {
        setPlaybackState('loading')
        await audioRef.current.play()
        setPlaybackState('playing')
      }
    } catch (error) {
      console.error('Playback error:', error)
      setPlaybackState('error')
    }
  }, [playbackState])

  // Stop playback
  const stopPlayback = useCallback(() => {
    if (!audioRef.current) return
    
    audioRef.current.pause()
    audioRef.current.currentTime = 0
    setPlaybackState('idle')
    setCurrentTime(0)
  }, [])

  // Seek to position
  const seekTo = useCallback((position: number) => {
    if (!audioRef.current) return
    
    const seekTime = Math.max(0, Math.min(duration, position))
    audioRef.current.currentTime = seekTime
    setCurrentTime(seekTime)
  }, [duration])

  // Skip forward/backward
  const skip = useCallback((seconds: number) => {
    seekTo(currentTime + seconds)
  }, [currentTime, seekTo])

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!audioRef.current) return
    
    const newMuted = !isMuted
    audioRef.current.muted = newMuted
    setIsMuted(newMuted)
  }, [isMuted])

  // Handle progress bar click
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return
    
    const rect = progressRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const seekTime = percentage * duration
    
    seekTo(seekTime)
  }, [duration, seekTo])

  // Download audio
  const downloadAudio = useCallback(() => {
    const a = document.createElement('a')
    a.href = audioUrl
    a.download = `voice-annotation-${Date.now()}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [audioUrl])

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffHours < 1) {
      return 'Just now'
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  if (compact) {
    return (
      <div className={cn('flex items-center space-x-2 p-2 bg-blue-50 rounded-lg', className)}>
        {/* Play button */}
        <Button
          size="sm"
          onClick={togglePlayback}
          disabled={playbackState === 'loading' || playbackState === 'error'}
          className="w-8 h-8 p-0 rounded-full"
        >
          {playbackState === 'playing' ? (
            <Pause className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3" />
          )}
        </Button>

        {/* Progress bar */}
        <div className="flex-1 min-w-0">
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="h-2 bg-gray-200 rounded-full cursor-pointer relative"
          >
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Duration */}
        <span className="text-xs text-gray-600 min-w-max">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Voice indicator */}
        <Badge variant="secondary" className="text-xs">
          Voice
        </Badge>
      </div>
    )
  }

  return (
    <div className={cn('border border-gray-200 rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div className="p-3 bg-gray-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* User avatar */}
            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              {userAvatar ? (
                <img 
                  src={userAvatar} 
                  alt={userName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="h-3 w-3 text-gray-600" />
              )}
            </div>
            
            {/* User info */}
            <div className="min-w-0">
              <span className="text-sm font-medium text-gray-900 truncate">
                {userName}
              </span>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(createdAt)}</span>
              </div>
            </div>
            
            {/* Voice badge */}
            <Badge variant="secondary" className="text-xs">
              🎙️ Voice Note
            </Badge>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-1">
            {transcript && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowTranscript(!showTranscript)}
                className="h-6 px-2 text-xs"
              >
                <MessageSquare className="h-3 w-3" />
              </Button>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              onClick={downloadAudio}
              className="h-6 px-2 text-xs"
              title="Download"
            >
              <Download className="h-3 w-3" />
            </Button>
            
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                className="h-6 px-2 text-xs text-red-500 hover:text-red-700"
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Player controls */}
      <div className="p-4 space-y-3">
        {/* Main controls */}
        <div className="flex items-center justify-center space-x-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => skip(-10)}
            className="w-8 h-8 p-0"
            title="Skip back 10s"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <Button
            onClick={togglePlayback}
            disabled={playbackState === 'loading' || playbackState === 'error'}
            className="w-12 h-12 rounded-full"
          >
            {playbackState === 'loading' ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : playbackState === 'playing' ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => skip(10)}
            className="w-8 h-8 p-0"
            title="Skip forward 10s"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="h-3 bg-gray-200 rounded-full cursor-pointer relative"
          >
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
            {/* Playhead */}
            <div
              className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow-md"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Secondary controls */}
        <div className="flex items-center justify-between">
          {/* Volume */}
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleMute}
              className="w-6 h-6 p-0"
            >
              {isMuted ? (
                <VolumeX className="h-3 w-3" />
              ) : (
                <Volume2 className="h-3 w-3" />
              )}
            </Button>
            
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const newVolume = parseFloat(e.target.value)
                setVolume(newVolume)
                if (audioRef.current) {
                  audioRef.current.volume = newVolume
                }
                if (newVolume > 0 && isMuted) {
                  setIsMuted(false)
                  if (audioRef.current) {
                    audioRef.current.muted = false
                  }
                }
              }}
              className="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Playback rate */}
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-600">Speed:</span>
            <select
              value={playbackRate}
              onChange={(e) => {
                const rate = parseFloat(e.target.value)
                setPlaybackRate(rate)
                if (audioRef.current) {
                  audioRef.current.playbackRate = rate
                }
              }}
              className="text-xs border border-gray-300 rounded px-1 py-0.5"
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div>
        </div>

        {/* Error state */}
        {playbackState === 'error' && (
          <div className="text-center text-red-600 text-sm">
            Failed to load audio
          </div>
        )}
      </div>

      {/* Transcript */}
      {transcript && showTranscript && (
        <div className="p-3 border-t bg-yellow-50">
          <div className="text-xs font-medium text-gray-600 mb-2">Transcript:</div>
          <div className="text-sm text-gray-900 leading-relaxed">
            {transcript}
          </div>
        </div>
      )}

      {/* Reply section */}
      {onReply && (
        <div className="p-3 border-t">
          <Button
            size="sm"
            variant="ghost"
            onClick={onReply}
            className="w-full justify-center"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Reply to this voice note
          </Button>
        </div>
      )}
    </div>
  )
})

VoiceAnnotationPlayer.displayName = 'VoiceAnnotationPlayer'