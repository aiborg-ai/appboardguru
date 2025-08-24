/**
 * Mobile Performance API Endpoint
 * Collects and analyzes mobile performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, metrics, userId } = await request.json();

    if (!sessionId || !metrics) {
      return NextResponse.json(
        { error: 'Session ID and metrics are required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    
    // Store performance metrics
    const metricsToStore = metrics.map((metric: any) => ({
      session_id: sessionId,
      user_id: userId || null,
      timestamp: new Date(metric.timestamp).toISOString(),
      page_url: metric.pageUrl,
      user_agent: metric.userAgent,
      
      // Core Web Vitals
      lcp: metric.lcp || null,
      fid: metric.fid || null,
      cls: metric.cls || null,
      fcp: metric.fcp || null,
      ttfb: metric.ttfb || null,
      
      // Mobile-specific metrics
      network_latency: metric.networkLatency || null,
      network_bandwidth: metric.networkBandwidth || null,
      battery_level: metric.batteryLevel || null,
      memory_usage: metric.memoryUsage || null,
      device_pixel_ratio: metric.devicePixelRatio || null,
      screen_size: metric.screenSize || null,
      connection_type: metric.connectionType || null,
      effective_connection_type: metric.effectiveConnectionType || null,
      
      // App-specific metrics
      app_load_time: metric.appLoadTime || null,
      route_change_time: metric.routeChangeTime || null,
      api_response_time: metric.apiResponseTime || null,
      cache_hit_rate: metric.cacheHitRate || null,
      offline_operations: metric.offlineOperations || null,
      
      // UX metrics
      time_to_interactive: metric.timeToInteractive || null,
      total_blocking_time: metric.totalBlockingTime || null,
      long_tasks_count: metric.longTasksCount || null,
      render_blocking_resources: metric.renderBlockingResources || null,
      
      created_at: new Date().toISOString(),
    }));

    const { error: metricsError } = await supabase
      .from('performance_metrics')
      .insert(metricsToStore);

    if (metricsError) {
      throw metricsError;
    }

    // Analyze metrics and generate insights
    const insights = await analyzePerformanceMetrics(metrics);
    
    // Store insights if significant
    if (insights.alerts.length > 0) {
      const alertsToStore = insights.alerts.map((alert: any) => ({
        session_id: sessionId,
        user_id: userId || null,
        type: alert.type,
        message: alert.message,
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold,
        severity: alert.severity,
        created_at: new Date().toISOString(),
      }));

      await supabase
        .from('performance_alerts')
        .insert(alertsToStore);
    }

    return NextResponse.json({
      success: true,
      message: 'Performance metrics stored',
      insights,
      metricsCount: metricsToStore.length,
    });

  } catch (error) {
    console.error('Performance metrics storage error:', error);
    return NextResponse.json(
      { error: 'Failed to store performance metrics' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');
    const timeRange = searchParams.get('timeRange') || '24h';

    const supabase = createSupabaseServerClient();
    
    let query = supabase
      .from('performance_metrics')
      .select('*')
      .order('timestamp', { ascending: false });

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Apply time range filter
    const timeRangeMs = parseTimeRange(timeRange);
    if (timeRangeMs) {
      const cutoff = new Date(Date.now() - timeRangeMs).toISOString();
      query = query.gte('timestamp', cutoff);
    }

    const { data: metrics, error: metricsError } = await query.limit(100);

    if (metricsError) {
      throw metricsError;
    }

    // Get performance summary
    const summary = generatePerformanceSummary(metrics || []);
    
    // Get recent alerts
    const { data: alerts } = await supabase
      .from('performance_alerts')
      .select('*')
      .eq(userId ? 'user_id' : 'session_id', userId || sessionId || '')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      metrics: metrics || [],
      summary,
      alerts: alerts || [],
      timeRange,
    });

  } catch (error) {
    console.error('Performance metrics retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve performance metrics' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { action, sessionId, userId } = await request.json();

    const supabase = createSupabaseServerClient();
    
    switch (action) {
      case 'generate_report':
        const report = await generatePerformanceReport(sessionId, userId);
        return NextResponse.json({ report });

      case 'get_recommendations':
        const recommendations = await getPerformanceRecommendations(sessionId, userId);
        return NextResponse.json({ recommendations });

      case 'benchmark':
        const benchmark = await getBenchmarkComparison(sessionId, userId);
        return NextResponse.json({ benchmark });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Performance action error:', error);
    return NextResponse.json(
      { error: 'Failed to process performance action' },
      { status: 500 }
    );
  }
}

/**
 * Helper functions
 */

