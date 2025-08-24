'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadSuccess?: (asset: any) => void
}

export function UploadModal({ isOpen, onClose, onUploadSuccess }: UploadModalProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 1,
    disabled: isUploading,
    onDrop: (files) => {
      if (files.length > 0 && !title) {
        setTitle(files[0].name.replace(/\.[^/.]+$/, ""))
      }
    }
  })

  const handleUpload = async () => {
    if (acceptedFiles.length === 0) return

    setIsUploading(true)
    setUploadStatus('uploading')
    setUploadProgress(0)
    setErrorMessage('')
    
    try {
      const file = acceptedFiles[0]
      const formData = new FormData()
      
      formData.append('file', file)
      formData.append('title', title || file.name.replace(/\.[^/.]+$/, ""))
      formData.append('description', description)
      formData.append('category', 'board-pack')
      formData.append('organizationId', 'demo-org-123') // TODO: Get from context/user
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      
      setUploadStatus('success')
      
      setTimeout(() => {
        onUploadSuccess?.(result.asset)
        resetForm()
      }, 1500)

    } catch (error: any) {
      console.error('Upload failed:', error)
      setUploadStatus('error')
      setErrorMessage(error.message || 'Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const resetForm = () => {
    setUploadStatus('idle')
    setUploadProgress(0)
    setTitle('')
    setDescription('')
    setErrorMessage('')
    onClose()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Upload Board Pack</h2>
            <button
              onClick={onClose}
              disabled={isUploading}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {uploadStatus === 'success' ? (
            /* Success State */
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Successful!</h3>
              <p className="text-gray-600">
                Your board pack has been uploaded and is being processed for AI analysis.
              </p>
            </div>
          ) : uploadStatus === 'error' ? (
            /* Error State */
            <div className="text-center py-8">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Failed</h3>
              <p className="text-gray-600 mb-4">
                {errorMessage || 'There was an error uploading your file. Please try again.'}
              </p>
              <button
                onClick={() => {
                  setUploadStatus('idle')
                  setUploadProgress(0)
                  setErrorMessage('')
                }}
                className="btn-primary px-6 py-2"
              >
                Try Again
              </button>
            </div>
          ) : (
            /* Upload Form */
            <div className="space-y-6">
              {/* File Drop Zone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  isDragActive
                    ? 'border-primary-500 bg-primary-50'
                    : acceptedFiles.length > 0
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
                }`}
              >
                <input {...getInputProps()} />
                
                {acceptedFiles.length > 0 ? (
                  <div className="space-y-3">
                    <FileText className="h-12 w-12 text-green-500 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        {acceptedFiles[0]?.name}
                      </p>
                      <p className="text-gray-600">
                        {acceptedFiles[0]?.size ? formatFileSize(acceptedFiles[0].size) : ''}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        {isDragActive ? 'Drop your file here' : 'Upload board pack'}
                      </p>
                      <p className="text-gray-600">
                        Drag & drop or click to select files
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      Supports: PDF, DOCX, PPTX, XLSX, TXT (max 50MB)
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Progress */}
              {uploadStatus === 'uploading' && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Uploading...</span>
                    <span className="text-gray-900 font-medium">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Form Fields */}
              {acceptedFiles.length > 0 && uploadStatus === 'idle' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Document Title
                    </label>
                    <input
                      type="text"
                      className="input w-full"
                      placeholder="e.g., Q4 2024 Board Pack"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      rows={3}
                      className="input w-full resize-none"
                      placeholder="Brief description of the board pack contents..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={onClose}
                  disabled={isUploading}
                  className="btn-secondary flex-1 py-3 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={acceptedFiles.length === 0 || isUploading}
                  className="btn-primary flex-1 py-3 disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Upload & Process'}
                </button>
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <FileText className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <h4 className="font-medium text-blue-800 mb-1">AI Processing</h4>
                    <p className="text-blue-600">
                      Your document will be automatically processed for AI summarization and analysis.
                      This typically takes 2-5 minutes depending on document size.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}