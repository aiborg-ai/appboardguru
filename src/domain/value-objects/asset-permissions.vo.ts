/**
 * AssetPermissions Value Object
 * Immutable object representing permissions for an asset
 */

import { Result } from '../../01-shared/types/core.types';
import { ResultUtils } from '../../01-shared/lib/result';
import { UserId } from '../../types/core';

export enum PermissionLevel {
  NONE = 'none',
  VIEW = 'view',
  COMMENT = 'comment',
  EDIT = 'edit',
  ADMIN = 'admin',
  OWNER = 'owner'
}

export interface AssetPermissionsProps {
  userId: UserId;
  permissionLevel: PermissionLevel;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canShare: boolean;
  canComment: boolean;
  canDownload: boolean;
  expiresAt?: Date;
  grantedBy?: UserId;
  grantedAt?: Date;
}

export class AssetPermissions {
  private readonly props: Readonly<AssetPermissionsProps>;

  private constructor(props: AssetPermissionsProps) {
    this.props = Object.freeze(props);
  }

  /**
   * Create permissions based on permission level
   */
  static createFromLevel(
    userId: UserId,
    level: PermissionLevel,
    grantedBy?: UserId,
    expiresAt?: Date
  ): Result<AssetPermissions> {
    if (!userId) {
      return ResultUtils.fail(new Error('User ID is required for permissions'));
    }

    if (expiresAt && expiresAt < new Date()) {
      return ResultUtils.fail(new Error('Expiration date cannot be in the past'));
    }

    const permissions = this.getPermissionsForLevel(level);
    
    return ResultUtils.ok(new AssetPermissions({
      userId,
      permissionLevel: level,
      ...permissions,
      expiresAt,
      grantedBy,
      grantedAt: new Date()
    }));
  }

  /**
   * Create custom permissions
   */
  static createCustom(props: {
    userId: UserId;
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
    canShare: boolean;
    canComment: boolean;
    canDownload: boolean;
    grantedBy?: UserId;
    expiresAt?: Date;
  }): Result<AssetPermissions> {
    if (!props.userId) {
      return ResultUtils.fail(new Error('User ID is required for permissions'));
    }

    if (props.expiresAt && props.expiresAt < new Date()) {
      return ResultUtils.fail(new Error('Expiration date cannot be in the past'));
    }

    // Validate permission logic
    if (!props.canRead && (props.canWrite || props.canComment || props.canDownload)) {
      return ResultUtils.fail(new Error('Cannot grant write/comment/download permissions without read permission'));
    }

    if (props.canDelete && !props.canWrite) {
      return ResultUtils.fail(new Error('Cannot grant delete permission without write permission'));
    }

    if (props.canShare && !props.canRead) {
      return ResultUtils.fail(new Error('Cannot grant share permission without read permission'));
    }

    // Determine permission level based on granted permissions
    const level = this.determinePermissionLevel(props);

    return ResultUtils.ok(new AssetPermissions({
      ...props,
      permissionLevel: level,
      grantedAt: new Date()
    }));
  }

  /**
   * Create owner permissions (all permissions)
   */
  static createOwnerPermissions(ownerId: UserId): Result<AssetPermissions> {
    return this.createFromLevel(ownerId, PermissionLevel.OWNER);
  }

  /**
   * Get permissions for a specific level
   */
  private static getPermissionsForLevel(level: PermissionLevel): Omit<AssetPermissionsProps, 'userId' | 'permissionLevel' | 'expiresAt' | 'grantedBy' | 'grantedAt'> {
    switch (level) {
      case PermissionLevel.NONE:
        return {
          canRead: false,
          canWrite: false,
          canDelete: false,
          canShare: false,
          canComment: false,
          canDownload: false
        };
      
      case PermissionLevel.VIEW:
        return {
          canRead: true,
          canWrite: false,
          canDelete: false,
          canShare: false,
          canComment: false,
          canDownload: false
        };
      
      case PermissionLevel.COMMENT:
        return {
          canRead: true,
          canWrite: false,
          canDelete: false,
          canShare: false,
          canComment: true,
          canDownload: true
        };
      
      case PermissionLevel.EDIT:
        return {
          canRead: true,
          canWrite: true,
          canDelete: false,
          canShare: false,
          canComment: true,
          canDownload: true
        };
      
      case PermissionLevel.ADMIN:
        return {
          canRead: true,
          canWrite: true,
          canDelete: true,
          canShare: true,
          canComment: true,
          canDownload: true
        };
      
      case PermissionLevel.OWNER:
        return {
          canRead: true,
          canWrite: true,
          canDelete: true,
          canShare: true,
          canComment: true,
          canDownload: true
        };
      
      default:
        return {
          canRead: false,
          canWrite: false,
          canDelete: false,
          canShare: false,
          canComment: false,
          canDownload: false
        };
    }
  }

