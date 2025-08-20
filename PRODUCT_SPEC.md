# BoardGuru - Product Specification

## Overview
BoardGuru is an enterprise-grade board management platform that provides secure, AI-powered document processing, intelligent summarization, and collaborative tools for board directors and corporate governance teams.

## Core Value Proposition
- **Secure Document Management**: Enterprise-grade security with role-based access control
- **AI-Powered Intelligence**: OpenRouter AI integration for document summarization and analysis
- **Streamlined Workflow**: Automated board pack processing and approval workflows
- **Compliance Ready**: Built-in governance features and audit trails

---

## Sitemap & Route Structure

```
/                           # Homepage (public)
├── /demo                   # Live demo access (no auth required)
├── /auth/
│   ├── /signin             # Authentication page
│   └── /signup             # Registration redirect
├── /dashboard              # Main dashboard (authenticated)
├── /board-packs/           # Board pack management
│   ├── /upload             # Upload new board packs
│   ├── /[id]               # Individual board pack view
│   └── /archive            # Archived board packs
├── /users/                 # User management (admin only)
│   ├── /pending            # Pending registrations
│   ├── /approved           # Approved users
│   └── /settings           # User settings
├── /approval-result        # Registration approval result page
├── /api/                   # API endpoints
│   ├── /send-registration-email
│   ├── /approve-registration
│   ├── /reject-registration
│   ├── /chat               # AI chatbot endpoint
│   └── /summarize-document # Document summarization
└── /admin/                 # Admin panel (future)
    ├── /analytics          # Usage analytics
    ├── /settings           # System settings
    └── /audit-logs         # Audit trail
```

---

## Component Architecture

### 🎨 UI Components (`src/components/ui/`)
```
ui/
├── badge.tsx              # Status badges and labels
├── button.tsx             # Primary, secondary, ghost buttons
├── card.tsx               # Card, CardHeader, CardTitle, CardContent, CardDescription
├── checkbox.tsx           # Form checkboxes
├── input.tsx              # Text input fields
├── select.tsx             # Dropdown selectors
├── textarea.tsx           # Multi-line text input
├── scroll-area.tsx        # Custom scrollable areas
└── ResponsePage.tsx       # Generic response/result pages
```

### 🏗️ Feature Components (`src/components/`)
```
components/
├── forms/
│   ├── RegistrationModal.tsx      # User registration modal
│   ├── LoginForm.tsx              # Authentication form
│   └── BoardPackUpload.tsx        # File upload component
├── layout/
│   ├── Header.tsx                 # Main navigation header
│   ├── Sidebar.tsx                # Dashboard sidebar
│   └── Footer.tsx                 # Site footer
├── board-packs/
│   ├── BoardPackList.tsx          # List view of board packs
│   ├── BoardPackCard.tsx          # Individual board pack card
│   ├── StatusBadge.tsx            # Processing status indicator
│   └── AudioPlayer.tsx            # Audio summary player
├── users/
│   ├── UserList.tsx               # User management list
│   ├── UserCard.tsx               # Individual user card
│   └── ApprovalActions.tsx        # Approve/reject buttons
├── chat/
│   ├── ChatInterface.tsx          # AI chatbot interface
│   ├── MessageBubble.tsx          # Chat message component
│   └── ChatInput.tsx              # Chat input field
└── ErrorBoundary.tsx              # Error boundary wrapper
```

### 📱 Page Components (`src/app/`)
```
app/
├── page.tsx                       # Homepage
├── demo/
│   └── page.tsx                   # Demo environment
├── auth/
│   └── signin/
│       └── page.tsx               # Sign-in page
├── dashboard/
│   └── page.tsx                   # Main dashboard
├── approval-result/
│   └── page.tsx                   # Registration result page
└── layout.tsx                     # Root layout
```

---

## Database Schema

### Tables
```sql
-- User Management
users                     # Extended user profiles
registration_requests     # Pending registration requests

-- Content Management  
board_packs              # Board pack documents
board_pack_files         # File attachments (future)

-- System
audit_logs               # Activity audit trail
user_sessions            # Session management (future)
```

### Key Relationships
- `users.id` → `registration_requests.reviewed_by`
- `users.id` → `board_packs.uploaded_by`
- `users.id` → `audit_logs.user_id`

---

## API Endpoints

### Authentication & Registration
- `POST /api/send-registration-email` - Submit registration request
- `GET /api/approve-registration` - Approve user registration
- `GET /api/reject-registration` - Reject user registration

### AI & Document Processing
- `POST /api/chat` - AI chatbot interactions
- `POST /api/summarize-document` - Generate document summaries
- `POST /api/upload-board-pack` - Upload and process documents (future)

### User Management
- `GET /api/users` - List users (admin only)
- `PUT /api/users/[id]` - Update user profile
- `DELETE /api/users/[id]` - Deactivate user (admin only)

---

## Technical Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Library**: Custom shadcn/ui components
- **State Management**: React hooks + Context API
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js with Next.js API routes
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Email**: Nodemailer with SMTP

### AI & Integration
- **AI Provider**: OpenRouter API
- **Models**: Multiple model support through OpenRouter
- **Document Processing**: PDF, DOCX, PPTX support

