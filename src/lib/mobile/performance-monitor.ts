/**
 * Mobile Performance Monitor
 * Tracks and analyzes performance metrics specifically for mobile devices
 */

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  
  // Mobile-specific metrics
  networkLatency?: number;
  networkBandwidth?: number;
  batteryLevel?: number;
  memoryUsage?: number;
  devicePixelRatio?: number;
  screenSize?: string;
  connectionType?: string;
  effectiveConnectionType?: string;
  
  // App-specific metrics
  appLoadTime?: number;
  routeChangeTime?: number;
  apiResponseTime?: number;
  cacheHitRate?: number;
  offlineOperations?: number;
  
  // User experience metrics
  timeToInteractive?: number;
  totalBlockingTime?: number;
  longTasksCount?: number;
  renderBlockingResources?: number;
  
  // Timestamp and session info
  timestamp: number;
  sessionId: string;
  pageUrl: string;
  userAgent: string;
}

export interface PerformanceBudget {
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
  ttfb: number;
  appLoadTime: number;
  apiResponseTime: number;
}

export interface PerformanceAlert {
  type: 'budget_exceeded' | 'performance_degradation' | 'network_issue' | 'memory_warning';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class MobilePerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private sessionId: string;
  private budget: PerformanceBudget;
  private observers = new Map<string, PerformanceObserver>();
  private listeners = new Set<Function>();
  private alertListeners = new Set<Function>();
  private isMonitoring = false;

  constructor(budget?: Partial<PerformanceBudget>) {
    this.sessionId = this.generateSessionId();
    this.budget = {
      lcp: 2500, // 2.5s
      fid: 100,  // 100ms
      cls: 0.1,  // 0.1
      fcp: 1800, // 1.8s
      ttfb: 800, // 800ms
      appLoadTime: 3000, // 3s
      apiResponseTime: 1000, // 1s
      ...budget,
    };

    this.init();
  }

  /**
   * Initialize performance monitoring
   */
  private init(): void {
    if (typeof window === 'undefined') return;

    this.startMonitoring();
    this.monitorNetworkChanges();
    this.monitorMemoryUsage();
    this.monitorBatteryStatus();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Monitor Core Web Vitals
    this.observeWebVitals();
    
    // Monitor navigation timing
    this.observeNavigationTiming();
    
    // Monitor resource timing
    this.observeResourceTiming();
    
    // Monitor long tasks
    this.observeLongTasks();
    
    // Monitor layout shifts
    this.observeLayoutShifts();
    
    // Custom app metrics
    this.startCustomMetrics();
    
    console.log('Mobile performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    // Disconnect all observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    console.log('Mobile performance monitoring stopped');
  }

  /**
   * Observe Core Web Vitals
   */
  private observeWebVitals(): void {
    // Largest Contentful Paint
    if ('PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint')) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime: number; loadTime: number };
        
