# BoardGuru - Application Sitemap

**Version:** 1.0.2  
**Last Updated:** August 2025  

---

## Complete Site Navigation Structure

### Public Routes

```
/
├── / (Landing Page)
│   ├── Hero section with value proposition
│   ├── Feature showcase
│   ├── Registration form
│   └── Login redirect
│
├── /auth/
│   ├── /signin (Sign In Page)
│   │   ├── Email/password login
│   │   ├── OTP verification for first-time users
│   │   └── Forgot password flow
│   └── /set-password (Password Setup)
│       ├── First-time password creation
│       └── Password reset completion
│
└── /approval-result (Registration Approval Result)
    ├── Success confirmation
    ├── Rejection notification
    └── Status display
```

### Demo Routes

```
/demo/
├── /demo (Demo Landing)
│   ├── Feature demonstration
│   └── Trial access
│
├── /demo/dashboard (Demo Dashboard)
│   ├── Sample board packs
│   ├── Mock AI interactions
│   └── Feature walkthrough
│
└── /demo/vault-wizard (Demo Vault Creation)
    ├── Guided vault setup
    ├── Sample document upload
    └── AI processing demonstration
```

### Dashboard Routes (Authenticated)

```
/dashboard/
├── /dashboard (Main Dashboard)
│   ├── Activity overview
│   ├── Recent board packs
│   ├── AI insights
│   ├── Quick actions
│   └── Performance metrics
│
├── /dashboard/organizations/
│   ├── /organizations (Organizations List)
│   │   ├── Organization cards
│   │   ├── Creation shortcuts
│   │   └── Management actions
│   └── /organizations/create (Create Organization)
│       ├── Organization details form
│       ├── Settings configuration
│       └── Initial setup
│
├── /dashboard/vaults/
│   ├── /vaults (Vaults List)
│   │   ├── Vault grid view
│   │   ├── Access controls
│   │   └── Quick actions
│   └── /vaults/create (Create Vault)
│       ├── Vault configuration
│       ├── Permission settings
│       └── Initial document upload
│
├── /dashboard/assets/
│   ├── /assets (Assets Library)
│   │   ├── Document grid
│   │   ├── Search and filtering
│   │   ├── Bulk operations
│   │   └── Upload interface
│   └── /assets/[id]/annotations (Document Viewer)
│       ├── PDF viewer with annotations
│       ├── Collaborative commenting
│       ├── Real-time synchronization
│       └── Discussion threads
│
├── /dashboard/boardmates/
│   ├── /boardmates (Board Members)
│   │   ├── Member directory
│   │   ├── Role management
│   │   └── Activity status
│   └── /boardmates/create (Invite Members)
│       ├── Email invitation form
│       ├── Role assignment
│       └── Bulk invitation
│
├── /dashboard/meetings/
│   ├── /meetings (Meetings List)
│   │   ├── Upcoming meetings
│   │   ├── Meeting history
│   │   └── Calendar integration
│   └── /meetings/create (Create Meeting)
│       ├── Meeting details
│       ├── Attendee selection
│       └── Board pack assignment
│
├── /dashboard/instruments/ (Governance Instruments)
│   ├── Legal document management
│   ├── Compliance tracking
│   └── Instrument library
│
├── /dashboard/annotations/ (Annotation Management)
│   ├── Annotation overview
│   ├── Discussion threads
│   └── Collaboration analytics
│
├── /dashboard/board-pack-ai/ (AI Board Pack Analysis)
│   ├── AI-powered insights
│   ├── Document relationships
│   └── Strategic analysis
│
├── /dashboard/ai-chat/ (AI Chat Interface)
│   ├── Interactive chat interface
│   ├── Scope selector (document/vault/org)
│   ├── Conversation history
│   └── Export capabilities
│
└── /dashboard/settings/
    ├── AI Assistant (AI configuration and preferences)
    ├── Account (Profile and account settings)
    ├── Security & Activity (Activity logs and security)
    │   ├── Activity timeline with filtering
    │   ├── Statistics dashboard
    │   ├── Export functionality
    │   └── Security status monitoring
    ├── Notifications (Email and alert preferences)
    └── Export & Backup (Data export and backup)
```

---

## API Endpoint Mapping

### Authentication & User Management
```
POST   /api/send-registration-email      # Submit registration request
POST   /api/approve-registration         # Approve user registration
POST   /api/reject-registration          # Reject user registration
POST   /api/auth/verify-otp             # Verify OTP for first login
POST   /api/auth/resend-otp             # Resend OTP code
POST   /api/request-magic-link          # Request magic link for signin
```

### User Activity & Audit
```
GET    /api/user/activity               # Get user's activity logs
GET    /api/user/activity/export        # Export activity data (CSV/JSON)
```

### Organization Management
```
GET    /api/organizations               # List user's organizations
POST   /api/organizations               # Create new organization
GET    /api/organizations/check-slug    # Validate organization slug
POST   /api/organizations/create        # Create organization (alternative)
GET    /api/organizations/[id]/members  # Get organization members
```

