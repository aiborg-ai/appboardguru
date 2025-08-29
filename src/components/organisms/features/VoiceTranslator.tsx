'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/atoms/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/molecules/cards/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/atoms/display/badge';
import { Switch } from '@/components/atoms/form/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/atoms/form/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/atoms/display/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/atoms/display/progress';
import { useToast } from '@/components/ui/use-toast';
import { 
  Mic, 
  MicOff, 
  Square, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Settings, 
  Users, 
  Globe,
  Copy,
  Download,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface TranslationEntry {
  id: string;
  originalText: string;
  originalLanguage: string;
  translations: Record<string, {
    text: string;
    confidence: number;
    audioUrl?: string;
  }>;
  timestamp: number;
  speakerId?: string;
  isPlaying?: boolean;
}

interface VoiceTranslatorProps {
  sessionId?: string;
  onSessionChange?: (sessionId: string) => void;
  initialTargetLanguages?: string[];
  meetingMode?: boolean;
  className?: string;
}

const SUPPORTED_LANGUAGES = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'zh': 'Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'th': 'Thai',
  'vi': 'Vietnamese',
  'id': 'Indonesian',
  'ms': 'Malay',
  'tl': 'Filipino',
  'nl': 'Dutch',
  'sv': 'Swedish',
  'da': 'Danish',
  'no': 'Norwegian',
  'fi': 'Finnish',
  'pl': 'Polish',
  'cs': 'Czech',
  'hu': 'Hungarian',
  'ro': 'Romanian',
  'bg': 'Bulgarian',
  'hr': 'Croatian'
};

