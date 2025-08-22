/**
 * Upload-related types for asset management
 * Following CLAUDE.md TypeScript patterns with branded types
 */

import { UserId, OrganizationId, VaultId } from './branded'

export type UploadStatus = 'pending' | 'uploading' | 'success' | 'error'

export type FileCategory = 
  | 'board-documents'
  | 'financial'
  | 'legal'
  | 'presentations'
  | 'policies'
  | 'meeting-materials'
  | 'compliance'
  | 'contracts'
  | 'general'

export interface FileUploadItem {
  id: string
  file: File
  title: string
  description?: string
  category: FileCategory
  folder: string
  tags: string[]
  status: UploadStatus
  progress: number
  error?: string
  preview?: string
}

export interface UploadedAsset {
  id: string
  title: string
  fileName: string
  originalFileName: string
  fileSize: number
  fileType: string
  mimeType: string
  category: FileCategory
  folderPath: string
  tags: string[]
  thumbnailUrl?: string
  createdAt: string
  updatedAt: string
  owner: {
    id: string
    name: string
    email: string
  }
  organization?: {
    id: string
    name: string
    slug: string
  }
  vault?: {
    id: string
    name: string
    organization_id: string
  }
  isShared: boolean
  sharedWith: Array<{
    userId: string
    userName: string
    permission: 'view' | 'download' | 'edit' | 'admin'
  }>
  downloadCount: number
  viewCount: number
}

export interface UploadProgressEvent {
  fileId: string
  progress: number
  loaded: number
  total: number
}

export interface UploadCompleteEvent {
  fileId: string
  asset: UploadedAsset
}

export interface UploadErrorEvent {
  fileId: string
  error: string
  retryCount?: number
}

export interface BulkUploadSettings {
  category: FileCategory
  folder: string
  tags: string
}

export interface UploadValidationError {
  field: string
  message: string
  code: string
}

export interface UploadResponse {
  success: boolean
  asset?: UploadedAsset
  error?: string
  code?: string
  validationErrors?: UploadValidationError[]
}

export const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Videos
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-ms-wmv',
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed'
] as const

export const ALLOWED_FILE_EXTENSIONS = [
  '.pdf', '.docx', '.pptx', '.xlsx', '.txt', '.md',
  '.jpg', '.jpeg', '.png', '.gif', '.svg',
  '.mp4', '.mov', '.avi', '.wmv',
  '.mp3', '.wav', '.m4a',
  '.zip', '.rar', '.7z'
] as const

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
export const MAX_FILES_PER_UPLOAD = 10
export const MAX_TITLE_LENGTH = 255
export const MAX_DESCRIPTION_LENGTH = 1000
export const MAX_TAGS_COUNT = 10
export const MAX_TAG_LENGTH = 50

export function isValidFileType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType as any)
}

export function isValidFileExtension(extension: string): boolean {
  return ALLOWED_FILE_EXTENSIONS.includes(extension as any)
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

export function generateFileId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9)
}