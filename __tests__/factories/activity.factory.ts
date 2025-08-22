/**
 * Activity factory for creating test activity logs
 */
export const ActivityFactory = {
  /**
   * Create a basic activity log entry
   */
  build(userId: string, overrides: any = {}): any {
    const randomId = Math.random().toString(36).substr(2, 9)
    const timestamp = new Date().toISOString()
    
    return {
      id: `activity-${randomId}`,
      user_id: userId,
      action: 'view_document',
      resource_type: 'asset',
      resource_id: `asset-${randomId}`,
      description: 'User viewed a document',
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      session_id: `session-${randomId}`,
      organization_id: `org-${randomId}`,
      metadata: {
        resource_title: 'Test Document',
        duration_seconds: 120,
        page_count: 5,
      },
      created_at: timestamp,
      ...overrides,
    }
  },

  /**
   * Create document view activity
   */
  buildDocumentView(userId: string, assetId: string, overrides: any = {}): any {
    return this.build(userId, {
      action: 'view_document',
      resource_type: 'asset',
      resource_id: assetId,
      description: 'User viewed a board document',
      metadata: {
        resource_title: 'Board Financial Report',
        duration_seconds: 180,
        page_count: 12,
        access_method: 'web_browser',
      },
      ...overrides,
    })
  },

  /**
   * Create document download activity
   */
  buildDocumentDownload(userId: string, assetId: string, overrides: any = {}): any {
    return this.build(userId, {
      action: 'download_document',
      resource_type: 'asset',
      resource_id: assetId,
      description: 'User downloaded a board document',
      metadata: {
        resource_title: 'Board Financial Report',
        file_size_bytes: 2048000,
        download_method: 'direct_link',
      },
      ...overrides,
    })
  },

  /**
   * Create vault access activity
   */
  buildVaultAccess(userId: string, vaultId: string, overrides: any = {}): any {
    return this.build(userId, {
      action: 'access_vault',
      resource_type: 'vault',
      resource_id: vaultId,
      description: 'User accessed board meeting vault',
      metadata: {
        resource_title: 'Q4 2024 Board Meeting',
        access_level: 'read',
        materials_count: 8,
      },
      ...overrides,
    })
  },

  /**
   * Create login activity
   */
  buildLogin(userId: string, overrides: any = {}): any {
    return this.build(userId, {
      action: 'user_login',
      resource_type: 'user',
      resource_id: userId,
      description: 'User logged into the platform',
      metadata: {
        login_method: 'email_password',
        device_type: 'desktop',
        browser: 'Chrome',
        location: 'San Francisco, CA',
      },
      ...overrides,
    })
  },

  /**
   * Create logout activity
   */
  buildLogout(userId: string, overrides: any = {}): any {
    return this.build(userId, {
      action: 'user_logout',
      resource_type: 'user',
      resource_id: userId,
      description: 'User logged out of the platform',
      metadata: {
        session_duration_minutes: 45,
        logout_method: 'manual',
      },
      ...overrides,
    })
  },

  /**
   * Create annotation creation activity
   */
  buildAnnotationCreated(userId: string, assetId: string, overrides: any = {}): any {
    return this.build(userId, {
      action: 'create_annotation',
      resource_type: 'annotation',
      resource_id: `annotation-${Date.now()}`,
      description: 'User created an annotation on document',
      metadata: {
        parent_asset_id: assetId,
        annotation_type: 'highlight',
        page_number: 3,
        content_length: 25,
      },
      ...overrides,
    })
  },

  /**
   * Create organization creation activity
   */
  buildOrganizationCreated(userId: string, organizationId: string, overrides: any = {}): any {
    return this.build(userId, {
      action: 'create_organization',
      resource_type: 'organization',
      resource_id: organizationId,
      description: 'User created a new organization',
      metadata: {
        organization_name: 'Test Organization',
        organization_size: 'medium',
        industry: 'Technology',
      },
      ...overrides,
    })
  },

  /**
   * Create invitation sent activity
   */
  buildInvitationSent(userId: string, invitationId: string, overrides: any = {}): any {
    return this.build(userId, {
      action: 'send_invitation',
      resource_type: 'invitation',
      resource_id: invitationId,
      description: 'User sent an organization invitation',
      metadata: {
        invitation_type: 'organization',
        invited_email: 'newmember@example.com',
        role: 'director',
      },
      ...overrides,
    })
  },

  /**
   * Create security event activity
   */
  buildSecurityEvent(userId: string, eventType: string, overrides: any = {}): any {
    return this.build(userId, {
      action: 'security_event',
      resource_type: 'security',
      resource_id: `security-${Date.now()}`,
      description: `Security event: ${eventType}`,
      metadata: {
        event_type: eventType,
        severity: eventType.includes('failed') ? 'high' : 'medium',
        requires_review: true,
      },
      ...overrides,
    })
  },

  /**
   * Create multiple activities for a user session
   */
  buildUserSession(userId: string, sessionDurationMinutes: number = 30): any[] {
    const activities = []
    const sessionStart = new Date()
    
    // Login
    activities.push(this.buildLogin(userId, {
      created_at: sessionStart.toISOString(),
    }))

    // Various activities during session
    const activityCount = Math.floor(sessionDurationMinutes / 5) // One activity every 5 minutes
    
    for (let i = 1; i <= activityCount; i++) {
      const activityTime = new Date(sessionStart.getTime() + (i * 5 * 60 * 1000))
      
      if (i % 3 === 0) {
        activities.push(this.buildDocumentView(userId, `asset-${i}`, {
          created_at: activityTime.toISOString(),
        }))
      } else if (i % 3 === 1) {
        activities.push(this.buildVaultAccess(userId, `vault-${i}`, {
          created_at: activityTime.toISOString(),
        }))
      } else {
        activities.push(this.buildAnnotationCreated(userId, `asset-${i}`, {
          created_at: activityTime.toISOString(),
        }))
      }
    }

    // Logout
    activities.push(this.buildLogout(userId, {
      created_at: new Date(sessionStart.getTime() + (sessionDurationMinutes * 60 * 1000)).toISOString(),
    }))

    return activities
  },

  /**
   * Create activities with different action types
   */
  buildWithActionTypes(userId: string): any[] {
    const actions = [
      'view_document',
      'download_document',
      'create_annotation',
      'access_vault',
      'send_invitation',
      'create_organization',
      'user_login',
      'user_logout',
    ]
    
    return actions.map((action, index) =>
      this.build(userId, {
        action,
        description: `User performed ${action.replace('_', ' ')}`,
        resource_type: this.getResourceTypeForAction(action),
      })
    )
  },

  /**
   * Create high-volume activity logs for performance testing
   */
  buildBulkActivities(userIds: string[], activitiesPerUser: number = 100): any[] {
    return userIds.flatMap(userId =>
      Array.from({ length: activitiesPerUser }, (_, index) => {
        const actions = ['view_document', 'access_vault', 'download_document', 'create_annotation']
        const action = actions[index % actions.length]
        
        return this.build(userId, {
          action,
          created_at: new Date(Date.now() - (Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString(), // Random time in last 30 days
        })
      })
    )
  },

  /**
   * Helper to get resource type based on action
   */
  getResourceTypeForAction(action: string): string {
    const mapping: Record<string, string> = {
      'view_document': 'asset',
      'download_document': 'asset',
      'create_annotation': 'annotation',
      'access_vault': 'vault',
      'send_invitation': 'invitation',
      'create_organization': 'organization',
      'user_login': 'user',
      'user_logout': 'user',
      'security_event': 'security',
    }
    
    return mapping[action] || 'unknown'
  },
}

/**
 * Pre-defined activity templates
 */
export const ActivityTemplates = {
  // Board member reviewing materials before meeting
  boardPreparation: (userId: string, vaultId: string) => [
    ActivityFactory.buildVaultAccess(userId, vaultId, {
      metadata: {
        resource_title: 'Q4 2024 Board Meeting',
        preparation_time_minutes: 120,
        materials_reviewed: 8,
      },
    }),
    ...Array.from({ length: 8 }, (_, i) =>
      ActivityFactory.buildDocumentView(userId, `asset-${i + 1}`, {
        metadata: {
          resource_title: `Board Document ${i + 1}`,
          duration_seconds: 300 + (i * 60),
          page_count: 5 + i,
        },
      })
    ),
  ],

  // Emergency board session activities
  emergencySession: (userId: string) => [
    ActivityFactory.buildLogin(userId, {
      metadata: {
        login_method: 'emergency_access',
        urgency_level: 'critical',
      },
    }),
    ActivityFactory.buildVaultAccess(userId, 'emergency-vault', {
      metadata: {
        resource_title: 'Emergency Board Session',
        access_reason: 'crisis_response',
      },
    }),
    ActivityFactory.buildDocumentView(userId, 'crisis-report', {
      metadata: {
        resource_title: 'Crisis Assessment Report',
        priority: 'critical',
        read_duration_seconds: 600,
      },
    }),
  ],

  // New user onboarding activities
  userOnboarding: (userId: string, organizationId: string) => [
    ActivityFactory.buildLogin(userId, {
      metadata: {
        login_method: 'first_time',
        onboarding_status: 'started',
      },
    }),
    ActivityFactory.build(userId, {
      action: 'complete_profile',
      resource_type: 'user',
      resource_id: userId,
      description: 'User completed profile setup',
      metadata: {
        profile_completion: 100,
        avatar_uploaded: true,
      },
    }),
    ActivityFactory.buildVaultAccess(userId, 'demo-vault', {
      metadata: {
        resource_title: 'Demo Board Meeting',
        onboarding_step: 'vault_tour',
      },
    }),
  ],

  // Compliance audit trail
  complianceAudit: (userId: string) => [
    ActivityFactory.build(userId, {
      action: 'compliance_training_started',
      resource_type: 'training',
      resource_id: 'annual-compliance-2024',
      description: 'User started annual compliance training',
      metadata: {
        training_type: 'annual_compliance',
        estimated_duration_minutes: 60,
      },
    }),
    ActivityFactory.build(userId, {
      action: 'compliance_training_completed',
      resource_type: 'training',
      resource_id: 'annual-compliance-2024',
      description: 'User completed annual compliance training',
      metadata: {
        training_type: 'annual_compliance',
        completion_score: 95,
        certificate_issued: true,
      },
    }),
    ActivityFactory.build(userId, {
      action: 'sign_code_of_conduct',
      resource_type: 'compliance',
      resource_id: 'code-of-conduct-2024',
      description: 'User signed annual code of conduct',
      metadata: {
        document_version: '2024.1',
        digital_signature: true,
      },
    }),
  ],
}

export default ActivityFactory