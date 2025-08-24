/**
 * Data Usage Tracker for Mobile Optimization
 * Monitors and optimizes data consumption across the application
 */

export interface DataUsageMetrics {
  totalBytes: number;
  uploadBytes: number;
  downloadBytes: number;
  cacheHitBytes: number;
  cacheMissBytes: number;
  compressionSavedBytes: number;
  operationCount: number;
  timestamp: number;
}

export interface DataUsageAlert {
  type: 'APPROACHING_LIMIT' | 'LIMIT_EXCEEDED' | 'UNUSUAL_USAGE' | 'SAVINGS_OPPORTUNITY';
  message: string;
  threshold: number;
  currentUsage: number;
  suggestions: string[];
  timestamp: number;
}

export interface DataUsagePeriod {
  period: string;
  totalBytes: number;
  uploadBytes: number;
  downloadBytes: number;
  operationCount: number;
  startTime: number;
  endTime: number;
}

export interface DataSavings {
  compressionSaved: number;
  cachingHitRate: number;
  offlineModeSaved: number;
  totalSavings: number;
}

export interface NetworkContext {
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export class DataUsageTracker {
  private db: IDBDatabase | null = null;
  private currentPeriodUsage = new Map<string, DataUsageMetrics>();
  private alertListeners = new Set<Function>();
  private dailyLimit = 50 * 1024 * 1024; // 50MB default daily limit
  private monthlyLimit = 1024 * 1024 * 1024; // 1GB default monthly limit

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      this.initDatabase();
      this.startPeriodicReporting();
      this.monitorNetworkConditions();
    }
  }

  /**
   * Initialize IndexedDB for usage tracking
   */
  private async initDatabase(): Promise<void> {
    if (typeof indexedDB === 'undefined') {
      console.warn('IndexedDB not available in this environment')
      return Promise.resolve()
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('DataUsageTracker', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Usage metrics store
        if (!db.objectStoreNames.contains('usage_metrics')) {
          const store = db.createObjectStore('usage_metrics', { keyPath: 'id', autoIncrement: true });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('period', 'period', { unique: false });
        }

        // Alerts store
        if (!db.objectStoreNames.contains('usage_alerts')) {
          const alertsStore = db.createObjectStore('usage_alerts', { keyPath: 'id', autoIncrement: true });
          alertsStore.createIndex('userId', 'userId', { unique: false });
          alertsStore.createIndex('timestamp', 'timestamp', { unique: false });
          alertsStore.createIndex('type', 'type', { unique: false });
        }

        // Network conditions store
        if (!db.objectStoreNames.contains('network_conditions')) {
          const networkStore = db.createObjectStore('network_conditions', { keyPath: 'id', autoIncrement: true });
          networkStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Record data usage for any operation
   */
  recordDataUsage(operation: string, bytes: number, userId: string, type: 'upload' | 'download' | 'other' = 'other'): void {
    const today = this.getDateKey(new Date());
    const key = `${userId}:${today}`;
    
    const current = this.currentPeriodUsage.get(key) || {
      totalBytes: 0,
      uploadBytes: 0,
      downloadBytes: 0,
      cacheHitBytes: 0,
      cacheMissBytes: 0,
      compressionSavedBytes: 0,
      operationCount: 0,
      timestamp: Date.now(),
    };

    current.totalBytes += bytes;
    current.operationCount++;

    switch (type) {
      case 'upload':
        current.uploadBytes += bytes;
        break;
      case 'download':
        current.downloadBytes += bytes;
        break;
    }

    this.currentPeriodUsage.set(key, current);
    
    // Check for alerts
    this.checkUsageAlerts(userId, current);
    
    // Store in IndexedDB periodically
    if (current.operationCount % 10 === 0) {
      this.persistUsageData(userId, current);
    }
  }

  /**
   * Record cache hit/miss
   */
  recordCacheHit(key: string, bytes: number): void {
    const userId = this.extractUserIdFromKey(key);
    const today = this.getDateKey(new Date());
    const usageKey = `${userId}:${today}`;
    
    const current = this.currentPeriodUsage.get(usageKey) || this.createEmptyMetrics();
    current.cacheHitBytes += bytes;
    this.currentPeriodUsage.set(usageKey, current);
  }

  recordCacheMiss(key: string): void {
    // Track cache misses for optimization opportunities
  }

  recordCacheWrite(key: string, bytes: number): void {
    // Track cache storage usage
  }

  /**
   * Record compression savings
   */
  recordCompressionSavings(originalSize: number, compressedSize: number, userId: string): void {
    const savings = originalSize - compressedSize;
    const today = this.getDateKey(new Date());
    const key = `${userId}:${today}`;
    
    const current = this.currentPeriodUsage.get(key) || this.createEmptyMetrics();
    current.compressionSavedBytes += savings;
    this.currentPeriodUsage.set(key, current);
  }

  /**
   * Get usage statistics for a user
   */
  async getUsageStats(userId: string): Promise<{
    current: DataUsagePeriod;
    previous: DataUsagePeriod;
    projection: DataUsagePeriod;
    savings: DataSavings;
  }> {
    const current = await this.getCurrentPeriodUsage(userId);
    const previous = await this.getPreviousPeriodUsage(userId);
    const projection = this.projectUsage(current);
    const savings = await this.calculateSavings(userId);

    return {
      current,
      previous,
      projection,
      savings,
    };
  }

  /**
   * Set usage limits
   */
  setUsageLimits(daily: number, monthly: number): void {
    this.dailyLimit = daily;
    this.monthlyLimit = monthly;
  }

  /**
   * Get network-aware recommendations
   */
  getNetworkRecommendations(context: NetworkContext): string[] {
    const recommendations: string[] = [];

    if (context.saveData) {
      recommendations.push('Enable data compression for all requests');
      recommendations.push('Reduce image quality and disable auto-play videos');
      recommendations.push('Use text-only mode when available');
    }

    if (context.effectiveType === 'slow-2g' || context.effectiveType === '2g') {
      recommendations.push('Switch to offline-first mode');
      recommendations.push('Defer non-critical data syncing');
      recommendations.push('Use minimal UI with reduced graphics');
    } else if (context.effectiveType === '3g') {
      recommendations.push('Enable moderate compression');
      recommendations.push('Batch requests to reduce overhead');
      recommendations.push('Prefetch critical data only');
    } else if (context.effectiveType === '4g') {
      recommendations.push('Normal operation with smart caching');
      recommendations.push('Prefetch commonly used data');
    }

    if (context.connectionType === 'cellular') {
      recommendations.push('Monitor data usage closely');
      recommendations.push('Avoid large file uploads unless on WiFi');
    }

    return recommendations;
  }

  /**
   * Optimize for data usage mode
   */
  async optimizeForDataMode(mode: 'MINIMAL' | 'BALANCED' | 'FULL', userId: string): Promise<void> {
    switch (mode) {
      case 'MINIMAL':
        // Aggressive data saving
        this.setUsageLimits(10 * 1024 * 1024, 200 * 1024 * 1024); // 10MB daily, 200MB monthly
        break;
      case 'BALANCED':
        // Moderate usage
        this.setUsageLimits(25 * 1024 * 1024, 500 * 1024 * 1024); // 25MB daily, 500MB monthly
        break;
      case 'FULL':
        // Liberal usage
        this.setUsageLimits(100 * 1024 * 1024, 2 * 1024 * 1024 * 1024); // 100MB daily, 2GB monthly
        break;
    }
  }

  /**
   * Private helper methods
   */
  private async getCurrentPeriodUsage(userId: string): Promise<DataUsagePeriod> {
    const today = this.getDateKey(new Date());
    const key = `${userId}:${today}`;
    
    const current = this.currentPeriodUsage.get(key) || this.createEmptyMetrics();
    
    return {
      period: 'current',
      totalBytes: current.totalBytes,
      uploadBytes: current.uploadBytes,
      downloadBytes: current.downloadBytes,
      operationCount: current.operationCount,
      startTime: this.getStartOfDay(new Date()).getTime(),
      endTime: Date.now(),
    };
  }

  private async getPreviousPeriodUsage(userId: string): Promise<DataUsagePeriod> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Get from IndexedDB
    const usage = await this.getStoredUsage(userId, this.getDateKey(yesterday));
    
    return {
      period: 'previous',
      totalBytes: usage?.totalBytes || 0,
      uploadBytes: usage?.uploadBytes || 0,
      downloadBytes: usage?.downloadBytes || 0,
      operationCount: usage?.operationCount || 0,
      startTime: this.getStartOfDay(yesterday).getTime(),
      endTime: this.getEndOfDay(yesterday).getTime(),
    };
  }

  private projectUsage(current: DataUsagePeriod): DataUsagePeriod {
    const now = Date.now();
    const elapsed = now - current.startTime;
    const dayDuration = 24 * 60 * 60 * 1000;
    const remainingRatio = (dayDuration - elapsed) / elapsed;
    
    const projectedTotal = current.totalBytes * (1 + remainingRatio);
    const projectedUploads = current.uploadBytes * (1 + remainingRatio);
    const projectedDownloads = current.downloadBytes * (1 + remainingRatio);
    
    return {
      period: 'projected',
      totalBytes: Math.round(projectedTotal),
      uploadBytes: Math.round(projectedUploads),
      downloadBytes: Math.round(projectedDownloads),
      operationCount: Math.round(current.operationCount * (1 + remainingRatio)),
      startTime: current.startTime,
      endTime: current.startTime + dayDuration,
    };
  }

  private async calculateSavings(userId: string): Promise<DataSavings> {
    const today = this.getDateKey(new Date());
    const key = `${userId}:${today}`;
    
    const current = this.currentPeriodUsage.get(key) || this.createEmptyMetrics();
    
    const cachingHitRate = current.cacheHitBytes / (current.cacheHitBytes + current.cacheMissBytes) * 100 || 0;
    
    return {
      compressionSaved: current.compressionSavedBytes,
      cachingHitRate,
      offlineModeSaved: 0, // Would calculate based on offline usage
      totalSavings: current.compressionSavedBytes,
    };
  }

  private checkUsageAlerts(userId: string, metrics: DataUsageMetrics): void {
    const alerts: DataUsageAlert[] = [];

    // Check daily limit
    const dailyUsagePercent = (metrics.totalBytes / this.dailyLimit) * 100;
    if (dailyUsagePercent >= 80 && dailyUsagePercent < 100) {
      alerts.push({
        type: 'APPROACHING_LIMIT',
        message: `You've used ${dailyUsagePercent.toFixed(0)}% of your daily data limit`,
        threshold: this.dailyLimit,
        currentUsage: metrics.totalBytes,
        suggestions: [
          'Enable data compression',
          'Switch to offline mode',
          'Defer large uploads',
        ],
        timestamp: Date.now(),
      });
    } else if (dailyUsagePercent >= 100) {
      alerts.push({
        type: 'LIMIT_EXCEEDED',
        message: 'Daily data limit exceeded',
        threshold: this.dailyLimit,
        currentUsage: metrics.totalBytes,
        suggestions: [
          'Switch to offline-only mode',
          'Wait until tomorrow for data-heavy operations',
          'Connect to WiFi if available',
        ],
        timestamp: Date.now(),
      });
    }

    // Check for unusual usage patterns
    const avgOperationSize = metrics.totalBytes / metrics.operationCount;
    if (avgOperationSize > 1024 * 1024) { // > 1MB per operation
      alerts.push({
        type: 'UNUSUAL_USAGE',
        message: 'Unusually high data usage per operation detected',
        threshold: 1024 * 1024,
        currentUsage: avgOperationSize,
        suggestions: [
          'Enable higher compression levels',
          'Reduce image quality',
          'Review uploaded file sizes',
        ],
        timestamp: Date.now(),
      });
    }

    // Fire alerts
    alerts.forEach(alert => {
      this.fireAlert(userId, alert);
    });
  }

  private fireAlert(userId: string, alert: DataUsageAlert): void {
    // Store alert
    this.storeAlert(userId, alert);
    
    // Notify listeners
    this.alertListeners.forEach(listener => {
      try {
        listener(alert);
      } catch (error) {
        console.error('Error in data usage alert listener:', error);
      }
    });
  }

  private async persistUsageData(userId: string, metrics: DataUsageMetrics): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['usage_metrics'], 'readwrite');
    const store = transaction.objectStore('usage_metrics');

    const record = {
      userId,
      period: this.getDateKey(new Date()),
      ...metrics,
    };

    store.add(record);
  }

  private async storeAlert(userId: string, alert: DataUsageAlert): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['usage_alerts'], 'readwrite');
    const store = transaction.objectStore('usage_alerts');

    const record = {
      userId,
      ...alert,
    };

    store.add(record);
  }

  private async getStoredUsage(userId: string, period: string): Promise<DataUsageMetrics | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['usage_metrics'], 'readonly');
      const store = transaction.objectStore('usage_metrics');
      const index = store.index('userId');

      const request = index.getAll(userId);
      request.onsuccess = () => {
        const records = request.result;
        const match = records.find(r => r.period === period);
        resolve(match || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private createEmptyMetrics(): DataUsageMetrics {
    return {
      totalBytes: 0,
      uploadBytes: 0,
      downloadBytes: 0,
      cacheHitBytes: 0,
      cacheMissBytes: 0,
      compressionSavedBytes: 0,
      operationCount: 0,
      timestamp: Date.now(),
    };
  }

  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getStartOfDay(date: Date): Date {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private getEndOfDay(date: Date): Date {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  private extractUserIdFromKey(key: string): string {
    // Extract user ID from cache key format "operation:userId:hash"
    const parts = key.split(':');
    return parts[1] || 'anonymous';
  }

  private startPeriodicReporting(): void {
    // Report usage every hour
    setInterval(() => {
      this.currentPeriodUsage.forEach((metrics, key) => {
        const [userId] = key.split(':');
        this.persistUsageData(userId, metrics);
      });
    }, 60 * 60 * 1000);
  }

  private monitorNetworkConditions(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const recordNetworkCondition = () => {
        const condition = {
          connectionType: connection.type,
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData,
          timestamp: Date.now(),
        };
        
        this.storeNetworkCondition(condition);
      };

      connection.addEventListener('change', recordNetworkCondition);
      recordNetworkCondition(); // Record initial state
    }
  }

  private async storeNetworkCondition(condition: any): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['network_conditions'], 'readwrite');
    const store = transaction.objectStore('network_conditions');
    store.add(condition);
  }

  /**
   * Event listener management
   */
  onAlert(callback: Function): void {
    this.alertListeners.add(callback);
  }

  offAlert(callback: Function): void {
    this.alertListeners.delete(callback);
  }
}

export default DataUsageTracker;