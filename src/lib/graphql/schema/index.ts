/**
 * GraphQL Schema Definition
 * Comprehensive schema covering all domain entities with proper authorization
 */

import { gql } from 'graphql-tag'

export const typeDefs = gql`
  # Scalar types for enhanced type safety
  scalar DateTime
  scalar Upload
  scalar JSON
  scalar EmailAddress
  scalar UUID

  # Enums
  enum AssetStatus {
    PROCESSING
    READY
    FAILED
  }

  enum AssetVisibility {
    ORGANIZATION
    PUBLIC
    PRIVATE
  }

  enum AnnotationType {
    HIGHLIGHT
    AREA
    TEXTBOX
    DRAWING
    STAMP
  }

  enum NotificationType {
    ASSET_SHARED
    ASSET_COMMENTED
    VAULT_INVITATION
    ORGANIZATION_INVITATION
    MEETING_SCHEDULED
    COMPLIANCE_ALERT
  }

  enum UserRole {
    SUPER_ADMIN
    ORG_ADMIN
    BOARD_MEMBER
    VIEWER
  }

  enum MeetingStatus {
    SCHEDULED
    IN_PROGRESS
    COMPLETED
    CANCELLED
  }

  # Core entity types
  type User {
    id: UUID!
    email: EmailAddress!
    fullName: String
    profilePicture: String
    role: UserRole!
    createdAt: DateTime!
    updatedAt: DateTime!
    
    # Relationships
    organizations: [Organization!]!
    assets: [Asset!]!
    notifications: [Notification!]!
    meetings: [Meeting!]!
    boardMemberships: [BoardMembership!]!
    
    # Computed fields
    totalAssets: Int!
    totalOrganizations: Int!
    activityScore: Float!
  }

  type Organization {
    id: UUID!
    name: String!
    slug: String!
    description: String
    website: String
    logo: String
    settings: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
    
    # Relationships
    members: [User!]!
    assets: [Asset!]!
    vaults: [Vault!]!
    meetings: [Meeting!]!
    boards: [Board!]!
    
    # Computed fields
    memberCount: Int!
    assetCount: Int!
    activeBoards: Int!
    complianceScore: Float!
  }

  type Asset {
    id: UUID!
    title: String!
    description: String
    fileName: String!
    filePath: String!
    fileSize: Int!
    contentType: String!
    status: AssetStatus!
    visibility: AssetVisibility!
    summary: String
    audioSummaryUrl: String
    tags: [String!]!
    createdAt: DateTime!
    updatedAt: DateTime!
    
    # Relationships
    uploader: User!
    organization: Organization!
    annotations: [Annotation!]!
    permissions: [AssetPermission!]!
    vaults: [Vault!]!
    
    # Computed fields
    viewCount: Int!
    downloadCount: Int!
    commentCount: Int!
    canView: Boolean!
    canEdit: Boolean!
    canDownload: Boolean!
  }

  type Vault {
    id: UUID!
    name: String!
    description: String
    settings: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
    
    # Relationships
    organization: Organization!
    assets: [Asset!]!
    members: [User!]!
    invitations: [VaultInvitation!]!
    
    # Computed fields
    assetCount: Int!
    memberCount: Int!
    totalSize: Int!
  }

  type Board {
    id: UUID!
    name: String!
    description: String
    type: String!
    settings: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
    
    # Relationships
    organization: Organization!
    members: [BoardMembership!]!
    meetings: [Meeting!]!
    committees: [Committee!]!
    
    # Computed fields
    memberCount: Int!
    meetingCount: Int!
    activeCommittees: Int!
  }

  type Meeting {
    id: UUID!
    title: String!
    description: String
    scheduledAt: DateTime!
    duration: Int
    location: String
    agenda: JSON
    status: MeetingStatus!
    createdAt: DateTime!
    updatedAt: DateTime!
    
    # Relationships
    organization: Organization!
    board: Board
    attendees: [User!]!
    resolutions: [Resolution!]!
    actionables: [Actionable!]!
    
    # Computed fields
    attendeeCount: Int!
    resolutionCount: Int!
    actionableCount: Int!
  }

  type Notification {
    id: UUID!
    type: NotificationType!
    title: String!
    message: String!
    data: JSON
    isRead: Boolean!
    createdAt: DateTime!
    
    # Relationships
    recipient: User!
    sender: User
    
    # Computed fields
    timeAgo: String!
  }

  type Annotation {
    id: UUID!
    type: AnnotationType!
    content: JSON!
    pageNumber: Int!
    position: JSON!
    selectedText: String
    commentText: String
    color: String!
    opacity: Float!
    isPrivate: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    
    # Relationships
    asset: Asset!
    author: User!
    
    # Computed fields
    canEdit: Boolean!
    canDelete: Boolean!
  }

  # Permission and access control types
  type AssetPermission {
    id: UUID!
    canView: Boolean!
    canEdit: Boolean!
    canDownload: Boolean!
    canComment: Boolean!
    expiresAt: DateTime
    createdAt: DateTime!
    
    # Relationships
    asset: Asset!
    user: User!
    grantedBy: User!
  }

  type BoardMembership {
    id: UUID!
    role: String!
    joinedAt: DateTime!
    
    # Relationships
    board: Board!
    user: User!
  }

  type VaultInvitation {
    id: UUID!
    email: EmailAddress!
    status: String!
    message: String
    expiresAt: DateTime!
    createdAt: DateTime!
    
    # Relationships
    vault: Vault!
    invitedBy: User!
  }

  # Meeting-related types
  type Resolution {
    id: UUID!
    title: String!
    description: String!
    status: String!
    priority: String!
    dueDate: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    
    # Relationships
    meeting: Meeting!
    assignee: User
    createdBy: User!
  }

  type Actionable {
    id: UUID!
    title: String!
    description: String!
    status: String!
    priority: String!
    dueDate: DateTime
    completedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    
    # Relationships
    meeting: Meeting!
    assignee: User
    createdBy: User!
  }

  type Committee {
    id: UUID!
    name: String!
    description: String
    type: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    
    # Relationships
    board: Board!
    members: [User!]!
    meetings: [Meeting!]!
  }

  # Input types for mutations
  input CreateOrganizationInput {
    name: String!
    description: String
    website: String
  }

  input UpdateOrganizationInput {
    name: String
    description: String
    website: String
    settings: JSON
  }

  input CreateAssetInput {
    title: String!
    description: String
    organizationId: UUID!
    visibility: AssetVisibility!
    tags: [String!]
  }

  input UpdateAssetInput {
    title: String
    description: String
    visibility: AssetVisibility
    tags: [String!]
  }

  input CreateVaultInput {
    name: String!
    description: String
    organizationId: UUID!
  }

  input CreateMeetingInput {
    title: String!
    description: String
    organizationId: UUID!
    boardId: UUID
    scheduledAt: DateTime!
    duration: Int
    location: String
    agenda: JSON
  }

  input CreateAnnotationInput {
    assetId: UUID!
    type: AnnotationType!
    content: JSON!
    pageNumber: Int!
    position: JSON!
    selectedText: String
    commentText: String
    color: String!
    opacity: Float!
    isPrivate: Boolean!
  }

  input ShareAssetInput {
    assetId: UUID!
    userIds: [UUID!]
    emails: [EmailAddress!]
    permissions: AssetPermissionInput!
    message: String
    expiresAt: DateTime
  }

  input AssetPermissionInput {
    canView: Boolean!
    canEdit: Boolean!
    canDownload: Boolean!
    canComment: Boolean!
  }

  # Filter and pagination inputs
  input AssetFilters {
    organizationId: UUID
    uploaderId: UUID
    status: AssetStatus
    visibility: AssetVisibility
    tags: [String!]
    contentType: String
    dateFrom: DateTime
    dateTo: DateTime
    search: String
  }

  input PaginationInput {
    page: Int = 1
    limit: Int = 20
    sortBy: String = "createdAt"
    sortOrder: SortOrder = DESC
  }

  enum SortOrder {
    ASC
    DESC
  }

  # Paginated response types
  type AssetConnection {
    edges: [AssetEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type AssetEdge {
    node: Asset!
    cursor: String!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  # Analytics and reporting types
  type AssetAnalytics {
    totalAssets: Int!
    assetsByStatus: [StatusCount!]!
    assetsByType: [TypeCount!]!
    assetsByMonth: [MonthlyCount!]!
    topUploaders: [UserCount!]!
    storageUsed: Int!
    downloadStats: [DownloadStat!]!
  }

  type StatusCount {
    status: AssetStatus!
    count: Int!
  }

  type TypeCount {
    contentType: String!
    count: Int!
  }

  type MonthlyCount {
    month: String!
    count: Int!
  }

  type UserCount {
    user: User!
    count: Int!
  }

  type DownloadStat {
    asset: Asset!
    downloadCount: Int!
  }

  type OrganizationAnalytics {
    memberGrowth: [MonthlyCount!]!
    assetGrowth: [MonthlyCount!]!
    activityHeatmap: JSON!
    topAssets: [AssetCount!]!
    complianceMetrics: ComplianceMetrics!
  }

  type AssetCount {
    asset: Asset!
    count: Int!
  }

  type ComplianceMetrics {
    totalPolicies: Int!
    activeAlerts: Int!
    complianceScore: Float!
    lastAudit: DateTime
  }

  # Subscription types
  type AssetStatusUpdate {
    asset: Asset!
    previousStatus: AssetStatus!
    newStatus: AssetStatus!
  }

  type NewNotification {
    notification: Notification!
    user: User!
  }

  type AnnotationUpdate {
    annotation: Annotation!
    action: String! # CREATE, UPDATE, DELETE
  }

  # Root types
  type Query {
    # User queries
    me: User
    user(id: UUID!): User
    users(filters: JSON, pagination: PaginationInput): [User!]!
    
    # Organization queries
    organization(id: UUID!): Organization
    organizationBySlug(slug: String!): Organization
    organizations(filters: JSON, pagination: PaginationInput): [Organization!]!
    
    # Asset queries
    asset(id: UUID!): Asset
    assets(filters: AssetFilters, pagination: PaginationInput): AssetConnection!
    assetsByVault(vaultId: UUID!, pagination: PaginationInput): AssetConnection!
    searchAssets(query: String!, filters: AssetFilters, pagination: PaginationInput): AssetConnection!
    
    # Vault queries
    vault(id: UUID!): Vault
    vaults(organizationId: UUID, pagination: PaginationInput): [Vault!]!
    
    # Meeting queries
    meeting(id: UUID!): Meeting
    meetings(filters: JSON, pagination: PaginationInput): [Meeting!]!
    upcomingMeetings(organizationId: UUID, limit: Int = 10): [Meeting!]!
    
    # Board queries
    board(id: UUID!): Board
    boards(organizationId: UUID!, pagination: PaginationInput): [Board!]!
    
    # Notification queries
    notifications(userId: UUID, isRead: Boolean, pagination: PaginationInput): [Notification!]!
    unreadNotificationCount: Int!
    
    # Analytics queries
    assetAnalytics(organizationId: UUID, dateRange: JSON): AssetAnalytics!
    organizationAnalytics(organizationId: UUID!, dateRange: JSON): OrganizationAnalytics!
    
    # Search queries
    globalSearch(query: String!, type: String, organizationId: UUID): JSON!
    
    # Health and status
    healthCheck: JSON!
  }

  type Mutation {
    # User mutations
    updateProfile(input: JSON!): User!
    changePassword(currentPassword: String!, newPassword: String!): Boolean!
    
    # Organization mutations
    createOrganization(input: CreateOrganizationInput!): Organization!
    updateOrganization(id: UUID!, input: UpdateOrganizationInput!): Organization!
    deleteOrganization(id: UUID!): Boolean!
    inviteToOrganization(organizationId: UUID!, email: EmailAddress!, role: UserRole!): Boolean!
    
    # Asset mutations
    createAsset(input: CreateAssetInput!, file: Upload!): Asset!
    updateAsset(id: UUID!, input: UpdateAssetInput!): Asset!
    deleteAsset(id: UUID!): Boolean!
    shareAsset(input: ShareAssetInput!): Boolean!
    addAssetToVault(assetId: UUID!, vaultId: UUID!): Boolean!
    removeAssetFromVault(assetId: UUID!, vaultId: UUID!): Boolean!
    
    # Vault mutations
    createVault(input: CreateVaultInput!): Vault!
    updateVault(id: UUID!, input: JSON!): Vault!
    deleteVault(id: UUID!): Boolean!
    inviteToVault(vaultId: UUID!, email: EmailAddress!, message: String): Boolean!
    
    # Meeting mutations
    createMeeting(input: CreateMeetingInput!): Meeting!
    updateMeeting(id: UUID!, input: JSON!): Meeting!
    deleteMeeting(id: UUID!): Boolean!
    addMeetingAttendee(meetingId: UUID!, userId: UUID!): Boolean!
    removeMeetingAttendee(meetingId: UUID!, userId: UUID!): Boolean!
    
    # Annotation mutations
    createAnnotation(input: CreateAnnotationInput!): Annotation!
    updateAnnotation(id: UUID!, input: JSON!): Annotation!
    deleteAnnotation(id: UUID!): Boolean!
    
    # Notification mutations
    markNotificationAsRead(id: UUID!): Boolean!
    markAllNotificationsAsRead: Boolean!
    deleteNotification(id: UUID!): Boolean!
    
    # Board mutations
    createBoard(input: JSON!): Board!
    updateBoard(id: UUID!, input: JSON!): Board!
    deleteBoard(id: UUID!): Boolean!
    addBoardMember(boardId: UUID!, userId: UUID!, role: String!): Boolean!
    removeBoardMember(boardId: UUID!, userId: UUID!): Boolean!
  }

  type Subscription {
    # Asset subscriptions
    assetStatusChanged(assetId: UUID): AssetStatusUpdate!
    assetShared(userId: UUID!): Asset!
    
    # Notification subscriptions
    notificationReceived(userId: UUID!): NewNotification!
    
    # Annotation subscriptions
    annotationUpdated(assetId: UUID!): AnnotationUpdate!
    
    # Meeting subscriptions
    meetingScheduled(organizationId: UUID!): Meeting!
    meetingUpdated(meetingId: UUID!): Meeting!
    
    # Real-time collaboration
    documentCollaboration(assetId: UUID!): JSON!
    vaultActivity(vaultId: UUID!): JSON!
  }
`