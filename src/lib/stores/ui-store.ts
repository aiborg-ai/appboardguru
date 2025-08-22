import { createStore, createSelectors } from './store-config'
import { ModalState, ToastMessage, LoadingState, StoreSlice } from './types'
import { v4 as uuidv4 } from 'uuid'

// Theme types
export type Theme = 'light' | 'dark' | 'system'
export type ColorScheme = 'blue' | 'green' | 'purple' | 'orange' | 'red'

// Sidebar types
export interface SidebarState {
  isOpen: boolean
  isPinned: boolean
  width: number
  collapsed: boolean
}

// Loading overlay types
export interface LoadingOverlay {
  id: string
  message: string
  progress?: number
  cancellable?: boolean
  onCancel?: () => void
}

// Command palette types
export interface CommandPaletteState {
  isOpen: boolean
  query: string
  selectedIndex: number
  results: CommandResult[]
}

export interface CommandResult {
  id: string
  title: string
  description?: string
  icon?: string
  category: string
  action: () => void
  shortcut?: string
}

// Breadcrumb types
export interface BreadcrumbItem {
  id: string
  label: string
  href?: string
  icon?: string
}

// UI store state
export interface UIState extends StoreSlice {
  // Theme
  theme: Theme
  colorScheme: ColorScheme
  reducedMotion: boolean
  highContrast: boolean
  
  // Layout
  sidebar: SidebarState
  breadcrumbs: BreadcrumbItem[]
  
  // Modals
  modals: ModalState
  
  // Toasts
  toasts: ToastMessage[]
  
  // Loading states
  loading: LoadingState
  loadingOverlays: LoadingOverlay[]
  
  // Command palette
  commandPalette: CommandPaletteState
  
  // Responsive
  screenSize: 'mobile' | 'tablet' | 'desktop' | 'wide'
  isMobile: boolean
  
  // Keyboard navigation
  keyboardNavigationEnabled: boolean
  
  // Actions - Theme
  setTheme: (theme: Theme) => void
  setColorScheme: (scheme: ColorScheme) => void
  toggleTheme: () => void
  setReducedMotion: (enabled: boolean) => void
  setHighContrast: (enabled: boolean) => void
  
  // Actions - Layout
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarPinned: (pinned: boolean) => void
  setSidebarWidth: (width: number) => void
  collapseSidebar: (collapsed: boolean) => void
  setBreadcrumbs: (items: BreadcrumbItem[]) => void
  
  // Actions - Modals
  openModal: (key: string, data?: any, step?: number) => void
  closeModal: (key: string) => void
  setModalData: (key: string, data: any) => void
  setModalStep: (key: string, step: number) => void
  closeAllModals: () => void
  
  // Actions - Toasts
  showToast: (toast: Omit<ToastMessage, 'id'>) => string
  dismissToast: (id: string) => void
  dismissAllToasts: () => void
  
  // Actions - Loading
  setLoading: (key: string, loading: boolean) => void
  showLoadingOverlay: (message: string, options?: { progress?: number; cancellable?: boolean; onCancel?: () => void }) => string
  updateLoadingOverlay: (id: string, updates: Partial<LoadingOverlay>) => void
  hideLoadingOverlay: (id: string) => void
  hideAllLoadingOverlays: () => void
  
  // Actions - Command Palette
  openCommandPalette: () => void
  closeCommandPalette: () => void
  setCommandPaletteQuery: (query: string) => void
  setCommandPaletteResults: (results: CommandResult[]) => void
  setCommandPaletteSelectedIndex: (index: number) => void
  executeSelectedCommand: () => void
  
  // Actions - Responsive
  setScreenSize: (size: 'mobile' | 'tablet' | 'desktop' | 'wide') => void
  
  // Actions - Keyboard
  setKeyboardNavigationEnabled: (enabled: boolean) => void
  
  // Actions - Utilities
  reset: () => void
}

// Default sidebar state
const defaultSidebarState: SidebarState = {
  isOpen: true,
  isPinned: false,
  width: 280,
  collapsed: false
}

