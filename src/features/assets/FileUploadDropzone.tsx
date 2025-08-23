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
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/cards/card'
import { Input } from '@/components/atoms/form/input'
import { Textarea } from '@/components/atoms/form/textarea'
import { 
  FileUploadItem, 
  BulkUploadSettings, 
  FileCategory,
  UploadedAsset,
  ALLOWED_FILE_EXTENSIONS,
  MAX_FILE_SIZE,
  MAX_FILES_PER_UPLOAD,
  formatFileSize,
  generateFileId,
  isValidFileType
} from '@/types/upload'
import { useUploadCollaborationStore } from '@/lib/stores/upload-collaboration.store'
import { CollaborativeUploadHub } from '@/components/organisms/features/CollaborativeUploadHub'
import { createUserId } from '@/lib/utils/branded-type-helpers'

interface FileUploadDropzoneProps {
  onUploadComplete?: (files: FileUploadItem[]) => void
  onUploadProgress?: (fileId: string, progress: number) => void
  maxFileSize?: number
  allowedFileTypes?: readonly string[]
  maxFiles?: number
  className?: string
  organizationId?: string
  vaultId?: string
  showCollaborationHub?: boolean
  currentUser?: {
    id: string
    name: string
    email: string
    avatar?: string
  }
}

const CATEGORIES: Array<{ value: FileCategory; label: string }> = [
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
  maxFileSize = MAX_FILE_SIZE,
  allowedFileTypes = ALLOWED_FILE_EXTENSIONS,
  maxFiles = MAX_FILES_PER_UPLOAD,
  className = '',
  organizationId,
  vaultId,
  showCollaborationHub = true,
  currentUser
}: FileUploadDropzoneProps) {
  const [files, setFiles] = useState<FileUploadItem[]>([])
  const [isDragActive, setIsDragActive] = useState(false)
  const [showBulkEdit, setShowBulkEdit] = useState(false)
  const [bulkSettings, setBulkSettings] = useState<BulkUploadSettings>({
    category: 'general',
    folder: '/',
    tags: ''
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Collaboration features
  const collaboration = useUploadCollaborationStore()
  const [uploadStartTimes] = useState<Map<string, number>>(new Map())

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return Image
    if (fileType.includes('video')) return Video
    if (fileType.includes('audio')) return Music
    if (fileType.includes('zip') || fileType.includes('rar')) return Archive
    return FileText
  }

  // formatFileSize is imported from types/upload.ts

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File size exceeds ${formatFileSize(maxFileSize)} limit`
    }

    if (!isValidFileType(file.type)) {
      return `File type ${file.type} is not allowed`
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
      if (!file) continue
      const validationError = validateFile(file)
      
      const preview = await createFilePreview(file)
      
      const fileItem: FileUploadItem = {
        id: generateFileId(),
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

  const uploadFile = async (fileItem: FileUploadItem): Promise<UploadedAsset> => {
    return new Promise((resolve, reject) => {
      updateFileProperty(fileItem.id, 'status', 'uploading')
      updateFileProperty(fileItem.id, 'progress', 0)
      
      // Record start time for duration calculation
      const startTime = Date.now()
      uploadStartTimes.set(fileItem.id, startTime)
      
      // Broadcast upload started to team
      collaboration.broadcastUploadStarted(fileItem)

      // Use XMLHttpRequest for real progress tracking
      const xhr = new XMLHttpRequest()
      
      // Set up progress handler
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          updateFileProperty(fileItem.id, 'progress', progress)
          onUploadProgress?.(fileItem.id, progress)
          
          // Calculate upload speed
          const elapsed = Date.now() - startTime
          const speed = elapsed > 0 ? (event.loaded / elapsed) * 1000 : 0
          
          // Broadcast progress to team
          collaboration.broadcastUploadProgress(
            fileItem.id,
            fileItem.file.name,
            progress,
            event.loaded,
            event.total,
            speed
          )
        }
      })

      // Set up completion handlers
      xhr.addEventListener('load', () => {
        const endTime = Date.now()
        const duration = endTime - startTime
        
        console.log('Upload completed:', {
          status: xhr.status,
          responseText: xhr.responseText.substring(0, 200) + '...'
        })
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText)
            console.log('Upload response data:', data)
            if (data.success) {
              updateFileProperty(fileItem.id, 'status', 'success')
              updateFileProperty(fileItem.id, 'progress', 100)
              
              // Broadcast upload completed to team
              collaboration.broadcastUploadCompleted(fileItem.id, data.asset, duration)
              
              resolve(data.asset)
            } else {
              console.error('Upload failed with error:', data.error)
              throw new Error(data.error || 'Upload failed')
            }
          } catch (error) {
            console.error('Error parsing response:', error)
            updateFileProperty(fileItem.id, 'status', 'error')
            updateFileProperty(fileItem.id, 'error', 'Invalid server response')
            
            // Broadcast upload failed to team
            collaboration.broadcastUploadFailed(fileItem.id, fileItem.file.name, 'Invalid server response', 0)
            
            reject(error)
          }
        } else {
          console.error('Upload failed with status:', xhr.status, xhr.responseText)
          try {
            const errorData = JSON.parse(xhr.responseText)
            const errorMessage = errorData.error || `HTTP ${xhr.status}`
            
            // Broadcast upload failed to team
            collaboration.broadcastUploadFailed(fileItem.id, fileItem.file.name, errorMessage, 0)
            
            throw new Error(errorMessage)
          } catch {
            const errorMessage = `Upload failed with status ${xhr.status}`
            collaboration.broadcastUploadFailed(fileItem.id, fileItem.file.name, errorMessage, 0)
            throw new Error(errorMessage)
          }
        }
      })

      xhr.addEventListener('error', () => {
        updateFileProperty(fileItem.id, 'status', 'error')
        updateFileProperty(fileItem.id, 'error', 'Network error')
        
        // Broadcast upload failed to team
        collaboration.broadcastUploadFailed(fileItem.id, fileItem.file.name, 'Network error', 0)
        
        reject(new Error('Network error'))
      })

      xhr.addEventListener('timeout', () => {
        updateFileProperty(fileItem.id, 'status', 'error')
        updateFileProperty(fileItem.id, 'error', 'Upload timeout')
        
        // Broadcast upload failed to team
        collaboration.broadcastUploadFailed(fileItem.id, fileItem.file.name, 'Upload timeout', 0)
        
        reject(new Error('Upload timeout'))
      })

      // Prepare form data
      const formData = new FormData()
      formData.append('file', fileItem.file)
      formData.append('title', fileItem.title)
      formData.append('category', fileItem.category)
      formData.append('folderPath', fileItem.folder)
      
      // Add organization context
      if (organizationId) {
        formData.append('organizationId', organizationId)
      }
      
      if (vaultId) {
        formData.append('vaultId', vaultId)
      }

      if (fileItem.description) {
        formData.append('description', fileItem.description)
      }
      
      if (fileItem.tags.length > 0) {
        formData.append('tags', fileItem.tags.join(','))
      }

      // Configure and send request
      xhr.timeout = 300000 // 5 minutes timeout
      xhr.open('POST', '/api/assets/upload')
      
      // Add debug logging
      console.log('Starting upload:', {
        fileName: fileItem.file.name,
        fileSize: fileItem.file.size,
        organizationId,
        vaultId
      })
      
      xhr.send(formData)
    })
  }

  const uploadFileWithRetry = async (fileItem: FileUploadItem, maxRetries = 2): Promise<UploadedAsset> => {
    let lastError: Error
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Wait before retry (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
          await new Promise(resolve => setTimeout(resolve, delay))
          
          // Reset status for retry
          updateFileProperty(fileItem.id, 'status', 'uploading')
          updateFileProperty(fileItem.id, 'progress', 0)
          updateFileProperty(fileItem.id, 'error', undefined)
        }
        
        return await uploadFile(fileItem)
      } catch (error) {
        lastError = error as Error
        
        if (attempt < maxRetries) {
          updateFileProperty(fileItem.id, 'error', `Upload failed, retrying... (${attempt + 1}/${maxRetries})`)
        }
      }
    }
    
    // All retries failed
    updateFileProperty(fileItem.id, 'status', 'error')
    updateFileProperty(fileItem.id, 'error', lastError.message)
    throw lastError
  }

  const handleUpload = async () => {
    if (!organizationId) {
      console.error('Organization ID is required for upload')
      return
    }

    const pendingFiles = files.filter(file => file.status === 'pending')
    
    if (pendingFiles.length === 0) {
      return
    }

    // Upload files with concurrency limit (max 3 at once)
    const CONCURRENT_UPLOADS = 3
    const results: UploadedAsset[] = []
    
    for (let i = 0; i < pendingFiles.length; i += CONCURRENT_UPLOADS) {
      const batch = pendingFiles.slice(i, i + CONCURRENT_UPLOADS)
      
      const batchPromises = batch.map(file => 
        uploadFileWithRetry(file).catch(error => {
          console.error(`Failed to upload ${file.file.name}:`, error)
          return null
        })
      )
      
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults.filter(result => result !== null))
    }

    // Get all successfully uploaded files
    const successfulUploads = files.filter(file => file.status === 'success')
    
    onUploadComplete?.(successfulUploads)
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

      {/* Collaborative Upload Hub */}
      {showCollaborationHub && organizationId && currentUser && (
        <div className="mt-8">
          <CollaborativeUploadHub
            organizationId={organizationId as any} // TODO: Use proper branded type
            vaultId={vaultId as any} // TODO: Use proper branded type
            userId={createUserId(currentUser.id)}
            userInfo={{
              name: currentUser.name,
              email: currentUser.email,
              avatar: currentUser.avatar
            }}
            defaultTab="queue"
            compactMode={false}
            config={{
              enablePresence: true,
              enableRealTimeProgress: true,
              enableNotifications: true,
              enableActivityFeed: true,
              enableAutoSharing: true,
              notificationSettings: {
                uploadStarted: true,
                uploadCompleted: true,
                uploadFailed: true,
                uploadShared: true,
                mentions: true
              }
            }}
          />
        </div>
      )}
    </div>
  )
}