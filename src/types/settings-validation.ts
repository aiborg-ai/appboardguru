/**
 * Settings Validation Schemas
 * Comprehensive Zod schemas for all settings components following CLAUDE.md architecture
 * Provides type-safe validation for account, notification, export, and security settings
 */

import { z } from 'zod'
import {
  UserId,
  OrganizationId,
  Email,
  createUserId,
  createOrganizationId,
  createEmail,
  createUrl,
  createFilePath,
  Url,
  FilePath
} from './branded'

// ==== Base Settings Types ====

export const AccountTypeSchema = z.enum(['Superuser', 'Administrator', 'User', 'Viewer'])
export type AccountType = z.infer<typeof AccountTypeSchema>

export const TimezoneSchema = z.enum([
  'America/New_York',
  'America/Chicago', 
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney'
])
export type Timezone = z.infer<typeof TimezoneSchema>

export const LanguageSchema = z.enum(['en', 'es', 'fr', 'de', 'ja', 'zh', 'pt'])
export type Language = z.infer<typeof LanguageSchema>

// ==== Account Settings Validation ====

export const AccountOverviewSettingsSchema = z.object({
  userId: z.string().transform((val, ctx) => {
    const result = createUserId(val)
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error || 'Invalid user ID'
      })
      return z.NEVER
    }
    return result.data!
  }),
  organizationId: z.string().transform((val, ctx) => {
    const result = createOrganizationId(val)
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error || 'Invalid organization ID'
      })
      return z.NEVER
    }
    return result.data!
  }),
  accountType: AccountTypeSchema,
  displayName: z.string().min(1, 'Display name is required').max(100, 'Display name too long'),
  title: z.string().optional(),
  department: z.string().optional(),
  isActive: z.boolean().default(true),
  lastLoginAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

export const CorporateProfileSettingsSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: z.string().transform((val, ctx) => {
    const result = createEmail(val)
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error || 'Invalid email address'
      })
      return z.NEVER
    }
    return result.data!
  }),
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  department: z.string().max(100, 'Department name too long').optional(),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
  bio: z.string().max(500, 'Bio too long').optional(),
  linkedinProfile: z.string().transform((val, ctx) => {
    if (!val) return undefined
    const result = createUrl(val)
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid LinkedIn URL'
      })
      return z.NEVER
    }
    return result.data!
  }).optional(),
  timezone: TimezoneSchema,
  language: LanguageSchema.default('en'),
  profileImageUrl: z.string().transform((val, ctx) => {
    if (!val) return undefined
    const result = createUrl(val)
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid profile image URL'
      })
      return z.NEVER
    }
    return result.data!
  }).optional()
})

export const SecuritySettingsSchema = z.object({
  mfaEnabled: z.boolean().default(false),
  mfaMethod: z.enum(['totp', 'sms', 'email']).optional(),
  passwordExpiresAt: z.string().datetime().optional(),
  requirePasswordChange: z.boolean().default(false),
  allowedLoginIPs: z.array(z.string().ip()).optional(),
  sessionTimeoutMinutes: z.number().int().min(5).max(480).default(60),
  enableBiometricAuth: z.boolean().default(false),
  voiceBiometricEnabled: z.boolean().default(false),
  failedLoginAttempts: z.number().int().nonnegative().default(0),
  lastFailedLoginAt: z.string().datetime().optional(),
  accountLockedUntil: z.string().datetime().optional(),
  securityQuestions: z.array(z.object({
    question: z.string().min(1),
    answer: z.string().min(1)
  })).max(3).optional()
})

