/**
 * Settings Test Data Factories
 * Following CLAUDE.md Factory Pattern for consistent test data generation
 */

import { faker } from '@faker-js/faker'
import type {
  UserId,
  OrganizationId,
  ExportJobId,
  NotificationId,
  BackupPolicyId
} from '@/types/branded'
import type {
  ExportJob,
  ExportJobStatus,
  ExportFormat,
  ExportCategory,
  NotificationPreference,
  NotificationType,
  NotificationFrequency,
  DeliveryMethod,
  BackupPolicy,
  RetentionPeriod,
  BackupStorageLocation
} from '@/types/export-backup-types'
import type { 
  NotificationSettingsProps,
  ExportBackupSettingsProps 
} from '@/types/notification-types'
import type { UserContextData } from '@/hooks/useUserContext'

// User Context Factory
export class UserContextFactory {
  static create(overrides: Partial<UserContextData> = {}): UserContextData {
    return {
      user: {
        id: faker.string.uuid() as UserId,
        email: faker.internet.email(),
        name: faker.person.fullName(),
        avatar: faker.image.avatar(),
        profile: {
          displayName: faker.person.fullName(),
          title: faker.person.jobTitle(),
          bio: faker.lorem.paragraph(),
          department: faker.commerce.department(),
          phoneNumber: faker.phone.number(),
          location: faker.location.city()
        }
      },
      userId: faker.string.uuid() as UserId,
      isAuthenticated: true,
      currentOrganization: {
        id: faker.string.uuid() as OrganizationId,
        name: faker.company.name(),
        role: faker.helpers.arrayElement(['owner', 'admin', 'member', 'viewer']),
        joinedAt: faker.date.past(),
        permissions: [
          'read:board',
          'write:documents',
          'manage:members'
        ]
      },
      organizationId: faker.string.uuid() as OrganizationId,
      organizations: [
        {
          id: faker.string.uuid() as OrganizationId,
          name: faker.company.name(),
          role: 'admin',
          joinedAt: faker.date.past(),
          permissions: ['read:board', 'write:documents']
        }
      ],
      accountType: faker.helpers.arrayElement(['Superuser', 'Administrator', 'User', 'Viewer']),
      isLoading: false,
      hasError: false,
      errorMessage: null,
      ...overrides
    }
  }

  static createSuperuser(): UserContextData {
    return this.create({
      accountType: 'Superuser',
      user: {
        id: faker.string.uuid() as UserId,
        email: 'admin@appboardguru.com',
        name: 'Super Administrator',
        avatar: faker.image.avatar(),
        profile: {
          displayName: 'Super Administrator',
          title: 'Platform Administrator',
          bio: 'Platform super administrator',
          department: 'IT',
          phoneNumber: faker.phone.number(),
          location: 'San Francisco'
        }
      }
    })
  }

  static createLoading(): UserContextData {
    return this.create({
      isLoading: true,
      user: null,
      userId: null,
      currentOrganization: null,
      organizationId: null
    })
  }

  static createError(): UserContextData {
    return this.create({
      hasError: true,
      errorMessage: 'Failed to load user context',
      user: null,
      userId: null
    })
  }
}

