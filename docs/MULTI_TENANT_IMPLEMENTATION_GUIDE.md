# BoardGuru Multi-Tenant System - Implementation Guide

## 🎯 Overview

This guide covers the complete implementation of BoardGuru's multi-tenant organization system with comprehensive security, invitation management, and user role controls.

## 📊 Implementation Summary

### ✅ **Completed Components**

#### **1. Database Architecture (4 Migration Files)**
- **001-organizations-core.sql**: Organizations, members, invitations, features
- **002-asset-permissions.sql**: Board pack permissions and sharing
- **003-audit-security.sql**: Audit logging and security monitoring
- **004-rls-policies.sql**: Row Level Security policies

#### **2. Backend Services (3 Core Services)**
- **organization.ts**: CRUD operations for organizations
- **membership.ts**: Member management and role controls
- **permissions.ts**: Permission checking and validation

#### **3. Invitation System (5 Files)**
- **invitations.ts**: Core invitation management
- **email-templates.ts**: Professional email templates
- **API routes**: Accept, validate, reject invitations

#### **4. Frontend Components (8 Components)**
- **useOrganizations.ts**: Organization management hooks
- **useInvitations.ts**: Invitation lifecycle hooks
- **useMembers.ts**: Member management hooks
- **OrganizationSelector.tsx**: Organization switcher
- **CreateOrganizationModal.tsx**: Organization creation
- **OrganizationSettings.tsx**: Comprehensive settings panel
- **InviteMemberModal.tsx**: Member invitation system
- **InvitationCard.tsx**: Invitation display and actions

#### **5. Security Layer (8 Security Files)**
- **middleware.ts**: Request security and rate limiting
- **auth-guard.ts**: Authentication and authorization
- **rate-limiter.ts**: Advanced rate limiting system
- **validation.ts**: Input validation and sanitization
- **security-headers.ts**: Security headers management
- **audit.ts**: Security audit logging
- **threat-detection.ts**: Threat detection system
- **Security API routes**: Monitoring and incident reporting

---

## 🚀 Deployment Steps

### **Step 1: Database Migration**

Run the database migrations in order:

```sql
-- Run in Supabase SQL Editor or via migration tool
-- 1. Core organizations
\i database/migrations/001-organizations-core.sql

-- 2. Asset permissions
\i database/migrations/002-asset-permissions.sql

-- 3. Audit and security
\i database/migrations/003-audit-security.sql

-- 4. RLS policies
\i database/migrations/004-rls-policies.sql
```

**Verification**: Check that all tables exist and RLS is enabled:
```sql
SELECT * FROM validate_rls_policies();
```

### **Step 2: Update Environment Variables**

Add to your `.env.local`:

```bash
# Existing variables (keep these)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email configuration (existing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@boardguru.ai
SMTP_PASS=your_email_password
ADMIN_EMAIL=admin@boardguru.ai

# App configuration
APP_URL=https://your-domain.com
NEXTAUTH_SECRET=your_nextauth_secret

# Security configuration (new)
RATE_LIMIT_ENABLED=true
IP_BLOCKING_ENABLED=true
AUDIT_LOGGING_ENABLED=true
THREAT_DETECTION_ENABLED=true

# OpenRouter AI (existing)
OPENROUTER_API_KEY=your_openrouter_key
```

### **Step 3: Install Dependencies**

```bash
npm install @tanstack/react-query @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-toast @radix-ui/react-avatar react-hook-form @hookform/resolvers/zod zod dompurify bcryptjs
```

### **Step 4: Update Your App Layout**

Update `src/app/layout.tsx`:

```tsx
import { QueryProvider } from '@/lib/query-client'
import { Toaster } from '@/components/ui/toast'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  )
}
```

### **Step 5: Update Dashboard Layout**

Update your dashboard to include the organization selector:

```tsx
// In your dashboard layout
import { OrganizationSelector } from '@/components/organizations/OrganizationSelector'

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1>BoardGuru</h1>
            </div>
            <div className="flex items-center space-x-4">
              <OrganizationSelector
                selectedOrganizationId={currentOrgId}
                onOrganizationChange={(org) => setCurrentOrg(org)}
              />
            </div>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
```

### **Step 6: Update Board Pack Creation**

Modify your board pack creation to include organization context:

```tsx
// In your board pack creation component
const { mutate: createBoardPack } = useCreateBoardPack()

const handleCreate = (data) => {
  createBoardPack({
    ...data,
    organization_id: currentOrganizationId,
    uploaded_by: user.id
  })
}
```

### **Step 7: Test the System**

1. **Create Organization**:
   - Go to dashboard
   - Click "Create Organization" in selector
   - Fill out form and submit

2. **Invite Members**:
   - Go to Organization Settings → Members tab
   - Click "Invite Member"
   - Enter email and select role
   - Check email for invitation

3. **Accept Invitation**:
   - Click link in email
   - Accept invitation
   - Verify membership appears in organization

4. **Test Permissions**:
   - Login as different role users
   - Verify access controls work correctly
   - Test board pack permissions

---

## 🔧 Configuration Options

### **Rate Limiting Configuration**

Adjust rate limits in `src/lib/security/rate-limiter.ts`:

