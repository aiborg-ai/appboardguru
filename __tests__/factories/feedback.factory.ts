import { Database } from '@/types/database'

type FeedbackSubmission = Database['public']['Tables']['feedback_submissions']['Row']
type FeedbackSubmissionInsert = Database['public']['Tables']['feedback_submissions']['Insert']
type FeedbackSubmissionUpdate = Database['public']['Tables']['feedback_submissions']['Update']

export interface FeedbackTestData extends FeedbackSubmissionInsert {
  screenshot_data?: string | null
  user_agent_custom?: string
  page_url_custom?: string
}

/**
 * Base feedback factory - creates realistic feedback data for testing
 */
export const FeedbackFactory = {
  /**
   * Create a basic feedback submission
   */
  build(overrides: Partial<FeedbackTestData> = {}): FeedbackSubmissionInsert {
    const timestamp = new Date().toISOString()
    const randomId = Math.random().toString(36).substr(2, 9)
    
    return {
      reference_id: `FB-${Date.now().toString(36)}${randomId}`.toUpperCase(),
      user_id: `user-${randomId}`,
      user_email: `user-${randomId}@example.com`,
      type: 'bug',
      title: `Test Bug Report ${randomId}`,
      description: `This is a test bug report description with detailed information about the issue. The bug occurs when users try to perform a specific action and it fails unexpectedly. Steps to reproduce: 1. Navigate to page, 2. Click button, 3. Observe error.`,
      screenshot_included: false,
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      page_url: '/dashboard/test-page',
      admin_email_sent: true,
      user_email_sent: true,
      status: 'new',
      admin_notes: null,
      created_at: timestamp,
      updated_at: timestamp,
      resolved_at: null,
      ...overrides,
    }
  },

  /**
   * Create a bug report
   */
  buildBugReport(overrides: Partial<FeedbackTestData> = {}): FeedbackSubmissionInsert {
    return this.build({
      type: 'bug',
      title: 'Critical Bug: Application Crashes on Login',
      description: 'The application consistently crashes when attempting to log in with valid credentials. This happens across different browsers and devices. Error appears to be related to authentication service timeout. Steps to reproduce: 1. Go to login page, 2. Enter valid credentials, 3. Click login button, 4. Application becomes unresponsive.',
      screenshot_included: true,
      ...overrides,
    })
  },

  /**
   * Create a feature request
   */
  buildFeatureRequest(overrides: Partial<FeedbackTestData> = {}): FeedbackSubmissionInsert {
    return this.build({
      type: 'feature',
      title: 'Add Dark Mode Support',
      description: 'Please add dark mode support to the application. This would greatly improve usability during evening hours and reduce eye strain. Many modern applications support this feature and users have been requesting it. The dark mode should include: 1. Dark color scheme for all components, 2. Toggle switch in settings, 3. Remember user preference, 4. System theme detection.',
      screenshot_included: false,
      ...overrides,
    })
  },

  /**
   * Create an improvement suggestion
   */
  buildImprovement(overrides: Partial<FeedbackTestData> = {}): FeedbackSubmissionInsert {
    return this.build({
      type: 'improvement',
      title: 'Improve Loading Performance',
      description: 'The dashboard loads quite slowly, especially with large datasets. Consider implementing: 1. Lazy loading for components, 2. Virtual scrolling for large lists, 3. Data pagination, 4. Caching strategies. This would significantly improve user experience.',
      screenshot_included: true,
      ...overrides,
    })
  },

  /**
   * Create general feedback
   */
  buildGeneralFeedback(overrides: Partial<FeedbackTestData> = {}): FeedbackSubmissionInsert {
    return this.build({
      type: 'other',
      title: 'General Application Feedback',
      description: 'Overall, the application is very useful and well-designed. The interface is intuitive and features are comprehensive. Great work on the recent updates! Some minor suggestions for improvement would be welcomed.',
      screenshot_included: false,
      ...overrides,
    })
  },

  /**
   * Create feedback with screenshot
   */
  buildWithScreenshot(overrides: Partial<FeedbackTestData> = {}): FeedbackSubmissionInsert {
    return this.build({
      screenshot_included: true,
      title: 'UI Issue with Screenshot Evidence',
      description: 'Attached screenshot shows the visual issue clearly. The layout appears broken on certain screen sizes and browser configurations.',
      ...overrides,
    })
  },

  /**
   * Create feedback from specific user
   */
  buildFromUser(userId: string, userEmail: string, overrides: Partial<FeedbackTestData> = {}): FeedbackSubmissionInsert {
    return this.build({
      user_id: userId,
      user_email: userEmail,
      ...overrides,
    })
  },

  /**
   * Create feedback with specific status
   */
  buildWithStatus(status: 'new' | 'in_review' | 'resolved' | 'closed', overrides: Partial<FeedbackTestData> = {}): FeedbackSubmissionInsert {
    const baseData = this.build(overrides)
    const timestamp = new Date().toISOString()
    
    return {
      ...baseData,
      status,
      resolved_at: status === 'resolved' ? timestamp : null,
      admin_notes: status !== 'new' ? `Feedback has been ${status}` : null,
      ...overrides,
    }
  },

  /**
   * Create feedback for specific organization
   */
  buildForOrganization(organizationId: string, overrides: Partial<FeedbackTestData> = {}): FeedbackSubmissionInsert {
    return this.build({
      organization_id: organizationId,
      ...overrides,
    })
  },

  /**
   * Build multiple feedback submissions
   */
  buildList(count: number, overrides: Partial<FeedbackTestData> = {}): FeedbackSubmissionInsert[] {
    return Array.from({ length: count }, (_, index) => 
      this.build({
        title: `Test Feedback ${index + 1}`,
        description: `This is test feedback submission number ${index + 1} with unique content.`,
        user_email: `user-${index}@example.com`,
        ...overrides,
      })
    )
  },

  /**
   * Build feedback with different types
   */
  buildWithTypes(types: Array<'bug' | 'feature' | 'improvement' | 'other'>): FeedbackSubmissionInsert[] {
    return types.map((type, index) => 
      this.build({
        type,
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Report ${index + 1}`,
        description: `This is a ${type} report with specific details relevant to this type of feedback.`,
        user_email: `${type}-user-${index}@example.com`,
      })
    )
  },

  /**
   * Create feedback with email sending failures
   */
  buildWithEmailFailures(overrides: Partial<FeedbackTestData> = {}): FeedbackSubmissionInsert {
    return this.build({
      admin_email_sent: false,
      user_email_sent: false,
      title: 'Feedback with Email Delivery Issues',
      description: 'This feedback submission had issues with email delivery during testing.',
      ...overrides,
    })
  },

  /**
   * Create rate-limited feedback scenarios
   */
  buildRateLimitedScenario(userEmail: string, count: number = 6): FeedbackSubmissionInsert[] {
    return Array.from({ length: count }, (_, index) => 
      this.build({
        user_email: userEmail,
        title: `Rate Limited Feedback ${index + 1}`,
        description: `This is feedback submission ${index + 1} from the same user to test rate limiting.`,
        created_at: new Date(Date.now() - (count - index) * 60000).toISOString(), // 1 minute apart
      })
    )
  },
}

/**
 * Feedback factory with database persistence
 */
export const FeedbackFactoryWithDB = {
  /**
   * Create and save feedback to test database
   */
  async create(overrides: Partial<FeedbackTestData> = {}): Promise<FeedbackSubmission> {
    const feedbackData = FeedbackFactory.build(overrides)
    // This would use testDb.createFeedback() in actual implementation
    // For now, return the data with mock ID persistence
    return {
      ...feedbackData,
      id: `feedback-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as FeedbackSubmission
  },

  /**
   * Create multiple feedback submissions in database
   */
  async createList(count: number, overrides: Partial<FeedbackTestData> = {}): Promise<FeedbackSubmission[]> {
    const promises = Array.from({ length: count }, () => this.create(overrides))
    return Promise.all(promises)
  },

  /**
   * Create feedback with related user data
   */
  async createWithUser(userData: { id: string; email: string; full_name?: string }, overrides: Partial<FeedbackTestData> = {}): Promise<{
    feedback: FeedbackSubmission,
    user: { id: string; email: string; full_name?: string }
  }> {
    const feedback = await this.create({
      user_id: userData.id,
      user_email: userData.email,
      ...overrides,
    })
    
    return {
      feedback,
      user: userData,
    }
  },
}

/**
 * Pre-defined feedback templates for common test scenarios
 */
export const FeedbackTemplates = {
  // Critical bug with screenshot
  criticalBug: FeedbackFactory.buildBugReport({
    title: 'Critical: Data Loss on Save',
    description: 'Users are experiencing data loss when saving documents. This is a critical issue affecting multiple users. Data disappears after successful save confirmation. Immediate attention required.',
    screenshot_included: true,
    type: 'bug',
  }),

  // Popular feature request
  popularFeature: FeedbackFactory.buildFeatureRequest({
    title: 'Mobile App Support',
    description: 'Many users have requested a mobile application. This would significantly improve accessibility and user engagement. Please consider developing iOS and Android applications.',
    type: 'feature',
  }),

  // Performance improvement
  performanceIssue: FeedbackFactory.buildImprovement({
    title: 'Dashboard Performance Optimization',
    description: 'The dashboard takes 10+ seconds to load with large datasets. Users are experiencing frustration with slow performance. Please optimize queries and implement caching.',
    type: 'improvement',
  }),

  // Positive feedback
  positiveReview: FeedbackFactory.buildGeneralFeedback({
    title: 'Excellent Platform!',
    description: 'This platform has greatly improved our board governance processes. The features are comprehensive and the interface is intuitive. Thank you for creating such a useful tool!',
    type: 'other',
  }),

  // Anonymous feedback
  anonymous: FeedbackFactory.build({
    user_id: null,
    user_email: 'anonymous@example.com',
    title: 'Anonymous Feedback',
    description: 'This feedback was submitted anonymously through a public form.',
    type: 'other',
  }),

  // Resolved issue
  resolvedIssue: FeedbackFactory.buildWithStatus('resolved', {
    title: 'Login Issue - Now Fixed',
    description: 'Previously reported login issue has been resolved. Thank you for the quick response!',
    type: 'bug',
    admin_notes: 'Issue was resolved by updating authentication service configuration.',
  }),
}

/**
 * Test data builders for complex scenarios
 */
export const FeedbackScenarios = {
  /**
   * Generate feedback statistics test data
   */
  buildStatisticsTestData(): FeedbackSubmissionInsert[] {
    return [
      ...FeedbackFactory.buildWithTypes(['bug', 'bug', 'feature', 'improvement', 'other']),
      ...FeedbackFactory.buildList(3, { status: 'resolved' }),
      ...FeedbackFactory.buildList(2, { status: 'in_review' }),
      FeedbackFactory.build({ status: 'closed' }),
    ]
  },

  /**
   * Generate rate limiting test scenario
   */
  buildRateLimitingTestData(userEmail: string): FeedbackSubmissionInsert[] {
    return FeedbackFactory.buildRateLimitedScenario(userEmail, 10)
  },

  /**
   * Generate email delivery test scenarios
   */
  buildEmailDeliveryTestData(): FeedbackSubmissionInsert[] {
    return [
      FeedbackFactory.build({ admin_email_sent: true, user_email_sent: true }), // Success
      FeedbackFactory.build({ admin_email_sent: false, user_email_sent: true }), // Admin failure
      FeedbackFactory.build({ admin_email_sent: true, user_email_sent: false }), // User failure
      FeedbackFactory.build({ admin_email_sent: false, user_email_sent: false }), // Both failure
    ]
  },

  /**
   * Generate multi-user feedback scenario
   */
  buildMultiUserScenario(userCount: number): FeedbackSubmissionInsert[] {
    return Array.from({ length: userCount }, (_, index) => 
      FeedbackFactory.build({
        user_id: `user-${index}`,
        user_email: `user-${index}@company.com`,
        title: `Feedback from User ${index + 1}`,
        type: ['bug', 'feature', 'improvement', 'other'][index % 4] as any,
      })
    )
  },
}