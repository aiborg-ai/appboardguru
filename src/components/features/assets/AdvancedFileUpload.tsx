'use client'

import React, { useState, useRef, useCallback, useMemo } from 'react'
import {
  Upload,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  X,
  CheckCircle,
  AlertCircle,
  Loader,
  Plus,
  Pause,
  Play,
  RotateCcw,
  AlertTriangle,
  Clock,
  HardDrive
} from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/cards/card'
import { Input } from '@/components/atoms/form/input'
import { Textarea } from '@/components/atoms/form/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

export interface ChunkedUploadFile {
  id: string
  file: File
  title: string
  description?: string
  category: string
  tags: string[]
  folder: string
  status: 'pending' | 'uploading' | 'paused' | 'processing' | 'success' | 'error'
  progress: number
  uploadedBytes: number
  totalBytes: number
  uploadSpeed?: number
  timeRemaining?: number
  chunkSize: number
  currentChunk: number
  totalChunks: number
  error?: string
  preview?: string
  resumeToken?: string
}

interface AdvancedFileUploadProps {
  onUploadComplete?: (files: ChunkedUploadFile[]) => void
  onUploadProgress?: (fileId: string, progress: number, speed: number) => void
  onUploadPaused?: (fileId: string) => void
  onUploadResumed?: (fileId: string) => void
  organizationId: string
  vaultId?: string
  currentFolder?: string
  maxFileSize?: number
  allowedFileTypes?: readonly string[]
  maxFiles?: number
  chunkSize?: number
  enableResumable?: boolean
  enableParallelUploads?: boolean
  maxConcurrentUploads?: number
  className?: string
}

const CATEGORIES = [
  { value: 'board-documents', label: 'Board Documents' },
  { value: 'financial', label: 'Financial Reports' },
  { value: 'legal', label: 'Legal Documents' },
  { value: 'presentations', label: 'Presentations' },
  { value: 'policies', label: 'Policies & Procedures' },
  { value: 'meeting-materials', label: 'Meeting Materials' },
  { value: 'compliance', label: 'Compliance Documents' },
  { value: 'contracts', label: 'Contracts & Agreements' },
  { value: 'general', label: 'General Documents' }
]

const FOLDERS = [
  { value: '/', label: 'Root Folder' },
  { value: '/board-meetings', label: 'Board Meetings' },
  { value: '/financial-reports', label: 'Financial Reports' },
  { value: '/legal-documents', label: 'Legal Documents' },
  { value: '/archived', label: 'Archived' }
]

const DEFAULT_CHUNK_SIZE = 1024 * 1024 * 5 // 5MB chunks
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_CONCURRENT_UPLOADS = 3

