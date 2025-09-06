/**
 * User Registration API Route
 * Handles new user registration using CQRS
 */

import { NextRequest, NextResponse } from 'next/server';
import { commandBus } from '@/application/cqrs/command-bus';
import { ensureHandlersRegistered } from '@/infrastructure/register-handlers';
import { RegisterUserCommand } from '@/application/cqrs/commands/auth.command';
import type { User } from '@/domain/entities/user.entity';
import type { OrganizationId } from '@/types/core';

// Ensure handlers are registered
ensureHandlersRegistered();

/**
 * POST /api/auth/register
 * Register a new user
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.email || !body.password || !body.name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Execute command
    const command = new RegisterUserCommand({
      email: body.email,
      password: body.password,
      name: body.name,
      organizationId: body.organizationId as OrganizationId | undefined,
      role: body.role,
      sendVerificationEmail: body.sendVerificationEmail !== false
    });

    const result = await commandBus.executeCommand<RegisterUserCommand, User>(command);

    if (!result.success) {
      console.error('[POST /api/auth/register] Command failed:', result.error);
      
      // Check for specific error types
      const errorMessage = result.error?.message || 'Registration failed';
      if (errorMessage.toLowerCase().includes('already exists')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: result.data.id,
        email: result.data.getEmail(),
        name: result.data.getName(),
        emailVerified: result.data.isEmailVerified()
      },
      message: body.sendVerificationEmail !== false 
        ? 'Registration successful. Please check your email to verify your account.'
        : 'Registration successful.'
    }, { status: 201 });

  } catch (error) {
    console.error('[POST /api/auth/register] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}