// Export Job Factory
export class ExportJobFactory {
  static create(overrides: Partial<ExportJob> = {}): ExportJob {
    return {
      id: faker.string.uuid() as ExportJobId,
      name: `${faker.commerce.productName()} Export`,
      description: faker.lorem.sentence(),
      userId: faker.string.uuid() as UserId,
      organizationId: faker.string.uuid() as OrganizationId,
      categories: faker.helpers.arrayElements([
        'board_governance',
        'documents', 
        'communications',
        'calendar',
        'compliance',
        'security_logs'
      ] as ExportCategory[]),
      dataTypes: faker.helpers.arrayElements([
        'board_meetings',
        'document_metadata',
        'board_chat_messages',
        'calendar_events',
        'compliance_workflows',
        'login_records'
      ]),
      format: faker.helpers.arrayElement(['json', 'csv', 'xlsx', 'pdf'] as ExportFormat[]),
      compression: faker.helpers.arrayElement(['none', 'zip', 'gzip']),
      encryption: faker.helpers.arrayElement(['none', 'aes_256', 'pgp']),
      encryptionKey: faker.datatype.boolean() ? faker.string.alphanumeric(32) : undefined,
      scope: {
        dateRange: {
          startDate: faker.date.past(),
          endDate: faker.date.recent()
        },
        userFilter: [faker.string.uuid() as UserId],
        organizationFilter: [faker.string.uuid() as OrganizationId]
      },
      includeMetadata: faker.datatype.boolean(),
      includeAttachments: faker.datatype.boolean(),
      anonymizeData: faker.datatype.boolean(),
      scheduled: faker.datatype.boolean(),
      frequency: faker.helpers.arrayElement(['manual', 'daily', 'weekly', 'monthly']),
      status: faker.helpers.arrayElement([
        'pending',
        'running', 
        'completed',
        'failed',
        'cancelled'
      ] as ExportJobStatus[]),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      nextRun: faker.date.future(),
      lastRun: faker.date.past(),
      ...overrides
    }
  }

  static createScheduled(): ExportJob {
    return this.create({
      scheduled: true,
      frequency: 'weekly',
      nextRun: faker.date.soon(),
      status: 'scheduled'
    })
  }

  static createFailed(): ExportJob {
    return this.create({
      status: 'failed',
      lastRun: faker.date.recent()
    })
  }

  static createLargeExport(): ExportJob {
    return this.create({
      categories: ['board_governance', 'documents', 'communications', 'calendar', 'compliance'],
      format: 'zip',
      compression: 'gzip',
      encryption: 'aes_256',
      includeAttachments: true
    })
  }
}

// Notification Preference Factory  
export class NotificationPreferenceFactory {
  static create(overrides: Partial<NotificationPreference> = {}): NotificationPreference {
    return {
      id: faker.string.uuid() as any,
      userId: faker.string.uuid() as UserId,
      organizationId: faker.string.uuid() as OrganizationId,
      type: faker.helpers.arrayElement([
        'board_meeting_scheduled',
        'document_uploaded',
        'new_message',
        'security_alert'
      ] as NotificationType[]),
      category: faker.helpers.arrayElement([
        'board_governance',
        'documents',
        'board_chat',
        'security'
      ]),
      deliveryMethods: faker.helpers.arrayElements([
        'email',
        'in_app',
        'sms',
        'push'
      ] as DeliveryMethod[]),
      frequency: faker.helpers.arrayElement([
        'immediate',
        'digest_daily',
        'digest_weekly'
      ] as NotificationFrequency[]),
      priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'critical']),
      enabled: faker.datatype.boolean(),
      quietHours: faker.datatype.boolean() ? {
        start: '22:00',
        end: '08:00',
        timezone: 'America/New_York'
      } : undefined,
      customMessage: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
      ...overrides
    }
  }

  static createCriticalAlert(): NotificationPreference {
    return this.create({
      type: 'security_alert',
      category: 'security',
      priority: 'critical',
      deliveryMethods: ['email', 'sms', 'push'],
      frequency: 'immediate',
      enabled: true
    })
  }

  static createBoardGovernance(): NotificationPreference {
    return this.create({
      type: 'board_meeting_scheduled',
      category: 'board_governance',
      priority: 'high',
      deliveryMethods: ['email', 'in_app'],
      frequency: 'immediate'
    })
  }
}

