'use client'

import React, { useState } from 'react'
import { EnhancedPDFViewer } from '@/components/pdf/EnhancedPDFViewer'
import { VoiceAnnotationRecorder } from '@/components/pdf/VoiceAnnotationRecorder'
import { VoiceAnnotationPlayer } from '@/components/pdf/VoiceAnnotationPlayer'
import { OCRExtractor } from '@/components/pdf/OCRExtractor'
import { Card } from '@/components/molecules/cards/card'
import { Button } from '@/components/atoms/Button/Button'
import { AssetId, AnnotationType } from '@/types/annotation-types'

export default function TestVoiceAnnotationsPage() {
  const [currentMode, setCurrentMode] = useState<AnnotationType>('highlight')
  const [showRecorderDemo, setShowRecorderDemo] = useState(false)
  const [showPlayerDemo, setShowPlayerDemo] = useState(false)
  const [showOCRDemo, setShowOCRDemo] = useState(false)
  
  // Mock asset ID for testing
  const testAssetId = 'test-asset-id' as AssetId
  
  // Sample PDF URL (can be any PDF)
  const testPdfUrl = 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf'
  
  const handleRecorderSave = async (audioBlob: Blob, transcript: string, duration: number) => {
    console.log('Voice recording saved:', {
      size: audioBlob.size,
      transcript,
      duration
    })
    setShowRecorderDemo(false)
    alert(`Voice note recorded!\nTranscript: ${transcript}\nDuration: ${duration.toFixed(1)}s`)
  }
  
  const handleRecorderCancel = () => {
    setShowRecorderDemo(false)
  }
  
  const handlePlayerDelete = () => {
    alert('Voice annotation deleted')
    setShowPlayerDemo(false)
  }
  
  const handlePlayerReply = () => {
    alert('Reply to voice annotation')
  }

  const handleOCRResult = (result: any) => {
    console.log('OCR Result:', result)
    alert(`OCR Extraction completed!\nMode: ${result.metadata.mode}\nConfidence: ${(result.metadata.confidence * 100).toFixed(1)}%`)
    setShowOCRDemo(false)
  }

  const handleOCRCancel = () => {
    setShowOCRDemo(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Voice Annotations Test Page
          </h1>
          <p className="text-gray-600">
            Test the voice annotation functionality in PDF documents
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* PDF Viewer */}
          <div className="lg:col-span-2">
            <Card className="h-[800px]">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold mb-4">PDF with Voice Annotations</h2>
                
                <div className="flex items-center space-x-2 mb-4">
                  <span className="text-sm text-gray-600">Annotation Mode:</span>
                  <select 
                    value={currentMode} 
                    onChange={(e) => setCurrentMode(e.target.value as AnnotationType)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="highlight">Highlight</option>
                    <option value="textbox">Text Note</option>
                    <option value="drawing">Drawing</option>
                    <option value="area">Area</option>
                    <option value="stamp">Stamp</option>
                    <option value="voice">Voice Note</option>
                  </select>
                </div>
                
                {currentMode === 'voice' && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Voice Mode Active:</strong> Click anywhere on the PDF to create a voice annotation. 
                      The voice recorder will appear and you can record your thoughts.
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

          {/* Demo Controls */}
          <div className="space-y-6">
            {/* Voice Recorder Demo */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Voice Recorder Demo</h3>
              <p className="text-sm text-gray-600 mb-4">
                Test the voice recording component independently
              </p>
              <Button 
                onClick={() => setShowRecorderDemo(true)}
                className="w-full"
              >
                Test Voice Recorder
              </Button>
            </Card>

            {/* Voice Player Demo */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Voice Player Demo</h3>
              <p className="text-sm text-gray-600 mb-4">
                Test the voice playback component with sample audio
              </p>
              <Button 
                onClick={() => setShowPlayerDemo(true)}
                className="w-full"
                variant="secondary"
              >
                Test Voice Player
              </Button>
            </Card>

            {/* OCR Extractor Demo */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">OCR Extractor Demo</h3>
              <p className="text-sm text-gray-600 mb-4">
                Test OCR text extraction from images and documents
              </p>
              <Button 
                onClick={() => setShowOCRDemo(true)}
                className="w-full"
                variant="outline"
              >
                Test OCR Extract
              </Button>
            </Card>

            {/* Instructions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Instructions</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div>
                  <strong>1. Voice Annotations in PDF:</strong>
                  <p>Select "Voice Note" mode and click on the PDF to start recording</p>
                </div>
                <div>
                  <strong>2. Recording Features:</strong>
                  <p>• Real-time waveform visualization</p>
                  <p>• Automatic transcription</p>
                  <p>• Playback before saving</p>
                </div>
                <div>
                  <strong>3. Playback Features:</strong>
                  <p>• Full audio controls</p>
                  <p>• Transcript display</p>
                  <p>• Speed adjustment</p>
                </div>
                <div>
                  <strong>4. OCR Features:</strong>
                  <p>• Text extraction from images</p>
                  <p>• Table and form recognition</p>
                  <p>• Multiple output formats</p>
                </div>
              </div>
            </Card>

            {/* Status */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">System Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Voice Recording</span>
                  <span className="text-green-600">✓ Available</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Transcription API</span>
                  <span className="text-green-600">✓ Configured</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>PDF Annotations</span>
                  <span className="text-green-600">✓ Enabled</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>OCR Service</span>
                  <span className="text-green-600">✓ Available</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Voice Recorder Modal */}
        {showRecorderDemo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl">
              <VoiceAnnotationRecorder
                onSave={handleRecorderSave}
                onCancel={handleRecorderCancel}
                maxDuration={120}
                autoTranscribe={true}
                className="w-96"
              />
            </div>
          </div>
        )}

        {/* Voice Player Modal */}
        {showPlayerDemo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl">
              <VoiceAnnotationPlayer
                audioUrl="/api/placeholder-audio" // This would be a real audio URL
                transcript="This is a sample voice annotation transcript. The voice note discusses important points about the document."
                duration={45.2}
                createdBy="test-user-id"
                createdAt={new Date().toISOString()}
                userName="Test User"
                onDelete={handlePlayerDelete}
                onReply={handlePlayerReply}
                className="w-96"
              />
            </div>
          </div>
        )}

        {/* OCR Extractor Modal */}
        {showOCRDemo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <OCRExtractor
                onExtract={handleOCRResult}
                onCancel={handleOCRCancel}
                defaultMode="text"
                autoExtract={false}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}