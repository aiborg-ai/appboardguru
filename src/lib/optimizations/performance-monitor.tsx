/**
 * Performance Monitoring System
 * Comprehensive performance tracking based on Web Vitals and custom metrics
 */

import React, { useEffect } from 'react';
import { Metric } from 'next/dist/compiled/web-vitals';

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  inp?: number; // Interaction to Next Paint (new in 2024)
  
  // Custom Metrics
  apiLatency?: number;
  dbQueryTime?: number;
  cacheHitRate?: number;
  errorRate?: number;
  renderTime?: number;
}

export interface PerformanceThresholds {
  lcp: { good: number; needsImprovement: number };
  fid: { good: number; needsImprovement: number };
  cls: { good: number; needsImprovement: number };
  fcp: { good: number; needsImprovement: number };
  ttfb: { good: number; needsImprovement: number };
  inp: { good: number; needsImprovement: number };
}

/**
 * Performance Monitor Class
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics = {};
  private observers: Set<(metrics: PerformanceMetrics) => void> = new Set();
  
  // Performance thresholds based on Google's recommendations
  private thresholds: PerformanceThresholds = {
    lcp: { good: 2500, needsImprovement: 4000 },
    fid: { good: 100, needsImprovement: 300 },
    cls: { good: 0.1, needsImprovement: 0.25 },
    fcp: { good: 1800, needsImprovement: 3000 },
    ttfb: { good: 800, needsImprovement: 1800 },
    inp: { good: 200, needsImprovement: 500 }
  };

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers();
      this.trackCustomMetrics();
    }
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Initialize Performance Observers
   */
  private initializeObservers() {
    // Observe long tasks
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            console.warn('Long task detected:', {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name
            });
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // Longtask observer not supported
      }

      // Observe layout shifts
      try {
        const layoutShiftObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          this.updateMetric('cls', clsValue);
        });
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        // Layout shift observer not supported
      }
    }
  }

  /**
   * Track custom application metrics
   */
  private trackCustomMetrics() {
    // Track API latency
    this.interceptFetch();
    
    // Track render performance
    this.trackRenderPerformance();
    
    // Track memory usage
    this.trackMemoryUsage();
  }

  /**
   * Intercept fetch to measure API latency
   */
  private interceptFetch() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const startTime = performance.now();
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const latency = endTime - startTime;
        
        this.recordApiLatency(latency);
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        const latency = endTime - startTime;
        
        this.recordApiLatency(latency, true);
        throw error;
      }
    };
  }

  /**
   * Track React render performance
   */
  private trackRenderPerformance() {
    if (typeof window !== 'undefined' && (window as any).React) {
      const React = (window as any).React;
      
      if (React.Profiler) {
        // React Profiler API is available
        console.log('React Profiler available for performance tracking');
      }
    }
  }

  /**
   * Track memory usage
   */
  private trackMemoryUsage() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usedMemory = memory.usedJSHeapSize / 1048576; // Convert to MB
        const totalMemory = memory.totalJSHeapSize / 1048576;
        
        if (usedMemory > totalMemory * 0.9) {
          console.warn('High memory usage detected:', {
            used: `${usedMemory.toFixed(2)} MB`,
            total: `${totalMemory.toFixed(2)} MB`,
            percentage: `${((usedMemory / totalMemory) * 100).toFixed(2)}%`
          });
        }
      }, 10000); // Check every 10 seconds
    }
  }

  /**
   * Record Web Vitals metric
   */
  recordWebVital(metric: Metric) {
    const value = Math.round(metric.value);
    
    switch (metric.name) {
      case 'FCP':
        this.updateMetric('fcp', value);
        break;
      case 'LCP':
        this.updateMetric('lcp', value);
        break;
      case 'CLS':
        this.updateMetric('cls', metric.value); // CLS is not rounded
        break;
      case 'FID':
        this.updateMetric('fid', value);
        break;
      case 'TTFB':
        this.updateMetric('ttfb', value);
        break;
      case 'INP':
        this.updateMetric('inp', value);
        break;
    }
    
    this.evaluatePerformance(metric.name.toLowerCase() as keyof PerformanceThresholds, metric.value);
  }

  /**
   * Record API latency
   */
  private recordApiLatency(latency: number, isError: boolean = false) {
    const currentLatency = this.metrics.apiLatency || 0;
    // Moving average
    this.metrics.apiLatency = (currentLatency + latency) / 2;
    
    if (isError) {
      const currentErrorRate = this.metrics.errorRate || 0;
      this.metrics.errorRate = currentErrorRate + 1;
    }
    
    this.notifyObservers();
  }

  /**
   * Update a metric value
   */
  private updateMetric(key: keyof PerformanceMetrics, value: number) {
    this.metrics[key] = value;
    this.notifyObservers();
  }

  /**
   * Evaluate performance against thresholds
   */
  private evaluatePerformance(metric: keyof PerformanceThresholds, value: number) {
    const threshold = this.thresholds[metric];
    if (!threshold) return;
    
    let rating: 'good' | 'needs-improvement' | 'poor';
    
    if (value <= threshold.good) {
      rating = 'good';
    } else if (value <= threshold.needsImprovement) {
      rating = 'needs-improvement';
    } else {
      rating = 'poor';
    }
    
    // Log poor performance
    if (rating === 'poor') {
      console.warn(`Poor ${metric.toUpperCase()} detected:`, {
        value,
        threshold: threshold.needsImprovement,
        rating
      });
      
      // Send to analytics
      this.sendToAnalytics(metric, value, rating);
    }
  }

  /**
   * Send metrics to analytics service
   */
  private sendToAnalytics(metric: string, value: number, rating: string) {
    // Google Analytics 4
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'web_vitals', {
        metric_name: metric,
        metric_value: value,
        metric_rating: rating
      });
    }
    
    // Custom analytics endpoint
    if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
      fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric,
          value,
          rating,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      }).catch(console.error);
    }
  }

  /**
   * Subscribe to metric updates
   */
  subscribe(callback: (metrics: PerformanceMetrics) => void) {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  /**
   * Notify all observers of metric updates
   */
  private notifyObservers() {
    this.observers.forEach(callback => callback(this.metrics));
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance score (0-100)
   */
  getPerformanceScore(): number {
    const weights = {
      lcp: 0.25,
      fid: 0.25,
      cls: 0.25,
      fcp: 0.15,
      ttfb: 0.10
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    Object.entries(weights).forEach(([metric, weight]) => {
      const value = this.metrics[metric as keyof PerformanceMetrics];
      const threshold = this.thresholds[metric as keyof PerformanceThresholds];
      
      if (value !== undefined && threshold) {
        let score = 0;
        
        if (value <= threshold.good) {
          score = 100;
        } else if (value <= threshold.needsImprovement) {
          // Linear interpolation between good and needs improvement
          const range = threshold.needsImprovement - threshold.good;
          const position = value - threshold.good;
          score = 100 - (position / range) * 50;
        } else {
          // Linear interpolation for poor performance
          const range = value - threshold.needsImprovement;
          const maxRange = threshold.needsImprovement; // Assume same range for poor
          score = Math.max(0, 50 - (range / maxRange) * 50);
        }
        
        totalScore += score * weight;
        totalWeight += weight;
      }
    });
    
    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const score = this.getPerformanceScore();
    const metrics = this.getMetrics();
    
    let report = `Performance Report\n`;
    report += `==================\n`;
    report += `Overall Score: ${score}/100\n\n`;
    
    report += `Core Web Vitals:\n`;
    report += `- LCP: ${metrics.lcp || 'N/A'}ms\n`;
    report += `- FID: ${metrics.fid || 'N/A'}ms\n`;
    report += `- CLS: ${metrics.cls || 'N/A'}\n`;
    report += `- FCP: ${metrics.fcp || 'N/A'}ms\n`;
    report += `- TTFB: ${metrics.ttfb || 'N/A'}ms\n`;
    report += `- INP: ${metrics.inp || 'N/A'}ms\n\n`;
    
    report += `Custom Metrics:\n`;
    report += `- API Latency: ${metrics.apiLatency?.toFixed(2) || 'N/A'}ms\n`;
    report += `- Error Rate: ${metrics.errorRate || 0}\n`;
    
    return report;
  }
}

/**
 * React Hook for using performance monitor
 */
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [score, setScore] = useState<number>(0);
  
  useEffect(() => {
    const monitor = PerformanceMonitor.getInstance();
    
    const unsubscribe = monitor.subscribe((newMetrics) => {
      setMetrics(newMetrics);
      setScore(monitor.getPerformanceScore());
    });
    
    // Get initial metrics
    setMetrics(monitor.getMetrics());
    setScore(monitor.getPerformanceScore());
    
    return unsubscribe;
  }, []);
  
  return { metrics, score };
}

/**
 * Utility to measure component render time
 */
export function measureRenderTime(componentName: string) {
  return function<T extends React.ComponentType<any>>(Component: T): T {
    if (process.env.NODE_ENV === 'production') {
      return Component;
    }
    
    const MeasuredComponent = (props: any) => {
      useEffect(() => {
        performance.mark(`${componentName}-render-end`);
        performance.measure(
          `${componentName}-render`,
          `${componentName}-render-start`,
          `${componentName}-render-end`
        );
        
        const measure = performance.getEntriesByName(`${componentName}-render`)[0];
        if (measure) {
          console.log(`${componentName} render time:`, measure.duration.toFixed(2), 'ms');
        }
      });
      
      performance.mark(`${componentName}-render-start`);
      
      return <Component {...props} />;
    };
    
    return MeasuredComponent as T;
  };
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Missing imports
import { useState, useEffect } from 'react';