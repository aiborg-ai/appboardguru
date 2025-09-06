/**
 * User Entity - Core domain entity for user management
 * Implements business rules and invariants for users
 */

import { AggregateRoot } from '../core';
import { ValueObject } from '@/01-shared/types/core.types';
import { Result, ResultUtils } from '@/01-shared/lib/result';

// Value Objects
export class Email extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  static create(email: string): Result<Email> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) {
      return ResultUtils.fail(new Error('Email is required'));
    }
    
    if (!emailRegex.test(email)) {
      return ResultUtils.fail(new Error('Invalid email format'));
    }

    return ResultUtils.ok(new Email(email.toLowerCase()));
  }

  get value(): string {
    return this.props.value;
  }
}

export class UserName extends ValueObject<{ first: string; last: string }> {
  private constructor(first: string, last: string) {
    super({ first, last });
  }

  static create(first: string, last: string): Result<UserName> {
    if (!first || first.trim().length < 1) {
      return ResultUtils.fail(new Error('First name is required'));
    }

    if (!last || last.trim().length < 1) {
      return ResultUtils.fail(new Error('Last name is required'));
    }

    if (first.length > 50 || last.length > 50) {
      return ResultUtils.fail(new Error('Name cannot exceed 50 characters'));
    }

    return ResultUtils.ok(new UserName(first.trim(), last.trim()));
  }

  get fullName(): string {
    return `${this.props.first} ${this.props.last}`;
  }

  get firstName(): string {
    return this.props.first;
  }

  get lastName(): string {
    return this.props.last;
  }
}

// User Role Enum
export enum UserRole {
  ADMIN = 'admin',
  DIRECTOR = 'director',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

// User Status Enum
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  INVITED = 'invited',
  DELETED = 'deleted'
}

// Password Value Object
export class Password extends ValueObject<{ hash: string }> {
  private constructor(hash: string) {
    super({ hash });
  }

  static createFromHash(hash: string): Password {
    return new Password(hash);
  }

  static create(plainPassword: string): Result<Password> {
    if (!plainPassword || plainPassword.length < 8) {
      return ResultUtils.fail(new Error('Password must be at least 8 characters'));
    }

    if (plainPassword.length > 128) {
      return ResultUtils.fail(new Error('Password cannot exceed 128 characters'));
    }

    if (!/[A-Z]/.test(plainPassword)) {
      return ResultUtils.fail(new Error('Password must contain at least one uppercase letter'));
    }

    if (!/[a-z]/.test(plainPassword)) {
      return ResultUtils.fail(new Error('Password must contain at least one lowercase letter'));
    }

    if (!/[0-9]/.test(plainPassword)) {
      return ResultUtils.fail(new Error('Password must contain at least one number'));
    }

    // Note: In production, hash the password using bcrypt or similar
    // For now, we'll just store a placeholder
    const hash = `hashed_${plainPassword}`;
    return ResultUtils.ok(new Password(hash));
  }

  get value(): string {
    return this.props.hash;
  }
}

// User Entity
export class User extends AggregateRoot {
  private email: Email;
  private name: UserName;
  private role: UserRole;
  private status: UserStatus;
  private organizationId?: string;
  private lastLoginAt?: Date;
  private preferences: Record<string, unknown>;
  private emailVerified: boolean;
  private emailVerifiedAt?: Date;
  private passwordHash?: string;
  private passwordChangedAt?: Date;
  private twoFactorEnabled: boolean;
  private twoFactorSecret?: string;
  private resetPasswordToken?: string;
  private resetPasswordExpiry?: Date;
  private inviteToken?: string;
  private inviteExpiry?: Date;
  private failedLoginAttempts: number;
  private lockedUntil?: Date;