// Default command palette state
const defaultCommandPaletteState: CommandPaletteState = {
  isOpen: false,
  query: '',
  selectedIndex: 0,
  results: []
}

// Detect system preferences
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const getSystemReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const getSystemHighContrast = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-contrast: high)').matches
}

const getScreenSize = (): 'mobile' | 'tablet' | 'desktop' | 'wide' => {
  if (typeof window === 'undefined') return 'desktop'
  const width = window.innerWidth
  if (width < 640) return 'mobile'
  if (width < 1024) return 'tablet'
  if (width < 1920) return 'desktop'
  return 'wide'
}

// Create the UI store
export const uiStore = createStore<UIState>(
  (set, get) => ({
    // Initial state
    theme: 'system',
    colorScheme: 'blue',
    reducedMotion: getSystemReducedMotion(),
    highContrast: getSystemHighContrast(),
    sidebar: defaultSidebarState,
    breadcrumbs: [],
    modals: {},
    toasts: [],
    loading: {},
    loadingOverlays: [],
    commandPalette: defaultCommandPaletteState,
    screenSize: getScreenSize(),
    isMobile: getScreenSize() === 'mobile',
    keyboardNavigationEnabled: false,

    // Theme actions
    setTheme: (theme: Theme) => {
      set(draft => {
        draft.theme = theme
      })

      // Apply theme to document
      const root = document.documentElement
      if (theme === 'system') {
        const systemTheme = getSystemTheme()
        root.setAttribute('data-theme', systemTheme)
        root.classList.remove('light', 'dark')
        root.classList.add(systemTheme)
      } else {
        root.setAttribute('data-theme', theme)
        root.classList.remove('light', 'dark')
        root.classList.add(theme)
      }
    },

    setColorScheme: (scheme: ColorScheme) => {
      set(draft => {
        draft.colorScheme = scheme
      })

      // Apply color scheme to document
      document.documentElement.setAttribute('data-color-scheme', scheme)
    },

    toggleTheme: () => {
      const currentTheme = get().theme
      const systemTheme = getSystemTheme()
      
      if (currentTheme === 'system') {
        get().setTheme(systemTheme === 'light' ? 'dark' : 'light')
      } else if (currentTheme === 'light') {
        get().setTheme('dark')
      } else {
        get().setTheme('light')
      }
    },

    setReducedMotion: (enabled: boolean) => {
      set(draft => {
        draft.reducedMotion = enabled
      })

      document.documentElement.classList.toggle('reduce-motion', enabled)
    },

    setHighContrast: (enabled: boolean) => {
      set(draft => {
        draft.highContrast = enabled
      })

      document.documentElement.classList.toggle('high-contrast', enabled)
    },

    // Layout actions
    toggleSidebar: () => {
      set(draft => {
        draft.sidebar.isOpen = !draft.sidebar.isOpen
      })
    },

    setSidebarOpen: (open: boolean) => {
      set(draft => {
        draft.sidebar.isOpen = open
      })
    },

    setSidebarPinned: (pinned: boolean) => {
      set(draft => {
        draft.sidebar.isPinned = pinned
      })
    },

    setSidebarWidth: (width: number) => {
      set(draft => {
        draft.sidebar.width = Math.max(200, Math.min(500, width))
      })
    },

    collapseSidebar: (collapsed: boolean) => {
      set(draft => {
        draft.sidebar.collapsed = collapsed
      })
    },

    setBreadcrumbs: (items: BreadcrumbItem[]) => {
      set(draft => {
        draft.breadcrumbs = items
      })
    },

    // Modal actions
    openModal: (key: string, data?: any, step = 0) => {
      set(draft => {
        draft.modals[key] = {
          isOpen: true,
          data,
          step
        }
      })

      // Prevent body scroll
      document.body.classList.add('modal-open')
    },

    closeModal: (key: string) => {
      set(draft => {
        if (draft.modals[key]) {
          draft.modals[key].isOpen = false
        }
      })

      // Check if any modals are still open
      const hasOpenModals = Object.values(get().modals).some(modal => modal.isOpen)
      if (!hasOpenModals) {
        document.body.classList.remove('modal-open')
      }
    },

    setModalData: (key: string, data: any) => {
      set(draft => {
        if (draft.modals[key]) {
          draft.modals[key].data = data
        }
      })
    },

    setModalStep: (key: string, step: number) => {
      set(draft => {
        if (draft.modals[key]) {
          draft.modals[key].step = step
        }
      })
    },

    closeAllModals: () => {
      set(draft => {
        Object.keys(draft.modals).forEach(key => {
          draft.modals[key].isOpen = false
        })
      })

      document.body.classList.remove('modal-open')
    },

    // Toast actions
    showToast: (toast: Omit<ToastMessage, 'id'>) => {
      const id = uuidv4()
      const newToast: ToastMessage = {
        ...toast,
        id,
        duration: toast.duration || 5000
      }

      set(draft => {
        draft.toasts.unshift(newToast)
        
        // Limit to 5 toasts
        if (draft.toasts.length > 5) {
          draft.toasts = draft.toasts.slice(0, 5)
        }
      })

      // Auto dismiss
      if (newToast.duration > 0) {
        setTimeout(() => {
          get().dismissToast(id)
        }, newToast.duration)
      }

      return id
    },

    dismissToast: (id: string) => {
      set(draft => {
        draft.toasts = draft.toasts.filter(toast => toast.id !== id)
      })
    },

    dismissAllToasts: () => {
      set(draft => {
        draft.toasts = []
      })
    },

    // Loading actions
    setLoading: (key: string, loading: boolean) => {
      set(draft => {
        if (loading) {
          draft.loading[key] = true
        } else {
          delete draft.loading[key]
        }
      })
    },

    showLoadingOverlay: (message: string, options = {}) => {
      const id = uuidv4()
      const overlay: LoadingOverlay = {
        id,
        message,
        ...options
      }

      set(draft => {
        draft.loadingOverlays.push(overlay)
      })

      return id
    },

    updateLoadingOverlay: (id: string, updates: Partial<LoadingOverlay>) => {
      set(draft => {
        const index = draft.loadingOverlays.findIndex(overlay => overlay.id === id)
        if (index >= 0) {
          draft.loadingOverlays[index] = { ...draft.loadingOverlays[index], ...updates }
        }
      })
    },

    hideLoadingOverlay: (id: string) => {
      set(draft => {
        draft.loadingOverlays = draft.loadingOverlays.filter(overlay => overlay.id !== id)
      })
    },

    hideAllLoadingOverlays: () => {
      set(draft => {
        draft.loadingOverlays = []
      })
    },

    // Command palette actions
    openCommandPalette: () => {
      set(draft => {
        draft.commandPalette.isOpen = true
        draft.commandPalette.query = ''
        draft.commandPalette.selectedIndex = 0
        draft.commandPalette.results = []
      })
    },

    closeCommandPalette: () => {
      set(draft => {
        draft.commandPalette.isOpen = false
        draft.commandPalette.query = ''
        draft.commandPalette.selectedIndex = 0
        draft.commandPalette.results = []
      })
    },

    setCommandPaletteQuery: (query: string) => {
      set(draft => {
        draft.commandPalette.query = query
        draft.commandPalette.selectedIndex = 0
      })
    },

    setCommandPaletteResults: (results: CommandResult[]) => {
      set(draft => {
        draft.commandPalette.results = results
        draft.commandPalette.selectedIndex = 0
      })
    },

    setCommandPaletteSelectedIndex: (index: number) => {
      const maxIndex = get().commandPalette.results.length - 1
      set(draft => {
        draft.commandPalette.selectedIndex = Math.max(0, Math.min(maxIndex, index))
      })
    },

    executeSelectedCommand: () => {
      const { results, selectedIndex } = get().commandPalette
      const selectedCommand = results[selectedIndex]
      
      if (selectedCommand) {
        selectedCommand.action()
        get().closeCommandPalette()
      }
    },

    // Responsive actions
    setScreenSize: (size: 'mobile' | 'tablet' | 'desktop' | 'wide') => {
      set(draft => {
        draft.screenSize = size
        draft.isMobile = size === 'mobile'
        
        // Auto-collapse sidebar on mobile
        if (size === 'mobile') {
          draft.sidebar.isOpen = false
        }
      })
    },

    // Keyboard actions
    setKeyboardNavigationEnabled: (enabled: boolean) => {
      set(draft => {
        draft.keyboardNavigationEnabled = enabled
      })

      document.documentElement.classList.toggle('keyboard-navigation', enabled)
    },

    // Reset
    reset: () => {
      set(draft => {
        draft.theme = 'system'
        draft.colorScheme = 'blue'
        draft.reducedMotion = getSystemReducedMotion()
        draft.highContrast = getSystemHighContrast()
        draft.sidebar = defaultSidebarState
        draft.breadcrumbs = []
        draft.modals = {}
        draft.toasts = []
        draft.loading = {}
        draft.loadingOverlays = []
        draft.commandPalette = defaultCommandPaletteState
        draft.screenSize = getScreenSize()
        draft.isMobile = getScreenSize() === 'mobile'
        draft.keyboardNavigationEnabled = false
      })

      // Reset document classes
      document.body.classList.remove('modal-open')
      document.documentElement.classList.remove('reduce-motion', 'high-contrast', 'keyboard-navigation')
    },

    _meta: {
      version: 1,
      lastUpdated: Date.now(),
      hydrated: false
    }
  }),
  {
    name: 'ui',
    version: 1,
    partialize: (state) => ({
      theme: state.theme,
      colorScheme: state.colorScheme,
      reducedMotion: state.reducedMotion,
      highContrast: state.highContrast,
      sidebar: state.sidebar,
      keyboardNavigationEnabled: state.keyboardNavigationEnabled,
      _meta: state._meta
    })
  }
)

