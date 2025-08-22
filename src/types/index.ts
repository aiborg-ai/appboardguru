/**
 * Types Index
 * Central export point for all type definitions
 */

// Dashboard Types
export type {
  DashboardLayoutProps,
  DashboardPageProps,
  SidebarProps,
  DashboardMetrics,
  DashboardActivity,
  StatCardProps,
  QuickAction,
  QuickActionsProps,
  ActivityFeedProps,
  FilterOption,
  DataTableProps,
  TableColumn,
  SearchAndFilterProps,
  StatusType,
  ViewMode
} from './dashboard'

export type {
  ChartType,
  ChartDataPoint,
  ChartSeries,
  ChartConfig,
  BaseChartProps,
  LineChartProps,
  BarChartProps,
  PieChartProps,
  AreaChartProps,
  ScatterChartProps,
  GaugeChartProps,
  HeatmapProps,
  FunnelChartProps,
  RadarChartProps,
  KPIMetric,
  KPICardProps,
  DashboardWidget,
  DashboardLayout,
  DataQuery,
  ChartInteraction
} from './data-visualization'

// Component Types - avoid conflicting exports
export type {
  NavigationItem,
  NavigationSection,
  NavigationMenuProps,
  BreadcrumbItem,
  BreadcrumbProps,
  ButtonVariant,
  ButtonSize,
  ButtonProps,
  TopNavProps,
  TabItem,
  TabsProps
} from './navigation'

// Feature Types
export type {
  BoardMateProfile,
  BoardMatesPageProps,
  AssociationManagerProps,
  BoardMembershipStatus,
  BoardType,
  BoardStatus,
  BoardRole,
  CommitteeType,
  CommitteeRole,
  VaultRole,
  VaultStatus
} from './boardmates'

// Entity Types
export type {
  ComplianceTemplate,
  ComplianceTemplateInsert,
  ComplianceCalendarEntry,
  NotificationWorkflow,
  ComplianceParticipant,
  NotificationAuditLog,
  ComplianceFrequency,
  ComplianceStatus,
  AdvanceWorkflowStepRequest,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  AcknowledgeNotificationRequest,
  CreateCalendarEntryRequest,
  AuditReportRequest,
  AuditReportFilters,
  ComplianceApiResponse
} from './entities/compliance.types'

// Hook Types
export type {
  UseAsyncReturn,
  UseFormReturn,
  UseMapReturn
} from './hooks'

// Database and Core Types
export type {
  UserId,
  OrganizationId,
  AssetId,
  VaultId,
  BoardId,
  NotificationId,
  TemplateId,
  EventId,
  UserRole,
  UserStatus,
  OrganizationSize,
  MemberRole,
  MemberStatus,
  InvitationStatus,
  MeetingType,
  MeetingStatus
} from './database'

// Meetings Types
export type {
  MeetingResolution,
  MeetingActionable,
  MeetingWithResolutionsAndActionables,
  ActionableWithUpdates,
  ResolutionWithVotes,
  ResolutionType,
  ResolutionStatus,
  VotingMethod,
  ActionablePriority,
  ActionableStatus,
  ActionableCategory,
  CreateResolutionRequest,
  UpdateResolutionRequest
} from './meetings'

// Type Utilities
export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[P] extends readonly (infer U)[]
    ? readonly DeepPartial<U>[]
    : DeepPartial<T[P]>
}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type RequiredKeys<T, K extends keyof T> = T & { [P in K]-?: T[P] }

export type NonNullable<T> = T extends null | undefined ? never : T

export type ValueOf<T> = T[keyof T]

// Event Handler Types
export type EventHandler<T = any> = (event: T) => void
export type ChangeHandler<T = any> = (value: T) => void
export type SubmitHandler<T = any> = (data: T) => void | Promise<void>

// API Response Types
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  success: boolean
  message?: string
  code?: string | number
}

export interface PaginatedResponse<T = any> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
}

// Error Types
export interface AppError {
  message: string
  code?: string | number
  type?: 'validation' | 'authentication' | 'authorization' | 'network' | 'server' | 'unknown'
  field?: string
  details?: any
}

// Loading States
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncState<T = any, E = AppError> {
  data: T | null
  error: E | null
  loading: boolean
  state: LoadingState
}

// Common Props
export interface WithClassName {
  className?: string
}

export interface WithChildren {
  children: React.ReactNode
}

export interface WithId {
  id: string
}

export interface WithTestId {
  'data-testid'?: string
}

export type ComponentProps = WithClassName & WithChildren & WithTestId

// Date/Time Types
export type DateLike = string | number | Date

// ID Types
export type ID = string | number

// Color Types
export type ColorVariant = 
  | 'primary' 
  | 'secondary' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'info' 
  | 'neutral'

// Size Types
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

// Position Types
export type Position = 'top' | 'right' | 'bottom' | 'left'
export type Alignment = 'start' | 'center' | 'end'
export type Placement = `${Position}` | `${Position}-${Alignment}`