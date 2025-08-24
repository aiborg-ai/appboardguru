/**
 * Workflow State Manager
 * 
 * Manages state persistence and snapshots during complex workflow testing.
 * Enables state recovery, rollback, and cross-test data sharing.
 */

export interface WorkflowStateManagerConfig {
  enabled: boolean
  persistenceEnabled: boolean
  snapshotInterval: number
  maxSnapshots?: number
}

export class WorkflowStateManager {
  private config: WorkflowStateManagerConfig
  private stateStore: Map<string, any> = new Map()
  private snapshots: Map<string, any[]> = new Map()
  private snapshotTimer: NodeJS.Timeout | null = null

  constructor(config: WorkflowStateManagerConfig) {
    this.config = {
      maxSnapshots: 10,
      ...config
    }
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      return
    }

    // Start periodic snapshots if enabled
    if (this.config.snapshotInterval > 0) {
      this.snapshotTimer = setInterval(() => {
        this.createSnapshot('periodic')
      }, this.config.snapshotInterval)
    }
  }

  async cleanup(): Promise<void> {
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer)
      this.snapshotTimer = null
    }

    if (this.config.persistenceEnabled) {
      await this.persistState()
    }

    this.stateStore.clear()
    this.snapshots.clear()
  }

  async saveState(key: string, state: any): Promise<void> {
    this.stateStore.set(key, state)
    
    if (this.config.persistenceEnabled) {
      // In real implementation, would persist to disk/database
    }
  }

  async loadState(key: string): Promise<any> {
    return this.stateStore.get(key)
  }

  createSnapshot(name: string): void {
    const snapshot = {
      timestamp: Date.now(),
      state: new Map(this.stateStore)
    }

    if (!this.snapshots.has(name)) {
      this.snapshots.set(name, [])
    }

    const namedSnapshots = this.snapshots.get(name)!
    namedSnapshots.push(snapshot)

    // Limit snapshot history
    if (namedSnapshots.length > this.config.maxSnapshots!) {
      namedSnapshots.shift()
    }
  }

  async restoreSnapshot(name: string, index: number = -1): Promise<boolean> {
    const namedSnapshots = this.snapshots.get(name)
    if (!namedSnapshots || namedSnapshots.length === 0) {
      return false
    }

    const snapshotIndex = index >= 0 ? index : namedSnapshots.length + index
    const snapshot = namedSnapshots[snapshotIndex]
    
    if (!snapshot) {
      return false
    }

    this.stateStore = new Map(snapshot.state)
    return true
  }

  getLatestSnapshot(name: string): any {
    const namedSnapshots = this.snapshots.get(name)
    return namedSnapshots && namedSnapshots.length > 0 
      ? namedSnapshots[namedSnapshots.length - 1] 
      : null
  }

  private async persistState(): Promise<void> {
    // Implementation would persist state to file system or database
    // For now, just log the action
    console.log('Persisting workflow state...')
  }
}