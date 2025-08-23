/**
 * Feature Organisms Export Index
 * Complete feature components organized by domain
 */

// Voice features
export * from './PersonalizedVoiceAssistant'
export * from './VoiceAnalyticsDashboard'
export * from './VoiceAssistant'
export * from './VoiceBiometricAuth'
export * from './VoiceCollaboration'
export * from './VoicePDFAnnotations'
export * from './VoiceTrainingSystem'
export * from './VoiceTranslator'

// Upload Collaboration Components
export { default as CollaborativeUploadHub } from './CollaborativeUploadHub'
export { default as UploadPresenceIndicator } from './UploadPresenceIndicator'
export { default as TeamUploadQueue } from './TeamUploadQueue'
export { default as UploadActivityFeed } from './UploadActivityFeed'
export { default as UploadNotificationToast } from './UploadNotificationToast'
export { default as UploadAnalyticsDashboard } from './UploadAnalyticsDashboard'

// Collaboration features  
export * from './CollaborativeDocumentEditor'
export * from './DocumentCollaboratorsPanel'
export * from './DocumentCursorOverlay'
export * from './LiveCursorOverlay'
export * from './UserPresenceIndicator'

// Component type exports
export type { default as CollaborativeUploadHubProps } from './CollaborativeUploadHub'