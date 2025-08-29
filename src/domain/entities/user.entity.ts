/**
 * User Entity - Core domain entity for user management
 * Implements business rules and invariants for users
 */

import { AggregateRoot } from '../core/aggregate-root';
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
  PENDING = 'pending'
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

  private constructor(
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
  ) {
    super(id, createdAt, updatedAt, version);
    this.email = email;
    this.name = name;
    this.role = role;
    this.status = status;
    this.organizationId = organizationId;
    this.lastLoginAt = lastLoginAt;
    this.preferences = preferences || {};
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