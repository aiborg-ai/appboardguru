import { NextRequest, NextResponse } from 'next/server';
import { MeetingActionableRepository } from '@/lib/repositories/meeting-actionable.repository';
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
import { CreateActionableRequest } from '@/types/meetings';
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
  const assignedTo = url.searchParams.get('assignedTo') || undefined;
  const priority = url.searchParams.get('priority') || undefined;
  const sortBy = url.searchParams.get('sortBy') || 'created_at';
  const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  const meetingId = createMeetingId(context.params.id);
  const repository = new MeetingActionableRepository();

  // Build filters object
  const filters: any = {};
  if (status) filters.status = status;
  if (assignedTo) filters.assigned_to = assignedTo;
  if (priority) filters.priority = priority;

  // Define recovery strategies for resilient error handling
  const retryStrategy = RetryStrategy(
    () => repository.findByMeeting(meetingId, {
      page,
      limit,
      search,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
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
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    sortBy,
    sortOrder
  });

  // Apply recovery strategies if the operation failed
  const recoveredResult = await withRecovery(result, [retryStrategy, fallbackStrategy]);

  if (isSuccess(recoveredResult)) {
    return NextResponse.json({
      success: true,
      data: {
        actionables: recoveredResult.data.data,
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
  let requestData: CreateActionableRequest;
  
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
  const createRequest: CreateActionableRequest = {
    ...requestData,
    meetingId
  };

  const repository = new MeetingActionableRepository();

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
        actionable: result.data,
        message: 'Action item assigned successfully'
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
 * PUT /api/meetings/[id]/actionables/[actionableId] - Update an actionable
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

  // Extract actionable ID from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const actionableId = pathParts[pathParts.length - 1];

  if (!actionableId || actionableId === 'actionables') {
    const validationError = RepositoryError.validation(
      'Actionable ID is required for update operations',
      { providedPath: url.pathname }
    );
    return NextResponse.json(
      resultToAPIResponse(failure(validationError)), 
      { status: getHTTPStatusFromError(validationError) }
    );
  }

  const repository = new MeetingActionableRepository();

  // Define recovery strategies
  const retryStrategy = RetryStrategy(
    () => repository.update(actionableId, requestData),
    2, // max 2 retry attempts for updates
    1500 // 1.5 second initial delay
  );

  // Execute update with recovery strategies
  let result = await repository.update(actionableId, requestData);
  
  // Apply retry strategy for recoverable errors
  if (isFailure(result)) {
    result = await withRecovery(result, [retryStrategy]);
  }

  if (isSuccess(result)) {
    return NextResponse.json({
      success: true,
      data: {
        actionable: result.data,
        message: 'Actionable updated successfully'
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
 * DELETE /api/meetings/[id]/actionables/[actionableId] - Delete an actionable
 */
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  // Extract actionable ID from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const actionableId = pathParts[pathParts.length - 1];

  if (!actionableId || actionableId === 'actionables') {
    const validationError = RepositoryError.validation(
      'Actionable ID is required for delete operations',
      { providedPath: url.pathname }
    );
    return NextResponse.json(
      resultToAPIResponse(failure(validationError)), 
      { status: getHTTPStatusFromError(validationError) }
    );
  }

  const repository = new MeetingActionableRepository();

  // Note: Assuming soft delete - update status to 'cancelled'
  const softDeleteUpdate = {
    status: 'cancelled' as const,
    cancelledAt: new Date().toISOString()
  };

  // Define recovery strategies
  const retryStrategy = RetryStrategy(
    () => repository.update(actionableId, softDeleteUpdate),
    2, // max 2 retry attempts
    1000 // 1 second initial delay
  );

  // Execute soft delete with recovery strategies
  let result = await repository.update(actionableId, softDeleteUpdate);
  
  // Apply retry strategy for recoverable errors
  if (isFailure(result)) {
    result = await withRecovery(result, [retryStrategy]);
  }

  if (isSuccess(result)) {
    return NextResponse.json({
      success: true,
      data: {
        message: 'Actionable deleted successfully'
      }
    });
  }

  // Handle error with proper HTTP status mapping
  const error = result.error;
  const httpStatus = getHTTPStatusFromError(error);
  const apiResponse = resultToAPIResponse(result);

  return NextResponse.json(apiResponse, { status: httpStatus });
}