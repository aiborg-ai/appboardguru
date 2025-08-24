import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface RecentItem {
  id: string
  type: 'asset' | 'organization' | 'meeting' | 'vault' | 'user'
  title: string
  subtitle: string
  href: string
  timestamp: string
  metadata?: Record<string, any>
}

interface Bookmark {
  id: string
  type: 'asset' | 'organization' | 'meeting' | 'vault' | 'search'
  title: string
  href: string
  description?: string
  icon?: string
  createdAt: string
  tags?: string[]
}

interface CrossPageContext {
  sourcePageType?: 'organizations' | 'assets' | 'meetings' | 'vaults' | 'search'
  sourcePageId?: string
  referrerData?: Record<string, any>
  navigationPath: string[]
  searchContext?: {
    query: string
    filters: Record<string, any>
    selectedResults?: string[]
  }
}

interface ActivityItem {
  id: string
  type: 'view' | 'edit' | 'create' | 'share' | 'download' | 'search'
  entityType: 'asset' | 'organization' | 'meeting' | 'vault' | 'user'
  entityId: string
  entityTitle: string
  description: string
  timestamp: string
  metadata?: Record<string, any>
}

interface IntegrationState {
  // Recent items tracking
  recentItems: RecentItem[]
  maxRecentItems: number
  
  // Bookmarks system
  bookmarks: Bookmark[]
  
  // Cross-page context preservation
  currentContext: CrossPageContext
  
  // Activity tracking
  activities: ActivityItem[]
  maxActivities: number
  
  // Cross-page data sharing
  sharedData: Record<string, any>
  
  // Navigation state
  breadcrumbs: Array<{ label: string; href?: string; icon?: string }>
  
  // Search state
  globalSearchHistory: string[]
  maxSearchHistory: number
  
  // UI state
  isNavigating: boolean
  lastVisitedPages: Record<string, string> // pageType -> lastVisitedId
}

interface IntegrationActions {
  // Recent items
  addRecentItem: (item: Omit<RecentItem, 'timestamp'>) => void
  removeRecentItem: (id: string) => void
  clearRecentItems: () => void
  getRecentItemsByType: (type: RecentItem['type']) => RecentItem[]
  
  // Bookmarks
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void
  removeBookmark: (id: string) => void
  toggleBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void
  getBookmarksByType: (type: Bookmark['type']) => Bookmark[]
  isBookmarked: (href: string) => boolean
  
  // Context management
  setContext: (context: Partial<CrossPageContext>) => void
  clearContext: () => void
  updateNavigationPath: (page: string) => void
  
  // Activity tracking
  trackActivity: (activity: Omit<ActivityItem, 'id' | 'timestamp'>) => void
  getActivitiesByType: (entityType: ActivityItem['entityType']) => ActivityItem[]
  getRecentActivities: (limit?: number) => ActivityItem[]
  clearActivities: () => void
  
  // Shared data
  setSharedData: (key: string, data: any) => void
  getSharedData: (key: string) => any
  removeSharedData: (key: string) => void
  clearSharedData: () => void
  
  // Search
  addSearchQuery: (query: string) => void
  getSearchHistory: () => string[]
  clearSearchHistory: () => void
  
  // Navigation
  setBreadcrumbs: (breadcrumbs: IntegrationState['breadcrumbs']) => void
  setNavigating: (isNavigating: boolean) => void
  setLastVisitedPage: (pageType: string, pageId: string) => void
  getLastVisitedPage: (pageType: string) => string | undefined
}

type IntegrationStore = IntegrationState & IntegrationActions

const initialState: IntegrationState = {
  recentItems: [],
  maxRecentItems: 20,
  bookmarks: [],
  currentContext: {
    navigationPath: []
  },
  activities: [],
  maxActivities: 100,
  sharedData: {},
  breadcrumbs: [],
  globalSearchHistory: [],
  maxSearchHistory: 10,
  isNavigating: false,
  lastVisitedPages: {}
}

