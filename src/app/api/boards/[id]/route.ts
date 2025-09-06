/**
 * Individual Board API Routes
 * RESTful API endpoints for individual board operations using CQRS
 */

import { NextRequest, NextResponse } from 'next/server';
import { commandBus } from '@/application/cqrs/command-bus';
import { ensureHandlersRegistered } from '@/infrastructure/register-handlers';
import { createBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { GetBoardQuery } from '@/application/cqrs/queries/get-board.query';
import { UpdateBoardCommand, ArchiveBoardCommand } from '@/application/cqrs/commands/manage-board.command';
import type { Board } from '@/domain/entities/board.entity';
import type { BoardId, UserId } from '@/types/core';

// Ensure handlers are registered
ensureHandlersRegistered();

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/boards/[id]
 * Get a specific board by ID
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
    const query = new GetBoardQuery({
      boardId: params.id as BoardId,
      requestedBy: user.id as UserId
    });

    const result = await commandBus.executeQuery<GetBoardQuery, Board>(query);

    if (!result.success) {
      console.error('[GET /api/boards/[id]] Query failed:', result.error);
      
      const errorMessage = result.error?.message || 'Failed to fetch board';
      if (errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('access denied')) {
        return NextResponse.json(
          { error: errorMessage },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('[GET /api/boards/[id]] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/boards/[id]
 * Update a board
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
    const command = new UpdateBoardCommand({
      boardId: params.id as BoardId,
      updates: body,
      updatedBy: user.id as UserId
    });

    const result = await commandBus.executeCommand<UpdateBoardCommand, Board>(command);

    if (!result.success) {
      console.error('[PATCH /api/boards/[id]] Command failed:', result.error);
      
      const errorMessage = result.error?.message || 'Failed to update board';
      if (errorMessage.toLowerCase().includes('permission')) {
        return NextResponse.json(
          { error: errorMessage },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('[PATCH /api/boards/[id]] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/boards/[id]
 * Archive a board
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

    // Parse request body for archive reason
    const body = await request.json().catch(() => ({ reason: 'No reason provided' }));

    // Execute command
    const command = new ArchiveBoardCommand({
      boardId: params.id as BoardId,
      reason: body.reason || 'Board archived by user request',
      archivedBy: user.id as UserId
    });

    const result = await commandBus.executeCommand<ArchiveBoardCommand, void>(command);

    if (!result.success) {
      console.error('[DELETE /api/boards/[id]] Command failed:', result.error);
      
      const errorMessage = result.error?.message || 'Failed to archive board';
      if (errorMessage.toLowerCase().includes('permission') || errorMessage.toLowerCase().includes('chairman')) {
        return NextResponse.json(
          { error: errorMessage },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Board archived successfully'
    });

  } catch (error) {
    console.error('[DELETE /api/boards/[id]] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}