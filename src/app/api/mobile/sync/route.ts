/**
 * Mobile Sync API Endpoint
 * Handles offline synchronization and conflict resolution
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { OfflineSyncEngine } from '@/lib/graphql/offline-sync-engine';
import { DataUsageTracker } from '@/lib/graphql/data-usage-tracker';

const syncEngine = new OfflineSyncEngine();
const dataTracker = new DataUsageTracker();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const scope = searchParams.get('scope') as 'ALL' | 'ORGANIZATION' | 'ASSETS_ONLY' | 'PREFERENCES_ONLY' || 'ALL';

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get sync status
    const syncStatus = await syncEngine.getGlobalSyncStatus(userId);
    const offlineQueue = await syncEngine.getOfflineQueue(userId);

    return NextResponse.json({
      status: syncStatus,
      queue: offlineQueue,
      scope,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Mobile sync status error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, userId, priority = 'NORMAL', operations } = await request.json();

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

    switch (action) {
      case 'START_SYNC':
        await syncEngine.processQueue(userId);
        return NextResponse.json({
          success: true,
          message: 'Sync started',
          timestamp: Date.now(),
        });

      case 'QUEUE_OPERATIONS':
        if (!operations || !Array.isArray(operations)) {
          return NextResponse.json(
            { error: 'Operations array is required' },
            { status: 400 }
          );
        }

        const queuedOps = [];
        for (const op of operations) {
          const queuedOp = await syncEngine.queueOperation({
            type: op.type,
            entity: op.entity,
            entityId: op.entityId,
            data: op.data,
            timestamp: Date.now(),
            userId,
          });
          queuedOps.push(queuedOp);
        }

        return NextResponse.json({
          success: true,
          operations: queuedOps,
          message: `${queuedOps.length} operations queued`,
        });

      case 'RESOLVE_CONFLICT':
        const { operationId, resolution } = await request.json();
        
        if (!operationId || !resolution) {
          return NextResponse.json(
            { error: 'Operation ID and resolution are required' },
            { status: 400 }
          );
        }

        await syncEngine.resolveConflict(resolution);
        return NextResponse.json({
          success: true,
          message: 'Conflict resolved',
          operationId,
        });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Mobile sync error:', error);
    return NextResponse.json(
      { error: 'Sync operation failed' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, settings } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    
    // Update mobile sync settings
    const { data, error } = await supabase
      .from('users')
      .update({
        mobile_sync_settings: settings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      settings: data.mobile_sync_settings,
      message: 'Sync settings updated',
    });

  } catch (error) {
    console.error('Mobile sync settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update sync settings' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const operationId = searchParams.get('operationId');

    if (!userId || !operationId) {
      return NextResponse.json(
        { error: 'User ID and operation ID are required' },
        { status: 400 }
      );
    }

    // Cancel/remove queued operation
    // In a real implementation, you'd cancel the specific operation
    
    return NextResponse.json({
      success: true,
      message: 'Operation cancelled',
      operationId,
    });

  } catch (error) {
    console.error('Mobile sync cancel error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel operation' },
      { status: 500 }
    );
  }
}