  private constructor(
    id: string,
    email: Email,
    name: UserName,
    role: UserRole,
    status: UserStatus,
    organizationId?: string,
    lastLoginAt?: Date,
    preferences?: Record<string, unknown>,
    emailVerified: boolean = false,
    emailVerifiedAt?: Date,
    passwordHash?: string,
    passwordChangedAt?: Date,
    twoFactorEnabled: boolean = false,
    twoFactorSecret?: string,
    resetPasswordToken?: string,
    resetPasswordExpiry?: Date,
    inviteToken?: string,
    inviteExpiry?: Date,
    failedLoginAttempts: number = 0,
    lockedUntil?: Date,
    createdAt?: Date,
    updatedAt?: Date,
    version?: number
  ) {
    super(id, createdAt, updatedAt, version);
    this.email = email;
    this.name = name;
    this.role = role;
    this.status = status;
    this.organizationId = organizationId;
    this.lastLoginAt = lastLoginAt;
    this.preferences = preferences || {};
    this.emailVerified = emailVerified;
    this.emailVerifiedAt = emailVerifiedAt;
    this.passwordHash = passwordHash;
    this.passwordChangedAt = passwordChangedAt;
    this.twoFactorEnabled = twoFactorEnabled;
    this.twoFactorSecret = twoFactorSecret;
    this.resetPasswordToken = resetPasswordToken;
    this.resetPasswordExpiry = resetPasswordExpiry;
    this.inviteToken = inviteToken;
    this.inviteExpiry = inviteExpiry;
    this.failedLoginAttempts = failedLoginAttempts;
    this.lockedUntil = lockedUntil;
  }

  static create(
    id: string,
    email: string,
    firstName: string,
    lastName: string,
    role: UserRole = UserRole.MEMBER,
    organizationId?: string
  ): Result<User> {
    const emailResult = Email.create(email);
    if (!emailResult.success) {
      return ResultUtils.fail(emailResult.error);
    }

    const nameResult = UserName.create(firstName, lastName);
    if (!nameResult.success) {
      return ResultUtils.fail(nameResult.error);
    }

    const user = new User(
      id,
      emailResult.data,
      nameResult.data,
      role,
      UserStatus.PENDING,
      organizationId
    );

    user.addDomainEvent('UserCreated', {
      userId: id,
      email: email,
      name: `${firstName} ${lastName}`,
      role,
      organizationId
    });

    user.validate();
    return ResultUtils.ok(user);
  }

  static restore(
    id: string,
    email: Email,
    name: UserName,
    role: UserRole,
    status: UserStatus,
    organizationId?: string,
    lastLoginAt?: Date,
    preferences?: Record<string, unknown>,
    createdAt?: Date,
    updatedAt?: Date,
    version?: number
  ): User {
    return new User(
      id,
      email,
      name,
      role,
      status,
      organizationId,
      lastLoginAt,
      preferences,
      createdAt,
      updatedAt,
      version
    );
  }

  // Business Methods
  activate(): Result<void> {
    if (this.status === UserStatus.ACTIVE) {
      return ResultUtils.fail(new Error('User is already active'));
    }

    this.status = UserStatus.ACTIVE;
    this.updateVersion();
    
    this.addDomainEvent('UserActivated', {
      userId: this.id,
      previousStatus: this.status,
      newStatus: UserStatus.ACTIVE
    });

    return ResultUtils.ok(undefined);
  }

  suspend(reason: string): Result<void> {
    if (this.status === UserStatus.SUSPENDED) {
      return ResultUtils.fail(new Error('User is already suspended'));
    }

    const previousStatus = this.status;
    this.status = UserStatus.SUSPENDED;
    this.updateVersion();

    this.addDomainEvent('UserSuspended', {
      userId: this.id,
      previousStatus,
      reason
    });

    return ResultUtils.ok(undefined);
  }

  updateProfile(firstName?: string, lastName?: string): Result<void> {
    if (firstName || lastName) {
      const nameResult = UserName.create(
        firstName || this.name.firstName,
        lastName || this.name.lastName
      );

      if (!nameResult.success) {
        return ResultUtils.fail(nameResult.error);
      }

      this.name = nameResult.data;
      this.updateVersion();

      this.addDomainEvent('UserProfileUpdated', {
        userId: this.id,
        name: this.name.fullName
      });
    }

    return ResultUtils.ok(undefined);
  }

  changeRole(newRole: UserRole, changedBy: string): Result<void> {
    if (this.role === newRole) {
      return ResultUtils.fail(new Error('User already has this role'));
    }

    const previousRole = this.role;
    this.role = newRole;
    this.updateVersion();

    this.addDomainEvent('UserRoleChanged', {
      userId: this.id,
      previousRole,
      newRole,
      changedBy
    });

    return ResultUtils.ok(undefined);
  }

  recordLogin(): void {
    this.lastLoginAt = new Date();
    this.updateVersion();

    this.addDomainEvent('UserLoggedIn', {
      userId: this.id,
      loginAt: this.lastLoginAt
    });
  }

