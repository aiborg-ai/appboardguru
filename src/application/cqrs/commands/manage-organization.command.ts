/**
 * Organization Management Commands
 * CQRS Commands for managing organization operations
 */

import { Command } from '../command-bus';
import { Result } from '../../../01-shared/types/core.types';
import { ResultUtils } from '../../../01-shared/lib/result';
import { Organization, OrganizationSettings, BillingPlan } from '../../../domain/entities/organization.entity';
import { IOrganizationRepository } from '../../interfaces/repositories/organization.repository.interface';
import { EventBus } from '../../../01-shared/lib/event-bus';
import type { OrganizationId, UserId } from '../../../types/core';

/**
 * Update Organization Command
 */
export class UpdateOrganizationCommand implements Command<Organization> {
  readonly commandType = 'UpdateOrganization';
  readonly commandId = this.generateCommandId();
  readonly commandName = 'UpdateOrganization';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      organizationId: OrganizationId;
      updates: {
        name?: string;
        description?: string;
        industry?: string;
        size?: 'small' | 'medium' | 'large' | 'enterprise';
        website?: string;
        contactEmail?: string;
        contactPhone?: string;
        address?: {
          street?: string;
          city?: string;
          state?: string;
          country: string;
          postalCode?: string;
        };
      };
      updatedBy: UserId;
    }
  ) {
    this.userId = payload.updatedBy;
  }

  private generateCommandId(): string {
    return `cmd_update_org_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.organizationId) {
      return ResultUtils.fail(new Error('Organization ID is required'));
    }

    if (this.payload.updates.name && this.payload.updates.name.length > 100) {
      return ResultUtils.fail(new Error('Organization name must be less than 100 characters'));
    }

    if (this.payload.updates.contactEmail && !this.isValidEmail(this.payload.updates.contactEmail)) {
      return ResultUtils.fail(new Error('Invalid contact email'));
    }

    if (this.payload.updates.website && !this.isValidUrl(this.payload.updates.website)) {
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
 * Update Organization Command Handler
 */
export class UpdateOrganizationCommandHandler {
  constructor(
    private readonly organizationRepository: IOrganizationRepository,
    private readonly eventBus?: EventBus
  ) {}

  async handle(command: UpdateOrganizationCommand): Promise<Result<Organization>> {
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    const { organizationId, updates, updatedBy } = command.payload;

    console.log('[UpdateOrganizationCommand] Executing:', {
      organizationId,
      updatedBy,
      updateCount: Object.keys(updates).length
    });

    try {
      // Get organization
      const orgResult = await this.organizationRepository.findById(organizationId);
      if (!orgResult.success) {
        return orgResult;
      }

      const organization = orgResult.data;

      // Check permissions
      const member = organization.members.find(m => m.userId === updatedBy);
      if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
        return ResultUtils.fail(new Error('Insufficient permissions to update organization'));
      }

      // Apply updates
      if (updates.name) organization.name = updates.name;
      if (updates.description !== undefined) organization.description = updates.description;
      if (updates.industry) organization.industry = updates.industry;
      if (updates.size) organization.size = updates.size;
      if (updates.website) organization.website = updates.website;
      if (updates.contactEmail) organization.contactEmail = updates.contactEmail;
      if (updates.contactPhone) organization.contactPhone = updates.contactPhone;
      if (updates.address) organization.address = updates.address;

      organization.updatedAt = new Date();

      // Save changes
      const saveResult = await this.organizationRepository.update(organizationId, organization);
      if (!saveResult.success) {
        return saveResult;
      }

      // Publish events
      if (this.eventBus) {
        await this.eventBus.publish({
          eventName: 'OrganizationUpdated',
          aggregateId: organizationId,
          payload: {
            organizationId,
            updates,
            updatedBy
          }
        });
      }

      console.log('[UpdateOrganizationCommand] Success:', {
        organizationId,
        name: organization.name
      });

      return saveResult;
    } catch (error) {
      console.error('[UpdateOrganizationCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to update organization')
      );
    }
  }
}

/**
 * Add Organization Member Command
 */
export class AddOrganizationMemberCommand implements Command<Organization> {
  readonly commandType = 'AddOrganizationMember';
  readonly commandId = this.generateCommandId();
  readonly commandName = 'AddOrganizationMember';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      organizationId: OrganizationId;
      member: {
        userId: UserId;
        email: string;
        role: 'owner' | 'admin' | 'member' | 'viewer';
        department?: string;
        title?: string;
      };
      addedBy: UserId;
    }
  ) {
    this.userId = payload.addedBy;
  }

  private generateCommandId(): string {
    return `cmd_add_member_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.organizationId) {
      return ResultUtils.fail(new Error('Organization ID is required'));
    }

    if (!this.payload.member.userId) {
      return ResultUtils.fail(new Error('Member user ID is required'));
    }

    if (!this.payload.member.email || !this.isValidEmail(this.payload.member.email)) {
      return ResultUtils.fail(new Error('Valid member email is required'));
    }

    return ResultUtils.ok(undefined);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
 * Add Organization Member Command Handler
 */
