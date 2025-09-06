/**
 * Current User API Route
 * Get the currently authenticated user's information
 */

import { NextRequest, NextResponse } from 'next/server';
import { commandBus } from '@/application/cqrs/command-bus';
import { ensureHandlersRegistered } from '@/infrastructure/register-handlers';
import { createBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { GetCurrentUserQuery } from '@/application/cqrs/queries/get-user.query';
import type { User } from '@/domain/entities/user.entity';
import type { UserId } from '@/types/core';

// Ensure handlers are registered
ensureHandlersRegistered();

/**
 * GET /api/auth/me
 * Get current authenticated user
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

    // Execute query
    const query = new GetCurrentUserQuery({
      userId: user.id as UserId
    });

    const result = await commandBus.executeQuery<GetCurrentUserQuery, User>(query);

    if (!result.success) {
      console.error('[GET /api/auth/me] Query failed:', result.error);
      return NextResponse.json(
        { error: result.error?.message || 'Failed to fetch user' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: result.data.id,
        email: result.data.getEmail(),
        name: result.data.getName(),
        role: result.data.getRole(),
        status: result.data.getStatus(),
        organizationId: result.data.getOrganizationId(),
        emailVerified: result.data.isEmailVerified(),
        twoFactorEnabled: result.data.isTwoFactorEnabled(),
        createdAt: result.data.getCreatedAt(),
        lastLoginAt: result.data.getLastLoginAt()
      }
    });

  } catch (error) {
    console.error('[GET /api/auth/me] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}