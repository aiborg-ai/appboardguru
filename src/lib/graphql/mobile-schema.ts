/**
 * Mobile-optimized GraphQL schema and type definitions
 * Designed for efficient data fetching with network and battery constraints
 */

export const mobileTypeDefinitions = `
  # Scalar types for mobile optimization
  scalar Upload
  scalar DateTime
  scalar JSON

  # Mobile-specific directives
  directive @mobileOptimized(
    maxComplexity: Int
    cacheHint: String
    dataUsageCategory: String
  ) on FIELD_DEFINITION | OBJECT

  directive @lazy on FIELD_DEFINITION
  directive @compress on FIELD_DEFINITION

  # Query complexity limits for mobile
  type QueryComplexitySettings {
    maxDepth: Int!
    maxComplexity: Int!
    introspectionEnabled: Boolean!
  }

  # Mobile connection types with pagination
  interface Connection {
    edges: [Edge!]!
    pageInfo: PageInfo!
    totalCount: Int
  }

  interface Edge {
    cursor: String!
    node: Node!
  }

  interface Node {
    id: ID!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
    totalCount: Int
  }

  # Mobile-optimized asset types
  type MobileAsset implements Node @mobileOptimized(maxComplexity: 10, cacheHint: "PUBLIC:300") {
    id: ID!
    title: String!
    type: AssetType!
    size: Int!
    thumbnail: String @compress
    previewUrl: String @lazy @compress
    downloadUrl: String @lazy
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
    
    # Optimized relationships
    organization: MobileOrganization @lazy
    creator: MobileUser @lazy
    permissions: AssetPermissions @lazy
    
    # Mobile-specific fields
    syncStatus: SyncStatus!
    lastSyncedAt: DateTime
    compressionRatio: Float
    networkRequirement: NetworkTier!
  }

  type MobileAssetConnection implements Connection {
    edges: [MobileAssetEdge!]!
    pageInfo: PageInfo!
    totalCount: Int
    filters: AssetFilters
  }

  type MobileAssetEdge implements Edge {
    cursor: String!
    node: MobileAsset!
  }

  # Mobile-optimized organization types
  type MobileOrganization implements Node @mobileOptimized(maxComplexity: 8, cacheHint: "PRIVATE:600") {
    id: ID!
    name: String!
    slug: String!
    logoUrl: String @compress
    settings: OrganizationSettings @lazy
    memberCount: Int!
    
    # Mobile-specific fields
    syncStatus: SyncStatus!
    offlineCapabilities: OfflineCapabilities!
    dataUsageEstimate: DataUsageEstimate!
  }

  type MobileOrganizationConnection implements Connection {
    edges: [MobileOrganizationEdge!]!
    pageInfo: PageInfo!
    totalCount: Int
  }

  type MobileOrganizationEdge implements Edge {
    cursor: String!
    node: MobileOrganization!
  }

  # Mobile-optimized user types
  type MobileUser implements Node @mobileOptimized(maxComplexity: 6, cacheHint: "PRIVATE:1800") {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    avatarUrl: String @compress
    role: UserRole!
    lastActiveAt: DateTime
    
    # Mobile-specific fields
    deviceInfo: DeviceInfo
    preferences: MobilePreferences!
    syncStatus: SyncStatus!
  }

  # Mobile-specific enums
  enum SyncStatus {
    SYNCED
    PENDING
    SYNCING
    ERROR
    OFFLINE_ONLY
  }

  enum NetworkTier {
    WIFI_ONLY
    CELLULAR_ALLOWED
    LOW_BANDWIDTH_OK
    OFFLINE_CAPABLE
  }

  enum AssetType {
    DOCUMENT
    IMAGE
    VIDEO
    AUDIO
    ARCHIVE
  }

  enum UserRole {
    ADMIN
    MEMBER
    VIEWER
    GUEST
  }

  # Mobile-specific types
  type OfflineCapabilities {
    maxOfflineDays: Int!
    supportedOperations: [String!]!
    requiredStorageSpace: Int!
  }

  type DataUsageEstimate {
    dailyAverage: Int!
    monthlyProjection: Int!
    compressionSavings: Int!
  }

  type DeviceInfo {
    platform: String
    version: String
    model: String
    networkType: String
    batteryLevel: Float
    storageAvailable: Int
  }

  type MobilePreferences {
    dataUsageMode: DataUsageMode!
    syncFrequency: SyncFrequency!
    offlineMode: Boolean!
    compressionLevel: CompressionLevel!
    autoDownloadThreshold: Int!
  }

  enum DataUsageMode {
    MINIMAL
    BALANCED
    FULL
  }

  enum SyncFrequency {
    REAL_TIME
    EVERY_5_MINUTES
    EVERY_15_MINUTES
    EVERY_HOUR
    MANUAL_ONLY
  }

  enum CompressionLevel {
    NONE
    LOW
    MEDIUM
    HIGH
    MAXIMUM
  }

  # Input types for mobile operations
  input MobileAssetFilter {
    types: [AssetType!]
    syncStatus: [SyncStatus!]
    networkTier: [NetworkTier!]
    dateRange: DateRange
    sizeRange: SizeRange
    organizationIds: [ID!]
  }

  input DateRange {
    start: DateTime!
    end: DateTime!
  }

  input SizeRange {
    min: Int
    max: Int
  }

  input ConnectionArgs {
    first: Int
    after: String
    last: Int
    before: String
  }

  input MobilePreferencesInput {
    dataUsageMode: DataUsageMode
    syncFrequency: SyncFrequency
    offlineMode: Boolean
    compressionLevel: CompressionLevel
    autoDownloadThreshold: Int
  }

  # Mobile-optimized query interface
  type Query {
    # Asset queries with mobile optimization
    assets(
      filter: MobileAssetFilter
      connection: ConnectionArgs
      networkOptimized: Boolean = true
    ): MobileAssetConnection! @mobileOptimized(maxComplexity: 50)
    
    asset(id: ID!): MobileAsset @mobileOptimized(maxComplexity: 20)
    
    # Organization queries
    organizations(
      connection: ConnectionArgs
      includeOfflineData: Boolean = false
    ): MobileOrganizationConnection! @mobileOptimized(maxComplexity: 30)
    
    organization(id: ID!): MobileOrganization @mobileOptimized(maxComplexity: 15)
    
    # User queries
    me: MobileUser! @mobileOptimized(maxComplexity: 10)
    
    # Mobile-specific queries
    syncStatus: GlobalSyncStatus! @mobileOptimized(maxComplexity: 5)
    offlineQueue: OfflineOperationQueue! @mobileOptimized(maxComplexity: 15)
    dataUsageStats: DataUsageStats! @mobileOptimized(maxComplexity: 10)
    networkStatus: NetworkStatus! @mobileOptimized(maxComplexity: 5)
    
    # Batch operations for efficiency
    batchAssets(ids: [ID!]!): [MobileAsset!]! @mobileOptimized(maxComplexity: 100)
    batchOrganizations(ids: [ID!]!): [MobileOrganization!]! @mobileOptimized(maxComplexity: 80)
  }

  # Mobile-optimized mutations
  type Mutation {
    # Asset operations
    uploadAsset(
      input: AssetUploadInput!
      options: MobileUploadOptions
    ): AssetUploadResponse! @mobileOptimized(maxComplexity: 30)
    
    updateAsset(id: ID!, input: AssetUpdateInput!): MobileAsset! @mobileOptimized(maxComplexity: 20)
    
    deleteAsset(id: ID!): AssetDeleteResponse! @mobileOptimized(maxComplexity: 10)
    
    # Sync operations
    requestSync(
      scope: SyncScope!
      priority: SyncPriority = NORMAL
    ): SyncResponse! @mobileOptimized(maxComplexity: 15)
    
    cancelSync(operationId: ID!): Boolean! @mobileOptimized(maxComplexity: 5)
    
    # Offline operations
    queueOfflineOperation(
      operation: OfflineOperationInput!
    ): OfflineOperationResponse! @mobileOptimized(maxComplexity: 10)
    
    # User preferences
    updateMobilePreferences(
      input: MobilePreferencesInput!
    ): MobileUser! @mobileOptimized(maxComplexity: 10)
    
    # Batch operations
    batchUpdateAssets(
      inputs: [BatchAssetUpdateInput!]!
    ): BatchUpdateResponse! @mobileOptimized(maxComplexity: 200)
  }

  # Mobile-specific subscriptions with connection management
  type Subscription {
    assetSyncUpdates(organizationId: ID!): AssetSyncUpdate! @mobileOptimized(maxComplexity: 10)
    offlineQueueUpdates: OfflineQueueUpdate! @mobileOptimized(maxComplexity: 5)
    networkStatusChanges: NetworkStatus! @mobileOptimized(maxComplexity: 5)
    dataUsageAlerts: DataUsageAlert! @mobileOptimized(maxComplexity: 5)
  }

  # Supporting types for mobile operations
  type GlobalSyncStatus {
    isOnline: Boolean!
    lastSyncTime: DateTime
    pendingOperations: Int!
    queuedOperations: Int!
    failedOperations: Int!
    estimatedSyncTime: Int
  }

  type OfflineOperationQueue {
    operations: [OfflineOperation!]!
    totalSize: Int!
    estimatedSyncTime: Int!
  }

  type OfflineOperation {
    id: ID!
    type: OfflineOperationType!
    payload: JSON!
    createdAt: DateTime!
    status: OfflineOperationStatus!
    retryCount: Int!
    estimatedDataUsage: Int!
  }

  enum OfflineOperationType {
    ASSET_UPLOAD
    ASSET_UPDATE
    ASSET_DELETE
    ORGANIZATION_UPDATE
    USER_PREFERENCES_UPDATE
  }

  enum OfflineOperationStatus {
    QUEUED
    PROCESSING
    COMPLETED
    FAILED
    CANCELLED
  }

  type DataUsageStats {
    current: DataUsagePeriod!
    previous: DataUsagePeriod!
    projection: DataUsagePeriod!
    savings: DataSavings!
  }

  type DataUsagePeriod {
    period: String!
    totalBytes: Int!
    uploadBytes: Int!
    downloadBytes: Int!
    operationCount: Int!
  }

  type DataSavings {
    compressionSaved: Int!
    cachingHitRate: Float!
    offlineModeSaved: Int!
  }

  type NetworkStatus {
    isOnline: Boolean!
    connectionType: String
    effectiveType: String
    downlink: Float
    rtt: Int
    saveData: Boolean
  }

  # Response types
  type AssetUploadResponse {
    asset: MobileAsset!
    uploadProgress: UploadProgress!
    estimatedTimeRemaining: Int
  }

  type UploadProgress {
    bytesUploaded: Int!
    totalBytes: Int!
    percentage: Float!
    speed: Float
  }

  type AssetDeleteResponse {
    success: Boolean!
    message: String
    offlineQueuedOperation: OfflineOperation
  }

  type SyncResponse {
    operationId: ID!
    estimatedDuration: Int!
    priority: SyncPriority!
    queuePosition: Int!
  }

  enum SyncScope {
    ALL
    ORGANIZATION
    ASSETS_ONLY
    PREFERENCES_ONLY
  }

  enum SyncPriority {
    LOW
    NORMAL
    HIGH
    URGENT
  }

  type OfflineOperationResponse {
    operation: OfflineOperation!
    queuePosition: Int!
    estimatedProcessingTime: Int!
  }

  type BatchUpdateResponse {
    successCount: Int!
    failureCount: Int!
    results: [BatchOperationResult!]!
  }

  type BatchOperationResult {
    id: ID!
    success: Boolean!
    error: String
    result: MobileAsset
  }

  # Real-time update types
  type AssetSyncUpdate {
    assetId: ID!
    status: SyncStatus!
    progress: Float
    error: String
  }

  type OfflineQueueUpdate {
    queueSize: Int!
    processingOperation: OfflineOperation
    completedOperations: Int!
  }

  type DataUsageAlert {
    type: DataUsageAlertType!
    message: String!
    threshold: Int!
    currentUsage: Int!
    suggestions: [String!]!
  }

  enum DataUsageAlertType {
    APPROACHING_LIMIT
    LIMIT_EXCEEDED
    UNUSUAL_USAGE
    SAVINGS_OPPORTUNITY
  }

  # Input types
  input AssetUploadInput {
    title: String!
    type: AssetType!
    file: Upload!
    organizationId: ID!
    metadata: JSON
  }

  input MobileUploadOptions {
    compressionLevel: CompressionLevel
    networkTier: NetworkTier
    priority: UploadPriority
    resumable: Boolean
  }

  enum UploadPriority {
    LOW
    NORMAL
    HIGH
    BACKGROUND
  }

  input AssetUpdateInput {
    title: String
    metadata: JSON
  }

  input OfflineOperationInput {
    type: OfflineOperationType!
    payload: JSON!
    priority: OfflineOperationPriority = NORMAL
  }

  enum OfflineOperationPriority {
    LOW
    NORMAL
    HIGH
    URGENT
  }

  input BatchAssetUpdateInput {
    id: ID!
    input: AssetUpdateInput!
  }

  # Permission types
  type AssetPermissions {
    canView: Boolean!
    canEdit: Boolean!
    canDelete: Boolean!
    canShare: Boolean!
    canDownload: Boolean!
  }

  type OrganizationSettings {
    allowOfflineMode: Boolean!
    maxOfflineDuration: Int!
    dataCompressionEnabled: Boolean!
    autoSyncEnabled: Boolean!
    mobileUploadLimit: Int!
  }
`;

export default mobileTypeDefinitions;