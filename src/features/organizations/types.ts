/**
 * Organization Wizard Types
 * Type definitions for the organization creation wizard
 */

export type OrganizationWizardStep = 'setup' | 'assets' | 'members' | 'review';

export type OrganizationSize = 'startup' | 'small' | 'medium' | 'large' | 'enterprise';

export type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface OrganizationSetupData {
  name: string;
  slug: string;
  description: string;
  industry: string;
  organizationSize: OrganizationSize;
  website: string;
  logoUrl?: string;
}

export interface AssetManagementSettings {
  categories: string[];
  storageLimit: number; // in GB
  approvalWorkflow: boolean;
  aiProcessing: boolean;
  defaultPermissions: 'organization' | 'restricted' | 'private';
  watermarking: boolean;
  retentionDays: number;
  autoClassification: boolean;
}

export interface MemberInvitation {
  email: string;
  fullName: string;
  role: OrganizationRole;
  department?: string;
  personalMessage?: string;
}

export interface ExistingMember {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: OrganizationRole;
  department?: string;
}

export interface ComplianceSettings {
  auditLogging: boolean;
  twoFactorRequired: boolean;
  dataEncryption: boolean;
  accessLogging: boolean;
  complianceStandards: string[];
}

export interface OrganizationWizardData {
  // Step 1: Organization Setup
  organizationDetails: OrganizationSetupData;
  
  // Step 2: Asset Management
  assetSettings: AssetManagementSettings;
  
  // Step 3: Members
  selectedMembers: ExistingMember[];
  newInvitations: MemberInvitation[];
  
  // Step 4: Review & Create
  complianceSettings: ComplianceSettings;
  termsAccepted: boolean;
  notificationSettings: {
    emailUpdates: boolean;
    securityAlerts: boolean;
    weeklyReports: boolean;
  };
}

export interface CreateOrganizationRequest {
  organizationDetails: OrganizationSetupData;
  assetSettings: AssetManagementSettings;
  members: {
    existing: ExistingMember[];
    invitations: MemberInvitation[];
  };
  complianceSettings: ComplianceSettings;
  notificationSettings: {
    emailUpdates: boolean;
    securityAlerts: boolean;
    weeklyReports: boolean;
  };
}

export interface OrganizationCreationResponse {
  success: boolean;
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
  invitationsSent?: number;
  error?: string;
}

// Industry options
export const INDUSTRIES = [
  'Technology',
  'Finance & Banking',
  'Healthcare & Life Sciences',
  'Education',
  'Manufacturing',
  'Retail & E-commerce',
  'Real Estate',
  'Legal Services',
  'Consulting',
  'Media & Entertainment',
  'Energy & Utilities',
  'Transportation & Logistics',
  'Food & Beverage',
  'Non-Profit',
  'Government',
  'Other'
];

// Organization size options
export const ORGANIZATION_SIZES: { value: OrganizationSize; label: string; description: string }[] = [
  { value: 'startup', label: 'Startup', description: '1-10 employees' },
  { value: 'small', label: 'Small Business', description: '11-50 employees' },
  { value: 'medium', label: 'Medium Business', description: '51-250 employees' },
  { value: 'large', label: 'Large Business', description: '251-1000 employees' },
  { value: 'enterprise', label: 'Enterprise', description: '1000+ employees' },
];

// Default asset categories
export const DEFAULT_ASSET_CATEGORIES = [
  'Board Documents',
  'Financial Reports',
  'Strategic Plans',
  'Legal Documents',
  'Compliance Reports',
  'Meeting Minutes',
  'Presentations',
  'Policies & Procedures',
  'Other'
];

// Compliance standards options
export const COMPLIANCE_STANDARDS = [
  'SOX (Sarbanes-Oxley)',
  'GDPR (General Data Protection Regulation)',
  'HIPAA (Health Insurance Portability)',
  'SOC 2 (Service Organization Control 2)',
  'ISO 27001',
  'PCI DSS (Payment Card Industry)',
  'CCPA (California Consumer Privacy Act)',
  'Custom Internal Standards'
];

// Role configuration with icons and colors (for UI components)
export const ROLE_CONFIG = {
  owner: { 
    label: 'Owner', 
    description: 'Full administrative access and ownership',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  admin: { 
    label: 'Admin', 
    description: 'Administrative access to organization settings',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  member: { 
    label: 'Member', 
    description: 'Standard access to board documents and features',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  viewer: { 
    label: 'Viewer', 
    description: 'Read-only access to assigned documents',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  }
};