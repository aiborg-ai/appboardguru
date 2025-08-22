import { NextRequest, NextResponse } from 'next/server';
import { createServerRepositoryFactory } from '@/lib/repositories';
import { createOrganizationId, createCommitteeId } from '@/lib/repositories/types';
import { isFailure } from '@/lib/repositories/result';

/**
 * GET /api/committees
 * Get all committees for the current organization
 */
export async function GET(request: NextRequest) {
  try {
    const repositories = await createServerRepositoryFactory();
    
    // Get current user using the auth repository
    const userResult = await repositories.auth.getCurrentUser();
    if (isFailure(userResult)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationIdParam = searchParams.get('organization_id');
    const status = searchParams.get('status') || 'active';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || undefined;

    const queryOptions = {
      limit,
      offset,
      search,
      filters: { status },
      sortBy: 'name',
      sortOrder: 'asc' as const
    };

    if (!organizationIdParam) {
      // Get all organizations the user has access to
      const userOrgsResult = await repositories.auth.getUserOrganizations();
      if (isFailure(userOrgsResult)) {
        return NextResponse.json({ error: 'Failed to get user organizations' }, { status: 500 });
      }

      if (userOrgsResult.data.length === 0) {
        return NextResponse.json({ 
          committees: [], 
          total: 0,
          limit,
          offset 
        });
      }

      // For now, get committees from the first organization
      // TODO: Enhance committee repository to support multi-organization queries
      const firstOrgId = createOrganizationId(userOrgsResult.data[0].organizationId);
      const committeesResult = await repositories.committees.findByOrganization(firstOrgId, queryOptions);
      
      if (isFailure(committeesResult)) {
        console.error('Error fetching committees:', committeesResult.error);
        return NextResponse.json({ error: 'Failed to fetch committees' }, { status: 500 });
      }

      return NextResponse.json({
        committees: committeesResult.data.data,
        total: committeesResult.data.total,
        limit: committeesResult.data.limit,
        offset: committeesResult.data.offset,
        page: committeesResult.data.page,
        totalPages: committeesResult.data.totalPages
      });
    }

    const organizationId = createOrganizationId(organizationIdParam);

    // Get committees for the specific organization using repository
    const committeesResult = await repositories.committees.findByOrganization(organizationId, queryOptions);
    
    if (isFailure(committeesResult)) {
      console.error('Error fetching committees:', committeesResult.error);
      
      // Handle specific error types
      if (committeesResult.error.code === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Access denied to organization' }, { status: 403 });
      }
      
      return NextResponse.json({ error: 'Failed to fetch committees' }, { status: 500 });
    }

    return NextResponse.json({
      committees: committeesResult.data.data,
      total: committeesResult.data.total,
      limit: committeesResult.data.limit,
      offset: committeesResult.data.offset,
      page: committeesResult.data.page,
      totalPages: committeesResult.data.totalPages,
      organization_id: organizationIdParam
    });

  } catch (error) {
    console.error('Error in GET /api/committees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/committees
 * Create a new committee
 */
export async function POST(request: NextRequest) {
  try {
    const repositories = await createServerRepositoryFactory();
    
    // Get current user using the auth repository
    const userResult = await repositories.auth.getCurrentUser();
    if (isFailure(userResult)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      organization_id,
      board_id,
      name,
      description,
      committee_type = 'other',
      established_date,
      is_permanent = true,
      charter_document_url,
      responsibilities = [],
      authority_level,
      meeting_frequency,
      meeting_location,
      settings
    } = body;

    if (!organization_id || !board_id || !name) {
      return NextResponse.json({
        error: 'Organization ID, board ID, and committee name are required'
      }, { status: 400 });
    }

    // Create the committee using the repository
    const committeeData = {
      organization_id,
      board_id,
      name,
      description,
      committee_type,
      established_date,
      is_permanent,
      charter_document_url,
      responsibilities,
      authority_level,
      meeting_frequency,
      meeting_location,
      settings: settings || {},
      status: 'active'
    };

    const createResult = await repositories.committees.create(committeeData);
    
    if (isFailure(createResult)) {
      console.error('Error creating committee:', createResult.error);
      
      // Handle specific error types
      if (createResult.error.code === 'VALIDATION_ERROR') {
        return NextResponse.json({ error: createResult.error.message }, { status: 400 });
      }
      
      if (createResult.error.code === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Access denied - admin role required' }, { status: 403 });
      }
      
      return NextResponse.json({ error: 'Failed to create committee' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Committee created successfully',
      committee: createResult.data
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/committees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}