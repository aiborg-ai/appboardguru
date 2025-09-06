/**
 * Meeting Detail API Routes
 * RESTful API endpoints for individual meeting operations using CQRS
 */

import { NextRequest, NextResponse } from 'next/server';
import { commandBus } from '@/application/cqrs/command-bus';
import { ensureHandlersRegistered } from '@/infrastructure/register-handlers';
import { createBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { GetMeetingQuery } from '@/application/cqrs/queries/get-meeting.query';
import { 
  StartMeetingCommand,
  EndMeetingCommand,
  CancelMeetingCommand,
  UpdateAttendeeStatusCommand,
  AddMeetingMinutesCommand
} from '@/application/cqrs/commands/manage-meeting.command';
import type { Meeting } from '@/domain/entities/meeting.entity';
import type { MeetingId, UserId } from '@/types/core';

// Ensure handlers are registered
ensureHandlersRegistered();

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/meetings/[id]
 * Get a specific meeting by ID
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

    const meetingId = params.id as MeetingId;

    // Execute query
    const query = new GetMeetingQuery({
      meetingId,
      userId: user.id as UserId
    });

    const result = await commandBus.executeQuery<GetMeetingQuery, Meeting>(query);

    if (!result.success) {
      console.error('[GET /api/meetings/[id]] Query failed:', result.error);
      return NextResponse.json(
        { error: result.error?.message || 'Failed to fetch meeting' },
        { status: result.error?.message?.includes('not found') ? 404 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('[GET /api/meetings/[id]] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/meetings/[id]
 * Update meeting status or details
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

    const meetingId = params.id as MeetingId;
    const body = await request.json();

    // Handle different types of updates based on the action
    let command: any;
    let result: any;

    switch (body.action) {
      case 'start':
        command = new StartMeetingCommand({
          meetingId,
          startedBy: user.id as UserId,
          actualStart: new Date()
        });
        result = await commandBus.executeCommand<StartMeetingCommand, Meeting>(command);
        break;

      case 'end':
        command = new EndMeetingCommand({
          meetingId,
          endedBy: user.id as UserId,
          actualEnd: new Date(),
          summary: body.summary
        });
        result = await commandBus.executeCommand<EndMeetingCommand, Meeting>(command);
        break;

      case 'cancel':
        command = new CancelMeetingCommand({
          meetingId,
          cancelledBy: user.id as UserId,
          reason: body.reason || 'Meeting cancelled'
        });
        result = await commandBus.executeCommand<CancelMeetingCommand, Meeting>(command);
        break;

      case 'updateAttendee':
        if (!body.attendeeId || !body.status) {
          return NextResponse.json(
            { error: 'Attendee ID and status are required' },
            { status: 400 }
          );
        }
        command = new UpdateAttendeeStatusCommand({
          meetingId,
          attendeeId: body.attendeeId as UserId,
          status: body.status,
          updatedBy: user.id as UserId
        });
        result = await commandBus.executeCommand<UpdateAttendeeStatusCommand, Meeting>(command);
        break;

      case 'addMinutes':
        if (!body.content) {
          return NextResponse.json(
            { error: 'Minutes content is required' },
            { status: 400 }
          );
        }
        command = new AddMeetingMinutesCommand({
          meetingId,
          minutes: {
            content: body.content,
            decisions: body.decisions,
            actionItems: body.actionItems,
            attachments: body.attachments
          },
          addedBy: user.id as UserId
        });
        result = await commandBus.executeCommand<AddMeetingMinutesCommand, Meeting>(command);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Valid actions are: start, end, cancel, updateAttendee, addMinutes' },
          { status: 400 }
        );
    }

    if (!result.success) {
      console.error('[PATCH /api/meetings/[id]] Command failed:', result.error);
      return NextResponse.json(
        { error: result.error?.message || 'Failed to update meeting' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('[PATCH /api/meetings/[id]] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/meetings/[id]
 * Cancel a meeting
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

    const meetingId = params.id as MeetingId;
    const { reason } = await request.json().catch(() => ({ reason: 'Meeting cancelled' }));

    // Execute cancel command
    const command = new CancelMeetingCommand({
      meetingId,
      cancelledBy: user.id as UserId,
      reason
    });

    const result = await commandBus.executeCommand<CancelMeetingCommand, Meeting>(command);

    if (!result.success) {
      console.error('[DELETE /api/meetings/[id]] Command failed:', result.error);
      return NextResponse.json(
        { error: result.error?.message || 'Failed to cancel meeting' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Meeting cancelled successfully',
      data: result.data
    });

  } catch (error) {
    console.error('[DELETE /api/meetings/[id]] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}