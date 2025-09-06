/**
 * User Statistics API Route
 * Get user statistics and analytics using CQRS
 */

import { NextRequest, NextResponse } from 'next/server';
import { commandBus } from '@/application/cqrs/command-bus';
import { ensureHandlersRegistered } from '@/infrastructure/register-handlers';
import { createBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { GetUserStatisticsQuery } from '@/application/cqrs/queries/get-user.query';
import type { UserStatistics } from '@/application/interfaces/repositories/user.repository.interface';
import type { UserId, OrganizationId } from '@/types/core';

// Ensure handlers are registered
ensureHandlersRegistered();

/**
 * GET /api/users/statistics
 * Get user statistics (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const cookieStore = cookies();
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId') as OrganizationId | null;
    
    let dateRange: { from: Date; to: Date } | undefined;
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    
    if (fromDate && toDate) {
      dateRange = {
        from: new Date(fromDate),
        to: new Date(toDate)
      };
    }

    // Execute query
    const query = new GetUserStatisticsQuery({
      requestedBy: user.id as UserId,
      organizationId: organizationId || undefined,
      dateRange
    });

    const result = await commandBus.executeQuery<GetUserStatisticsQuery, UserStatistics>(query);

    if (!result.success) {
      console.error('[GET /api/users/statistics] Query failed:', result.error);
      
      if (result.error?.message?.includes('permission')) {
        return NextResponse.json(
          { error: 'You do not have permission to view user statistics' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: result.error?.message || 'Failed to fetch statistics' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('[GET /api/users/statistics] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}