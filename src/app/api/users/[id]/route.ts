/**
 * Individual User API Routes
 * RESTful API endpoints for individual user operations using CQRS
 */

import { NextRequest, NextResponse } from 'next/server';
import { commandBus } from '@/application/cqrs/command-bus';
import { ensureHandlersRegistered } from '@/infrastructure/register-handlers';
import { createBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { GetUserQuery } from '@/application/cqrs/queries/get-user.query';
import { UpdateUserCommand, DeleteUserCommand } from '@/application/cqrs/commands/update-user.command';
import type { User } from '@/domain/entities/user.entity';
import type { UserId } from '@/types/core';

// Ensure handlers are registered
ensureHandlersRegistered();

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/users/[id]
 * Get a specific user by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Execute query
    const query = new GetUserQuery({
      userId: params.id as UserId,
      requestedBy: user.id as UserId
    });

    const result = await commandBus.executeQuery<GetUserQuery, User>(query);

    if (!result.success) {
      console.error('[GET /api/users/[id]] Query failed:', result.error);
      return NextResponse.json(
        { error: result.error?.message || 'Failed to fetch user' },
        { status: result.error?.message?.includes('not found') ? 404 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('[GET /api/users/[id]] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/[id]
 * Update a user
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    // Parse request body
    const body = await request.json();

    // Execute command
    const command = new UpdateUserCommand({
      userId: params.id as UserId,
      updates: body,
      updatedBy: user.id as UserId
    });

    const result = await commandBus.executeCommand<UpdateUserCommand, User>(command);

    if (!result.success) {
      console.error('[PATCH /api/users/[id]] Command failed:', result.error);
      return NextResponse.json(
        { error: result.error?.message || 'Failed to update user' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('[PATCH /api/users/[id]] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id]
 * Delete a user (soft delete)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Execute command
    const command = new DeleteUserCommand({
      userId: params.id as UserId,
      deletedBy: user.id as UserId
    });

    const result = await commandBus.executeCommand<DeleteUserCommand, void>(command);

    if (!result.success) {
      console.error('[DELETE /api/users/[id]] Command failed:', result.error);
      return NextResponse.json(
        { error: result.error?.message || 'Failed to delete user' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('[DELETE /api/users/[id]] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}