export class AddOrganizationMemberCommandHandler {
  constructor(
    private readonly organizationRepository: IOrganizationRepository,
    private readonly eventBus?: EventBus
  ) {}

  async handle(command: AddOrganizationMemberCommand): Promise<Result<Organization>> {
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    const { organizationId, member, addedBy } = command.payload;

    console.log('[AddOrganizationMemberCommand] Executing:', {
      organizationId,
      newMemberId: member.userId,
      role: member.role,
      addedBy
    });

    try {
      // Get organization
      const orgResult = await this.organizationRepository.findById(organizationId);
      if (!orgResult.success) {
        return orgResult;
      }

      const organization = orgResult.data;

      // Check permissions
      const existingMember = organization.members.find(m => m.userId === addedBy);
      if (!existingMember || (existingMember.role !== 'owner' && existingMember.role !== 'admin')) {
        return ResultUtils.fail(new Error('Insufficient permissions to add members'));
      }

      // Add member
      const addResult = organization.addMember({
        userId: member.userId,
        email: member.email,
        role: member.role,
        department: member.department,
        title: member.title,
        joinedAt: new Date()
      });

      if (!addResult.success) {
        return addResult;
      }

      // Save changes
      const saveResult = await this.organizationRepository.update(organizationId, organization);
      if (!saveResult.success) {
        return saveResult;
      }

      // Publish events
      if (this.eventBus) {
        await organization.publishDomainEvents(this.eventBus);

        await this.eventBus.publish({
          eventName: 'OrganizationMemberAdded',
          aggregateId: organizationId,
          payload: {
            organizationId,
            memberId: member.userId,
            memberEmail: member.email,
            role: member.role,
            addedBy
          }
        });
      }

      console.log('[AddOrganizationMemberCommand] Success:', {
        organizationId,
        memberId: member.userId,
        totalMembers: organization.members.length
      });

      return saveResult;
    } catch (error) {
      console.error('[AddOrganizationMemberCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to add organization member')
      );
    }
  }
}

/**
 * Remove Organization Member Command
 */
