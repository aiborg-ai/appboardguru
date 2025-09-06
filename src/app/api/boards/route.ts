/**
 * Boards API Routes
 * RESTful API endpoints for board management using CQRS
 */

import { NextRequest, NextResponse } from 'next/server';
import { commandBus } from '@/application/cqrs/command-bus';
import { ensureHandlersRegistered } from '@/infrastructure/register-handlers';
import { createBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { CreateBoardCommand } from '@/application/cqrs/commands/create-board.command';
import { ListBoardsQuery, SearchBoardsQuery, GetMyBoardsQuery } from '@/application/cqrs/queries/get-board.query';
import type { Board, BoardType } from '@/domain/entities/board.entity';
import type { UserId, OrganizationId } from '@/types/core';

// Ensure handlers are registered
ensureHandlersRegistered();

/**
 * GET /api/boards
 * List boards with optional filters
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
      const query = new SearchBoardsQuery({
        searchQuery,
        requestedBy: user.id as UserId,
        limit: parseInt(searchParams.get('limit') || '10')
      });

      const result = await commandBus.executeQuery<SearchBoardsQuery, Board[]>(query);

      if (!result.success) {
        console.error('[GET /api/boards] Search failed:', result.error);
        return NextResponse.json(
          { error: result.error?.message || 'Failed to search boards' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.data
      });
    }

    // Check if this is a "my boards" request
    const myBoards = searchParams.get('my') === 'true';
    if (myBoards) {
      const query = new GetMyBoardsQuery({
        userId: user.id as UserId,
        role: searchParams.get('role') as any
      });

      const result = await commandBus.executeQuery<GetMyBoardsQuery, Board[]>(query);

      if (!result.success) {
        console.error('[GET /api/boards] Get my boards failed:', result.error);
        return NextResponse.json(
          { error: result.error?.message || 'Failed to get your boards' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.data
      });
    }

    // Otherwise, list boards with filters
    const filters: any = {};

    if (searchParams.get('organizationId') || searchParams.get('organization_id')) {
      filters.organizationId = (searchParams.get('organizationId') || searchParams.get('organization_id')) as OrganizationId;
    }
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status')?.split(',');
    }
    if (searchParams.get('boardType')) {
      filters.boardType = searchParams.get('boardType')?.split(',');
    }
    if (searchParams.get('memberUserId')) {
      filters.memberUserId = searchParams.get('memberUserId') as UserId;
    }

    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') as any || 'desc';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Execute query
    const query = new ListBoardsQuery({
      requestedBy: user.id as UserId,
      filters,
      sortBy,
      sortOrder,
      limit,
      offset
    });

    const result = await commandBus.executeQuery<ListBoardsQuery, { boards: Board[]; total: number }>(query);

    if (!result.success) {
      console.error('[GET /api/boards] Query failed:', result.error);
      return NextResponse.json(
        { error: result.error?.message || 'Failed to fetch boards' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data.boards,
      boards: result.data.boards, // For backward compatibility
      total: result.data.total,
      limit,
      offset
    });

  } catch (error) {
    console.error('[GET /api/boards] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/boards
 * Create a new board
 */
export async function POST(request: NextRequest) {
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
    
    // Validate required fields
    if (!body.name || !body.organizationId) {
      return NextResponse.json(
        { error: 'Board name and organization ID are required' },
        { status: 400 }
      );
    }

    // Execute command
    const command = new CreateBoardCommand({
      name: body.name,
      organizationId: body.organizationId as OrganizationId,
      boardType: body.boardType as BoardType,
      description: body.description,
      settings: body.settings,
      termLength: body.termLength,
      initialMembers: body.initialMembers,
      createdBy: user.id as UserId
    });

    const result = await commandBus.executeCommand<CreateBoardCommand, Board>(command);

    if (!result.success) {
      console.error('[POST /api/boards] Command failed:', result.error);
      
      const errorMessage = result.error?.message || 'Failed to create board';
      if (errorMessage.toLowerCase().includes('already exists')) {
        return NextResponse.json(
          { error: errorMessage },
          { status: 409 }
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
    }, { status: 201 });

  } catch (error) {
    console.error('[POST /api/boards] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}