### Vault Management
```
GET    /api/vaults                      # List accessible vaults
POST   /api/vaults                      # Create new vault
POST   /api/vaults/create               # Create vault (alternative)
GET    /api/vaults/[id]                 # Get vault details
PUT    /api/vaults/[id]                 # Update vault
DELETE /api/vaults/[id]                 # Delete vault
POST   /api/vaults/[id]/invite          # Invite users to vault
GET    /api/vaults/[id]/assets          # List vault assets
POST   /api/vaults/[id]/assets          # Upload asset to vault
GET    /api/vaults/[id]/assets/[assetId] # Get asset details
```

### Asset Management
```
GET    /api/assets                      # List user's assets
POST   /api/assets                      # Create/upload asset
POST   /api/assets/upload               # Upload asset file
GET    /api/assets/[id]                 # Get asset details
PUT    /api/assets/[id]                 # Update asset
DELETE /api/assets/[id]                 # Delete asset
GET    /api/assets/[id]/download        # Download asset file
POST   /api/assets/[id]/share           # Share asset
```

### Annotation System
```
GET    /api/assets/[id]/annotations               # Get asset annotations
POST   /api/assets/[id]/annotations               # Create annotation
GET    /api/assets/[id]/annotations/[annotationId] # Get specific annotation
PUT    /api/assets/[id]/annotations/[annotationId] # Update annotation
DELETE /api/assets/[id]/annotations/[annotationId] # Delete annotation
GET    /api/assets/[id]/annotations/[annotationId]/replies # Get annotation replies
POST   /api/assets/[id]/annotations/[annotationId]/replies # Add reply
```

### Board Member Management
```
GET    /api/boardmates                  # List board members
POST   /api/boardmates                  # Add board member
POST   /api/boardmates/create           # Create board member
POST   /api/boardmates/invite           # Invite board member
```

### Invitation System
```
GET    /api/invitations                 # List invitations
POST   /api/invitations                 # Send invitation
POST   /api/invitations/validate        # Validate invitation token
POST   /api/invitations/accept          # Accept invitation
POST   /api/invitations/reject          # Reject invitation
GET    /api/vault-invitations           # List vault invitations
POST   /api/vault-invitations           # Send vault invitation
GET    /api/vault-invitations/[id]      # Get invitation details
```

### AI & Processing
```
POST   /api/chat                        # AI chat endpoint
POST   /api/summarize-document          # AI document summarization
GET    /api/web-search                  # AI-powered web search
```

### Dashboard Analytics
```
GET    /api/dashboard/metrics           # Dashboard performance metrics
GET    /api/dashboard/activity          # Dashboard activity feed
GET    /api/dashboard/insights          # AI-generated insights
GET    /api/dashboard/recommendations   # Personalized recommendations
```

### Security & Compliance
```
GET    /api/security                    # Security status and settings
```

---

## User Flow Diagrams

### Registration & Onboarding Flow
```
Landing Page → Registration Form → Email Sent → Admin Approval → 
Welcome Email → First Login (OTP) → Password Setup → Dashboard Access
```

### Document Upload & Processing Flow
```
Dashboard → Upload Interface → File Validation → Storage Upload → 
AI Processing → Summary Generation → Document Ready → Notification
```

### AI Chat Flow
```
Dashboard → AI Chat → Scope Selection → Context Loading → 
Question Input → AI Response → Follow-up Questions → Export Chat
```

### Collaboration Flow
```
Document Viewer → Create Annotation → Discussion Thread → 
Real-time Sync → Email Notifications → Resolution Tracking
```

### Activity Monitoring Flow
```
User Action → Audit Log Creation → Activity Translation → 
Dashboard Display → Filtering/Search → Export for Compliance
```

---

## Access Control Matrix

| Feature | Pending | Viewer | Director | Admin |
|---------|---------|--------|----------|-------|
| Dashboard Access | ❌ | ✅ | ✅ | ✅ |
| View Documents | ❌ | ✅ | ✅ | ✅ |
| Upload Documents | ❌ | ❌ | ✅ | ✅ |
| Create Annotations | ❌ | ✅ | ✅ | ✅ |
| AI Chat | ❌ | ✅ | ✅ | ✅ |
| Manage Vaults | ❌ | ❌ | ✅ | ✅ |
| Invite Members | ❌ | ❌ | ❌ | ✅ |
| Organization Management | ❌ | ❌ | ❌ | ✅ |
| User Approval | ❌ | ❌ | ❌ | ✅ |
| Activity Logs | ❌ | ✅ | ✅ | ✅ |
| Export Data | ❌ | ✅ | ✅ | ✅ |

---

## Mobile & Responsive Considerations

### Breakpoints
- **Mobile**: < 768px (sm)
- **Tablet**: 768px - 1024px (md)
- **Desktop**: 1024px+ (lg)

### Mobile Optimizations
- Touch-friendly button sizes (44px minimum)
- Swipe gestures for navigation
- Optimized file upload for mobile
- Responsive grid layouts
- Mobile-first PDF viewer

### Progressive Web App (PWA) Ready
- Service worker integration ready
- Offline capability for document viewing
- Push notification support
- App-like experience on mobile devices

---

*This sitemap represents the complete navigation structure and user flows of BoardGuru v1.0.2*