async function analyzePerformanceMetrics(metrics: any[]): Promise<{
  score: number;
  grade: string;
  alerts: any[];
  recommendations: string[];
}> {
  const alerts: any[] = [];
  const recommendations: string[] = [];
  
  // Define performance budgets
  const budgets = {
    lcp: 2500, // 2.5s
    fid: 100,  // 100ms
    cls: 0.1,  // 0.1
    fcp: 1800, // 1.8s
    ttfb: 800, // 800ms
  };

  // Analyze latest metrics
  const latest = metrics[metrics.length - 1];
  if (!latest) {
    return { score: 0, grade: 'N/A', alerts, recommendations };
  }

  let score = 100;
  
  // Check Core Web Vitals
  Object.entries(budgets).forEach(([metric, budget]) => {
    const value = latest[metric];
    if (value && value > budget) {
      const penalty = Math.min(30, (value - budget) / budget * 20);
      score -= penalty;
      
      alerts.push({
        type: 'budget_exceeded',
        message: `${metric.toUpperCase()} exceeds budget: ${value} > ${budget}`,
        metric,
        value,
        threshold: budget,
        severity: value > budget * 1.5 ? 'high' : 'medium',
      });

      // Add specific recommendations
      switch (metric) {
        case 'lcp':
          recommendations.push('Optimize image loading and server response times');
          break;
        case 'fid':
          recommendations.push('Reduce JavaScript execution time and use code splitting');
          break;
        case 'cls':
          recommendations.push('Set explicit dimensions for images and ads');
          break;
        case 'fcp':
          recommendations.push('Optimize critical rendering path and reduce render-blocking resources');
          break;
        case 'ttfb':
          recommendations.push('Improve server response times and use CDN');
          break;
      }
    }
  });

  // Mobile-specific checks
  if (latest.memoryUsage > 50 * 1024 * 1024) { // 50MB
    score -= 10;
    alerts.push({
      type: 'memory_warning',
      message: 'High memory usage detected',
      metric: 'memoryUsage',
      value: latest.memoryUsage,
      threshold: 50 * 1024 * 1024,
      severity: 'medium',
    });
    recommendations.push('Optimize memory usage by reducing JavaScript bundle size');
  }

  if (latest.longTasksCount > 5) {
    score -= 15;
    recommendations.push('Break up long-running tasks to improve responsiveness');
  }

  // Determine grade
  let grade = 'F';
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';

  return {
    score: Math.max(0, Math.round(score)),
    grade,
    alerts,
    recommendations: [...new Set(recommendations)], // Remove duplicates
  };
}

function generatePerformanceSummary(metrics: any[]): any {
  if (metrics.length === 0) {
    return {
      coreWebVitals: {},
      mobileMetrics: {},
      trends: {},
    };
  }

  // Calculate averages for the last 10 metrics
  const recent = metrics.slice(0, 10);
  
  const avgMetrics = {
    lcp: average(recent.map(m => m.lcp).filter(Boolean)),
    fid: average(recent.map(m => m.fid).filter(Boolean)),
    cls: average(recent.map(m => m.cls).filter(Boolean)),
    fcp: average(recent.map(m => m.fcp).filter(Boolean)),
    ttfb: average(recent.map(m => m.ttfb).filter(Boolean)),
    appLoadTime: average(recent.map(m => m.app_load_time).filter(Boolean)),
    apiResponseTime: average(recent.map(m => m.api_response_time).filter(Boolean)),
    memoryUsage: average(recent.map(m => m.memory_usage).filter(Boolean)),
    batteryLevel: average(recent.map(m => m.battery_level).filter(Boolean)),
  };

  return {
    coreWebVitals: {
      lcp: avgMetrics.lcp,
      fid: avgMetrics.fid,
      cls: avgMetrics.cls,
      fcp: avgMetrics.fcp,
      ttfb: avgMetrics.ttfb,
    },
    mobileMetrics: {
      appLoadTime: avgMetrics.appLoadTime,
      apiResponseTime: avgMetrics.apiResponseTime,
      memoryUsage: avgMetrics.memoryUsage,
      batteryLevel: avgMetrics.batteryLevel,
    },
    trends: calculateTrends(metrics),
    sampleSize: recent.length,
  };
}

async function generatePerformanceReport(sessionId: string, userId?: string): Promise<any> {
  // Implementation would generate comprehensive performance report
  return {
    sessionId,
    userId,
    generatedAt: new Date().toISOString(),
    summary: 'Performance report generated',
  };
}

async function getPerformanceRecommendations(sessionId: string, userId?: string): Promise<string[]> {
  // Implementation would analyze metrics and return personalized recommendations
  return [
    'Enable image compression and lazy loading',
    'Implement service worker for offline functionality',
    'Use code splitting to reduce initial bundle size',
    'Optimize API response caching',
  ];
}

async function getBenchmarkComparison(sessionId: string, userId?: string): Promise<any> {
  // Implementation would compare against industry benchmarks
  return {
    industry: 'Enterprise Software',
    percentile: 75,
    comparison: 'Above average performance',
  };
}

function parseTimeRange(timeRange: string): number | null {
  const ranges: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  
  return ranges[timeRange] || null;
}

function average(numbers: number[]): number | null {
  if (numbers.length === 0) return null;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

function calculateTrends(metrics: any[]): any {
  if (metrics.length < 2) return {};
  
  // Simple trend calculation (positive = improving, negative = degrading)
  const recent = metrics.slice(0, 5);
  const older = metrics.slice(5, 10);
  
  if (older.length === 0) return {};
  
  const recentAvg = {
    lcp: average(recent.map(m => m.lcp).filter(Boolean)) || 0,
    fid: average(recent.map(m => m.fid).filter(Boolean)) || 0,
    ttfb: average(recent.map(m => m.ttfb).filter(Boolean)) || 0,
  };
  
  const olderAvg = {
    lcp: average(older.map(m => m.lcp).filter(Boolean)) || 0,
    fid: average(older.map(m => m.fid).filter(Boolean)) || 0,
    ttfb: average(older.map(m => m.ttfb).filter(Boolean)) || 0,
  };
  
  return {
    lcp: recentAvg.lcp && olderAvg.lcp ? ((olderAvg.lcp - recentAvg.lcp) / olderAvg.lcp) * 100 : 0,
    fid: recentAvg.fid && olderAvg.fid ? ((olderAvg.fid - recentAvg.fid) / olderAvg.fid) * 100 : 0,
    ttfb: recentAvg.ttfb && olderAvg.ttfb ? ((olderAvg.ttfb - recentAvg.ttfb) / olderAvg.ttfb) * 100 : 0,
  };
}