// Create selectors
export const uiSelectors = createSelectors(uiStore)

// Utility hooks
export const useTheme = () => uiStore(state => state.theme)
export const useColorScheme = () => uiStore(state => state.colorScheme)
export const useSidebar = () => uiStore(state => state.sidebar)
export const useBreadcrumbs = () => uiStore(state => state.breadcrumbs)
export const useModals = () => uiStore(state => state.modals)
export const useToasts = () => uiStore(state => state.toasts)
export const useUILoading = () => uiStore(state => state.loading)
export const useLoadingOverlays = () => uiStore(state => state.loadingOverlays)
export const useCommandPalette = () => uiStore(state => state.commandPalette)
export const useScreenSize = () => uiStore(state => state.screenSize)
export const useIsMobile = () => uiStore(state => state.isMobile)

// Initialize UI store
if (typeof window !== 'undefined') {
  // Initialize theme
  const initialState = uiStore.getState()
  initialState.setTheme(initialState.theme)
  initialState.setColorScheme(initialState.colorScheme)
  initialState.setReducedMotion(initialState.reducedMotion)
  initialState.setHighContrast(initialState.highContrast)

  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', () => {
    if (uiStore.getState().theme === 'system') {
      uiStore.getState().setTheme('system')
    }
  })

  // Listen for reduced motion changes
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionQuery.addEventListener('change', (e) => {
    uiStore.getState().setReducedMotion(e.matches)
  })

  // Listen for high contrast changes
  const contrastQuery = window.matchMedia('(prefers-contrast: high)')
  contrastQuery.addEventListener('change', (e) => {
    uiStore.getState().setHighContrast(e.matches)
  })

  // Listen for screen size changes
  window.addEventListener('resize', () => {
    uiStore.getState().setScreenSize(getScreenSize())
  })

  // Listen for keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      uiStore.getState().setKeyboardNavigationEnabled(true)
    }
  })

  document.addEventListener('mousedown', () => {
    uiStore.getState().setKeyboardNavigationEnabled(false)
  })

  // Global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Command palette (Cmd/Ctrl + K)
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      uiStore.getState().openCommandPalette()
    }

    // Theme toggle (Cmd/Ctrl + Shift + T)
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'T') {
      e.preventDefault()
      uiStore.getState().toggleTheme()
    }

    // Sidebar toggle (Cmd/Ctrl + B)
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault()
      uiStore.getState().toggleSidebar()
    }
  })
}