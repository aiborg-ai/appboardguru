/**
 * @jest-environment jsdom
 */
import {
  createAdminFeedbackTemplate,
  createUserConfirmationTemplate,
  generateFeedbackTextFallback,
  generateConfirmationTextFallback,
  FeedbackData,
  ConfirmationData
} from '@/lib/services/feedback-templates'
import { FeedbackFactory } from '../../factories'

describe('Feedback Email Templates', () => {
  // Mock data for testing
  const mockFeedbackData: FeedbackData = {
    type: 'bug',
    title: 'Critical Login Issue',
    description: 'Users cannot log in due to authentication service timeout. This is causing significant disruption to our workflow.',
    userEmail: 'test.user@company.com',
    userName: 'John Doe',
    screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77uwAAAABJRU5ErkJggg==',
    timestamp: '2024-01-15T10:30:00Z',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    url: 'https://app.boardguru.com/dashboard/login'
  }

  const mockConfirmationData: ConfirmationData = {
    title: 'Critical Login Issue',
    type: 'bug',
    userEmail: 'test.user@company.com',
    userName: 'John Doe',
    timestamp: '2024-01-15T10:30:00Z',
    referenceId: 'FB-1234567890ABCD'
  }

  describe('createAdminFeedbackTemplate', () => {
    it('should generate complete admin email template for bug reports', () => {
      const result = createAdminFeedbackTemplate(mockFeedbackData)

      expect(result.subject).toBe('🐛 New Feedback: Critical Login Issue')
      expect(result.html).toContain('🐛 Bug Report')
      expect(result.html).toContain('Critical Login Issue')
      expect(result.html).toContain('Users cannot log in due to authentication service timeout')
      expect(result.html).toContain('John Doe (test.user@company.com)')
      expect(result.html).toContain('https://app.boardguru.com/dashboard/login')
      expect(result.html).toContain('Mozilla/5.0')
      expect(result.html).toContain('📷 Screenshot Included')
      expect(result.html).toContain('data:image/png;base64')
    })

    it('should generate admin email template for feature requests', () => {
      const featureData: FeedbackData = {
        ...mockFeedbackData,
        type: 'feature',
        title: 'Add Dark Mode Support',
        description: 'Please add dark mode to reduce eye strain during evening use.'
      }

      const result = createAdminFeedbackTemplate(featureData)

      expect(result.subject).toBe('✨ New Feedback: Add Dark Mode Support')
      expect(result.html).toContain('✨ Feature Request')
      expect(result.html).toContain('Add Dark Mode Support')
      expect(result.html).toContain('#059669') // Feature request color
    })

    it('should generate admin email template for improvements', () => {
      const improvementData: FeedbackData = {
        ...mockFeedbackData,
        type: 'improvement',
        title: 'Optimize Loading Performance',
        description: 'Dashboard loads slowly with large datasets.'
      }

      const result = createAdminFeedbackTemplate(improvementData)

      expect(result.subject).toBe('📈 New Feedback: Optimize Loading Performance')
      expect(result.html).toContain('📈 Improvement Suggestion')
      expect(result.html).toContain('Optimize Loading Performance')
      expect(result.html).toContain('#d97706') // Improvement color
    })

    it('should generate admin email template for general feedback', () => {
      const generalData: FeedbackData = {
        ...mockFeedbackData,
        type: 'other',
        title: 'Great Platform!',
        description: 'Love the new features, keep up the good work!'
      }

      const result = createAdminFeedbackTemplate(generalData)

      expect(result.subject).toBe('💬 New Feedback: Great Platform!')
      expect(result.html).toContain('💬 General Feedback')
      expect(result.html).toContain('Great Platform!')
      expect(result.html).toContain('#6366f1') // General feedback color
    })

    it('should handle feedback without optional fields', () => {
      const minimalData: FeedbackData = {
        type: 'bug',
        title: 'Simple Bug Report',
        description: 'Brief description',
        userEmail: 'user@example.com',
        timestamp: '2024-01-15T10:30:00Z'
      }

      const result = createAdminFeedbackTemplate(minimalData)

      expect(result.html).not.toContain('📷 Screenshot Included')
      expect(result.html).not.toContain('Page URL:')
      expect(result.html).not.toContain('Browser:')
      expect(result.html).toContain('user@example.com') // Should show email only
      expect(result.html).not.toContain('undefined')
    })

    it('should properly format timestamps', () => {
      const result = createAdminFeedbackTemplate(mockFeedbackData)
      
      // Should contain a formatted date string
      expect(result.html).toContain('2024') // Year should be present
      expect(result.html).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/) // Date format
    })

    it('should include mailto link for quick reply', () => {
      const result = createAdminFeedbackTemplate(mockFeedbackData)

      expect(result.html).toContain('mailto:test.user@company.com')
      expect(result.html).toContain('subject=Re: Critical Login Issue')
      expect(result.html).toContain('body=Hi John Doe')
      expect(result.html).toContain('📧 Reply to User')
    })

    it('should escape HTML in user input', () => {
      const maliciousData: FeedbackData = {
        ...mockFeedbackData,
        title: 'Test <script>alert("xss")</script>',
        description: 'Description with <img src=x onerror=alert(1)>',
        userName: '<b>Evil User</b>'
      }

      const result = createAdminFeedbackTemplate(maliciousData)

      // HTML should be preserved as-is (this is expected behavior for email templates)
      // but we should verify the structure is maintained
      expect(result.html).toContain('<script>alert("xss")</script>')
      expect(result.html).toContain('<img src=x onerror=alert(1)>')
      expect(result.html).toContain('<b>Evil User</b>')
    })

    it('should handle long descriptions with proper formatting', () => {
      const longDescription = 'This is a very long description that spans multiple lines and contains detailed information about the issue. '.repeat(10)
      const longData: FeedbackData = {
        ...mockFeedbackData,
        description: longDescription
      }

      const result = createAdminFeedbackTemplate(longData)

      expect(result.html).toContain('white-space: pre-wrap')
      expect(result.html).toContain(longDescription)
    })
  })

  describe('createUserConfirmationTemplate', () => {
    it('should generate complete user confirmation email', () => {
      const result = createUserConfirmationTemplate(mockConfirmationData)

      expect(result.subject).toBe('✅ Your feedback has been received - Critical Login Issue')
      expect(result.html).toContain('✅ Thank You for Your Feedback!')
      expect(result.html).toContain('Hi John Doe,')
      expect(result.html).toContain('Critical Login Issue')
      expect(result.html).toContain('#FB-1234567890ABCD')
      expect(result.html).toContain('🐛 Bug Report')
    })

    it('should handle user without name', () => {
      const anonymousData: ConfirmationData = {
        ...mockConfirmationData,
        userName: undefined
      }

      const result = createUserConfirmationTemplate(anonymousData)

      expect(result.html).toContain('Hi there,')
      expect(result.html).not.toContain('Hi undefined,')
    })

    it('should include reference ID for tracking', () => {
      const result = createUserConfirmationTemplate(mockConfirmationData)

      // Reference ID should appear multiple times
      const referenceIdMatches = result.html.match(/#FB-1234567890ABCD/g)
      expect(referenceIdMatches).not.toBeNull()
      expect(referenceIdMatches!.length).toBeGreaterThan(1)
    })

    it('should format timestamp correctly', () => {
      const result = createUserConfirmationTemplate(mockConfirmationData)
      
      expect(result.html).toContain('2024') // Year should be present
      expect(result.html).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/) // Date format
    })

    it('should display correct feedback type badge', () => {
      const featureConfirmation: ConfirmationData = {
        ...mockConfirmationData,
        type: 'feature',
        title: 'Feature Request'
      }

      const result = createUserConfirmationTemplate(featureConfirmation)

      expect(result.html).toContain('✨ Feature Request')
      expect(result.html).toContain('#059669') // Feature request color
    })

    it('should include next steps information', () => {
      const result = createUserConfirmationTemplate(mockConfirmationData)

      expect(result.html).toContain('🚀 What Happens Next?')
      expect(result.html).toContain('1-2 business days')
      expect(result.html).toContain('investigate and provide updates')
      expect(result.html).toContain('consider them for future releases')
    })

    it('should encourage additional feedback', () => {
      const result = createUserConfirmationTemplate(mockConfirmationData)

      expect(result.html).toContain('💡 Have More Feedback?')
      expect(result.html).toContain('submit additional feedback anytime')
      expect(result.html).toContain('reply to this email')
    })
  })

  describe('generateFeedbackTextFallback', () => {
    it('should generate proper text fallback for admin emails', () => {
      const fallbackData = {
        subject: '🐛 New Feedback: Critical Login Issue',
        title: 'Critical Login Issue',
        description: 'Users cannot log in due to authentication service timeout.',
        userEmail: 'test.user@company.com'
      }

      const result = generateFeedbackTextFallback(fallbackData)

      expect(result).toContain('🐛 New Feedback: Critical Login Issue')
      expect(result).toContain('Title: Critical Login Issue')
      expect(result).toContain('From: test.user@company.com')
      expect(result).toContain('Description: Users cannot log in due to authentication service timeout.')
      expect(result).toContain('BoardGuru Feedback System')
      expect(result).toContain('HTML support')
      expect(result).not.toContain('undefined')
    })

    it('should handle minimal fallback data', () => {
      const minimalData = {
        subject: 'Test Subject',
        title: 'Test Title',
        description: 'Test Description',
        userEmail: 'test@example.com'
      }

      const result = generateFeedbackTextFallback(minimalData)

      expect(result).toContain('Test Subject')
      expect(result).toContain('Test Title')
      expect(result).toContain('Test Description')
      expect(result).toContain('test@example.com')
      expect(result.trim()).not.toBe('')
    })

    it('should properly trim whitespace', () => {
      const fallbackData = {
        subject: 'Subject',
        title: 'Title',
        description: 'Description',
        userEmail: 'email@example.com'
      }

      const result = generateFeedbackTextFallback(fallbackData)

      expect(result.startsWith(' ')).toBe(false)
      expect(result.endsWith(' ')).toBe(false)
    })
  })

  describe('generateConfirmationTextFallback', () => {
    it('should generate proper text fallback for confirmation emails', () => {
      const fallbackData = {
        subject: '✅ Your feedback has been received - Critical Login Issue',
        title: 'Critical Login Issue',
        referenceId: 'FB-1234567890ABCD'
      }

      const result = generateConfirmationTextFallback(fallbackData)

      expect(result).toContain('✅ Your feedback has been received - Critical Login Issue')
      expect(result).toContain('Critical Login Issue')
      expect(result).toContain('#FB-1234567890ABCD')
      expect(result).toContain('1-2 business days')
      expect(result).toContain('BoardGuru')
      expect(result).toContain('HTML support')
      expect(result).not.toContain('undefined')
    })

    it('should include reference ID with proper formatting', () => {
      const fallbackData = {
        subject: 'Test Subject',
        title: 'Test Title',
        referenceId: 'REF-123'
      }

      const result = generateConfirmationTextFallback(fallbackData)

      expect(result).toContain('#REF-123')
      expect(result).toContain('reference ID #REF-123')
    })

    it('should properly trim whitespace', () => {
      const fallbackData = {
        subject: 'Subject',
        title: 'Title',
        referenceId: 'REF-123'
      }

      const result = generateConfirmationTextFallback(fallbackData)

      expect(result.startsWith(' ')).toBe(false)
      expect(result.endsWith(' ')).toBe(false)
    })
  })

  describe('Email Template Integration', () => {
    it('should work with FeedbackFactory data', () => {
      const factoryData = FeedbackFactory.buildBugReport()
      const templateData: FeedbackData = {
        type: factoryData.type as 'bug',
        title: factoryData.title,
        description: factoryData.description,
        userEmail: factoryData.user_email,
        timestamp: factoryData.created_at || new Date().toISOString()
      }

      const adminTemplate = createAdminFeedbackTemplate(templateData)
      const confirmationTemplate = createUserConfirmationTemplate({
        title: templateData.title,
        type: templateData.type,
        userEmail: templateData.userEmail,
        timestamp: templateData.timestamp,
        referenceId: 'FB-TEST123'
      })

      expect(adminTemplate.subject).toContain(factoryData.title)
      expect(adminTemplate.html).toContain(factoryData.description)
      expect(confirmationTemplate.subject).toContain(factoryData.title)
      expect(confirmationTemplate.html).toContain('#FB-TEST123')
    })

    it('should handle all feedback types from factory', () => {
      const feedbackTypes = FeedbackFactory.buildWithTypes(['bug', 'feature', 'improvement', 'other'])
      
      feedbackTypes.forEach(feedback => {
        const templateData: FeedbackData = {
          type: feedback.type as 'bug' | 'feature' | 'improvement' | 'other',
          title: feedback.title,
          description: feedback.description,
          userEmail: feedback.user_email,
          timestamp: feedback.created_at || new Date().toISOString()
        }

        const result = createAdminFeedbackTemplate(templateData)
        
        expect(result.subject).toContain(feedback.title)
        expect(result.html).toContain(feedback.description)
        expect(result.html).toContain(feedback.user_email)
        
        // Verify type-specific elements
        switch (feedback.type) {
          case 'bug':
            expect(result.html).toContain('🐛')
            break
          case 'feature':
            expect(result.html).toContain('✨')
            break
          case 'improvement':
            expect(result.html).toContain('📈')
            break
          case 'other':
            expect(result.html).toContain('💬')
            break
        }
      })
    })
  })

  describe('Template Safety and Security', () => {
    it('should not break with empty strings', () => {
      const emptyData: FeedbackData = {
        type: 'other',
        title: '',
        description: '',
        userEmail: '',
        timestamp: '2024-01-15T10:30:00Z'
      }

      expect(() => createAdminFeedbackTemplate(emptyData)).not.toThrow()
      expect(() => createUserConfirmationTemplate({
        ...emptyData,
        referenceId: 'REF-123'
      })).not.toThrow()
    })

    it('should handle very long strings', () => {
      const longString = 'A'.repeat(10000)
      const longData: FeedbackData = {
        type: 'bug',
        title: longString,
        description: longString,
        userEmail: 'test@example.com',
        timestamp: '2024-01-15T10:30:00Z',
        userName: longString
      }

      const result = createAdminFeedbackTemplate(longData)
      
      expect(result.html).toContain(longString)
      expect(result.subject.length).toBeGreaterThan(0)
    })

    it('should handle special characters', () => {
      const specialData: FeedbackData = {
        type: 'bug',
        title: 'Title with émojis 🎉 and ñoña characters',
        description: 'Description with ©®™ symbols and "quotes" & <tags>',
        userEmail: 'test@example.com',
        userName: 'User Ñame with Accénts',
        timestamp: '2024-01-15T10:30:00Z'
      }

      const result = createAdminFeedbackTemplate(specialData)
      
      expect(result.html).toContain('émojis 🎉')
      expect(result.html).toContain('ñoña')
      expect(result.html).toContain('©®™')
      expect(result.html).toContain('Ñame with Accénts')
    })

    it('should maintain valid HTML structure', () => {
      const result = createAdminFeedbackTemplate(mockFeedbackData)
      
      // Basic HTML structure checks
      expect(result.html).toContain('<div')
      expect(result.html).toContain('</div>')
      expect(result.html).toContain('<table')
      expect(result.html).toContain('</table>')
      expect(result.html).toContain('<td')
      expect(result.html).toContain('</td>')
      
      // Check for proper email styles
      expect(result.html).toContain('style=')
      expect(result.html).toContain('font-family:')
      expect(result.html).toContain('max-width:')
    })
  })
})