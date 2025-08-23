# Settings System Documentation
*AppBoardGuru Enterprise Board Governance Platform*

## Overview

The AppBoardGuru Settings System is a comprehensive, enterprise-grade configuration management platform built following Domain-Driven Design (DDD) architecture patterns from CLAUDE.md. It provides role-based access control, real-time validation, audit trails, and seamless user experience across all board governance features.

## Architecture Overview

### Core Principles
- **Domain-Driven Design (DDD)**: Settings organized around business domains
- **Result Pattern**: Functional error handling throughout the system
- **Branded Types**: Compile-time safety with branded TypeScript types
- **Repository Pattern**: Data persistence with complete database abstraction
- **Service Layer**: Business logic with dependency injection
- **Atomic Design**: UI components following atomic design principles
- **Performance First**: React.memo optimization and virtual scrolling

### Technology Stack
- **Framework**: Next.js 15 with App Router
- **State Management**: Zustand with persistence and user context
- **Validation**: Zod schemas with Result pattern integration
- **UI Components**: Tailwind CSS with Shadcn/UI + custom settings components
- **Type Safety**: TypeScript strict mode with branded types
- **Performance**: React.memo, useMemo, useCallback optimizations
- **Accessibility**: WCAG 2.1 AA compliance throughout

## Settings Categories

### 1. Account Settings (`AccountSettingsTab`)
**Purpose**: Corporate account management and profile configuration

**Features**:
- **Account Type Display**: Hierarchical permissions (Superuser → Administrator → User → Viewer)
- **Corporate Profile**: Professional profile management with organization context
- **Security Settings**: Authentication preferences, session management, MFA
- **Delegation Manager**: Deputy assignments and coverage settings (Admin+)
- **Compliance Panel**: Regulatory compliance tracking and certifications
- **Resource Quotas**: Usage limits and storage management by account type
- **Notification Preferences**: Communication settings and delivery methods
- **Privacy Controls**: GDPR compliance and data privacy settings

**Account Type Permissions**:
- **Superuser**: Full platform administration, system configuration
- **Administrator**: Organization management, user administration, compliance
- **User**: Board participation, document access, standard features
- **Viewer**: Read-only access to authorized board information

### 2. Security & Activity (`SecurityActivityTab`)
**Purpose**: Comprehensive security management and activity monitoring

**Features**:
- **Security Dashboard**: Real-time security posture scoring and threat overview
- **Access Management**: MFA configuration, session control, authentication policies
- **Activity Monitoring**: Comprehensive activity logs and user behavior analytics
- **Threat Detection**: Security incident management and automated response
- **Audit & Compliance**: Regulatory compliance tracking and audit trail management
- **Data Protection**: Data loss prevention (DLP) and encryption management
- **Security Alerts**: Alert configuration, notification routing, escalation workflows
- **Security Reports**: Executive dashboards with predictive analytics
- **Risk Management**: Risk assessment, scoring, and mitigation workflows

**Security Features**:
- Multi-factor authentication (MFA) enforcement
- Session management with idle timeout
- Suspicious activity detection
- Login from new device alerts
- Data breach monitoring
- Compliance reporting (SOX, GDPR, HIPAA)

### 3. Notification Settings (`NotificationSettingsTab`)
**Purpose**: Comprehensive notification management for board activities

**Categories**:
- **Board Governance**: Meetings, voting, resolutions, action items
- **Document Management**: File uploads, sharing, approvals, vault access
- **BoardChat Communication**: Messages, mentions, voice notes, emergency alerts
- **Calendar & Events**: Meeting invitations, updates, scheduling conflicts
- **Compliance & Workflows**: Deadlines, audits, regulatory updates
- **Security & Activity**: Security alerts, login activities, system notifications

**Delivery Methods**:
- **Email**: HTML/text format with verification
- **SMS**: Critical alerts only with phone verification
- **Push Notifications**: Browser and mobile with device management
- **In-App**: Real-time notifications with sound/desktop options
- **Webhooks**: Enterprise integration with retry policies (Admin+)

**Advanced Features**:
- Quiet hours with timezone support
- Digest options (hourly, daily, weekly, monthly)
- Smart batching and frequency limits
- Template customization (Admin+)
- Analytics and engagement metrics (Admin+)

### 4. Export & Backup Settings (`ExportBackupSettingsTab`)
**Purpose**: Data export, backup management, and compliance reporting

