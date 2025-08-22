import { NextRequest, NextResponse } from 'next/server';
import { MeetingResolutionRepository } from '@/lib/repositories/meeting-resolution.repository';
import { 
  failure, 
  isSuccess, 
  isFailure,
  resultToAPIResponse, 
  getHTTPStatusFromError,
  RepositoryError,
  RetryStrategy,
  FallbackStrategy,
  withRecovery
} from '@/lib/repositories/result';
import { CreateResolutionRequest } from '@/types/meetings';
import { createMeetingId } from '@/lib/repositories/types';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  // Parse query parameters for pagination and filtering
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100); // Cap at 100
  const search = url.searchParams.get('search') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const sortBy = url.searchParams.get('sortBy') || 'created_at';
  const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  const meetingId = createMeetingId(context.params.id);
  const repository = new MeetingResolutionRepository();

  // Define recovery strategies for resilient error handling
  const retryStrategy = RetryStrategy(
    () => repository.findByMeeting(meetingId, {
      page,
      limit,
      search,
      filters: status ? { status } : undefined,
      sortBy,
      sortOrder
    }),
    3, // max 3 retry attempts
    1000 // 1 second initial delay
  );

  // Fallback to empty result on non-critical errors
  const fallbackStrategy = FallbackStrategy({
    data: [],
    total: 0,
    page,
    limit,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  // Execute the repository operation with recovery strategies
  const result = await repository.findByMeeting(meetingId, {
    page,
    limit,
    search,
    filters: status ? { status } : undefined,
    sortBy,
    sortOrder
  });

  // Apply recovery strategies if the operation failed
  const recoveredResult = await withRecovery(result, [retryStrategy, fallbackStrategy]);

  if (isSuccess(recoveredResult)) {
    return NextResponse.json({
      success: true,
      data: {
        resolutions: recoveredResult.data.data,
        pagination: {
          total: recoveredResult.data.total,
          page: recoveredResult.data.page,
          limit: recoveredResult.data.limit,
          totalPages: recoveredResult.data.totalPages,
          hasNext: recoveredResult.data.hasNext,
          hasPrev: recoveredResult.data.hasPrev
        }
      }
    });
  }

  // Handle error with proper HTTP status mapping
  const error = recoveredResult.error;
  const httpStatus = getHTTPStatusFromError(error);
  const apiResponse = resultToAPIResponse(recoveredResult);

  return NextResponse.json(apiResponse, { status: httpStatus });
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  let requestData: CreateResolutionRequest;
  
  // Parse and validate request body
  try {
    requestData = await request.json();
  } catch (parseError) {
    const validationError = RepositoryError.validation(
      'Invalid JSON in request body',
      { parseError: String(parseError) }
    );
    return NextResponse.json(
      resultToAPIResponse(failure(validationError)), 
      { status: getHTTPStatusFromError(validationError) }
    );
  }

  // Add meetingId from URL params to request data
  const meetingId = createMeetingId(context.params.id);
  const createRequest: CreateResolutionRequest = {
    ...requestData,
    meetingId
  };

  const repository = new MeetingResolutionRepository();

  // Define recovery strategies for resilient creation
  const retryStrategy = RetryStrategy(
    () => repository.create(createRequest),
    2, // max 2 retry attempts for creation
    2000 // 2 second initial delay
  );

  // Execute creation with recovery strategies
  let result = await repository.create(createRequest);
  
  // Apply retry strategy only for recoverable errors
  if (isFailure(result)) {
    result = await withRecovery(result, [retryStrategy]);
  }

  if (isSuccess(result)) {
    return NextResponse.json({
      success: true,
      data: {
        resolution: result.data,
        message: 'Resolution created successfully'
      }
    }, { status: 201 });
  }

  // Handle error with proper HTTP status mapping
  const error = result.error;
  const httpStatus = getHTTPStatusFromError(error);
  const apiResponse = resultToAPIResponse(result);

  return NextResponse.json(apiResponse, { status: httpStatus });
}

/**
 * PUT /api/meetings/[id]/resolutions/[resolutionId] - Update a resolution
 */
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  let requestData: any;
  
  // Parse and validate request body
  try {
    requestData = await request.json();
  } catch (parseError) {
    const validationError = RepositoryError.validation(
      'Invalid JSON in request body',
      { parseError: String(parseError) }
    );
    return NextResponse.json(
      resultToAPIResponse(failure(validationError)), 
      { status: getHTTPStatusFromError(validationError) }
    );
  }

  // Extract resolution ID from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const resolutionId = pathParts[pathParts.length - 1];

  if (!resolutionId || resolutionId === 'resolutions') {
    const validationError = RepositoryError.validation(
      'Resolution ID is required for update operations',
      { providedPath: url.pathname }
    );
    return NextResponse.json(
      resultToAPIResponse(failure(validationError)), 
      { status: getHTTPStatusFromError(validationError) }
    );
  }

  const repository = new MeetingResolutionRepository();

  // Define recovery strategies
  const retryStrategy = RetryStrategy(
    () => repository.update(resolutionId, requestData),
    2, // max 2 retry attempts for updates
    1500 // 1.5 second initial delay
  );

  // Execute update with recovery strategies
  let result = await repository.update(resolutionId, requestData);
  
  // Apply retry strategy for recoverable errors
  if (isFailure(result)) {
    result = await withRecovery(result, [retryStrategy]);
  }

  if (isSuccess(result)) {
    return NextResponse.json({
      success: true,
      data: {
        resolution: result.data,
        message: 'Resolution updated successfully'
      }
    });
  }

  // Handle error with proper HTTP status mapping
  const error = result.error;
  const httpStatus = getHTTPStatusFromError(error);
  const apiResponse = resultToAPIResponse(result);

  return NextResponse.json(apiResponse, { status: httpStatus });
}

/**
 * DELETE /api/meetings/[id]/resolutions/[resolutionId] - Delete a resolution
 */
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  // Extract resolution ID from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const resolutionId = pathParts[pathParts.length - 1];

  if (!resolutionId || resolutionId === 'resolutions') {
    const validationError = RepositoryError.validation(
      'Resolution ID is required for delete operations',
      { providedPath: url.pathname }
    );
    return NextResponse.json(
      resultToAPIResponse(failure(validationError)), 
      { status: getHTTPStatusFromError(validationError) }
    );
  }

  const repository = new MeetingResolutionRepository();

  // Note: Assuming soft delete - implement actual delete method in repository
  // For now, we'll update status to 'cancelled' as a soft delete
  const softDeleteUpdate = {
    status: 'cancelled' as const
  };

  // Define recovery strategies
  const retryStrategy = RetryStrategy(
    () => repository.update(resolutionId, softDeleteUpdate),
    2, // max 2 retry attempts
    1000 // 1 second initial delay
  );

  // Execute soft delete with recovery strategies
  let result = await repository.update(resolutionId, softDeleteUpdate);
  
  // Apply retry strategy for recoverable errors
  if (isFailure(result)) {
    result = await withRecovery(result, [retryStrategy]);
  }

  if (isSuccess(result)) {
    return NextResponse.json({
      success: true,
      data: {
        message: 'Resolution deleted successfully'
      }
    });
  }

  // Handle error with proper HTTP status mapping
  const error = result.error;
  const httpStatus = getHTTPStatusFromError(error);
  const apiResponse = resultToAPIResponse(result);

  return NextResponse.json(apiResponse, { status: httpStatus });
}