export function VoiceTranslator({
  sessionId,
  onSessionChange,
  initialTargetLanguages = ['es', 'fr'],
  meetingMode = false,
  className = ''
}: VoiceTranslatorProps) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const [targetLanguages, setTargetLanguages] = useState<string[]>(initialTargetLanguages);
  const [translations, setTranslations] = useState<TranslationEntry[]>([]);
  const [includeAudio, setIncludeAudio] = useState(false);
  const [autoDetectLanguage, setAutoDetectLanguage] = useState(true);
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [participants, setParticipants] = useState<{id: string, name: string}[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState('');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);
  const [realTimeMode, setRealTimeMode] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize audio recording
  const initializeRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await processAudioBlob(audioBlob);
          audioChunksRef.current = [];
        }
      };
      
      return true;
    } catch (error) {
      console.error('Failed to initialize recording:', error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) {
      const initialized = await initializeRecording();
      if (!initialized) return;
    }

    if (mediaRecorderRef.current?.state === 'inactive') {
      audioChunksRef.current = [];
      mediaRecorderRef.current.start(realTimeMode ? 3000 : undefined); // 3s chunks for real-time
      setIsRecording(true);
      
      toast({
        title: "Recording Started",
        description: realTimeMode ? "Real-time translation active" : "Click stop when finished"
      });
    }
  }, [initializeRecording, realTimeMode, toast]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  }, []);

  // Process audio blob
  const processAudioBlob = async (audioBlob: Blob) => {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      await translateAudio(base64Audio);
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        title: "Processing Error",
        description: "Failed to process audio. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Translate audio or text
  const translateAudio = async (audioData?: string) => {
    try {
      const requestBody = {
        audio: audioData,
        text: audioData ? undefined : textInput,
        targetLanguages,
        sourceLanguage: autoDetectLanguage ? 'auto' : sourceLanguage,
        sessionId: currentSessionId,
        speakerId: currentSpeaker || undefined,
        includeAudio,
        format: 'webm'
      };

      const response = await fetch('/api/voice/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Translation failed');
      }

      const result = await response.json();
      
      if (result.success) {
        // Update session ID if new session was created
        if (result.sessionId && result.sessionId !== currentSessionId) {
          setCurrentSessionId(result.sessionId);
          onSessionChange?.(result.sessionId);
        }

        // Create translation entry
        const newEntry: TranslationEntry = {
          id: `${Date.now()}-${Math.random()}`,
          originalText: result.originalText,
          originalLanguage: result.detectedLanguage || sourceLanguage,
          translations: result.translations,
          timestamp: result.timestamp || Date.now(),
          speakerId: result.speakerId
        };

        setTranslations(prev => [newEntry, ...prev]);
        
        // Clear text input if used
        if (!audioData) {
          setTextInput('');
        }

        // Show success notification with confidence info
        const translations = Object.values(result.translations) as Array<{confidence: number}>;
        const avgConfidence = translations
          .reduce((sum, t) => sum + t.confidence, 0) / translations.length;
        
        toast({
          title: "Translation Complete",
          description: `Translated to ${targetLanguages.length} languages (${Math.round(avgConfidence * 100)}% confidence)`
        });

      } else {
        throw new Error(result.error || 'Translation failed');
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: "Translation Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  };

  // Add/remove target languages
  const toggleTargetLanguage = (langCode: string) => {
    setTargetLanguages(prev => {
      if (prev.includes(langCode)) {
        return prev.filter(l => l !== langCode);
      } else {
        return [...prev, langCode];
      }
    });
  };

  // Copy translation to clipboard
  const copyTranslation = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Translation copied to clipboard"
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    }
  };

  // Export translations
  const exportTranslations = () => {
    const exportData = {
      sessionId: currentSessionId,
      timestamp: new Date().toISOString(),
      translations: translations.map(t => ({
        originalText: t.originalText,
        originalLanguage: t.originalLanguage,
        translations: t.translations,
        timestamp: new Date(t.timestamp).toISOString(),
        speakerId: t.speakerId
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translations-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className={`w-full max-w-6xl mx-auto space-y-6 ${className}`}>
      {/* Header Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Voice Translator
              {meetingMode && <Badge variant="secondary">Meeting Mode</Badge>}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportTranslations}
                disabled={translations.length === 0}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Recording Controls */}
          <div className="flex items-center gap-4">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={isRecording ? "bg-red-500 hover:bg-red-600" : ""}
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : isRecording ? (
                <Square className="w-4 h-4 mr-2" />
              ) : (
                <Mic className="w-4 h-4 mr-2" />
              )}
              {isProcessing ? 'Processing...' : isRecording ? 'Stop Recording' : 'Start Recording'}
            </Button>

            {meetingMode && (
              <Select value={currentSpeaker} onValueChange={setCurrentSpeaker}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select speaker..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unknown Speaker</SelectItem>
                  {participants.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="realtime-mode"
                checked={realTimeMode}
                onCheckedChange={setRealTimeMode}
              />
              <Label htmlFor="realtime-mode" className="text-sm">Real-time</Label>
            </div>
          </div>

          {/* Language Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-detect"
                  checked={autoDetectLanguage}
                  onCheckedChange={setAutoDetectLanguage}
                />
                <Label htmlFor="auto-detect" className="text-sm">Auto-detect language</Label>
              </div>
              
              {!autoDetectLanguage && (
                <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Source language" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                      <SelectItem key={code} value={code}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">Target Languages:</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                  <Badge
                    key={code}
                    variant={targetLanguages.includes(code) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTargetLanguage(code)}
                  >
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Text Input Alternative */}
          <div className="space-y-2">
            <Label htmlFor="text-input" className="text-sm font-medium">
              Or type text to translate:
            </Label>
            <div className="flex gap-2">
              <Textarea
                id="text-input"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Enter text to translate..."
                className="flex-1"
              />
              <Button
                onClick={() => translateAudio()}
                disabled={!textInput.trim() || targetLanguages.length === 0}
                className="self-end"
              >
                Translate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Panel */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Translation Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="include-audio" className="text-sm">Generate audio translations</Label>
                <Switch
                  id="include-audio"
                  checked={includeAudio}
                  onCheckedChange={setIncludeAudio}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Confidence Threshold</Label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Low</span>
                  <input
                    type="range"
                    min="0.3"
                    max="1.0"
                    step="0.1"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-500">High</span>
                </div>
                <p className="text-xs text-gray-500">
                  Current: {Math.round(confidenceThreshold * 100)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Translation Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Translation Results</span>
            <Badge variant="secondary">{translations.length} translations</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {translations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Mic className="w-12 h-12 mb-4 opacity-50" />
                <p>No translations yet. Start recording or type text to begin.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {translations.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4 space-y-3">
                    {/* Original Text */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {SUPPORTED_LANGUAGES[entry.originalLanguage as keyof typeof SUPPORTED_LANGUAGES] || entry.originalLanguage}
                          </Badge>
                          {entry.speakerId && (
                            <Badge variant="secondary" className="text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              {entry.speakerId}
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                          {entry.originalText}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyTranslation(entry.originalText)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Translations */}
                    <div className="space-y-2">
                      {Object.entries(entry.translations).map(([langCode, translation]) => (
                        <div key={langCode} className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="default" className="text-xs">
                                {SUPPORTED_LANGUAGES[langCode as keyof typeof SUPPORTED_LANGUAGES]}
                              </Badge>
                              <div className="flex items-center gap-1">
                                <Progress 
                                  value={translation.confidence * 100} 
                                  className="w-20 h-2"
                                />
                                <span className="text-xs text-gray-500">
                                  {Math.round(translation.confidence * 100)}%
                                </span>
                              </div>
                              {translation.confidence < confidenceThreshold && (
                                <AlertTriangle className="w-3 h-3 text-yellow-500" />
                              )}
                            </div>
                            <p className="text-sm bg-gray-50 p-3 rounded border-l-4 border-green-500">
                              {translation.text}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyTranslation(translation.text)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            {translation.audioUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Play audio functionality would go here
                                  toast({
                                    title: "Audio playback",
                                    description: "Audio playback feature coming soon"
                                  });
                                }}
                              >
                                <Volume2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}