**Data Categories**:
- **Board Governance**: Meetings, resolutions, voting records, action items (~125 MB)
- **Document Management**: Vaults, files, permissions, version history (~2.4 GB)
- **BoardChat Communications**: Messages, voice notes, attachments (~890 MB)
- **Calendar & Events**: Meeting schedules, bookings, events (~45 MB)
- **Compliance & Workflows**: Audit documentation, regulatory submissions (~180 MB)
- **Security & Activity Logs**: Login records, security events (~320 MB, Admin+)

**Export Formats**:
- **JSON**: Structured data for API integration
- **CSV**: Spreadsheet format for analysis
- **Excel (.xlsx)**: Rich formatting with charts
- **PDF**: Professional reports and documentation
- **ZIP**: Compressed archives
- **Encrypted ZIP**: Secure export with AES-256

**Advanced Features**:
- **Scheduled Exports**: Automated recurring exports
- **GDPR Compliance**: Right to portability exports
- **Legal Hold**: Data preservation for litigation
- **Audit Exports**: Comprehensive compliance reporting
- **Backup Policies**: Enterprise retention strategies (Admin+)
- **Storage Options**: Local, AWS S3, Azure, Google Cloud
- **Data Residency**: Regional compliance support

## User Context Integration

### Real-Time User Data
```typescript
interface UserContextData {
  user: UserWithProfile | null
  userId: UserId | null
  isAuthenticated: boolean
  currentOrganization: OrganizationWithRole | null
  organizationId: OrganizationId | null
  organizations: OrganizationWithRole[]
  accountType: 'Superuser' | 'Administrator' | 'User' | 'Viewer'
  isLoading: boolean
  hasError: boolean
  errorMessage: string | null
}
```

### Account Type Determination
- **Superuser**: Platform administrators (email: @appboardguru.com)
- **Administrator**: Organization owners and administrators
- **User**: Organization members with board participation rights
- **Viewer**: Read-only access to authorized content

## Validation & Persistence

### Zod Validation Schemas
```typescript
// Account settings validation
const accountSettingsSchema = z.object({
  profile: z.object({
    displayName: z.string().min(1).max(100),
    title: z.string().max(200).optional(),
    bio: z.string().max(500).optional()
  }),
  security: z.object({
    mfaEnabled: z.boolean(),
    sessionTimeout: z.number().min(15).max(1440)
  }),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    frequency: z.enum(['immediate', 'digest_daily', 'digest_weekly'])
  })
})
```

### Repository Pattern
- **Settings Repository**: Data persistence with audit trails
- **User Repository**: Profile and preference management
- **Organization Repository**: Organization-specific settings
- **Audit Repository**: Change tracking and compliance logging

### Service Layer
- **Settings Service**: Business logic with permission validation
- **Validation Service**: Real-time validation with error recovery
- **Audit Service**: Change tracking and compliance reporting
- **Notification Service**: Settings change notifications

## UI Components Architecture

### Reusable Settings Components
Located in `/src/components/ui/settings/`:

- **SettingsCard**: Advanced card with loading/error/success states
- **SettingsSection**: Collapsible sections with header actions
- **SettingsToggle**: Enhanced toggle with accessibility
- **SettingsSelect**: Advanced dropdown with validation
- **SettingsInput**: Input with icons and validation states
- **SettingsForm**: Form wrapper with auto-save
- **SettingsSearch**: Smart search with suggestions
- **SettingsExportImport**: Configuration management
- **SettingsHistory**: Change tracking interface
- **SettingsReset**: Safe configuration reset

### Performance Optimizations
- **React.memo**: All components optimized for minimal re-renders
- **useCallback**: Event handlers properly memoized
- **useMemo**: Expensive calculations cached
- **Virtual Scrolling**: Support for large datasets (10,000+ items)
- **Code Splitting**: Lazy loading for non-critical features

### Accessibility (WCAG 2.1 AA)
- **Keyboard Navigation**: Full keyboard support (Tab, Enter, Space, Escape)
- **Screen Reader**: Comprehensive ARIA labels and descriptions
- **Focus Management**: Proper focus trapping and restoration
- **Color Contrast**: AAA compliance for text elements
- **Semantic HTML**: Proper heading hierarchy and landmarks

## Security & Compliance

### Data Protection
- **Encryption**: AES-256 for sensitive data exports
- **Access Control**: Role-based permissions throughout
- **Audit Trails**: Complete change tracking for compliance
- **Data Residency**: Regional compliance support
- **GDPR Compliance**: Right to portability and erasure

### Compliance Frameworks
- **SOX**: Financial reporting controls
- **GDPR**: Data privacy and protection
- **HIPAA**: Healthcare data security
- **SOC 2**: Service organization controls
- **Custom**: Organization-specific frameworks

