'use client'

import React, { useCallback, useState, useRef, useEffect } from 'react'
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
  const [dragCounter, setDragCounter] = useState(0)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)
  const [showBulkEdit, setShowBulkEdit] = useState(false)
  const [previewModal, setPreviewModal] = useState<{ file: FileUploadItem; isOpen: boolean }>({ file: null as any, isOpen: false })
  const [announcements, setAnnouncements] = useState<string[]>([])
  const [focusedFileIndex, setFocusedFileIndex] = useState<number>(-1)
  
  // Refs for accessibility
  const dropzoneRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)
  const fileListRef = useRef<HTMLDivElement>(null)
  const [bulkSettings, setBulkSettings] = useState<BulkUploadSettings>({
    category: 'general',
    folder: '/',
    tags: ''
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Upload management
  const [activeUploads, setActiveUploads] = useState<Map<string, XMLHttpRequest>>(new Map())
  const [uploadStartTimes] = useState<Map<string, number>>(new Map())
  const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(new Map())
  
  // Collaboration features
  const collaboration = useUploadCollaborationStore()

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return Image
    if (fileType.includes('video')) return Video
    if (fileType.includes('audio')) return Music
    if (fileType.includes('zip') || fileType.includes('rar')) return Archive
    return FileText
  }

  // formatFileSize is imported from types/upload.ts

  const validateFile = (file: File): string | null => {
    // Check for zero-byte files
    if (file.size === 0) {
      return 'Empty files are not allowed. Please select a file with content.'
    }

    // Check minimum file size (prevent accidentally small files)
    const MIN_FILE_SIZE = 10 // 10 bytes minimum
    if (file.size < MIN_FILE_SIZE) {
      return 'File appears to be too small or corrupted. Please check the file and try again.'
    }

    // Check file size
    if (file.size > maxFileSize) {
      return `File size exceeds ${formatFileSize(maxFileSize)} limit. Please choose a smaller file.`
    }

    // Check file type by MIME type
    if (!isValidFileType(file.type)) {
      const allowedTypes = ['PDF', 'DOC/DOCX', 'PPT/PPTX', 'XLS/XLSX', 'TXT', 'JPG/PNG', 'MP4', 'ZIP']
      return `File type "${file.type}" is not supported. Allowed types: ${allowedTypes.join(', ')}.`
    }

    // Check for potentially dangerous file extensions
    const fileName = file.name.toLowerCase()
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.msi', '.jar', '.com', '.pif']
    if (dangerousExtensions.some(ext => fileName.endsWith(ext))) {
      return 'Executable files are not allowed for security reasons.'
    }

    // Check file name length
    if (file.name.length > 255) {
      return 'File name is too long. Please rename the file to be shorter than 255 characters.'
    }

    // Check for special characters in filename
    const invalidChars = /[<>:"/\\|?*]/
    if (invalidChars.test(file.name)) {
      return 'File name contains invalid characters. Please remove < > : " / \\ | ? * from the filename.'
    }

    return null
  }

  // Enhanced file preview generation with thumbnails
  const createFilePreview = async (file: File): Promise<{ preview?: string; thumbnail?: string; error?: string }> => {
    try {
      // Image files - generate preview and thumbnail
      if (file.type.startsWith('image/')) {
        return await generateImagePreview(file)
      }
      
      // Video files - generate thumbnail from first frame
      if (file.type.startsWith('video/')) {
        return await generateVideoThumbnail(file)
      }
      
      // PDF files - generate thumbnail from first page
      if (file.type === 'application/pdf') {
        return await generatePDFThumbnail(file)
      }
      
      // Other file types - no preview
      return {}
    } catch (error) {
      console.warn('Preview generation failed:', error)
      return { error: 'Preview generation failed' }
    }
  }

  const generateImagePreview = (file: File): Promise<{ preview: string; thumbnail: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const dataUrl = e.target?.result as string
          const thumbnail = await createImageThumbnail(dataUrl)
          resolve({ preview: dataUrl, thumbnail })
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const createImageThumbnail = (dataUrl: string, maxSize = 150): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            reject(new Error('Canvas context not available'))
            return
          }
          
          // Calculate thumbnail dimensions (maintain aspect ratio)
          const { width, height } = img
          const aspectRatio = width / height
          
          let thumbWidth, thumbHeight
          if (aspectRatio > 1) {
            thumbWidth = Math.min(maxSize, width)
            thumbHeight = thumbWidth / aspectRatio
          } else {
            thumbHeight = Math.min(maxSize, height)
            thumbWidth = thumbHeight * aspectRatio
          }
          
          canvas.width = thumbWidth
          canvas.height = thumbHeight
          
          // Draw resized image
          ctx.drawImage(img, 0, 0, thumbWidth, thumbHeight)
          
          // Apply slight blur and optimize quality
          ctx.filter = 'contrast(1.1) saturate(1.1)'
          
          resolve(canvas.toDataURL('image/jpeg', 0.8))
        } catch (error) {
          reject(error)
        }
      }
      img.onerror = reject
      img.src = dataUrl
    })
  }

  const generateVideoThumbnail = (file: File): Promise<{ thumbnail: string }> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('Canvas context not available'))
        return
      }
      
      video.preload = 'metadata'
      video.addEventListener('loadedmetadata', () => {
        // Seek to 1 second or 10% of duration, whichever is smaller
        const seekTime = Math.min(1, video.duration * 0.1)
        video.currentTime = seekTime
      })
      
      video.addEventListener('seeked', () => {
        try {
          canvas.width = Math.min(video.videoWidth, 300)
          canvas.height = (canvas.width / video.videoWidth) * video.videoHeight
          
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          
          // Add play button overlay
          const centerX = canvas.width / 2
          const centerY = canvas.height / 2
          const playButtonSize = Math.min(canvas.width, canvas.height) * 0.15
          
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
          ctx.beginPath()
          ctx.arc(centerX, centerY, playButtonSize + 5, 0, 2 * Math.PI)
          ctx.fill()
          
          ctx.fillStyle = 'white'
          ctx.beginPath()
          ctx.moveTo(centerX - playButtonSize * 0.5, centerY - playButtonSize * 0.7)
          ctx.lineTo(centerX + playButtonSize * 0.8, centerY)
          ctx.lineTo(centerX - playButtonSize * 0.5, centerY + playButtonSize * 0.7)
          ctx.closePath()
          ctx.fill()
          
          resolve({ thumbnail: canvas.toDataURL('image/jpeg', 0.8) })
        } catch (error) {
          reject(error)
        }
      })
      
      video.addEventListener('error', reject)
      video.src = URL.createObjectURL(file)
    })
  }

  const generatePDFThumbnail = async (file: File): Promise<{ thumbnail: string }> => {
    // For now, return a PDF icon-based thumbnail
    // In a real implementation, you'd use PDF.js or similar to render the first page
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        resolve({ thumbnail: '' })
        return
      }
      
      canvas.width = 150
      canvas.height = 190
      
      // Draw PDF representation
      ctx.fillStyle = '#f3f4f6'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      ctx.strokeStyle = '#d1d5db'
      ctx.lineWidth = 2
      ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2)
      
      // PDF icon
      ctx.fillStyle = '#dc2626'
      ctx.font = 'bold 16px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('PDF', canvas.width / 2, canvas.height / 2 - 10)
      
      ctx.fillStyle = '#6b7280'
      ctx.font = '12px Arial'
      ctx.fillText(file.name.substring(0, 15), canvas.width / 2, canvas.height / 2 + 20)
      
      resolve({ thumbnail: canvas.toDataURL('image/jpeg', 0.8) })
    })
  }

  const processFiles = async (fileList: FileList | File[]) => {
    const newFiles: FileUploadItem[] = []
    
    for (let i = 0; i < Math.min(fileList.length, maxFiles - files.length); i++) {
      const file = fileList instanceof FileList ? fileList[i] : fileList[i]
      if (!file) continue
      const validationError = validateFile(file)
      
      const previewData = await createFilePreview(file)
      
      const fileItem: FileUploadItem = {
        id: generateFileId(),
        file,
        title: file.name.split('.').slice(0, -1).join('.'),
        category: bulkSettings.category,
        folder: bulkSettings.folder,
        tags: bulkSettings.tags ? bulkSettings.tags.split(',').map(t => t.trim()) : [],
        status: validationError ? 'error' : 'pending',
        progress: 0,
        error: validationError || previewData.error || undefined,
        preview: previewData.preview || previewData.thumbnail
      }
      
      newFiles.push(fileItem)
    }
    
    setFiles(prev => [...prev, ...newFiles])
  }

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(prev => prev + 1)
    
    // Check if dragging files
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const hasFiles = Array.from(e.dataTransfer.items).some(item => item.kind === 'file')
      if (hasFiles) {
        setIsDragActive(true)
      }
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Add visual feedback for drag position
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setDragCounter(prev => {
      const newCounter = prev - 1
      if (newCounter === 0) {
        setIsDragActive(false)
        setDragOverItem(null)
      }
      return newCounter
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsDragActive(false)
    setDragCounter(0)
    setDragOverItem(null)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles)
    }
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

  // File drag and drop for reordering
  const handleFileDragStart = useCallback((e: React.DragEvent, fileId: string) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', fileId)
    setDragOverItem(fileId)
  }, [])

  const handleFileDragEnd = useCallback(() => {
    setDragOverItem(null)
  }, [])

  const handleFileDragOver = useCallback((e: React.DragEvent, targetFileId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverItem(targetFileId)
  }, [])

  const handleFileDrop = useCallback((e: React.DragEvent, targetFileId: string) => {
    e.preventDefault()
    const draggedFileId = e.dataTransfer.getData('text/plain')
    
    if (draggedFileId && draggedFileId !== targetFileId) {
      // Reorder files
      setFiles(prev => {
        const draggedIndex = prev.findIndex(f => f.id === draggedFileId)
        const targetIndex = prev.findIndex(f => f.id === targetFileId)
        
        if (draggedIndex === -1 || targetIndex === -1) return prev
        
        const newFiles = [...prev]
        const [draggedFile] = newFiles.splice(draggedIndex, 1)
        newFiles.splice(targetIndex, 0, draggedFile)
        
        return newFiles
      })
    }
    
    setDragOverItem(null)
  }, [])

  const removeFile = (fileId: string) => {
    // Cancel upload if in progress
    const xhr = activeUploads.get(fileId)
    if (xhr) {
      xhr.abort()
      setActiveUploads(prev => {
        const newMap = new Map(prev)
        newMap.delete(fileId)
        return newMap
      })
    }
    
    // Remove from files list
    setFiles(prev => prev.filter(file => file.id !== fileId))
    
    // Clean up progress tracking
    setUploadProgress(prev => {
      const newMap = new Map(prev)
      newMap.delete(fileId)
      return newMap
    })
    
    uploadStartTimes.delete(fileId)
  }

  const cancelUpload = (fileId: string) => {
    const xhr = activeUploads.get(fileId)
    if (xhr) {
      xhr.abort()
      setActiveUploads(prev => {
        const newMap = new Map(prev)
        newMap.delete(fileId)
        return newMap
      })
      
      // Update file status
      updateFileProperty(fileId, 'status', 'pending')
      updateFileProperty(fileId, 'progress', 0)
      updateFileProperty(fileId, 'error', 'Upload cancelled')
      
      // Broadcast cancellation to team
      collaboration.broadcastUploadFailed(fileId, 'Upload cancelled', 'User cancelled upload', 0)
    }
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
      updateFileProperty(fileItem.id, 'error', undefined)
      
      // Record start time for duration calculation
      const startTime = Date.now()
      uploadStartTimes.set(fileItem.id, startTime)
      
      // Broadcast upload started to team
      collaboration.broadcastUploadStarted(fileItem)

      // Use XMLHttpRequest for real progress tracking
      const xhr = new XMLHttpRequest()
      
      // Store the active upload for potential cancellation
      setActiveUploads(prev => new Map(prev.set(fileItem.id, xhr)))
      
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
        
        // Clean up active upload tracking
        setActiveUploads(prev => {
          const newMap = new Map(prev)
          newMap.delete(fileItem.id)
          return newMap
        })
        
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
              updateFileProperty(fileItem.id, 'status', 'error')
              updateFileProperty(fileItem.id, 'error', data.message || data.error || 'Upload failed')
              
              // Handle validation errors specifically
              if (data.validationErrors && Array.isArray(data.validationErrors)) {
                const errorMessages = data.validationErrors.map((err: any) => err.message).join('; ')
                updateFileProperty(fileItem.id, 'error', errorMessages)
              }
              
              collaboration.broadcastUploadFailed(fileItem.id, fileItem.file.name, data.error || 'Upload failed', 0)
              reject(new Error(data.error || 'Upload failed'))
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
          let errorMessage = `Upload failed (${xhr.status})`
          
          try {
            const errorData = JSON.parse(xhr.responseText)
            errorMessage = errorData.message || errorData.error || errorMessage
            
            // Handle validation errors
            if (errorData.validationErrors && Array.isArray(errorData.validationErrors)) {
              errorMessage = errorData.validationErrors.map((err: any) => err.message).join('; ')
            }
          } catch {
            // Use default error message if JSON parsing fails
          }
          
          updateFileProperty(fileItem.id, 'status', 'error')
          updateFileProperty(fileItem.id, 'error', errorMessage)
          
          // Broadcast upload failed to team
          collaboration.broadcastUploadFailed(fileItem.id, fileItem.file.name, errorMessage, 0)
          reject(new Error(errorMessage))
        }
      })

      xhr.addEventListener('error', () => {
        // Clean up active upload tracking
        setActiveUploads(prev => {
          const newMap = new Map(prev)
          newMap.delete(fileItem.id)
          return newMap
        })
        
        updateFileProperty(fileItem.id, 'status', 'error')
        updateFileProperty(fileItem.id, 'error', 'Network error - please check your connection and try again')
        
        // Broadcast upload failed to team
        collaboration.broadcastUploadFailed(fileItem.id, fileItem.file.name, 'Network error', 0)
        
        reject(new Error('Network error'))
      })

      xhr.addEventListener('timeout', () => {
        // Clean up active upload tracking
        setActiveUploads(prev => {
          const newMap = new Map(prev)
          newMap.delete(fileItem.id)
          return newMap
        })
        
        updateFileProperty(fileItem.id, 'status', 'error')
        updateFileProperty(fileItem.id, 'error', 'Upload timeout - file may be too large or connection too slow')
        
        // Broadcast upload failed to team
        collaboration.broadcastUploadFailed(fileItem.id, fileItem.file.name, 'Upload timeout', 0)
        
        reject(new Error('Upload timeout'))
      })

      xhr.addEventListener('abort', () => {
        // Clean up active upload tracking
        setActiveUploads(prev => {
          const newMap = new Map(prev)
          newMap.delete(fileItem.id)
          return newMap
        })
        
        // Don't change status to error for user-initiated cancellation
        if (fileItem.status === 'uploading') {
          updateFileProperty(fileItem.id, 'status', 'pending')
          updateFileProperty(fileItem.id, 'progress', 0)
        }
        
        reject(new Error('Upload cancelled'))
      })

      // Prepare form data
      const formData = new FormData()
      formData.append('file', fileItem.file)
      formData.append('title', fileItem.title)
      formData.append('category', fileItem.category)
      formData.append('folderPath', fileItem.folder)
      
      // Add organization context - REQUIRED for uploads
      if (organizationId) {
        formData.append('organizationId', organizationId)
        console.log('Regular upload - organizationId:', organizationId)
      } else {
        console.error('No organizationId provided for upload - upload will fail')
        updateFileProperty(fileItem.id, 'status', 'error')
        updateFileProperty(fileItem.id, 'error', 'No organization selected. Please select an organization from the sidebar.')
        collaboration.broadcastUploadFailed(fileItem.id, fileItem.file.name, 'No organization selected', 0)
        reject(new Error('No organization selected. Please select an organization from the sidebar.'))
        return
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

      // Always use direct upload via our API route
      // This simplifies the logic and ensures consistent error handling
      console.log('Uploading file:', {
        fileName: fileItem.file.name,
        fileSize: fileItem.file.size,
        sizeMB: (fileItem.file.size / (1024 * 1024)).toFixed(2),
        organizationId
      })
      
      // Open connection to upload endpoint
      xhr.open('POST', '/api/assets/upload')
      xhr.timeout = 300000 // 5 minutes timeout
      
      // Send the form data
      xhr.send(formData)
    })
  }

  // Enhanced retry mechanism with intelligent backoff
  const getRetryDelay = (attempt: number, error: Error): number => {
    const baseDelay = 1000 // 1 second
    const maxDelay = 30000 // 30 seconds
    
    // Different retry strategies based on error type
    if (error.message.includes('Network error') || error.message.includes('timeout')) {
      // Network issues: exponential backoff with jitter
      const exponentialDelay = baseDelay * Math.pow(2, attempt)
      const jitter = Math.random() * 0.3 * exponentialDelay // 30% jitter
      return Math.min(exponentialDelay + jitter, maxDelay)
    }
    
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      // Rate limiting: longer delays
      return Math.min(baseDelay * Math.pow(3, attempt), maxDelay)
    }
    
    if (error.message.includes('503') || error.message.includes('502')) {
      // Server errors: moderate backoff
      return Math.min(baseDelay * Math.pow(1.5, attempt), maxDelay)
    }
    
    // Default: linear backoff for other errors
    return Math.min(baseDelay * (attempt + 1), maxDelay)
  }

  const shouldRetry = (error: Error, attempt: number, maxRetries: number): boolean => {
    if (attempt >= maxRetries) return false
    
    // Don't retry client errors (4xx except 429)
    if (error.message.includes('400') || error.message.includes('401') || 
        error.message.includes('403') || error.message.includes('404')) {
      return false
    }
    
    // Don't retry validation errors
    if (error.message.includes('validation') || error.message.includes('Invalid')) {
      return false
    }
    
    // Don't retry if user cancelled
    if (error.message.includes('cancelled') || error.message.includes('aborted')) {
      return false
    }
    
    // Retry network errors, timeouts, and server errors
    return true
  }

  const uploadFileWithRetry = async (fileItem: FileUploadItem, maxRetries = 3): Promise<UploadedAsset> => {
    let lastError: Error
    let attempt = 0
    
    while (attempt <= maxRetries) {
      try {
        if (attempt > 0) {
          const delay = getRetryDelay(attempt - 1, lastError!)
          
          // Show retry countdown
          const countdownSeconds = Math.ceil(delay / 1000)
          updateFileProperty(fileItem.id, 'error', `Retrying in ${countdownSeconds}s... (${attempt}/${maxRetries})`)
          
          // Countdown timer
          for (let i = countdownSeconds; i > 0; i--) {
            updateFileProperty(fileItem.id, 'error', `Retrying in ${i}s... (${attempt}/${maxRetries})`)
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
          
          // Reset status for retry
          updateFileProperty(fileItem.id, 'status', 'uploading')
          updateFileProperty(fileItem.id, 'progress', 0)
          updateFileProperty(fileItem.id, 'error', `Retrying upload... (${attempt}/${maxRetries})`)
          
          // Broadcast retry attempt to team
          collaboration.broadcastUploadRetry(fileItem.id, fileItem.file.name, attempt, maxRetries)
        }
        
        return await uploadFile(fileItem)
      } catch (error) {
        lastError = error as Error
        attempt++
        
        if (!shouldRetry(lastError, attempt, maxRetries)) {
          break
        }
        
        if (attempt <= maxRetries) {
          updateFileProperty(fileItem.id, 'status', 'error')
          updateFileProperty(fileItem.id, 'error', `Upload failed, preparing retry... (${attempt}/${maxRetries})`)
        }
      }
    }
    
    // All retries failed or shouldn't retry
    updateFileProperty(fileItem.id, 'status', 'error')
    const finalError = lastError.message + (attempt > 1 ? ` (failed after ${attempt} attempts)` : '')
    updateFileProperty(fileItem.id, 'error', finalError)
    
    // Broadcast final failure to team
    collaboration.broadcastUploadFailed(fileItem.id, fileItem.file.name, finalError, attempt)
    
    throw lastError
  }

  const handleUpload = async () => {
    if (!organizationId) {
      console.error('Organization ID is required for upload')
      // Update all pending files with error
      files.filter(file => file.status === 'pending').forEach(file => {
        updateFileProperty(file.id, 'status', 'error')
        updateFileProperty(file.id, 'error', 'Please select an organization before uploading')
      })
      return
    }

    const pendingFiles = files.filter(file => file.status === 'pending')
    
    if (pendingFiles.length === 0) {
      return
    }

    // Smart concurrency based on file sizes and network conditions
    const getOptimalConcurrency = (): number => {
      const totalSize = pendingFiles.reduce((sum, file) => sum + file.file.size, 0)
      const averageSize = totalSize / pendingFiles.length
      
      // Adjust concurrency based on file sizes
      if (averageSize > 10 * 1024 * 1024) { // Files > 10MB
        return 1 // Upload large files one at a time
      } else if (averageSize > 1 * 1024 * 1024) { // Files > 1MB
        return 2 // Upload medium files with limited concurrency
      }
      
      return 3 // Default concurrency for small files
    }
    
    const CONCURRENT_UPLOADS = getOptimalConcurrency()
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

  // Accessibility announcements
  const announce = useCallback((message: string) => {
    setAnnouncements(prev => [...prev, message])
    // Clear announcement after it's been read
    setTimeout(() => {
      setAnnouncements(prev => prev.slice(1))
    }, 1000)
  }, [])

  // Keyboard navigation for file list
  const handleFileListKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (files.length === 0) return
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedFileIndex(prev => {
          const next = prev < files.length - 1 ? prev + 1 : 0
          announce(`Focused on file ${next + 1} of ${files.length}: ${files[next].title}`)
          return next
        })
        break
        
      case 'ArrowUp':
        e.preventDefault()
        setFocusedFileIndex(prev => {
          const next = prev > 0 ? prev - 1 : files.length - 1
          announce(`Focused on file ${next + 1} of ${files.length}: ${files[next].title}`)
          return next
        })
        break
        
      case 'Delete':
      case 'Backspace':
        e.preventDefault()
        if (focusedFileIndex >= 0 && focusedFileIndex < files.length) {
          const fileToRemove = files[focusedFileIndex]
          removeFile(fileToRemove.id)
          announce(`Removed ${fileToRemove.title}`)
          setFocusedFileIndex(prev => Math.min(prev, files.length - 2))
        }
        break
        
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (focusedFileIndex >= 0 && focusedFileIndex < files.length) {
          const file = files[focusedFileIndex]
          if (file.file.type.startsWith('image/') && file.preview) {
            setPreviewModal({ file, isOpen: true })
            announce(`Opening preview for ${file.title}`)
          }
        }
        break
        
      case 'Escape':
        e.preventDefault()
        setFocusedFileIndex(-1)
        dropzoneRef.current?.focus()
        announce('Returned focus to upload area')
        break
    }
  }, [files, focusedFileIndex, announce])

  // Handle file selection with announcements
  const handleFileSelectWithAnnouncement = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      announce(`Selected ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} for upload`)
      processFiles(selectedFiles)
    }
  }

  // Handle drop with announcements
  const handleDropWithAnnouncement = useCallback((e: React.DragEvent) => {
    handleDrop(e)
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      announce(`Dropped ${droppedFiles.length} file${droppedFiles.length > 1 ? 's' : ''} for upload`)
    }
  }, [handleDrop, announce])

  // Handle upload with announcements
  const handleUploadWithAnnouncement = async () => {
    const pendingCount = files.filter(f => f.status === 'pending').length
    if (pendingCount > 0) {
      announce(`Starting upload of ${pendingCount} file${pendingCount > 1 ? 's' : ''}`)
    }
    await handleUpload()
  }

  // Update upload progress announcements
  useEffect(() => {
    const completedFiles = files.filter(f => f.status === 'success')
    const failedFiles = files.filter(f => f.status === 'error')
    const uploadingFiles = files.filter(f => f.status === 'uploading')
    
    if (completedFiles.length > 0 || failedFiles.length > 0 || uploadingFiles.length > 0) {
      const statusParts = []
      if (uploadingFiles.length > 0) {
        statusParts.push(`${uploadingFiles.length} uploading`)
      }
      if (completedFiles.length > 0) {
        statusParts.push(`${completedFiles.length} completed`)
      }
      if (failedFiles.length > 0) {
        statusParts.push(`${failedFiles.length} failed`)
      }
      
      if (statusParts.length > 0 && statusRef.current) {
        statusRef.current.textContent = `Upload status: ${statusParts.join(', ')}`
      }
    }
  }, [files])

  const canUpload = files.some(file => file.status === 'pending') && 
                   files.every(file => file.title.trim() !== '')

  return (
    <div 
      className={`space-y-6 ${className}`}
      role="region"
      aria-label="File upload area"
    >
      {/* Screen reader announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {announcements.map((announcement, index) => (
          <div key={index}>{announcement}</div>
        ))}
      </div>
      
      {/* Upload status for screen readers */}
      <div 
        ref={statusRef}
        aria-live="polite"
        aria-atomic="false"
        className="sr-only"
      />
      {/* Enhanced Drag and Drop Zone */}
      <div
        ref={dropzoneRef}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          isDragActive
            ? 'border-blue-500 bg-blue-50 shadow-lg scale-[1.02] ring-2 ring-blue-200'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDropWithAnnouncement}
        role="button"
        tabIndex={0}
        aria-label={`File upload drop zone. ${isDragActive ? 'Drop files to upload' : 'Drag files here or click to browse'}`}
        aria-describedby="dropzone-instructions"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
      >
        <div className={`transition-all duration-200 ${
          isDragActive ? 'animate-bounce' : ''
        }`}>
          <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${
            isDragActive ? 'text-blue-500' : 'text-gray-400'
          }`} />
        </div>
        <h3 className={`text-lg font-medium mb-2 transition-colors ${
          isDragActive ? 'text-blue-700' : 'text-gray-900'
        }`}>
          {isDragActive ? '📁 Drop files here to upload' : 'Upload Documents'}
        </h3>
        <p className={`mb-4 transition-colors ${
          isDragActive ? 'text-blue-600' : 'text-gray-600'
        }`}>
          {isDragActive 
            ? 'Release to add files to your upload queue'
            : 'Drag and drop your files here, or click to browse'
          }
        </p>
        {!isDragActive && (
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="mb-4 transition-all hover:scale-105"
          >
            <Plus className="h-4 w-4 mr-2" />
            Choose Files
          </Button>
        )}
        
        {isDragActive && (
          <div className="mb-4 animate-pulse">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg border-2 border-blue-300 border-dashed">
              <Upload className="h-4 w-4 mr-2" />
              Drop files to add them
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedFileTypes.join(',')}
          onChange={handleFileSelectWithAnnouncement}
          className="hidden"
          aria-describedby="dropzone-instructions"
        />
        
        <div id="dropzone-instructions" className="sr-only">
          Upload area for documents. You can drag and drop files here or click to browse. 
          Maximum {maxFiles} files, up to {formatFileSize(maxFileSize)} each.
          Supported formats: {allowedFileTypes.slice(0, 5).join(', ')}
          {allowedFileTypes.length > 5 && ` and ${allowedFileTypes.length - 5} more`}.
        </div>
        <div className={`text-xs transition-colors ${
          isDragActive ? 'text-blue-600' : 'text-gray-500'
        }`}>
          {isDragActive ? (
            <div className="space-y-1">
              <div className="text-sm font-medium">
                ✓ Ready to accept files
              </div>
              <div>
                Drop up to {maxFiles - files.length} more files
              </div>
            </div>
          ) : (
            <div>
              Maximum {maxFiles} files, up to {formatFileSize(maxFileSize)} each
              <br />
              Supported formats: {allowedFileTypes.slice(0, 5).join(', ')}
              {allowedFileTypes.length > 5 && ` and ${allowedFileTypes.length - 5} more`}
            </div>
          )}
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
        <div 
          ref={fileListRef}
          className="space-y-4"
          role="region"
          aria-label="Files to upload"
          tabIndex={0}
          onKeyDown={handleFileListKeyDown}
        >
          <h4 
            className="font-medium" 
            id="file-list-heading"
          >
            Files to Upload ({files.length})
          </h4>
          <p className="text-sm text-gray-600 sr-only">
            Use arrow keys to navigate files, Enter or Space to preview images, Delete to remove files, Escape to return to upload area
          </p>
          
          {files.map((fileItem, index) => {
            const FileIcon = getFileIcon(fileItem.file.type)
            
            return (
              <Card 
                key={fileItem.id} 
                className={`p-4 transition-all duration-200 ${
                  dragOverItem === fileItem.id
                    ? 'ring-2 ring-blue-300 shadow-lg scale-[1.01]'
                    : focusedFileIndex === index
                    ? 'ring-2 ring-blue-500 shadow-md'
                    : 'hover:shadow-md'
                }`}
                draggable={fileItem.status !== 'uploading'}
                onDragStart={(e) => handleFileDragStart(e, fileItem.id)}
                onDragEnd={handleFileDragEnd}
                onDragOver={(e) => handleFileDragOver(e, fileItem.id)}
                onDrop={(e) => handleFileDrop(e, fileItem.id)}
                role="article"
                aria-labelledby={`file-${fileItem.id}-title`}
                aria-describedby={`file-${fileItem.id}-details`}
                tabIndex={focusedFileIndex === index ? 0 : -1}
              >
                <div className="flex items-start space-x-4">
                  {/* Drag Handle */}
                  {fileItem.status !== 'uploading' && (
                    <div className="flex-shrink-0 mt-2 cursor-move opacity-30 hover:opacity-60 transition-opacity">
                      <div className="w-2 h-4 flex flex-col justify-center space-y-px">
                        <div className="w-full h-px bg-gray-400"></div>
                        <div className="w-full h-px bg-gray-400"></div>
                        <div className="w-full h-px bg-gray-400"></div>
                        <div className="w-full h-px bg-gray-400"></div>
                      </div>
                    </div>
                  )}
                  {/* Enhanced File Preview */}
                  <div className="flex-shrink-0 relative group">
                    {fileItem.preview ? (
                      <div className="relative w-12 h-12 rounded overflow-hidden border border-gray-200">
                        <img
                          src={fileItem.preview}
                          alt={`Preview of ${fileItem.file.name}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                          onError={(e) => {
                            // Fallback to file icon if image fails to load
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const parent = target.parentElement
                            if (parent) {
                              parent.innerHTML = `
                                <div class="w-full h-full bg-gray-100 flex items-center justify-center">
                                  <svg class="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                              `
                            }
                          }}
                        />
                        {/* File type indicator for videos/PDFs */}
                        {fileItem.file.type.startsWith('video/') && (
                          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                            <div className="w-4 h-4 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 border-l-2 border-t-2 border-gray-800 transform rotate-45 ml-0.5"></div>
                            </div>
                          </div>
                        )}
                        {fileItem.file.type === 'application/pdf' && (
                          <div className="absolute bottom-0 right-0 bg-red-500 text-white text-xs px-1 py-0.5 rounded-tl">
                            PDF
                          </div>
                        )}
                        {/* Hover overlay with file info and preview button */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                          {fileItem.file.type.startsWith('image/') ? (
                            <button
                              onClick={() => setPreviewModal({ file: fileItem, isOpen: true })}
                              className="bg-white bg-opacity-90 text-gray-800 text-xs px-2 py-1 rounded hover:bg-opacity-100 transition-all"
                            >
                              Preview
                            </button>
                          ) : (
                            <div className="text-white text-xs text-center px-2">
                              <div className="font-medium truncate">{fileItem.file.name}</div>
                              <div className="text-gray-200">{formatFileSize(fileItem.file.size)}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center border border-gray-200 group-hover:bg-gray-200 transition-colors">
                        <FileIcon className="h-6 w-6 text-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* File Details */}
                  <div className="flex-1 min-w-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label 
                          className="block text-xs font-medium text-gray-700 mb-1"
                          htmlFor={`title-${fileItem.id}`}
                        >
                          Title *
                        </label>
                        <Input
                          id={`title-${fileItem.id}`}
                          value={fileItem.title}
                          onChange={(e) => updateFileProperty(fileItem.id, 'title', e.target.value)}
                          className="text-sm"
                          placeholder="Document title"
                          aria-required="true"
                          aria-describedby={`title-${fileItem.id}-error`}
                        />
                        {fileItem.title.trim() === '' && (
                          <div id={`title-${fileItem.id}-error`} className="text-xs text-red-600 mt-1">
                            Title is required
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label 
                          className="block text-xs font-medium text-gray-700 mb-1"
                          htmlFor={`category-${fileItem.id}`}
                        >
                          Category
                        </label>
                        <select
                          id={`category-${fileItem.id}`}
                          value={fileItem.category}
                          onChange={(e) => updateFileProperty(fileItem.id, 'category', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label={`Category for ${fileItem.title || fileItem.file.name}`}
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelUpload(fileItem.id)}
                              className="text-red-600 hover:text-red-800 p-1 h-auto"
                              title="Cancel upload"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {fileItem.status === 'success' && (
                          <div className="flex items-center space-x-1 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            <span>Uploaded successfully</span>
                          </div>
                        )}
                        {fileItem.status === 'error' && (
                          <div className="flex items-center space-x-1 text-red-600">
                            <AlertCircle className="h-3 w-3" />
                            <div className="flex flex-col">
                              <span className="text-xs max-w-xs truncate" title={fileItem.error}>
                                {fileItem.error}
                              </span>
                              {/* Retry button for failed uploads */}
                              {fileItem.error && !fileItem.error.includes('validation') && 
                               !fileItem.error.includes('cancelled') && (
                                <button
                                  onClick={() => {
                                    updateFileProperty(fileItem.id, 'status', 'pending')
                                    updateFileProperty(fileItem.id, 'error', undefined)
                                    updateFileProperty(fileItem.id, 'progress', 0)
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800 underline mt-1"
                                >
                                  Try again
                                </button>
                              )}
                            </div>
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
                    className="flex-shrink-0 hover:bg-red-50 hover:text-red-600"
                    title="Remove file"
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

      {/* Drop Zone Indicator for Files List */}
      {isDragActive && files.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-bounce">
          <div className="flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span className="text-sm font-medium">
              Drop to add {files.filter(f => f.status !== 'success').length > 0 ? 'more ' : ''}files
            </span>
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
      
      {/* Image Preview Modal */}
      {previewModal.isOpen && previewModal.file && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4" onClick={() => setPreviewModal({ file: null as any, isOpen: false })}>
          <div className="relative max-w-4xl max-h-full">
            {/* Close button */}
            <button
              onClick={() => setPreviewModal({ file: null as any, isOpen: false })}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 z-10"
            >
              <X className="h-8 w-8" />
            </button>
            
            {/* Image */}
            <img
              src={previewModal.file.preview}
              alt={previewModal.file.file.name}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Image info */}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-4 rounded-b-lg">
              <h3 className="font-medium text-lg">{previewModal.file.title}</h3>
              <p className="text-sm text-gray-300">
                {previewModal.file.file.name} • {formatFileSize(previewModal.file.file.size)}
              </p>
              {previewModal.file.description && (
                <p className="text-sm text-gray-300 mt-2">{previewModal.file.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}