/**
 * FileUploadDropzone Component - FIXED VERSION
 * Comprehensive fix for state management and memory leak issues
 */

'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Image, Video, Music, Archive, X, AlertCircle, CheckCircle, RefreshCw, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { formatFileSize } from '@/types/upload'
import type { FileUploadItem, UploadedAsset } from '@/types/upload'

// Move constants outside component to prevent recreating
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 10;
const ACCEPTED_FILE_TYPES = {
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
  'application/pdf': ['.pdf'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'video/*': ['.mp4', '.avi', '.mov', '.webm'],
  'audio/*': ['.mp3', '.wav', '.ogg'],
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar']
};

interface FileUploadDropzoneProps {
  onUploadComplete?: (files: UploadedAsset[]) => void;
  organizationId?: string;
  vaultId?: string;
  currentUser?: {
    id: string;
    name: string;
    email: string;
  };
  showCollaborationHub?: boolean;
}

// File icon component - memoized to prevent re-renders
const FileIcon = React.memo(({ fileType }: { fileType: string }) => {
  if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
  if (fileType.startsWith('video/')) return <Video className="h-4 w-4" />;
  if (fileType.startsWith('audio/')) return <Music className="h-4 w-4" />;
  if (fileType.includes('zip') || fileType.includes('rar')) return <Archive className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
});

FileIcon.displayName = 'FileIcon';

export function FileUploadDropzone({
  onUploadComplete,
  organizationId,
  vaultId,
  currentUser,
  showCollaborationHub = false
}: FileUploadDropzoneProps) {
  // State management - using useReducer for complex state would be better
  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([]);
  
  // Refs for cleanup
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const blobUrlsRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef(true);

  // Cleanup function for blob URLs
  const cleanupBlobUrl = useCallback((url: string) => {
    if (url && blobUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      blobUrlsRef.current.delete(url);
    }
  }, []);

  // Cleanup all blob URLs on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Cleanup all blob URLs
      blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      blobUrlsRef.current.clear();
      // Abort all ongoing uploads
      abortControllersRef.current.forEach(controller => controller.abort());
      abortControllersRef.current.clear();
    };
  }, []);

  // Generate unique file ID
  const generateFileId = useCallback(() => {
    return `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // Create thumbnail for images - with proper cleanup
  const createImageThumbnail = useCallback(async (file: File): Promise<string | undefined> => {
    if (!file.type.startsWith('image/')) return undefined;

    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        img.onload = () => {
          // Create thumbnail
          const maxSize = 200;
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
              if (blob && isMountedRef.current) {
                const url = URL.createObjectURL(blob);
                blobUrlsRef.current.add(url);
                resolve(url);
              } else {
                resolve(undefined);
              }
            }, 'image/jpeg', 0.7);
          } else {
            resolve(undefined);
          }
        };
        
        img.onerror = () => resolve(undefined);
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(file);
    });
  }, []);

  // Process files - memoized to prevent unnecessary processing
  const processFiles = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: FileUploadItem[] = [];
    
    for (const file of acceptedFiles) {
      const fileItem: FileUploadItem = {
        id: generateFileId(),
        file,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        status: 'pending',
        progress: 0,
        uploadedAt: new Date()
      };
      
      // Generate thumbnail for images
      if (file.type.startsWith('image/')) {
        const thumbnailUrl = await createImageThumbnail(file);
        if (thumbnailUrl) {
          fileItem.thumbnail = thumbnailUrl;
        }
      }
      
      newFiles.push(fileItem);
    }
    
    if (isMountedRef.current) {
      setFiles(prev => [...prev, ...newFiles]);
      // Start uploads
      newFiles.forEach(file => uploadFile(file));
    }
  }, [generateFileId, createImageThumbnail]);

  // Upload file with proper error handling and cleanup
  const uploadFile = useCallback(async (fileItem: FileUploadItem) => {
    if (!isMountedRef.current) return;

    // Create abort controller for this upload
    const abortController = new AbortController();
    abortControllersRef.current.set(fileItem.id, abortController);

    // Update file status
    setFiles(prev => prev.map(f => 
      f.id === fileItem.id ? { ...f, status: 'uploading' } : f
    ));

    try {
      const formData = new FormData();
      formData.append('file', fileItem.file);
      formData.append('title', fileItem.name);
      if (organizationId) formData.append('organizationId', organizationId);
      if (vaultId) formData.append('vaultId', vaultId);

      const response = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
        signal: abortController.signal,
        // Note: Don't set Content-Type header, let browser set it with boundary
      });

      const data = await response.json();

      if (!isMountedRef.current) return;

      if (response.ok && data.success && data.data?.asset) {
        // Upload successful
        const uploadedAsset: UploadedAsset = {
          id: data.data.asset.id,
          fileName: data.data.asset.fileName,
          fileSize: data.data.asset.fileSize,
          mimeType: data.data.asset.mimeType,
          uploadUrl: data.data.asset.uploadUrl,
          thumbnailUrl: data.data.asset.thumbnailUrl,
          storagePath: data.data.asset.storagePath || '',
          createdAt: new Date(data.data.asset.createdAt)
        };

        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'success', progress: 100, uploadedAsset } 
            : f
        ));

        setUploadedAssets(prev => [...prev, uploadedAsset]);

        // Cleanup blob URL after successful upload
        if (fileItem.thumbnail) {
          setTimeout(() => cleanupBlobUrl(fileItem.thumbnail!), 5000);
        }
      } else {
        // Upload failed
        const errorMessage = data.error || 'Upload failed';
        console.error('[FileUploadDropzone] Upload failed:', errorMessage);
        
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'error', error: errorMessage, progress: 0 } 
            : f
        ));
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[FileUploadDropzone] Upload aborted:', fileItem.name);
      } else {
        console.error('[FileUploadDropzone] Upload error:', error);
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'error', error: 'Network error', progress: 0 } 
            : f
        ));
      }
    } finally {
      // Cleanup abort controller
      abortControllersRef.current.delete(fileItem.id);
    }
  }, [organizationId, vaultId, cleanupBlobUrl]);

  // Retry upload
  const retryUpload = useCallback((fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      uploadFile(file);
    }
  }, [files, uploadFile]);

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    // Abort upload if in progress
    const controller = abortControllersRef.current.get(fileId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(fileId);
    }

    // Cleanup thumbnail
    const file = files.find(f => f.id === fileId);
    if (file?.thumbnail) {
      cleanupBlobUrl(file.thumbnail);
    }

    // Remove from state
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, [files, cleanupBlobUrl]);

  // Setup dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: processFiles,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: MAX_FILES,
    multiple: true
  });

  // Calculate upload statistics
  const stats = useMemo(() => {
    const completed = files.filter(f => f.status === 'success').length;
    const failed = files.filter(f => f.status === 'error').length;
    const uploading = files.filter(f => f.status === 'uploading').length;
    const pending = files.filter(f => f.status === 'pending').length;
    
    return { completed, failed, uploading, pending, total: files.length };
  }, [files]);

  // Call onUploadComplete when all uploads are done
  useEffect(() => {
    if (stats.total > 0 && stats.uploading === 0 && stats.pending === 0) {
      if (uploadedAssets.length > 0 && onUploadComplete) {
        onUploadComplete(uploadedAssets);
      }
    }
  }, [stats, uploadedAssets, onUploadComplete]);

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <Card
        {...getRootProps()}
        className={`
          border-2 border-dashed p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="text-sm text-gray-500 mb-4">
          or click to browse
        </p>
        <p className="text-xs text-gray-400">
          Maximum file size: 50MB • Maximum {MAX_FILES} files at once
        </p>
      </Card>

      {/* Upload Statistics */}
      {stats.total > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-600">Total: {stats.total}</span>
              {stats.completed > 0 && (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  {stats.completed} completed
                </span>
              )}
              {stats.uploading > 0 && (
                <span className="text-blue-600 flex items-center gap-1">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {stats.uploading} uploading
                </span>
              )}
              {stats.failed > 0 && (
                <span className="text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {stats.failed} failed
                </span>
              )}
            </div>
            {stats.total > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Clear all files and cleanup
                  files.forEach(f => {
                    if (f.thumbnail) cleanupBlobUrl(f.thumbnail);
                  });
                  setFiles([]);
                  setUploadedAssets([]);
                }}
              >
                Clear All
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(file => (
            <Card key={file.id} className="p-4">
              <div className="flex items-center gap-4">
                {/* Thumbnail or Icon */}
                <div className="flex-shrink-0">
                  {file.thumbnail ? (
                    <img 
                      src={file.thumbnail} 
                      alt={file.name}
                      className="h-12 w-12 object-cover rounded"
                    />
                  ) : (
                    <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center">
                      <FileIcon fileType={file.type} />
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                  
                  {/* Progress Bar */}
                  {file.status === 'uploading' && (
                    <Progress value={file.progress} className="mt-2 h-1" />
                  )}
                  
                  {/* Error Message */}
                  {file.status === 'error' && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {file.error || 'Upload failed'}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {file.status === 'success' && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                  
                  {file.status === 'error' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => retryUpload(file.id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {file.status === 'uploading' && (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}