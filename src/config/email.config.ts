import { z } from 'zod'

// Environment validation schema
const emailEnvSchema = z.object({
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  ADMIN_EMAIL: z.string().email().default('admin@boardguru.ai'),
  FROM_EMAIL: z.string().email().default('noreply@boardguru.ai'),
  FROM_NAME: z.string().default('BoardGuru'),
})

// Parse environment variables with fallbacks
const getEmailEnv = () => {
  try {
    return emailEnvSchema.parse({
      SMTP_HOST: process.env['SMTP_HOST'],
      SMTP_PORT: process.env['SMTP_PORT'],
      SMTP_USER: process.env['SMTP_USER'],
      SMTP_PASS: process.env['SMTP_PASS'],
      ADMIN_EMAIL: process.env['ADMIN_EMAIL'],
      FROM_EMAIL: process.env['FROM_EMAIL'],
      FROM_NAME: process.env['FROM_NAME'],
    })
  } catch (error) {
    console.warn('Email configuration validation failed, using defaults:', error)
    return {
      SMTP_HOST: 'smtp.gmail.com',
      SMTP_PORT: 587,
      SMTP_USER: '',
      SMTP_PASS: '',
      ADMIN_EMAIL: 'admin@boardguru.ai',
      FROM_EMAIL: 'noreply@boardguru.ai',
      FROM_NAME: 'BoardGuru',
    }
  }
}

const env = getEmailEnv()

// Email configuration
export const emailConfig = {
  // SMTP settings
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: process.env['NODE_ENV'] === 'production',
    },
  },

  // Default addresses
  addresses: {
    admin: env.ADMIN_EMAIL,
    noreply: env.FROM_EMAIL,
    support: `support@${env.FROM_EMAIL.split('@')[1]}`,
    security: `security@${env.FROM_EMAIL.split('@')[1]}`,
  },

  // Default sender info
  defaults: {
    from: {
      name: env.FROM_NAME,
      address: env.FROM_EMAIL,
    },
    replyTo: env.ADMIN_EMAIL,
  },

  // Email templates configuration
  templates: {
    baseUrl: process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000',
    brandColor: '#2563eb',
    logoUrl: `${process.env['NEXT_PUBLIC_APP_URL']}/logo.png`,
    footerText: '© 2024 BoardGuru. All rights reserved.',
    unsubscribeUrl: `${process.env['NEXT_PUBLIC_APP_URL']}/unsubscribe`,
    
    // Template paths
    paths: {
      registration: 'registration',
      invitation: 'invitation',
      passwordReset: 'password-reset',
      welcome: 'welcome',
      notification: 'notification',
      digest: 'digest',
    },
  },

  // Email content settings
  content: {
    charset: 'utf-8',
    encoding: 'quoted-printable',
    textVersion: true, // Generate text version of HTML emails
    attachments: {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/png', 'image/jpeg', 'application/pdf'],
    },
  },

  // Rate limiting and queuing
  limits: {
    maxPerHour: 100,
    maxPerDay: 1000,
    burstLimit: 10,
    queueSize: 1000,
    retryAttempts: 3,
    retryDelay: 30000, // 30 seconds
  },

  // Email categories
  categories: {
    authentication: 'auth',
    notifications: 'notifications',
    marketing: 'marketing',
    transactional: 'transactional',
    system: 'system',
    feedback: 'feedback',
    feedback_confirmation: 'feedback_confirmation',
  },

  // Feature flags
  features: {
    enabled: env.SMTP_USER !== '' && env.SMTP_PASS !== '',
    trackOpens: process.env['NODE_ENV'] === 'production',
    trackClicks: process.env['NODE_ENV'] === 'production',
    unsubscribeHeader: true,
    bounceHandling: true,
    scheduling: false,
  },

  // Delivery settings
  delivery: {
    timeout: 30000, // 30 seconds
    priority: 'normal' as const,
    deliveryNotification: false,
    readReceiptRequested: false,
  },
} as const

// Email template subjects
export const emailSubjects = {
  registration: {
    user: 'Welcome to BoardGuru - Registration Successful',
    admin: 'New User Registration - Action Required',
  },
  invitation: {
    organization: 'You\'ve been invited to join {organizationName}',
    vault: 'New vault shared: {vaultName}',
  },
  passwordReset: {
    request: 'Reset your BoardGuru password',
    confirmation: 'Your password has been reset',
  },
  notification: {
    assetShared: 'New document shared: {assetTitle}',
    vaultUpdate: 'Vault updated: {vaultName}',
    mentionInComment: 'You were mentioned in a comment',
  },
  security: {
    loginAlert: 'New login to your account',
    passwordChanged: 'Your password was changed',
    accountSuspended: 'Your account has been suspended',
  },
  system: {
    maintenance: 'Scheduled maintenance notification',
    outage: 'Service disruption notification',
  },
  feedback: {
    bugReport: '🐛 New Bug Report: {title}',
    featureRequest: '✨ New Feature Request: {title}',
    improvement: '📈 New Improvement Suggestion: {title}',
    general: '💬 New Feedback: {title}',
    confirmation: '✅ Your feedback has been received - {title}',
  },
} as const

// Helper functions
export const getEmailTemplate = (category: string, type: string) => {
  return `${emailConfig.templates.baseUrl}/templates/${category}/${type}`
}

export const isEmailEnabled = () => {
  return emailConfig.features.enabled
}

export const getFromAddress = (category?: keyof typeof emailConfig.categories) => {
  if (category === 'system') {
    return {
      name: 'BoardGuru System',
      address: emailConfig.addresses.noreply,
    }
  }
  return emailConfig.defaults.from
}

export const getRateLimitKey = (type: string, recipient?: string) => {
  return recipient ? `email:${type}:${recipient}` : `email:${type}:global`
}

// Type exports
export type EmailConfig = typeof emailConfig
export type EmailCategory = keyof typeof emailConfig.categories
export type EmailSubject = typeof emailSubjects