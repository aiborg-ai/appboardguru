/**
 * Application Constants
 * Central location for all app-wide constants and configuration
 */

// Screen dimensions and layout
export const SCREEN_CONSTANTS = {
  HEADER_HEIGHT: 60,
  TAB_BAR_HEIGHT: 80,
  SAFE_AREA_PADDING: 16,
  CARD_BORDER_RADIUS: 12,
  BUTTON_HEIGHT: 48,
  INPUT_HEIGHT: 44,
  
  // Touch targets (following iOS and Android guidelines)
  MIN_TOUCH_TARGET: 44,
  RECOMMENDED_TOUCH_TARGET: 48,
  
  // Animation durations
  SHORT_ANIMATION: 150,
  MEDIUM_ANIMATION: 300,
  LONG_ANIMATION: 500,
} as const;

// Color constants (following corporate branding)
export const COLORS = {
  // Primary colors
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#3B82F6',
  
  // Secondary colors
  secondary: '#64748B',
  secondaryDark: '#475569',
  secondaryLight: '#94A3B8',
  
  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  
  // Theme colors
  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',
  surface: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  placeholder: '#9CA3AF',
  
  // Dark theme colors
  dark: {
    background: '#111827',
    backgroundSecondary: '#1F2937',
    surface: '#374151',
    text: '#F9FAFB',
    textSecondary: '#D1D5DB',
    border: '#4B5563',
    placeholder: '#9CA3AF',
  },
} as const;

// Typography constants
export const TYPOGRAPHY = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 28,
    '2xl': 32,
    '3xl': 36,
    '4xl': 40,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

// Spacing constants (follows 8pt grid system)
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;

// Security constants
export const SECURITY = {
  // Session management
  SESSION_TIMEOUT_MINUTES: 30,
  BIOMETRIC_PROMPT_TITLE: 'Authenticate to Access BoardGuru',
  BIOMETRIC_PROMPT_SUBTITLE: 'Use your biometric authentication to securely access your board documents',
  BIOMETRIC_PROMPT_DESCRIPTION: 'Biometric authentication provides enterprise-grade security for your sensitive board materials',
  
  // Certificate pinning
  CERTIFICATE_VALIDATION_TIMEOUT: 10000,
  SSL_PINNING_FAILURE_THRESHOLD: 3,
  
  // Device security
  JAILBREAK_DETECTION_ENABLED: true,
  ROOT_DETECTION_ENABLED: true,
  DEBUGGER_DETECTION_ENABLED: true,
  
  // Data protection
  ENCRYPTION_KEY_SIZE: 256,
  SECURE_STORAGE_SERVICE: 'com.appboardguru.mobile',
} as const;

// Offline synchronization constants
export const OFFLINE = {
  // Sync intervals
  BACKGROUND_SYNC_INTERVAL: 60000, // 1 minute
  FOREGROUND_SYNC_INTERVAL: 15000, // 15 seconds
  RETRY_SYNC_INTERVAL: 30000, // 30 seconds
  
  // Retry configuration
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_BACKOFF_MULTIPLIER: 2,
  INITIAL_RETRY_DELAY: 1000,
  
  // Storage limits
  MAX_OFFLINE_STORAGE_MB: 500,
  CACHE_CLEANUP_THRESHOLD: 0.8, // 80% of max storage
  
  // Sync priorities
  SYNC_PRIORITIES: {
    AUTH: 1,
    CRITICAL_DOCUMENTS: 2,
    MEETINGS: 3,
    NOTIFICATIONS: 4,
    GENERAL_DATA: 5,
  },
} as const;

// API constants
export const API = {
  // Timeouts
  DEFAULT_TIMEOUT: 10000,
  UPLOAD_TIMEOUT: 60000,
  DOWNLOAD_TIMEOUT: 30000,
  
  // Request limits
  MAX_CONCURRENT_REQUESTS: 4,
  MAX_RETRY_ATTEMPTS: 3,
  
  // Rate limiting
  RATE_LIMIT_REQUESTS_PER_MINUTE: 100,
  RATE_LIMIT_BURST_SIZE: 20,
  
  // File upload
  MAX_FILE_SIZE_MB: 100,
  SUPPORTED_FILE_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
  ],
} as const;