export function AdvancedFileUpload({
  onUploadComplete,
  onUploadProgress,
  onUploadPaused,
  onUploadResumed,
  organizationId,
  vaultId,
  currentFolder = '/',
  maxFileSize = MAX_FILE_SIZE,
  allowedFileTypes = ['*'],
  maxFiles = 10,
  chunkSize = DEFAULT_CHUNK_SIZE,
  enableResumable = true,
  enableParallelUploads = true,
  maxConcurrentUploads = MAX_CONCURRENT_UPLOADS,
  className = ''
}: AdvancedFileUploadProps) {
  const [files, setFiles] = useState<ChunkedUploadFile[]>([])
  const [isDragActive, setIsDragActive] = useState(false)
  const [activeUploads, setActiveUploads] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadControllers = useRef<Map<string, AbortController>>(new Map())

  const getFileIcon = useCallback((file: File) => {
    const type = file.type
    if (type.includes('image')) return Image
    if (type.includes('video')) return Video
    if (type.includes('audio')) return Music
    if (type.includes('zip') || type.includes('rar')) return Archive
    return FileText
  }, [])

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }, [])

  const formatTime = useCallback((seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  }, [])

  const formatSpeed = useCallback((bytesPerSecond: number) => {
    return `${formatFileSize(bytesPerSecond)}/s`
  }, [formatFileSize])

  const calculateChunks = useCallback((fileSize: number, chunkSize: number) => {
    return Math.ceil(fileSize / chunkSize)
  }, [])

  const createFilePreview = useCallback(async (file: File): Promise<string | undefined> => {
    if (file.type.startsWith('image/')) {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.readAsDataURL(file)
      })
    }
    return undefined
  }, [])

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File size exceeds ${formatFileSize(maxFileSize)} limit`
    }

    if (allowedFileTypes[0] !== '*' && !allowedFileTypes.some(type => 
      file.type.includes(type) || file.name.toLowerCase().endsWith(type)
    )) {
      return `File type ${file.type} is not allowed`
    }

    return null
  }, [maxFileSize, allowedFileTypes, formatFileSize])

  const generateFileId = useCallback(() => {
    return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    const newFiles: ChunkedUploadFile[] = []
    
    for (let i = 0; i < Math.min(fileList.length, maxFiles - files.length); i++) {
      const file = fileList instanceof FileList ? fileList[i] : fileList[i]
      if (!file) continue

      const validationError = validateFile(file)
      const preview = await createFilePreview(file)
      const totalChunks = calculateChunks(file.size, chunkSize)
      
      const fileItem: ChunkedUploadFile = {
        id: generateFileId(),
        file,
        title: file.name.split('.').slice(0, -1).join('.'),
        category: 'general',
        tags: [],
        folder: currentFolder,
        status: validationError ? 'error' : 'pending',
        progress: 0,
        uploadedBytes: 0,
        totalBytes: file.size,
        chunkSize,
        currentChunk: 0,
        totalChunks,
        error: validationError || undefined,
        preview
      }
      
      newFiles.push(fileItem)
    }
    
    setFiles(prev => [...prev, ...newFiles])
  }, [files.length, maxFiles, validateFile, createFilePreview, calculateChunks, chunkSize, currentFolder, generateFileId])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    processFiles(droppedFiles)
  }, [processFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files)
    }
  }, [processFiles])

  const updateFile = useCallback((fileId: string, updates: Partial<ChunkedUploadFile>) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, ...updates } : file
    ))
  }, [])

  const removeFile = useCallback((fileId: string) => {
    // Cancel upload if in progress
    const controller = uploadControllers.current.get(fileId)
    if (controller) {
      controller.abort()
      uploadControllers.current.delete(fileId)
    }
    
    setFiles(prev => prev.filter(file => file.id !== fileId))
    setActiveUploads(prev => {
      const newSet = new Set(prev)
      newSet.delete(fileId)
      return newSet
    })
  }, [])

  const uploadChunk = useCallback(async (
    file: ChunkedUploadFile,
    chunkIndex: number,
    controller: AbortController
  ): Promise<{ success: boolean; resumeToken?: string; error?: string }> => {
    const start = chunkIndex * file.chunkSize
    const end = Math.min(start + file.chunkSize, file.totalBytes)
    const chunk = file.file.slice(start, end)

    const formData = new FormData()
    formData.append('chunk', chunk)
    formData.append('chunkIndex', chunkIndex.toString())
    formData.append('totalChunks', file.totalChunks.toString())
    formData.append('fileName', file.file.name)
    formData.append('fileId', file.id)
    formData.append('organizationId', organizationId)
    
    if (vaultId) formData.append('vaultId', vaultId)
    if (file.resumeToken) formData.append('resumeToken', file.resumeToken)

    try {
      const response = await fetch('/api/assets/upload/chunk', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      return { success: true, resumeToken: data.resumeToken }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Upload cancelled' }
      }
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }, [organizationId, vaultId])

  const finalizeUpload = useCallback(async (
    file: ChunkedUploadFile,
    resumeToken: string,
    controller: AbortController
  ): Promise<{ success: boolean; asset?: any; error?: string }> => {
    const formData = new FormData()
    formData.append('resumeToken', resumeToken)
    formData.append('title', file.title)
    formData.append('description', file.description || '')
    formData.append('category', file.category)
    formData.append('tags', file.tags.join(','))
    formData.append('folder', file.folder)
    formData.append('organizationId', organizationId)
    
    if (vaultId) formData.append('vaultId', vaultId)

    try {
      const response = await fetch('/api/assets/upload/finalize', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      return { success: true, asset: data.asset }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Upload cancelled' }
      }
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }, [organizationId, vaultId])

  const uploadFile = useCallback(async (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (!file || file.status !== 'pending') return

    const controller = new AbortController()
    uploadControllers.current.set(fileId, controller)
    
    updateFile(fileId, { 
      status: 'uploading',
      uploadSpeed: 0,
      timeRemaining: 0
    })

    setActiveUploads(prev => new Set(prev).add(fileId))

    let resumeToken = file.resumeToken
    const startTime = Date.now()
    let lastProgressTime = startTime

    try {
      // Upload chunks
      for (let chunkIndex = file.currentChunk; chunkIndex < file.totalChunks; chunkIndex++) {
        const chunkStartTime = Date.now()
        
        const result = await uploadChunk(file, chunkIndex, controller)
        
        if (!result.success) {
          throw new Error(result.error)
        }

        resumeToken = result.resumeToken

        // Update progress
        const uploadedBytes = (chunkIndex + 1) * file.chunkSize
        const actualUploadedBytes = Math.min(uploadedBytes, file.totalBytes)
        const progress = Math.round((actualUploadedBytes / file.totalBytes) * 100)
        
        // Calculate speed and time remaining
        const elapsed = Date.now() - startTime
        const speed = actualUploadedBytes / (elapsed / 1000)
        const remainingBytes = file.totalBytes - actualUploadedBytes
        const timeRemaining = speed > 0 ? remainingBytes / speed : 0

        updateFile(fileId, {
          progress,
          uploadedBytes: actualUploadedBytes,
          currentChunk: chunkIndex + 1,
          uploadSpeed: speed,
          timeRemaining,
          resumeToken
        })

        onUploadProgress?.(fileId, progress, speed)

        // Throttle progress updates
        const now = Date.now()
        if (now - lastProgressTime > 500) { // Update every 500ms
          lastProgressTime = now
        }
      }

      // Finalize upload
      updateFile(fileId, { status: 'processing' })
      
      const finalizeResult = await finalizeUpload(file, resumeToken!, controller)
      
      if (!finalizeResult.success) {
        throw new Error(finalizeResult.error)
      }

      updateFile(fileId, { 
        status: 'success',
        progress: 100,
        uploadedBytes: file.totalBytes
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      updateFile(fileId, { 
        status: 'error', 
        error: errorMessage 
      })
    } finally {
      uploadControllers.current.delete(fileId)
      setActiveUploads(prev => {
        const newSet = new Set(prev)
        newSet.delete(fileId)
        return newSet
      })
    }
  }, [files, updateFile, uploadChunk, finalizeUpload, onUploadProgress])

  const pauseUpload = useCallback((fileId: string) => {
    const controller = uploadControllers.current.get(fileId)
    if (controller) {
      controller.abort()
      uploadControllers.current.delete(fileId)
    }
    
    updateFile(fileId, { status: 'paused' })
    setActiveUploads(prev => {
      const newSet = new Set(prev)
      newSet.delete(fileId)
      return newSet
    })
    
    onUploadPaused?.(fileId)
  }, [updateFile, onUploadPaused])

  const resumeUpload = useCallback((fileId: string) => {
    updateFile(fileId, { status: 'pending' })
    onUploadResumed?.(fileId)
    uploadFile(fileId)
  }, [updateFile, onUploadResumed, uploadFile])

  const retryUpload = useCallback((fileId: string) => {
    updateFile(fileId, { 
      status: 'pending',
      progress: 0,
      uploadedBytes: 0,
      currentChunk: 0,
      error: undefined,
      resumeToken: undefined
    })
    uploadFile(fileId)
  }, [updateFile, uploadFile])

  const uploadAllFiles = useCallback(async () => {
    const pendingFiles = files.filter(file => file.status === 'pending')
    
    if (!enableParallelUploads) {
      // Sequential uploads
      for (const file of pendingFiles) {
        await uploadFile(file.id)
      }
    } else {
      // Parallel uploads with concurrency limit
      const uploadPromises = pendingFiles.slice(0, maxConcurrentUploads).map(file => uploadFile(file.id))
      await Promise.all(uploadPromises)
    }

    // Notify completion
    const successfulFiles = files.filter(file => file.status === 'success')
    if (successfulFiles.length > 0) {
      onUploadComplete?.(successfulFiles)
    }
  }, [files, enableParallelUploads, maxConcurrentUploads, uploadFile, onUploadComplete])

  const getOverallProgress = useMemo(() => {
    if (files.length === 0) return 0
    const totalBytes = files.reduce((acc, file) => acc + file.totalBytes, 0)
    const uploadedBytes = files.reduce((acc, file) => acc + file.uploadedBytes, 0)
    return Math.round((uploadedBytes / totalBytes) * 100)
  }, [files])

  const getStatusCounts = useMemo(() => {
    return files.reduce((acc, file) => {
      acc[file.status] = (acc[file.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [files])

  const canStartUpload = files.some(file => file.status === 'pending') && activeUploads.size === 0

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Drag and Drop Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {isDragActive ? 'Drop files here' : 'Advanced File Upload'}
        </h3>
        <p className="text-gray-600 mb-4">
          Drag and drop your files here, or click to browse<br />
          {enableResumable && 'Resumable uploads supported'}
        </p>
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="mb-4"
        >
          <Plus className="h-4 w-4 mr-2" />
          Choose Files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedFileTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="text-xs text-gray-500">
          Maximum {maxFiles} files, up to {formatFileSize(maxFileSize)} each<br />
          {enableResumable && 'Large file uploads will be chunked automatically'}
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Files ({files.length})
            </h3>
            
            {/* Overall Progress */}
            {getOverallProgress() > 0 && (
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  Overall Progress: {getOverallProgress()}%
                </div>
                <Progress value={getOverallProgress()} className="w-32" />
              </div>
            )}
          </div>

          {/* Status Summary */}
          <div className="flex items-center space-x-4 mb-6 text-sm">
            {Object.entries(getStatusCounts()).map(([status, count]) => (
              <Badge
                key={status}
                variant={
                  status === 'success' ? 'default' :
                  status === 'error' ? 'destructive' :
                  status === 'uploading' ? 'secondary' :
                  'outline'
                }
              >
                {status}: {count}
              </Badge>
            ))}
          </div>

          {/* Files */}
          <div className="space-y-4">
            {files.map((file) => {
              const FileIcon = getFileIcon(file.file)
              
              return (
                <Card key={file.id} className="p-4">
                  <div className="flex items-start space-x-4">
                    {/* File Icon/Preview */}
                    <div className="flex-shrink-0">
                      {file.preview ? (
                        <img
                          src={file.preview}
                          alt="Preview"
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                          <FileIcon className="h-8 w-8 text-gray-600" />
                        </div>
                      )}
                    </div>

                    {/* File Details */}
                    <div className="flex-1 min-w-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title *
                          </label>
                          <Input
                            value={file.title}
                            onChange={(e) => updateFile(file.id, { title: e.target.value })}
                            className="text-sm"
                            disabled={file.status === 'uploading' || file.status === 'processing'}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category
                          </label>
                          <Select
                            value={file.category}
                            onValueChange={(value) => updateFile(file.id, { category: value })}
                            disabled={file.status === 'uploading' || file.status === 'processing'}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map(cat => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <Textarea
                          value={file.description || ''}
                          onChange={(e) => updateFile(file.id, { description: e.target.value })}
                          rows={2}
                          className="text-sm mb-3"
                          disabled={file.status === 'uploading' || file.status === 'processing'}
                        />
                      </div>

                      {/* File Info and Status */}
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <HardDrive className="h-4 w-4 mr-1" />
                            {file.file.name} • {formatFileSize(file.file.size)}
                          </span>
                          
                          {file.status === 'uploading' && (
                            <>
                              <span className="flex items-center">
                                <Loader className="h-4 w-4 mr-1 animate-spin" />
                                {formatFileSize(file.uploadedBytes)} / {formatFileSize(file.totalBytes)}
                              </span>
                              
                              {file.uploadSpeed && (
                                <span>Speed: {formatSpeed(file.uploadSpeed)}</span>
                              )}
                              
                              {file.timeRemaining && file.timeRemaining > 0 && (
                                <span className="flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {formatTime(file.timeRemaining)}
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        {/* Status Icon */}
                        <div className="flex items-center space-x-2">
                          {file.status === 'pending' && (
                            <Badge variant="outline">Ready</Badge>
                          )}
                          {file.status === 'uploading' && (
                            <Badge variant="secondary">Uploading {file.progress}%</Badge>
                          )}
                          {file.status === 'paused' && (
                            <Badge variant="outline">Paused</Badge>
                          )}
                          {file.status === 'processing' && (
                            <Badge variant="secondary">Processing</Badge>
                          )}
                          {file.status === 'success' && (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Complete
                            </Badge>
                          )}
                          {file.status === 'error' && (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Error
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {(file.status === 'uploading' || file.status === 'processing') && (
                        <Progress value={file.progress} className="mb-2" />
                      )}

                      {/* Error Message */}
                      {file.status === 'error' && file.error && (
                        <div className="text-sm text-red-600 mb-2 flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          {file.error}
                        </div>
                      )}

                      {/* Chunked Upload Info */}
                      {enableResumable && file.totalChunks > 1 && (
                        <div className="text-xs text-gray-500">
                          Chunks: {file.currentChunk} / {file.totalChunks} 
                          ({formatFileSize(file.chunkSize)} each)
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      {file.status === 'uploading' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => pauseUpload(file.id)}
                          title="Pause upload"
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      )}

                      {file.status === 'paused' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resumeUpload(file.id)}
                          title="Resume upload"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}

                      {file.status === 'error' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => retryUpload(file.id)}
                          title="Retry upload"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        disabled={file.status === 'uploading' || file.status === 'processing'}
                        title="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Upload Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div className="text-sm text-gray-600">
              {files.filter(f => f.status === 'success').length} of {files.length} files uploaded
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => setFiles([])}
                disabled={activeUploads.size > 0}
              >
                Clear All
              </Button>
              <Button
                onClick={uploadAllFiles}
                disabled={!canStartUpload}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {activeUploads.size > 0 ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload All Files
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}