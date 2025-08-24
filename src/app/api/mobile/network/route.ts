/**
 * Mobile Network API Endpoint
 * Provides network-aware optimizations and recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

interface NetworkInfo {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface NetworkOptimizations {
  cacheStrategy: string;
  compressionLevel: string;
  imageQuality: string;
  prefetchStrategy: string;
  syncFrequency: string;
  batchSize: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Extract network information from headers
    const networkInfo: NetworkInfo = {
      type: request.headers.get('connection-type') || undefined,
      effectiveType: request.headers.get('effective-type') || undefined,
      downlink: parseFloat(request.headers.get('downlink') || '0') || undefined,
      rtt: parseInt(request.headers.get('rtt') || '0') || undefined,
      saveData: request.headers.get('save-data') === 'on',
    };

    // Generate network-specific optimizations
    const optimizations = generateNetworkOptimizations(networkInfo);
    
    // Get recommendations based on network conditions
    const recommendations = getNetworkRecommendations(networkInfo);

    return NextResponse.json({
      networkInfo,
      optimizations,
      recommendations,
      timestamp: Date.now(),
      online: true, // In a real implementation, this would be detected
    });

  } catch (error) {
    console.error('Network info error:', error);
    return NextResponse.json(
      { error: 'Failed to get network information' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, networkInfo, preferences } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    
    // Store network preferences and optimizations
    const { data, error } = await supabase
      .from('users')
      .update({
        network_preferences: {
          ...preferences,
          lastNetworkInfo: networkInfo,
          updatedAt: new Date().toISOString(),
        },
      })
      .eq('id', userId)
      .select('network_preferences')
      .single();

    if (error) {
      throw error;
    }

    // Generate optimizations based on new preferences
    const optimizations = generateNetworkOptimizations(networkInfo, preferences);

    return NextResponse.json({
      success: true,
      optimizations,
      preferences: data.network_preferences,
      message: 'Network preferences updated',
    });

  } catch (error) {
    console.error('Network preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to update network preferences' },
      { status: 500 }
    );
  }
}

// Test network quality and provide optimization suggestions
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await request.json();

    // Perform network quality test
    const testResults = await performNetworkQualityTest(request);
    
    // Generate specific recommendations based on test results
    const recommendations = generateOptimizationRecommendations(testResults);

    return NextResponse.json({
      testResults,
      recommendations,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Network test error:', error);
    return NextResponse.json(
      { error: 'Failed to perform network test' },
      { status: 500 }
    );
  }
}

/**
 * Generate network-specific optimizations
 */
function generateNetworkOptimizations(networkInfo: NetworkInfo, preferences?: any): NetworkOptimizations {
  const optimizations: NetworkOptimizations = {
    cacheStrategy: 'stale-while-revalidate',
    compressionLevel: 'medium',
    imageQuality: 'medium',
    prefetchStrategy: 'critical-only',
    syncFrequency: 'every-15-minutes',
    batchSize: 10,
  };

  // Optimize based on effective connection type
  switch (networkInfo.effectiveType) {
    case 'slow-2g':
    case '2g':
      optimizations.cacheStrategy = 'cache-first';
      optimizations.compressionLevel = 'maximum';
      optimizations.imageQuality = 'low';
      optimizations.prefetchStrategy = 'none';
      optimizations.syncFrequency = 'manual-only';
      optimizations.batchSize = 3;
      break;
      
    case '3g':
      optimizations.cacheStrategy = 'stale-while-revalidate';
      optimizations.compressionLevel = 'high';
      optimizations.imageQuality = 'medium';
      optimizations.prefetchStrategy = 'critical-only';
      optimizations.syncFrequency = 'every-30-minutes';
      optimizations.batchSize = 5;
      break;
      
    case '4g':
      optimizations.cacheStrategy = 'network-first';
      optimizations.compressionLevel = 'medium';
      optimizations.imageQuality = 'high';
      optimizations.prefetchStrategy = 'intelligent';
      optimizations.syncFrequency = 'every-15-minutes';
      optimizations.batchSize = 15;
      break;
      
    case '5g':
      optimizations.cacheStrategy = 'network-first';
      optimizations.compressionLevel = 'low';
      optimizations.imageQuality = 'original';
      optimizations.prefetchStrategy = 'aggressive';
      optimizations.syncFrequency = 'real-time';
      optimizations.batchSize = 25;
      break;
  }

  // Adjust for connection type
  if (networkInfo.type === 'cellular') {
    optimizations.compressionLevel = 'high';
    optimizations.batchSize = Math.min(optimizations.batchSize, 10);
  }

  // Adjust for save-data preference
  if (networkInfo.saveData) {
    optimizations.compressionLevel = 'maximum';
    optimizations.imageQuality = 'low';
    optimizations.prefetchStrategy = 'none';
    optimizations.syncFrequency = 'manual-only';
    optimizations.batchSize = Math.min(optimizations.batchSize, 5);
  }

  // Adjust for RTT (latency)
  if (networkInfo.rtt && networkInfo.rtt > 1000) { // High latency
    optimizations.cacheStrategy = 'cache-first';
    optimizations.batchSize = Math.max(optimizations.batchSize, 20); // Batch more requests
  }

  // Adjust for downlink speed
  if (networkInfo.downlink && networkInfo.downlink < 1) { // < 1 Mbps
    optimizations.compressionLevel = 'maximum';
    optimizations.imageQuality = 'low';
    optimizations.batchSize = Math.min(optimizations.batchSize, 5);
  }

  return optimizations;
}

