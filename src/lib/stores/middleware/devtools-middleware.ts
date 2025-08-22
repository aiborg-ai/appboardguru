import { StateCreator } from 'zustand'
import { devtools as zustandDevtools } from 'zustand/middleware'

// Enhanced devtools configuration
export interface EnhancedDevtoolsOptions {
  enabled?: boolean
  name?: string
  serialize?: {
    options?: boolean | {
      date?: boolean
      regex?: boolean
      undefined?: boolean
      error?: boolean
      symbol?: boolean
      map?: boolean
      set?: boolean
      function?: boolean
    }
    replacer?: (key: string, value: any) => any
    reviver?: (key: string, value: any) => any
  }
  actionCreators?: {
    [key: string]: (...args: any[]) => any
  }
  actionSanitizer?: (action: any, id: number) => any
  stateSanitizer?: (state: any, index: number) => any
  predicate?: (state: any, action: any) => boolean
  trace?: boolean | (() => string)
  traceLimit?: number
  features?: {
    pause?: boolean
    lock?: boolean
    persist?: boolean
    export?: boolean
    import?: boolean | 'custom'
    jump?: boolean
    skip?: boolean
    reorder?: boolean
    dispatch?: boolean
    test?: boolean
  }
  timeTravel?: {
    enabled: boolean
    maxSnapshots?: number
    autoSave?: boolean
    saveInterval?: number
  }
  actionLogging?: {
    enabled: boolean
    logLevel?: 'debug' | 'info' | 'warn' | 'error'
    includeState?: boolean
    includeTimestamp?: boolean
  }
}

// Time travel snapshot
export interface TimeSnapshot<T> {
  id: string
  timestamp: number
  state: T
  action: string
  metadata?: Record<string, any>
}

// Time travel manager
class TimeTravelManager<T> {
  private snapshots: TimeSnapshot<T>[] = []
  private currentIndex: number = -1
  private maxSnapshots: number
  private autoSave: boolean
  private saveInterval: number
  private saveTimer?: NodeJS.Timeout

  constructor(options: NonNullable<EnhancedDevtoolsOptions['timeTravel']>) {
    this.maxSnapshots = options.maxSnapshots || 50
    this.autoSave = options.autoSave || true
    this.saveInterval = options.saveInterval || 5000

    if (this.autoSave) {
      this.startAutoSave()
    }
  }

  addSnapshot(state: T, action: string, metadata?: Record<string, any>): void {
    const snapshot: TimeSnapshot<T> = {
      id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(state)), // Deep clone
      action,
      metadata
    }

    // Remove snapshots after current index if we're not at the end
    if (this.currentIndex < this.snapshots.length - 1) {
      this.snapshots = this.snapshots.slice(0, this.currentIndex + 1)
    }

    this.snapshots.push(snapshot)
    this.currentIndex = this.snapshots.length - 1

    // Limit snapshot count
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots)
      this.currentIndex = this.snapshots.length - 1
    }

    console.log(`[TimeTravel] Added snapshot ${snapshot.id} for action: ${action}`)
  }

  goToSnapshot(index: number): TimeSnapshot<T> | null {
    if (index >= 0 && index < this.snapshots.length) {
      this.currentIndex = index
      const snapshot = this.snapshots[index]
      console.log(`[TimeTravel] Jumped to snapshot ${snapshot.id}`)
      return snapshot
    }
    return null
  }

  goBack(): TimeSnapshot<T> | null {
    if (this.currentIndex > 0) {
      return this.goToSnapshot(this.currentIndex - 1)
    }
    return null
  }

  goForward(): TimeSnapshot<T> | null {
    if (this.currentIndex < this.snapshots.length - 1) {
      return this.goToSnapshot(this.currentIndex + 1)
    }
    return null
  }

  getSnapshots(): TimeSnapshot<T>[] {
    return [...this.snapshots]
  }

  getCurrentSnapshot(): TimeSnapshot<T> | null {
    return this.snapshots[this.currentIndex] || null
  }

  clearSnapshots(): void {
    this.snapshots = []
    this.currentIndex = -1
    console.log('[TimeTravel] Cleared all snapshots')
  }

  exportSnapshots(): string {
    return JSON.stringify({
      snapshots: this.snapshots,
      currentIndex: this.currentIndex,
      exportedAt: new Date().toISOString()
    }, null, 2)
  }

  importSnapshots(data: string): boolean {
    try {
      const parsed = JSON.parse(data)
      if (parsed.snapshots && Array.isArray(parsed.snapshots)) {
        this.snapshots = parsed.snapshots
        this.currentIndex = parsed.currentIndex || this.snapshots.length - 1
        console.log(`[TimeTravel] Imported ${this.snapshots.length} snapshots`)
        return true
      }
    } catch (error) {
      console.error('[TimeTravel] Failed to import snapshots:', error)
    }
    return false
  }

  private startAutoSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer)
    }

    this.saveTimer = setInterval(() => {
      if (this.snapshots.length > 0 && typeof window !== 'undefined') {
        try {
          const data = this.exportSnapshots()
          localStorage.setItem('zustand-time-travel', data)
        } catch (error) {
          console.warn('[TimeTravel] Auto-save failed:', error)
        }
      }
    }, this.saveInterval)
  }

  loadAutoSaved(): boolean {
    if (typeof window === 'undefined') return false

    try {
      const saved = localStorage.getItem('zustand-time-travel')
      if (saved) {
        return this.importSnapshots(saved)
      }
    } catch (error) {
      console.warn('[TimeTravel] Failed to load auto-saved snapshots:', error)
    }
    return false
  }

  destroy(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer)
    }
  }
}

