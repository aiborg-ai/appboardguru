/**
 * BoardMates Wizard Types
 * Type definitions for the BoardMates creation wizard
 */

export type BoardMatesWizardStep = 'personal' | 'invite' | 'review';

export type BoardMateRole = 
  | 'chairman' 
  | 'ceo' 
  | 'cfo' 
  | 'cto' 
  | 'independent_director' 
  | 'executive_director' 
  | 'non_executive_director'
  | 'audit_committee_chair'
  | 'compensation_committee_chair'
  | 'governance_committee_chair'
  | 'risk_committee_chair'
  | 'board_secretary'
  | 'general_counsel'
  | 'advisor'
  | 'observer'
  | 'other';

export interface PersonalInformation {
  fullName: string;
  email: string;
  phoneNumber: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  organization: string;
  role: BoardMateRole;
  title?: string;
  department?: string;
  linkedinProfile?: string;
  bio?: string;
}

export interface InviteSettings {
  inviteToBoardUser: boolean;
  sendWelcomeEmail: boolean;
  grantImmediateAccess: boolean;
  customMessage?: string;
  accessLevel: 'full' | 'restricted' | 'view_only';
  boardPackAccess: boolean;
  meetingAccess: boolean;
  documentAccess: boolean;
}

export interface BoardMatesWizardData {
  // Step 1: Personal Information
  personalInfo: PersonalInformation;
  
  // Step 2: Invite Settings
  inviteSettings: InviteSettings;
  
  // Step 3: Review & Create
  termsAccepted: boolean;
  notificationPreferences: {
    emailUpdates: boolean;
    smsNotifications: boolean;
    meetingReminders: boolean;
    documentAlerts: boolean;
  };
}

export interface CreateBoardMateRequest {
  personalInfo: PersonalInformation;
  inviteSettings: InviteSettings;
  organizationId: string;
  createdBy: string;
  notificationPreferences: {
    emailUpdates: boolean;
    smsNotifications: boolean;
    meetingReminders: boolean;
    documentAlerts: boolean;
  };
}

export interface BoardMateCreationResponse {
  success: boolean;
  boardMate?: {
    id: string;
    fullName: string;
    email: string;
    role: BoardMateRole;
  };
  invitation?: {
    id: string;
    invitationToken: string;
    expiresAt: string;
  };
  emailSent?: boolean;
  error?: string;
}

// Role configuration with descriptions and categories
export const BOARD_ROLES: { value: BoardMateRole; label: string; description: string; category: string }[] = [
  // Executive Leadership
  { 
    value: 'chairman', 
    label: 'Chairman', 
    description: 'Board Chairman - leads board meetings and governance',
    category: 'Executive Leadership'
  },
  { 
    value: 'ceo', 
    label: 'Chief Executive Officer', 
    description: 'Chief Executive Officer - leads company operations',
    category: 'Executive Leadership'
  },
  { 
    value: 'cfo', 
    label: 'Chief Financial Officer', 
    description: 'Chief Financial Officer - oversees financial strategy',
    category: 'Executive Leadership'
  },
  { 
    value: 'cto', 
    label: 'Chief Technology Officer', 
    description: 'Chief Technology Officer - leads technology strategy',
    category: 'Executive Leadership'
  },
  
  // Board Directors
  { 
    value: 'independent_director', 
    label: 'Independent Director', 
    description: 'Independent Board Director - provides external oversight',
    category: 'Board Directors'
  },
  { 
    value: 'executive_director', 
    label: 'Executive Director', 
    description: 'Executive Director - board member with executive role',
    category: 'Board Directors'
  },
  { 
    value: 'non_executive_director', 
    label: 'Non-Executive Director', 
    description: 'Non-Executive Director - board oversight without executive role',
    category: 'Board Directors'
  },
  
  // Committee Chairs
  { 
    value: 'audit_committee_chair', 
    label: 'Audit Committee Chair', 
    description: 'Chair of Audit Committee - oversees financial audits',
    category: 'Committee Leadership'
  },
  { 
    value: 'compensation_committee_chair', 
    label: 'Compensation Committee Chair', 
    description: 'Chair of Compensation Committee - oversees executive compensation',
    category: 'Committee Leadership'
  },
  { 
    value: 'governance_committee_chair', 
    label: 'Governance Committee Chair', 
    description: 'Chair of Governance Committee - oversees corporate governance',
    category: 'Committee Leadership'
  },
  { 
    value: 'risk_committee_chair', 
    label: 'Risk Committee Chair', 
    description: 'Chair of Risk Committee - oversees risk management',
    category: 'Committee Leadership'
  },
  
  // Support Roles
  { 
    value: 'board_secretary', 
    label: 'Board Secretary', 
    description: 'Board Secretary - manages board administration and compliance',
    category: 'Support Roles'
  },
  { 
    value: 'general_counsel', 
    label: 'General Counsel', 
    description: 'General Counsel - provides legal oversight and advice',
    category: 'Support Roles'
  },
  { 
    value: 'advisor', 
    label: 'Advisor', 
    description: 'Board Advisor - provides specialized expertise and guidance',
    category: 'Support Roles'
  },
  { 
    value: 'observer', 
    label: 'Observer', 
    description: 'Board Observer - attends meetings without voting rights',
    category: 'Support Roles'
  },
  { 
    value: 'other', 
    label: 'Other', 
    description: 'Other role not listed above',
    category: 'Other'
  }
];

// Countries list for address
export const COUNTRIES = [
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'Germany',
  'France',
  'Japan',
  'Singapore',
  'Hong Kong',
  'Switzerland',
  'Netherlands',
  'Sweden',
  'Denmark',
  'Norway',
  'Finland',
  'Ireland',
  'New Zealand',
  'South Africa',
  'India',
  'Brazil',
  'Mexico',
  'Other'
];

// Access level configurations
export const ACCESS_LEVELS = [
  {
    value: 'full' as const,
    label: 'Full Access',
    description: 'Complete access to all board materials and features',
    permissions: ['View all documents', 'Participate in discussions', 'Download materials', 'Access analytics']
  },
  {
    value: 'restricted' as const,
    label: 'Restricted Access',
    description: 'Limited access to specific board materials',
    permissions: ['View assigned documents', 'Limited discussions', 'No downloads', 'Basic analytics']
  },
  {
    value: 'view_only' as const,
    label: 'View Only',
    description: 'Read-only access to board materials',
    permissions: ['View documents only', 'No interactions', 'No downloads', 'No analytics']
  }
];

// Default form values
export const DEFAULT_PERSONAL_INFO: PersonalInformation = {
  fullName: '',
  email: '',
  phoneNumber: '',
  address: {
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States'
  },
  organization: '',
  role: 'independent_director',
  title: '',
  department: '',
  linkedinProfile: '',
  bio: ''
};

export const DEFAULT_INVITE_SETTINGS: InviteSettings = {
  inviteToBoardUser: true,
  sendWelcomeEmail: true,
  grantImmediateAccess: false,
  customMessage: '',
  accessLevel: 'full',
  boardPackAccess: true,
  meetingAccess: true,
  documentAccess: true
};