export const DelegationSettingsSchema = z.object({
  delegatesEnabled: z.boolean().default(false),
  delegates: z.array(z.object({
    userId: z.string().transform((val, ctx) => {
      const result = createUserId(val)
      if (!result.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: result.error || 'Invalid delegate user ID'
        })
        return z.NEVER
      }
      return result.data!
    }),
    permissions: z.array(z.enum(['view', 'approve', 'vote', 'upload', 'comment'])),
    validFrom: z.string().datetime(),
    validUntil: z.string().datetime().optional(),
    isActive: z.boolean().default(true)
  })).max(5),
  autoDelegate: z.boolean().default(false),
  delegationRules: z.array(z.object({
    condition: z.enum(['vacation', 'sick_leave', 'travel', 'workload']),
    autoActivate: z.boolean().default(false),
    delegateUserId: z.string().transform((val, ctx) => {
      const result = createUserId(val)
      if (!result.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: result.error || 'Invalid delegate user ID'
        })
        return z.NEVER
      }
      return result.data!
    })
  })).optional()
})

export const ComplianceSettingsSchema = z.object({
  regulatoryFrameworks: z.array(z.enum(['SOX', 'GDPR', 'CCPA', 'HIPAA', 'SOC2', 'ISO27001'])),
  auditTrailLevel: z.enum(['basic', 'detailed', 'comprehensive']).default('detailed'),
  retentionPeriodMonths: z.number().int().min(12).max(120).default(84), // 7 years default
  automaticReporting: z.boolean().default(true),
  complianceReports: z.array(z.object({
    reportType: z.enum(['quarterly', 'annual', 'on_demand']),
    recipients: z.array(z.string().transform((val, ctx) => {
      const result = createEmail(val)
      if (!result.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: result.error || 'Invalid email address'
        })
        return z.NEVER
      }
      return result.data!
    })),
    enabled: z.boolean().default(true)
  })),
  dataClassification: z.enum(['public', 'internal', 'confidential', 'restricted']).default('confidential'),
  encryptionRequired: z.boolean().default(true)
})

export const ResourceQuotasSchema = z.object({
  storageQuotaGB: z.number().positive().max(10000),
  usedStorageGB: z.number().nonnegative(),
  maxVaults: z.number().int().positive().max(1000),
  currentVaults: z.number().int().nonnegative(),
  maxBoardMembers: z.number().int().positive().max(500),
  currentBoardMembers: z.number().int().nonnegative(),
  apiCallsPerMonth: z.number().int().positive(),
  currentApiCalls: z.number().int().nonnegative(),
  maxMeetingsPerMonth: z.number().int().positive().max(1000),
  currentMeetings: z.number().int().nonnegative(),
  exportQuotaPerMonth: z.number().int().positive().max(100),
  currentExports: z.number().int().nonnegative()
})

export const PrivacySettingsSchema = z.object({
  dataProcessingConsent: z.boolean(),
  analyticsConsent: z.boolean().default(true),
  marketingConsent: z.boolean().default(false),
  thirdPartyIntegrations: z.boolean().default(true),
  dataRetentionOptOut: z.boolean().default(false),
  rightToPortability: z.boolean().default(true),
  rightToErasure: z.boolean().default(true),
  profileVisibility: z.enum(['public', 'organization', 'board_members', 'private']).default('organization'),
  activityVisibility: z.enum(['public', 'organization', 'board_members', 'private']).default('board_members'),
  contactable: z.boolean().default(true),
  directoryListing: z.boolean().default(true)
})

// ==== Notification Settings Validation ====

export const NotificationCategorySchema = z.enum([
  'board_governance',
  'documents', 
  'board_chat',
  'calendar',
  'compliance',
  'security'
])
export type NotificationCategory = z.infer<typeof NotificationCategorySchema>

export const NotificationPrioritySchema = z.enum(['low', 'medium', 'high', 'critical'])
export type NotificationPriority = z.infer<typeof NotificationPrioritySchema>

export const NotificationDeliveryMethodSchema = z.enum(['email', 'sms', 'push', 'webhook'])
export type NotificationDeliveryMethod = z.infer<typeof NotificationDeliveryMethodSchema>

export const NotificationFrequencySchema = z.enum(['immediate', 'digest_hourly', 'digest_daily', 'digest_weekly'])
export type NotificationFrequency = z.infer<typeof NotificationFrequencySchema>

