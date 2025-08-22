# Settings Validation and Persistence System

A comprehensive settings management system for AppBoardGuru following CLAUDE.md architecture patterns.

## Overview

This system provides:
- **Type-safe validation** using Zod schemas with branded types
- **Repository pattern** with BaseRepository extension and Result pattern
- **Service layer** with dependency injection and business logic
- **React hooks** for state management and validation
- **Comprehensive error handling** with recovery strategies
- **Real-time validation** with contextual feedback

## Architecture Components

### 1. Validation Layer (`/types/settings-validation.ts`)

Comprehensive Zod schemas for all settings types:

```typescript
// Account settings with branded types
const CorporateProfileSettingsSchema = z.object({
  email: z.string().transform((val, ctx) => {
    const result = createEmail(val)
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error || 'Invalid email address'
      })
      return z.NEVER
    }
    return result.data!
  }),
  // ... other fields
})
```

### 2. Repository Layer (`/lib/repositories/settings.repository.ts`)

Repository pattern with BaseRepository extension:

```typescript
export class UserSettingsRepository extends BaseRepository {
  async update(
    userId: UserId,
    updates: UserSettingsUpdate,
    expectedVersion?: number
  ): Promise<Result<UserSettings>> {
    return wrapAsync(async () => {
      // Validation, optimistic locking, audit trail
      // ... implementation
    })
  }
}
```

### 3. Service Layer (`/lib/services/settings.service.ts`)

Business logic with dependency injection:

```typescript
export class SettingsService extends BaseService {
  async updateUserSettings(
    userId: UserId,
    updates: UserSettingsUpdate,
    context: UpdateContext
  ): Promise<Result<UserSettings>> {
    // Permission checks, validation, security checks
    // Event publishing, audit logging
  }
}
```

### 4. Hook Layer (`/hooks/useSettings.ts`)

React hooks for state management:

```typescript
export function useSettings(options: UseSettingsOptions = {}) {
  return {
    state: SettingsState,
    actions: SettingsActions,
    validation: SettingsValidation,
    permissions: SettingsPermissions
  }
}
```

### 5. Validation Provider (`/components/settings/SettingsValidationProvider.tsx`)

Context-based validation with real-time feedback:

```typescript
export function SettingsValidationProvider({ children, accountType }) {
  // Provides validation context with error handling
  // Recovery actions and field-level validation
}
```

## Usage Examples

### Basic Settings Hook

```typescript
function MySettingsComponent() {
  const settings = useSettings({
    autoLoad: true,
    enableValidation: true,
    onSettingsChange: (newSettings) => {
      console.log('Settings updated:', newSettings)
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  const handleUpdateProfile = async (profileData) => {
    const result = await settings.actions.updateUserSettings({
      userId: settings.state.userSettings.userId,
      organizationId: settings.state.userSettings.organizationId,
      corporateProfile: profileData
    }, 'Profile update')

    if (result.success) {
      toast.success('Profile updated successfully')
    }
  }

  return (
    <div>
      {settings.state.loading && <Spinner />}
      {settings.state.error && <ErrorAlert error={settings.state.error} />}
      
      <ProfileForm
        data={settings.state.userSettings?.corporateProfile}
        onSave={handleUpdateProfile}
        canEdit={settings.permissions.canEditProfile}
      />
    </div>
  )
}
```

### Specialized Hooks

```typescript
// Notification-specific hook
function NotificationSettings() {
  const notifications = useNotificationSettings({
    enableValidation: true
  })

  return (
    <div>
      <h3>Notification Categories ({notifications.categories.length})</h3>
      {notifications.categories.map(category => (
        <NotificationCategoryCard
          key={category.categoryId}
          category={category}
          onToggle={(enabled) => 
            notifications.actions.toggleNotificationCategory(category.categoryId, enabled)
          }
        />
      ))}
    </div>
  )
}

// Security-specific hook
function SecuritySettings() {
  const security = useSecuritySettings()

  const handleMFAToggle = async (enabled: boolean) => {
    const result = await security.actions.updateUserSettings({
      userId: security.state.userSettings.userId,
      organizationId: security.state.userSettings.organizationId,
      security: {
        ...security.securitySettings,
        mfaEnabled: enabled
      }
    })

    if (result.success) {
      // Log security event
      await security.actions.logSecurityEvent({
        eventType: enabled ? 'mfa_enabled' : 'mfa_disabled',
        ipAddress: '0.0.0.0',
        userAgent: navigator.userAgent,
        location: undefined,
        riskScore: enabled ? 0 : 50,
        details: { action: 'mfa_toggle', enabled }
      })
    }
  }

  return (
    <SecurityForm
      mfaEnabled={security.mfaEnabled}
      onMFAToggle={handleMFAToggle}
      trustedDevices={security.advancedSecurity?.multiFactorAuth?.trustedDevices}
    />
  )
}
```