// Navigation constants
export const NAVIGATION = {
  // Animation configurations
  STACK_ANIMATION: {
    headerShown: false,
    animation: 'slide_from_right' as const,
    animationDuration: 300,
  },
  
  // Tab bar configuration
  TAB_BAR_ICONS: {
    dashboard: 'home',
    meetings: 'calendar',
    documents: 'folder',
    notifications: 'bell',
    profile: 'user',
  },
  
  // Gesture configuration
  SWIPE_THRESHOLD: 50,
  SWIPE_VELOCITY_THRESHOLD: 0.3,
} as const;

// Performance constants
export const PERFORMANCE = {
  // Virtual scrolling
  VIRTUAL_LIST_ITEM_HEIGHT: 72,
  VIRTUAL_LIST_OVERSCAN: 5,
  VIRTUAL_LIST_THRESHOLD: 100,
  
  // Image optimization
  IMAGE_CACHE_SIZE_MB: 50,
  IMAGE_QUALITY: 0.8,
  THUMBNAIL_SIZE: 150,
  
  // Memory management
  MAX_MEMORY_USAGE_MB: 200,
  MEMORY_WARNING_THRESHOLD: 0.8,
  GC_INTERVAL: 300000, // 5 minutes
} as const;

// Biometric authentication constants
export const BIOMETRIC = {
  SUPPORTED_TYPES: {
    TOUCH_ID: 'TouchID',
    FACE_ID: 'FaceID',
    FINGERPRINT: 'Fingerprint',
    FACE: 'Face',
    IRIS: 'Iris',
  },
  
  PROMPT_CONFIG: {
    fallbackToPasscode: true,
    allowDeviceCredentials: false,
    maximumAge: 300000, // 5 minutes
  },
  
  ERROR_CODES: {
    BIOMETRIC_UNKNOWN_ERROR: -1,
    BIOMETRIC_UNAVAILABLE: -2,
    BIOMETRIC_AUTHENTICATION_FAILED: -3,
    BIOMETRIC_USER_CANCEL: -4,
    BIOMETRIC_USER_FALLBACK: -5,
    BIOMETRIC_SYSTEM_CANCEL: -6,
    BIOMETRIC_PASSCODE_NOT_SET: -7,
    BIOMETRIC_NOT_ENROLLED: -8,
  },
} as const;

// WebSocket constants
export const WEBSOCKET = {
  // Connection configuration
  RECONNECT_INTERVAL: 5000,
  MAX_RECONNECT_ATTEMPTS: 10,
  CONNECTION_TIMEOUT: 10000,
  
  // Message types
  MESSAGE_TYPES: {
    DOCUMENT_UPDATE: 'document_update',
    MEETING_UPDATE: 'meeting_update',
    NOTIFICATION: 'notification',
    PRESENCE_UPDATE: 'presence_update',
    VOTING_UPDATE: 'voting_update',
    SYNC_REQUEST: 'sync_request',
  },
  
  // Ping configuration
  PING_INTERVAL: 30000,
  PONG_TIMEOUT: 5000,
} as const;

// Push notification constants
export const PUSH_NOTIFICATIONS = {
  // Categories
  CATEGORIES: {
    URGENT_MEETING: 'urgent_meeting',
    DOCUMENT_SHARED: 'document_shared',
    VOTING_REMINDER: 'voting_reminder',
    COMPLIANCE_ALERT: 'compliance_alert',
    GENERAL_UPDATE: 'general_update',
  },
  
  // Priorities
  PRIORITIES: {
    HIGH: 'high',
    NORMAL: 'normal',
    LOW: 'low',
  },
  
  // Actions
  ACTIONS: {
    VIEW_DOCUMENT: 'view_document',
    JOIN_MEETING: 'join_meeting',
    VOTE_NOW: 'vote_now',
    ACKNOWLEDGE: 'acknowledge',
  },
} as const;

// Document viewer constants
export const DOCUMENT_VIEWER = {
  // PDF configuration
  PDF_SCALE_FACTOR: 1.5,
  PDF_MAX_ZOOM: 3.0,
  PDF_MIN_ZOOM: 0.5,
  
  // Annotation configuration
  ANNOTATION_COLORS: [
    '#EF4444', // Red
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#3B82F6', // Blue
    '#8B5CF6', // Violet
    '#EC4899', // Pink
  ],
  
  // Voice annotation
  MAX_VOICE_ANNOTATION_DURATION: 300000, // 5 minutes
  VOICE_RECORDING_SAMPLE_RATE: 44100,
} as const;

