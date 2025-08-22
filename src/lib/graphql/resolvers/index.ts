/**
 * GraphQL Resolvers
 * Main resolver index with authentication and authorization
 */

import { userResolvers } from './user.resolvers'
import { organizationResolvers } from './organization.resolvers'
import { assetResolvers } from './asset.resolvers'
import { vaultResolvers } from './vault.resolvers'
import { meetingResolvers } from './meeting.resolvers'
import { notificationResolvers } from './notification.resolvers'
import { analyticsResolvers } from './analytics.resolvers'
import { scalarResolvers } from './scalars.resolvers'
import { subscriptionResolvers } from './subscription.resolvers'
import { searchResolvers } from './search.resolvers'
import { authenticationRequired, authorize } from '../middleware/auth'
import { rateLimitResolver } from '../middleware/rate-limit'
import { GraphQLContext } from '../types'

/**
 * Combined resolvers with middleware applied
 */
export const resolvers = {
  ...scalarResolvers,
  
  Query: {
    // Health check - public
    healthCheck: () => ({ status: 'ok', timestamp: new Date().toISOString() }),
    
    // User queries
    me: authenticationRequired(userResolvers.Query.me),
    user: authenticationRequired(rateLimitResolver(userResolvers.Query.user)),
    users: authenticationRequired(authorize(['SUPER_ADMIN'])(rateLimitResolver(userResolvers.Query.users))),
    
    // Organization queries
    organization: authenticationRequired(rateLimitResolver(organizationResolvers.Query.organization)),
    organizationBySlug: authenticationRequired(rateLimitResolver(organizationResolvers.Query.organizationBySlug)),
    organizations: authenticationRequired(rateLimitResolver(organizationResolvers.Query.organizations)),
    
    // Asset queries
    asset: authenticationRequired(rateLimitResolver(assetResolvers.Query.asset)),
    assets: authenticationRequired(rateLimitResolver(assetResolvers.Query.assets)),
    assetsByVault: authenticationRequired(rateLimitResolver(assetResolvers.Query.assetsByVault)),
    searchAssets: authenticationRequired(rateLimitResolver(assetResolvers.Query.searchAssets)),
    
    // Vault queries
    vault: authenticationRequired(rateLimitResolver(vaultResolvers.Query.vault)),
    vaults: authenticationRequired(rateLimitResolver(vaultResolvers.Query.vaults)),
    
    // Meeting queries
    meeting: authenticationRequired(rateLimitResolver(meetingResolvers.Query.meeting)),
    meetings: authenticationRequired(rateLimitResolver(meetingResolvers.Query.meetings)),
    upcomingMeetings: authenticationRequired(rateLimitResolver(meetingResolvers.Query.upcomingMeetings)),
    
    // Notification queries
    notifications: authenticationRequired(rateLimitResolver(notificationResolvers.Query.notifications)),
    unreadNotificationCount: authenticationRequired(notificationResolvers.Query.unreadNotificationCount),
    
    // Analytics queries
    assetAnalytics: authenticationRequired(authorize(['ORG_ADMIN', 'SUPER_ADMIN'])(analyticsResolvers.Query.assetAnalytics)),
    organizationAnalytics: authenticationRequired(authorize(['ORG_ADMIN', 'SUPER_ADMIN'])(analyticsResolvers.Query.organizationAnalytics)),
    
    // Search queries
    globalSearch: authenticationRequired(rateLimitResolver(searchResolvers.Query.globalSearch)),
  },

  Mutation: {
    // User mutations
    updateProfile: authenticationRequired(rateLimitResolver(userResolvers.Mutation.updateProfile)),
    changePassword: authenticationRequired(rateLimitResolver(userResolvers.Mutation.changePassword)),
    
    // Organization mutations
    createOrganization: authenticationRequired(rateLimitResolver(organizationResolvers.Mutation.createOrganization)),
    updateOrganization: authenticationRequired(rateLimitResolver(organizationResolvers.Mutation.updateOrganization)),
    deleteOrganization: authenticationRequired(authorize(['ORG_ADMIN', 'SUPER_ADMIN'])(organizationResolvers.Mutation.deleteOrganization)),
    inviteToOrganization: authenticationRequired(rateLimitResolver(organizationResolvers.Mutation.inviteToOrganization)),
    
    // Asset mutations
    createAsset: authenticationRequired(rateLimitResolver(assetResolvers.Mutation.createAsset)),
    updateAsset: authenticationRequired(rateLimitResolver(assetResolvers.Mutation.updateAsset)),
    deleteAsset: authenticationRequired(rateLimitResolver(assetResolvers.Mutation.deleteAsset)),
    shareAsset: authenticationRequired(rateLimitResolver(assetResolvers.Mutation.shareAsset)),
    addAssetToVault: authenticationRequired(rateLimitResolver(assetResolvers.Mutation.addAssetToVault)),
    removeAssetFromVault: authenticationRequired(rateLimitResolver(assetResolvers.Mutation.removeAssetFromVault)),
    
    // Vault mutations
    createVault: authenticationRequired(rateLimitResolver(vaultResolvers.Mutation.createVault)),
    updateVault: authenticationRequired(rateLimitResolver(vaultResolvers.Mutation.updateVault)),
    deleteVault: authenticationRequired(rateLimitResolver(vaultResolvers.Mutation.deleteVault)),
    inviteToVault: authenticationRequired(rateLimitResolver(vaultResolvers.Mutation.inviteToVault)),
    
    // Meeting mutations
    createMeeting: authenticationRequired(rateLimitResolver(meetingResolvers.Mutation.createMeeting)),
    updateMeeting: authenticationRequired(rateLimitResolver(meetingResolvers.Mutation.updateMeeting)),
    deleteMeeting: authenticationRequired(rateLimitResolver(meetingResolvers.Mutation.deleteMeeting)),
    
    // Notification mutations
    markNotificationAsRead: authenticationRequired(notificationResolvers.Mutation.markNotificationAsRead),
    markAllNotificationsAsRead: authenticationRequired(notificationResolvers.Mutation.markAllNotificationsAsRead),
    deleteNotification: authenticationRequired(notificationResolvers.Mutation.deleteNotification),
  },

  Subscription: {
    // All subscriptions require authentication
    assetStatusChanged: authenticationRequired(subscriptionResolvers.Subscription.assetStatusChanged),
    assetShared: authenticationRequired(subscriptionResolvers.Subscription.assetShared),
    notificationReceived: authenticationRequired(subscriptionResolvers.Subscription.notificationReceived),
    annotationUpdated: authenticationRequired(subscriptionResolvers.Subscription.annotationUpdated),
    meetingScheduled: authenticationRequired(subscriptionResolvers.Subscription.meetingScheduled),
    meetingUpdated: authenticationRequired(subscriptionResolvers.Subscription.meetingUpdated),
    documentCollaboration: authenticationRequired(subscriptionResolvers.Subscription.documentCollaboration),
    vaultActivity: authenticationRequired(subscriptionResolvers.Subscription.vaultActivity),
  },

  // Type resolvers for relationships
  User: userResolvers.User,
  Organization: organizationResolvers.Organization,
  Asset: assetResolvers.Asset,
  Vault: vaultResolvers.Vault,
  Meeting: meetingResolvers.Meeting,
  Notification: notificationResolvers.Notification,
  
  // Additional type resolvers
  AssetConnection: assetResolvers.AssetConnection,
  AssetEdge: assetResolvers.AssetEdge,
  PageInfo: assetResolvers.PageInfo,
}

export default resolvers