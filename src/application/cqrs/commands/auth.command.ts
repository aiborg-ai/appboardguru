/**
 * Authentication Commands
 * CQRS Commands for user authentication operations
 */

import { Command } from '../command-bus';
import { Result } from '../../../01-shared/types/core.types';
import { ResultUtils } from '../../../01-shared/lib/result';
import { User, UserRole, UserStatus } from '../../../domain/entities/user.entity';
import { IUserRepository } from '../../interfaces/repositories/user.repository.interface';
import { EventBus } from '../../../01-shared/lib/event-bus';
import type { UserId, OrganizationId } from '../../../types/core';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

/**
 * Register User Command
 */
export class RegisterUserCommand implements Command<User> {
  readonly commandType = 'RegisterUser';
  readonly commandId = this.generateCommandId();
  readonly commandName = 'RegisterUser';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      organizationId?: OrganizationId;
      role?: UserRole;
    }
  ) {
    this.userId = this.generateUserId();
  }

  private generateCommandId(): string {
    return `cmd_register_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateUserId(): UserId {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` as UserId;
  }

  validate(): Result<void> {
    const { email, password, firstName, lastName } = this.payload;

    if (!email || !email.includes('@')) {
      return ResultUtils.fail(new Error('Valid email is required'));
    }

    if (!password || password.length < 8) {
      return ResultUtils.fail(new Error('Password must be at least 8 characters'));
    }

    if (!firstName || firstName.trim().length === 0) {
      return ResultUtils.fail(new Error('First name is required'));
    }

    if (!lastName || lastName.trim().length === 0) {
      return ResultUtils.fail(new Error('Last name is required'));
    }

    return ResultUtils.ok(undefined);
  }

  toJSON() {
    return {
      commandName: this.commandName,
      timestamp: this.timestamp,
      payload: {
        ...this.payload,
        password: '[REDACTED]'
      }
    };
  }
}

/**
 * Register User Command Handler
 */
export class RegisterUserCommandHandler {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly eventBus?: EventBus
  ) {}

  async handle(command: RegisterUserCommand): Promise<Result<User>> {
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    const { email, password, firstName, lastName, organizationId, role } = command.payload;

    console.log('[RegisterUserCommand] Executing:', {
      email,
      firstName,
      lastName,
      role: role || UserRole.MEMBER
    });

    try {
      // Check if email already exists
      const existingUserResult = await this.userRepository.findByEmail(email);
      if (!existingUserResult.success) {
        return existingUserResult;
      }

      if (existingUserResult.data) {
        return ResultUtils.fail(new Error('Email already registered'));
      }

      // Hash the password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user entity
      const userResult = User.create(
        command.userId,
        email,
        firstName,
        lastName,
        role || UserRole.MEMBER,
        organizationId
      );

      if (!userResult.success) {
        return userResult;
      }

      const user = userResult.data;

      // Set password hash
      const setPasswordResult = user.setPassword(passwordHash);
      if (!setPasswordResult.success) {
        return setPasswordResult;
      }

      // Save to repository
      const saveResult = await this.userRepository.create(user);
      if (!saveResult.success) {
        console.error('[RegisterUserCommand] Failed to save:', saveResult.error);
        return saveResult;
      }

      // Publish events
      if (this.eventBus) {
        await user.publishDomainEvents(this.eventBus);

        await this.eventBus.publish({
          eventName: 'UserRegistered',
          aggregateId: user.id,
          payload: {
            userId: user.id,
            email: user.getEmail(),
            name: user.getName(),
            role: user.getRole(),
            organizationId
          }
        });
      }

      console.log('[RegisterUserCommand] Success:', {
        userId: saveResult.data.id,
        email: saveResult.data.getEmail()
      });

      return saveResult;
    } catch (error) {
      console.error('[RegisterUserCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to register user')
      );
    }
  }
}

/**
 * Login Command
 */
export class LoginCommand implements Command<{ user: User; token?: string }> {
  readonly commandType = 'Login';
  readonly commandId = this.generateCommandId();
  readonly commandName = 'Login';
  readonly timestamp = new Date();
  readonly userId: UserId = '' as UserId; // Will be set after authentication

