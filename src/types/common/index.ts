// Common utility types
export type ID = string

export type Timestamp = string

export type JSONValue = 
  | string 
  | number 
  | boolean 
  | null 
  | JSONValue[] 
  | { [key: string]: JSONValue }

export interface BaseEntity {
  id: ID
  created_at: Timestamp
  updated_at: Timestamp
}

export interface SoftDeleteEntity extends BaseEntity {
  deleted_at: Timestamp | null
  is_deleted: boolean
}

export interface AuditableEntity extends BaseEntity {
  created_by: ID
  updated_by?: ID
}

// Pagination types
export interface PaginationOptions {
  page?: number
  limit?: number
  offset?: number
}

export interface SortOptions {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface FilterOptions {
  [key: string]: any
}

// Form types
export interface FormFieldError {
  field: string
  message: string
}

export interface FormState<T> {
  data: T
  errors: FormFieldError[]
  isSubmitting: boolean
  isDirty: boolean
  isValid: boolean
}

// Loading states
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  lastFetch: Timestamp | null
}

// Upload types
export interface FileUploadProgress {
  fileId: string
  filename: string
  progress: number
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'failed'
  error?: string
}

export interface UploadOptions {
  maxFileSize?: number // bytes
  allowedTypes?: string[]
  compress?: boolean
  generateThumbnail?: boolean
}

// Permission types
export interface Permission {
  resource: string
  action: string
  conditions?: Record<string, unknown>
}

export interface Role {
  id: string
  name: string
  permissions: Permission[]
  isSystem: boolean
}

// Feature flags
export interface FeatureFlags {
  aiSummarization: boolean
  advancedPermissions: boolean
  ssoEnabled: boolean
  auditLogs: boolean
  apiAccess: boolean
  whiteLabel: boolean
}

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemeConfig {
  mode: ThemeMode
  primaryColor: string
  accentColor: string
  borderRadius: number
  fontSize: 'small' | 'medium' | 'large'
}

// Notification types
export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration?: number
  dismissible?: boolean
  actions?: Array<{
    label: string
    action: () => void
    variant?: 'primary' | 'secondary'
  }>
}

// Search types
export interface SearchOptions {
  query: string
  filters?: FilterOptions
  facets?: string[]
  highlight?: boolean
  fuzzy?: boolean
}

export interface SearchResult<T> {
  items: T[]
  total: number
  facets?: Record<string, Record<string, number>>
  suggestions?: string[]
}

// Geolocation types
export interface Coordinates {
  latitude: number
  longitude: number
  accuracy?: number
}

export interface Location {
  coordinates: Coordinates
  address?: string
  city?: string
  country?: string
  timezone?: string
}

// Device info
export interface DeviceInfo {
  userAgent: string
  platform: string
  screenResolution: string
  timezone: string
  language: string
}

// Event types
export interface BaseEvent {
  id: string
  timestamp: Timestamp
  type: string
  source: string
}

export interface UserEvent extends BaseEvent {
  userId: string
  sessionId?: string
  metadata?: JSONValue
}

// Cache types
export interface CacheOptions {
  ttl?: number // seconds
  maxAge?: number // seconds
  staleWhileRevalidate?: boolean
  tags?: string[]
}

export interface CacheEntry<T> {
  data: T
  timestamp: Timestamp
  ttl: number
  tags: string[]
}

// Error types
export interface AppError {
  code: string
  message: string
  details?: JSONValue
  timestamp: Timestamp
  stack?: string
}

export type ErrorBoundaryFallback = React.ComponentType<{
  error: AppError
  resetError: () => void
}>

// Color types
export type ColorValue = `#${string}` | `rgb(${string})` | `rgba(${string})` | `hsl(${string})` | `hsla(${string})`

// Size types
export type SizeVariant = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type SpacingValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24 | 32 | 40 | 48 | 56 | 64

// Component types
export interface ComponentWithChildren {
  children: React.ReactNode
}

export interface ComponentWithClassName {
  className?: string
}

export type ComponentVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'destructive'