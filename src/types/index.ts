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
  VaultRole
} from './boardmates'

// User Types
export type {
  User,
  UserInsert,
  UserUpdate,
  UserProfile,
  UserWithPermissions,
  OrganizationMembership,
  UserRole,
  UserStatus,
  OrganizationRole,
  MembershipStatus
} from './entities/user.types'

// Organization Types
export type {
  Organization,
  OrganizationInsert,
  OrganizationUpdate,
  OrganizationMember,
  OrganizationInvitation,
  OrganizationFeatures,
  OrganizationWithMembers,
  OrganizationMemberWithUser,
  OrganizationSettings,
  PasswordPolicy,
  OrganizationSize,
  PlanType,
  InvitationStatus
} from './entities/organization.types'

// Asset Types
export type {
  Asset,
  AssetInsert,
  AssetUpdate,
  AssetPermission,
  AssetAnnotation,
  AssetWithDetails,
  AssetUploadData,
  AssetProcessingResult,
  AssetDownloadOptions,
  AssetShareOptions,
  AssetAnnotationData,
  AnnotationPosition,
  AssetMetrics,
  AssetStatus,
  AssetVisibility,
  AnnotationType
} from './entities/asset.types'

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
  ComplianceApiResponse,
  ComplianceSearchResponse
} from './entities/compliance.types'

// Vault Types
export type {
  Vault,
  VaultInsert,
  VaultUpdate,
  VaultWithDetails,
  VaultMember,
  VaultMemberWithUser,
  VaultAsset,
  VaultAssetWithDetails,
  VaultInvitation,
  VaultInvitationWithUser,
  VaultPermissions,
  VaultBroadcast,
  VaultActivity,
  VaultStatus,
  VaultPriority,
  VaultAction
} from './entities/vault.types'

// API Request Types
export type {
  CreateVaultRequest,
  UpdateVaultRequest,
  VaultInviteRequest,
  VaultBroadcastRequest,
  InviteUserRequest
} from './api/requests'

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
  MeetingStatus,
  Database
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

// Activity and Notification Types
export type {
  ActivityLog,
  ActivityEventType,
  ActivityEventCategory,
  NotificationPayload,
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  NotificationChannel,
  NotificationDelivery,
  NotificationDeliveryStatus,
  ActivityMetadata,
  EmailDeliveryConfig,
  RetryPolicy
} from './entities/activity.types'

// Common Types
export type {
  Notification
} from './common'

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

// ==== Advanced Type Utilities ====

// Re-export advanced type utilities from lib/types
export type {
  // Deep utility types
  DeepReadonly,
  DeepPartial,
  DeepRequired,
  // Strict utility types
  StrictOmit,
  StrictPick,
  // Key utility types
  KeysOfType,
  StringKeys,
  NumberKeys,
  SymbolKeys,
  // Conditional type helpers
  Extends,
  Equals,
  IsNever,
  IsAny,
  IsUnknown,
  IsUnion,
  UnionToIntersection,
  LastInUnion,
  UnionToTuple,
  // Advanced mapped types
  RequireOnly,
  OptionalOnly,
  Replace,
  Override,
  Merge,
  Mutable,
  ReadonlyBy,
  MutableBy,
  // Template literal utilities
  Capitalize as CapitalizeString,
  Uncapitalize as UncapitalizeString,
  KebabToCamel,
  CamelToKebab,
  SnakeToCamel,
  CamelToSnake,
  Paths,
  PathValue,
  // Function utilities
  Func,
  Asyncify,
  Awaited as AwaitedType,
  // Builder patterns
  Builder,
  FluentBuilder,
  ValidatedBuilder,
  // Type predicates
  TypePredicate,
  // Brand types
  Brand,
  ValidatedBrand,
  Unbrand,
  IsBranded
} from '../lib/types/utilities'

// Export utility functions
export {
  isDefined,
  isNullish,
  filterDefined,
  assertDefined,
  createBuilder,
  assertNever,
  identity,
  compose,
  pipe,
  createTypeGuard,
  and,
  or
} from '../lib/types/utilities'

// ==== Enhanced Branded Types ====

// Re-export enhanced branded types
export type {
  UserId,
  OrganizationId,
  VaultId,
  AssetId,
  NotificationId,
  CalendarEventId,
  MeetingId,
  ActivityLogId,
  ComplianceWorkflowId,
  BoardId,
  CommitteeId,
  DocumentId,
  AnnotationId,
  TocId,
  SummaryId,
  PodcastId,
  AnyBrandedId,
  SerializedBrandedId,
  ComposeBrands,
  ContextualBrand,
  VersionedBrand,
  ScopedBrand,
  OrgScopedId,
  ValidationResult as BrandedValidationResult,
  BrandedTypeName
} from '../lib/types/branded'

