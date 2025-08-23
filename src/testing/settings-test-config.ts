/**
 * Settings Test Configuration
 * Following CLAUDE.md testing guidelines with 80% coverage targets
 */

import { jest } from '@jest/globals'
import type { 
  UserId, 
  OrganizationId, 
  ExportJobId, 
  NotificationId,
  BackupPolicyId 
} from '@/types/branded'

// Test coverage thresholds following CLAUDE.md
export const COVERAGE_THRESHOLDS = {
  repositories: 85,
  services: 80,
  apiControllers: 75,
  components: 70,
  overall: 80
}

// Test timeout configurations
export const TEST_TIMEOUTS = {
  unit: 5000,        // 5 seconds
  integration: 15000, // 15 seconds  
  e2e: 30000,        // 30 seconds
  performance: 60000  // 1 minute
}

// Mock branded type constructors for testing
export const createTestUserId = (id: string = 'test-user-123'): UserId => id as UserId
export const createTestOrganizationId = (id: string = 'test-org-456'): OrganizationId => id as OrganizationId
export const createTestExportJobId = (id: string = 'test-export-789'): ExportJobId => id as ExportJobId
export const createTestNotificationId = (id: string = 'test-notification-101'): NotificationId => id as NotificationId
export const createTestBackupPolicyId = (id: string = 'test-backup-112'): BackupPolicyId => id as BackupPolicyId

// Test environment setup
export const setupTestEnvironment = () => {
  // Mock Supabase client
  jest.mock('@/lib/supabase', () => ({
    createClient: jest.fn(() => ({
      from: jest.fn(() => ({
        select: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        eq: jest.fn(),
        in: jest.fn(),
        gte: jest.fn(),
        lte: jest.fn(),
        order: jest.fn(),
        limit: jest.fn()
      })),
      auth: {
        getUser: jest.fn(),
        getSession: jest.fn()
      }
    }))
  }))

  // Mock Next.js router
  jest.mock('next/navigation', () => ({
    useRouter: jest.fn(() => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn()
    })),
    usePathname: jest.fn(() => '/dashboard/settings'),
    useSearchParams: jest.fn(() => new URLSearchParams())
  }))

  // Mock React hooks
  jest.mock('react', () => ({
    ...jest.requireActual('react'),
    useCallback: jest.fn((fn) => fn),
    useMemo: jest.fn((fn) => fn()),
    useEffect: jest.fn((fn) => fn())
  }))
}

// Test data cleanup
export const cleanupTestData = async () => {
  // Clean up test database records
  // Clean up test files
  // Reset mock states
}