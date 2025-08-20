'use client'

import React, { useCallback, useState, useRef } from 'react'
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
  Folder
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'

interface FileUploadItem {
  id: string
  file: File
  title: string
  description?: string
  category: string
  folder: string
  tags: string[]
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  preview?: string
}

interface FileUploadDropzoneProps {
  onUploadComplete?: (files: FileUploadItem[]) => void
  onUploadProgress?: (fileId: string, progress: number) => void
  maxFileSize?: number // in bytes
  allowedFileTypes?: string[]
  maxFiles?: number
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

export function FileUploadDropzone({
  onUploadComplete,
  onUploadProgress,
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  allowedFileTypes = [
    '.pdf', '.docx', '.pptx', '.xlsx', '.txt', '.md',
    '.jpg', '.jpeg', '.png', '.gif', '.svg',
    '.mp4', '.mov', '.avi', '.wmv',
    '.mp3', '.wav', '.m4a',
    '.zip', '.rar', '.7z'
  ],
  maxFiles = 10,
  className = ''
}: FileUploadDropzoneProps) {
  const [files, setFiles] = useState<FileUploadItem[]>([])
  const [isDragActive, setIsDragActive] = useState(false)
  const [showBulkEdit, setShowBulkEdit] = useState(false)
  const [bulkSettings, setBulkSettings] = useState({
    category: 'general',
    folder: '/',
    tags: ''
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return Image
    if (fileType.includes('video')) return Video
    if (fileType.includes('audio')) return Music
    if (fileType.includes('zip') || fileType.includes('rar')) return Archive
    return FileText
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File size exceeds ${formatFileSize(maxFileSize)} limit`
    }

    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowedFileTypes.includes(fileExtension)) {
      return `File type ${fileExtension} is not allowed`
    }

    return null
  }

  const createFilePreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.readAsDataURL(file)
      } else {
        resolve(undefined)
      }
    })
  }

  const processFiles = async (fileList: FileList | File[]) => {
    const newFiles: FileUploadItem[] = []
    
    for (let i = 0; i < Math.min(fileList.length, maxFiles - files.length); i++) {
      const file = fileList instanceof FileList ? fileList[i] : fileList[i]
      const validationError = validateFile(file)
      
      const preview = await createFilePreview(file)
      
      const fileItem: FileUploadItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        file,
        title: file.name.split('.').slice(0, -1).join('.'),
        category: bulkSettings.category,
        folder: bulkSettings.folder,
        tags: bulkSettings.tags ? bulkSettings.tags.split(',').map(t => t.trim()) : [],
        status: validationError ? 'error' : 'pending',
        progress: 0,
        error: validationError || undefined,
        preview
      }
      
      newFiles.push(fileItem)
    }
    
    setFiles(prev => [...prev, ...newFiles])
  }

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
  }, [bulkSettings])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files)
    }
  }

  const updateFileProperty = (fileId: string, property: keyof FileUploadItem, value: any) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, [property]: value } : file
    ))
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId))
  }

  const applyBulkSettings = () => {
    setFiles(prev => prev.map(file => ({
      ...file,
      category: bulkSettings.category,
      folder: bulkSettings.folder,
      tags: bulkSettings.tags ? bulkSettings.tags.split(',').map(t => t.trim()) : []
    })))
    setShowBulkEdit(false)
  }

  const simulateUpload = async (fileItem: FileUploadItem) => {
    updateFileProperty(fileItem.id, 'status', 'uploading')
    
    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 100))
      updateFileProperty(fileItem.id, 'progress', progress)
      onUploadProgress?.(fileItem.id, progress)
    }
    
    updateFileProperty(fileItem.id, 'status', 'success')
  }

  const handleUpload = async () => {
    const pendingFiles = files.filter(file => file.status === 'pending')
    
    // Upload files concurrently
    const uploadPromises = pendingFiles.map(file => simulateUpload(file))
    
    try {
      await Promise.all(uploadPromises)
      onUploadComplete?.(files.filter(file => file.status === 'success'))
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }

  const canUpload = files.some(file => file.status === 'pending') && 
                   files.every(file => file.title.trim() !== '')

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Drag and Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {isDragActive ? 'Drop files here' : 'Upload Documents'}
        </h3>
        <p className="text-gray-600 mb-4">
          Drag and drop your files here, or click to browse
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
          Maximum {maxFiles} files, up to {formatFileSize(maxFileSize)} each
          <br />
          Supported formats: {allowedFileTypes.slice(0, 5).join(', ')}
          {allowedFileTypes.length > 5 && ` and ${allowedFileTypes.length - 5} more`}
        </div>
      </div>

      {/* Bulk Settings */}
      {files.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Bulk Settings</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBulkEdit(!showBulkEdit)}
            >
              {showBulkEdit ? 'Hide' : 'Show'} Settings
            </Button>
          </div>
          
          {showBulkEdit && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={bulkSettings.category}
                  onChange={(e) => setBulkSettings(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Folder
                </label>
                <select
                  value={bulkSettings.folder}
                  onChange={(e) => setBulkSettings(prev => ({ ...prev, folder: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {FOLDERS.map(folder => (
                    <option key={folder.value} value={folder.value}>{folder.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma separated)
                </label>
                <Input
                  value={bulkSettings.tags}
                  onChange={(e) => setBulkSettings(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="e.g., important, financial, q4"
                  className="text-sm"
                />
              </div>
            </div>
          )}
          
          {showBulkEdit && (
            <Button onClick={applyBulkSettings} size="sm">
              Apply to All Files
            </Button>
          )}
        </Card>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium">Files to Upload ({files.length})</h4>
          
          {files.map((fileItem) => {
            const FileIcon = getFileIcon(fileItem.file.type)
            
            return (
              <Card key={fileItem.id} className="p-4">
                <div className="flex items-start space-x-4">
                  {/* File Icon/Preview */}
                  <div className="flex-shrink-0">
                    {fileItem.preview ? (
                      <img
                        src={fileItem.preview}
                        alt="Preview"
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                        <FileIcon className="h-6 w-6 text-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* File Details */}
                  <div className="flex-1 min-w-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Title *
                        </label>
                        <Input
                          value={fileItem.title}
                          onChange={(e) => updateFileProperty(fileItem.id, 'title', e.target.value)}
                          className="text-sm"
                          placeholder="Document title"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Category
                        </label>
                        <select
                          value={fileItem.category}
                          onChange={(e) => updateFileProperty(fileItem.id, 'category', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {CATEGORIES.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <Textarea
                        value={fileItem.description || ''}
                        onChange={(e) => updateFileProperty(fileItem.id, 'description', e.target.value)}
                        rows={2}
                        className="text-sm"
                        placeholder="Optional description"
                      />
                    </div>

                    {/* File Info */}
                    <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                      <span>{fileItem.file.name} • {formatFileSize(fileItem.file.size)}</span>
                      
                      {/* Status Indicator */}
                      <div className="flex items-center space-x-2">
                        {fileItem.status === 'pending' && (
                          <span className="text-gray-500">Ready to upload</span>
                        )}
                        {fileItem.status === 'uploading' && (
                          <div className="flex items-center space-x-2">
                            <Loader className="h-3 w-3 animate-spin" />
                            <span>{fileItem.progress}%</span>
                          </div>
                        )}
                        {fileItem.status === 'success' && (
                          <div className="flex items-center space-x-1 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            <span>Uploaded</span>
                          </div>
                        )}
                        {fileItem.status === 'error' && (
                          <div className="flex items-center space-x-1 text-red-600">
                            <AlertCircle className="h-3 w-3" />
                            <span>{fileItem.error}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {fileItem.status === 'uploading' && (
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                        <div
                          className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${fileItem.progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(fileItem.id)}
                    disabled={fileItem.status === 'uploading'}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Upload Actions */}
      {files.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            {files.filter(f => f.status === 'success').length} of {files.length} files uploaded
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => setFiles([])}
              disabled={files.some(f => f.status === 'uploading')}
            >
              Clear All
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!canUpload}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {files.some(f => f.status === 'uploading') ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}