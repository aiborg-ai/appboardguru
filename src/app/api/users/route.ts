/**
 * Users API Routes
 * RESTful API endpoints for user management using CQRS
 */

import { NextRequest, NextResponse } from 'next/server';
import { commandBus } from '@/application/cqrs/command-bus';
import { ensureHandlersRegistered } from '@/infrastructure/register-handlers';
import { createBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ListUsersQuery, SearchUsersQuery } from '@/application/cqrs/queries/get-user.query';
import type { User } from '@/domain/entities/user.entity';
import type { UserId, OrganizationId } from '@/types/core';

// Ensure handlers are registered
ensureHandlersRegistered();

/**
 * GET /api/users
 * List users with optional filters (admin only)
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
    
    // Check if this is a search request
    const searchQuery = searchParams.get('search');
    if (searchQuery) {
      const query = new SearchUsersQuery({
        searchQuery,
        requestedBy: user.id as UserId,
        limit: parseInt(searchParams.get('limit') || '10')
      });

      const result = await commandBus.executeQuery<SearchUsersQuery, User[]>(query);

      if (!result.success) {
        console.error('[GET /api/users] Search failed:', result.error);
        return NextResponse.json(
          { error: result.error?.message || 'Failed to search users' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.data
      });
    }

    // Otherwise, list users with filters
    const filters: any = {};

    if (searchParams.get('organizationId')) {
      filters.organizationId = searchParams.get('organizationId') as OrganizationId;
    }
    if (searchParams.get('role')) {
      filters.role = searchParams.get('role')?.split(',');
    }
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status')?.split(',');
    }
    if (searchParams.get('emailVerified')) {
      filters.emailVerified = searchParams.get('emailVerified') === 'true';
    }

    const sortBy = searchParams.get('sortBy') as any || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') as any || 'desc';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Execute query
    const query = new ListUsersQuery({
      requestedBy: user.id as UserId,
      filters,
      sortBy,
      sortOrder,
      limit,
      offset
    });

    const result = await commandBus.executeQuery<ListUsersQuery, { users: User[]; total: number }>(query);

    if (!result.success) {
      console.error('[GET /api/users] Query failed:', result.error);
      return NextResponse.json(
        { error: result.error?.message || 'Failed to fetch users' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data.users,
      total: result.data.total,
      limit,
      offset
    });

  } catch (error) {
    console.error('[GET /api/users] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}