```typescript
export const rateLimitConfigs = {
  auth: { requests: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 minutes
  api: { requests: 100, windowMs: 60 * 1000 }, // 100 per minute
  upload: { requests: 10, windowMs: 60 * 1000 }, // 10 per minute
  admin: { requests: 50, windowMs: 60 * 1000 }, // 50 per minute
}
```

### **Security Headers Configuration**

Modify CSP and other headers in `src/lib/security/security-headers.ts`:

```typescript
const cspDirectives = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-eval'", 'https://apis.google.com'],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:'],
  // ... customize as needed
}
```

### **Organization Features Configuration**

Set default features in the database migration:

```sql
-- In 001-organizations-core.sql, modify organization_features defaults
INSERT INTO organization_features (organization_id, max_board_packs, max_storage_gb, plan_type)
VALUES (org_id, 100, 10.0, 'free');
```

---

## 🔍 Testing & Validation

### **Database Validation**

```sql
-- Check RLS policies are working
SELECT * FROM validate_rls_policies();

-- Check organization creation
INSERT INTO organizations (name, slug, created_by) 
VALUES ('Test Org', 'test-org', 'user-id');

-- Verify permissions
SELECT user_can_access_board_pack('user-id', 'board-pack-id');
```

### **API Testing**

Use the provided test script:

```bash
node test-invitations-api.js
```

### **Frontend Testing**

```tsx
// Test organization hooks
const { data: organizations } = useUserOrganizations()
console.log('User organizations:', organizations)

// Test invitation system
const { mutate: createInvitation } = useCreateInvitation()
createInvitation({
  organizationId: 'org-id',
  email: 'test@example.com',
  role: 'member'
})
```

---

## 🚨 Security Checklist

### **Pre-Deployment Security Review**

- [ ] **Database**: RLS policies enabled on all tables
- [ ] **Authentication**: JWT tokens properly validated
- [ ] **Rate Limiting**: Configured for your traffic patterns
- [ ] **Input Validation**: All API inputs validated and sanitized
- [ ] **Security Headers**: CSP, HSTS, and other headers configured
- [ ] **Audit Logging**: Comprehensive logging enabled
- [ ] **Email Security**: SMTP properly configured with authentication
- [ ] **File Uploads**: File type and size validation in place
- [ ] **Error Handling**: No sensitive information leaked in errors

### **Production Monitoring**

- [ ] **Security Dashboard**: Monitor failed logins and suspicious activity
- [ ] **Rate Limit Alerts**: Alert on rate limit violations
- [ ] **Audit Log Monitoring**: Monitor for unusual access patterns
- [ ] **Database Performance**: Monitor query performance
- [ ] **Email Delivery**: Monitor invitation email delivery rates

---

## 🎉 Features Overview

### **User Roles & Permissions**

| Role | Create Orgs | Invite Members | Manage Board Packs | View All Data |
|------|-------------|----------------|-------------------|---------------|
| **Owner** | ✅ | ✅ | ✅ | ✅ |
| **Admin** | ✅ | ✅ | ✅ | ✅ |
| **Member** | ✅ | ❌ | ✅ | Organization only |
| **Viewer** | ✅ | ❌ | View only | Organization only |

### **Security Features**

- **Multi-factor authentication ready**
- **IP-based access controls**
- **Device fingerprinting**
- **Behavioral anomaly detection**
- **Compliance audit logging**
- **Rate limiting and DDoS protection**
- **Input sanitization and validation**
- **Secure file upload handling**

### **Invitation System**

- **Email-based invitations** with professional templates
- **Role-based invitation controls**
- **Configurable expiration times**
- **Resend and revoke capabilities**
- **Bulk invitation support**
- **Accept/reject workflow**
- **Audit trail for all actions**

---

## 🆘 Troubleshooting

### **Common Issues**

1. **RLS Policies Blocking Queries**:
   - Verify user authentication: `SELECT auth.uid()`
   - Check organization membership
   - Review policy conditions

2. **Rate Limiting Too Aggressive**:
   - Adjust limits in `rate-limiter.ts`
   - Clear rate limit cache: restart application

3. **Email Not Sending**:
   - Verify SMTP credentials
   - Check firewall/security groups
   - Test with a simple email first

4. **Frontend Errors**:
   - Check browser console for React Query errors
   - Verify API endpoints are accessible
   - Check authentication token validity

### **Debug Commands**

```sql
-- Check user's organizations
SELECT o.name, om.role, om.status 
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id
WHERE om.user_id = 'user-id';

-- Check pending invitations
SELECT email, role, status, created_at, token_expires_at
FROM organization_invitations
WHERE organization_id = 'org-id' AND status = 'pending';
```

---

## 🔮 Next Steps

### **Phase 2 Enhancements**

1. **SSO Integration**: Add SAML/OIDC support
2. **Advanced Analytics**: Usage metrics and reporting
3. **Mobile App**: React Native mobile application
4. **Webhook System**: External system integrations
5. **API Gateway**: Public API for third-party integrations
6. **Advanced Permissions**: Fine-grained board pack permissions
7. **Data Export**: Bulk data export functionality
8. **Compliance Reports**: Automated compliance reporting

### **Performance Optimizations**

1. **Caching**: Redis caching for frequently accessed data
2. **CDN**: Asset delivery optimization
3. **Database**: Query optimization and indexing
4. **Real-time**: WebSocket support for live updates

The multi-tenant organization system is now ready for production deployment! 🎉

---

*For support or questions, please refer to the implementation files or create an issue in the repository.*