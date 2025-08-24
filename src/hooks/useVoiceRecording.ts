'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

export interface UseVoiceRecordingOptions {
  maxDuration?: number // in seconds
  sampleRate?: number
  channels?: number
  enableTranscription?: boolean
  transcriptionService?: 'openai' | 'web-speech' | 'custom'
  onStartRecording?: () => void
  onStopRecording?: (audioBlob: Blob) => void
  onError?: (error: Error) => void
}

export interface VoiceRecordingState {
  isRecording: boolean
  isPaused: boolean
  duration: number
  audioBlob: Blob | null
  audioUrl: string | null
  waveformData: number[]
  error: string | null
  isTranscribing: boolean
}

export function useVoiceRecording(options: UseVoiceRecordingOptions = {}) {
  const {
    maxDuration = 300, // 5 minutes default
    sampleRate = 44100,
    channels = 1,
    enableTranscription = false,
    transcriptionService = 'openai',
    onStartRecording,
    onStopRecording,
    onError
  } = options

  const [state, setState] = useState<VoiceRecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
    waveformData: [],
    error: null,
    isTranscribing: false
  })

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const pausedDurationRef = useRef<number>(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Check if browser supports MediaRecorder
  const isSupported = useCallback(() => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder)
  }, [])

  // Get user media permission and setup recording
  const setupRecording = useCallback(async (): Promise<MediaStream> => {
    if (!isSupported()) {
      throw new Error('Voice recording is not supported in this browser')
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate,
          channelCount: channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      return stream
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Microphone access denied. Please allow microphone permissions.')
        } else if (error.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone.')
        } else if (error.name === 'NotReadableError') {
          throw new Error('Microphone is busy or unavailable.')
        } else {
          throw new Error(`Failed to access microphone: ${error.message}`)
        }
      }
      throw new Error('Failed to access microphone')
    }
  }, [isSupported, sampleRate, channels])

  // Setup audio analysis for waveform
  const setupAudioAnalysis = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      return { audioContext, analyser }
    } catch (error) {
      console.warn('Could not setup audio analysis:', error)
      return null
    }
  }, [])

  // Generate waveform data
  const updateWaveform = useCallback(() => {
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)

    // Convert to normalized values (0-1)
    const waveform = Array.from(dataArray).map(value => value / 255)
    
    setState(prev => ({
      ...prev,
      waveformData: [...prev.waveformData.slice(-50), ...waveform.slice(0, 8)].slice(-50)
    }))

    if (state.isRecording && !state.isPaused) {
      animationFrameRef.current = requestAnimationFrame(updateWaveform)
    }
  }, [state.isRecording, state.isPaused])

  // Update duration timer
  const updateDuration = useCallback(() => {
    if (startTimeRef.current && !state.isPaused) {
      const elapsed = (Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000
      setState(prev => ({ ...prev, duration: elapsed }))

      // Stop recording if max duration reached
      if (elapsed >= maxDuration) {
        stopRecording()
      }
    }
  }, [state.isPaused, maxDuration])

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null, isRecording: false }))

      const stream = await setupRecording()
      streamRef.current = stream

      // Setup audio analysis
      setupAudioAnalysis(stream)

      // Create MediaRecorder
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/wav'
      ]

      let selectedMimeType = ''
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType
          break
        }
      }

      if (!selectedMimeType) {
        throw new Error('No supported audio format found')
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        audioBitsPerSecond: 128000
      })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: selectedMimeType })
        const audioUrl = URL.createObjectURL(audioBlob)

        setState(prev => ({
          ...prev,
          audioBlob,
          audioUrl,
          isRecording: false,
          isPaused: false
        }))

        onStopRecording?.(audioBlob)

        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }

        // Clean up audio context
        if (audioContextRef.current) {
          audioContextRef.current.close()
          audioContextRef.current = null
        }
      }

      mediaRecorder.onerror = (event) => {
        const error = new Error(`Recording failed: ${(event as any).error?.message || 'Unknown error'}`)
        setState(prev => ({ ...prev, error: error.message, isRecording: false }))
        onError?.(error)
      }

      // Start recording
      mediaRecorder.start(250) // Collect data every 250ms
      startTimeRef.current = Date.now()
      pausedDurationRef.current = 0

      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        duration: 0,
        waveformData: [],
        audioBlob: null,
        audioUrl: null
      }))

      // Start waveform updates
      updateWaveform()

      // Start duration updates
      intervalRef.current = setInterval(updateDuration, 100)

      onStartRecording?.()

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording'
      setState(prev => ({ ...prev, error: errorMessage }))
      onError?.(error instanceof Error ? error : new Error(errorMessage))
    }
  }, [setupRecording, setupAudioAnalysis, updateWaveform, updateDuration, onStartRecording, onStopRecording, onError])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop()
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [state.isRecording])

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
      mediaRecorderRef.current.pause()
      setState(prev => ({ ...prev, isPaused: true }))

      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [state.isRecording, state.isPaused])

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && state.isPaused) {
      mediaRecorderRef.current.resume()
      setState(prev => ({ ...prev, isPaused: false }))

      // Update paused duration
      pausedDurationRef.current += Date.now() - (startTimeRef.current + state.duration * 1000)

      // Restart updates
      updateWaveform()
      intervalRef.current = setInterval(updateDuration, 100)
    }
  }, [state.isRecording, state.isPaused, state.duration, updateWaveform, updateDuration])

  // Clear recording
  const clearRecording = useCallback(() => {
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl)
    }

    setState(prev => ({
      ...prev,
      audioBlob: null,
      audioUrl: null,
      duration: 0,
      waveformData: [],
      error: null
    }))

    chunksRef.current = []
    startTimeRef.current = 0
    pausedDurationRef.current = 0
  }, [state.audioUrl])

  // Transcribe audio
  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string | null> => {
    if (!enableTranscription || !audioBlob) return null

    setState(prev => ({ ...prev, isTranscribing: true, error: null }))

    try {
      if (transcriptionService === 'openai') {
        // Use OpenAI Whisper API
        const formData = new FormData()
        formData.append('file', audioBlob, 'audio.webm')
        formData.append('model', 'whisper-1')

        const response = await fetch('/api/voice/transcribe', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error('Transcription failed')
        }

        const data = await response.json()
        return data.text || null

      } else if (transcriptionService === 'web-speech') {
        // Use Web Speech API (limited browser support)
        return new Promise((resolve, reject) => {
          const recognition = new ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)()
          
          recognition.continuous = false
          recognition.interimResults = false
          recognition.lang = 'en-US'

          recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript
            resolve(transcript)
          }

          recognition.onerror = (event: any) => {
            reject(new Error(`Speech recognition failed: ${event.error}`))
          }

          // Convert blob to audio element and play for recognition
          const audioUrl = URL.createObjectURL(audioBlob)
          const audio = new Audio(audioUrl)
          
          recognition.start()
          audio.play()
        })

      } else {
        throw new Error('Custom transcription service not implemented')
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transcription failed'
      setState(prev => ({ ...prev, error: errorMessage }))
      return null
    } finally {
      setState(prev => ({ ...prev, isTranscribing: false }))
    }
  }, [enableTranscription, transcriptionService])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && state.isRecording) {
        mediaRecorderRef.current.stop()
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      if (audioContextRef.current) {
        audioContextRef.current.close()
      }

      if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl)
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // State
    isRecording: state.isRecording,
    isPaused: state.isPaused,
    duration: state.duration,
    audioBlob: state.audioBlob,
    audioUrl: state.audioUrl,
    waveformData: state.waveformData,
    error: state.error,
    isTranscribing: state.isTranscribing,

    // Actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    transcribeAudio,

    // Utilities
    isSupported
  }
}