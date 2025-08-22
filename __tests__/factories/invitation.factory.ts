import type { OrganizationInvitation, VaultInvitation } from '@/types'

/**
 * Invitation factory for creating test invitations
 */
export const InvitationFactory = {
  /**
   * Create organization invitation
   */
  buildOrganizationInvitation(
    organizationId: string, 
    invitedBy: string, 
    overrides: Partial<OrganizationInvitation> = {}
  ): OrganizationInvitation {
    const randomId = Math.random().toString(36).substr(2, 9)
    const timestamp = new Date().toISOString()
    const expirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    
    return {
      id: `org-invitation-${randomId}`,
      organization_id: organizationId,
      email: `newmember-${randomId}@example.com`,
      role: 'member',
      status: 'pending',
      invitation_token: `token-${randomId}`,
      email_verification_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      invited_by: invitedBy,
      personal_message: 'Welcome to our board! We look forward to your contributions.',
      created_at: timestamp,
      updated_at: timestamp,
      token_expires_at: expirationDate,
      max_attempts: 3,
      attempt_count: 0,
      // last_attempt_at: null,
      accepted_at: null,
      // rejected_at: null,
      ...overrides,
    } as OrganizationInvitation
  },

  /**
   * Create vault invitation
   */
  buildVaultInvitation(
    vaultId: string,
    userId: string,
    invitedBy: string,
    overrides: Partial<VaultInvitation> = {}
  ): VaultInvitation {
    const randomId = Math.random().toString(36).substr(2, 9)
    const timestamp = new Date().toISOString()
    const deadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days
    
    return {
      id: `vault-invitation-${randomId}`,
      vault_id: vaultId,
      user_id: userId,
      role: 'viewer',
      status: 'pending',
      invited_by: invitedBy,
      message: 'Please review the board materials for the upcoming meeting.',
      deadline,
      created_at: timestamp,
      updated_at: timestamp,
      responded_at: null,
      ...overrides,
    } as VaultInvitation
  },

  /**
   * Create accepted organization invitation
   */
  buildAcceptedOrganizationInvitation(
    organizationId: string,
    invitedBy: string,
    overrides: Partial<OrganizationInvitation> = {}
  ): OrganizationInvitation {
    return this.buildOrganizationInvitation(organizationId, invitedBy, {
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      attempt_count: 1,
      // last_attempt_at: new Date().toISOString(),
      ...overrides,
    })
  },

  /**
   * Create rejected organization invitation
   */
  buildRejectedOrganizationInvitation(
    organizationId: string,
    invitedBy: string,
    overrides: Partial<OrganizationInvitation> = {}
  ): OrganizationInvitation {
    return this.buildOrganizationInvitation(organizationId, invitedBy, {
      status: 'rejected',
      // rejected_at: new Date().toISOString(),
      attempt_count: 1,
      // last_attempt_at: new Date().toISOString(),
      ...overrides,
    })
  },

  /**
   * Create expired organization invitation
   */
  buildExpiredOrganizationInvitation(
    organizationId: string,
    invitedBy: string,
    overrides: Partial<OrganizationInvitation> = {}
  ): OrganizationInvitation {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
    
    return this.buildOrganizationInvitation(organizationId, invitedBy, {
      status: 'expired',
      token_expires_at: pastDate,
      attempt_count: 0,
      ...overrides,
    })
  },

  /**
   * Create multiple organization invitations
   */
  buildOrganizationInvitationList(
    organizationId: string,
    invitedBy: string,
    count: number,
    overrides: Partial<OrganizationInvitation> = {}
  ): OrganizationInvitation[] {
    return Array.from({ length: count }, (_, index) =>
      this.buildOrganizationInvitation(organizationId, invitedBy, {
        email: `member${index + 1}@example.com`,
        role: index % 2 === 0 ? 'member' : 'admin',
        ...overrides,
      })
    )
  },

  /**
   * Create multiple vault invitations
   */
  buildVaultInvitationList(
    vaultId: string,
    userIds: string[],
    invitedBy: string,
    overrides: Partial<VaultInvitation> = {}
  ): VaultInvitation[] {
    return userIds.map((userId, index) =>
      this.buildVaultInvitation(vaultId, userId, invitedBy, {
        role: index === 0 ? 'admin' : 'viewer',
        ...overrides,
      })
    )
  },

  /**
   * Create invitation with different roles
   */
  buildWithRoles(
    organizationId: string,
    invitedBy: string,
    roles: ("owner" | "admin" | "member" | "viewer")[]
  ): OrganizationInvitation[] {
    return roles.map((role, index) =>
      this.buildOrganizationInvitation(organizationId, invitedBy, {
        email: `${role.toLowerCase()}${index + 1}@example.com`,
        role,
      })
    )
  },

  /**
   * Create invitations with different statuses
   */
  buildWithStatuses(
    organizationId: string,
    invitedBy: string
  ): OrganizationInvitation[] {
    return [
      this.buildOrganizationInvitation(organizationId, invitedBy, { 
        status: 'pending',
        email: 'pending@example.com' 
      }),
      this.buildAcceptedOrganizationInvitation(organizationId, invitedBy, { 
        email: 'accepted@example.com' 
      }),
      this.buildRejectedOrganizationInvitation(organizationId, invitedBy, { 
        email: 'rejected@example.com' 
      }),
      this.buildExpiredOrganizationInvitation(organizationId, invitedBy, { 
        email: 'expired@example.com' 
      }),
    ]
  },

  /**
   * Create bulk invitations for testing performance
   */
  buildBulkOrganizationInvitations(
    organizationId: string,
    invitedBy: string,
    emails: string[],
    role: "owner" | "admin" | "member" | "viewer" = 'member'
  ): OrganizationInvitation[] {
    return emails.map(email =>
      this.buildOrganizationInvitation(organizationId, invitedBy, {
        email,
        role,
      })
    )
  },
}