### Enhanced Settings Manager

```typescript
function SettingsPage() {
  const { user } = useAuth()
  const { currentOrganization } = useOrganization()

  return (
    <EnhancedSettingsManager
      userId={user.id}
      organizationId={currentOrganization.id}
      accountType={user.accountType}
      initialTab="profile"
      onSettingsChange={(settings) => {
        // Handle settings changes
        analytics.track('settings_updated', {
          userId: settings.userId,
          sections: Object.keys(settings).filter(key => settings[key])
        })
      }}
      onError={(error) => {
        // Handle errors
        errorReporting.captureError(error, {
          context: 'settings_management',
          userId: user.id
        })
      }}
    />
  )
}
```

### Service Integration

```typescript
// Direct service usage in API routes
export async function POST(request: Request) {
  const settingsService = SettingsServiceFactory.create(supabase, {
    eventBus: new SettingsEventBus(),
    notificationService: new NotificationService(),
    auditService: new AuditService()
  })

  const { userId, updates } = await request.json()

  const result = await settingsService.updateUserSettings(
    userId,
    updates,
    {
      requestingUserId: userId,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
      reason: 'API update'
    }
  )

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.message },
      { status: getHTTPStatusFromError(result.error) }
    )
  }

  return NextResponse.json({ data: result.data })
}
```

## Integration with Existing Components

### Updating AccountSettingsTab

```typescript
// Enhanced version of existing AccountSettingsTab
import { useSettings } from '../../../hooks/useSettings'
import { SettingsValidationProvider } from '../SettingsValidationProvider'

export function AccountSettingsTab() {
  const settings = useSettings({ autoLoad: true })
  
  return (
    <SettingsValidationProvider accountType={settings.accountType}>
      <div className="bg-white rounded-lg shadow-sm border">
        {/* Use validation context for real-time feedback */}
        <ValidatedProfileForm settings={settings} />
        <ValidatedSecurityForm settings={settings} />
        {/* ... other forms */}
      </div>
    </SettingsValidationProvider>
  )
}
```

### Updating NotificationSettingsTab

```typescript
// Enhanced version with validation
import { useNotificationSettings } from '../../../hooks/useSettings'

export function NotificationSettingsTab(props) {
  const notifications = useNotificationSettings()
  
  const handlePreferenceUpdate = async (preference) => {
    const result = await notifications.actions.updateNotificationPreferences([
      ...notifications.categories.flatMap(cat => cat.notifications),
      preference
    ])
    
    if (result.success) {
      toast.success('Notification preferences updated')
    }
  }

  return (
    <div>
      <ValidationSummary state={notifications.validation} />
      <NotificationCategoriesList
        categories={notifications.categories}
        onChange={handlePreferenceUpdate}
        validation={notifications.validation}
      />
    </div>
  )
}
```

## Error Handling Patterns

### Repository Error Handling

```typescript
// In repository layer
const result = await wrapAsync(async () => {
  const { data, error } = await this.supabase
    .from('user_settings')
    .update(updates)
    .eq('user_id', userId)

  if (error) {
    throw RepositoryError.fromSupabaseError(error, 'update user settings')
  }

  return data
})

if (!result.success) {
  // Error is properly typed as RepositoryError
  console.error('Repository error:', result.error.code, result.error.category)
  return result
}
```

### Service Error Handling