/**
 * Get network-specific recommendations
 */
function getNetworkRecommendations(networkInfo: NetworkInfo): string[] {
  const recommendations: string[] = [];

  if (networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g') {
    recommendations.push(
      'Switch to offline mode when possible',
      'Enable maximum data compression',
      'Disable image loading unless necessary',
      'Use text-only mode for better performance',
      'Consider connecting to WiFi for data-heavy operations'
    );
  } else if (networkInfo.effectiveType === '3g') {
    recommendations.push(
      'Enable high compression for faster loading',
      'Batch operations to reduce round trips',
      'Use moderate image quality settings',
      'Prefer cached content when available'
    );
  } else if (networkInfo.effectiveType === '4g') {
    recommendations.push(
      'Normal operation with smart caching',
      'Enable prefetching for commonly used content',
      'Use high-quality images for better experience'
    );
  }

  if (networkInfo.saveData) {
    recommendations.push(
      'Data saver mode is active - using minimal data consumption',
      'Images and videos are compressed for data savings',
      'Background sync is reduced to save data'
    );
  }

  if (networkInfo.type === 'cellular') {
    recommendations.push(
      'Cellular connection detected - monitoring data usage',
      'Large file operations will be queued for WiFi',
      'Consider connecting to WiFi for better performance'
    );
  }

  if (networkInfo.rtt && networkInfo.rtt > 500) {
    recommendations.push(
      'High latency detected - batching requests for efficiency',
      'Using aggressive caching to reduce round trips'
    );
  }

  if (networkInfo.downlink && networkInfo.downlink < 2) {
    recommendations.push(
      'Slow connection detected - enabling high compression',
      'Large content will be loaded on demand',
      'Consider using offline mode for better experience'
    );
  }

  return recommendations;
}

/**
 * Perform network quality test
 */
async function performNetworkQualityTest(request: NextRequest): Promise<{
  latency: number;
  bandwidth: number;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  recommendations: string[];
}> {
  // In a real implementation, this would perform actual network tests
  // For now, we'll use the network information from headers to estimate

  const rtt = parseInt(request.headers.get('rtt') || '100');
  const downlink = parseFloat(request.headers.get('downlink') || '10');
  const effectiveType = request.headers.get('effective-type') || '4g';

  let quality: 'poor' | 'fair' | 'good' | 'excellent';
  const recommendations: string[] = [];

  if (effectiveType === 'slow-2g' || effectiveType === '2g') {
    quality = 'poor';
    recommendations.push(
      'Network quality is poor - consider offline mode',
      'Enable maximum compression and minimal UI',
      'Defer all non-essential operations'
    );
  } else if (effectiveType === '3g') {
    quality = 'fair';
    recommendations.push(
      'Network quality is fair - use moderate optimizations',
      'Enable compression and smart caching',
      'Batch operations when possible'
    );
  } else if (effectiveType === '4g') {
    quality = 'good';
    recommendations.push(
      'Network quality is good - normal operations',
      'Enable smart prefetching for better UX'
    );
  } else {
    quality = 'excellent';
    recommendations.push(
      'Network quality is excellent - full functionality available',
      'Enable all features and high-quality content'
    );
  }

  return {
    latency: rtt,
    bandwidth: downlink,
    quality,
    recommendations,
  };
}

/**
 * Generate optimization recommendations based on test results
 */
function generateOptimizationRecommendations(testResults: any): string[] {
  const recommendations: string[] = [];

  if (testResults.quality === 'poor') {
    recommendations.push(
      'Enable offline-first mode',
      'Use maximum compression for all content',
      'Disable automatic media loading',
      'Queue operations for better network conditions'
    );
  } else if (testResults.quality === 'fair') {
    recommendations.push(
      'Enable smart caching strategies',
      'Use moderate compression levels',
      'Batch API requests to reduce overhead',
      'Prefetch only critical content'
    );
  } else if (testResults.quality === 'good') {
    recommendations.push(
      'Use intelligent prefetching',
      'Enable background synchronization',
      'Load high-quality images',
      'Use real-time features'
    );
  } else {
    recommendations.push(
      'All features available at full quality',
      'Enable aggressive prefetching',
      'Use real-time collaboration features',
      'Load original quality media'
    );
  }

  return recommendations;
}