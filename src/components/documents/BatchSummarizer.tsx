'use client'

import React, { useState } from 'react'
import { 
  Brain,
  FileText,
  CheckSquare,
  XCircle,
  Clock,
  Zap,
  BarChart3,
  Download,
  RefreshCw,
  AlertTriangle
} from 'lucide-react'

interface Document {
  id: string
  name: string
  file_type: string
  file_size: number
}

interface BatchResult {
  documentId: string
  documentName: string
  success: boolean
  error?: string
  cached: boolean
  summary?: any
}

interface BatchSummarizerProps {
  documents: Document[]
  organizationId?: string
  onBatchComplete?: (results: BatchResult[]) => void
}

export default function BatchSummarizer({
  documents,
  organizationId,
  onBatchComplete
}: BatchSummarizerProps) {
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [summaryType, setSummaryType] = useState<string>('executive')
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<BatchResult[] | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)

  const summaryTypes = [
    { value: 'executive', label: 'Executive Summary', description: 'High-level strategic insights for leadership' },
    { value: 'detailed', label: 'Detailed Analysis', description: 'Comprehensive analysis with supporting evidence' },
    { value: 'action_oriented', label: 'Action-Oriented', description: 'Focus on actionable items and next steps' },
    { value: 'compliance_focused', label: 'Compliance-Focused', description: 'Regulatory and governance requirements' },
    { value: 'technical', label: 'Technical Review', description: 'Technical details and specifications' }
  ]

  const toggleDocument = (documentId: string) => {
    const newSelected = new Set(selectedDocuments)
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId)
    } else {
      newSelected.add(documentId)
    }
    setSelectedDocuments(newSelected)
  }

  const selectAllDocuments = () => {
    if (selectedDocuments.size === documents.length) {
      setSelectedDocuments(new Set())
    } else {
      setSelectedDocuments(new Set(documents.map(d => d.id)))
    }
  }

  const processBatch = async () => {
    if (selectedDocuments.size === 0) {
      setError('Please select at least one document')
      return
    }

    if (selectedDocuments.size > 10) {
      setError('Maximum 10 documents can be processed at once')
      return
    }

    setIsProcessing(true)
    setError(null)
    setResults(null)
    setProgress({ current: 0, total: selectedDocuments.size })

    try {
      const response = await fetch('/api/documents/batch-summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentIds: Array.from(selectedDocuments),
          summaryType,
          organizationId
        })
      })

      const data = await response.json()

      if (data.success) {
        setResults(data.data.results)
        if (onBatchComplete) {
          onBatchComplete(data.data.results)
        }
      } else {
        throw new Error(data.error || 'Failed to process batch')
      }
    } catch (error) {
      console.error('Error processing batch:', error)
      setError(error.message || 'Failed to process documents')
    } finally {
      setIsProcessing(false)
      setProgress({ current: 0, total: 0 })
    }
  }

  const exportResults = () => {
    if (!results) return

    const successful = results.filter(r => r.success)
    const exportData = successful.map(result => ({
      document: result.documentName,
      summary: result.summary?.executive_summary || result.summary?.executiveSummary || 'No summary available',
      keyInsights: result.summary?.key_insights || result.summary?.keyInsights || [],
      confidence: result.summary?.confidence_score || result.summary?.confidenceScore || 0,
      cached: result.cached
    }))

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `batch-summaries-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getFileTypeIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('word') || fileType.includes('document')) return '📝'
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊'
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📋'
    return '📄'
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Batch Document Summarization</h2>
            <p className="text-gray-600">Process multiple documents with AI-powered analysis</p>
          </div>
        </div>

        {results && (
          <button
            onClick={exportResults}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export Results</span>
          </button>
        )}
      </div>

      {error && (
        <div className="card p-4 border-red-200 bg-red-50">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Error:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Document Selection */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Select Documents</h3>
              <button
                onClick={selectAllDocuments}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                {selectedDocuments.size === documents.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedDocuments.has(document.id)
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleDocument(document.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedDocuments.has(document.id)}
                        onChange={() => toggleDocument(document.id)}
                        className="text-blue-600 rounded"
                      />
                      <span className="text-lg">{getFileTypeIcon(document.file_type)}</span>
                      <div>
                        <p className="font-medium text-gray-900">{document.name}</p>
                        <p className="text-sm text-gray-500">
                          {document.file_type} • {formatFileSize(document.file_size)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Selected: {selectedDocuments.size} of {documents.length} documents
                {selectedDocuments.size > 10 && (
                  <span className="text-red-600 ml-2">(Maximum 10 documents allowed)</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-4">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Configuration</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Summary Type
                </label>
                <select
                  value={summaryType}
                  onChange={(e) => setSummaryType(e.target.value)}
                  disabled={isProcessing}
                  className="input w-full"
                >
                  {summaryTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  {summaryTypes.find(t => t.value === summaryType)?.description}
                </p>
              </div>

              {isProcessing && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    <span className="text-sm text-gray-600">
                      Processing {progress.current} of {progress.total} documents...
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
              )}

              <button
                onClick={processBatch}
                disabled={isProcessing || selectedDocuments.size === 0 || selectedDocuments.size > 10}
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                {isProcessing ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                <span>
                  {isProcessing ? 'Processing...' : `Process ${selectedDocuments.size} Documents`}
                </span>
              </button>
            </div>
          </div>

          {/* Tips */}
          <div className="card p-4 bg-blue-50 border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">💡 Tips for Best Results</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Choose relevant summary type for your use case</li>
              <li>• Process similar document types together</li>
              <li>• Large documents may take longer to process</li>
              <li>• Cached summaries return instantly</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Batch Processing Results</h3>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
              <CheckSquare className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-700">
                {results.filter(r => r.success).length}
              </div>
              <div className="text-sm text-green-600">Successful</div>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border border-red-200 text-center">
              <XCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-700">
                {results.filter(r => !r.success).length}
              </div>
              <div className="text-sm text-red-600">Failed</div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
              <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-700">
                {results.filter(r => r.cached).length}
              </div>
              <div className="text-sm text-blue-600">Cached</div>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 text-center">
              <BarChart3 className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-700">
                {results.filter(r => r.success && !r.cached).length}
              </div>
              <div className="text-sm text-purple-600">New Summaries</div>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 border rounded-lg ${
                  result.success
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {result.success ? (
                      <CheckSquare className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{result.documentName}</p>
                      {result.error && (
                        <p className="text-sm text-red-600">{result.error}</p>
                      )}
                      {result.success && result.summary?.executive_summary && (
                        <p className="text-sm text-gray-600 mt-1">
                          {result.summary.executive_summary.length > 100
                            ? result.summary.executive_summary.substring(0, 100) + '...'
                            : result.summary.executive_summary}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {result.cached && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        Cached
                      </span>
                    )}
                    {result.success && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        {Math.round((result.summary?.confidence_score || result.summary?.confidenceScore || 0) * 100)}% confidence
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}