  constructor(
    public readonly payload: {
      email: string;
      password: string;
      twoFactorCode?: string;
    }
  ) {}

  private generateCommandId(): string {
    return `cmd_login_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    const { email, password } = this.payload;

    if (!email || !email.includes('@')) {
      return ResultUtils.fail(new Error('Valid email is required'));
    }

    if (!password) {
      return ResultUtils.fail(new Error('Password is required'));
    }

    return ResultUtils.ok(undefined);
  }

  toJSON() {
    return {
      commandName: this.commandName,
      timestamp: this.timestamp,
      payload: {
        email: this.payload.email,
        password: '[REDACTED]',
        twoFactorCode: this.payload.twoFactorCode ? '[REDACTED]' : undefined
      }
    };
  }
}

/**
 * Login Command Handler
 */
export class LoginCommandHandler {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly eventBus?: EventBus
  ) {}

  async handle(command: LoginCommand): Promise<Result<{ user: User; token?: string }>> {
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    const { email, password, twoFactorCode } = command.payload;

    console.log('[LoginCommand] Executing:', { email });

    try {
      // Find user by email
      const userResult = await this.userRepository.findByEmail(email);
      if (!userResult.success) {
        return ResultUtils.fail(new Error('Authentication failed'));
      }

      if (!userResult.data) {
        return ResultUtils.fail(new Error('Invalid credentials'));
      }

      const user = userResult.data;

      // Check if account is locked
      if (user.isAccountLocked()) {
        return ResultUtils.fail(new Error('Account is temporarily locked due to multiple failed login attempts'));
      }

      // Check if user can login
      if (!user.canLogin()) {
        return ResultUtils.fail(new Error('Account is not active or email not verified'));
      }

      // Verify password
      const passwordHash = user.getPasswordHash();
      if (!passwordHash) {
        return ResultUtils.fail(new Error('Password not set'));
      }

      const isValidPassword = await bcrypt.compare(password, passwordHash);
      if (!isValidPassword) {
        // Record failed login attempt
        await user.recordFailedLogin();
        await this.userRepository.update(user.id as UserId, user);
        return ResultUtils.fail(new Error('Invalid credentials'));
      }

      // Check two-factor authentication if enabled
      if (user.isTwoFactorEnabled()) {
        if (!twoFactorCode) {
          return ResultUtils.fail(new Error('Two-factor authentication code required'));
        }

        // Verify two-factor code (simplified - in production use proper TOTP library)
        const secret = user.getTwoFactorSecret();
        if (!secret || twoFactorCode !== secret) {
          await user.recordFailedLogin();
          await this.userRepository.update(user.id as UserId, user);
          return ResultUtils.fail(new Error('Invalid two-factor code'));
        }
      }

      // Record successful login
      const loginResult = user.recordSuccessfulLogin();
      if (!loginResult.success) {
        return loginResult;
      }

      // Update user in repository
      const updateResult = await this.userRepository.update(user.id as UserId, user);
      if (!updateResult.success) {
        return updateResult;
      }

      // Generate session token (simplified - in production use JWT)
      const token = randomBytes(32).toString('hex');

      // Publish events
      if (this.eventBus) {
        await user.publishDomainEvents(this.eventBus);

        await this.eventBus.publish({
          eventName: 'UserLoggedIn',
          aggregateId: user.id,
          payload: {
            userId: user.id,
            email: user.getEmail(),
            loginAt: new Date()
          }
        });
      }

      console.log('[LoginCommand] Success:', {
        userId: user.id,
        email: user.getEmail()
      });

      return ResultUtils.ok({ user: updateResult.data, token });
    } catch (error) {
      console.error('[LoginCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Authentication failed')
      );
    }
  }
}

/**
 * Request Password Reset Command
 */
export class RequestPasswordResetCommand implements Command<void> {
  readonly commandType = 'RequestPasswordReset';
  readonly commandId = this.generateCommandId();
  readonly commandName = 'RequestPasswordReset';
  readonly timestamp = new Date();
  readonly userId: UserId = '' as UserId;

  constructor(
    public readonly payload: {
      email: string;
    }
  ) {}

  private generateCommandId(): string {
    return `cmd_request_reset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.email || !this.payload.email.includes('@')) {
      return ResultUtils.fail(new Error('Valid email is required'));
    }

