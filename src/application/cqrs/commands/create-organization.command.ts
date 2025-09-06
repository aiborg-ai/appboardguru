/**
 * Create Organization Command
 * CQRS Command for creating a new organization
 */

import { Command } from '../command-bus';
import { Result } from '../../../01-shared/types/core.types';
import { ResultUtils } from '../../../01-shared/lib/result';
import { Organization, OrganizationSettings, BillingPlan } from '../../../domain/entities/organization.entity';
import { IOrganizationRepository } from '../../interfaces/repositories/organization.repository.interface';
import { EventBus } from '../../../01-shared/lib/event-bus';
import type { OrganizationId, UserId } from '../../../types/core';

export interface CreateOrganizationInput {
  name: string;
  description?: string;
  type: 'enterprise' | 'nonprofit' | 'government' | 'educational' | 'startup';
  industry?: string;
  size?: 'small' | 'medium' | 'large' | 'enterprise';
  website?: string;
  contactEmail: string;
  contactPhone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country: string;
    postalCode?: string;
  };
  settings?: Partial<OrganizationSettings>;
  billingPlan?: BillingPlan;
  initialMembers?: Array<{
    userId: UserId;
    role: 'owner' | 'admin' | 'member' | 'viewer';
  }>;
}

/**
 * Create Organization Command
 */
export class CreateOrganizationCommand implements Command<Organization> {
  readonly commandType = 'CreateOrganization';
  readonly commandId = this.generateCommandId();
  readonly commandName = 'CreateOrganization';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      input: CreateOrganizationInput;
      createdBy: UserId;
    }
  ) {
    this.userId = payload.createdBy;
  }

  private generateCommandId(): string {
    return `cmd_create_org_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    const { input } = this.payload;

    if (!input.name || input.name.trim().length === 0) {
      return ResultUtils.fail(new Error('Organization name is required'));
    }

    if (input.name.length > 100) {
      return ResultUtils.fail(new Error('Organization name must be less than 100 characters'));
    }

    if (!input.contactEmail || !this.isValidEmail(input.contactEmail)) {
      return ResultUtils.fail(new Error('Valid contact email is required'));
    }

    if (input.website && !this.isValidUrl(input.website)) {
      return ResultUtils.fail(new Error('Invalid website URL'));
    }

    return ResultUtils.ok(undefined);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
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
 * Create Organization Command Handler
 */
export class CreateOrganizationCommandHandler {
  constructor(
    private readonly organizationRepository: IOrganizationRepository,
    private readonly eventBus?: EventBus
  ) {}

  async handle(command: CreateOrganizationCommand): Promise<Result<Organization>> {
    // Validate command
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    const { input, createdBy } = command.payload;

    console.log('[CreateOrganizationCommand] Executing:', {
      name: input.name,
      type: input.type,
      createdBy
    });

    try {
      // Check if organization name already exists
      const existingResult = await this.organizationRepository.findByName(input.name);
      if (existingResult.success && existingResult.data) {
        return ResultUtils.fail(new Error('Organization with this name already exists'));
      }

      // Generate organization ID
      const organizationId = this.generateOrganizationId();

      // Create organization entity
      const organizationResult = Organization.create({
        id: organizationId,
        name: input.name,
        description: input.description,
        type: input.type,
        industry: input.industry,
        size: input.size,
        website: input.website,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        address: input.address,
        settings: {
          requireTwoFactorAuth: false,
          allowGuestAccess: false,
          sessionTimeout: 30,
          passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true,
            expiryDays: 90
          },
          dataRetentionDays: 365,
          ...input.settings
        },
        billingPlan: input.billingPlan || {
          plan: 'free',
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          seats: 5,
          usedSeats: 1
        },
        createdBy
      });

      if (!organizationResult.success) {
        return organizationResult;
      }

      const organization = organizationResult.data;

      // Add creator as owner
      const addOwnerResult = organization.addMember({
        userId: createdBy,
        role: 'owner',
        joinedAt: new Date()
      });

      if (!addOwnerResult.success) {
        return addOwnerResult;
      }

      // Add initial members if provided
      if (input.initialMembers && input.initialMembers.length > 0) {
        for (const member of input.initialMembers) {
          if (member.userId !== createdBy) { // Skip creator as they're already added
            const addMemberResult = organization.addMember({
              userId: member.userId,
              role: member.role,
              joinedAt: new Date()
            });

            if (!addMemberResult.success) {
              console.warn('[CreateOrganizationCommand] Failed to add member:', {
                userId: member.userId,
                error: addMemberResult.error
              });
            }
          }
        }
      }

      // Save to repository
      const saveResult = await this.organizationRepository.create(organization);
      if (!saveResult.success) {
        console.error('[CreateOrganizationCommand] Failed to save:', saveResult.error);
        return saveResult;
      }

      // Publish events
      if (this.eventBus) {
        await organization.publishDomainEvents(this.eventBus);

        // Emit organization created event
        await this.eventBus.publish({
          eventName: 'OrganizationCreated',
          aggregateId: organization.id,
          payload: {
            organizationId: organization.id,
            name: organization.name,
            type: organization.type,
            createdBy,
            memberCount: organization.members.length,
            billingPlan: organization.billingPlan.plan
          }
        });
      }

      console.log('[CreateOrganizationCommand] Success:', {
        organizationId: saveResult.data.id,
        name: saveResult.data.name
      });

      return saveResult;
    } catch (error) {
      console.error('[CreateOrganizationCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to create organization')
      );
    }
  }

  private generateOrganizationId(): OrganizationId {
    return `org_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` as OrganizationId;
  }
}

/**
 * Factory function to create handler with dependencies
 */
export function createCreateOrganizationCommandHandler(dependencies: {
  organizationRepository: IOrganizationRepository;
  eventBus?: EventBus;
}): CreateOrganizationCommandHandler {
  return new CreateOrganizationCommandHandler(
    dependencies.organizationRepository,
    dependencies.eventBus
  );
}