// Backup Policy Factory
export class BackupPolicyFactory {
  static create(overrides: Partial<BackupPolicy> = {}): BackupPolicy {
    return {
      id: faker.string.uuid() as BackupPolicyId,
      name: `${faker.company.name()} Backup Policy`,
      organizationId: faker.string.uuid() as OrganizationId,
      enabled: faker.datatype.boolean(),
      categories: faker.helpers.arrayElements([
        'board_governance',
        'documents',
        'communications'
      ] as ExportCategory[]),
      frequency: faker.helpers.arrayElement(['daily', 'weekly', 'monthly']),
      retentionPeriod: faker.helpers.arrayElement([
        '30_days',
        '90_days', 
        '1_year',
        '7_years'
      ] as RetentionPeriod[]),
      encryption: faker.helpers.arrayElement(['none', 'aes_256', 'pgp']),
      storageLocation: faker.helpers.arrayElement([
        'local_server',
        'aws_s3',
        'azure_blob'
      ] as BackupStorageLocation[]),
      includeFiles: faker.datatype.boolean(),
      includeSystemLogs: faker.datatype.boolean(),
      compressBackups: faker.datatype.boolean(),
      verifyIntegrity: faker.datatype.boolean(),
      notifyOnCompletion: faker.datatype.boolean(),
      notifyOnFailure: faker.datatype.boolean(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      lastBackup: faker.date.recent(),
      nextBackup: faker.date.soon(),
      ...overrides
    }
  }

  static createCompliantPolicy(): BackupPolicy {
    return this.create({
      enabled: true,
      frequency: 'daily',
      retentionPeriod: '7_years',
      encryption: 'aes_256',
      storageLocation: 'aws_s3',
      includeFiles: true,
      includeSystemLogs: true,
      verifyIntegrity: true,
      notifyOnFailure: true
    })
  }
}

// Settings Component Props Factories
export class SettingsPropsFactory {
  static createNotificationSettingsProps(
    overrides: Partial<NotificationSettingsProps> = {}
  ): NotificationSettingsProps {
    return {
      accountType: faker.helpers.arrayElement(['Superuser', 'Administrator', 'User', 'Viewer']),
      userId: faker.string.uuid() as UserId,
      organizationId: faker.string.uuid() as OrganizationId,
      ...overrides
    }
  }

  static createExportBackupSettingsProps(
    overrides: Partial<ExportBackupSettingsProps> = {}
  ): ExportBackupSettingsProps {
    return {
      accountType: faker.helpers.arrayElement(['Superuser', 'Administrator', 'User', 'Viewer']),
      userId: faker.string.uuid() as UserId,
      organizationId: faker.string.uuid() as OrganizationId,
      ...overrides
    }
  }

  static createSuperuserProps(): NotificationSettingsProps {
    return this.createNotificationSettingsProps({
      accountType: 'Superuser'
    })
  }

  static createViewerProps(): NotificationSettingsProps {
    return this.createNotificationSettingsProps({
      accountType: 'Viewer'
    })
  }
}

// Mock Data Generators
export class MockDataGenerator {
  static generateLargeDataset<T>(factory: () => T, count: number = 1000): T[] {
    return Array.from({ length: count }, factory)
  }

  static generateExportJobsDataset(count: number = 100): ExportJob[] {
    return this.generateLargeDataset(() => ExportJobFactory.create(), count)
  }

  static generateNotificationPreferencesDataset(count: number = 50): NotificationPreference[] {
    return this.generateLargeDataset(() => NotificationPreferenceFactory.create(), count)
  }

  // Generate test scenarios
  static generateTestScenarios() {
    return {
      // User context scenarios
      authenticatedSuperuser: UserContextFactory.createSuperuser(),
      authenticatedUser: UserContextFactory.create({ accountType: 'User' }),
      loadingUser: UserContextFactory.createLoading(),
      errorUser: UserContextFactory.createError(),
      
      // Export scenarios
      pendingExport: ExportJobFactory.create({ status: 'pending' }),
      runningExport: ExportJobFactory.create({ status: 'running' }),
      completedExport: ExportJobFactory.create({ status: 'completed' }),
      failedExport: ExportJobFactory.createFailed(),
      scheduledExport: ExportJobFactory.createScheduled(),
      
      // Notification scenarios
      criticalNotification: NotificationPreferenceFactory.createCriticalAlert(),
      boardGovernanceNotification: NotificationPreferenceFactory.createBoardGovernance(),
      
      // Backup scenarios
      compliantBackupPolicy: BackupPolicyFactory.createCompliantPolicy(),
      disabledBackupPolicy: BackupPolicyFactory.create({ enabled: false })
    }
  }
}