export const integrationStore = create<IntegrationStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,

          // Recent items
          addRecentItem: (item) => set((state) => {
            const newItem: RecentItem = {
              ...item,
              timestamp: new Date().toISOString()
            }
            
            // Remove existing item with same id if exists
            state.recentItems = state.recentItems.filter(i => i.id !== item.id)
            
            // Add to beginning
            state.recentItems.unshift(newItem)
            
            // Limit to max items
            if (state.recentItems.length > state.maxRecentItems) {
              state.recentItems = state.recentItems.slice(0, state.maxRecentItems)
            }
          }),

          removeRecentItem: (id) => set((state) => {
            state.recentItems = state.recentItems.filter(item => item.id !== id)
          }),

          clearRecentItems: () => set((state) => {
            state.recentItems = []
          }),

          getRecentItemsByType: (type) => {
            return get().recentItems.filter(item => item.type === type)
          },

          // Bookmarks
          addBookmark: (bookmark) => set((state) => {
            const newBookmark: Bookmark = {
              ...bookmark,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString()
            }
            
            // Check if bookmark already exists
            const exists = state.bookmarks.some(b => b.href === bookmark.href)
            if (!exists) {
              state.bookmarks.unshift(newBookmark)
            }
          }),

          removeBookmark: (id) => set((state) => {
            state.bookmarks = state.bookmarks.filter(bookmark => bookmark.id !== id)
          }),

          toggleBookmark: (bookmark) => {
            const state = get()
            const existing = state.bookmarks.find(b => b.href === bookmark.href)
            
            if (existing) {
              state.removeBookmark(existing.id)
            } else {
              state.addBookmark(bookmark)
            }
          },

          getBookmarksByType: (type) => {
            return get().bookmarks.filter(bookmark => bookmark.type === type)
          },

          isBookmarked: (href) => {
            return get().bookmarks.some(bookmark => bookmark.href === href)
          },

          // Context management
          setContext: (context) => set((state) => {
            state.currentContext = { ...state.currentContext, ...context }
          }),

          clearContext: () => set((state) => {
            state.currentContext = { navigationPath: [] }
          }),

          updateNavigationPath: (page) => set((state) => {
            state.currentContext.navigationPath.push(page)
            
            // Limit navigation path to last 10 items
            if (state.currentContext.navigationPath.length > 10) {
              state.currentContext.navigationPath = state.currentContext.navigationPath.slice(-10)
            }
          }),

          // Activity tracking
          trackActivity: (activity) => set((state) => {
            const newActivity: ActivityItem = {
              ...activity,
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString()
            }
            
            state.activities.unshift(newActivity)
            
            // Limit to max activities
            if (state.activities.length > state.maxActivities) {
              state.activities = state.activities.slice(0, state.maxActivities)
            }
            
            // Also add to recent items if it's a view action
            if (activity.type === 'view') {
              const recentItem: Omit<RecentItem, 'timestamp'> = {
                id: activity.entityId,
                type: activity.entityType,
                title: activity.entityTitle,
                subtitle: activity.description,
                href: `/dashboard/${activity.entityType}s/${activity.entityId}`,
                metadata: activity.metadata
              }
              
              get().addRecentItem(recentItem)
            }
          }),

          getActivitiesByType: (entityType) => {
            return get().activities.filter(activity => activity.entityType === entityType)
          },

          getRecentActivities: (limit = 10) => {
            return get().activities.slice(0, limit)
          },

          clearActivities: () => set((state) => {
            state.activities = []
          }),

          // Shared data
          setSharedData: (key, data) => set((state) => {
            state.sharedData[key] = data
          }),

          getSharedData: (key) => {
            return get().sharedData[key]
          },

          removeSharedData: (key) => set((state) => {
            delete state.sharedData[key]
          }),

          clearSharedData: () => set((state) => {
            state.sharedData = {}
          }),

          // Search
          addSearchQuery: (query) => set((state) => {
            if (query.trim()) {
              // Remove existing query if exists
              state.globalSearchHistory = state.globalSearchHistory.filter(q => q !== query)
              
              // Add to beginning
              state.globalSearchHistory.unshift(query)
              
              // Limit to max history
              if (state.globalSearchHistory.length > state.maxSearchHistory) {
                state.globalSearchHistory = state.globalSearchHistory.slice(0, state.maxSearchHistory)
              }
            }
          }),

          getSearchHistory: () => {
            return get().globalSearchHistory
          },

          clearSearchHistory: () => set((state) => {
            state.globalSearchHistory = []
          }),

          // Navigation
          setBreadcrumbs: (breadcrumbs) => set((state) => {
            state.breadcrumbs = breadcrumbs
          }),

          setNavigating: (isNavigating) => set((state) => {
            state.isNavigating = isNavigating
          }),

          setLastVisitedPage: (pageType, pageId) => set((state) => {
            state.lastVisitedPages[pageType] = pageId
          }),

          getLastVisitedPage: (pageType) => {
            return get().lastVisitedPages[pageType]
          }
        }))
      ),
      {
        name: 'integration-store',
        partialize: (state) => ({
          recentItems: state.recentItems,
          bookmarks: state.bookmarks,
          activities: state.activities.slice(0, 50), // Only persist recent activities
          globalSearchHistory: state.globalSearchHistory,
          lastVisitedPages: state.lastVisitedPages
        })
      }
    ),
    { name: 'IntegrationStore' }
  )
)

// Selectors
export const integrationSelectors = {
  recentItems: (state: IntegrationStore) => state.recentItems,
  bookmarks: (state: IntegrationStore) => state.bookmarks,
  currentContext: (state: IntegrationStore) => state.currentContext,
  activities: (state: IntegrationStore) => state.activities,
  searchHistory: (state: IntegrationStore) => state.globalSearchHistory,
  isNavigating: (state: IntegrationStore) => state.isNavigating
}

// React hooks
export const useRecentItems = () => integrationStore(integrationSelectors.recentItems)
export const useBookmarks = () => integrationStore(integrationSelectors.bookmarks)
export const useCurrentContext = () => integrationStore(integrationSelectors.currentContext)
export const useActivities = () => integrationStore(integrationSelectors.activities)
export const useSearchHistory = () => integrationStore(integrationSelectors.searchHistory)
export const useIsNavigating = () => integrationStore(integrationSelectors.isNavigating)

// Utility hooks
export const useIntegrationActions = () => {
  return {
    addRecentItem: integrationStore(state => state.addRecentItem),
    addBookmark: integrationStore(state => state.addBookmark),
    toggleBookmark: integrationStore(state => state.toggleBookmark),
    trackActivity: integrationStore(state => state.trackActivity),
    setSharedData: integrationStore(state => state.setSharedData),
    getSharedData: integrationStore(state => state.getSharedData),
    addSearchQuery: integrationStore(state => state.addSearchQuery),
    setContext: integrationStore(state => state.setContext),
    updateNavigationPath: integrationStore(state => state.updateNavigationPath)
  }
}

// Subscribe to store changes for cross-page synchronization
integrationStore.subscribe(
  (state) => state.currentContext,
  (context) => {
    // Emit custom events for cross-page communication
    window.dispatchEvent(new CustomEvent('contextChanged', { 
      detail: context 
    }))
  }
)

integrationStore.subscribe(
  (state) => state.recentItems,
  (recentItems) => {
    // Emit custom events for recent items updates
    window.dispatchEvent(new CustomEvent('recentItemsChanged', { 
      detail: recentItems 
    }))
  }
)