export const NotificationPreferenceSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: NotificationCategorySchema,
  priority: NotificationPrioritySchema,
  enabled: z.boolean().default(true),
  frequency: NotificationFrequencySchema.default('immediate'),
  deliveryMethods: z.array(NotificationDeliveryMethodSchema)
})

export const NotificationCategorySettingsSchema = z.object({
  categoryId: NotificationCategorySchema,
  enabled: z.boolean().default(true),
  defaultFrequency: NotificationFrequencySchema.default('immediate'),
  notifications: z.array(NotificationPreferenceSchema)
})

export const NotificationGeneralSettingsSchema = z.object({
  userId: z.string().transform((val, ctx) => {
    const result = createUserId(val)
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error || 'Invalid user ID'
      })
      return z.NEVER
    }
    return result.data!
  }),
  organizationId: z.string().transform((val, ctx) => {
    const result = createOrganizationId(val)
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error || 'Invalid organization ID'
      })
      return z.NEVER
    }
    return result.data!
  }),
  globalEnabled: z.boolean().default(true),
  categories: z.array(NotificationCategorySettingsSchema),
  maxNotificationsPerHour: z.number().int().positive().max(100).default(25),
  bundleSimilar: z.boolean().default(true),
  smartBatching: z.boolean().default(true)
})

export const NotificationDeliverySettingsSchema = z.object({
  email: z.object({
    enabled: z.boolean().default(true),
    address: z.string().transform((val, ctx) => {
      const result = createEmail(val)
      if (!result.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: result.error || 'Invalid email address'
        })
        return z.NEVER
      }
      return result.data!
    }),
    verified: z.boolean().default(false),
    format: z.enum(['html', 'text']).default('html')
  }).optional(),
  sms: z.object({
    enabled: z.boolean().default(false),
    phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
    verified: z.boolean().default(false),
    criticalOnly: z.boolean().default(true)
  }).optional(),
  push: z.object({
    enabled: z.boolean().default(true),
    playSound: z.boolean().default(true),
    showOnDesktop: z.boolean().default(true),
    devices: z.array(z.object({
      deviceId: z.string(),
      name: z.string(),
      lastSeen: z.string().datetime(),
      active: z.boolean()
    }))
  }).optional(),
  webhook: z.object({
    enabled: z.boolean().default(false),
    url: z.string().transform((val, ctx) => {
      if (!val) return undefined
      const result = createUrl(val)
      if (!result.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid webhook URL'
        })
        return z.NEVER
      }
      return result.data!
    }),
    secretKey: z.string().optional(),
    retryPolicy: z.enum(['none', 'exponential', 'linear']).default('exponential')
  }).optional()
})

export const NotificationScheduleSettingsSchema = z.object({
  quietHours: z.object({
    enabled: z.boolean().default(true),
    startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    timezone: TimezoneSchema,
    allowCritical: z.boolean().default(true)
  }),
  digestSettings: z.object({
    daily: z.object({
      enabled: z.boolean().default(true),
      sendTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format')
    }),
    weekly: z.object({
      enabled: z.boolean().default(true),
      sendDay: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
      sendTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format')
    }),
    monthly: z.object({
      enabled: z.boolean().default(true),
      sendDate: z.enum(['1', '15', 'last']),
      sendTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format')
    })
  })
})

// ==== Export & Backup Settings Validation ====

export const ExportFormatSchema = z.enum(['json', 'csv', 'xlsx', 'pdf', 'zip', 'encrypted_zip'])
export type ExportFormat = z.infer<typeof ExportFormatSchema>

export const ExportCategorySchema = z.enum([
  'board_governance',
  'documents',
  'communications', 
  'calendar',
  'compliance',
  'security_logs'
])
export type ExportCategory = z.infer<typeof ExportCategorySchema>

export const EncryptionMethodSchema = z.enum(['none', 'aes_256', 'organization_key', 'pgp'])
export type EncryptionMethod = z.infer<typeof EncryptionMethodSchema>