// Voting system constants
export const VOTING = {
  // Vote types
  VOTE_TYPES: {
    FOR: 'for',
    AGAINST: 'against',
    ABSTAIN: 'abstain',
  },
  
  // Voting timeouts
  VOTE_SUBMISSION_TIMEOUT: 30000,
  VOTE_CONFIRMATION_TIMEOUT: 5000,
  
  // UI configuration
  VOTE_BUTTON_HAPTIC_FEEDBACK: 'medium',
  VOTE_CONFIRMATION_DELAY: 2000,
} as const;

// Error handling constants
export const ERROR_HANDLING = {
  // Error types
  ERROR_TYPES: {
    NETWORK: 'NETWORK_ERROR',
    AUTHENTICATION: 'AUTH_ERROR',
    PERMISSION: 'PERMISSION_ERROR',
    VALIDATION: 'VALIDATION_ERROR',
    OFFLINE: 'OFFLINE_ERROR',
    SECURITY: 'SECURITY_ERROR',
  },
  
  // Retry configuration
  RETRY_ATTEMPTS: {
    NETWORK: 3,
    API: 3,
    SYNC: 5,
    UPLOAD: 2,
  },
  
  // Error display
  ERROR_TOAST_DURATION: 4000,
  SUCCESS_TOAST_DURATION: 2000,
} as const;

// Accessibility constants
export const ACCESSIBILITY = {
  // Minimum touch target sizes
  MIN_TOUCH_TARGET_SIZE: 44,
  
  // Screen reader labels
  LABELS: {
    BACK_BUTTON: 'Go back',
    CLOSE_BUTTON: 'Close',
    MENU_BUTTON: 'Open menu',
    SEARCH_BUTTON: 'Search',
    FILTER_BUTTON: 'Filter options',
    SORT_BUTTON: 'Sort options',
    LOADING: 'Loading content',
    ERROR: 'Error occurred',
    SUCCESS: 'Operation successful',
  },
  
  // Focus management
  FOCUS_DELAY: 100,
  FOCUS_TIMEOUT: 1000,
} as const;

// Analytics events
export const ANALYTICS_EVENTS = {
  // User actions
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  BIOMETRIC_AUTH_SUCCESS: 'biometric_auth_success',
  BIOMETRIC_AUTH_FAILURE: 'biometric_auth_failure',
  
  // Document actions
  DOCUMENT_OPENED: 'document_opened',
  DOCUMENT_SHARED: 'document_shared',
  ANNOTATION_CREATED: 'annotation_created',
  VOICE_ANNOTATION_RECORDED: 'voice_annotation_recorded',
  
  // Meeting actions
  MEETING_JOINED: 'meeting_joined',
  VOTE_SUBMITTED: 'vote_submitted',
  MEETING_SCHEDULED: 'meeting_scheduled',
  
  // Performance events
  APP_LAUNCH: 'app_launch',
  SCREEN_VIEW: 'screen_view',
  OFFLINE_MODE_ENABLED: 'offline_mode_enabled',
  SYNC_COMPLETED: 'sync_completed',
  
  // Error events
  ERROR_OCCURRED: 'error_occurred',
  CRASH_DETECTED: 'crash_detected',
  NETWORK_ERROR: 'network_error',
} as const;

// Multi-Factor Authentication constants
export const MFA = {
  // Challenge configuration
  CHALLENGE_TIMEOUT_MS: 300000, // 5 minutes
  CHALLENGE_CLEANUP_INTERVAL_MS: 600000, // 10 minutes
  
  // TOTP configuration
  TOTP_WINDOW_SIZE: 1, // Allow 1 window before/after for clock skew
  TOTP_SECRET_LENGTH: 32,
  TOTP_ISSUER: 'BoardGuru',
  
  // Backup codes
  BACKUP_CODES_COUNT: 10,
  BACKUP_CODE_LENGTH: 8,
  
  // Method priorities (lower = higher priority)
  METHOD_PRIORITIES: {
    biometric: 1,
    hardware_key: 2,
    totp: 3,
    push_notification: 4,
    voice_recognition: 5,
    sms: 6,
    email: 7,
  },
  
  // Risk-based authentication
  RISK_LEVELS: {
    LOW: { required_methods: 1, allow_backup: true },
    MEDIUM: { required_methods: 1, allow_backup: true },
    HIGH: { required_methods: 2, allow_backup: false },
    CRITICAL: { required_methods: 3, allow_backup: false },
  },
} as const;

