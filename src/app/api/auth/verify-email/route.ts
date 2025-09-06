/**
 * Email Verification API Route
 * Handles email verification using CQRS
 */

import { NextRequest, NextResponse } from 'next/server';
import { commandBus } from '@/application/cqrs/command-bus';
import { ensureHandlersRegistered } from '@/infrastructure/register-handlers';
import { VerifyEmailCommand } from '@/application/cqrs/commands/auth.command';

// Ensure handlers are registered
ensureHandlersRegistered();

/**
 * POST /api/auth/verify-email
 * Verify a user's email address with token
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    // Execute command
    const command = new VerifyEmailCommand({
      token: body.token
    });

    const result = await commandBus.executeCommand<VerifyEmailCommand, void>(command);

    if (!result.success) {
      console.error('[POST /api/auth/verify-email] Command failed:', result.error);
      
      const errorMessage = result.error?.message || 'Email verification failed';
      
      if (errorMessage.toLowerCase().includes('expired') || errorMessage.toLowerCase().includes('invalid')) {
        return NextResponse.json(
          { error: 'Invalid or expired verification token. Please request a new verification email.' },
          { status: 400 }
        );
      }
      
      if (errorMessage.toLowerCase().includes('already verified')) {
        return NextResponse.json(
          { error: 'Email is already verified' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully. You can now login to your account.'
    });

  } catch (error) {
    console.error('[POST /api/auth/verify-email] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/verify-email
 * Handle email verification from link click
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      // Redirect to error page
      return NextResponse.redirect(
        new URL('/auth/verify-email?error=missing-token', request.url)
      );
    }

    // Execute command
    const command = new VerifyEmailCommand({ token });
    const result = await commandBus.executeCommand<VerifyEmailCommand, void>(command);

    if (!result.success) {
      console.error('[GET /api/auth/verify-email] Command failed:', result.error);
      
      // Redirect to error page with appropriate message
      const errorMessage = result.error?.message || 'verification-failed';
      return NextResponse.redirect(
        new URL(`/auth/verify-email?error=${encodeURIComponent(errorMessage)}`, request.url)
      );
    }

    // Redirect to success page
    return NextResponse.redirect(
      new URL('/auth/verify-email?success=true', request.url)
    );

  } catch (error) {
    console.error('[GET /api/auth/verify-email] Unexpected error:', error);
    return NextResponse.redirect(
      new URL('/auth/verify-email?error=server-error', request.url)
    );
  }
}