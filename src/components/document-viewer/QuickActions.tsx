'use client'

import React, { useState, useRef, useEffect } from 'react'
import { 
  Zap, 
  FileText, 
  Mic2, 
  Play, 
  Pause, 
  Download, 
  Share2, 
  Clock, 
  Volume2, 
  VolumeX,
  RotateCcw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  Sparkles,
  BookOpen,
  Settings,
  SkipBack,
  SkipForward,
  Calendar
} from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/cards/card'
import { Badge } from '@/components/atoms/display/badge'
import { Progress } from '@/components/atoms/display/progress'
import { ScrollArea } from '@/features/shared/ui/scroll-area'
import { Slider } from '@/components/atoms/form/slider'
import { Separator } from '@/components/atoms/display/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/features/shared/ui/dropdown-menu'
import { 
  useDocumentContext, 
  useDocumentActions,
  DocumentSummary,
  DocumentPodcast
} from './DocumentContextProvider'
import { TabContentWrapper, TabEmptyState } from './DocumentTabs'

interface SummaryCardProps {
  summary: DocumentSummary
  isGenerating: boolean
  onRegenerate: () => void
  onDownload: () => void
  onShare: () => void
  onCopy: () => void
}

function SummaryCard({ 
  summary, 
  isGenerating, 
  onRegenerate, 
  onDownload, 
  onShare, 
  onCopy 
}: SummaryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isGenerating) {
    return (
      <Card className="p-4 border-blue-200 bg-blue-50">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Generating Summary</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-blue-700">
              <span>Analyzing document content...</span>
              <span>~30-60 seconds</span>
            </div>
            <Progress value={undefined} className="h-2 bg-blue-100" />
          </div>
          <p className="text-xs text-blue-700">
            Our AI is reading through the document and extracting key insights, main points, and conclusions.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-gray-900">AI Summary</span>
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              {summary.wordCount} words
            </Badge>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Settings className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onCopy}>
                <Copy className="h-3 w-3 mr-2" />
                Copy Summary
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDownload}>
                <Download className="h-3 w-3 mr-2" />
                Download as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShare}>
                <Share2 className="h-3 w-3 mr-2" />
                Share Summary
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onRegenerate}>
                <RotateCcw className="h-3 w-3 mr-2" />
                Regenerate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">{summary.title}</h4>
          
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-gray-700">Key Points:</h5>
            <ul className="space-y-1">
              {summary.keyPoints.slice(0, isExpanded ? undefined : 3).map((point, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                  <span className="text-blue-600 font-medium">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            
            {summary.keyPoints.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 text-xs px-2 text-blue-600"
              >
                {isExpanded ? 'Show Less' : `Show ${summary.keyPoints.length - 3} More Points`}
              </Button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>Generated {formatDate(summary.generatedAt)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              className="h-6 text-xs px-2"
            >
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onShare}
              className="h-6 text-xs px-2"
            >
              <Share2 className="h-3 w-3 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

interface PodcastPlayerProps {
  podcast: DocumentPodcast
  isGenerating: boolean
  onRegenerate: () => void
  onDownload: () => void
  onShare: () => void
}

function PodcastPlayer({ 
  podcast, 
  isGenerating, 
  onRegenerate, 
  onDownload, 
  onShare 
}: PodcastPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState([100])
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showTranscript, setShowTranscript] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const onEnded = () => setIsPlaying(false)
    const onPause = () => setIsPlaying(false)
    const onPlay = () => setIsPlaying(true)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('play', onPlay)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('play', onPlay)
    }
  }, [podcast])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
  }

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current
    if (!audio) return

    const newTime = (value[0]! / 100) * podcast.duration
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current
    if (!audio) return

    setVolume(value)
    audio.volume = value[0]! / 100
    setIsMuted(value[0]! === 0)
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isMuted) {
      audio.volume = volume[0]! / 100
      setIsMuted(false)
    } else {
      audio.volume = 0
      setIsMuted(true)
    }
  }

  const changeSpeed = (rate: number) => {
    const audio = audioRef.current
    if (!audio) return

    setPlaybackRate(rate)
    audio.playbackRate = rate
  }

  const skip = (seconds: number) => {
    const audio = audioRef.current
    if (!audio) return

    audio.currentTime = Math.max(0, Math.min(podcast.duration, audio.currentTime + seconds))
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isGenerating) {
    return (
      <Card className="p-4 border-purple-200 bg-purple-50">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
            <span className="text-sm font-medium text-purple-900">Generating Podcast</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-purple-700">
              <span>Converting document to audio...</span>
              <span>~2-3 minutes</span>
            </div>
            <Progress value={undefined} className="h-2 bg-purple-100" />
          </div>
          <p className="text-xs text-purple-700">
            Creating a natural-sounding podcast from your document with AI-generated narration.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Audio element */}
        <audio
          ref={audioRef}
          src={podcast.audioUrl}
          preload="metadata"
        />

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <Mic2 className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-900">AI Podcast</span>
            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
              {formatTime(podcast.duration)}
            </Badge>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Settings className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowTranscript(!showTranscript)}>
                <FileText className="h-3 w-3 mr-2" />
                {showTranscript ? 'Hide' : 'Show'} Transcript
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDownload}>
                <Download className="h-3 w-3 mr-2" />
                Download Audio
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShare}>
                <Share2 className="h-3 w-3 mr-2" />
                Share Podcast
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onRegenerate}>
                <RotateCcw className="h-3 w-3 mr-2" />
                Regenerate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Podcast title */}
        <h4 className="font-medium text-gray-900">{podcast.title}</h4>

        {/* Player controls */}
        <div className="space-y-3">
          {/* Progress bar */}
          <div className="space-y-2">
            <Slider
              value={[podcast.duration > 0 ? (currentTime / podcast.duration) * 100 : 0]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="cursor-pointer"
            />
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(podcast.duration)}</span>
            </div>
          </div>

          {/* Main controls */}
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => skip(-10)}
              className="h-8 w-8 p-0"
              title="Skip back 10s"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              onClick={togglePlay}
              size="sm"
              className="h-10 w-10 rounded-full"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => skip(10)}
              className="h-8 w-8 p-0"
              title="Skip forward 10s"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Secondary controls */}
          <div className="flex items-center justify-between">
            {/* Volume */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="h-6 w-6 p-0"
              >
                {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              </Button>
              <div className="w-16">
                <Slider
                  value={isMuted ? [0] : volume}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                />
              </div>
            </div>

            {/* Playback speed */}
            <div className="flex items-center space-x-1">
              {[0.75, 1, 1.25, 1.5, 2].map(rate => (
                <Button
                  key={rate}
                  variant={playbackRate === rate ? "default" : "ghost"}
                  size="sm"
                  onClick={() => changeSpeed(rate)}
                  className="h-6 text-xs px-2"
                >
                  {rate}x
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Transcript */}
        {showTranscript && (
          <div className="space-y-2">
            <Separator />
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Transcript</h5>
              <ScrollArea className="h-32 border rounded-lg p-3">
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {podcast.transcript}
                </p>
              </ScrollArea>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>Generated {formatDate(podcast.generatedAt)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              className="h-6 text-xs px-2"
            >
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onShare}
              className="h-6 text-xs px-2"
            >
              <Share2 className="h-3 w-3 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function QuickActions() {
  const { state } = useDocumentContext()
  const actions = useDocumentActions()

  const handleGenerateSummary = () => {
    actions.generateSummary()
  }

  const handleGeneratePodcast = () => {
    actions.generatePodcast()
  }

  const handleDownloadSummary = () => {
    // Implementation for downloading summary as PDF
    console.log('Download summary')
  }

  const handleShareSummary = () => {
    // Implementation for sharing summary
    console.log('Share summary')
  }

  const handleCopySummary = () => {
    if (state.summary) {
      const summaryText = `${state.summary.title}\n\nKey Points:\n${state.summary.keyPoints.map(point => `• ${point}`).join('\n')}`
      navigator.clipboard.writeText(summaryText)
    }
  }

  const handleDownloadPodcast = () => {
    // Implementation for downloading podcast
    console.log('Download podcast')
  }

  const handleSharePodcast = () => {
    // Implementation for sharing podcast
    console.log('Share podcast')
  }

  const hasSummary = !!state.summary
  const hasPodcast = !!state.podcast
  const hasAnyContent = hasSummary || hasPodcast

  if (!hasAnyContent && !state.isLoadingSummary && !state.isLoadingPodcast) {
    return (
      <TabContentWrapper>
        <TabEmptyState
          icon={Zap}
          title="AI Quick Actions"
          description="Generate intelligent summaries and podcast versions of your document with just one click."
          action={
            <div className="mt-4 space-y-2 w-full max-w-xs">
              <Button 
                onClick={handleGenerateSummary}
                className="w-full"
                disabled={state.isLoadingSummary}
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Summary
              </Button>
              <Button 
                onClick={handleGeneratePodcast}
                variant="outline"
                className="w-full"
                disabled={state.isLoadingPodcast}
              >
                <Mic2 className="h-4 w-4 mr-2" />
                Create 3-Min Podcast
              </Button>
            </div>
          }
        />
      </TabContentWrapper>
    )
  }

  return (
    <TabContentWrapper>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-yellow-600" />
            <h3 className="text-sm font-medium text-gray-900">AI Quick Actions</h3>
            <div className="flex items-center space-x-1">
              {hasSummary && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Summary
                </Badge>
              )}
              {hasPodcast && (
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Podcast
                </Badge>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-600">
          AI-powered content generation for quick insights and easy consumption.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {/* Generate buttons */}
            {(!hasSummary || !hasPodcast) && (
              <div className="space-y-2">
                {!hasSummary && (
                  <Button 
                    onClick={handleGenerateSummary}
                    className="w-full justify-start h-auto p-4"
                    disabled={state.isLoadingSummary}
                    variant="outline"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <FileText className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium">Generate AI Summary</div>
                        <div className="text-xs text-gray-600">Extract key points and insights</div>
                      </div>
                    </div>
                  </Button>
                )}

                {!hasPodcast && (
                  <Button 
                    onClick={handleGeneratePodcast}
                    className="w-full justify-start h-auto p-4"
                    disabled={state.isLoadingPodcast}
                    variant="outline"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Mic2 className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium">Create 3-Minute Podcast</div>
                        <div className="text-xs text-gray-600">AI-narrated audio summary</div>
                      </div>
                    </div>
                  </Button>
                )}
              </div>
            )}

            {/* Summary section */}
            {(hasSummary || state.isLoadingSummary) && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">Document Summary</span>
                </div>
                <SummaryCard
                  summary={state.summary!}
                  isGenerating={state.isLoadingSummary}
                  onRegenerate={handleGenerateSummary}
                  onDownload={handleDownloadSummary}
                  onShare={handleShareSummary}
                  onCopy={handleCopySummary}
                />
              </div>
            )}

            {/* Podcast section */}
            {(hasPodcast || state.isLoadingPodcast) && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-900">AI Podcast</span>
                </div>
                <PodcastPlayer
                  podcast={state.podcast!}
                  isGenerating={state.isLoadingPodcast}
                  onRegenerate={handleGeneratePodcast}
                  onDownload={handleDownloadPodcast}
                  onShare={handleSharePodcast}
                />
              </div>
            )}

            {/* Tips section */}
            {hasAnyContent && (
              <Card className="p-3 bg-blue-50 border-blue-200">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Pro Tips</span>
                  </div>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Share summaries with team members for quick document reviews</li>
                    <li>• Use podcasts for hands-free learning during commutes</li>
                    <li>• Regenerate content for different perspectives or focus areas</li>
                    <li>• Download content for offline access and sharing</li>
                  </ul>
                </div>
              </Card>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      {hasAnyContent && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-600 text-center">
            Content powered by AI • Regenerate anytime for fresh perspectives
          </div>
        </div>
      )}
    </TabContentWrapper>
  )
}