// Voice Authentication constants
export const VOICE_AUTH = {
  // Recording configuration
  SAMPLE_RATE: 44100,
  MIN_RECORDING_DURATION: 3000, // 3 seconds
  MAX_RECORDING_DURATION: 30000, // 30 seconds
  ENROLLMENT_RECORDING_DURATION: 10000, // 10 seconds
  
  // Enrollment configuration
  ENROLLMENT_SAMPLES_REQUIRED: 3,
  SAMPLE_INTERVAL_MS: 2000, // 2 seconds between samples
  
  // Authentication configuration
  DEFAULT_CONFIDENCE_THRESHOLD: 0.85,
  HIGH_SECURITY_THRESHOLD: 0.92,
  ENTERPRISE_THRESHOLD: 0.95,
  
  // Feature extraction
  MFCC_COEFFICIENTS: 13,
  FRAME_SIZE: 1024,
  HOP_LENGTH: 512,
  
  // Voice print configuration
  VOICE_PRINT_LENGTH: 128,
  FORMANT_COUNT: 4,
  
  // Quality thresholds
  MIN_AUDIO_QUALITY: 0.7,
  NOISE_THRESHOLD: -20, // dB
} as const;

// Device Attestation constants
export const ATTESTATION = {
  // Key configuration
  ATTESTATION_KEY_ALIAS: 'boardguru_attestation_key',
  KEY_SIZE: 2048,
  SIGNATURE_ALGORITHM: 'SHA256withRSA',
  
  // Attestation validity
  ATTESTATION_VALIDITY_MS: 86400000, // 24 hours
  TRUST_ASSESSMENT_VALIDITY_MS: 43200000, // 12 hours
  
  // Challenge configuration
  NONCE_LENGTH: 32,
  CHALLENGE_LENGTH: 64,
  
  // Trust scoring weights
  TRUST_WEIGHTS: {
    HARDWARE_ATTESTATION: 0.25,
    PLATFORM_SECURITY: 0.25,
    DEVICE_INTEGRITY: 0.2,
    OS_VERSION: 0.1,
    PATCH_LEVEL: 0.1,
    APP_SIGNATURE: 0.05,
    RUNTIME_SECURITY: 0.05,
  },
  
  // Attestation components
  SAFETYNET_ENABLED: true,
  HARDWARE_ATTESTATION_ENABLED: true,
  DEVICE_CHECK_ENABLED: true,
} as const;

// Compliance and Policy constants
export const COMPLIANCE = {
  // Policy check intervals
  CHECK_INTERVAL_MS: 3600000, // 1 hour
  BACKGROUND_CHECK_INTERVAL_MS: 21600000, // 6 hours
  
  // Report configuration
  REPORT_VALIDITY_MS: 86400000, // 24 hours
  AUDIT_RETENTION_DAYS: 90,
  
  // Enforcement timeouts
  WARNING_DISPLAY_DURATION_MS: 10000, // 10 seconds
  FUNCTIONALITY_LIMIT_DURATION_MS: 3600000, // 1 hour
  
  // Compliance thresholds
  MINIMUM_COMPLIANCE_SCORE: 0.8,
  CRITICAL_VIOLATION_THRESHOLD: 1,
  HIGH_VIOLATION_THRESHOLD: 3,
  
  // Policy categories
  MANDATORY_POLICY_CATEGORIES: [
    'device_security',
    'authentication',
    'data_protection',
    'app_integrity',
  ],
  
  // Regulatory frameworks
  SUPPORTED_FRAMEWORKS: [
    'SOX', 'GDPR', 'HIPAA', 'PCI_DSS', 'ISO27001', 'NIST',
  ],
} as const;

// Network Security constants
export const NETWORK_SECURITY = {
  // Certificate pinning
  CERTIFICATE_PINS: {
    'api.appboardguru.com': [
      'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', // Production cert
      'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=', // Backup cert
    ],
    'cdn.appboardguru.com': [
      'sha256/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=',
    ],
  },
  
  // TLS configuration
  MIN_TLS_VERSION: '1.2',
  PREFERRED_CIPHER_SUITES: [
    'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384',
    'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256',
    'TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384',
  ],
  
  // Network timeouts
  CONNECTION_TIMEOUT_MS: 10000,
  READ_TIMEOUT_MS: 30000,
  WRITE_TIMEOUT_MS: 30000,
  
  // Security headers
  REQUIRED_HEADERS: [
    'Strict-Transport-Security',
    'Content-Security-Policy',
    'X-Content-Type-Options',
    'X-Frame-Options',
  ],
} as const;