// Export branded type functions
export {
  createUserId,
  createOrganizationId,
  createVaultId,
  createAssetId,
  createNotificationId,
  createCalendarEventId,
  createMeetingId,
  createActivityLogId,
  createComplianceWorkflowId,
  createBoardId,
  createCommitteeId,
  createDocumentId,
  createAnnotationId,
  createTocId,
  createSummaryId,
  createPodcastId,
  // Unsafe constructors
  unsafeCreateUserId,
  unsafeCreateOrganizationId,
  unsafeCreateVaultId,
  unsafeCreateAssetId,
  unsafeCreateNotificationId,
  unsafeCreateCalendarEventId,
  unsafeCreateMeetingId,
  unsafeCreateActivityLogId,
  unsafeCreateComplianceWorkflowId,
  unsafeCreateBoardId,
  unsafeCreateCommitteeId,
  unsafeCreateDocumentId,
  unsafeCreateAnnotationId,
  unsafeCreateTocId,
  unsafeCreateSummaryId,
  unsafeCreatePodcastId,
  // Type guards
  isUserId,
  isOrganizationId,
  isVaultId,
  isAssetId,
  isNotificationId,
  isCalendarEventId,
  isMeetingId,
  isActivityLogId,
  isComplianceWorkflowId,
  isBoardId,
  isCommitteeId,
  isDocumentId,
  isAnnotationId,
  isTocId,
  isSummaryId,
  isPodcastId,
  isAnyBrandedId,
  // Utilities
  extractId,
  serializeBrandedId,
  deserializeBrandedId,
  mapBrandedIds,
  validateBrandedIds,
  createOrgScopedId,
  extractScope,
  BrandedTypeMap,
  TypeGuardMap
} from '../lib/types/branded'

// ==== Runtime Type Validation ====

// Re-export validation types and schemas
export type {
  ValidationOptions,
  ValidationMetadata,
  ValidationResult as ValidationResultType,
  ValidationMiddlewareConfig
} from '../lib/types/validation'

// Export validation schemas
export {
  TimestampSchema,
  EmailSchema,
  UrlSchema,
  SlugSchema,
  PhoneSchema,
  UserBaseSchema,
  UserCreateSchema,
  UserUpdateSchema,
  OrganizationBaseSchema,
  OrganizationCreateSchema,
  OrganizationUpdateSchema,
  VaultBaseSchema,
  VaultCreateSchema,
  VaultUpdateSchema,
  AssetBaseSchema,
  AssetCreateSchema,
  AssetUpdateSchema,
  MeetingBaseSchema,
  MeetingCreateSchema,
  MeetingUpdateSchema,
  NotificationBaseSchema,
  NotificationCreateSchema,
  NotificationUpdateSchema,
  // Validation decorators
  Validate,
  ValidateInput,
  ValidateOutput,
  // Validation utilities
  validateWithSchema,
  validatePartialWithSchema,
  validateAsync,
  validateBatch,
  createValidationMiddleware,
  // Schema registry
  SchemaRegistry,
  defaultSchemaRegistry
} from '../lib/types/validation'

// ==== Result Factory and Combinators ====

// Re-export Result factory types
export type {
  ResultFactory as ResultFactoryType,
  AsyncResultFactory,
  ResultTransform,
  AsyncResultTransform,
  ResultPredicate,
  AsyncResultPredicate,
  Chain
} from '../lib/types/result-factory'

// Export Result factory classes and utilities
export {
  ResultFactory,
  ResultCombinators,
  ResultArray,
  AsyncResult,
  ResultPattern,
  ResultBuilder,
  chain
} from '../lib/types/result-factory'

// ==== Type-Safe Event System ====

// Re-export event system types
export type {
  BaseEvent,
  EventHandler as TypedEventHandler,
  AsyncEventHandler,
  EventPredicate,
  EventMiddleware,
  EventFilter,
  EventSubscription,
  EventRegistry,
  DomainEvent,
  EventType,
  EventStore,
  // Specific event types
  UserEvent,
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
  OrganizationEvent,
  OrganizationCreatedEvent,
  OrganizationUpdatedEvent,
  OrganizationMemberAddedEvent,
  OrganizationMemberRemovedEvent,
  VaultEvent,
  VaultCreatedEvent,
  VaultUpdatedEvent,
  VaultAssetAddedEvent,
  VaultAssetRemovedEvent,
  AssetEvent,
  AssetUploadedEvent,
  AssetProcessedEvent,
  AssetSharedEvent,
  MeetingEvent,
  MeetingScheduledEvent,
  MeetingStartedEvent,
  MeetingEndedEvent,
  NotificationEvent,
  NotificationCreatedEvent,
  NotificationReadEvent
} from '../lib/types/events'

// Export event system classes and utilities
export {
  TypedEventEmitter,
  InMemoryEventStore,
  globalEventEmitter,
  globalEventStore,
  emitDomainEvent,
  onDomainEvent,
  onceDomainEvent,
  EventHandler as EventHandlerDecorator,
  registerEventHandlers
} from '../lib/types/events'