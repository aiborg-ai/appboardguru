/**
 * Notification factory for creating test notifications
 */
export const NotificationFactory = {
  /**
   * Create a basic notification
   */
  build(userId: string, overrides: any = {}): any {
    const randomId = Math.random().toString(36).substr(2, 9)
    const timestamp = new Date().toISOString()
    
    return {
      id: `notification-${randomId}`,
      user_id: userId,
      title: 'Test Notification',
      message: 'This is a test notification message',
      type: 'info',
      category: 'system',
      priority: 'medium',
      status: 'unread',
      source_type: 'system',
      source_id: null,
      action_url: null,
      action_text: null,
      metadata: {},
      created_at: timestamp,
      updated_at: timestamp,
      read_at: null,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      ...overrides,
    }
  },

  /**
   * Create board meeting notification
   */
  buildBoardMeeting(userId: string, vaultId: string, overrides: any = {}): any {
    return this.build(userId, {
      title: 'Board Meeting Reminder',
      message: 'You have a board meeting scheduled for next week. Please review the materials.',
      type: 'reminder',
      category: 'meeting',
      priority: 'high',
      source_type: 'vault',
      source_id: vaultId,
      action_url: `/dashboard/vaults/${vaultId}`,
      action_text: 'Review Materials',
      metadata: {
        meeting_type: 'board',
        meeting_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        requires_preparation: true,
      },
      ...overrides,
    })
  },

  /**
   * Create document uploaded notification
   */
  buildDocumentUploaded(userId: string, assetId: string, overrides: any = {}): any {
    return this.build(userId, {
      title: 'New Document Available',
      message: 'A new document has been uploaded and is ready for your review.',
      type: 'info',
      category: 'document',
      priority: 'medium',
      source_type: 'asset',
      source_id: assetId,
      action_url: `/dashboard/assets/${assetId}`,
      action_text: 'View Document',
      metadata: {
        document_title: 'Financial Report Q4 2024',
        document_type: 'pdf',
        requires_review: true,
      },
      ...overrides,
    })
  },

  /**
   * Create invitation notification
   */
  buildInvitation(userId: string, organizationId: string, overrides: any = {}): any {
    return this.build(userId, {
      title: 'Board Invitation Received',
      message: 'You have been invited to join a board organization.',
      type: 'invitation',
      category: 'invitation',
      priority: 'high',
      source_type: 'organization',
      source_id: organizationId,
      action_url: `/invitations/${organizationId}`,
      action_text: 'Accept Invitation',
      metadata: {
        invitation_type: 'organization',
        role: 'director',
        expires_in_days: 7,
      },
      ...overrides,
    })
  },

  /**
   * Create urgent notification
   */
  buildUrgent(userId: string, overrides: any = {}): any {
    return this.build(userId, {
      title: 'URGENT: Emergency Board Session',
      message: 'An emergency board meeting has been called for tomorrow. Immediate review required.',
      type: 'alert',
      category: 'emergency',
      priority: 'critical',
      action_text: 'Join Emergency Session',
      metadata: {
        emergency_type: 'crisis_response',
        meeting_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        required_attendance: true,
      },
      ...overrides,
    })
  },

  /**
   * Create compliance notification
   */
  buildCompliance(userId: string, overrides: any = {}): any {
    return this.build(userId, {
      title: 'Compliance Training Due',
      message: 'Your annual compliance training is due next week. Please complete before the deadline.',
      type: 'reminder',
      category: 'compliance',
      priority: 'high',
      action_text: 'Complete Training',
      metadata: {
        training_type: 'annual_compliance',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        mandatory: true,
      },
      ...overrides,
    })
  },

  /**
   * Create read notification
   */
  buildRead(userId: string, overrides: any = {}): any {
    return this.build(userId, {
      status: 'read',
      read_at: new Date().toISOString(),
      ...overrides,
    })
  },

  /**
   * Create multiple notifications
   */
  buildList(userId: string, count: number, overrides: any = {}): any[] {
    return Array.from({ length: count }, (_, index) =>
      this.build(userId, {
        title: `Notification ${index + 1}`,
        message: `This is test notification number ${index + 1}`,
        ...overrides,
      })
    )
  },

  /**
   * Create notifications with different types
   */
  buildWithTypes(userId: string): any[] {
    const types = ['info', 'warning', 'error', 'success', 'reminder']
    
    return types.map((type, index) =>
      this.build(userId, {
        type,
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Notification`,
        message: `This is a ${type} notification`,
        priority: type === 'error' ? 'critical' : type === 'warning' ? 'high' : 'medium',
      })
    )
  },

  /**
   * Create notifications with different priorities
   */
  buildWithPriorities(userId: string): any[] {
    const priorities = ['low', 'medium', 'high', 'critical']
    
    return priorities.map((priority, index) =>
      this.build(userId, {
        priority,
        title: `${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority Notification`,
        message: `This notification has ${priority} priority`,
        type: priority === 'critical' ? 'alert' : 'info',
      })
    )
  },

  /**
   * Create bulk notifications for testing
   */
  buildBulk(userIds: string[], notificationType: string = 'info'): any[] {
    return userIds.flatMap((userId, userIndex) =>
      Array.from({ length: 5 }, (_, notificationIndex) =>
        this.build(userId, {
          title: `Bulk Notification ${userIndex + 1}-${notificationIndex + 1}`,
          type: notificationType,
        })
      )
    )
  },
}

/**
 * Pre-defined notification templates
 */
export const NotificationTemplates = {
  // Welcome notification for new users
  welcome: (userId: string) => NotificationFactory.build(userId, {
    title: 'Welcome to BoardGuru!',
    message: 'Welcome to your board governance platform. Explore the features and get started with your first board meeting.',
    type: 'success',
    category: 'onboarding',
    priority: 'medium',
    action_text: 'Get Started',
    action_url: '/dashboard/getting-started',
  }),

  // Quarterly meeting reminder
  quarterlyMeeting: (userId: string, vaultId: string) => NotificationFactory.buildBoardMeeting(userId, vaultId, {
    title: 'Q4 2024 Board Meeting - 1 Week Notice',
    message: 'The quarterly board meeting is scheduled for next week. Please review all materials in advance.',
    metadata: {
      meeting_type: 'quarterly',
      meeting_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      prep_materials_count: 8,
      estimated_review_time: '2-3 hours',
    },
  }),

  // Document processing complete
  documentReady: (userId: string, assetId: string) => NotificationFactory.buildDocumentUploaded(userId, assetId, {
    title: 'Document Processing Complete',
    message: 'Your uploaded document has been processed and is now available with AI-generated summary.',
    metadata: {
      processing_time: '2 minutes',
      ai_summary_available: true,
      annotations_enabled: true,
    },
  }),

  // Monthly compliance reminder
  complianceReminder: (userId: string) => NotificationFactory.buildCompliance(userId, {
    title: 'Monthly Compliance Check',
    message: 'Time for your monthly compliance review. Please verify all governance requirements are up to date.',
    metadata: {
      compliance_items: ['conflict_of_interest', 'code_of_conduct', 'insider_trading'],
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  }),

  // System maintenance notification
  systemMaintenance: (userId: string) => NotificationFactory.build(userId, {
    title: 'Scheduled System Maintenance',
    message: 'The platform will undergo maintenance this weekend. Some features may be temporarily unavailable.',
    type: 'warning',
    category: 'system',
    priority: 'medium',
    metadata: {
      maintenance_start: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      maintenance_end: new Date(Date.now() + 2.5 * 24 * 60 * 60 * 1000).toISOString(),
      affected_features: ['document_upload', 'ai_chat'],
    },
  }),
}

export default NotificationFactory