        this.recordMetric('lcp', lastEntry.renderTime || lastEntry.loadTime);
      });
      
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', lcpObserver);
    }

    // First Input Delay
    if ('PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes.includes('first-input')) {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstEntry = entries[0] as PerformanceEntry & { processingStart: number; startTime: number };
        
        this.recordMetric('fid', firstEntry.processingStart - firstEntry.startTime);
      });
      
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.set('fid', fidObserver);
    }

    // First Contentful Paint
    if ('PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes.includes('paint')) {
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.recordMetric('fcp', entry.startTime);
          }
        });
      });
      
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.set('paint', paintObserver);
    }
  }

  /**
   * Observe navigation timing
   */
  private observeNavigationTiming(): void {
    if ('PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes.includes('navigation')) {
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const navEntry = entry as PerformanceNavigationTiming;
          
          // Time to First Byte
          this.recordMetric('ttfb', navEntry.responseStart - navEntry.requestStart);
          
          // App Load Time
          this.recordMetric('appLoadTime', navEntry.loadEventEnd - navEntry.navigationStart);
          
          // Time to Interactive (simplified)
          this.recordMetric('timeToInteractive', navEntry.domInteractive - navEntry.navigationStart);
        });
      });
      
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', navigationObserver);
    }
  }

  /**
   * Observe resource timing for API response times
   */
  private observeResourceTiming(): void {
    if ('PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes.includes('resource')) {
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const resourceEntry = entry as PerformanceResourceTiming;
          
          // Track API response times
          if (resourceEntry.name.includes('/api/')) {
            const responseTime = resourceEntry.responseEnd - resourceEntry.requestStart;
            this.recordMetric('apiResponseTime', responseTime);
            
            // Check if exceeds budget
            if (responseTime > this.budget.apiResponseTime) {
              this.fireAlert({
                type: 'budget_exceeded',
                message: `API response time exceeded budget: ${responseTime}ms`,
                metric: 'apiResponseTime',
                value: responseTime,
                threshold: this.budget.apiResponseTime,
                timestamp: Date.now(),
                severity: responseTime > this.budget.apiResponseTime * 2 ? 'high' : 'medium',
              });
            }
          }
          
          // Track render-blocking resources
          if (resourceEntry.renderBlockingStatus === 'blocking') {
            this.incrementMetric('renderBlockingResources');
          }
        });
      });
      
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', resourceObserver);
    }
  }

  /**
   * Observe long tasks
   */
  private observeLongTasks(): void {
    if ('PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      const longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        this.incrementMetric('longTasksCount', entries.length);
        
        // Calculate Total Blocking Time
        const blockingTime = entries.reduce((total, task) => {
          return total + Math.max(0, task.duration - 50); // Tasks > 50ms are blocking
        }, 0);
        
        this.recordMetric('totalBlockingTime', blockingTime);
      });
      
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', longTaskObserver);
    }
  }

  /**
   * Observe layout shifts
   */
  private observeLayoutShifts(): void {
    if ('PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes.includes('layout-shift')) {
      let clsValue = 0;
      
      const layoutShiftObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          const layoutShiftEntry = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
          
          // Only count layout shifts that weren't caused by user interaction
          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value;
          }
        });
        
        this.recordMetric('cls', clsValue);
      });
      
      layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('layout-shift', layoutShiftObserver);
    }
  }

  /**
   * Start custom app metrics
   */
  private startCustomMetrics(): void {
    // Monitor route changes
    this.monitorRouteChanges();
    
    // Monitor cache performance
    this.monitorCachePerformance();
  }

  /**
   * Monitor route changes
   */
  private monitorRouteChanges(): void {
    let routeStartTime = performance.now();
    
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    const handleRouteChange = () => {
      const routeChangeTime = performance.now() - routeStartTime;
      this.recordMetric('routeChangeTime', routeChangeTime);
      routeStartTime = performance.now();
    };
    
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      handleRouteChange();
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      handleRouteChange();
    };
    
    window.addEventListener('popstate', handleRouteChange);
  }

  /**
   * Monitor cache performance
   */
  private monitorCachePerformance(): void {
    // This would integrate with your cache manager
    // For now, we'll simulate cache hit rate tracking
    
    let cacheHits = 0;
    let cacheRequests = 0;
    
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      cacheRequests++;
      
      const response = await originalFetch.apply(this, args);
      
      // Check if response came from cache
      if (response.headers.get('x-cache') === 'HIT' || 
          response.headers.get('cf-cache-status') === 'HIT') {
        cacheHits++;
      }
      
      return response;
    };
    
    // Update cache hit rate periodically
    setInterval(() => {
      if (cacheRequests > 0) {
        const hitRate = (cacheHits / cacheRequests) * 100;
        this.recordMetric('cacheHitRate', hitRate);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Monitor network changes
   */
  private monitorNetworkChanges(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateNetworkMetrics = () => {
        this.recordMetric('networkBandwidth', connection.downlink);
        this.recordMetric('networkLatency', connection.rtt);
        this.recordMetric('connectionType', connection.type);
        this.recordMetric('effectiveConnectionType', connection.effectiveType);
      };
      
      connection.addEventListener('change', updateNetworkMetrics);
      updateNetworkMetrics(); // Initial reading
    }
  }

  /**
   * Monitor memory usage
   */
  private monitorMemoryUsage(): void {
    if ('memory' in performance) {
      const updateMemoryMetrics = () => {
        const memoryInfo = (performance as any).memory;
        this.recordMetric('memoryUsage', memoryInfo.usedJSHeapSize);
        
        // Alert on high memory usage
        const memoryUsagePercent = (memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100;
        if (memoryUsagePercent > 80) {
          this.fireAlert({
            type: 'memory_warning',
            message: `High memory usage: ${memoryUsagePercent.toFixed(1)}%`,
            metric: 'memoryUsage',
            value: memoryUsagePercent,
            threshold: 80,
            timestamp: Date.now(),
            severity: memoryUsagePercent > 90 ? 'critical' : 'high',
          });
        }
      };
      
      setInterval(updateMemoryMetrics, 10000); // Every 10 seconds
      updateMemoryMetrics(); // Initial reading
    }
  }

  /**
   * Monitor battery status
   */
  private monitorBatteryStatus(): void {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBatteryMetrics = () => {
          this.recordMetric('batteryLevel', battery.level * 100);
        };
        
        battery.addEventListener('levelchange', updateBatteryMetrics);
        updateBatteryMetrics(); // Initial reading
      });
    }
  }

  /**
   * Record a performance metric
   */
  private recordMetric(name: string, value: number): void {
    const currentMetrics = this.getCurrentMetrics();
    (currentMetrics as any)[name] = value;
    
    // Check performance budgets
    this.checkPerformanceBudget(name, value);
    
    // Notify listeners
    this.emit('metric-recorded', { name, value, timestamp: Date.now() });
  }

  /**
   * Increment a metric counter
   */
  private incrementMetric(name: string, increment: number = 1): void {
    const currentMetrics = this.getCurrentMetrics();
    const currentValue = (currentMetrics as any)[name] || 0;
    (currentMetrics as any)[name] = currentValue + increment;
  }

  /**
   * Get current metrics object
   */
  private getCurrentMetrics(): PerformanceMetrics {
    const now = Date.now();
    let current = this.metrics.find(m => now - m.timestamp < 60000); // Within last minute
    
    if (!current) {
      current = {
        timestamp: now,
        sessionId: this.sessionId,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        devicePixelRatio: window.devicePixelRatio,
        screenSize: `${screen.width}x${screen.height}`,
      };
      this.metrics.push(current);
    }
    
    return current;
  }

  /**
   * Check performance budget
   */
  private checkPerformanceBudget(metric: string, value: number): void {
    const budget = (this.budget as any)[metric];
    
    if (budget && value > budget) {
      this.fireAlert({
        type: 'budget_exceeded',
        message: `Performance budget exceeded for ${metric}: ${value}`,
        metric,
        value,
        threshold: budget,
        timestamp: Date.now(),
        severity: value > budget * 1.5 ? 'high' : 'medium',
      });
    }
  }

  /**
   * Fire performance alert
   */
  private fireAlert(alert: PerformanceAlert): void {
    this.alertListeners.forEach(listener => {
      try {
        listener(alert);
      } catch (error) {
        console.error('Error in performance alert listener:', error);
      }
    });
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    coreWebVitals: { lcp?: number; fid?: number; cls?: number; fcp?: number };
    mobileMetrics: { networkLatency?: number; memoryUsage?: number; batteryLevel?: number };
    appMetrics: { appLoadTime?: number; cacheHitRate?: number };
    budgetStatus: { passed: number; failed: number; total: number };
  } {
    const latest = this.metrics[this.metrics.length - 1];
    
    if (!latest) {
      return {
        coreWebVitals: {},
        mobileMetrics: {},
        appMetrics: {},
        budgetStatus: { passed: 0, failed: 0, total: 0 },
      };
    }

    const budgetChecks = Object.entries(this.budget).map(([metric, threshold]) => {
      const value = (latest as any)[metric];
      return value !== undefined && value <= threshold;
    });

    const passed = budgetChecks.filter(Boolean).length;
    const total = budgetChecks.length;

    return {
      coreWebVitals: {
        lcp: latest.lcp,
        fid: latest.fid,
        cls: latest.cls,
        fcp: latest.fcp,
      },
      mobileMetrics: {
        networkLatency: latest.networkLatency,
        memoryUsage: latest.memoryUsage,
        batteryLevel: latest.batteryLevel,
      },
      appMetrics: {
        appLoadTime: latest.appLoadTime,
        cacheHitRate: latest.cacheHitRate,
      },
      budgetStatus: {
        passed,
        failed: total - passed,
        total,
      },
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    session: string;
    duration: number;
    metrics: PerformanceMetrics[];
    summary: any;
    recommendations: string[];
  } {
    const summary = this.getPerformanceSummary();
    const recommendations = this.generateRecommendations(summary);
    
    return {
      session: this.sessionId,
      duration: Date.now() - (this.metrics[0]?.timestamp || Date.now()),
      metrics: this.metrics,
      summary,
      recommendations,
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(summary: any): string[] {
    const recommendations: string[] = [];
    const latest = this.metrics[this.metrics.length - 1];
    
    if (!latest) return recommendations;

    // Core Web Vitals recommendations
    if (latest.lcp && latest.lcp > this.budget.lcp) {
      recommendations.push('Optimize Largest Contentful Paint by reducing image sizes and improving server response times');
    }
    
    if (latest.fid && latest.fid > this.budget.fid) {
      recommendations.push('Reduce First Input Delay by optimizing JavaScript execution and using code splitting');
    }
    
    if (latest.cls && latest.cls > this.budget.cls) {
      recommendations.push('Minimize Cumulative Layout Shift by setting dimensions on images and ads');
    }
    
    // Mobile-specific recommendations
    if (latest.memoryUsage && latest.memoryUsage > 50 * 1024 * 1024) {
      recommendations.push('Optimize memory usage by cleaning up unused objects and reducing JavaScript bundles');
    }
    
    if (latest.cacheHitRate && latest.cacheHitRate < 80) {
      recommendations.push('Improve cache hit rate by implementing better caching strategies');
    }
    
    if (latest.longTasksCount && latest.longTasksCount > 5) {
      recommendations.push('Reduce long tasks by breaking up JavaScript work into smaller chunks');
    }

    return recommendations;
  }

  /**
   * Event listener management
   */
  on(event: string, callback: Function): void {
    if (event === 'alert') {
      this.alertListeners.add(callback);
    } else {
      this.listeners.add(callback);
    }
  }

  off(event: string, callback: Function): void {
    if (event === 'alert') {
      this.alertListeners.delete(callback);
    } else {
      this.listeners.delete(callback);
    }
  }

  private emit(event: string, data: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in performance monitor listener:', error);
      }
    });
  }

  /**
   * Send metrics to server
   */
  async sendMetrics(): Promise<void> {
    if (this.metrics.length === 0) return;

    try {
      await fetch('/api/mobile/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          metrics: this.metrics,
        }),
      });
      
      // Clear sent metrics
      this.metrics = [];
    } catch (error) {
      console.error('Failed to send performance metrics:', error);
    }
  }

  /**
   * Utility methods
   */
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopMonitoring();
    this.listeners.clear();
    this.alertListeners.clear();
    this.metrics = [];
  }
}

// Create singleton instance
export const performanceMonitor = new MobilePerformanceMonitor();
export default performanceMonitor;