  updatePreferences(preferences: Record<string, unknown>): void {
    this.preferences = { ...this.preferences, ...preferences };
    this.updateVersion();

    this.addDomainEvent('UserPreferencesUpdated', {
      userId: this.id,
      preferences: this.preferences
    });
  }

  // Authentication Methods
  verifyEmail(token?: string): Result<void> {
    if (this.emailVerified) {
      return ResultUtils.fail(new Error('Email is already verified'));
    }

    if (token && this.inviteToken !== token) {
      return ResultUtils.fail(new Error('Invalid verification token'));
    }

    this.emailVerified = true;
    this.emailVerifiedAt = new Date();
    this.inviteToken = undefined;
    this.inviteExpiry = undefined;
    
    if (this.status === UserStatus.PENDING) {
      this.status = UserStatus.ACTIVE;
    }

    this.updateVersion();

    this.addDomainEvent('UserEmailVerified', {
      userId: this.id,
      email: this.email.value,
      verifiedAt: this.emailVerifiedAt
    });

    return ResultUtils.ok(undefined);
  }

  setPassword(passwordHash: string): Result<void> {
    this.passwordHash = passwordHash;
    this.passwordChangedAt = new Date();
    this.resetPasswordToken = undefined;
    this.resetPasswordExpiry = undefined;
    this.updateVersion();

    this.addDomainEvent('UserPasswordChanged', {
      userId: this.id,
      changedAt: this.passwordChangedAt
    });

    return ResultUtils.ok(undefined);
  }

  initiatePasswordReset(token: string, expiryHours: number = 24): Result<void> {
    this.resetPasswordToken = token;
    this.resetPasswordExpiry = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
    this.updateVersion();

    this.addDomainEvent('PasswordResetInitiated', {
      userId: this.id,
      email: this.email.value,
      expiryAt: this.resetPasswordExpiry
    });

    return ResultUtils.ok(undefined);
  }

  resetPassword(token: string, newPasswordHash: string): Result<void> {
    if (!this.resetPasswordToken || this.resetPasswordToken !== token) {
      return ResultUtils.fail(new Error('Invalid reset token'));
    }

    if (this.resetPasswordExpiry && this.resetPasswordExpiry < new Date()) {
      return ResultUtils.fail(new Error('Reset token has expired'));
    }

    this.passwordHash = newPasswordHash;
    this.passwordChangedAt = new Date();
    this.resetPasswordToken = undefined;
    this.resetPasswordExpiry = undefined;
    this.failedLoginAttempts = 0;
    this.lockedUntil = undefined;
    this.updateVersion();

    this.addDomainEvent('PasswordReset', {
      userId: this.id,
      resetAt: this.passwordChangedAt
    });

    return ResultUtils.ok(undefined);
  }

  enableTwoFactor(secret: string): Result<void> {
    if (this.twoFactorEnabled) {
      return ResultUtils.fail(new Error('Two-factor authentication is already enabled'));
    }

    this.twoFactorEnabled = true;
    this.twoFactorSecret = secret;
    this.updateVersion();

    this.addDomainEvent('TwoFactorEnabled', {
      userId: this.id,
      enabledAt: new Date()
    });

    return ResultUtils.ok(undefined);
  }

  disableTwoFactor(): Result<void> {
    if (!this.twoFactorEnabled) {
      return ResultUtils.fail(new Error('Two-factor authentication is not enabled'));
    }

    this.twoFactorEnabled = false;
    this.twoFactorSecret = undefined;
    this.updateVersion();

    this.addDomainEvent('TwoFactorDisabled', {
      userId: this.id,
      disabledAt: new Date()
    });

    return ResultUtils.ok(undefined);
  }

  recordFailedLogin(): Result<void> {
    this.failedLoginAttempts++;
    
    // Lock account after 5 failed attempts
    if (this.failedLoginAttempts >= 5) {
      this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
      
      this.addDomainEvent('UserAccountLocked', {
        userId: this.id,
        lockedUntil: this.lockedUntil,
        attempts: this.failedLoginAttempts
      });
    }

    this.updateVersion();
    return ResultUtils.ok(undefined);
  }

  recordSuccessfulLogin(): Result<void> {
    this.lastLoginAt = new Date();
    this.failedLoginAttempts = 0;
    this.lockedUntil = undefined;
    this.updateVersion();

    this.addDomainEvent('UserLoggedIn', {
      userId: this.id,
      loginAt: this.lastLoginAt
    });

    return ResultUtils.ok(undefined);
  }

