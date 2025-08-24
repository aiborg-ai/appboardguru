/**
 * Mobile Data Usage API Endpoint
 * Tracks and manages data consumption for mobile optimization
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { DataUsageTracker } from '@/lib/graphql/data-usage-tracker';

const dataTracker = new DataUsageTracker();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const period = searchParams.get('period') || 'current';

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    
    // Verify user
    const { data: user } = await supabase.auth.getUser();
    if (!user.user || user.user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get usage statistics
    const stats = await dataTracker.getUsageStats(userId);
    
    // Get network recommendations
    const networkContext = {
      connectionType: request.headers.get('connection-type') || 'unknown',
      effectiveType: request.headers.get('effective-type') || '4g',
      downlink: parseFloat(request.headers.get('downlink') || '10'),
      rtt: parseInt(request.headers.get('rtt') || '100'),
      saveData: request.headers.get('save-data') === 'on',
    };

    const recommendations = dataTracker.getNetworkRecommendations(networkContext);

    return NextResponse.json({
      stats,
      recommendations,
      networkContext,
      limits: {
        daily: 50 * 1024 * 1024, // Would be configurable per user
        monthly: 1024 * 1024 * 1024,
      },
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Data usage stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get data usage stats' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, operation, bytes, type = 'other' } = await request.json();

    if (!userId || !operation || !bytes) {
      return NextResponse.json(
        { error: 'User ID, operation, and bytes are required' },
        { status: 400 }
      );
    }

    // Record data usage
    dataTracker.recordDataUsage(operation, bytes, userId, type);

    return NextResponse.json({
      success: true,
      message: 'Data usage recorded',
      operation,
      bytes,
      type,
    });

  } catch (error) {
    console.error('Data usage recording error:', error);
    return NextResponse.json(
      { error: 'Failed to record data usage' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, mode, dailyLimit, monthlyLimit } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    
    // Update user's data usage preferences
    const updates: any = {};
    
    if (mode) {
      updates.data_usage_mode = mode;
      // Optimize tracker for the new mode
      await dataTracker.optimizeForDataMode(mode, userId);
    }
    
    if (dailyLimit !== undefined) {
      updates.daily_data_limit = dailyLimit;
    }
    
    if (monthlyLimit !== undefined) {
      updates.monthly_data_limit = monthlyLimit;
    }

    if (Object.keys(updates).length > 0) {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update tracker limits if provided
      if (dailyLimit !== undefined && monthlyLimit !== undefined) {
        dataTracker.setUsageLimits(dailyLimit, monthlyLimit);
      }

      return NextResponse.json({
        success: true,
        settings: {
          dataUsageMode: data.data_usage_mode,
          dailyLimit: data.daily_data_limit,
          monthlyLimit: data.monthly_data_limit,
        },
        message: 'Data usage settings updated',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'No changes made',
    });

  } catch (error) {
    console.error('Data usage settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update data usage settings' },
      { status: 500 }
    );
  }
}

// Get data usage alerts
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // In a real implementation, you'd fetch alerts from the database
    const alerts = [
      // Mock alerts for demonstration
      {
        type: 'APPROACHING_LIMIT',
        message: 'You have used 80% of your daily data limit',
        threshold: 50 * 1024 * 1024,
        currentUsage: 40 * 1024 * 1024,
        suggestions: [
          'Enable data compression',
          'Switch to offline mode for non-critical tasks',
          'Connect to WiFi if available',
        ],
        timestamp: Date.now() - 30 * 60 * 1000, // 30 minutes ago
      },
      {
        type: 'SAVINGS_OPPORTUNITY',
        message: 'You could save data by enabling higher compression',
        threshold: 0,
        currentUsage: 0,
        suggestions: [
          'Enable maximum compression in settings',
          'Use WiFi-only sync for large files',
          'Enable aggressive caching',
        ],
        timestamp: Date.now() - 60 * 60 * 1000, // 1 hour ago
      },
    ];

    return NextResponse.json({
      alerts,
      count: alerts.length,
      unreadCount: alerts.filter(alert => 
        Date.now() - alert.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
      ).length,
    });

  } catch (error) {
    console.error('Data usage alerts error:', error);
    return NextResponse.json(
      { error: 'Failed to get data usage alerts' },
      { status: 500 }
    );
  }
}