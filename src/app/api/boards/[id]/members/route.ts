/**
 * Board Members API Routes
 * RESTful API endpoints for board member management using CQRS
 */

import { NextRequest, NextResponse } from 'next/server';
import { commandBus } from '@/application/cqrs/command-bus';
import { ensureHandlersRegistered } from '@/infrastructure/register-handlers';
import { createBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { AddBoardMemberCommand, RemoveBoardMemberCommand } from '@/application/cqrs/commands/manage-board.command';
import { GetBoardQuery } from '@/application/cqrs/queries/get-board.query';
import type { Board, BoardMemberRole } from '@/domain/entities/board.entity';
import type { BoardId, UserId } from '@/types/core';

// Ensure handlers are registered
ensureHandlersRegistered();

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/boards/[id]/members
 * Get board members
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

    // Get the board
    const query = new GetBoardQuery({
      boardId: params.id as BoardId,
      requestedBy: user.id as UserId
    });

    const result = await commandBus.executeQuery<GetBoardQuery, Board>(query);

    if (!result.success) {
      console.error('[GET /api/boards/[id]/members] Query failed:', result.error);
      return NextResponse.json(
        { error: result.error?.message || 'Failed to fetch board' },
        { status: 400 }
      );
    }

    const board = result.data;
    const members = board.getMembers();

    return NextResponse.json({
      success: true,
      data: members.map(member => ({
        userId: member.userId,
        role: member.role,
        joinedAt: member.joinedAt,
        isVotingMember: member.isVotingMember,
        committees: member.committees,
        termEndDate: member.termEndDate,
        attendanceRate: member.attendanceRate,
        hasVotingRights: member.hasVotingRights(),
        isLeadership: member.isLeadership(),
        isTermExpired: member.isTermExpired()
      })),
      total: members.length
    });

  } catch (error) {
    console.error('[GET /api/boards/[id]/members] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/boards/[id]/members
 * Add a member to the board
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    if (!body.userId || !body.role) {
      return NextResponse.json(
        { error: 'User ID and role are required' },
        { status: 400 }
      );
    }

    // Execute command
    const command = new AddBoardMemberCommand({
      boardId: params.id as BoardId,
      userId: body.userId as UserId,
      role: body.role as BoardMemberRole,
      isVotingMember: body.isVotingMember,
      committees: body.committees,
      termEndDate: body.termEndDate ? new Date(body.termEndDate) : undefined,
      addedBy: user.id as UserId
    });

    const result = await commandBus.executeCommand<AddBoardMemberCommand, void>(command);

    if (!result.success) {
      console.error('[POST /api/boards/[id]/members] Command failed:', result.error);
      
      const errorMessage = result.error?.message || 'Failed to add member';
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
      message: 'Member added successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('[POST /api/boards/[id]/members] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/boards/[id]/members/[userId]
 * Remove a member from the board
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

    // Parse request body for removal details
    const body = await request.json();

    // Validate required fields
    if (!body.userId || !body.reason) {
      return NextResponse.json(
        { error: 'User ID and removal reason are required' },
        { status: 400 }
      );
    }

    // Execute command
    const command = new RemoveBoardMemberCommand({
      boardId: params.id as BoardId,
      userId: body.userId as UserId,
      reason: body.reason,
      removedBy: user.id as UserId
    });

    const result = await commandBus.executeCommand<RemoveBoardMemberCommand, void>(command);

    if (!result.success) {
      console.error('[DELETE /api/boards/[id]/members] Command failed:', result.error);
      
      const errorMessage = result.error?.message || 'Failed to remove member';
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
      message: 'Member removed successfully'
    });

  } catch (error) {
    console.error('[DELETE /api/boards/[id]/members] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}