export class RemoveOrganizationMemberCommand implements Command<Organization> {
  readonly commandType = 'RemoveOrganizationMember';
  readonly commandId = this.generateCommandId();
  readonly commandName = 'RemoveOrganizationMember';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      organizationId: OrganizationId;
      memberId: UserId;
      removedBy: UserId;
    }
  ) {
    this.userId = payload.removedBy;
  }

  private generateCommandId(): string {
    return `cmd_remove_member_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.organizationId) {
      return ResultUtils.fail(new Error('Organization ID is required'));
    }

    if (!this.payload.memberId) {
      return ResultUtils.fail(new Error('Member ID is required'));
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
 * Remove Organization Member Command Handler
 */
export class RemoveOrganizationMemberCommandHandler {
  constructor(
    private readonly organizationRepository: IOrganizationRepository,
    private readonly eventBus?: EventBus
  ) {}

  async handle(command: RemoveOrganizationMemberCommand): Promise<Result<Organization>> {
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    const { organizationId, memberId, removedBy } = command.payload;

    console.log('[RemoveOrganizationMemberCommand] Executing:', {
      organizationId,
      memberId,
      removedBy
    });

    try {
      // Get organization
      const orgResult = await this.organizationRepository.findById(organizationId);
      if (!orgResult.success) {
        return orgResult;
      }

      const organization = orgResult.data;

      // Check permissions
      const remover = organization.members.find(m => m.userId === removedBy);
      if (!remover || (remover.role !== 'owner' && remover.role !== 'admin')) {
        return ResultUtils.fail(new Error('Insufficient permissions to remove members'));
      }

      // Cannot remove the last owner
      const owners = organization.members.filter(m => m.role === 'owner');
      const memberToRemove = organization.members.find(m => m.userId === memberId);
      if (memberToRemove?.role === 'owner' && owners.length === 1) {
        return ResultUtils.fail(new Error('Cannot remove the last owner'));
      }

      // Remove member
      const removeResult = organization.removeMember(memberId);
      if (!removeResult.success) {
        return removeResult;
      }

      // Save changes
      const saveResult = await this.organizationRepository.update(organizationId, organization);
      if (!saveResult.success) {
        return saveResult;
      }

      // Publish events
      if (this.eventBus) {
        await organization.publishDomainEvents(this.eventBus);

        await this.eventBus.publish({
          eventName: 'OrganizationMemberRemoved',
          aggregateId: organizationId,
          payload: {
            organizationId,
            memberId,
            removedBy
          }
        });
      }

      console.log('[RemoveOrganizationMemberCommand] Success:', {
        organizationId,
        removedMemberId: memberId,
        remainingMembers: organization.members.length
      });

      return saveResult;
    } catch (error) {
      console.error('[RemoveOrganizationMemberCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to remove organization member')
      );
    }
  }
}

/**
 * Update Organization Settings Command
 */
export class UpdateOrganizationSettingsCommand implements Command<Organization> {
  readonly commandType = 'UpdateOrganizationSettings';
  readonly commandId = this.generateCommandId();
  readonly commandName = 'UpdateOrganizationSettings';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      organizationId: OrganizationId;
      settings: Partial<OrganizationSettings>;
      updatedBy: UserId;
    }
  ) {
    this.userId = payload.updatedBy;
  }

  private generateCommandId(): string {
    return `cmd_update_settings_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.organizationId) {
      return ResultUtils.fail(new Error('Organization ID is required'));
    }

    const { settings } = this.payload;

    if (settings.sessionTimeout && (settings.sessionTimeout < 5 || settings.sessionTimeout > 1440)) {
      return ResultUtils.fail(new Error('Session timeout must be between 5 and 1440 minutes'));
    }

    if (settings.dataRetentionDays && settings.dataRetentionDays < 30) {
      return ResultUtils.fail(new Error('Data retention must be at least 30 days'));
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
 * Update Organization Settings Command Handler
 */
export class UpdateOrganizationSettingsCommandHandler {
  constructor(
    private readonly organizationRepository: IOrganizationRepository,
    private readonly eventBus?: EventBus
  ) {}

  async handle(command: UpdateOrganizationSettingsCommand): Promise<Result<Organization>> {
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    const { organizationId, settings, updatedBy } = command.payload;

    console.log('[UpdateOrganizationSettingsCommand] Executing:', {
      organizationId,
      settingsCount: Object.keys(settings).length,
      updatedBy
    });

    try {
      // Get organization
      const orgResult = await this.organizationRepository.findById(organizationId);
      if (!orgResult.success) {
        return orgResult;
      }

      const organization = orgResult.data;

      // Check permissions
      const member = organization.members.find(m => m.userId === updatedBy);
      if (!member || member.role !== 'owner') {
        return ResultUtils.fail(new Error('Only owners can update organization settings'));
      }

      // Update settings
      const updateResult = organization.updateSettings(settings);
      if (!updateResult.success) {
        return updateResult;
      }

      // Save changes
      const saveResult = await this.organizationRepository.update(organizationId, organization);
      if (!saveResult.success) {
        return saveResult;
      }

      // Publish events
      if (this.eventBus) {
        await organization.publishDomainEvents(this.eventBus);

        await this.eventBus.publish({
          eventName: 'OrganizationSettingsUpdated',
          aggregateId: organizationId,
          payload: {
            organizationId,
            settings,
            updatedBy
          }
        });
      }

      console.log('[UpdateOrganizationSettingsCommand] Success:', {
        organizationId,
        requireTwoFactorAuth: organization.settings.requireTwoFactorAuth
      });

      return saveResult;
    } catch (error) {
      console.error('[UpdateOrganizationSettingsCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to update organization settings')
      );
    }
  }
}

/**
 * Upgrade Organization Plan Command
 */
export class UpgradeOrganizationPlanCommand implements Command<Organization> {
  readonly commandType = 'UpgradeOrganizationPlan';
  readonly commandId = this.generateCommandId();
  readonly commandName = 'UpgradeOrganizationPlan';
  readonly timestamp = new Date();
  readonly userId: UserId;

  constructor(
    public readonly payload: {
      organizationId: OrganizationId;
      newPlan: 'free' | 'starter' | 'professional' | 'enterprise';
      seats: number;
      paymentMethodId?: string;
      upgradedBy: UserId;
    }
  ) {
    this.userId = payload.upgradedBy;
  }

