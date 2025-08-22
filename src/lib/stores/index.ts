// Export all stores
export { authStore, authSelectors, useAuth, useUser, useIsAuthenticated, useAuthLoading, useProfile, usePreferences } from './auth-store'
export { organizationStore, organizationSelectors, useOrganizations, useCurrentOrganization, useOrganizationMembers, useOrganizationInvitations, useOrganizationSettings, useOrganizationLoading, useOrganizationErrors } from './organization-store'
export { assetStore, assetSelectors, useAssets, useCurrentAsset, useAssetUploads, useAssetShares, useAssetAnnotations, useAssetVersions, useAssetLoading, useAssetErrors, useAssetSelection, useAssetViewMode } from './asset-store'
export { vaultStore, vaultSelectors, useVaults, useCurrentVault, useVaultInvitations, useVaultLoading, useVaultErrors, useVaultSelection } from './vault-store'
export { notificationStore, notificationSelectors, useNotifications, useNotificationCounts, useNotificationPreferences, useNotificationLoading, useNotificationErrors, useNotificationSelection, useNotificationConnection } from './notification-store'
export { uiStore, uiSelectors, useTheme, useColorScheme, useSidebar, useBreadcrumbs, useModals, useToasts, useUILoading, useLoadingOverlays, useCommandPalette, useScreenSize, useIsMobile } from './ui-store'
export { documentStore, documentSelectors, useCurrentDocument, useDocumentAnnotations, useDocumentToc, useDocumentSummaries, useDocumentPodcast, useDocumentSearch, useDocumentViewSettings, useDocumentCollaborators, useDocumentChatHistory, useDocumentLoading, useDocumentErrors, useDocumentActions } from './document-store'

// Export store utilities
export { stores, optimisticUpdates, offlineSync, cacheManager, storeLogger, resetAllStores, waitForStoreHydration, monitorStorePerformance, useStoreSelector, batchStoreUpdates, handleStoreError, initializeStores } from './store-utils'

// Export store configuration utilities
export { createStore, createSelectors, trackStorePerformance, createMigrations, excludeSensitiveData, debugStore, batchActions, waitForHydration, subscribeToStore } from './store-config'

// Export types
export type * from './types'

// Export store interfaces
export type { AuthState } from './auth-store'
export type { OrganizationState } from './organization-store'
export type { AssetState } from './asset-store'
export type { VaultState } from './vault-store'
export type { NotificationState } from './notification-store'
export type { UIState } from './ui-store'
export type { DocumentState, DocumentCollaborator, DocumentViewSettings, DocumentAIChat } from './document-store'

// Export data interfaces
export type { CreateOrganizationData, UpdateOrganizationData, OrganizationInvitation, OrganizationMember, OrganizationSettings } from './organization-store'
export type { CreateAssetData, UpdateAssetData, AssetUpload, AssetShare, AssetAnnotation, AssetVersion, CreateShareData, UpdateShareData, CreateAnnotationData, UpdateAnnotationData } from './asset-store'
export type { CreateVaultData, UpdateVaultData } from './vault-store'
export type { NotificationPreferences, NotificationCounts } from './notification-store'
export type { Theme, ColorScheme, SidebarState, LoadingOverlay, CommandPaletteState, CommandResult, BreadcrumbItem } from './ui-store'

// Store type registry
export type StoreRegistry = {
  auth: typeof authStore
  organization: typeof organizationStore
  asset: typeof assetStore
  vault: typeof vaultStore
  notification: typeof notificationStore
  ui: typeof uiStore
  document: typeof documentStore
}

// Global store state type
export type GlobalState = {
  auth: ReturnType<typeof authStore.getState>
  organization: ReturnType<typeof organizationStore.getState>
  asset: ReturnType<typeof assetStore.getState>
  vault: ReturnType<typeof vaultStore.getState>
  notification: ReturnType<typeof notificationStore.getState>
  ui: ReturnType<typeof uiStore.getState>
  document: ReturnType<typeof documentStore.getState>
}

// Utility type for store names
export type StoreNames = keyof StoreRegistry

// Re-export Zustand types for convenience
export type { StateCreator, StoreMutatorIdentifier } from 'zustand'