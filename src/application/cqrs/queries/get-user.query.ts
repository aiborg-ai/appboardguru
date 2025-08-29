/**
 * Get User Query
 * CQRS query for retrieving user information
 */

import { Query, QueryHandler } from '@/01-shared/types/core.types';
import { Result, ResultUtils } from '@/01-shared/lib/result';
import { IUserRepository } from '@/application/interfaces/repositories/user.repository.interface';
import { User } from '@/domain/entities/user.entity';

export interface GetUserByIdParams {
  userId: string;
}

export interface GetUserByEmailParams {
  email: string;
}

export class GetUserByIdQuery implements Query<GetUserByIdParams> {
  readonly queryId: string;
  readonly queryType = 'GetUserById';
  readonly timestamp: Date;
  readonly userId?: string;

  constructor(
    public readonly parameters: GetUserByIdParams,
    userId?: string
  ) {
    this.queryId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    this.timestamp = new Date();
    this.userId = userId;
  }
}

export class GetUserByEmailQuery implements Query<GetUserByEmailParams> {
  readonly queryId: string;
  readonly queryType = 'GetUserByEmail';
  readonly timestamp: Date;
  readonly userId?: string;

  constructor(
    public readonly parameters: GetUserByEmailParams,
    userId?: string
  ) {
    this.queryId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    this.timestamp = new Date();
    this.userId = userId;
  }
}

export interface UserDTO {
  id: string;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  organizationId?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class GetUserByIdQueryHandler implements QueryHandler<GetUserByIdQuery, UserDTO | null> {
  constructor(
    private readonly userRepository: IUserRepository
  ) {}

  async handle(query: GetUserByIdQuery): Promise<Result<UserDTO | null>> {
    const result = await this.userRepository.findById(query.parameters.userId);

    if (!result.success) {
      return ResultUtils.fail(result.error);
    }

    if (!result.data) {
      return ResultUtils.ok(null);
    }

    return ResultUtils.ok(this.mapToDTO(result.data));
  }

  private mapToDTO(user: User): UserDTO {
    return {
      id: user.id,
      email: user.getEmail(),
      fullName: user.getName(),
      firstName: user.getFirstName(),
      lastName: user.getLastName(),
      role: user.getRole(),
      status: user.getStatus(),
      organizationId: user.getOrganizationId(),
      lastLoginAt: user.getLastLoginAt(),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}

export class GetUserByEmailQueryHandler implements QueryHandler<GetUserByEmailQuery, UserDTO | null> {
  constructor(
    private readonly userRepository: IUserRepository
  ) {}

  async handle(query: GetUserByEmailQuery): Promise<Result<UserDTO | null>> {
    const result = await this.userRepository.findByEmail(query.parameters.email);

    if (!result.success) {
      return ResultUtils.fail(result.error);
    }

    if (!result.data) {
      return ResultUtils.ok(null);
    }

    return ResultUtils.ok(this.mapToDTO(result.data));
  }

  private mapToDTO(user: User): UserDTO {
    return {
      id: user.id,
      email: user.getEmail(),
      fullName: user.getName(),
      firstName: user.getFirstName(),
      lastName: user.getLastName(),
      role: user.getRole(),
      status: user.getStatus(),
      organizationId: user.getOrganizationId(),
      lastLoginAt: user.getLastLoginAt(),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}