```typescript
// In service layer
const result = await this.executeDbOperation(
  async () => {
    // Operation with timeout and recovery
    const updateResult = await this.settingsRepository.user.update(userId, updates)
    if (!updateResult.success) {
      throw updateResult.error
    }
    return updateResult.data
  },
  'update_user_settings',
  { userId, operation: 'settings_update' }
)

// Automatic retry, logging, and recovery
```

### Component Error Handling

```typescript
// In React components
const settings = useSettings({
  onError: (error) => {
    // Typed error handling
    if (isValidationError(error)) {
      toast.error('Please check your input and try again')
    } else if (isAuthError(error)) {
      // Redirect to login
      router.push('/login')
    } else if (isRecoverableError(error)) {
      toast.error(error.message, {
        action: {
          label: 'Retry',
          onClick: () => settings.actions.refresh()
        }
      })
    } else {
      toast.error('An unexpected error occurred')
      errorReporting.captureError(error)
    }
  }
})
```

## Database Schema Requirements

```sql
-- User Settings Table
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  account_overview JSONB,
  corporate_profile JSONB,
  security JSONB,
  delegation JSONB,
  compliance JSONB,
  resource_quotas JSONB,
  privacy JSONB,
  notifications JSONB,
  exports JSONB,
  advanced_security JSONB,
  version INTEGER NOT NULL DEFAULT 1,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization Settings Table
CREATE TABLE organization_settings (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id),
  default_user_settings JSONB,
  global_policies JSONB,
  compliance_settings JSONB,
  backup_policies JSONB,
  version INTEGER NOT NULL DEFAULT 1,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings Audit Log
CREATE TABLE settings_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_type TEXT NOT NULL CHECK (setting_type IN ('user', 'organization')),
  setting_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'reset')),
  changes JSONB NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT
);

-- Indexes for performance
CREATE INDEX idx_user_settings_organization ON user_settings(organization_id);
CREATE INDEX idx_settings_audit_log_setting ON settings_audit_log(setting_type, setting_id);
CREATE INDEX idx_settings_audit_log_user ON settings_audit_log(user_id);
CREATE INDEX idx_settings_audit_log_timestamp ON settings_audit_log(timestamp);
```

## Testing Examples

```typescript
// Unit tests for repository
describe('UserSettingsRepository', () => {
  it('should validate input before updating', async () => {
    const repo = new UserSettingsRepository(mockSupabase)
    
    const result = await repo.update('invalid-user-id', {
      invalidField: 'value'
    })
    
    expect(result.success).toBe(false)
    expect(result.error.code).toBe(ErrorCode.VALIDATION_ERROR)
  })

  it('should handle optimistic locking conflicts', async () => {
    const repo = new UserSettingsRepository(mockSupabase)
    mockSupabase.from.mockReturnValue({
      update: () => ({ eq: () => ({ select: () => ({ single: () => 
        Promise.resolve({ error: { code: 'PGRST116' } })
      }) }) })
    })

    const result = await repo.update('user-id', {}, 1)
    
    expect(result.success).toBe(false)
    expect(result.error.code).toBe(ErrorCode.CONFLICT)
  })
})

// Integration tests for service
describe('SettingsService', () => {
  it('should enforce organization policies', async () => {
    const service = new SettingsService(mockSupabase, {
      settingsRepository: mockRepository
    })

    mockRepository.organization.findByOrganizationId.mockResolvedValue(
      success({ globalPolicies: { requireMFA: true } })
    )

    const result = await service.updateUserSettings('user-id', {
      security: { mfaEnabled: false }
    }, { requestingUserId: 'user-id' })

    expect(result.success).toBe(false)
    expect(result.error.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION)
  })
})

// Component tests with validation
describe('EnhancedSettingsManager', () => {
  it('should show validation errors', async () => {
    render(
      <EnhancedSettingsManager
        userId="user-id"
        organizationId="org-id"
        accountType="User"
      />
    )

    const emailInput = screen.getByLabelText('Email Address')
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
  })
})
```

This comprehensive system provides a robust, type-safe, and user-friendly settings management experience that follows all CLAUDE.md architectural patterns and best practices.