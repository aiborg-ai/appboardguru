/**
 * Organization Domain Entity
 * Core business entity for organizations using the board governance platform
 */

import { AggregateRoot } from '../core';
import { Result } from '../../01-shared/types/core.types';
import { ResultUtils } from '../../01-shared/lib/result';
import type { OrganizationId, UserId } from '../../types/core';

export type OrganizationType = 'corporation' | 'non_profit' | 'government' | 'educational' | 'partnership' | 'other';
export type OrganizationStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification' | 'archived';
export type MemberRole = 'owner' | 'admin' | 'board_member' | 'executive' | 'member' | 'guest';
export type BillingPlan = 'free' | 'starter' | 'professional' | 'enterprise' | 'custom';
export type FeatureFlag = 'ai_features' | 'advanced_analytics' | 'compliance_tools' | 'video_meetings' | 'document_signing' | 'api_access';

export interface OrganizationMember {
  userId: UserId;
  role: MemberRole;
  permissions: string[];
  joinedAt: Date;
  invitedBy?: UserId;
  department?: string;
  title?: string;
  isActive: boolean;
  lastActiveAt?: Date;
}

export interface OrganizationSettings {
  timezone: string;
  language: string;
  currency: string;
  fiscalYearStart: number; // Month (1-12)
  dateFormat: string;
  timeFormat: '12h' | '24h';
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sunday = 0
  defaultMeetingDuration: number; // minutes
  requireTwoFactorAuth: boolean;
  allowGuestAccess: boolean;
  dataRetentionDays: number;
  autoArchiveAfterDays: number;
  notificationSettings: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    digestFrequency: 'daily' | 'weekly' | 'monthly' | 'never';
  };
}

export interface BillingInfo {
  plan: BillingPlan;
  status: 'active' | 'past_due' | 'cancelled' | 'trial';
  trialEndsAt?: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  seats: number;
  usedSeats: number;
  storageLimit: number; // GB
  usedStorage: number; // GB
  monthlyBudget?: number;
  billingEmail?: string;
  paymentMethod?: 'card' | 'invoice' | 'bank_transfer';
  nextInvoiceDate?: Date;
  features: FeatureFlag[];
}

export interface ComplianceInfo {
  industry?: string;
  regulations: string[]; // e.g., ['SOX', 'GDPR', 'HIPAA']
  certifications: string[]; // e.g., ['ISO27001', 'SOC2']
  auditingEnabled: boolean;
  encryptionLevel: 'standard' | 'advanced' | 'maximum';
  dataResidency?: string; // Country/Region code
  complianceOfficer?: UserId;
  lastAuditDate?: Date;
  nextAuditDate?: Date;
}

export interface OrganizationBranding {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  customDomain?: string;
  emailTemplate?: string;
  loginPageCustomization?: {
    backgroundImage?: string;
    welcomeMessage?: string;
    termsUrl?: string;
    privacyUrl?: string;
  };
}

export interface OrganizationProps {
  id: OrganizationId;
  name: string;
  legalName?: string;
  type: OrganizationType;
  status: OrganizationStatus;
  description?: string;
  website?: string;
  email: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  taxId?: string;
  registrationNumber?: string;
  incorporationDate?: Date;
  members: OrganizationMember[];
  settings: OrganizationSettings;
  billing: BillingInfo;
  compliance?: ComplianceInfo;
  branding?: OrganizationBranding;
  metadata?: Record<string, any>;
  createdBy: UserId;
  createdAt: Date;
  updatedAt: Date;
  verifiedAt?: Date;
  archivedAt?: Date;
}

/**
 * Organization Domain Entity
 */
export class Organization extends AggregateRoot {
  private _id: OrganizationId;
  private _name: string;
  private _legalName?: string;
  private _type: OrganizationType;
  private _status: OrganizationStatus;
  private _description?: string;
  private _website?: string;
  private _email: string;
  private _phone?: string;
  private _address?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  private _taxId?: string;
  private _registrationNumber?: string;
  private _incorporationDate?: Date;
  private _members: OrganizationMember[];
  private _settings: OrganizationSettings;
  private _billing: BillingInfo;
  private _compliance?: ComplianceInfo;
  private _branding?: OrganizationBranding;
  private _metadata?: Record<string, any>;
  private _createdBy: UserId;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _verifiedAt?: Date;
  private _archivedAt?: Date;