  /**
   * Determine permission level based on granted permissions
   */
  private static determinePermissionLevel(permissions: {
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
    canShare: boolean;
    canComment: boolean;
    canDownload: boolean;
  }): PermissionLevel {
    if (!permissions.canRead) {
      return PermissionLevel.NONE;
    }

    if (permissions.canDelete && permissions.canShare) {
      return PermissionLevel.ADMIN;
    }

    if (permissions.canWrite) {
      return PermissionLevel.EDIT;
    }

    if (permissions.canComment) {
      return PermissionLevel.COMMENT;
    }

    return PermissionLevel.VIEW;
  }

  // Getters
  get userId(): UserId {
    return this.props.userId;
  }

  get permissionLevel(): PermissionLevel {
    return this.props.permissionLevel;
  }

  get canRead(): boolean {
    return this.props.canRead && !this.isExpired();
  }

  get canWrite(): boolean {
    return this.props.canWrite && !this.isExpired();
  }

  get canDelete(): boolean {
    return this.props.canDelete && !this.isExpired();
  }

  get canShare(): boolean {
    return this.props.canShare && !this.isExpired();
  }

  get canComment(): boolean {
    return this.props.canComment && !this.isExpired();
  }

  get canDownload(): boolean {
    return this.props.canDownload && !this.isExpired();
  }

  get expiresAt(): Date | undefined {
    return this.props.expiresAt;
  }

  get grantedBy(): UserId | undefined {
    return this.props.grantedBy;
  }

  get grantedAt(): Date | undefined {
    return this.props.grantedAt;
  }

  // Utility methods
  isExpired(): boolean {
    if (!this.props.expiresAt) {
      return false;
    }
    return this.props.expiresAt < new Date();
  }

  isOwner(): boolean {
    return this.props.permissionLevel === PermissionLevel.OWNER;
  }

  isAdmin(): boolean {
    return this.props.permissionLevel === PermissionLevel.ADMIN || 
           this.props.permissionLevel === PermissionLevel.OWNER;
  }

  canEdit(): boolean {
    return this.canWrite;
  }

  canView(): boolean {
    return this.canRead;
  }

  hasAnyPermission(): boolean {
    return this.canRead || this.canWrite || this.canDelete || 
           this.canShare || this.canComment || this.canDownload;
  }

  /**
   * Check if these permissions are higher than another set
   */
  isHigherThan(other: AssetPermissions): boolean {
    const levels = [
      PermissionLevel.NONE,
      PermissionLevel.VIEW,
      PermissionLevel.COMMENT,
      PermissionLevel.EDIT,
      PermissionLevel.ADMIN,
      PermissionLevel.OWNER
    ];

    const thisIndex = levels.indexOf(this.props.permissionLevel);
    const otherIndex = levels.indexOf(other.permissionLevel);

    return thisIndex > otherIndex;
  }

  /**
   * Merge with another permission set (take the higher permissions)
   */
  merge(other: AssetPermissions): Result<AssetPermissions> {
    if (this.props.userId !== other.userId) {
      return ResultUtils.fail(new Error('Cannot merge permissions for different users'));
    }

    // Take the higher level permission
    const higherPermission = this.isHigherThan(other) ? this : other;
    
    // Use the longer expiration date if any
    let expiresAt = this.props.expiresAt;
    if (other.expiresAt) {
      if (!expiresAt || other.expiresAt > expiresAt) {
        expiresAt = other.expiresAt;
      }
    }

    return AssetPermissions.createFromLevel(
      this.props.userId,
      higherPermission.permissionLevel,
      higherPermission.grantedBy,
      expiresAt
    );
  }

  /**
   * Revoke specific permissions
   */
  revoke(permissions: Partial<{
    canWrite: boolean;
    canDelete: boolean;
    canShare: boolean;
    canComment: boolean;
    canDownload: boolean;
  }>): Result<AssetPermissions> {
    const newProps = { ...this.props };

    // Apply revocations
    if (permissions.canWrite === false) {
      newProps.canWrite = false;
      newProps.canDelete = false; // Can't delete without write
    }
    if (permissions.canDelete === false) {
      newProps.canDelete = false;
    }
    if (permissions.canShare === false) {
      newProps.canShare = false;
    }
    if (permissions.canComment === false) {
      newProps.canComment = false;
    }
    if (permissions.canDownload === false) {
      newProps.canDownload = false;
    }

    // Can't revoke read permission directly
    // Must use createFromLevel with NONE to revoke all

    return AssetPermissions.createCustom(newProps);
  }

  // Equality check
  equals(other: AssetPermissions): boolean {
    return this.props.userId === other.userId &&
           this.props.permissionLevel === other.permissionLevel &&
           this.props.canRead === other.canRead &&
           this.props.canWrite === other.canWrite &&
           this.props.canDelete === other.canDelete &&
           this.props.canShare === other.canShare &&
           this.props.canComment === other.canComment &&
           this.props.canDownload === other.canDownload;
  }

  // Serialization
  toJSON(): AssetPermissionsProps {
    return { ...this.props };
  }
}