  isAccountLocked(): boolean {
    return this.lockedUntil ? this.lockedUntil > new Date() : false;
  }

  canLogin(): boolean {
    return this.isActive() && !this.isAccountLocked() && this.emailVerified;
  }

  inviteUser(inviteToken: string, expiryDays: number = 7): Result<void> {
    if (this.status !== UserStatus.INVITED && this.status !== UserStatus.PENDING) {
      return ResultUtils.fail(new Error('User is already active'));
    }

    this.inviteToken = inviteToken;
    this.inviteExpiry = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
    this.status = UserStatus.INVITED;
    this.updateVersion();

    this.addDomainEvent('UserInvited', {
      userId: this.id,
      email: this.email.value,
      inviteExpiry: this.inviteExpiry
    });

    return ResultUtils.ok(undefined);
  }

  acceptInvite(token: string): Result<void> {
    if (this.status !== UserStatus.INVITED) {
      return ResultUtils.fail(new Error('User is not in invited status'));
    }

    if (!this.inviteToken || this.inviteToken !== token) {
      return ResultUtils.fail(new Error('Invalid invite token'));
    }

    if (this.inviteExpiry && this.inviteExpiry < new Date()) {
      return ResultUtils.fail(new Error('Invite has expired'));
    }

    this.status = UserStatus.ACTIVE;
    this.emailVerified = true;
    this.emailVerifiedAt = new Date();
    this.inviteToken = undefined;
    this.inviteExpiry = undefined;
    this.updateVersion();

    this.addDomainEvent('InviteAccepted', {
      userId: this.id,
      acceptedAt: new Date()
    });

    return ResultUtils.ok(undefined);
  }

  softDelete(): Result<void> {
    if (this.status === UserStatus.DELETED) {
      return ResultUtils.fail(new Error('User is already deleted'));
    }

    this.status = UserStatus.DELETED;
    this.updateVersion();

    this.addDomainEvent('UserDeleted', {
      userId: this.id,
      deletedAt: new Date()
    });

    return ResultUtils.ok(undefined);
  }

  // Getters
  getEmail(): string {
    return this.email.value;
  }

  getName(): string {
    return this.name.fullName;
  }

  getFirstName(): string {
    return this.name.firstName;
  }

  getLastName(): string {
    return this.name.lastName;
  }

  getRole(): UserRole {
    return this.role;
  }

  getStatus(): UserStatus {
    return this.status;
  }

  getOrganizationId(): string | undefined {
    return this.organizationId;
  }

  getLastLoginAt(): Date | undefined {
    return this.lastLoginAt;
  }

  getPreferences(): Record<string, unknown> {
    return { ...this.preferences };
  }

  isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  canPerformAdminActions(): boolean {
    return this.role === UserRole.ADMIN && this.isActive();
  }

  getPasswordHash(): string | undefined {
    return this.passwordHash;
  }

  isEmailVerified(): boolean {
    return this.emailVerified;
  }

  getEmailVerifiedAt(): Date | undefined {
    return this.emailVerifiedAt;
  }

  isTwoFactorEnabled(): boolean {
    return this.twoFactorEnabled;
  }

  getTwoFactorSecret(): string | undefined {
    return this.twoFactorSecret;
  }

  getResetPasswordToken(): string | undefined {
    return this.resetPasswordToken;
  }

  getResetPasswordExpiry(): Date | undefined {
    return this.resetPasswordExpiry;
  }

  getFailedLoginAttempts(): number {
    return this.failedLoginAttempts;
  }

  getLockedUntil(): Date | undefined {
    return this.lockedUntil;
  }

  validate(): void {
    if (!this.id) {
      throw new Error('User ID is required');
    }

    if (!this.email) {
      throw new Error('User email is required');
    }

    if (!this.name) {
      throw new Error('User name is required');
    }

    if (!this.role) {
      throw new Error('User role is required');
    }

    if (!this.status) {
      throw new Error('User status is required');
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      email: this.email.value,
      firstName: this.name.firstName,
      lastName: this.name.lastName,
      fullName: this.name.fullName,
      role: this.role,
      status: this.status,
      organizationId: this.organizationId,
      lastLoginAt: this.lastLoginAt,
      preferences: this.preferences,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version
    };
  }
}