export const ExportConfigurationSchema = z.object({
  categories: z.array(ExportCategorySchema).min(1, 'At least one category must be selected'),
  format: ExportFormatSchema,
  includeFiles: z.boolean().default(true),
  includeMetadata: z.boolean().default(true),
  anonymizePersonalData: z.boolean().default(false),
  encryption: EncryptionMethodSchema.default('none'),
  dateRange: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime()
  }).refine(
    (data) => new Date(data.startDate) < new Date(data.endDate),
    'Start date must be before end date'
  )
})

export const ScheduledExportSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Export name is required').max(100, 'Export name too long'),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
  schedule: z.object({
    time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    dayOfWeek: z.number().int().min(0).max(6).optional(), // For weekly
    dayOfMonth: z.number().int().min(1).max(31).optional() // For monthly
  }),
  configuration: ExportConfigurationSchema,
  enabled: z.boolean().default(true),
  lastRun: z.string().datetime().optional(),
  nextRun: z.string().datetime(),
  recipients: z.array(z.string().transform((val, ctx) => {
    const result = createEmail(val)
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error || 'Invalid email address'
      })
      return z.NEVER
    }
    return result.data!
  })).optional(),
  storageLocation: z.string().transform((val, ctx) => {
    if (!val) return undefined
    const result = createFilePath(val)
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid storage location'
      })
      return z.NEVER
    }
    return result.data!
  }).optional()
})

export const BackupPolicySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Policy name is required').max(100, 'Policy name too long'),
  enabled: z.boolean().default(true),
  frequency: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
  retentionDays: z.number().int().positive().max(7300), // Max ~20 years
  includeFiles: z.boolean().default(true),
  encryption: EncryptionMethodSchema.default('aes_256'),
  compressionLevel: z.number().int().min(0).max(9).default(6),
  storageLocation: z.enum(['local', 'cloud', 'hybrid']).default('cloud'),
  categories: z.array(ExportCategorySchema),
  incrementalBackup: z.boolean().default(true),
  verificationEnabled: z.boolean().default(true)
})

export const ComplianceExportSchema = z.object({
  requestType: z.enum(['gdpr_data_request', 'legal_hold', 'audit_export', 'regulatory_submission']),
  requesterId: z.string().transform((val, ctx) => {
    const result = createUserId(val)
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error || 'Invalid requester user ID'
      })
      return z.NEVER
    }
    return result.data!
  }),
  subjectUserId: z.string().transform((val, ctx) => {
    const result = createUserId(val)
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error || 'Invalid subject user ID'
      })
      return z.NEVER
    }
    return result.data!
  }).optional(),
  legalBasis: z.string().min(1, 'Legal basis is required').max(500, 'Legal basis too long'),
  dateRange: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime()
  }).refine(
    (data) => new Date(data.startDate) < new Date(data.endDate),
    'Start date must be before end date'
  ),
  categories: z.array(ExportCategorySchema).min(1, 'At least one category must be selected'),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  dueDate: z.string().datetime().optional(),
  specialInstructions: z.string().max(1000, 'Instructions too long').optional(),
  approvalRequired: z.boolean().default(true),
  approvers: z.array(z.string().transform((val, ctx) => {
    const result = createUserId(val)
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error || 'Invalid approver user ID'
      })
      return z.NEVER
    }
    return result.data!
  })).optional()
})

// ==== Security Settings Validation ====

export const MFAMethodSchema = z.enum(['totp', 'sms', 'email', 'hardware_key'])
export type MFAMethod = z.infer<typeof MFAMethodSchema>

export const SecurityEventSchema = z.object({
  eventType: z.enum(['login', 'logout', 'failed_login', 'password_change', 'mfa_enabled', 'mfa_disabled', 'permission_change']),
  timestamp: z.string().datetime(),
  ipAddress: z.string().ip(),
  userAgent: z.string(),
  location: z.string().optional(),
  riskScore: z.number().min(0).max(100),
  details: z.record(z.unknown()).optional()
})

