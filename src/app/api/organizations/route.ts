/**
 * Organization API Routes
 * RESTful API endpoints for organization management using CQRS
 */

import { NextRequest, NextResponse } from 'next/server';
import { commandBus } from '@/application/cqrs/command-bus';
import { ensureHandlersRegistered } from '@/infrastructure/register-handlers';
import { createBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { CreateOrganizationCommand } from '@/application/cqrs/commands/create-organization.command';
import { ListOrganizationsQuery, GetMyOrganizationsQuery } from '@/application/cqrs/queries/get-organization.query';
import type { Organization } from '@/domain/entities/organization.entity';
import type { UserId } from '@/types/core';

// Ensure handlers are registered
ensureHandlersRegistered();

/**
 * GET /api/organizations
 * List organizations with optional filters
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
    const myOrgs = searchParams.get('my') === 'true';

    if (myOrgs) {
      // Get user's organizations
      const role = searchParams.get('role') as any;
      const limit = parseInt(searchParams.get('limit') || '20');
      const offset = parseInt(searchParams.get('offset') || '0');

      const query = new GetMyOrganizationsQuery({
        userId: user.id as UserId,
        role,
        limit,
        offset
      });

      const result = await commandBus.executeQuery<GetMyOrganizationsQuery, Organization[]>(query);

      if (!result.success) {
        console.error('[GET /api/organizations] Query failed:', result.error);
        return NextResponse.json(
          { error: result.error?.message || 'Failed to fetch organizations' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        total: result.data.length
      });
    } else {
      // List all organizations with filters
      const filters: any = {};

      if (searchParams.get('type')) {
        filters.type = searchParams.get('type');
      }
      if (searchParams.get('size')) {
        filters.size = searchParams.get('size');
      }
      if (searchParams.get('status')) {
        filters.status = searchParams.get('status');
      }
      if (searchParams.get('verified')) {
        filters.verified = searchParams.get('verified') === 'true';
      }
      if (searchParams.get('search')) {
        filters.searchQuery = searchParams.get('search');
      }

      const sortBy = searchParams.get('sortBy') as any || 'name';
      const sortOrder = searchParams.get('sortOrder') as any || 'asc';
      const limit = parseInt(searchParams.get('limit') || '20');
      const offset = parseInt(searchParams.get('offset') || '0');

      const query = new ListOrganizationsQuery({
        userId: user.id as UserId,
        filters,
        sortBy,
        sortOrder,
        limit,
        offset
      });

      const result = await commandBus.executeQuery<ListOrganizationsQuery, { organizations: Organization[]; total: number }>(query);

      if (!result.success) {
        console.error('[GET /api/organizations] Query failed:', result.error);
        return NextResponse.json(
          { error: result.error?.message || 'Failed to fetch organizations' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.data.organizations,
        total: result.data.total,
        limit,
        offset
      });
    }

  } catch (error) {
    console.error('[GET /api/organizations] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations
 * Create a new organization
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
    if (!body.name || !body.type || !body.contactEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, and contactEmail are required' },
        { status: 400 }
      );
    }

    // Execute command
    const command = new CreateOrganizationCommand({
      input: {
        name: body.name,
        description: body.description,
        type: body.type,
        industry: body.industry,
        size: body.size,
        website: body.website,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        address: body.address,
        settings: body.settings,
        billingPlan: body.billingPlan,
        initialMembers: body.initialMembers
      },
      createdBy: user.id as UserId
    });

    const result = await commandBus.executeCommand<CreateOrganizationCommand, Organization>(command);

    if (!result.success) {
      console.error('[POST /api/organizations] Command failed:', result.error);
      return NextResponse.json(
        { error: result.error?.message || 'Failed to create organization' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    }, { status: 201 });

  } catch (error) {
    console.error('[POST /api/organizations] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}