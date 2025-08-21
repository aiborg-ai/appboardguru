'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import {
  Mic,
  MicOff,
  Volume2,
  Users,
  FileText,
  Download,
  Settings,
  Play,
  Pause,
  Square,
  Globe,
  Brain,
  BookOpen,
  Clock,
  AlertCircle
} from 'lucide-react';

import { VoiceTranslator } from '@/components/voice/VoiceTranslator';
import { meetingTranscriptionService, type MeetingTranscription, type ActionItem } from '@/lib/services/meeting-transcription.service';
import type { 
  VoiceTranslationSession, 
  TranscriptionSegment, 
  MeetingMinutes as VoiceTranslationMeetingMinutes,
  MeetingDecision,
  SpeakerIdentification 
} from '@/types/voice-translation';
import type { MeetingMinutes as ServiceMeetingMinutes } from '@/lib/services/meeting-transcription.service';

interface VoiceMeetingIntegrationProps {
  meetingId: string;
  organizationId: string;
  meetingTitle: string;
  participants: Array<{
    id: string;
    name: string;
    email?: string;
    role?: string;
  }>;
  onTranscriptionUpdate?: (transcription: MeetingTranscription) => void;
  onMinutesGenerated?: (minutes: VoiceTranslationMeetingMinutes) => void;
  className?: string;
}