export const AdvancedSecuritySettingsSchema = z.object({
  multiFactorAuth: z.object({
    enabled: z.boolean().default(false),
    primaryMethod: MFAMethodSchema.optional(),
    backupMethods: z.array(MFAMethodSchema).optional(),
    trustedDevices: z.array(z.object({
      deviceId: z.string(),
      name: z.string(),
      addedAt: z.string().datetime(),
      lastUsed: z.string().datetime().optional(),
      trusted: z.boolean().default(true)
    })).optional()
  }),
  accessControl: z.object({
    allowedIPs: z.array(z.string().ip()).optional(),
    blockedIPs: z.array(z.string().ip()).optional(),
    allowedCountries: z.array(z.string().length(2)).optional(), // ISO country codes
    blockSuspiciousLocations: z.boolean().default(true),
    requireVPNForRemoteAccess: z.boolean().default(false)
  }),
  sessionManagement: z.object({
    maxConcurrentSessions: z.number().int().positive().max(10).default(5),
    sessionTimeoutMinutes: z.number().int().min(5).max(480).default(60),
    forceLogoutOnPasswordChange: z.boolean().default(true),
    rememberDeviceDays: z.number().int().min(0).max(365).default(30)
  }),
  accountProtection: z.object({
    maxFailedLogins: z.number().int().positive().max(10).default(5),
    lockoutDurationMinutes: z.number().int().positive().max(1440).default(30), // Max 24 hours
    enablePasswordExpiry: z.boolean().default(false),
    passwordExpiryDays: z.number().int().positive().max(365).default(90),
    requirePasswordChangeOnSuspiciousActivity: z.boolean().default(true)
  }),
  monitoring: z.object({
    enableActivityLogging: z.boolean().default(true),
    logRetentionDays: z.number().int().positive().max(2555).default(365), // Max ~7 years
    enableRealTimeAlerts: z.boolean().default(true),
    alertThresholds: z.object({
      failedLoginsPerHour: z.number().int().positive().default(10),
      suspiciousLocationLogins: z.boolean().default(true),
      multipleDeviceLogins: z.boolean().default(true)
    })
  })
})

// ==== Combined Settings Schemas ====

export const UserSettingsSchema = z.object({
  userId: z.string().transform((val, ctx) => {
    const result = createUserId(val)
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error || 'Invalid user ID'
      })
      return z.NEVER
    }
    return result.data!
  }),
  organizationId: z.string().transform((val, ctx) => {
    const result = createOrganizationId(val)
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error || 'Invalid organization ID'
      })
      return z.NEVER
    }
    return result.data!
  }),
  accountOverview: AccountOverviewSettingsSchema.optional(),
  corporateProfile: CorporateProfileSettingsSchema.optional(),
  security: SecuritySettingsSchema.optional(),
  delegation: DelegationSettingsSchema.optional(),
  compliance: ComplianceSettingsSchema.optional(),
  resourceQuotas: ResourceQuotasSchema.optional(),
  privacy: PrivacySettingsSchema.optional(),
  notifications: z.object({
    general: NotificationGeneralSettingsSchema.optional(),
    delivery: NotificationDeliverySettingsSchema.optional(),
    schedule: NotificationScheduleSettingsSchema.optional()
  }).optional(),
  exports: z.object({
    scheduled: z.array(ScheduledExportSchema).optional(),
    backupPolicies: z.array(BackupPolicySchema).optional()
  }).optional(),
  advancedSecurity: AdvancedSecuritySettingsSchema.optional(),
  version: z.number().int().nonnegative().default(1),
  lastUpdatedAt: z.string().datetime(),
  lastUpdatedBy: z.string().transform((val, ctx) => {
    const result = createUserId(val)
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error || 'Invalid user ID'
      })
      return z.NEVER
    }
    return result.data!
  })
})

