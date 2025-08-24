'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VoiceInputButtonProps {
  onVoiceInput?: (transcript: string) => void
  onTranscriptionStart?: () => void
  onTranscriptionEnd?: () => void
  onError?: (error: string) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg' | 'icon'
  variant?: 'default' | 'ghost' | 'outline' | 'secondary'
  className?: string
  children?: React.ReactNode
}

export function VoiceInputButton({
  onVoiceInput,
  onTranscriptionStart,
  onTranscriptionEnd,
  onError,
  disabled = false,
  size = 'sm',
  variant = 'outline',
  className,
  children,
  ...props
}: VoiceInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleClick = useCallback(async () => {
    if (disabled || isProcessing) return
    
    if (isRecording) {
      setIsRecording(false)
      onTranscriptionEnd?.()
    } else {
      setIsRecording(true)
      onTranscriptionStart?.()
      
      // Simulate voice processing
      setTimeout(() => {
        setIsRecording(false)
        setIsProcessing(true)
        
        setTimeout(() => {
          setIsProcessing(false)
          onVoiceInput?.('Voice input simulation')
          onTranscriptionEnd?.()
        }, 1000)
      }, 2000)
    }
  }, [disabled, isProcessing, isRecording, onVoiceInput, onTranscriptionStart, onTranscriptionEnd])

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={disabled || isProcessing}
      variant={isRecording ? 'default' : variant}
      size={size}
      className={cn(
        'relative transition-all duration-200',
        isRecording && 'bg-red-500 hover:bg-red-600 text-white animate-pulse',
        isProcessing && 'cursor-not-allowed',
        className
      )}
      title={
        isProcessing 
          ? 'Processing audio...' 
          : isRecording 
            ? 'Stop recording' 
            : 'Start voice input'
      }
      {...props}
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isRecording ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
      
      {/* Recording indicator */}
      {isRecording && size !== 'sm' && (
        <div className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
      )}
      
      {children}
    </Button>
  )
}

export default VoiceInputButton
