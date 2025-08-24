import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, z } from 'zod';
import type { Result } from '../result/types';
import { Ok, Err, ResultUtils } from '../repositories/result';
import { APIResponse } from '../../types/api';

/**
 * Base controller class providing common patterns for all API controllers
 */
export abstract class BaseController {
  /**
   * Handle HTTP methods with common error handling and validation
   */
  protected async handleRequest<T>(
    request: NextRequest,
    handler: () => Promise<Result<T, Error>>
  ): Promise<NextResponse> {
    try {
      const result = await handler();
      
      if (ResultUtils.isOk(result)) {
        return this.successResponse(ResultUtils.unwrap(result));
      } else {
        return this.errorResponse(ResultUtils.getError(result)!);
      }
    } catch (error) {
      console.error('Unhandled controller error:', error);
      return this.errorResponse(
        new Error('Internal server error'),
        500
      );
    }
  }

  /**
   * Validate request body against schema
   */
  protected async validateBody<T>(
    request: NextRequest,
    schema: ZodSchema<T>
  ): Promise<Result<T, Error>> {
    try {
      const body = await request.json();
      const validated = schema.parse(body);
      return Ok(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Err(new Error(`Validation error: ${error.message}`));
      }
      return Err(new Error('Invalid JSON body'));
    }
  }

  /**
   * Validate query parameters against schema
   */
  protected validateQuery<T>(
    request: NextRequest,
    schema: ZodSchema<T>
  ): Result<T, Error> {
    try {
      const { searchParams } = new URL(request.url);
      const query = Object.fromEntries(searchParams.entries());
      const validated = schema.parse(query);
      return Ok(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Err(new Error(`Query validation error: ${error.message}`));
      }
      return Err(new Error('Invalid query parameters'));
    }
  }

  /**
   * Extract path parameters from request
   */
  protected getPathParams(context: { params: Record<string, string> }): Record<string, string> {
    return context.params || {};
  }

  /**
   * Get user ID from request headers or session
   */
  protected async getUserId(request: NextRequest): Promise<Result<string, Error>> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return Err(new Error('No authorization header'));
    }

    // TODO: Implement proper JWT/session validation
    // For now, extract from Bearer token format
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return Err(new Error('Invalid authorization format'));
    }

    return Ok(token); // Temporary - should decode/validate JWT
  }

  /**
   * Create success response
   */
  protected successResponse<T>(data: T, status: number = 200): NextResponse {
    const response: APIResponse<T> = {
      success: true,
      data
    };
    return NextResponse.json(response, { status });
  }

  /**
   * Create error response
   */
  protected errorResponse(error: Error, status: number = 400): NextResponse {
    const response: APIResponse<null> = {
      success: false,
      error: {
        code: 'API_ERROR',
        message: error.message,
        details: null,
        timestamp: new Date().toISOString()
      }
    };
    return NextResponse.json(response, { status });
  }

  /**
   * Create paginated response
   */
  protected paginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): NextResponse {
    const response = {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      timestamp: new Date().toISOString()
    };
    return NextResponse.json(response);
  }

  /**
   * Handle CORS preflight requests
   */
  public handleOptions(): NextResponse {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
}

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  id: z.string().min(1, 'ID is required'),
  pagination: z.object({
    page: z.string().transform(Number).default(1),
    limit: z.string().transform(Number).default(20),
  }),
  search: z.object({
    q: z.string().optional(),
    filter: z.string().optional(),
    sort: z.string().optional(),
  }),
};