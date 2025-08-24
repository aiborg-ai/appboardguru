'use client'

import React, { useState } from 'react'
import { EnhancedPDFViewer } from '@/components/pdf/EnhancedPDFViewer'
import { AdvancedSearch } from '@/components/pdf/AdvancedSearch'
import { SearchBar } from '@/components/pdf/SearchBar'
import { VoiceAnnotationRecorder } from '@/components/pdf/VoiceAnnotationRecorder'
import { VoiceAnnotationPlayer } from '@/components/pdf/VoiceAnnotationPlayer'
import { OCRExtractor } from '@/components/pdf/OCRExtractor'
import { Card } from '@/components/molecules/cards/card'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/display/badge'
import { Separator } from '@/components/atoms/display/separator'
import { AssetId, AnnotationType } from '@/types/annotation-types'
import {
  FileText,
  Mic,
  Scan,
  Search,
  BarChart3,
  Download,
  Settings,
  Play,
  Pause,
  Volume2,
  Eye,
  Filter
} from 'lucide-react'

export default function TestAdvancedFeaturesPage() {
  const [currentMode, setCurrentMode] = useState<AnnotationType>('highlight')
  const [activeDemo, setActiveDemo] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Mock asset ID for testing
  const testAssetId = 'test-asset-advanced' as AssetId
  
  // Sample PDF URL
  const testPdfUrl = 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf'
  
  const features = [
    {
      id: 'pdf-viewer',
      title: 'Enhanced PDF Viewer',
      description: 'Advanced PDF viewer with comprehensive annotation support',
      icon: FileText,
      color: 'blue',
      features: [
        'Multiple annotation types (highlight, text, voice, drawing, area, stamp)',
        'Real-time collaboration with WebSocket integration',
        'Zoom, rotation, fullscreen support',
        'Keyboard navigation and shortcuts',
        'Responsive design with touch support'
      ]
    },
    {
      id: 'voice-annotations',
      title: 'Voice Annotations',
      description: 'Record and playback voice notes with automatic transcription',
      icon: Mic,
      color: 'purple',
      features: [
        'High-quality audio recording (WebRTC MediaRecorder)',
        'Real-time waveform visualization',
        'Automatic transcription via OpenRouter Whisper API',
        'Playback controls with speed adjustment',
        'Voice note search and filtering'
      ]
    },
    {
      id: 'ocr-extraction',
      title: 'OCR Text Extraction',
      description: 'Extract text from images and documents using AI',
      icon: Scan,
      color: 'green',
      features: [
        'Multiple extraction modes (text, table, form)',
        'GPT-4 Vision API for high accuracy',
        'Support for multiple image formats',
        'Structured output (JSON for tables/forms)',
        'Export to various formats (TXT, CSV)'
      ]
    },
    {
      id: 'advanced-search',
      title: 'Advanced Search',
      description: 'Powerful search across all annotations with filtering',
      icon: Search,
      color: 'indigo',
      features: [
        'Full-text search with highlighting',
        'Advanced filtering (type, user, date, privacy)',
        'Search in comments, content, and voice transcripts',
        'Relevance scoring and smart ranking',
        'Search analytics and aggregations'
      ]
    }
  ]

  const handleFeatureDemo = (featureId: string) => {
    setActiveDemo(activeDemo === featureId ? null : featureId)
  }

  const handleSearchResult = (result: any) => {
    console.log('Search result selected:', result)
    alert(`Navigating to annotation on page ${result.pageNumber}\nType: ${result.annotationType}\nContent: ${result.selectedText || result.commentText || 'Voice note'}`)
  }

  const handleVoiceRecordingSave = async (audioBlob: Blob, transcript: string, duration: number) => {
    console.log('Voice recording saved:', { size: audioBlob.size, transcript, duration })
    alert(`Voice note recorded!\nTranscript: ${transcript}\nDuration: ${duration.toFixed(1)}s`)
  }

  const handleOCRResult = (result: any) => {
    console.log('OCR Result:', result)
    alert(`OCR Extraction completed!\nMode: ${result.metadata.mode}\nConfidence: ${(result.metadata.confidence * 100).toFixed(1)}%\n\nExtracted content preview:\n${result.text ? result.text.substring(0, 200) + '...' : 'See console for full results'}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            Advanced PDF Annotation Platform
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Complete suite of PDF annotation tools with Voice AI, OCR, and Advanced Search
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <Badge variant="secondary">Voice Annotations ✓</Badge>
            <Badge variant="secondary">OCR Extraction ✓</Badge>
            <Badge variant="secondary">Advanced Search ✓</Badge>
            <Badge variant="secondary">Real-time Collaboration ✓</Badge>
          </div>
        </div>

        {/* Feature Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {features.map((feature) => {
            const Icon = feature.icon
            const isActive = activeDemo === feature.id
            
            return (
              <Card 
                key={feature.id} 
                className={`p-6 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  isActive ? `ring-2 ring-${feature.color}-500 bg-${feature.color}-50` : ''
                }`}
                onClick={() => handleFeatureDemo(feature.id)}
              >
                <div className="flex items-start space-x-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-lg bg-${feature.color}-100 flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 text-${feature.color}-600`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-gray-600 mb-3 text-sm">{feature.description}</p>
                    <div className="space-y-1">
                      {feature.features.slice(0, isActive ? feature.features.length : 2).map((item, index) => (
                        <div key={index} className="flex items-center space-x-2 text-xs text-gray-500">
                          <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                          <span>{item}</span>
                        </div>
                      ))}
                      {!isActive && feature.features.length > 2 && (
                        <div className="text-xs text-gray-400">
                          +{feature.features.length - 2} more features...
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`flex-shrink-0 text-${feature.color}-600`}>
                    {isActive ? <Eye className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Main Demo Area */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* PDF Viewer - Takes up 3 columns */}
          <div className="xl:col-span-3">
            <Card className="h-[800px]">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Enhanced PDF Viewer</h2>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      All Features Active
                    </Badge>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">Mode:</span>
                    <select 
                      value={currentMode} 
                      onChange={(e) => setCurrentMode(e.target.value as AnnotationType)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="highlight">Highlight</option>
                      <option value="textbox">Text Note</option>
                      <option value="drawing">Drawing</option>
                      <option value="area">Area</option>
                      <option value="stamp">Stamp</option>
                      <option value="voice">Voice Note</option>
                    </select>
                  </div>
                  
                  <Separator orientation="vertical" className="h-4" />
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>✓ Search enabled</span>
                    <span>✓ OCR ready</span>
                    <span>✓ Voice recording</span>
                  </div>
                </div>
                
                {currentMode === 'voice' && (
                  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-800">
                      <strong>Voice Mode Active:</strong> Click anywhere on the PDF to create a voice annotation. 
                      The recorder will appear with automatic transcription.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="h-full">
                <EnhancedPDFViewer
                  assetId={testAssetId}
                  fileUrl={testPdfUrl}
                  enableAnnotations={true}
                  annotationMode={currentMode}
                  onAnnotationModeChange={setCurrentMode}
                  onPageChange={(page) => console.log('Page changed:', page)}
                  onAnnotationSelect={(annotation) => console.log('Annotation selected:', annotation)}
                />
              </div>
            </Card>
          </div>

          {/* Feature Demos Sidebar */}
          <div className="space-y-6">
            {/* Search Demo */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center space-x-2">
                <Search className="h-4 w-4 text-indigo-600" />
                <span>Search Demo</span>
              </h3>
              <div className="space-y-3">
                <SearchBar
                  assetId={testAssetId}
                  onResultSelect={handleSearchResult}
                  placeholder="Try: 'performance', 'meeting'"
                />
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleFeatureDemo('advanced-search')}
                  className="w-full text-xs"
                >
                  <Filter className="h-3 w-3 mr-1" />
                  Advanced Search
                </Button>
              </div>
            </Card>

            {/* Voice Demo */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center space-x-2">
                <Mic className="h-4 w-4 text-purple-600" />
                <span>Voice Demo</span>
              </h3>
              <div className="space-y-2">
                <Button
                  size="sm"
                  onClick={() => setActiveDemo('voice-recorder')}
                  className="w-full"
                >
                  Test Voice Recorder
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setActiveDemo('voice-player')}
                  className="w-full"
                >
                  Test Voice Player
                </Button>
              </div>
            </Card>

            {/* OCR Demo */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center space-x-2">
                <Scan className="h-4 w-4 text-green-600" />
                <span>OCR Demo</span>
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveDemo('ocr-extractor')}
                className="w-full"
              >
                Test OCR Extract
              </Button>
            </Card>

            {/* System Status */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">System Status</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span>PDF Rendering</span>
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Voice Transcription</span>
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Ready</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>OCR Service</span>
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Available</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Search Index</span>
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Online</Badge>
                </div>
              </div>
            </Card>

            {/* Performance Metrics */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <span>Performance</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span>PDF Load Time</span>
                  <span className="text-green-600">~1.2s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Search Response</span>
                  <span className="text-green-600">~200ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>OCR Processing</span>
                  <span className="text-green-600">~3-5s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Voice Transcription</span>
                  <span className="text-green-600">~2-4s</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Feature Demo Modals */}
        {activeDemo === 'voice-recorder' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl">
              <VoiceAnnotationRecorder
                onSave={handleVoiceRecordingSave}
                onCancel={() => setActiveDemo(null)}
                maxDuration={120}
                autoTranscribe={true}
                className="w-96"
              />
            </div>
          </div>
        )}

        {activeDemo === 'voice-player' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl">
              <VoiceAnnotationPlayer
                audioUrl="/api/placeholder-audio"
                transcript="This is a sample voice annotation transcript demonstrating the playback capabilities with full controls."
                duration={45.2}
                createdBy="test-user-id"
                createdAt={new Date().toISOString()}
                userName="Demo User"
                onDelete={() => setActiveDemo(null)}
                onReply={() => alert('Reply to voice annotation')}
                className="w-96"
              />
            </div>
          </div>
        )}

        {activeDemo === 'ocr-extractor' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <OCRExtractor
                onExtract={handleOCRResult}
                onCancel={() => setActiveDemo(null)}
                defaultMode="text"
                autoExtract={false}
                className="w-full"
              />
            </div>
          </div>
        )}

        {activeDemo === 'advanced-search' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <AdvancedSearch
                assetId={testAssetId}
                onResultSelect={handleSearchResult}
                onClose={() => setActiveDemo(null)}
                defaultQuery={searchQuery}
                showFilters={true}
                maxResults={100}
                className="w-full h-[80vh]"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}