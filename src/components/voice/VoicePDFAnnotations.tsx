'use client';

/**
 * Voice PDF Annotations Component
 * Integrates voice annotations with PDF viewer for seamless document review
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { 
  Mic, 
  MicOff,
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  MessageSquare,
  FileAudio,
  Clock,
  MapPin,
  Eye,
  EyeOff,
  Trash2,
  Edit3,
  Reply,
  MoreVertical,
  Download,
  Share,
  Tag,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Zap
} from 'lucide-react';

import {
  VoiceAnnotation,
  VoiceThread,
  VoiceThreadMessage,
  AnnotationPosition,
  CreateVoiceAnnotationRequest,
  VoiceAnnotationResponse
} from '@/types/voice-collaboration';

interface VoicePDFAnnotationsProps {
  documentId: string;
  sessionId?: string;
  userId: string;
  pdfViewerRef?: React.RefObject<any>;
  onAnnotationSelect?: (annotation: VoiceAnnotation) => void;
  onAnnotationCreate?: (annotation: VoiceAnnotation) => void;
  onAnnotationUpdate?: (annotation: VoiceAnnotation) => void;
  onAnnotationDelete?: (annotationId: string) => void;
  className?: string;
  showMiniPlayer?: boolean;
}

interface AnnotationState {
  annotations: VoiceAnnotation[];
  threads: VoiceThread[];
  selectedAnnotation: VoiceAnnotation | null;
  activeThread: VoiceThread | null;
  isRecording: boolean;
  isPlaying: boolean;
  currentPlayingId: string | null;
  recordingMode: 'point' | 'area' | 'page';
  showAnnotations: boolean;
  filter: {
    type: 'all' | 'point' | 'area' | 'page';
    priority: 'all' | 'low' | 'medium' | 'high' | 'critical';
    author: 'all' | 'me' | 'others';
  };
}

interface RecordingState {
  isActive: boolean;
  startTime: number;
  duration: number;
  position: AnnotationPosition | null;
  audioChunks: Blob[];
  waveform: number[];
}

export default function VoicePDFAnnotations({
  documentId,
  sessionId,
  userId,
  pdfViewerRef,
  onAnnotationSelect,
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationDelete,
  className = '',
  showMiniPlayer = false
}: VoicePDFAnnotationsProps) {
  const [state, setState] = useState<AnnotationState>({
    annotations: [],
    threads: [],
    selectedAnnotation: null,
    activeThread: null,
    isRecording: false,
    isPlaying: false,
    currentPlayingId: null,
    recordingMode: 'point',
    showAnnotations: true,
    filter: {
      type: 'all',
      priority: 'all',
      author: 'all'
    }
  });

  const [recordingState, setRecordingState] = useState<RecordingState>({
    isActive: false,
    startTime: 0,
    duration: 0,
    position: null,
    audioChunks: [],
    waveform: []
  });

  const [playbackState, setPlaybackState] = useState({
    currentTime: 0,
    duration: 0,
    volume: 100
  });

  // Refs for audio recording and playback
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Load annotations on mount
  useEffect(() => {
    loadAnnotations();
    initializeAudioContext();
    
    return () => {
      cleanup();
    };
  }, [documentId]);

  // Handle PDF viewer events
  useEffect(() => {
    if (pdfViewerRef?.current) {
      const viewer = pdfViewerRef.current;
      
      // Listen for click events on PDF
      const handlePDFClick = (event: MouseEvent) => {
        if (state.isRecording) return;
        
        const rect = viewer.getBoundingClientRect();
        const position = calculateAnnotationPosition(event, rect, viewer);
        
        if (position) {
          handleAnnotationPositionSelect(position);
        }
      };

      viewer.addEventListener('click', handlePDFClick);
      
      return () => {
        viewer.removeEventListener('click', handlePDFClick);
      };
    }
    
    return undefined;
  }, [pdfViewerRef, state.isRecording]);

  const initializeAudioContext = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });
      streamRef.current = stream;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  };

  const loadAnnotations = async () => {
    try {
      const response = await fetch('/api/voice/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_annotations',
          documentId,
          sessionId,
          status: 'active'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setState(prev => ({ 
          ...prev, 
          annotations: result.annotations || []
        }));
        
        // Render annotations on PDF
        renderAnnotationsOnPDF(result.annotations || []);
      }
    } catch (error) {
      console.error('Failed to load annotations:', error);
    }
  };

  const startRecording = async (position?: AnnotationPosition) => {
    if (!streamRef.current) {
      await initializeAudioContext();
    }

    try {
      const recorder = new MediaRecorder(streamRef.current!);
      mediaRecorderRef.current = recorder;
      
      const audioChunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
        setRecordingState(prev => ({
          ...prev,
          audioChunks: [...prev.audioChunks, event.data]
        }));
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await handleRecordingComplete(audioBlob, recordingState.position);
      };
      
      recorder.start(100); // Capture data every 100ms for waveform
      
      setRecordingState({
        isActive: true,
        startTime: Date.now(),
        duration: 0,
        position: position || null,
        audioChunks: [],
        waveform: []
      });
      
      setState(prev => ({ ...prev, isRecording: true }));
      
      // Start waveform visualization
      startWaveformVisualization();
      
      // Auto-stop after 5 minutes
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, 300000);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    setRecordingState(prev => ({ ...prev, isActive: false }));
    setState(prev => ({ ...prev, isRecording: false }));
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob, position: AnnotationPosition | null) => {
    try {
      // Convert to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Create annotation
      const annotationRequest: CreateVoiceAnnotationRequest = {
        audioData: base64Audio,
        documentId,
        sessionId,
        position: position || undefined,
        type: state.recordingMode,
        priority: 'medium',
        tags: []
      };

      const response = await fetch('/api/voice/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_annotation',
          ...annotationRequest
        })
      });

      const result: VoiceAnnotationResponse = await response.json();

      if (result.success && result.annotation) {
        // Add to local state
        setState(prev => ({
          ...prev,
          annotations: [result.annotation!, ...prev.annotations],
          selectedAnnotation: result.annotation!
        }));

        // Render new annotation on PDF
        renderAnnotationOnPDF(result.annotation!);

        // Trigger callbacks
        onAnnotationCreate?.(result.annotation!);

        console.log('Voice annotation created:', result.annotation!.id);
      } else {
        throw new Error(result.error || 'Failed to create annotation');
      }

    } catch (error) {
      console.error('Failed to process recording:', error);
    }
  };

  const startWaveformVisualization = () => {
    if (!canvasRef.current || !streamRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const audioContext = new AudioContext();
    const analyzer = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(streamRef.current);
    
    source.connect(analyzer);
    analyzer.fftSize = 256;
    
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      if (!recordingState.isActive) return;
      
      analyzer.getByteTimeDomainData(dataArray);
      
      ctx!.fillStyle = 'rgb(24, 24, 27)';
      ctx!.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx!.lineWidth = 2;
      ctx!.strokeStyle = 'rgb(59, 130, 246)';
      ctx!.beginPath();
      
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] ?? 0) / 128.0;
        const y = (v * canvas.height) / 2;
        
        if (i === 0) {
          ctx!.moveTo(x, y);
        } else {
          ctx!.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      ctx!.stroke();
      
      // Update duration
      const duration = (Date.now() - recordingState.startTime) / 1000;
      setRecordingState(prev => ({ ...prev, duration }));
      
      animationFrameRef.current = requestAnimationFrame(draw);
    };
    
    draw();
  };

  const playAnnotation = async (annotation: VoiceAnnotation) => {
    try {
      if (state.currentPlayingId === annotation.id && state.isPlaying) {
        // Pause current playback
        if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
          setState(prev => ({ 
            ...prev, 
            isPlaying: false, 
            currentPlayingId: null 
          }));
        }
        return;
      }

      // Stop any current playback
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      }

      // Create new audio element for this annotation
      const audio = new Audio(annotation.content.audioUrl);
      audioPlayerRef.current = audio;

      audio.onloadedmetadata = () => {
        setPlaybackState(prev => ({
          ...prev,
          duration: audio.duration
        }));
      };

      audio.ontimeupdate = () => {
        setPlaybackState(prev => ({
          ...prev,
          currentTime: audio.currentTime
        }));
      };

      audio.onended = () => {
        setState(prev => ({ 
          ...prev, 
          isPlaying: false, 
          currentPlayingId: null 
        }));
        setPlaybackState(prev => ({ ...prev, currentTime: 0 }));
      };

      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        setState(prev => ({ 
          ...prev, 
          isPlaying: false, 
          currentPlayingId: null 
        }));
      };

      await audio.play();
      
      setState(prev => ({
        ...prev,
        isPlaying: true,
        currentPlayingId: annotation.id,
        selectedAnnotation: annotation
      }));

      // Highlight annotation on PDF
      highlightAnnotationOnPDF(annotation);

      onAnnotationSelect?.(annotation);

    } catch (error) {
      console.error('Failed to play annotation:', error);
    }
  };

  const deleteAnnotation = async (annotationId: string) => {
    try {
      const response = await fetch('/api/voice/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_annotation',
          annotationId,
          userId
        })
      });

      const result = await response.json();

      if (result.success) {
        setState(prev => ({
          ...prev,
          annotations: prev.annotations.filter(a => a.id !== annotationId),
          selectedAnnotation: prev.selectedAnnotation?.id === annotationId 
            ? null 
            : prev.selectedAnnotation
        }));

        // Remove annotation from PDF
        removeAnnotationFromPDF(annotationId);

        onAnnotationDelete?.(annotationId);
      }
    } catch (error) {
      console.error('Failed to delete annotation:', error);
    }
  };

  const calculateAnnotationPosition = (
    event: MouseEvent, 
    viewerRect: DOMRect, 
    viewer: any
  ): AnnotationPosition | null => {
    // This would calculate the position relative to the PDF page
    // Implementation depends on the PDF viewer being used
    const relativeX = (event.clientX - viewerRect.left) / viewerRect.width;
    const relativeY = (event.clientY - viewerRect.top) / viewerRect.height;
    
    // Get current page from PDF viewer
    const currentPage = viewer.currentPageNumber || 1;
    
    return {
      page: currentPage,
      x: Math.max(0, Math.min(1, relativeX)),
      y: Math.max(0, Math.min(1, relativeY))
    };
  };

  const handleAnnotationPositionSelect = (position: AnnotationPosition) => {
    if (state.recordingMode === 'area') {
      // For area annotations, this would start area selection
      console.log('Start area selection at:', position);
    } else {
      // Start recording at this position
      startRecording(position);
    }
  };

  const renderAnnotationsOnPDF = (annotations: VoiceAnnotation[]) => {
    // This would render annotation markers on the PDF viewer
    // Implementation depends on the PDF viewer library
    annotations.forEach(annotation => {
      renderAnnotationOnPDF(annotation);
    });
  };

  const renderAnnotationOnPDF = (annotation: VoiceAnnotation) => {
    if (!pdfViewerRef?.current || !annotation.position) return;
    
    // Create annotation marker element
    const marker = document.createElement('div');
    marker.className = `voice-annotation-marker voice-annotation-${annotation.type} priority-${annotation.priority}`;
    marker.id = `annotation-${annotation.id}`;
    marker.style.cssText = `
      position: absolute;
      width: 24px;
      height: 24px;
      background: ${getPriorityColor(annotation.priority)};
      border-radius: 50%;
      border: 2px solid white;
      cursor: pointer;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: bold;
    `;
    
    // Position the marker
    const viewer = pdfViewerRef.current;
    const viewerRect = viewer.getBoundingClientRect();
    marker.style.left = `${annotation.position.x * viewerRect.width}px`;
    marker.style.top = `${annotation.position.y * viewerRect.height}px`;
    
    // Add icon based on type
    const icon = document.createElement('span');
    icon.innerHTML = '🎤';
    marker.appendChild(icon);
    
    // Add click handler
    marker.onclick = (e) => {
      e.stopPropagation();
      playAnnotation(annotation);
    };
    
    // Add to PDF viewer
    viewer.appendChild(marker);
  };

  const highlightAnnotationOnPDF = (annotation: VoiceAnnotation) => {
    // Remove previous highlights
    const existingHighlights = document.querySelectorAll('.annotation-highlight');
    existingHighlights.forEach(el => el.remove());
    
    // Add highlight for current annotation
    const marker = document.getElementById(`annotation-${annotation.id}`);
    if (marker) {
      marker.classList.add('annotation-highlight');
      marker.style.transform = 'scale(1.2)';
      marker.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.5)';
    }
  };

  const removeAnnotationFromPDF = (annotationId: string) => {
    const marker = document.getElementById(`annotation-${annotationId}`);
    if (marker) {
      marker.remove();
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return '#dc2626'; // red-600
      case 'high': return '#ea580c'; // orange-600
      case 'medium': return '#2563eb'; // blue-600
      case 'low': return '#16a34a'; // green-600
      default: return '#6b7280'; // gray-500
    }
  };

  const filteredAnnotations = state.annotations.filter(annotation => {
    if (state.filter.type !== 'all' && annotation.type !== state.filter.type) return false;
    if (state.filter.priority !== 'all' && annotation.priority !== state.filter.priority) return false;
    if (state.filter.author === 'me' && annotation.authorId !== userId) return false;
    if (state.filter.author === 'others' && annotation.authorId === userId) return false;
    return true;
  });

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  if (showMiniPlayer && state.currentPlayingId) {
    const currentAnnotation = state.annotations.find(a => a.id === state.currentPlayingId);
    if (!currentAnnotation) return null;

    return (
      <Card className={`fixed bottom-4 left-4 w-80 z-50 ${className}`}>
        <CardContent className="p-3">
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => playAnnotation(currentAnnotation)}
              size="sm"
              className="flex-shrink-0"
            >
              {state.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{currentAnnotation.authorName}</div>
              <div className="text-xs text-gray-500 truncate">
                {currentAnnotation.content.transcript}
              </div>
              
              <Progress 
                value={(playbackState.currentTime / playbackState.duration) * 100} 
                className="h-1 mt-1"
              />
            </div>

            <div className="text-xs text-gray-500 flex-shrink-0">
              {Math.floor(playbackState.currentTime)}s / {Math.floor(playbackState.duration)}s
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Recording Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center space-x-2">
              <FileAudio className="h-5 w-5" />
              <span>Voice Annotations</span>
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setState(prev => ({ 
                  ...prev, 
                  showAnnotations: !prev.showAnnotations 
                }))}
                variant="outline"
                size="sm"
              >
                {state.showAnnotations ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              
              <Badge variant="secondary">
                {filteredAnnotations.length} annotations
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {/* Recording Mode Selector */}
            <div className="flex space-x-2">
              {(['point', 'area', 'page'] as const).map(mode => (
                <Button
                  key={mode}
                  onClick={() => setState(prev => ({ ...prev, recordingMode: mode }))}
                  variant={state.recordingMode === mode ? 'default' : 'outline'}
                  size="sm"
                  className="capitalize"
                >
                  {mode}
                </Button>
              ))}
            </div>

            {/* Recording Interface */}
            {recordingState.isActive ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-red-600">
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                    <span className="font-medium">Recording...</span>
                  </div>
                  <span className="text-sm font-mono">
                    {Math.floor(recordingState.duration / 60)}:
                    {(recordingState.duration % 60).toFixed(0).padStart(2, '0')}
                  </span>
                </div>
                
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={60}
                  className="w-full h-15 bg-gray-900 rounded border"
                />
                
                <div className="flex space-x-2">
                  <Button onClick={stopRecording} variant="destructive" size="sm">
                    <Square className="h-4 w-4 mr-2" />
                    Stop & Save
                  </Button>
                  <Button 
                    onClick={() => {
                      mediaRecorderRef.current?.stop();
                      setRecordingState(prev => ({ ...prev, isActive: false }));
                      setState(prev => ({ ...prev, isRecording: false }));
                    }}
                    variant="outline" 
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => startRecording()}
                disabled={!streamRef.current}
                className="w-full"
              >
                <Mic className="h-4 w-4 mr-2" />
                Start Voice Annotation
              </Button>
            )}

            {/* Instructions */}
            {!recordingState.isActive && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <div className="font-medium mb-1">How to add voice annotations:</div>
                <ul className="space-y-1 text-xs">
                  <li>• <strong>Point:</strong> Click the button above, then click on the PDF</li>
                  <li>• <strong>Area:</strong> Select area mode, then drag on the PDF</li>
                  <li>• <strong>Page:</strong> Annotate the entire current page</li>
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Annotations List */}
      {state.showAnnotations && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Voice Annotations ({filteredAnnotations.length})</CardTitle>
              
              {/* Filters */}
              <div className="flex items-center space-x-2">
                <select
                  value={state.filter.priority}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    filter: { ...prev.filter, priority: e.target.value as any }
                  }))}
                  className="text-xs border rounded px-2 py-1"
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                
                <select
                  value={state.filter.author}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    filter: { ...prev.filter, author: e.target.value as any }
                  }))}
                  className="text-xs border rounded px-2 py-1"
                >
                  <option value="all">All Authors</option>
                  <option value="me">My Annotations</option>
                  <option value="others">Others</option>
                </select>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {filteredAnnotations.map(annotation => (
                  <div
                    key={annotation.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      state.selectedAnnotation?.id === annotation.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setState(prev => ({ ...prev, selectedAnnotation: annotation }));
                      onAnnotationSelect?.(annotation);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge 
                            variant={annotation.priority === 'critical' ? 'destructive' : 'outline'}
                            className="text-xs"
                          >
                            {annotation.priority}
                          </Badge>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {annotation.type}
                          </Badge>
                          {annotation.position?.page && (
                            <span className="text-xs text-gray-500">
                              Page {annotation.position.page}
                            </span>
                          )}
                        </div>
                        
                        <div className="font-medium text-sm mb-1">{annotation.authorName}</div>
                        <div className="text-sm text-gray-600 line-clamp-2">
                          {annotation.content.transcript}
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                playAnnotation(annotation);
                              }}
                              size="sm"
                              variant="outline"
                              className="h-6 px-2"
                            >
                              {state.currentPlayingId === annotation.id && state.isPlaying ? (
                                <Pause className="h-3 w-3" />
                              ) : (
                                <Play className="h-3 w-3" />
                              )}
                            </Button>
                            
                            <span className="text-xs text-gray-500">
                              {annotation.duration}s
                            </span>
                            
                            <span className="text-xs text-gray-500">
                              {Math.round(annotation.content.transcriptConfidence * 100)}%
                            </span>
                          </div>

                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-500">
                              {new Date(annotation.timestamp).toLocaleTimeString()}
                            </span>
                            
                            {annotation.authorId === userId && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteAnnotation(annotation.id);
                                }}
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredAnnotations.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FileAudio className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No voice annotations yet</p>
                    <p className="text-sm">Create your first annotation above</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}