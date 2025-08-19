'use client'

import React, { useState } from 'react'
import { FileText, Loader, CheckCircle, AlertCircle, Volume2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { summarizeDocumentAPI } from '@/lib/api/openrouter-client'
import type { DocumentSummaryRequest, DocumentSummaryResponse } from '@/types/openrouter'

interface DocumentSummarizerProps {
  boardPack: {
    id: string
    title: string
    file_name: string
    summary?: string
  }
  content: string
  onSummaryGenerated?: (summary: string) => void
}

export function DocumentSummarizer({ boardPack, content, onSummaryGenerated }: DocumentSummarizerProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [summary, setSummary] = useState<string>(boardPack.summary || '')
  const [audioScript, setAudioScript] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [summaryOptions, setSummaryOptions] = useState({
    includeKeyPoints: true,
    includeActionItems: true,
    maxLength: 'medium' as const
  })

  const generateSummary = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const request: DocumentSummaryRequest = {
        content,
        fileName: boardPack.file_name,
        ...summaryOptions
      }

      const response: DocumentSummaryResponse = await summarizeDocumentAPI(request)

      if (response.success && response.summary) {
        setSummary(response.summary)
        if (response.audioScript) {
          setAudioScript(response.audioScript)
        }
        onSummaryGenerated?.(response.summary)
      } else {
        throw new Error(response.error || 'Failed to generate summary')
      }
    } catch (error) {
      console.error('Summarization error:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate summary')
    } finally {
      setIsGenerating(false)
    }
  }

  const exportSummary = () => {
    const blob = new Blob([summary], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${boardPack.title}-summary.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Document Summary</h3>
              <p className="text-sm text-gray-600">{boardPack.file_name}</p>
            </div>
          </div>
          {summary && (
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={exportSummary}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              {audioScript && (
                <Button variant="outline" size="sm" title="Audio script available">
                  <Volume2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {!summary && !isGenerating && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Generate AI Summary</h4>
              <p className="text-gray-600 mb-6">
                Create an intelligent summary of this board document with key insights and action items.
              </p>
            </div>

            {/* Summary Options */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h5 className="font-medium text-gray-900">Summary Options</h5>
              
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={summaryOptions.includeKeyPoints}
                    onChange={(e) => setSummaryOptions(prev => ({ ...prev, includeKeyPoints: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Include key points & risks</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={summaryOptions.includeActionItems}
                    onChange={(e) => setSummaryOptions(prev => ({ ...prev, includeActionItems: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Include action items</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Summary Length</label>
                <select
                  value={summaryOptions.maxLength}
                  onChange={(e) => setSummaryOptions(prev => ({ ...prev, maxLength: e.target.value as any }))}
                  className="block w-32 rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Detailed</option>
                </select>
              </div>
            </div>

            <Button onClick={generateSummary} className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              Generate AI Summary
            </Button>
          </div>
        )}

        {isGenerating && (
          <div className="text-center py-12">
            <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">Generating Summary...</h4>
            <p className="text-gray-600">
              Our AI is analyzing your document and creating a comprehensive summary.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Summary Generation Failed</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setError(null)} 
              className="mt-3"
            >
              Try Again
            </Button>
          </div>
        )}

        {summary && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-green-600 mb-4">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Summary generated successfully</span>
            </div>

            <div className="prose max-w-none">
              <div className="bg-gray-50 rounded-lg p-6">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                  {summary}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <Button variant="outline" onClick={generateSummary} disabled={isGenerating}>
                <FileText className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
              <div className="text-xs text-gray-500">
                Powered by OpenRouter AI
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}