// Threat Detection constants
export const THREAT_DETECTION = {
  // Analysis intervals
  BEHAVIOR_ANALYSIS_INTERVAL_MS: 300000, // 5 minutes
  NETWORK_SCAN_INTERVAL_MS: 180000, // 3 minutes
  REAL_TIME_MONITORING_INTERVAL_MS: 60000, // 1 minute
  
  // Detection thresholds
  ANOMALY_THRESHOLD: 0.75,
  THREAT_CORRELATION_THRESHOLD: 0.80,
  BEHAVIORAL_DEVIATION_THRESHOLD: 2.0, // Standard deviations
  
  // Timeline management
  MAX_TIMELINE_EVENTS: 1000,
  EVENT_RETENTION_HOURS: 72,
  INCIDENT_AUTO_CLOSE_HOURS: 24,
  
  // Intelligence feeds
  THREAT_INTEL_UPDATE_INTERVAL_MS: 3600000, // 1 hour
  IOC_CACHE_SIZE: 10000,
  THREAT_ACTOR_CACHE_SIZE: 1000,
  
  // Response automation
  AUTO_MITIGATION_ENABLED: true,
  MAX_AUTO_MITIGATIONS: 5,
  MITIGATION_COOLDOWN_MS: 900000, // 15 minutes
  
  // Behavioral baselines
  BASELINE_COLLECTION_DAYS: 14,
  MIN_BASELINE_SAMPLES: 50,
  BASELINE_UPDATE_THRESHOLD: 0.1,
  
  // Network monitoring
  NETWORK_PROBE_TIMEOUT_MS: 5000,
  DNS_RESOLUTION_TIMEOUT_MS: 3000,
  CERTIFICATE_VALIDATION_STRICT: true,
  
  // Machine learning models
  ML_MODEL_UPDATE_INTERVAL_MS: 86400000, // 24 hours
  PREDICTION_CONFIDENCE_THRESHOLD: 0.85,
  MODEL_DRIFT_THRESHOLD: 0.15,
} as const;

// Security Audit constants
export const AUDIT = {
  // Buffer configuration
  BUFFER_FLUSH_INTERVAL_MS: 30000, // 30 seconds
  MAX_BUFFER_SIZE: 1000,
  IMMEDIATE_FLUSH_EVENTS: ['critical', 'error'],
  
  // Data retention
  DEFAULT_RETENTION_DAYS: 365,
  COMPLIANCE_RETENTION_DAYS: 2555, // 7 years for regulatory compliance
  FORENSIC_RETENTION_DAYS: 1095, // 3 years for forensic data
  
  // Cleanup configuration
  CLEANUP_INTERVAL_MS: 86400000, // 24 hours
  CLEANUP_BATCH_SIZE: 100,
  
  // Report generation
  MAX_REPORT_EVENTS: 100000,
  REPORT_GENERATION_TIMEOUT_MS: 300000, // 5 minutes
  
  // Security levels
  LOG_LEVELS: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    CRITICAL: 4,
  },
  
  // Compliance frameworks
  FRAMEWORKS: {
    SOX: 'Sarbanes-Oxley Act',
    GDPR: 'General Data Protection Regulation',
    HIPAA: 'Health Insurance Portability and Accountability Act',
    PCI_DSS: 'Payment Card Industry Data Security Standard',
    ISO27001: 'ISO/IEC 27001',
    NIST: 'NIST Cybersecurity Framework',
  },
  
  // Evidence handling
  EVIDENCE_HASH_ALGORITHM: 'SHA256',
  CHAIN_OF_CUSTODY_REQUIRED: true,
  DIGITAL_SIGNATURE_REQUIRED: true,
  
  // Real-time monitoring
  REAL_TIME_ALERT_THRESHOLD: 'warn',
  NOTIFICATION_BATCH_SIZE: 50,
  ALERT_COOLDOWN_MS: 300000, // 5 minutes
} as const;

export default {
  SCREEN_CONSTANTS,
  COLORS,
  TYPOGRAPHY,
  SPACING,
  SECURITY,
  OFFLINE,
  API,
  NAVIGATION,
  PERFORMANCE,
  BIOMETRIC,
  WEBSOCKET,
  PUSH_NOTIFICATIONS,
  DOCUMENT_VIEWER,
  VOTING,
  ERROR_HANDLING,
  ACCESSIBILITY,
  ANALYTICS_EVENTS,
  MFA,
  VOICE_AUTH,
  ATTESTATION,
  COMPLIANCE,
  NETWORK_SECURITY,
  THREAT_DETECTION,
  AUDIT,
};