## API Integration

### Settings API Endpoints
- `GET /api/settings/user/{userId}` - User settings
- `PUT /api/settings/user/{userId}` - Update user settings
- `GET /api/settings/organization/{orgId}` - Organization settings
- `PUT /api/settings/organization/{orgId}` - Update organization settings
- `POST /api/settings/export` - Export settings data
- `POST /api/settings/import` - Import settings configuration

### Webhook Integration
```typescript
// Webhook payload for settings changes
interface SettingsWebhookPayload {
  event: 'settings.updated' | 'settings.exported' | 'settings.reset'
  userId: UserId
  organizationId?: OrganizationId
  changes: SettingsChange[]
  timestamp: string
  metadata: Record<string, unknown>
}
```

## Usage Examples

### Basic Settings Usage
```tsx
import { useUserContext } from '@/hooks/useUserContext'
import { NotificationSettingsTab } from '@/features/dashboard/settings/notification-settings-tab'

function SettingsPage() {
  const userContextResult = useUserContext()
  
  if (!userContextResult.success) {
    return <ErrorState error={userContextResult.error} />
  }
  
  const { accountType, userId, organizationId } = userContextResult.data
  
  return (
    <NotificationSettingsTab
      accountType={accountType}
      userId={userId}
      organizationId={organizationId}
    />
  )
}
```

### Advanced Settings Configuration
```tsx
import { SettingsValidationProvider, EnhancedSettingsManager } from '@/components/settings'

function AdvancedSettings() {
  return (
    <SettingsValidationProvider accountType="Administrator">
      <EnhancedSettingsManager 
        userId={userId}
        organizationId={organizationId}
        features={{
          search: true,
          exportImport: true,
          history: true,
          reset: true
        }}
      />
    </SettingsValidationProvider>
  )
}
```

## Development Guidelines

### Adding New Settings
1. **Define Zod Schema**: Create validation schema in `settings-validation.ts`
2. **Create Repository Methods**: Add to appropriate repository with Result pattern
3. **Implement Service Logic**: Business logic with permission validation
4. **Build UI Components**: Follow atomic design with React.memo
5. **Add Tests**: Comprehensive test coverage (80% minimum)
6. **Update Documentation**: Include in this documentation

### Performance Requirements
- **Initial Load**: < 2 seconds for settings page
- **Settings Save**: < 500ms with optimistic updates
- **Search Results**: < 200ms for settings search
- **Export Generation**: Progress indicators for operations > 5 seconds
- **Memory Usage**: < 50MB for settings components

### Error Handling Patterns
```typescript
// Always use Result pattern for settings operations
const updateResult = await settingsService.updateUserSettings(userId, updates)

if (!updateResult.success) {
  // Handle error with user-friendly message
  showErrorToast(updateResult.error.message)
  return
}

// Success - update UI optimistically
updateSettingsState(updateResult.data)
showSuccessToast('Settings updated successfully')
```

## Troubleshooting

### Common Issues

1. **Settings Not Saving**
   - Check user permissions for the setting category
   - Verify organization context is available
   - Check network connectivity and API response

2. **Validation Errors**
   - Review Zod schema requirements
   - Check for required fields and data types
   - Ensure branded types are properly used

3. **Performance Issues**
   - Monitor React DevTools for excessive re-renders
   - Check for missing useCallback/useMemo optimizations
   - Review component memoization

4. **Export Failures**
   - Check data size limits for account type
   - Verify export permissions
   - Review encryption requirements

5. **Notification Delivery Issues**
   - Verify delivery method configuration
   - Check quiet hours and frequency settings
   - Review organization notification policies

### Support Contacts
- **Technical Issues**: tech-support@appboardguru.com
- **Security Concerns**: security@appboardguru.com
- **Compliance Questions**: compliance@appboardguru.com

---

## Roadmap

### Phase 1 - Current (Q1 2024)
- ✅ Complete settings system with all 4 categories
- ✅ User context integration with real-time data
- ✅ Comprehensive validation and error handling
- ✅ Performance optimization and accessibility

### Phase 2 - Planned (Q2 2024)
- Advanced analytics and usage insights
- Mobile app settings synchronization
- Advanced workflow automation
- Multi-language support (i18n)

### Phase 3 - Future (Q3 2024)
- AI-powered settings recommendations
- Advanced compliance automation
- Real-time collaboration on settings
- Advanced data visualization

---

*Last Updated: January 2025*  
*Architecture: Enterprise DDD with CLAUDE.md compliance*  
*Version: 2.0.0 - Complete settings system with user context integration*