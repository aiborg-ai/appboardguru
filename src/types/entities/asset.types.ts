import { Database } from '../database'

// Base asset types from database
export type Asset = Database['public']['Tables']['board_packs']['Row']
export type AssetInsert = Database['public']['Tables']['board_packs']['Insert']
export type AssetUpdate = Database['public']['Tables']['board_packs']['Update']

export type AssetPermission = Database['public']['Tables']['board_pack_permissions']['Row']
export type AssetAnnotation = Database['public']['Tables']['asset_annotations']['Row']

// Extended types
export interface AssetWithDetails extends Asset {
  uploader: {
    id: string
    full_name: string | null
    email: string
  }
  organization: {
    id: string
    name: string
    slug: string
  }
  permissions: AssetPermission[]
  annotations?: AssetAnnotation[]
  vaults?: {
    id: string
    name: string
    addedAt: string
  }[]
}

export interface AssetUploadData {
  file: File
  title: string
  description?: string
  organizationId: string
  visibility: AssetVisibility
  tags?: string[]
}

export interface AssetProcessingResult {
  success: boolean
  summary?: string
  audioSummaryUrl?: string
  error?: string
  processingTime: number
}

export interface AssetDownloadOptions {
  includeWatermark: boolean
  format?: 'original' | 'pdf' | 'image'
  quality?: 'low' | 'medium' | 'high'
}

export interface AssetShareOptions {
  emails: string[]
  message?: string
  permissions: {
    canView: boolean
    canDownload: boolean
    canComment: boolean
  }
  expiresAt?: string
}

export interface AssetAnnotationData {
  type: AnnotationType
  content: any
  pageNumber: number
  position: AnnotationPosition
  selectedText?: string
  commentText?: string
  color: string
  opacity: number
  isPrivate: boolean
}

export interface AnnotationPosition {
  x: number
  y: number
  width?: number
  height?: number
}

export interface AssetMetrics {
  viewCount: number
  downloadCount: number
  commentCount: number
  annotationCount: number
  shareCount: number
  lastAccessed: string
}

export type AssetStatus = 'processing' | 'ready' | 'failed'
export type AssetVisibility = 'organization' | 'public' | 'private'
export type AnnotationType = 'highlight' | 'area' | 'textbox' | 'drawing' | 'stamp'