### Security & Infrastructure
- **Hosting**: Vercel
- **Database**: Supabase (PostgreSQL)
- **Security**: RLS policies, input sanitization, rate limiting
- **Monitoring**: Environment-aware error handling

---

## Environment Configuration

### Required Environment Variables
```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=hirendra.vikram@boardguru.ai
SMTP_PASS=
ADMIN_EMAIL=

# Security
NEXTAUTH_SECRET=
APP_URL=https://appboardguru-nuexkl4gi-h-viks-projects.vercel.app

# AI Integration
OPENROUTER_API_KEY=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

# File Handling
MAX_FILE_SIZE=50MB
ALLOWED_FILE_TYPES=pdf,docx,pptx,xlsx,txt
```

---

## User Roles & Permissions

### Role Hierarchy
1. **Pending** - Newly registered, awaiting approval
2. **Viewer** - Read-only access to approved board packs
3. **Director** - Full access, can upload and manage board packs
4. **Admin** - System administration, user management

### Permission Matrix
| Feature | Viewer | Director | Admin |
|---------|--------|----------|-------|
| View board packs | ✅ | ✅ | ✅ |
| Upload board packs | ❌ | ✅ | ✅ |
| AI chat analysis | ✅ | ✅ | ✅ |
| User management | ❌ | ❌ | ✅ |
| System settings | ❌ | ❌ | ✅ |
| Audit logs | Own only | Own only | All |

---

## Security Features

### Data Protection
- **Encryption**: AES-256 encryption at rest
- **Transport**: TLS 1.3 for all communications
- **Input Sanitization**: DOMPurify + validator.js
- **Rate Limiting**: Token bucket algorithm (5 req/15min)

### Access Control
- **Authentication**: Email-based with secure tokens
- **Authorization**: Role-based access control (RBAC)
- **Session Management**: JWT tokens with Supabase Auth
- **API Security**: CORS, CSRF protection, security headers

### Compliance
- **Audit Trail**: Comprehensive activity logging
- **Data Retention**: Configurable retention policies
- **Privacy**: GDPR-compliant data handling
- **Governance**: Built-in compliance reporting

---

## AI Features

### Document Processing
- **Summarization**: Automatic board pack summaries
- **Audio Summaries**: Text-to-speech integration (future)
- **Key Insights**: Automated highlight extraction
- **Question Answering**: Interactive document chat

### Supported Formats
- PDF documents
- Microsoft Word (.docx)
- PowerPoint presentations (.pptx)
- Excel spreadsheets (.xlsx)
- Plain text files (.txt)

---

## Development Guidelines

### Code Organization
```
src/
├── app/                   # Next.js 15 App Router pages
├── components/            # React components
├── lib/                   # Utility libraries
│   ├── supabase.ts       # Database client
│   ├── openrouter.ts     # AI client
│   ├── security.ts       # Security utilities
│   └── api-response.ts   # API response helpers
├── config/               # Configuration
│   └── environment.ts    # Environment validation
├── utils/                # Helper functions
└── types/                # TypeScript type definitions
```

### Component Naming Conventions
- **Pages**: `PascalCase` (e.g., `DashboardPage`)
- **Components**: `PascalCase` (e.g., `BoardPackCard`)
- **Utilities**: `camelCase` (e.g., `sanitizeInput`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_FILE_SIZE`)

### File Naming
- **React Components**: `.tsx` extension
- **Utilities**: `.ts` extension
- **API Routes**: `route.ts` in App Router
- **Types**: `types.ts` or `.d.ts`

---

## Future Roadmap

### Phase 1 (Current)
- ✅ User registration and approval workflow
- ✅ Basic board pack management
- ✅ AI-powered document summarization
- ✅ Demo environment

### Phase 2 (Next Sprint)
- 🔄 File upload and processing pipeline
- 🔄 Enhanced AI chat interface
- 🔄 Audio summary generation
- 🔄 Advanced user management

### Phase 3 (Future)
- 📋 Real-time collaboration features
- 📋 Advanced analytics dashboard
- 📋 Mobile application
- 📋 SSO integration
- 📋 API for third-party integrations

---

## Communication Reference

### Component Quick Reference
When discussing components, use these standardized names:

**Core UI Components:**
- `Button` - All button variants
- `Card` - Card layouts and containers
- `Badge` - Status indicators and labels
- `Input/Textarea` - Form inputs
- `Modal` - Overlay dialogs

**Feature Components:**
- `RegistrationModal` - User registration form
- `BoardPackCard` - Individual board pack display
- `UserCard` - User profile display
- `ChatInterface` - AI chat functionality
- `ErrorBoundary` - Error handling wrapper

**Page Components:**
- `HomePage` - Landing page
- `DemoPage` - Demo environment
- `DashboardPage` - Main user dashboard
- `SignInPage` - Authentication

### Key Files Reference
- `PRODUCT_SPEC.md` - This specification document
- `supabase-schema.sql` - Database schema
- `environment.ts` - Configuration management
- `security.ts` - Security utilities
- `api-response.ts` - API standardization

This specification serves as the single source of truth for BoardGuru's architecture, components, and features. Reference these names and structures when discussing development tasks.