// Action logger for enhanced debugging
class ActionLogger {
  private options: NonNullable<EnhancedDevtoolsOptions['actionLogging']>

  constructor(options: NonNullable<EnhancedDevtoolsOptions['actionLogging']>) {
    this.options = options
  }

  log(action: string, state?: any, metadata?: Record<string, any>): void {
    if (!this.options.enabled) return

    const logLevel = this.options.logLevel || 'info'
    const logFn = console[logLevel] || console.log

    let message = `[Store Action] ${action}`
    
    if (this.options.includeTimestamp) {
      const timestamp = new Date().toISOString()
      message = `${timestamp} ${message}`
    }

    const logData: any[] = [message]

    if (this.options.includeState && state) {
      logData.push('\nState:', state)
    }

    if (metadata && Object.keys(metadata).length > 0) {
      logData.push('\nMetadata:', metadata)
    }

    logFn(...logData)
  }
}

// Enhanced devtools middleware
export interface EnhancedDevtoolsMiddleware<T> {
  $$devtools: {
    timeTravel: TimeTravelManager<T>
    actionLogger: ActionLogger
    goBack: () => void
    goForward: () => void
    goToSnapshot: (index: number) => void
    exportSnapshots: () => string
    importSnapshots: (data: string) => boolean
    clearSnapshots: () => void
    getSnapshots: () => TimeSnapshot<T>[]
  }
}

export function enhancedDevtools<T>(
  options: EnhancedDevtoolsOptions = {}
): (storeInitializer: StateCreator<T, [], [], T>) => StateCreator<T, [], [], T & EnhancedDevtoolsMiddleware<T>> {
  return (storeInitializer) => {
    return (set, get, api) => {
      const enabled = options.enabled !== false && process.env.NODE_ENV === 'development'
      
      if (!enabled) {
        // Return store without devtools in production or when disabled
        return {
          ...storeInitializer(set, get, api),
          $$devtools: {
            timeTravel: {} as TimeTravelManager<T>,
            actionLogger: {} as ActionLogger,
            goBack: () => {},
            goForward: () => {},
            goToSnapshot: () => {},
            exportSnapshots: () => '{}',
            importSnapshots: () => false,
            clearSnapshots: () => {},
            getSnapshots: () => []
          }
        }
      }

      // Initialize time travel manager
      let timeTravelManager: TimeTravelManager<T> | undefined
      if (options.timeTravel?.enabled) {
        timeTravelManager = new TimeTravelManager<T>(options.timeTravel)
        timeTravelManager.loadAutoSaved()
      }

      // Initialize action logger
      const actionLogger = options.actionLogging?.enabled 
        ? new ActionLogger(options.actionLogging)
        : new ActionLogger({ enabled: false })

      // Wrap set function to capture state changes
      const wrappedSet = (updater: any, replace?: boolean, action?: string) => {
        const actionName = action || 'setState'
        const prevState = get()
        
        // Execute the state update
        const result = set(updater, replace, action)
        const nextState = get()
        
        // Log action
        actionLogger.log(actionName, nextState, { prevState, replace })
        
        // Add to time travel if enabled
        if (timeTravelManager) {
          timeTravelManager.addSnapshot(nextState, actionName, { prevState, replace })
        }
        
        return result
      }

      // Create devtools methods
      const devtoolsMethods = {
        goBack: () => {
          if (timeTravelManager) {
            const snapshot = timeTravelManager.goBack()
            if (snapshot) {
              set(() => snapshot.state, true, 'TIME_TRAVEL_BACK')
            }
          }
        },
        goForward: () => {
          if (timeTravelManager) {
            const snapshot = timeTravelManager.goForward()
            if (snapshot) {
              set(() => snapshot.state, true, 'TIME_TRAVEL_FORWARD')
            }
          }
        },
        goToSnapshot: (index: number) => {
          if (timeTravelManager) {
            const snapshot = timeTravelManager.goToSnapshot(index)
            if (snapshot) {
              set(() => snapshot.state, true, `TIME_TRAVEL_TO_${index}`)
            }
          }
        },
        exportSnapshots: () => {
          return timeTravelManager?.exportSnapshots() || '{}'
        },
        importSnapshots: (data: string) => {
          return timeTravelManager?.importSnapshots(data) || false
        },
        clearSnapshots: () => {
          timeTravelManager?.clearSnapshots()
        },
        getSnapshots: () => {
          return timeTravelManager?.getSnapshots() || []
        }
      }

      // Create the store with standard devtools if available
      let store: T
      
      if (typeof window !== 'undefined' && (window as any).__REDUX_DEVTOOLS_EXTENSION__) {
        // Use standard Zustand devtools
        const devtoolsConfig = {
          enabled,
          name: options.name || 'Zustand Store',
          serialize: options.serialize,
          actionCreators: options.actionCreators,
          actionSanitizer: options.actionSanitizer,
          stateSanitizer: options.stateSanitizer,
          predicate: options.predicate,
          trace: options.trace,
          traceLimit: options.traceLimit,
          features: options.features
        }

        store = zustandDevtools(storeInitializer, devtoolsConfig)(wrappedSet, get, api)
      } else {
        store = storeInitializer(wrappedSet, get, api)
      }

      // Add initial snapshot
      if (timeTravelManager) {
        setTimeout(() => {
          timeTravelManager.addSnapshot(get(), 'INITIAL_STATE')
        }, 0)
      }

      return {
        ...store,
        $$devtools: {
          timeTravel: timeTravelManager!,
          actionLogger,
          ...devtoolsMethods
        }
      }
    }
  }
}

