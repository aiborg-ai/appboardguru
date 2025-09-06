/**
 * Meeting API Routes
 * RESTful API endpoints for meeting management using CQRS
 */

import { NextRequest, NextResponse } from 'next/server';
import { commandBus } from '@/application/cqrs/command-bus';
import { ensureHandlersRegistered } from '@/infrastructure/register-handlers';
import { createBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ScheduleMeetingCommand } from '@/application/cqrs/commands/schedule-meeting.command';
import { ListMeetingsQuery } from '@/application/cqrs/queries/get-meeting.query';
import type { Meeting } from '@/domain/entities/meeting.entity';
import type { UserId, BoardId, OrganizationId } from '@/types/core';

// Ensure handlers are registered
ensureHandlersRegistered();

/**
 * GET /api/meetings
 * List meetings with optional filters
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
    const filters: any = {};

    if (searchParams.get('boardId')) {
      filters.boardId = searchParams.get('boardId') as BoardId;
    }
    if (searchParams.get('organizationId')) {
      filters.organizationId = searchParams.get('organizationId') as OrganizationId;
    }
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status')?.split(',');
    }
    if (searchParams.get('type')) {
      filters.type = searchParams.get('type')?.split(',');
    }
    if (searchParams.get('fromDate')) {
      filters.fromDate = new Date(searchParams.get('fromDate')!);
    }
    if (searchParams.get('toDate')) {
      filters.toDate = new Date(searchParams.get('toDate')!);
    }
    if (searchParams.get('search')) {
      filters.searchQuery = searchParams.get('search');
    }

    const sortBy = searchParams.get('sortBy') as any || 'scheduledStart';
    const sortOrder = searchParams.get('sortOrder') as any || 'asc';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Execute query
    const query = new ListMeetingsQuery({
      userId: user.id as UserId,
      filters,
      sortBy,
      sortOrder,
      limit,
      offset
    });

    const result = await commandBus.executeQuery<ListMeetingsQuery, { meetings: Meeting[]; total: number }>(query);

    if (!result.success) {
      console.error('[GET /api/meetings] Query failed:', result.error);
      return NextResponse.json(
        { error: result.error?.message || 'Failed to fetch meetings' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data.meetings,
      total: result.data.total,
      limit,
      offset
    });

  } catch (error) {
    console.error('[GET /api/meetings] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/meetings
 * Schedule a new meeting
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
    if (!body.title || !body.type || !body.boardId || !body.organizationId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!body.scheduledStart || !body.scheduledEnd) {
      return NextResponse.json(
        { error: 'Meeting schedule is required' },
        { status: 400 }
      );
    }

    if (!body.location || !body.location.type) {
      return NextResponse.json(
        { error: 'Meeting location is required' },
        { status: 400 }
      );
    }

    if (!body.attendees || body.attendees.length === 0) {
      return NextResponse.json(
        { error: 'At least one attendee is required' },
        { status: 400 }
      );
    }

    // Execute command
    const command = new ScheduleMeetingCommand({
      input: {
        title: body.title,
        description: body.description,
        type: body.type,
        boardId: body.boardId as BoardId,
        organizationId: body.organizationId as OrganizationId,
        scheduledStart: new Date(body.scheduledStart),
        scheduledEnd: new Date(body.scheduledEnd),
        location: body.location,
        attendees: body.attendees.map((a: any) => ({
          userId: a.userId as UserId,
          role: a.role
        })),
        agendaItems: body.agendaItems,
        quorumRequired: body.quorumRequired || 1,
        chairperson: body.chairperson as UserId | undefined,
        secretary: body.secretary as UserId | undefined,
        recurrence: body.recurrence,
        tags: body.tags,
        sendInvitations: body.sendInvitations !== false,
        checkConflicts: body.checkConflicts !== false
      },
      scheduledBy: user.id as UserId
    });

    const result = await commandBus.executeCommand<ScheduleMeetingCommand, Meeting>(command);

    if (!result.success) {
      console.error('[POST /api/meetings] Command failed:', result.error);
      return NextResponse.json(
        { error: result.error?.message || 'Failed to schedule meeting' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    }, { status: 201 });

  } catch (error) {
    console.error('[POST /api/meetings] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}