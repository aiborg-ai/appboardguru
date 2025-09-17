'use client'

import React, { useState, useCallback } from 'react'
import { Upload, File, FileText, Image, Film, Music, Archive, Code, X, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'

interface DocumentUploaderProps {
  onUploadComplete?: (document: any) => void
  currentOrganization?: { id: string; name: string } | null
}

interface FilePreview {
  file: File
  preview?: string
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

const fileIcons: Record<string, React.ReactNode> = {
  'application/pdf': <FileText className="w-8 h-8 text-red-500" />,
  'image/': <Image className="w-8 h-8 text-green-500" />,
  'video/': <Film className="w-8 h-8 text-purple-500" />,
  'audio/': <Music className="w-8 h-8 text-blue-500" />,
  'application/zip': <Archive className="w-8 h-8 text-yellow-500" />,
  'text/': <Code className="w-8 h-8 text-gray-500" />,
  'application/vnd.ms-excel': <FileText className="w-8 h-8 text-green-600" />,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': <FileText className="w-8 h-8 text-green-600" />,
  'application/msword': <FileText className="w-8 h-8 text-blue-600" />,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': <FileText className="w-8 h-8 text-blue-600" />,
  'application/vnd.ms-powerpoint': <FileText className="w-8 h-8 text-orange-600" />,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': <FileText className="w-8 h-8 text-orange-600" />,
}

function getFileIcon(mimeType: string) {
  for (const [key, icon] of Object.entries(fileIcons)) {
    if (mimeType.startsWith(key) || mimeType === key) {
      return icon
    }
  }
  return <File className="w-8 h-8 text-gray-400" />
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

export function DocumentUploader({ onUploadComplete, currentOrganization }: DocumentUploaderProps) {
  const [files, setFiles] = useState<FilePreview[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()
  const supabase = createSupabaseBrowserClient()

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      handleFiles(selectedFiles)
    }
  }, [])

  const handleFiles = (newFiles: File[]) => {
    const filePreviews: FilePreview[] = newFiles.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      progress: 0,
      status: 'pending' as const
    }))
    
    setFiles(prev => [...prev, ...filePreviews])
  }

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev]
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!)
      }
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const uploadFile = async (filePreview: FilePreview, index: number) => {
    try {
      // Update status to uploading
      setFiles(prev => {
        const newFiles = [...prev]
        newFiles[index] = { ...newFiles[index], status: 'uploading', progress: 10 }
        return newFiles
      })

      // Create FormData for upload
      const formData = new FormData()
      formData.append('file', filePreview.file)
      formData.append('title', filePreview.file.name.replace(/\.[^/.]+$/, '')) // Remove extension
      formData.append('description', `Document uploaded on ${new Date().toLocaleDateString()}`)
      formData.append('category', 'document')
      formData.append('folderPath', '/')
      formData.append('tags', 'unattributed')
      
      // If we have a current organization, include it
      if (currentOrganization?.id) {
        formData.append('organizationId', currentOrganization.id)
      }

      setFiles(prev => {
        const newFiles = [...prev]
        newFiles[index] = { ...newFiles[index], progress: 30 }
        return newFiles
      })

      // Use the API endpoint for upload
      const response = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      })

      setFiles(prev => {
        const newFiles = [...prev]
        newFiles[index] = { ...newFiles[index], progress: 60 }
        return newFiles
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle validation errors specially
        if (result.validationErrors) {
          const errorMessages = result.validationErrors.map((err: any) => err.message).join('. ')
          throw new Error(errorMessages)
        }
        throw new Error(result.error || result.message || 'Upload failed')
      }

      setFiles(prev => {
        const newFiles = [...prev]
        newFiles[index] = { ...newFiles[index], progress: 80 }
        return newFiles
      })

      // Handle both response formats for backward compatibility
      const asset = result.data?.asset || result.asset

      // Update file status
      setFiles(prev => {
        const newFiles = [...prev]
        newFiles[index] = { ...newFiles[index], status: 'success', progress: 100 }
        return newFiles
      })

      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete(asset)
      }

      return asset
    } catch (error) {
      console.error('Upload error:', error)
      
      setFiles(prev => {
        const newFiles = [...prev]
        newFiles[index] = { 
          ...newFiles[index], 
          status: 'error', 
          progress: 0,
          error: error instanceof Error ? error.message : 'Upload failed'
        }
        return newFiles
      })
      
      throw error
    }
  }

  const handleUploadAll = async () => {
    setIsUploading(true)
    const pendingFiles = files
      .map((file, index) => ({ file, index }))
      .filter(({ file }) => file.status === 'pending')

    let successCount = 0
    let errorCount = 0

    for (const { file, index } of pendingFiles) {
      try {
        await uploadFile(file, index)
        successCount++
      } catch (error) {
        errorCount++
      }
    }

    setIsUploading(false)

    if (successCount > 0) {
      toast({
        title: 'Upload complete',
        description: `${successCount} document(s) uploaded successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      })
    } else if (errorCount > 0) {
      toast({
        title: 'Upload failed',
        description: `Failed to upload ${errorCount} document(s)`,
        variant: 'destructive'
      })
    }
  }

  const pendingFiles = files.filter(f => f.status === 'pending').length
  const uploadingFiles = files.filter(f => f.status === 'uploading').length
  const successFiles = files.filter(f => f.status === 'success').length
  const errorFiles = files.filter(f => f.status === 'error').length

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold mb-2">
          Drag and drop documents here
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Or click to browse files from your computer
        </p>
        <input
          type="file"
          id="file-upload"
          className="hidden"
          multiple
          onChange={handleFileSelect}
        />
        <label htmlFor="file-upload">
          <Button variant="outline" className="cursor-pointer" asChild>
            <span>Browse Files</span>
          </Button>
        </label>
        <p className="text-xs text-gray-400 mt-4">
          Supports all common document formats (PDF, Word, Excel, PowerPoint, Images, etc.)
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold">
                Files ({files.length})
                {pendingFiles > 0 && <span className="text-gray-500 ml-2">({pendingFiles} pending)</span>}
              </h4>
              {pendingFiles > 0 && (
                <Button
                  onClick={handleUploadAll}
                  disabled={isUploading}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload All ({pendingFiles})
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {files.map((filePreview, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 rounded-lg border bg-gray-50"
                >
                  {/* File Icon/Preview */}
                  <div className="flex-shrink-0">
                    {filePreview.preview ? (
                      <img
                        src={filePreview.preview}
                        alt={filePreview.file.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      getFileIcon(filePreview.file.type)
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {filePreview.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(filePreview.file.size)}
                    </p>
                    
                    {/* Progress Bar */}
                    {filePreview.status === 'uploading' && (
                      <Progress value={filePreview.progress} className="h-1 mt-2" />
                    )}
                    
                    {/* Error Message */}
                    {filePreview.status === 'error' && (
                      <p className="text-xs text-red-600 mt-1">
                        {filePreview.error}
                      </p>
                    )}
                  </div>

                  {/* Status/Actions */}
                  <div className="flex-shrink-0">
                    {filePreview.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                    {filePreview.status === 'uploading' && (
                      <div className="w-8 h-8 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                      </div>
                    )}
                    {filePreview.status === 'success' && (
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    )}
                    {filePreview.status === 'error' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            {(successFiles > 0 || errorFiles > 0) && (
              <div className="mt-4 pt-4 border-t flex gap-4 text-sm">
                {successFiles > 0 && (
                  <span className="text-green-600">
                    ✓ {successFiles} uploaded
                  </span>
                )}
                {errorFiles > 0 && (
                  <span className="text-red-600">
                    ✗ {errorFiles} failed
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-medium text-blue-900 mb-2">
            Two-Stage Upload Process
          </h4>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. Upload your documents without any requirements</li>
            <li>2. After upload, add organization, vaults, and share with BoardMates</li>
            <li>3. Collaborate with annotations and discussions on each document</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}