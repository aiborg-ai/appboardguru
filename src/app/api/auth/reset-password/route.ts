/**
 * Password Reset API Routes
 * Handles password reset requests and confirmations using CQRS
 */

import { NextRequest, NextResponse } from 'next/server';
import { commandBus } from '@/application/cqrs/command-bus';
import { ensureHandlersRegistered } from '@/infrastructure/register-handlers';
import { RequestPasswordResetCommand, ResetPasswordCommand } from '@/application/cqrs/commands/auth.command';

// Ensure handlers are registered
ensureHandlersRegistered();

/**
 * POST /api/auth/reset-password
 * Request a password reset or confirm a reset with token
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Check if this is a reset request or confirmation
    if (body.token && body.newPassword) {
      // This is a password reset confirmation
      const command = new ResetPasswordCommand({
        token: body.token,
        newPassword: body.newPassword
      });

      const result = await commandBus.executeCommand<ResetPasswordCommand, void>(command);

      if (!result.success) {
        console.error('[POST /api/auth/reset-password] Reset failed:', result.error);
        
        const errorMessage = result.error?.message || 'Password reset failed';
        
        if (errorMessage.toLowerCase().includes('expired') || errorMessage.toLowerCase().includes('invalid')) {
          return NextResponse.json(
            { error: 'Invalid or expired reset token. Please request a new password reset.' },
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
        message: 'Password has been reset successfully. You can now login with your new password.'
      });

    } else if (body.email) {
      // This is a password reset request
      const command = new RequestPasswordResetCommand({
        email: body.email
      });

      const result = await commandBus.executeCommand<RequestPasswordResetCommand, void>(command);

      if (!result.success) {
        console.error('[POST /api/auth/reset-password] Request failed:', result.error);
        
        // Don't reveal whether the email exists or not for security
        // Always return success to prevent email enumeration
      }

      // Always return success for security (don't reveal if email exists)
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions.'
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid request. Provide either email for reset request or token with newPassword for confirmation.' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('[POST /api/auth/reset-password] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}