  private generateCommandId(): string {
    return `cmd_upgrade_plan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validate(): Result<void> {
    if (!this.payload.organizationId) {
      return ResultUtils.fail(new Error('Organization ID is required'));
    }

    if (this.payload.seats < 1) {
      return ResultUtils.fail(new Error('Seats must be at least 1'));
    }

    if (this.payload.newPlan !== 'free' && !this.payload.paymentMethodId) {
      return ResultUtils.fail(new Error('Payment method is required for paid plans'));
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
 * Upgrade Organization Plan Command Handler
 */
export class UpgradeOrganizationPlanCommandHandler {
  constructor(
    private readonly organizationRepository: IOrganizationRepository,
    private readonly eventBus?: EventBus
  ) {}

  async handle(command: UpgradeOrganizationPlanCommand): Promise<Result<Organization>> {
    const validationResult = command.validate();
    if (!validationResult.success) {
      return validationResult;
    }

    const { organizationId, newPlan, seats, paymentMethodId, upgradedBy } = command.payload;

    console.log('[UpgradeOrganizationPlanCommand] Executing:', {
      organizationId,
      newPlan,
      seats,
      upgradedBy
    });

    try {
      // Get organization
      const orgResult = await this.organizationRepository.findById(organizationId);
      if (!orgResult.success) {
        return orgResult;
      }

      const organization = orgResult.data;

      // Check permissions
      const member = organization.members.find(m => m.userId === upgradedBy);
      if (!member || member.role !== 'owner') {
        return ResultUtils.fail(new Error('Only owners can upgrade the organization plan'));
      }

      // Upgrade plan
      const upgradeResult = organization.upgradePlan(newPlan, seats, paymentMethodId);
      if (!upgradeResult.success) {
        return upgradeResult;
      }

      // Save changes
      const saveResult = await this.organizationRepository.update(organizationId, organization);
      if (!saveResult.success) {
        return saveResult;
      }

      // Publish events
      if (this.eventBus) {
        await organization.publishDomainEvents(this.eventBus);

        await this.eventBus.publish({
          eventName: 'OrganizationPlanUpgraded',
          aggregateId: organizationId,
          payload: {
            organizationId,
            oldPlan: orgResult.data.billingPlan.plan,
            newPlan,
            seats,
            upgradedBy
          }
        });
      }

      console.log('[UpgradeOrganizationPlanCommand] Success:', {
        organizationId,
        plan: organization.billingPlan.plan,
        seats: organization.billingPlan.seats
      });

      return saveResult;
    } catch (error) {
      console.error('[UpgradeOrganizationPlanCommand] Unexpected error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to upgrade organization plan')
      );
    }
  }
}

/**
 * Factory functions to create command handlers with dependencies
 */
export function createUpdateOrganizationCommandHandler(dependencies: {
  organizationRepository: IOrganizationRepository;
  eventBus?: EventBus;
}): UpdateOrganizationCommandHandler {
  return new UpdateOrganizationCommandHandler(
    dependencies.organizationRepository,
    dependencies.eventBus
  );
}

export function createAddOrganizationMemberCommandHandler(dependencies: {
  organizationRepository: IOrganizationRepository;
  eventBus?: EventBus;
}): AddOrganizationMemberCommandHandler {
  return new AddOrganizationMemberCommandHandler(
    dependencies.organizationRepository,
    dependencies.eventBus
  );
}

export function createRemoveOrganizationMemberCommandHandler(dependencies: {
  organizationRepository: IOrganizationRepository;
  eventBus?: EventBus;
}): RemoveOrganizationMemberCommandHandler {
  return new RemoveOrganizationMemberCommandHandler(
    dependencies.organizationRepository,
    dependencies.eventBus
  );
}

export function createUpdateOrganizationSettingsCommandHandler(dependencies: {
  organizationRepository: IOrganizationRepository;
  eventBus?: EventBus;
}): UpdateOrganizationSettingsCommandHandler {
  return new UpdateOrganizationSettingsCommandHandler(
    dependencies.organizationRepository,
    dependencies.eventBus
  );
}

export function createUpgradeOrganizationPlanCommandHandler(dependencies: {
  organizationRepository: IOrganizationRepository;
  eventBus?: EventBus;
}): UpgradeOrganizationPlanCommandHandler {
  return new UpgradeOrganizationPlanCommandHandler(
    dependencies.organizationRepository,
    dependencies.eventBus
  );
}