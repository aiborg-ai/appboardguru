/**
 * User Login API Route
 * Handles user authentication using CQRS
 */

import { NextRequest, NextResponse } from 'next/server';
import { commandBus } from '@/application/cqrs/command-bus';
import { ensureHandlersRegistered } from '@/infrastructure/register-handlers';
import { LoginCommand } from '@/application/cqrs/commands/auth.command';
import { createBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { User } from '@/domain/entities/user.entity';

// Ensure handlers are registered
ensureHandlersRegistered();

/**
 * POST /api/auth/login
 * Authenticate a user
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Execute command
    const command = new LoginCommand({
      email: body.email,
      password: body.password,
      twoFactorCode: body.twoFactorCode,
      rememberMe: body.rememberMe
    });

    const result = await commandBus.executeCommand<LoginCommand, { user: User; token?: string }>(command);

    if (!result.success) {
      console.error('[POST /api/auth/login] Command failed:', result.error);
      
      const errorMessage = result.error?.message || 'Login failed';
      
      // Handle specific error cases
      if (errorMessage.toLowerCase().includes('locked')) {
        return NextResponse.json(
          { error: 'Account is temporarily locked due to too many failed attempts. Please try again later.' },
          { status: 423 } // Locked status
        );
      }
      
      if (errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('invalid')) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }
      
      if (errorMessage.toLowerCase().includes('two-factor')) {
        return NextResponse.json(
          { 
            error: errorMessage,
            requiresTwoFactor: true 
          },
          { status: 428 } // Precondition Required
        );
      }
      
      if (errorMessage.toLowerCase().includes('not verified')) {
        return NextResponse.json(
          { 
            error: 'Please verify your email address before logging in',
            emailNotVerified: true
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 401 }
      );
    }

    // Create a session if we have a token
    if (result.data.token) {
      // In a real application, you'd create a session here
      // For now, we'll use Supabase's built-in auth
      const cookieStore = cookies();
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: any) {
              cookieStore.set(name, value, options);
            },
            remove(name: string, options: any) {
              cookieStore.delete(name);
            },
          },
        }
      );
      
      // Note: In production, you'd integrate with your actual auth system
      // This is a placeholder for session creation
    }

    return NextResponse.json({
      success: true,
      data: {
        id: result.data.user.id,
        email: result.data.user.getEmail(),
        name: result.data.user.getName(),
        role: result.data.user.getRole(),
        organizationId: result.data.user.getOrganizationId()
      },
      token: result.data.token,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('[POST /api/auth/login] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}