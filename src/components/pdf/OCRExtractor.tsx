/**
 * OCRExtractor Component
 * Extracts text from PDF pages and images using OCR technology
 */

'use client'

import React, { useState, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/cards/card'
import { Badge } from '@/components/atoms/display/badge'
import { 
  FileText,
  Image,
  Table,
  FileSpreadsheet,
  Download,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react'

export type OCRExtractionMode = 'text' | 'table' | 'form'

interface OCRExtractorProps {
  onExtract?: (extractedData: OCRResult) => void
  onCancel?: () => void
  className?: string
  defaultMode?: OCRExtractionMode
  autoExtract?: boolean
  imageUrl?: string
  pageNumber?: number
}

interface OCRResult {
  text?: string
  tables?: Array<{
    headers: string[]
    rows: string[][]
    title?: string
  }>
  formFields?: Array<{
    label: string
    value: string
    type: string
  }>
  formTitle?: string
  metadata: {
    mode: OCRExtractionMode
    format: string
    size: number
    confidence: number
    processingTime: number
    timestamp: string
  }
}

type ExtractionState = 'idle' | 'processing' | 'completed' | 'error'

export const OCRExtractor = React.memo<OCRExtractorProps>(function OCRExtractor({
  onExtract,
  onCancel,
  className,
  defaultMode = 'text',
  autoExtract = false,
  imageUrl,
  pageNumber
}) {
  // State
  const [extractionMode, setExtractionMode] = useState<OCRExtractionMode>(defaultMode)
  const [extractionState, setExtractionState] = useState<ExtractionState>('idle')
  const [extractedData, setExtractedData] = useState<OCRResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState<boolean>(true)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(imageUrl || null)

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff']
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, WebP, BMP, TIFF)')
      return
    }

    // Validate file size (20MB max)
    const maxSize = 20 * 1024 * 1024
    if (file.size > maxSize) {
      setError('File size too large (max 20MB)')
      return
    }

    setSelectedImage(file)
    setError(null)

    // Create preview URL
    const previewUrl = URL.createObjectURL(file)
    setImagePreviewUrl(previewUrl)

    // Auto-extract if enabled
    if (autoExtract) {
      extractFromFile(file)
    }
  }, [autoExtract])

  // Extract text from file
  const extractFromFile = useCallback(async (file: File) => {
    if (!file) return

    setExtractionState('processing')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('mode', extractionMode)

      const response = await fetch('/api/ocr/extract', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `OCR failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        const ocrResult: OCRResult = {
          ...result.extractedData,
          metadata: result.metadata
        }
        
        setExtractedData(ocrResult)
        setExtractionState('completed')
        onExtract?.(ocrResult)
      } else {
        throw new Error(result.error || 'OCR extraction failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'OCR extraction failed'
      setError(errorMessage)
      setExtractionState('error')
    }
  }, [extractionMode, onExtract])

  // Extract from URL
  const extractFromUrl = useCallback(async (url: string) => {
    setExtractionState('processing')
    setError(null)

    try {
      // Fetch the image and convert to base64
      const imageResponse = await fetch(url)
      const imageBlob = await imageResponse.blob()
      
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64Data = reader.result as string
        const base64Image = base64Data.split(',')[1]
        
        const response = await fetch('/api/ocr/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64Image,
            format: 'png',
            mode: extractionMode
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `OCR failed: ${response.statusText}`)
        }

        const result = await response.json()
        
        if (result.success) {
          const ocrResult: OCRResult = {
            ...result.extractedData,
            metadata: result.metadata
          }
          
          setExtractedData(ocrResult)
          setExtractionState('completed')
          onExtract?.(ocrResult)
        } else {
          throw new Error(result.error || 'OCR extraction failed')
        }
      }
      
      reader.readAsDataURL(imageBlob)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'OCR extraction failed'
      setError(errorMessage)
      setExtractionState('error')
    }
  }, [extractionMode, onExtract])

  // Handle extraction button click
  const handleExtract = useCallback(() => {
    if (selectedImage) {
      extractFromFile(selectedImage)
    } else if (imageUrl) {
      extractFromUrl(imageUrl)
    }
  }, [selectedImage, imageUrl, extractFromFile, extractFromUrl])

  // Copy extracted text
  const handleCopyText = useCallback(async () => {
    if (!extractedData) return

    let textToCopy = ''
    if (extractedData.text) {
      textToCopy = extractedData.text
    } else if (extractedData.tables) {
      textToCopy = extractedData.tables.map(table => {
        const headerRow = table.headers.join('\t')
        const dataRows = table.rows.map(row => row.join('\t')).join('\n')
        return `${table.title || 'Table'}:\n${headerRow}\n${dataRows}`
      }).join('\n\n')
    } else if (extractedData.formFields) {
      textToCopy = extractedData.formFields.map(field => 
        `${field.label}: ${field.value}`
      ).join('\n')
    }

    try {
      await navigator.clipboard.writeText(textToCopy)
      // Could show a toast notification here
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }, [extractedData])

  // Download extracted data
  const handleDownload = useCallback(() => {
    if (!extractedData) return

    const filename = `extracted_${extractionMode}_${Date.now()}.${extractionMode === 'table' ? 'csv' : 'txt'}`
    let content = ''

    if (extractedData.text) {
      content = extractedData.text
    } else if (extractedData.tables) {
      // Convert tables to CSV
      content = extractedData.tables.map(table => {
        const headerRow = table.headers.join(',')
        const dataRows = table.rows.map(row => 
          row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
        ).join('\n')
        return `${headerRow}\n${dataRows}`
      }).join('\n\n')
    } else if (extractedData.formFields) {
      content = extractedData.formFields.map(field => 
        `${field.label}: ${field.value}`
      ).join('\n')
    }

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [extractedData, extractionMode])

  // Reset extraction
  const handleReset = useCallback(() => {
    setExtractionState('idle')
    setExtractedData(null)
    setError(null)
    setSelectedImage(null)
    if (imagePreviewUrl && !imageUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
      setImagePreviewUrl(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [imagePreviewUrl, imageUrl])

  const extractionModes = [
    {
      id: 'text' as const,
      label: 'Text Extract',
      icon: FileText,
      description: 'Extract all text content'
    },
    {
      id: 'table' as const,
      label: 'Table Extract',
      icon: Table,
      description: 'Extract tabular data as CSV'
    },
    {
      id: 'form' as const,
      label: 'Form Extract',
      icon: FileSpreadsheet,
      description: 'Extract form fields and values'
    }
  ]

  return (
    <Card className={cn('p-6 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Image className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-medium">OCR Text Extraction</h3>
          {pageNumber && (
            <Badge variant="secondary" className="text-xs">
              Page {pageNumber}
            </Badge>
          )}
        </div>
        
        {onCancel && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancel}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Mode selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Extraction Mode:</label>
        <div className="grid grid-cols-1 gap-2">
          {extractionModes.map((mode) => {
            const Icon = mode.icon
            const isSelected = extractionMode === mode.id
            
            return (
              <button
                key={mode.id}
                onClick={() => setExtractionMode(mode.id)}
                className={cn(
                  'flex items-center space-x-3 p-3 rounded-lg border text-left transition-colors',
                  isSelected 
                    ? 'bg-blue-50 border-blue-200 text-blue-900' 
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon className="h-4 w-4" />
                <div>
                  <div className="text-sm font-medium">{mode.label}</div>
                  <div className="text-xs text-gray-500">{mode.description}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* File input */}
      {!imageUrl && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Select Image:</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
      )}

      {/* Image preview */}
      {imagePreviewUrl && showPreview && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Preview:</label>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPreview(!showPreview)}
              className="h-6 px-2 text-xs"
            >
              {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <img
              src={imagePreviewUrl}
              alt="OCR Preview"
              className="w-full h-48 object-contain bg-gray-50"
            />
          </div>
        </div>
      )}

      {/* Extract button */}
      {extractionState !== 'completed' && (
        <Button
          onClick={handleExtract}
          disabled={extractionState === 'processing' || (!selectedImage && !imageUrl)}
          className="w-full flex items-center space-x-2"
        >
          {extractionState === 'processing' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          <span>
            {extractionState === 'processing' ? 'Extracting...' : 'Extract Text'}
          </span>
        </Button>
      )}

      {/* Results */}
      {extractionState === 'completed' && extractedData && (
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-700">
                Extraction Completed
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyText}
                className="h-6 px-2"
                title="Copy to clipboard"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDownload}
                className="h-6 px-2"
                title="Download as file"
              >
                <Download className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReset}
                className="h-6 px-2"
                title="Reset"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Display extracted content */}
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
            {extractedData.text && (
              <pre className="text-sm whitespace-pre-wrap text-gray-900">
                {extractedData.text}
              </pre>
            )}
            
            {extractedData.tables && (
              <div className="space-y-4">
                {extractedData.tables.map((table, index) => (
                  <div key={index}>
                    {table.title && (
                      <h4 className="text-sm font-medium mb-2">{table.title}</h4>
                    )}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            {table.headers.map((header, i) => (
                              <th key={i} className="border border-gray-300 px-2 py-1 text-left">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {table.rows.map((row, i) => (
                            <tr key={i}>
                              {row.map((cell, j) => (
                                <td key={j} className="border border-gray-300 px-2 py-1">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {extractedData.formFields && (
              <div className="space-y-2">
                {extractedData.formTitle && (
                  <h4 className="text-sm font-medium mb-2">{extractedData.formTitle}</h4>
                )}
                {extractedData.formFields.map((field, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <span className="font-medium text-gray-700">{field.label}:</span>
                    <span className="text-gray-900">{field.value}</span>
                    <Badge variant="secondary" className="text-xs">
                      {field.type}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="text-xs text-gray-500 space-y-1">
            <div>Confidence: {(extractedData.metadata.confidence * 100).toFixed(1)}%</div>
            <div>Processing Time: {(extractedData.metadata.processingTime / 1000).toFixed(2)}s</div>
            <div>Format: {extractedData.metadata.format.toUpperCase()}</div>
          </div>
        </div>
      )}
    </Card>
  )
})

OCRExtractor.displayName = 'OCRExtractor'