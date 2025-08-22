import type { Organization, OrganizationInsert } from '@/types'

/**
 * Organization factory for creating test organizations
 */
export const OrganizationFactory = {
  /**
   * Create a basic organization
   */
  build(createdBy: string, overrides: Partial<OrganizationInsert> = {}): OrganizationInsert {
    const timestamp = new Date().toISOString()
    const randomId = Math.random().toString(36).substr(2, 9)
    const orgName = `Test Organization ${randomId}`
    
    return {
      id: `org-${randomId}`,
      name: orgName,
      slug: orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      description: `A test organization created for testing purposes - ${randomId}`,
      industry: 'Technology',
      organization_size: 'medium',
      website: `https://${orgName.toLowerCase().replace(/\s+/g, '')}.com`,
      // headquarters_location: 'San Francisco, CA',
      // founded_year: 2020,
      // employee_count: 150,
      // annual_revenue: 10000000, // $10M
      created_by: createdBy,
      created_at: timestamp,
      updated_at: timestamp,
      is_active: true,
      subscription_tier: 'premium',
      // subscription_status: 'active',
      billing_cycle: 'monthly',
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      // features_enabled: {
      //   advanced_analytics: true,
      //   voice_integration: true,
      //   ai_insights: true,
      //   compliance_tracking: true,
      //   board_collaboration: true
      // },
      // compliance_requirements: ['sox', 'gdpr'],
      board_meeting_frequency: 'quarterly',
      fiscal_year_end: '12-31',
      timezone: 'America/Los_Angeles',
      logo_url: null,
      theme_config: {
        primary_color: '#1f2937',
        secondary_color: '#3b82f6',
        accent_color: '#10b981'
      },
      ...overrides,
    }
  },

  /**
   * Create a technology startup
   */
  buildTechStartup(createdBy: string, overrides: Partial<OrganizationInsert> = {}): OrganizationInsert {
    const randomId = Math.random().toString(36).substr(2, 9)
    
    return this.build(createdBy, {
      name: `TechCorp ${randomId}`,
      industry: 'Technology',
      organization_size: 'small',
      // employee_count: 25,
      // annual_revenue: 2000000, // $2M
      // founded_year: 2022,
      description: 'Innovative technology startup disrupting the industry',
      // compliance_requirements: ['gdpr'],
      subscription_tier: 'standard',
      features_enabled: {
        advanced_analytics: false,
        voice_integration: true,
        ai_insights: true,
        compliance_tracking: false,
        board_collaboration: true
      },
      ...overrides,
    })
  },

  /**
   * Create a large enterprise
   */
  buildEnterprise(createdBy: string, overrides: Partial<OrganizationInsert> = {}): OrganizationInsert {
    const randomId = Math.random().toString(36).substr(2, 9)
    
    return this.build(createdBy, {
      name: `Enterprise Corp ${randomId}`,
      industry: 'Manufacturing',
      organization_size: 'enterprise',
      // employee_count: 5000,
      // annual_revenue: 500000000, // $500M
      // founded_year: 1995,
      description: 'Large multinational enterprise with complex governance needs',
      // compliance_requirements: ['sox', 'gdpr', 'hipaa'],
      subscription_tier: 'enterprise',
      // features_enabled: {
      //   advanced_analytics: true,
      //   voice_integration: true,
      //   ai_insights: true,
      //   compliance_tracking: true,
      //   board_collaboration: true
      // },
      board_meeting_frequency: 'monthly',
      ...overrides,
    })
  },

  /**
   * Create a financial services organization
   */
  buildFinancial(createdBy: string, overrides: Partial<OrganizationInsert> = {}): OrganizationInsert {
    const randomId = Math.random().toString(36).substr(2, 9)
    
    return this.build(createdBy, {
      name: `FinServ ${randomId}`,
      industry: 'Financial Services',
      organization_size: 'large',
      // employee_count: 1200,
      // annual_revenue: 75000000, // $75M
      // headquarters_location: 'New York, NY',
      // compliance_requirements: ['sox', 'gdpr', 'pci', 'basel'],
      board_meeting_frequency: 'monthly',
      fiscal_year_end: '12-31',
      subscription_tier: 'enterprise',
      ...overrides,
    })
  },

  /**
   * Create a nonprofit organization
   */
  buildNonprofit(createdBy: string, overrides: Partial<OrganizationInsert> = {}): OrganizationInsert {
    const randomId = Math.random().toString(36).substr(2, 9)
    
    return this.build(createdBy, {
      name: `Nonprofit Foundation ${randomId}`,
      industry: 'Nonprofit',
      organization_size: 'small',
      // employee_count: 15,
      // annual_revenue: 500000, // $500K
      // compliance_requirements: ['gdpr'],
      subscription_tier: 'standard',
      board_meeting_frequency: 'quarterly',
      features_enabled: {
        advanced_analytics: false,
        voice_integration: false,
        ai_insights: true,
        compliance_tracking: true,
        board_collaboration: true
      },
      ...overrides,
    })
  },

  /**
   * Create an inactive/suspended organization
   */
  buildInactive(createdBy: string, overrides: Partial<OrganizationInsert> = {}): OrganizationInsert {
    return this.build(createdBy, {
      is_active: false,
      // subscription_status: 'suspended',
      deleted_at: new Date().toISOString(),
      description: 'Inactive organization for testing edge cases',
      features_enabled: {
        advanced_analytics: false,
        voice_integration: false,
        ai_insights: false,
        compliance_tracking: false,
        board_collaboration: false
      },
      ...overrides,
    })
  },

  /**
   * Build multiple organizations with different characteristics
   */
  buildList(createdBy: string, count: number, overrides: Partial<OrganizationInsert> = {}): OrganizationInsert[] {
    return Array.from({ length: count }, (_, index) => 
      this.build(createdBy, {
        name: `Test Organization ${index + 1}`,
        slug: `test-organization-${index + 1}`,
        ...overrides,
      })
    )
  },

  /**
   * Build organizations with different industries
   */
  buildWithIndustries(createdBy: string, industries: string[]): OrganizationInsert[] {
    return industries.map((industry, index) => 
      this.build(createdBy, {
        name: `${industry} Company ${index + 1}`,
        industry,
        slug: `${industry.toLowerCase()}-company-${index + 1}`,
      })
    )
  },

  /**
   * Build organizations with different sizes
   */
  buildWithSizes(createdBy: string): OrganizationInsert[] {
    const sizes: Array<'small' | 'medium' | 'large' | 'enterprise'> = ['small', 'medium', 'large', 'enterprise']
    
    return sizes.map((size, index) => {
      const employeeCount = size === 'small' ? 25 : size === 'medium' ? 150 : size === 'large' ? 1000 : 5000
      const revenue = size === 'small' ? 1000000 : size === 'medium' ? 10000000 : size === 'large' ? 100000000 : 1000000000
      
      return this.build(createdBy, {
        name: `${size.charAt(0).toUpperCase() + size.slice(1)} Company ${index + 1}`,
        organization_size: size,
        // employee_count: employeeCount,
        // annual_revenue: revenue,
        slug: `${size}-company-${index + 1}`,
      })
    })
  },
}

