import type { User, UserInsert } from '@/types'

/**
 * Base user factory - creates realistic user data
 */
export const UserFactory = {
  /**
   * Create a basic user
   */
  build(overrides: Partial<UserInsert> = {}): UserInsert {
    const timestamp = new Date().toISOString()
    const randomId = Math.random().toString(36).substr(2, 9)
    
    return {
      id: `user-${randomId}`,
      email: `user-${randomId}@example.com`,
      full_name: `Test User ${randomId}`,
      role: 'director',
      status: 'approved',
      company: 'Test Company Ltd.',
      position: 'Board Director',
      // bio: null,
      linkedin_profile: null,
      phone: null,
      timezone: 'UTC',
      language: 'en',
      notification_preferences: {
        email: true,
        push: true,
        sms: false
      },
      avatar_url: null,
      // email_verified: true,
      password_set: true,
      created_at: timestamp,
      updated_at: timestamp,
      last_login_at: timestamp,
      login_count: 1,
      ...overrides,
    }
  },

  /**
   * Create an admin user
   */
  buildAdmin(overrides: Partial<UserInsert> = {}): UserInsert {
    return this.build({
      role: 'admin',
      full_name: 'System Administrator',
      position: 'System Admin',
      ...overrides,
    })
  },

  /**
   * Create a director user
   */
  buildDirector(overrides: Partial<UserInsert> = {}): UserInsert {
    return this.build({
      role: 'director',
      full_name: 'Board Director',
      position: 'Director',
      ...overrides,
    })
  },

  /**
   * Create a viewer user
   */
  buildViewer(overrides: Partial<UserInsert> = {}): UserInsert {
    return this.build({
      role: 'viewer',
      full_name: 'Board Observer',
      position: 'Observer',
      ...overrides,
    })
  },

  /**
   * Create a pending user (not yet approved)
   */
  buildPending(overrides: Partial<UserInsert> = {}): UserInsert {
    return this.build({
      status: 'pending',
      full_name: 'Pending User',
      password_set: false,
      // email_verified: false,
      last_login_at: null,
      login_count: 0,
      ...overrides,
    })
  },

  /**
   * Create a user with complete profile
   */
  buildComplete(overrides: Partial<UserInsert> = {}): UserInsert {
    const randomId = Math.random().toString(36).substr(2, 9)
    
    return this.build({
      // bio: 'Experienced board director with expertise in strategy and governance.',
      linkedin_profile: `https://linkedin.com/in/user-${randomId}`,
      phone: '+1-555-0123',
      avatar_url: `https://avatar.example.com/user-${randomId}.jpg`,
      ...overrides,
    })
  },

  /**
   * Build multiple users
   */
  buildList(count: number, overrides: Partial<UserInsert> = {}): UserInsert[] {
    return Array.from({ length: count }, (_, index) => 
      this.build({
        email: `user-${index}@example.com`,
        full_name: `Test User ${index + 1}`,
        ...overrides,
      })
    )
  },

  /**
   * Build users with different roles
   */
  buildWithRoles(roles: Array<'admin' | 'director' | 'viewer'>): UserInsert[] {
    return roles.map((role, index) => 
      this.build({
        role,
        email: `${role}-${index}@example.com`,
        full_name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)} ${index + 1}`,
        position: role === 'admin' ? 'Administrator' : 
                 role === 'director' ? 'Board Director' : 'Observer',
      })
    )
  },

  /**
   * Create user for specific organization context
   */
  buildForOrganization(organizationName: string, overrides: Partial<UserInsert> = {}): UserInsert {
    const randomId = Math.random().toString(36).substr(2, 9)
    
    return this.build({
      email: `user-${randomId}@${organizationName.toLowerCase().replace(/\s+/g, '')}.com`,
      company: organizationName,
      full_name: `${organizationName} User ${randomId}`,
      ...overrides,
    })
  },
}

/**
 * User factory with database persistence
 */
export const UserFactoryWithDB = {
  /**
   * Create and save user to test database
   */
  async create(overrides: Partial<UserInsert> = {}): Promise<User> {
    const userData = UserFactory.build(overrides)
    // This would use testDb.createUser() in actual implementation
    // For now, return the data with mock ID persistence
    return {
      ...userData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as User
  },

  /**
   * Create multiple users in database
   */
  async createList(count: number, overrides: Partial<UserInsert> = {}): Promise<User[]> {
    const promises = Array.from({ length: count }, () => this.create(overrides))
    return Promise.all(promises)
  },
}

/**
 * Pre-defined user templates for common test scenarios
 */
export const UserTemplates = {
  // CEO/Founder profile
  ceo: UserFactory.buildComplete({
    role: 'admin',
    full_name: 'Chief Executive Officer',
    position: 'CEO & Founder',
    // bio: 'Visionary leader with 20+ years of experience in scaling technology companies.',
  }),

  // Board chair profile
  chairperson: UserFactory.buildComplete({
    role: 'director',
    full_name: 'Board Chairperson',
    position: 'Chairman of the Board',
    // bio: 'Experienced board leader with expertise in corporate governance.',
  }),

  // Independent director
  independentDirector: UserFactory.buildComplete({
    role: 'director',
    full_name: 'Independent Director',
    position: 'Independent Board Director',
    // bio: 'Independent director bringing external perspective and industry expertise.',
  }),

  // Audit committee member
  auditMember: UserFactory.buildComplete({
    role: 'director',
    full_name: 'Audit Committee Member',
    position: 'Director & Audit Committee Chair',
    // bio: 'Financial expert with CPA certification and audit committee experience.',
  }),

  // External observer
  observer: UserFactory.buildViewer({
    full_name: 'External Observer',
    position: 'Board Observer',
    // bio: 'External stakeholder observer with limited access privileges.',
  }),

  // New user awaiting approval
  newApplicant: UserFactory.buildPending({
    full_name: 'New Board Candidate',
    position: 'Prospective Director',
    // bio: null,
  }),
}