    return ResultUtils.ok(undefined);
  }

  toJSON() {
    return {
      commandName: this.commandName,
      timestamp: this.timestamp,
      payload: this.payload
    };
  }
}

/**
 * Request Password Reset Command Handler
 */
export class RequestPasswordResetCommandHandler {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly eventBus?: EventBus
  ) {}

  async handle(command: RequestPasswordResetCommand): Promise<Result<void>> {
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    const { email } = command.payload;

    console.log('[RequestPasswordResetCommand] Executing:', { email });

    try {
      // Find user by email
      const userResult = await this.userRepository.findByEmail(email);
      if (!userResult.success || !userResult.data) {
        // Don't reveal if email exists or not for security
        return ResultUtils.ok(undefined);
      }

      const user = userResult.data;

      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');

      // Initiate password reset
      const resetResult = user.initiatePasswordReset(resetToken);
      if (!resetResult.success) {
        return resetResult;
      }

      // Save to repository
      const saveResult = await this.userRepository.update(user.id as UserId, user);
      if (!saveResult.success) {
        return saveResult;
      }

      // Publish events
      if (this.eventBus) {
        await user.publishDomainEvents(this.eventBus);

        await this.eventBus.publish({
          eventName: 'PasswordResetRequested',
          aggregateId: user.id,
          payload: {
            userId: user.id,
            email: user.getEmail(),
            resetToken // In production, send this via email
          }
        });
      }

      console.log('[RequestPasswordResetCommand] Success:', {
        userId: user.id,
        email: user.getEmail()
      });

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[RequestPasswordResetCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to request password reset')
      );
    }
  }
}

/**
 * Reset Password Command
 */
export class ResetPasswordCommand implements Command<User> {
  readonly commandType = 'ResetPassword';
  readonly commandId = this.generateCommandId();
  readonly commandName = 'ResetPassword';
  readonly timestamp = new Date();
  readonly userId: UserId = '' as UserId;

  constructor(
    public readonly payload: {
      token: string;
      newPassword: string;
    }
  ) {}

  private generateCommandId(): string {
    return `cmd_reset_password_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    const { token, newPassword } = this.payload;

    if (!token) {
      return ResultUtils.fail(new Error('Reset token is required'));
    }

    if (!newPassword || newPassword.length < 8) {
      return ResultUtils.fail(new Error('Password must be at least 8 characters'));
    }

    return ResultUtils.ok(undefined);
  }

  toJSON() {
    return {
      commandName: this.commandName,
      timestamp: this.timestamp,
      payload: {
        token: this.payload.token,
        newPassword: '[REDACTED]'
      }
    };
  }
}

/**
 * Reset Password Command Handler
 */
export class ResetPasswordCommandHandler {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly eventBus?: EventBus
  ) {}

  async handle(command: ResetPasswordCommand): Promise<Result<User>> {
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    const { token, newPassword } = command.payload;

    console.log('[ResetPasswordCommand] Executing');

    try {
      // Find user by reset token
      const userResult = await this.userRepository.findByResetToken(token);
      if (!userResult.success) {
        return ResultUtils.fail(new Error('Invalid or expired reset token'));
      }

      if (!userResult.data) {
        return ResultUtils.fail(new Error('Invalid or expired reset token'));
      }

      const user = userResult.data;

      // Hash the new password
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Reset password
      const resetResult = user.resetPassword(token, passwordHash);
      if (!resetResult.success) {
        return resetResult;
      }

      // Save to repository
      const saveResult = await this.userRepository.update(user.id as UserId, user);
      if (!saveResult.success) {
        return saveResult;
      }

      // Publish events
      if (this.eventBus) {
        await user.publishDomainEvents(this.eventBus);

        await this.eventBus.publish({
          eventName: 'PasswordReset',
          aggregateId: user.id,
          payload: {
            userId: user.id,
            email: user.getEmail(),
            resetAt: new Date()
          }
        });
      }

      console.log('[ResetPasswordCommand] Success:', {
        userId: user.id,
        email: user.getEmail()
      });

      return saveResult;
    } catch (error) {
      console.error('[ResetPasswordCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to reset password')
      );
    }
  }
}

/**
 * Verify Email Command
 */
export class VerifyEmailCommand implements Command<User> {
  readonly commandType = 'VerifyEmail';
  readonly commandId = this.generateCommandId();
  readonly commandName = 'VerifyEmail';
  readonly timestamp = new Date();
  readonly userId: UserId = '' as UserId;

  constructor(
    public readonly payload: {
      token: string;
    }
  ) {}

  private generateCommandId(): string {
    return `cmd_verify_email_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.token) {
      return ResultUtils.fail(new Error('Verification token is required'));
    }

