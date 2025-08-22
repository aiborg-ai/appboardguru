/**
 * Permissions Service
 * Handles access control, permission checking, and security enforcement
 */

import { supabaseAdmin } from '../supabase-admin'

export type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer'
export type BoardPackAction = 'view' | 'download' | 'comment' | 'share' | 'edit_metadata' | 'delete'
export type OrganizationAction = 
  | 'view_organization' | 'edit_organization' | 'delete_organization'
  | 'manage_members' | 'view_members' | 'invite_members'
  | 'manage_board_packs' | 'upload_board_packs' | 'view_board_packs'
  | 'manage_settings' | 'view_audit_logs' | 'manage_permissions'

export interface UserRoleInfo {
  role: OrganizationRole
  status: string
  customPermissions: Record<string, unknown>
  joined_at: string
  last_accessed: string
}

export interface BoardPackPermissionInfo {
  can_view: boolean
  can_download: boolean
  can_comment: boolean
  can_share: boolean
  can_edit_metadata: boolean
  granted_by_role: boolean
  granted_by_specific_permission: boolean
  expires_at?: string
}

/**
 * Check if user can access an organization
 */
export async function canUserAccessOrganization(
  userId: string,
  orgId: string
): Promise<{ success: boolean; hasAccess?: boolean; role?: OrganizationRole; error?: string }> {
  try {
    const { data: membership, error } = await supabaseAdmin
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return { success: true, hasAccess: false }
      }
      console.error('Error checking organization access:', error)
      return { success: false, error: error.message }
    }

    // Check if organization is active
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('is_active')
      .eq('id', orgId)
      .single()

    if (!org || !org.is_active) {
      return { success: true, hasAccess: false }
    }

    return { 
      success: true, 
      hasAccess: true, 
      role: membership.role as OrganizationRole 
    }
  } catch (error) {
    console.error('Unexpected error checking organization access:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Check if user can perform a specific action in an organization
 */
export async function canUserPerformAction(
  userId: string,
  orgId: string,
  action: OrganizationAction
): Promise<{ success: boolean; canPerform?: boolean; reason?: string; error?: string }> {
  try {
    // First check if user has access to organization
    const accessCheck = await canUserAccessOrganization(userId, orgId)
    
    if (!accessCheck.success) {
      return { success: false, error: accessCheck.error }
    }
    
    if (!accessCheck.hasAccess || !accessCheck.role) {
      return { success: true, canPerform: false, reason: 'No access to organization' }
    }

    // Get user's membership details for custom permissions
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('custom_permissions')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    const customPermissions = membership?.custom_permissions || {}
    
    // Check permissions based on role and action
    const canPerform = checkRolePermission(accessCheck.role, action, customPermissions)
    
    return { 
      success: true, 
      canPerform,
      reason: canPerform ? 'Authorized' : `Role '${accessCheck.role}' cannot perform '${action}'`
    }
  } catch (error) {
    console.error('Unexpected error checking user permissions:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Get user's role in an organization
 */
export async function getUserRoleInOrganization(
  userId: string,
  orgId: string
): Promise<{ success: boolean; roleInfo?: UserRoleInfo; error?: string }> {
  try {
    const { data: membership, error } = await supabaseAdmin
      .from('organization_members')
      .select(`
        role,
        status,
        custom_permissions,
        joined_at,
        last_accessed
      `)
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return { success: true, roleInfo: undefined }
      }
      console.error('Error getting user role:', error)
      return { success: false, error: error.message }
    }

    const roleInfo: UserRoleInfo = {
      role: membership.role as OrganizationRole,
      status: membership.status,
      customPermissions: membership.custom_permissions || {},
      joined_at: membership.joined_at,
      last_accessed: membership.last_accessed,
    }

    return { success: true, roleInfo }
  } catch (error) {
    console.error('Unexpected error getting user role:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Check board pack permissions for a user
 */
export async function checkBoardPackPermissions(
  userId: string,
  boardPackId: string,
  action: BoardPackAction
): Promise<{ success: boolean; permissionInfo?: BoardPackPermissionInfo; error?: string }> {
  try {
    // Get board pack details
    const { data: boardPack } = await supabaseAdmin
      .from('board_packs')
      .select('organization_id, uploaded_by, visibility')
      .eq('id', boardPackId)
      .single()

    if (!boardPack) {
      return { success: false, error: 'Board pack not found' }
    }

    // Check if user can access the organization
    const orgAccess = await canUserAccessOrganization(userId, boardPack.organization_id)
    
    if (!orgAccess.success) {
      return { success: false, error: orgAccess.error }
    }
    
    if (!orgAccess.hasAccess || !orgAccess.role) {
      return { 
        success: true, 
        permissionInfo: createDeniedPermissionInfo() 
      }
    }

    // Check if user is the uploader
    const isUploader = boardPack.uploaded_by === userId

    // Check visibility rules
    if (boardPack.visibility === 'private' && !isUploader && !['owner', 'admin'].includes(orgAccess.role)) {
      return { 
        success: true, 
        permissionInfo: createDeniedPermissionInfo() 
      }
    }

    // Check specific board pack permissions
    const { data: specificPermission } = await supabaseAdmin
      .from('board_pack_permissions')
      .select('*')
      .eq('board_pack_id', boardPackId)
      .eq('granted_to_user_id', userId)
      .is('revoked_at', null)
      .single()

    // Check role-based permissions
    const { data: rolePermission } = await supabaseAdmin
      .from('board_pack_permissions')
      .select('*')
      .eq('board_pack_id', boardPackId)
      .eq('granted_to_role', orgAccess.role)
      .is('revoked_at', null)
      .single()

    // Build permission info
    const permissionInfo = buildBoardPackPermissionInfo(
      orgAccess.role,
      isUploader,
      specificPermission,
      rolePermission
    )

    // Check if the specific action is allowed
    const actionAllowed = checkBoardPackActionPermission(permissionInfo, action)

    return { 
      success: true, 
      permissionInfo: {
        ...permissionInfo,
        // Override with action-specific check if needed
        can_view: action === 'view' ? actionAllowed : permissionInfo.can_view,
        can_download: action === 'download' ? actionAllowed : permissionInfo.can_download,
        can_comment: action === 'comment' ? actionAllowed : permissionInfo.can_comment,
        can_share: action === 'share' ? actionAllowed : permissionInfo.can_share,
        can_edit_metadata: action === 'edit_metadata' ? actionAllowed : permissionInfo.can_edit_metadata,
      }
    }
  } catch (error) {
    console.error('Unexpected error checking board pack permissions:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Check if user has system admin privileges
 */
export async function isSystemAdmin(userId: string): Promise<boolean> {
  try {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('role, status')
      .eq('id', userId)
      .single()

    return user?.role === 'admin' && user?.status === 'approved'
  } catch (error) {
    console.error('Error checking system admin status:', error)
    return false
  }
}

/**
 * Get all organizations a user has access to with their roles
 */
export async function getUserOrganizationRoles(
  userId: string
): Promise<{ success: boolean; organizations?: Array<{id: string, role: OrganizationRole, status: string}>, error?: string }> {
  try {
    const { data: memberships, error } = await supabaseAdmin
      .from('organization_members')
      .select(`
        organization_id,
        role,
        status,
        organizations!inner (
          id,
          is_active
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('organizations.is_active', true)

    if (error) {
      console.error('Error getting user organization roles:', error)
      return { success: false, error: error.message }
    }

    const organizations = memberships?.map((membership: any) => ({
      id: membership.organization_id as string,
      role: membership.role as OrganizationRole,
      status: membership.status as string,
    })) || []

    return { success: true, organizations }
  } catch (error) {
    console.error('Unexpected error getting user organization roles:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Check role-based permissions for organization actions
 */
function checkRolePermission(
  role: OrganizationRole,
  action: OrganizationAction,
  customPermissions: Record<string, unknown> = {}
): boolean {
  // Check custom permissions first
  const customKey = `can_${action}`
  if (customKey in customPermissions) {
    return Boolean(customPermissions[customKey])
  }

  // Default role-based permissions
  const permissions = {
    owner: {
      view_organization: true,
      edit_organization: true,
      delete_organization: true,
      manage_members: true,
      view_members: true,
      invite_members: true,
      manage_board_packs: true,
      upload_board_packs: true,
      view_board_packs: true,
      manage_settings: true,
      view_audit_logs: true,
      manage_permissions: true,
    },
    admin: {
      view_organization: true,
      edit_organization: true,
      delete_organization: false,
      manage_members: true,
      view_members: true,
      invite_members: true,
      manage_board_packs: true,
      upload_board_packs: true,
      view_board_packs: true,
      manage_settings: true,
      view_audit_logs: true,
      manage_permissions: true,
    },
    member: {
      view_organization: true,
      edit_organization: false,
      delete_organization: false,
      manage_members: false,
      view_members: true,
      invite_members: false,
      manage_board_packs: true,
      upload_board_packs: true,
      view_board_packs: true,
      manage_settings: false,
      view_audit_logs: false,
      manage_permissions: false,
    },
    viewer: {
      view_organization: true,
      edit_organization: false,
      delete_organization: false,
      manage_members: false,
      view_members: true,
      invite_members: false,
      manage_board_packs: false,
      upload_board_packs: false,
      view_board_packs: true,
      manage_settings: false,
      view_audit_logs: false,
      manage_permissions: false,
    },
  }

  return permissions[role]?.[action] || false
}

/**
 * Build board pack permission info from various sources
 */
function buildBoardPackPermissionInfo(
  role: OrganizationRole,
  isUploader: boolean,
  specificPermission: Record<string, unknown> | null,
  rolePermission: Record<string, unknown> | null
): BoardPackPermissionInfo {
  // Start with role-based defaults
  const basePermissions = getBoardPackBasePermissions(role, isUploader)
  
  let permissions = { ...basePermissions }
  let grantedByRole = true
  let grantedBySpecificPermission = false
  let expires_at: string | undefined

  // Apply role-based permissions from database
  if (rolePermission) {
    permissions = {
      can_view: Boolean((rolePermission as any).can_view) || permissions.can_view,
      can_download: Boolean((rolePermission as any).can_download) || permissions.can_download,
      can_comment: Boolean((rolePermission as any).can_comment) || permissions.can_comment,
      can_share: Boolean((rolePermission as any).can_share) || permissions.can_share,
      can_edit_metadata: Boolean((rolePermission as any).can_edit_metadata) || permissions.can_edit_metadata,
    }
    if ((rolePermission as any).expires_at) {
      expires_at = (rolePermission as any).expires_at as string
    }
  }

  // Apply specific user permissions (these override role permissions)
  if (specificPermission) {
    permissions = {
      can_view: Boolean((specificPermission as any).can_view),
      can_download: Boolean((specificPermission as any).can_download),
      can_comment: Boolean((specificPermission as any).can_comment),
      can_share: Boolean((specificPermission as any).can_share),
      can_edit_metadata: Boolean((specificPermission as any).can_edit_metadata),
    }
    grantedByRole = false
    grantedBySpecificPermission = true
    if (specificPermission.expires_at) {
      expires_at = (specificPermission.expires_at as string) || ''
    }
  }

  // Check if permissions are expired
  if (expires_at && new Date(expires_at) < new Date()) {
    permissions = getBoardPackBasePermissions(role, isUploader)
    grantedBySpecificPermission = false
    expires_at = undefined
  }

  return {
    ...permissions,
    granted_by_role: grantedByRole,
    granted_by_specific_permission: grantedBySpecificPermission,
    expires_at,
  }
}

/**
 * Get base board pack permissions by role
 */
function getBoardPackBasePermissions(
  role: OrganizationRole,
  isUploader: boolean
): Omit<BoardPackPermissionInfo, 'granted_by_role' | 'granted_by_specific_permission' | 'expires_at'> {
  if (isUploader) {
    return {
      can_view: true,
      can_download: true,
      can_comment: true,
      can_share: true,
      can_edit_metadata: true,
    }
  }

  switch (role) {
    case 'owner':
    case 'admin':
      return {
        can_view: true,
        can_download: true,
        can_comment: true,
        can_share: true,
        can_edit_metadata: true,
      }
    case 'member':
      return {
        can_view: true,
        can_download: true,
        can_comment: true,
        can_share: false,
        can_edit_metadata: false,
      }
    case 'viewer':
      return {
        can_view: true,
        can_download: false,
        can_comment: false,
        can_share: false,
        can_edit_metadata: false,
      }
    default:
      return {
        can_view: false,
        can_download: false,
        can_comment: false,
        can_share: false,
        can_edit_metadata: false,
      }
  }
}

/**
 * Check if specific board pack action is allowed
 */
function checkBoardPackActionPermission(
  permissionInfo: BoardPackPermissionInfo,
  action: BoardPackAction
): boolean {
  switch (action) {
    case 'view':
      return permissionInfo.can_view
    case 'download':
      return permissionInfo.can_download
    case 'comment':
      return permissionInfo.can_comment
    case 'share':
      return permissionInfo.can_share
    case 'edit_metadata':
      return permissionInfo.can_edit_metadata
    case 'delete':
      // Delete is typically handled by organization permissions
      return permissionInfo.can_edit_metadata
    default:
      return false
  }
}

/**
 * Create a denied permission info object
 */
function createDeniedPermissionInfo(): BoardPackPermissionInfo {
  return {
    can_view: false,
    can_download: false,
    can_comment: false,
    can_share: false,
    can_edit_metadata: false,
    granted_by_role: false,
    granted_by_specific_permission: false,
  }
}