export function VoiceMeetingIntegration({
  meetingId,
  organizationId,
  meetingTitle,
  participants,
  onTranscriptionUpdate,
  onMinutesGenerated,
  className = ''
}: VoiceMeetingIntegrationProps) {
  const { toast } = useToast();
  
  // Core state
  const [isActive, setIsActive] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState<MeetingTranscription | null>(null);
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Transcription segments and real-time data
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<string>('');
  const [speakerStats, setSpeakerStats] = useState<Record<string, {
    segments: number;
    duration: number;
    words: number;
  }>>({});

  // Meeting minutes and analysis
  const [generatedMinutes, setGeneratedMinutes] = useState<ServiceMeetingMinutes | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [decisions, setDecisions] = useState<MeetingDecision[]>([]);
  const [isGeneratingMinutes, setIsGeneratingMinutes] = useState(false);

  // Settings and preferences
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [targetLanguages, setTargetLanguages] = useState<string[]>(['es', 'fr']);
  const [realTimeTranscription, setRealTimeTranscription] = useState(true);
  const [speakerIdentification, setSpeakerIdentification] = useState(true);
  const [autoGenerateMinutes, setAutoGenerateMinutes] = useState(false);

  // Start meeting transcription
  const startTranscription = useCallback(async () => {
    try {
      setIsProcessing(true);
      
      const result = await meetingTranscriptionService.startMeetingTranscription(
        '', // Will be filled from auth context
        organizationId,
        {
          title: meetingTitle,
          participants: participants.map(p => ({
            name: p.name,
            email: p.email
          })),
          expectedLanguages: autoTranslate ? ['en', ...targetLanguages] : ['en']
        }
      );

      setTranscriptionId(result.transcriptionId);
      setSessionId(result.sessionId);
      setIsActive(true);

      toast({
        title: "Transcription Started",
        description: `Meeting transcription is now active for "${meetingTitle}"`
      });

    } catch (error) {
      console.error('Failed to start transcription:', error);
      toast({
        title: "Failed to Start",
        description: "Could not start meeting transcription. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [meetingTitle, organizationId, participants, autoTranslate, targetLanguages, toast]);

  // Stop transcription and generate minutes
  const stopTranscription = useCallback(async () => {
    if (!transcriptionId) return;

    try {
      setIsProcessing(true);
      
      // Generate meeting minutes if enabled
      if (autoGenerateMinutes) {
        setIsGeneratingMinutes(true);
        const minutes = await meetingTranscriptionService.generateMeetingMinutes(
          transcriptionId,
          '', // Will be filled from auth context
          {
            includeFullTranscript: false,
            summaryStyle: 'action-oriented',
            language: 'en'
          }
        );
        
        setGeneratedMinutes(minutes);
        // Convert to VoiceTranslationMeetingMinutes format if needed for callback
        const convertedMinutes: VoiceTranslationMeetingMinutes = {
          header: {
            title: minutes.header.title,
            date: minutes.header.date,
            time: minutes.header.time,
            location: minutes.header.location,
            meetingType: minutes.header.meetingType,
            attendees: minutes.header.attendees.map(a => ({ 
              name: a.name, 
              title: a.title, 
              organization: a.organization,
              status: (a.status as 'present' | 'absent' | 'late' | 'early_departure') || 'present',
              joinTime: a.joinTime,
              departTime: (a as any).departTime
            })),
            chairperson: minutes.header.chairperson,
            secretary: minutes.header.secretary
          },
          agenda: minutes.agenda,
          discussions: minutes.discussions.map(d => ({
            id: `discussion_${Date.now()}_${Math.random()}`,
            agendaItemId: undefined,
            topic: d.topic,
            presenter: undefined,
            keyPoints: d.keyPoints,
            decisions: d.decisions.map(decision => ({
              id: decision.id,
              text: decision.text,
              description: undefined,
              context: decision.context,
              rationale: undefined,
              votingResults: decision.votingResults,
              finalDecision: decision.finalDecision,
              implementationPlan: undefined,
              reviewDate: undefined,
              impact: undefined,
              createdAt: decision.createdAt,
              modifiedAt: decision.createdAt
            })),
            actionItems: [],
            duration: 0,
            transcript: undefined
          })),
          actionItems: minutes.actionItems.map(item => ({
            ...item,
            priority: (item.priority as 'high' | 'medium' | 'low') || 'medium',
            updatedAt: item.createdAt || new Date().toISOString()
          })),
          decisions: [],
          nextMeeting: minutes.nextMeeting ? {
            date: minutes.nextMeeting.date,
            tentativeAgenda: minutes.nextMeeting.tentativeAgenda,
            preparationItems: [],
            responsibleParties: {}
          } : undefined,
          appendices: undefined,
          metadata: {
            generatedAt: new Date().toISOString(),
            generatedBy: 'meeting-transcription-service',
            version: '1.0',
            language: 'en',
            duration: minutes.metadata.duration || 0,
            wordCount: minutes.metadata.wordCount || 0,
            participantCount: minutes.metadata.participantCount || 0,
            qualityMetrics: undefined,
            processingTime: undefined,
            isAutomated: true
          }
        };
        onMinutesGenerated?.(convertedMinutes);
      }

      setIsActive(false);
      
      toast({
        title: "Transcription Complete",
        description: autoGenerateMinutes 
          ? "Meeting transcription complete and minutes generated"
          : "Meeting transcription complete"
      });

    } catch (error) {
      console.error('Error stopping transcription:', error);
      toast({
        title: "Error",
        description: "Failed to complete transcription processing",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setIsGeneratingMinutes(false);
    }
  }, [transcriptionId, autoGenerateMinutes, onMinutesGenerated, toast]);

  // Handle voice translation session changes
  const handleSessionChange = useCallback((newSessionId: string) => {
    setSessionId(newSessionId);
  }, []);

  // Generate minutes manually
  const generateMinutes = useCallback(async () => {
    if (!transcriptionId) return;

    try {
      setIsGeneratingMinutes(true);
      
      const minutes = await meetingTranscriptionService.generateMeetingMinutes(
        transcriptionId,
        '', // Will be filled from auth context
        {
          includeFullTranscript: true,
          summaryStyle: 'detailed',
          language: 'en'
        }
      );
      
      setGeneratedMinutes(minutes);
      setActionItems(minutes.actionItems);
      setDecisions(minutes.discussions.flatMap(d => d.decisions.map(decision => ({
        id: decision.id,
        text: decision.text,
        description: undefined,
        context: decision.context,
        rationale: undefined,
        votingResults: decision.votingResults,
        finalDecision: decision.finalDecision,
        implementationPlan: undefined,
        reviewDate: undefined,
        impact: undefined,
        createdAt: decision.createdAt,
        modifiedAt: decision.createdAt
      }))));
      
      // Convert to VoiceTranslationMeetingMinutes format for callback
      const convertedMinutes: VoiceTranslationMeetingMinutes = {
        header: {
          title: minutes.header.title,
          date: minutes.header.date,
          time: minutes.header.time,
          location: minutes.header.location,
          meetingType: minutes.header.meetingType,
          attendees: minutes.header.attendees.map(a => ({ 
            name: a.name, 
            title: a.title, 
            organization: a.organization,
            status: (a.status as 'present' | 'absent' | 'late' | 'early_departure') || 'present',
            joinTime: a.joinTime,
            departTime: (a as any).departTime
          })),
          chairperson: minutes.header.chairperson,
          secretary: minutes.header.secretary
        },
        agenda: minutes.agenda,
        discussions: minutes.discussions.map(d => ({
          id: `discussion_${Date.now()}_${Math.random()}`,
          agendaItemId: undefined,
          topic: d.topic,
          presenter: undefined,
          keyPoints: d.keyPoints,
          decisions: d.decisions.map(decision => ({
            id: decision.id,
            text: decision.text,
            description: undefined,
            context: decision.context,
            rationale: undefined,
            votingResults: decision.votingResults,
            finalDecision: decision.finalDecision,
            implementationPlan: undefined,
            reviewDate: undefined,
            impact: undefined,
            createdAt: decision.createdAt,
            modifiedAt: decision.createdAt
          })),
          actionItems: [],
          duration: 0,
          transcript: undefined
        })),
        actionItems: minutes.actionItems.map(item => ({
          ...item,
          priority: (item.priority as 'high' | 'medium' | 'low') || 'medium',
          updatedAt: item.createdAt || new Date().toISOString()
        })),
        decisions: [],
        nextMeeting: minutes.nextMeeting ? {
          date: minutes.nextMeeting.date,
          tentativeAgenda: minutes.nextMeeting.tentativeAgenda,
          preparationItems: [],
          responsibleParties: {}
        } : undefined,
        appendices: undefined,
        metadata: {
          generatedAt: new Date().toISOString(),
          generatedBy: 'meeting-transcription-service',
          version: '1.0',
          language: 'en',
          duration: minutes.metadata.duration || 0,
          wordCount: minutes.metadata.wordCount || 0,
          participantCount: minutes.metadata.participantCount || 0,
          qualityMetrics: undefined,
          processingTime: undefined,
          isAutomated: true
        }
      };
      onMinutesGenerated?.(convertedMinutes);
      
      toast({
        title: "Minutes Generated",
        description: "Meeting minutes have been successfully generated"
      });

    } catch (error) {
      console.error('Error generating minutes:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate meeting minutes",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingMinutes(false);
    }
  }, [transcriptionId, onMinutesGenerated, toast]);

  // Export transcription
  const exportTranscription = useCallback(async (format: 'json' | 'txt' | 'docx' | 'pdf') => {
    if (!transcriptionId) return;

    try {
      const blob = await meetingTranscriptionService.exportTranscription(
        transcriptionId,
        format,
        autoTranslate
      );
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meeting-transcript-${meetingTitle.replace(/\s+/g, '-')}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: `Transcription exported as ${format.toUpperCase()}`
      });

    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Could not export transcription",
        variant: "destructive"
      });
    }
  }, [transcriptionId, autoTranslate, meetingTitle, toast]);

  // Update speaker statistics
  const updateSpeakerStats = useCallback((segment: TranscriptionSegment) => {
    if (!segment.speaker) return;

    setSpeakerStats(prev => {
      const speakerId = segment.speaker!.id;
      const current = prev[speakerId] || { segments: 0, duration: 0, words: 0 };
      
      return {
        ...prev,
        [speakerId]: {
          segments: current.segments + 1,
          duration: current.duration + (segment.endTime - segment.startTime),
          words: current.words + segment.text.split(' ').length
        }
      };
    });
  }, []);

  // Calculate meeting progress
  const getMeetingProgress = () => {
    if (!segments.length) return 0;
    
    const totalDuration = Math.max(...segments.map(s => s.endTime)) - Math.min(...segments.map(s => s.startTime));
    const assumedMeetingLength = 60 * 60 * 1000; // 1 hour default
    
    return Math.min(100, (totalDuration / assumedMeetingLength) * 100);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Meeting Transcription & Translation
                {isActive && <Badge variant="default" className="bg-red-500">Live</Badge>}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">{meetingTitle}</p>
            </div>
            <div className="flex items-center gap-2">
              {!isActive ? (
                <Button 
                  onClick={startTranscription}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Start Transcription
                </Button>
              ) : (
                <Button 
                  onClick={stopTranscription}
                  disabled={isProcessing}
                  variant="destructive"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop & Process
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Meeting Progress */}
          {isActive && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Meeting Progress</span>
                <span>{Math.round(getMeetingProgress())}%</span>
              </div>
              <Progress value={getMeetingProgress()} className="h-2" />
            </div>
          )}

          {/* Quick Settings */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-translate"
                checked={autoTranslate}
                onCheckedChange={setAutoTranslate}
                disabled={isActive}
              />
              <Label htmlFor="auto-translate" className="text-sm">Auto Translate</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="speaker-id"
                checked={speakerIdentification}
                onCheckedChange={setSpeakerIdentification}
                disabled={isActive}
              />
              <Label htmlFor="speaker-id" className="text-sm">Speaker ID</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="real-time"
                checked={realTimeTranscription}
                onCheckedChange={setRealTimeTranscription}
                disabled={isActive}
              />
              <Label htmlFor="real-time" className="text-sm">Real-time</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="auto-minutes"
                checked={autoGenerateMinutes}
                onCheckedChange={setAutoGenerateMinutes}
                disabled={isActive}
              />
              <Label htmlFor="auto-minutes" className="text-sm">Auto Minutes</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Interface Tabs */}
      <Tabs defaultValue="transcription" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="transcription">Live Transcription</TabsTrigger>
          <TabsTrigger value="translation">Translation</TabsTrigger>
          <TabsTrigger value="minutes">Meeting Minutes</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Live Transcription Tab */}
        <TabsContent value="transcription">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Live Transcription
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={isActive ? "default" : "secondary"}>
                    {isActive ? 'Recording' : 'Stopped'}
                  </Badge>
                  {segments.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportTranscription('txt')}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {segments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mb-4 opacity-50" />
                    <p>No transcription data yet. Start recording to see live transcript.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {segments.map((segment) => (
                      <div key={segment.id} className="border-l-4 border-blue-500 pl-4 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          {segment.speaker && (
                            <Badge variant="outline" className="text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              {segment.speaker.name}
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500">
                            {new Date(segment.startTime).toLocaleTimeString()}
                          </span>
                          {segment.confidence && (
                            <Badge 
                              variant={segment.confidence > 0.8 ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {Math.round(segment.confidence * 100)}%
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{segment.text}</p>
                        
                        {segment.translations && Object.keys(segment.translations).length > 0 && (
                          <div className="mt-2 space-y-1">
                            {Object.entries(segment.translations).map(([lang, translation]) => (
                              <p key={lang} className="text-xs text-gray-600 italic">
                                <Badge variant="outline" className="mr-2">{lang.toUpperCase()}</Badge>
                                {translation}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Translation Tab */}
        <TabsContent value="translation">
          {sessionId && (
            <VoiceTranslator
              sessionId={sessionId}
              onSessionChange={handleSessionChange}
              initialTargetLanguages={targetLanguages}
              meetingMode={true}
              className="border rounded-lg"
            />
          )}
        </TabsContent>

        {/* Meeting Minutes Tab */}
        <TabsContent value="minutes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Meeting Minutes
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={generateMinutes}
                    disabled={!transcriptionId || isGeneratingMinutes}
                  >
                    {isGeneratingMinutes ? (
                      <>
                        <Brain className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Generate Minutes
                      </>
                    )}
                  </Button>
                  {generatedMinutes && (
                    <Button
                      variant="outline"
                      onClick={() => exportTranscription('docx')}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {generatedMinutes ? (
                <div className="space-y-6">
                  {/* Minutes Header */}
                  <div className="border-b pb-4">
                    <h3 className="text-lg font-semibold">{generatedMinutes.header.title}</h3>
                    <div className="text-sm text-gray-600 mt-2 space-y-1">
                      <p><strong>Date:</strong> {generatedMinutes.header.date}</p>
                      <p><strong>Time:</strong> {generatedMinutes.header.time}</p>
                      <p><strong>Attendees:</strong> {generatedMinutes.header.attendees.join(', ')}</p>
                    </div>
                  </div>

                  {/* Action Items */}
                  {generatedMinutes.actionItems.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Action Items</h4>
                      <div className="space-y-2">
                        {generatedMinutes.actionItems.map((item) => (
                          <div key={item.id} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border">
                            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{item.text}</p>
                              {item.assignedTo && (
                                <p className="text-xs text-gray-600 mt-1">
                                  Assigned to: {item.assignedTo}
                                </p>
                              )}
                              {item.dueDate && (
                                <p className="text-xs text-gray-600">
                                  Due: {new Date(item.dueDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <Badge variant={
                              item.status === 'completed' ? 'default' :
                              item.status === 'in_progress' ? 'secondary' : 'outline'
                            }>
                              {item.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Discussions */}
                  {generatedMinutes.discussions.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Discussions</h4>
                      <div className="space-y-4">
                        {generatedMinutes.discussions.map((discussion, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <h5 className="font-medium mb-2">{discussion.topic}</h5>
                            {discussion.keyPoints.length > 0 && (
                              <ul className="list-disc list-inside text-sm space-y-1 mb-3">
                                {discussion.keyPoints.map((point, pointIndex) => (
                                  <li key={pointIndex}>{point}</li>
                                ))}
                              </ul>
                            )}
                            {discussion.decisions.length > 0 && (
                              <div className="bg-green-50 border border-green-200 rounded p-3">
                                <p className="text-sm font-medium text-green-800 mb-1">Decisions:</p>
                                {discussion.decisions.map((decision, decisionIndex) => (
                                  <div key={decisionIndex} className="text-sm">
                                    <p><strong>{decision.text}</strong></p>
                                    <p className="text-green-700">{decision.context}</p>
                                    <Badge 
                                      className="mt-1"
                                      variant={decision.finalDecision === 'approved' ? 'default' : 'secondary'}
                                    >
                                      {decision.finalDecision}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <BookOpen className="w-12 h-12 mb-4 opacity-50" />
                  <p>No meeting minutes generated yet.</p>
                  <p className="text-sm">Start transcription and click "Generate Minutes" to create structured meeting minutes.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Speaker Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Speaker Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(speakerStats).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(speakerStats).map(([speakerId, stats]) => {
                      const participant = participants.find(p => p.id === speakerId);
                      const speakerName = participant?.name || `Speaker ${speakerId}`;
                      
                      return (
                        <div key={speakerId} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{speakerName}</span>
                            <Badge>{stats.segments} segments</Badge>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Speaking time: {Math.round(stats.duration / 60000)} minutes</p>
                            <p>Words spoken: {stats.words}</p>
                            <p>Avg words/segment: {Math.round(stats.words / stats.segments)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No speaker data available yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Meeting Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Meeting Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Segments:</span>
                    <Badge>{segments.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Words:</span>
                    <Badge>{segments.reduce((sum, s) => sum + s.text.split(' ').length, 0)}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Speakers:</span>
                    <Badge>{Object.keys(speakerStats).length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Languages Detected:</span>
                    <Badge>{new Set(segments.map(s => s.language).filter(Boolean)).size || 1}</Badge>
                  </div>
                  {segments.length > 0 && (
                    <div className="flex justify-between">
                      <span>Avg Confidence:</span>
                      <Badge>
                        {Math.round(
                          segments.reduce((sum, s) => sum + (s.confidence || 0), 0) / segments.length * 100
                        )}%
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}