/**
 * Pre-defined invitation templates
 */
export const InvitationTemplates = {
  // Board director invitation
  boardDirector: (organizationId: string, invitedBy: string) =>
    InvitationFactory.buildOrganizationInvitation(organizationId, invitedBy, {
      email: 'boarddirector@example.com',
      role: 'admin', // 'director' is not valid, using 'admin'
      personal_message: 'We are pleased to invite you to join our board of directors. Your expertise and experience will be invaluable to our organization\'s success.',
    }),

  // Board observer invitation
  boardObserver: (organizationId: string, invitedBy: string) =>
    InvitationFactory.buildOrganizationInvitation(organizationId, invitedBy, {
      email: 'observer@example.com',
      role: 'viewer',
      personal_message: 'You are invited to join as a board observer. This role will give you insight into our governance processes.',
    }),

  // Committee member invitation
  committeeMember: (organizationId: string, invitedBy: string) =>
    InvitationFactory.buildOrganizationInvitation(organizationId, invitedBy, {
      email: 'committee@example.com',
      role: 'member',
      personal_message: 'We would like to invite you to join our audit committee. Your financial expertise is exactly what we need.',
    }),

  // Emergency meeting invitation
  emergencyMeeting: (vaultId: string, userId: string, invitedBy: string) =>
    InvitationFactory.buildVaultInvitation(vaultId, userId, invitedBy, {
      role: 'viewer',
      // message: 'URGENT: Please review the materials for tomorrow\'s emergency board session regarding the acquisition proposal.',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    }),

  // Annual meeting invitation
  annualMeeting: (vaultId: string, userId: string, invitedBy: string) =>
    InvitationFactory.buildVaultInvitation(vaultId, userId, invitedBy, {
      role: 'viewer',
      // message: 'Please review the materials for our upcoming annual shareholders meeting, including the proxy statement and financial reports.',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    }),

  // Strategic planning session invitation
  strategicPlanning: (vaultId: string, userId: string, invitedBy: string) =>
    InvitationFactory.buildVaultInvitation(vaultId, userId, invitedBy, {
      role: 'admin',
      // message: 'You are invited to participate in our strategic planning retreat. Please review the pre-read materials and come prepared to contribute.',
      expires_at: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 days
    }),
}

export default InvitationFactory