// Utility hooks for React components
export function useTimeTravel<T>(store: any) {
  const devtools = store.$$devtools
  
  if (!devtools) {
    return {
      snapshots: [],
      currentIndex: -1,
      goBack: () => {},
      goForward: () => {},
      goToSnapshot: () => {},
      canGoBack: false,
      canGoForward: false
    }
  }

  const snapshots = devtools.getSnapshots()
  const currentSnapshot = devtools.timeTravel.getCurrentSnapshot()
  const currentIndex = snapshots.findIndex(s => s.id === currentSnapshot?.id)

  return {
    snapshots,
    currentIndex,
    goBack: devtools.goBack,
    goForward: devtools.goForward,
    goToSnapshot: devtools.goToSnapshot,
    canGoBack: currentIndex > 0,
    canGoForward: currentIndex < snapshots.length - 1,
    exportSnapshots: devtools.exportSnapshots,
    importSnapshots: devtools.importSnapshots,
    clearSnapshots: devtools.clearSnapshots
  }
}

// Time travel debugger component data
export function getTimeTravelDebuggerData<T>(store: any) {
  const devtools = store.$$devtools
  if (!devtools) return null

  const snapshots = devtools.getSnapshots()
  const currentSnapshot = devtools.timeTravel.getCurrentSnapshot()
  
  return {
    snapshots: snapshots.map((snapshot, index) => ({
      id: snapshot.id,
      index,
      timestamp: snapshot.timestamp,
      action: snapshot.action,
      timeAgo: Date.now() - snapshot.timestamp,
      isCurrent: snapshot.id === currentSnapshot?.id
    })),
    controls: {
      goBack: devtools.goBack,
      goForward: devtools.goForward,
      goToSnapshot: devtools.goToSnapshot,
      exportSnapshots: devtools.exportSnapshots,
      importSnapshots: devtools.importSnapshots,
      clearSnapshots: devtools.clearSnapshots
    }
  }
}

// Development utilities
if (process.env.NODE_ENV === 'development') {
  // Make devtools utilities available globally
  (window as any).zustandDevtools = {
    getTimeTravelDebuggerData,
    enhancedDevtools
  }
  
  // Global keyboard shortcuts for time travel
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (event) => {
      // Ctrl/Cmd + Shift + Left Arrow: Go back in time
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'ArrowLeft') {
        event.preventDefault()
        console.log('[DevTools] Global time travel back triggered')
        // Note: This would need to be connected to active store
      }
      
      // Ctrl/Cmd + Shift + Right Arrow: Go forward in time
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'ArrowRight') {
        event.preventDefault()
        console.log('[DevTools] Global time travel forward triggered')
        // Note: This would need to be connected to active store
      }
    })
  }
}