    return ResultUtils.ok(undefined);
  }

  toJSON() {
    return {
      commandName: this.commandName,
      timestamp: this.timestamp,
      payload: this.payload
    };
  }
}

/**
 * Verify Email Command Handler
 */
export class VerifyEmailCommandHandler {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly eventBus?: EventBus
  ) {}

  async handle(command: VerifyEmailCommand): Promise<Result<User>> {
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    const { token } = command.payload;

    console.log('[VerifyEmailCommand] Executing');

    try {
      // Find user by invite token (used for email verification)
      const userResult = await this.userRepository.findByInviteToken(token);
      if (!userResult.success) {
        return ResultUtils.fail(new Error('Invalid or expired verification token'));
      }

      if (!userResult.data) {
        return ResultUtils.fail(new Error('Invalid or expired verification token'));
      }

      const user = userResult.data;

      // Verify email
      const verifyResult = user.verifyEmail(token);
      if (!verifyResult.success) {
        return verifyResult;
      }

      // Save to repository
      const saveResult = await this.userRepository.update(user.id as UserId, user);
      if (!saveResult.success) {
        return saveResult;
      }

      // Publish events
      if (this.eventBus) {
        await user.publishDomainEvents(this.eventBus);

        await this.eventBus.publish({
          eventName: 'EmailVerified',
          aggregateId: user.id,
          payload: {
            userId: user.id,
            email: user.getEmail(),
            verifiedAt: new Date()
          }
        });
      }

      console.log('[VerifyEmailCommand] Success:', {
        userId: user.id,
        email: user.getEmail()
      });

      return saveResult;
    } catch (error) {
      console.error('[VerifyEmailCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to verify email')
      );
    }
  }
}

/**
 * Factory functions to create command handlers with dependencies
 */
export function createRegisterUserCommandHandler(dependencies: {
  userRepository: IUserRepository;
  eventBus?: EventBus;
}): RegisterUserCommandHandler {
  return new RegisterUserCommandHandler(
    dependencies.userRepository,
    dependencies.eventBus
  );
}

export function createLoginCommandHandler(dependencies: {
  userRepository: IUserRepository;
  eventBus?: EventBus;
}): LoginCommandHandler {
  return new LoginCommandHandler(
    dependencies.userRepository,
    dependencies.eventBus
  );
}

export function createRequestPasswordResetCommandHandler(dependencies: {
  userRepository: IUserRepository;
  eventBus?: EventBus;
}): RequestPasswordResetCommandHandler {
  return new RequestPasswordResetCommandHandler(
    dependencies.userRepository,
    dependencies.eventBus
  );
}

export function createResetPasswordCommandHandler(dependencies: {
  userRepository: IUserRepository;
  eventBus?: EventBus;
}): ResetPasswordCommandHandler {
  return new ResetPasswordCommandHandler(
    dependencies.userRepository,
    dependencies.eventBus
  );
}

export function createVerifyEmailCommandHandler(dependencies: {
  userRepository: IUserRepository;
  eventBus?: EventBus;
}): VerifyEmailCommandHandler {
  return new VerifyEmailCommandHandler(
    dependencies.userRepository,
    dependencies.eventBus
  );
}