  private constructor(props: OrganizationProps) {
    super();
    this._id = props.id;
    this._name = props.name;
    this._legalName = props.legalName;
    this._type = props.type;
    this._status = props.status;
    this._description = props.description;
    this._website = props.website;
    this._email = props.email;
    this._phone = props.phone;
    this._address = props.address;
    this._taxId = props.taxId;
    this._registrationNumber = props.registrationNumber;
    this._incorporationDate = props.incorporationDate;
    this._members = props.members;
    this._settings = props.settings;
    this._billing = props.billing;
    this._compliance = props.compliance;
    this._branding = props.branding;
    this._metadata = props.metadata;
    this._createdBy = props.createdBy;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._verifiedAt = props.verifiedAt;
    this._archivedAt = props.archivedAt;
  }

  // Getters
  get id(): OrganizationId { return this._id; }
  get name(): string { return this._name; }
  get legalName(): string | undefined { return this._legalName; }
  get type(): OrganizationType { return this._type; }
  get status(): OrganizationStatus { return this._status; }
  get description(): string | undefined { return this._description; }
  get website(): string | undefined { return this._website; }
  get email(): string { return this._email; }
  get phone(): string | undefined { return this._phone; }
  get address() { return this._address; }
  get taxId(): string | undefined { return this._taxId; }
  get registrationNumber(): string | undefined { return this._registrationNumber; }
  get incorporationDate(): Date | undefined { return this._incorporationDate; }
  get members(): OrganizationMember[] { return this._members; }
  get settings(): OrganizationSettings { return this._settings; }
  get billing(): BillingInfo { return this._billing; }
  get compliance(): ComplianceInfo | undefined { return this._compliance; }
  get branding(): OrganizationBranding | undefined { return this._branding; }
  get metadata(): Record<string, any> | undefined { return this._metadata; }
  get createdBy(): UserId { return this._createdBy; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
  get verifiedAt(): Date | undefined { return this._verifiedAt; }
  get archivedAt(): Date | undefined { return this._archivedAt; }

  /**
   * Factory method to create a new organization
   */
  static create(params: {
    id: OrganizationId;
    name: string;
    legalName?: string;
    type: OrganizationType;
    email: string;
    createdBy: UserId;
    description?: string;
    website?: string;
    phone?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    settings?: Partial<OrganizationSettings>;
  }): Result<Organization> {
    // Validate required fields
    if (!params.name || params.name.trim().length === 0) {
      return ResultUtils.fail(new Error('Organization name is required'));
    }

    if (params.name.length > 100) {
      return ResultUtils.fail(new Error('Organization name must be less than 100 characters'));
    }

    if (!params.email || !this.isValidEmail(params.email)) {
      return ResultUtils.fail(new Error('Valid email is required'));
    }

    if (params.website && !this.isValidUrl(params.website)) {
      return ResultUtils.fail(new Error('Invalid website URL'));
    }

    // Default settings
    const defaultSettings: OrganizationSettings = {
      timezone: 'UTC',
      language: 'en',
      currency: 'USD',
      fiscalYearStart: 1,
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      weekStartsOn: 0,
      defaultMeetingDuration: 60,
      requireTwoFactorAuth: false,
      allowGuestAccess: false,
      dataRetentionDays: 365,
      autoArchiveAfterDays: 730,
      notificationSettings: {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        digestFrequency: 'weekly'
      }
    };

    // Default billing for new organizations
    const defaultBilling: BillingInfo = {
      plan: 'free',
      status: 'trial',
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      seats: 5,
      usedSeats: 1,
      storageLimit: 5,
      usedStorage: 0,
      features: []
    };

    // Create initial member (the creator as owner)
    const initialMember: OrganizationMember = {
      userId: params.createdBy,
      role: 'owner',
      permissions: ['*'], // All permissions
      joinedAt: new Date(),
      isActive: true
    };

    const organization = new Organization({
      id: params.id,
      name: params.name,
      legalName: params.legalName,
      type: params.type,
      status: 'pending_verification',
      description: params.description,
      website: params.website,
      email: params.email,
      phone: params.phone,
      address: params.address,
      members: [initialMember],
      settings: { ...defaultSettings, ...params.settings },
      billing: defaultBilling,
      createdBy: params.createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Add domain event
    organization.addDomainEvent('OrganizationCreated', {
      organizationId: organization.id,
      name: organization.name,
      type: organization.type,
      createdBy: organization.createdBy
    });

    return ResultUtils.ok(organization);
  }

  /**
   * Add a member to the organization
   */
  addMember(params: {
    userId: UserId;
    role: MemberRole;
    invitedBy: UserId;
    department?: string;
    title?: string;
  }): Result<void> {
    // Check if member already exists
    if (this._members.some(m => m.userId === params.userId)) {
      return ResultUtils.fail(new Error('User is already a member'));
    }

    // Check if organization has reached seat limit
    if (this._billing.usedSeats >= this._billing.seats) {
      return ResultUtils.fail(new Error('Organization has reached seat limit'));
    }

    // Define role-based permissions
    const rolePermissions: Record<MemberRole, string[]> = {
      owner: ['*'],
      admin: ['manage_members', 'manage_boards', 'manage_settings', 'view_analytics'],
      board_member: ['view_boards', 'participate_meetings', 'view_documents'],
      executive: ['view_boards', 'view_analytics', 'manage_departments'],
      member: ['view_boards', 'view_documents'],
      guest: ['view_limited']
    };

    const newMember: OrganizationMember = {
      userId: params.userId,
      role: params.role,
      permissions: rolePermissions[params.role],
      joinedAt: new Date(),
      invitedBy: params.invitedBy,
      department: params.department,
      title: params.title,
      isActive: true
    };

    this._members.push(newMember);
    this._billing.usedSeats++;
    this._updatedAt = new Date();

    this.addDomainEvent('MemberAddedToOrganization', {
      organizationId: this.id,
      userId: params.userId,
      role: params.role,
      invitedBy: params.invitedBy
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Remove a member from the organization
   */
  removeMember(userId: UserId): Result<void> {
    const memberIndex = this._members.findIndex(m => m.userId === userId);
    
    if (memberIndex === -1) {
      return ResultUtils.fail(new Error('Member not found'));
    }

    const member = this._members[memberIndex];

    // Cannot remove the last owner
    if (member.role === 'owner') {
      const ownerCount = this._members.filter(m => m.role === 'owner').length;
      if (ownerCount === 1) {
        return ResultUtils.fail(new Error('Cannot remove the last owner'));
      }
    }

    this._members.splice(memberIndex, 1);
    this._billing.usedSeats--;
    this._updatedAt = new Date();

    this.addDomainEvent('MemberRemovedFromOrganization', {
      organizationId: this.id,
      userId
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Update member role
   */
  updateMemberRole(userId: UserId, newRole: MemberRole): Result<void> {
    const member = this._members.find(m => m.userId === userId);
    
    if (!member) {
      return ResultUtils.fail(new Error('Member not found'));
    }

    const previousRole = member.role;

    // Cannot change role if it would leave no owners
    if (previousRole === 'owner' && newRole !== 'owner') {
      const ownerCount = this._members.filter(m => m.role === 'owner').length;
      if (ownerCount === 1) {
        return ResultUtils.fail(new Error('Cannot change role of the last owner'));
      }
    }

    // Update role and permissions
    const rolePermissions: Record<MemberRole, string[]> = {
      owner: ['*'],
      admin: ['manage_members', 'manage_boards', 'manage_settings', 'view_analytics'],
      board_member: ['view_boards', 'participate_meetings', 'view_documents'],
      executive: ['view_boards', 'view_analytics', 'manage_departments'],
      member: ['view_boards', 'view_documents'],
      guest: ['view_limited']
    };

    member.role = newRole;
    member.permissions = rolePermissions[newRole];
    this._updatedAt = new Date();

    this.addDomainEvent('MemberRoleUpdated', {
      organizationId: this.id,
      userId,
      previousRole,
      newRole
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Update organization settings
   */
  updateSettings(settings: Partial<OrganizationSettings>): Result<void> {
    this._settings = { ...this._settings, ...settings };
    this._updatedAt = new Date();

    this.addDomainEvent('OrganizationSettingsUpdated', {
      organizationId: this.id,
      updatedSettings: Object.keys(settings)
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Upgrade billing plan
   */
  upgradePlan(newPlan: BillingPlan, additionalSeats?: number): Result<void> {
    const planHierarchy: Record<BillingPlan, number> = {
      free: 0,
      starter: 1,
      professional: 2,
      enterprise: 3,
      custom: 4
    };

    if (planHierarchy[newPlan] <= planHierarchy[this._billing.plan]) {
      return ResultUtils.fail(new Error('Can only upgrade to a higher plan'));
    }

    const planSeats: Record<BillingPlan, number> = {
      free: 5,
      starter: 10,
      professional: 50,
      enterprise: 500,
      custom: 1000
    };

    const planFeatures: Record<BillingPlan, FeatureFlag[]> = {
      free: [],
      starter: ['document_signing'],
      professional: ['document_signing', 'advanced_analytics', 'video_meetings'],
      enterprise: ['document_signing', 'advanced_analytics', 'video_meetings', 'compliance_tools', 'ai_features'],
      custom: ['document_signing', 'advanced_analytics', 'video_meetings', 'compliance_tools', 'ai_features', 'api_access']
    };

    this._billing.plan = newPlan;
    this._billing.seats = planSeats[newPlan] + (additionalSeats || 0);
    this._billing.features = planFeatures[newPlan];
    this._billing.status = 'active';
    this._updatedAt = new Date();

    this.addDomainEvent('BillingPlanUpgraded', {
      organizationId: this.id,
      previousPlan: this._billing.plan,
      newPlan,
      seats: this._billing.seats
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Verify organization
   */
  verify(): Result<void> {
    if (this._status !== 'pending_verification') {
      return ResultUtils.fail(new Error('Organization is not pending verification'));
    }

    this._status = 'active';
    this._verifiedAt = new Date();
    this._updatedAt = new Date();

    this.addDomainEvent('OrganizationVerified', {
      organizationId: this.id,
      verifiedAt: this._verifiedAt
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Suspend organization
   */
  suspend(reason: string): Result<void> {
    if (this._status === 'suspended') {
      return ResultUtils.fail(new Error('Organization is already suspended'));
    }

    if (this._status === 'archived') {
      return ResultUtils.fail(new Error('Cannot suspend archived organization'));
    }

    this._status = 'suspended';
    this._updatedAt = new Date();

    this.addDomainEvent('OrganizationSuspended', {
      organizationId: this.id,
      reason
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Archive organization
   */
  archive(): Result<void> {
    if (this._status === 'archived') {
      return ResultUtils.fail(new Error('Organization is already archived'));
    }

    this._status = 'archived';
    this._archivedAt = new Date();
    this._updatedAt = new Date();

    this.addDomainEvent('OrganizationArchived', {
      organizationId: this.id,
      archivedAt: this._archivedAt
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Check if user is a member
   */
  isMember(userId: UserId): boolean {
    return this._members.some(m => m.userId === userId && m.isActive);
  }

  /**
   * Check if user has permission
   */
  hasPermission(userId: UserId, permission: string): boolean {
    const member = this._members.find(m => m.userId === userId);
    if (!member || !member.isActive) return false;
    
    return member.permissions.includes('*') || member.permissions.includes(permission);
  }

  /**
   * Get member by user ID
   */
  getMember(userId: UserId): OrganizationMember | undefined {
    return this._members.find(m => m.userId === userId);
  }

  /**
   * Get member count by role
   */
  getMemberCountByRole(role: MemberRole): number {
    return this._members.filter(m => m.role === role && m.isActive).length;
  }

  /**
   * Check if feature is enabled
   */
  hasFeature(feature: FeatureFlag): boolean {
    return this._billing.features.includes(feature);
  }

  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert to plain object for persistence
   */
  toPersistence(): OrganizationProps {
    return {
      id: this._id,
      name: this._name,
      legalName: this._legalName,
      type: this._type,
      status: this._status,
      description: this._description,
      website: this._website,
      email: this._email,
      phone: this._phone,
      address: this._address,
      taxId: this._taxId,
      registrationNumber: this._registrationNumber,
      incorporationDate: this._incorporationDate,
      members: this._members,
      settings: this._settings,
      billing: this._billing,
      compliance: this._compliance,
      branding: this._branding,
      metadata: this._metadata,
      createdBy: this._createdBy,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      verifiedAt: this._verifiedAt,
      archivedAt: this._archivedAt
    };
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(props: OrganizationProps): Organization {
    return new Organization(props);
  }
}