export const OrganizationSettingsSchema = z.object({
  organizationId: z.string().transform((val, ctx) => {
    const result = createOrganizationId(val)
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error || 'Invalid organization ID'
      })
      return z.NEVER
    }
    return result.data!
  }),
  defaultUserSettings: UserSettingsSchema.partial(),
  globalPolicies: z.object({
    requireMFA: z.boolean().default(false),
    allowDelegation: z.boolean().default(true),
    dataRetentionDays: z.number().int().positive().max(2555).default(2555), // Max ~7 years
    allowPersonalExports: z.boolean().default(true),
    requireApprovalForExports: z.boolean().default(false)
  }),
  complianceSettings: ComplianceSettingsSchema,
  backupPolicies: z.array(BackupPolicySchema),
  version: z.number().int().nonnegative().default(1),
  lastUpdatedAt: z.string().datetime(),
  lastUpdatedBy: z.string().transform((val, ctx) => {
    const result = createUserId(val)
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error || 'Invalid user ID'
      })
      return z.NEVER
    }
    return result.data!
  })
})

// ==== Type Exports ====

export type AccountOverviewSettings = z.infer<typeof AccountOverviewSettingsSchema>
export type CorporateProfileSettings = z.infer<typeof CorporateProfileSettingsSchema>
export type SecuritySettings = z.infer<typeof SecuritySettingsSchema>
export type DelegationSettings = z.infer<typeof DelegationSettingsSchema>
export type ComplianceSettings = z.infer<typeof ComplianceSettingsSchema>
export type ResourceQuotas = z.infer<typeof ResourceQuotasSchema>
export type PrivacySettings = z.infer<typeof PrivacySettingsSchema>

export type NotificationPreference = z.infer<typeof NotificationPreferenceSchema>
export type NotificationCategorySettings = z.infer<typeof NotificationCategorySettingsSchema>
export type NotificationGeneralSettings = z.infer<typeof NotificationGeneralSettingsSchema>
export type NotificationDeliverySettings = z.infer<typeof NotificationDeliverySettingsSchema>
export type NotificationScheduleSettings = z.infer<typeof NotificationScheduleSettingsSchema>

export type ExportConfiguration = z.infer<typeof ExportConfigurationSchema>
export type ScheduledExport = z.infer<typeof ScheduledExportSchema>
export type BackupPolicy = z.infer<typeof BackupPolicySchema>
export type ComplianceExport = z.infer<typeof ComplianceExportSchema>

export type SecurityEvent = z.infer<typeof SecurityEventSchema>
export type AdvancedSecuritySettings = z.infer<typeof AdvancedSecuritySettingsSchema>

export type UserSettings = z.infer<typeof UserSettingsSchema>
export type OrganizationSettings = z.infer<typeof OrganizationSettingsSchema>

// ==== Validation Helper Functions ====

export const validateUserSettings = (data: unknown) => UserSettingsSchema.safeParse(data)
export const validateOrganizationSettings = (data: unknown) => OrganizationSettingsSchema.safeParse(data)
export const validateNotificationSettings = (data: unknown) => NotificationGeneralSettingsSchema.safeParse(data)
export const validateExportConfiguration = (data: unknown) => ExportConfigurationSchema.safeParse(data)
export const validateSecuritySettings = (data: unknown) => AdvancedSecuritySettingsSchema.safeParse(data)

// ==== Settings Update Schemas (for partial updates) ====

export const UserSettingsUpdateSchema = UserSettingsSchema.partial().extend({
  userId: z.string().transform((val, ctx) => {
    const result = createUserId(val)
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error || 'Invalid user ID'
      })
      return z.NEVER
    }
    return result.data!
  }),
  version: z.number().int().nonnegative().optional()
})

export const OrganizationSettingsUpdateSchema = OrganizationSettingsSchema.partial().extend({
  organizationId: z.string().transform((val, ctx) => {
    const result = createOrganizationId(val)
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error || 'Invalid organization ID'
      })
      return z.NEVER
    }
    return result.data!
  }),
  version: z.number().int().nonnegative().optional()
})

export type UserSettingsUpdate = z.infer<typeof UserSettingsUpdateSchema>
export type OrganizationSettingsUpdate = z.infer<typeof OrganizationSettingsUpdateSchema>