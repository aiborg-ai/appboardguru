import { Database } from '../database'

// Base organization types from database
export type Organization = Database['public']['Tables']['organizations']['Row']
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']
export type OrganizationUpdate = Database['public']['Tables']['organizations']['Update']

export type OrganizationMember = Database['public']['Tables']['organization_members']['Row']
export type OrganizationInvitation = Database['public']['Tables']['organization_invitations']['Row']
export type OrganizationFeatures = Database['public']['Tables']['organization_features']['Row']

// Extended types
export interface OrganizationWithMembers extends Organization {
  members: OrganizationMemberWithUser[]
  memberCount: number
  invitations?: OrganizationInvitation[]
}

export interface OrganizationMemberWithUser extends OrganizationMember {
  user: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  }
}

export interface OrganizationSettings {
  general: {
    name: string
    description: string | null
    website: string | null
    industry: string | null
    size: OrganizationSize | null
  }
  security: {
    ssoEnabled: boolean
    requireTwoFactor: boolean
    allowedDomains: string[]
    passwordPolicy: PasswordPolicy
  }
  features: OrganizationFeatures
  billing: {
    planType: PlanType
    subscriptionEndsAt: string | null
    paymentMethod: string | null
  }
}

export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  maxAge: number // days
}

export type OrganizationSize = 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
export type PlanType = 'free' | 'professional' | 'enterprise'
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'revoked'