/**
 * Organization factory with relationships
 */
export const OrganizationFactoryWithRelations = {
  /**
   * Create organization with predefined members
   */
  buildWithMembers(createdBy: string, memberIds: string[], overrides: Partial<OrganizationInsert> = {}): {
    organization: OrganizationInsert
    memberships: Array<{
      organization_id: string
      user_id: string
      role: string
      status: string
      joined_at: string
      is_primary: boolean
    }>
  } {
    const organization = OrganizationFactory.build(createdBy, overrides)
    
    const memberships = memberIds.map((userId, index) => ({
      organization_id: organization.id!,
      user_id: userId,
      role: index === 0 ? 'owner' : 'member',
      status: 'active',
      joined_at: new Date().toISOString(),
      is_primary: index === 0,
    }))

    // Add creator as owner if not already in memberIds
    if (!memberIds.includes(createdBy)) {
      memberships.unshift({
        organization_id: organization.id!,
        user_id: createdBy,
        role: 'owner',
        status: 'active',
        joined_at: new Date().toISOString(),
        is_primary: true,
      })
    }

    return { organization, memberships }
  },
}

/**
 * Pre-defined organization templates
 */
export const OrganizationTemplates = {
  // Typical SaaS startup
  saasStartup: (createdBy: string) => OrganizationFactory.buildTechStartup(createdBy, {
    name: 'SaaS Startup Inc.',
    description: 'Cloud-based software solutions for modern businesses',
    industry: 'Software',
    website: 'https://saasstartup.com',
    // employee_count: 35,
    // annual_revenue: 3500000,
  }),

  // Traditional bank
  traditionalBank: (createdBy: string) => OrganizationFactory.buildFinancial(createdBy, {
    name: 'First National Bank',
    description: 'Traditional banking services with modern technology',
    // headquarters_location: 'Chicago, IL',
    // employee_count: 2500,
    // annual_revenue: 250000000,
    // founded_year: 1985,
  }),

  // Healthcare nonprofit
  healthcareNonprofit: (createdBy: string) => OrganizationFactory.buildNonprofit(createdBy, {
    name: 'Healthcare Foundation',
    description: 'Improving community health through innovative programs',
    industry: 'Healthcare',
    // compliance_requirements: ['gdpr', 'hipaa'],
    // annual_revenue: 2000000,
  }),

  // Global enterprise
  globalEnterprise: (createdBy: string) => OrganizationFactory.buildEnterprise(createdBy, {
    name: 'Global Manufacturing Corp',
    description: 'Leading manufacturer with operations across 50 countries',
    industry: 'Manufacturing',
    // employee_count: 25000,
    // annual_revenue: 2000000000,
    // headquarters_location: 'Detroit, MI',
    // compliance_requirements: ['sox', 'gdpr', 'iso27001', 'environmental'],
  }),
}