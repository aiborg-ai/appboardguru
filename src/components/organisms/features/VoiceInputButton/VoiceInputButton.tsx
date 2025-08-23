import * as React from "react"
import { cn } from "@/lib/utils"
import { Button, type ButtonProps } from "../../atoms/Button"
import { Icon } from "../../atoms/Icon"

// Custom hook for voice input logic
const useVoiceInput = () => {
  const [isRecording, setIsRecording] = React.useState(false)
  const [isTranscribing, setIsTranscribing] = React.useState(false)
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const audioChunksRef = React.useRef<Blob[]>([])

  const startRecording = React.useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm'
      })

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType 
        })
        return audioBlob
      }

      mediaRecorder.start()
      setIsRecording(true)
      return true
    } catch (error) {
      console.error('Failed to start recording:', error)
      return false
    }
  }, [])

  const stopRecording = React.useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && isRecording) {
        const mediaRecorder = mediaRecorderRef.current
        
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { 
            type: mediaRecorder.mimeType 
          })
          resolve(audioBlob)
        }

        mediaRecorder.stop()
        setIsRecording(false)

        // Clean up stream
        if (mediaRecorder.stream) {
          mediaRecorder.stream.getTracks().forEach(track => track.stop())
        }
      } else {
        resolve(null)
      }
    })
  }, [isRecording])

  const transcribeAudio = React.useCallback(async (audioBlob: Blob): Promise<string> => {
    setIsTranscribing(true)
    
    try {
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
          format: audioBlob.type.includes('webm') ? 'webm' : 'wav',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Transcription failed')
      }

      return data.text?.trim() || ''
    } catch (error) {
      console.error('Transcription error:', error)
      throw error
    } finally {
      setIsTranscribing(false)
    }
  }, [])

  const cleanup = React.useCallback(() => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      }
    }
    setIsRecording(false)
    setIsTranscribing(false)
  }, [])

  React.useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    transcribeAudio,
    cleanup,
  }
}

export interface VoiceInputButtonProps extends Omit<ButtonProps, 'onClick' | 'children'> {
  onTranscription: (text: string) => void
  onError?: (error: Error) => void
  onStart?: () => void
  onStop?: () => void
  showLabel?: boolean
  pulseWhenRecording?: boolean
}

const VoiceInputButton = React.memo<VoiceInputButtonProps>(({
  onTranscription,
  onError,
  onStart,
  onStop,
  showLabel = false,
  pulseWhenRecording = true,
  disabled,
  className,
  size = 'default',
  variant = 'outline',
  ...props
}) => {
  const {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    transcribeAudio,
    cleanup,
  } = useVoiceInput()

  const handleClick = React.useCallback(async () => {
    if (isRecording) {
      onStop?.()
      try {
        const audioBlob = await stopRecording()
        if (audioBlob) {
          const text = await transcribeAudio(audioBlob)
          if (text) {
            onTranscription(text)
          }
        }
      } catch (error) {
        onError?.(error as Error)
      }
    } else {
      onStart?.()
      const success = await startRecording()
      if (!success) {
        onError?.(new Error('Failed to start recording'))
      }
    }
  }, [isRecording, onStart, onStop, onTranscription, onError, startRecording, stopRecording, transcribeAudio])

  // Cleanup on unmount
  React.useEffect(() => {
    return cleanup
  }, [cleanup])

  const isLoading = isTranscribing
  const isActive = isRecording || isTranscribing

  const buttonIcon = React.useMemo(() => {
    if (isLoading) {
      return <Icon name="Loader2" size="sm" className="animate-spin" />
    } else if (isRecording) {
      return <Icon name="MicOff" size="sm" />
    } else {
      return <Icon name="Mic" size="sm" />
    }
  }, [isLoading, isRecording])

  const buttonLabel = React.useMemo(() => {
    if (isRecording) return 'Stop'
    if (isTranscribing) return 'Processing...'
    return 'Voice'
  }, [isRecording, isTranscribing])

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
  )
})

VoiceInputButton.displayName = "VoiceInputButton"

export { VoiceInputButton, useVoiceInput }