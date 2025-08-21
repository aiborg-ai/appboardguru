# BoardGuru - Technical Architecture Documentation

**Version:** 1.0.2  
**Last Updated:** August 2025  

---

## System Architecture Overview

BoardGuru is built as a modern, scalable web application using a microservices-adjacent architecture with Next.js providing both frontend and backend capabilities through API routes.

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   External      │
│   (React/Next)  │◄──►│   (API Routes)  │◄──►│   Services      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
│                      │                      │
├── React Components   ├── Authentication     ├── Supabase DB
├── State Management   ├── Business Logic     ├── Supabase Auth
├── UI Components      ├── Data Processing    ├── Supabase Storage
├── Routing            ├── File Handling      ├── OpenRouter AI
└── Client-side Logic  └── Email Services     └── SMTP Services
```

---

## Frontend Architecture

### Framework & Technologies
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5.9 (strict mode)
- **Styling**: Tailwind CSS 3.4 with utility-first approach
- **UI Components**: Radix UI primitives with custom styling
- **Icons**: Lucide React icon library
- **State Management**: React Query (TanStack) + React hooks
- **Forms**: React Hook Form with Zod validation

### Component Architecture

```
src/
├── app/                           # Next.js App Router
│   ├── (auth)/                   # Authentication layout group
│   ├── dashboard/                # Main application dashboard
│   ├── demo/                     # Demo and onboarding
│   ├── api/                      # API route handlers
│   ├── globals.css               # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Landing page
│
├── components/                    # Reusable components
│   ├── ui/                       # Base UI components (buttons, inputs)
│   ├── layout/                   # Layout components (sidebar, header)
│   ├── forms/                    # Form components and validation
│   ├── settings/                 # Settings page components
│   ├── ai/                       # AI-related components
│   ├── annotations/              # PDF annotation system
│   └── [feature]/               # Feature-specific components
│
├── lib/                          # Utility libraries
│   ├── supabase.ts              # Supabase client configuration
│   ├── supabase-server.ts       # Server-side Supabase client
│   ├── activity-translator.ts   # Activity log translation
│   ├── otp.ts                   # OTP generation and validation
│   ├── api/                     # API client utilities
│   └── services/                # Business logic services
│
├── types/                        # TypeScript type definitions
│   ├── database.ts              # Supabase generated types
│   └── [feature].ts            # Feature-specific types
│
├── hooks/                        # Custom React hooks
│   ├── useInvitations.ts        # Invitation management
│   ├── useAnnotationSync.ts     # Real-time annotation sync
│   └── [feature].ts            # Feature-specific hooks
│
└── utils/                        # Utility functions
    ├── validation.ts            # Form validation schemas
    └── helpers.ts               # General helper functions
```

### State Management Strategy

#### Local State (React useState)
- Component-specific UI state
- Form input values
- Toggle states and modals

#### Server State (React Query)
- API data caching and synchronization
- Background refetching
- Optimistic updates
- Error handling and retries

#### Global State (React Context)
- User authentication state
- Theme and UI preferences
- Global loading states

---

## Backend Architecture

### API Design Philosophy
- **RESTful**: Standard HTTP methods and status codes
- **Type-Safe**: Zod validation for all inputs/outputs
- **Secure**: Authentication and authorization on all endpoints
- **Consistent**: Standardized error handling and response formats

### API Route Structure

```
src/app/api/
├── auth/                         # Authentication endpoints
│   ├── verify-otp/              # OTP verification
│   └── resend-otp/              # OTP resend
│
├── user/                         # User-specific endpoints
│   └── activity/                # Activity logs
│       ├── route.ts             # Get user activities
│       └── export/              # Export user data
│
├── organizations/                # Organization management
│   ├── route.ts                 # CRUD operations
│   ├── check-slug/              # Slug validation
│   ├── create/                  # Organization creation
│   └── [id]/members/            # Member management
│
├── vaults/                       # Vault management
│   ├── route.ts                 # CRUD operations
│   ├── create/                  # Vault creation
│   └── [id]/                    # Vault-specific operations
│       ├── route.ts             # Vault details
│       ├── invite/              # Vault invitations
│       └── assets/              # Vault assets
│
├── assets/                       # Asset management
│   ├── route.ts                 # Asset CRUD
│   ├── upload/                  # File upload
│   └── [id]/                    # Asset-specific operations
│       ├── route.ts             # Asset details
│       ├── download/            # Secure download
│       ├── share/               # Asset sharing
│       └── annotations/         # Annotation system
│
├── invitations/                  # Invitation system
│   ├── route.ts                 # Invitation CRUD
│   ├── validate/                # Token validation
│   ├── accept/                  # Accept invitation
│   └── reject/                  # Reject invitation
│
├── dashboard/                    # Dashboard data
│   ├── metrics/                 # Performance metrics
│   ├── activity/                # Activity feed
│   ├── insights/                # AI insights
│   └── recommendations/         # Personalized recommendations
│
└── ai/                          # AI-powered features
    ├── chat/                    # AI chat endpoint
    ├── summarize-document/      # Document summarization
    └── web-search/              # AI web search
```

### Middleware & Security

#### Authentication Middleware
```typescript
// Automatic user session validation
// JWT token verification
// Role-based access control
// Rate limiting implementation
```

#### Security Headers
```typescript
// CORS configuration
// Content Security Policy
// Rate limiting headers
// Authentication requirements
```

---

## Database Architecture

### Supabase PostgreSQL Schema

#### Core Tables

**users** - User management and profiles
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('pending', 'director', 'admin', 'viewer')),
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
  company TEXT,
  position TEXT,
  password_set BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP
);
```

**organizations** - Multi-tenant organization management
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  website TEXT,
  industry TEXT,
  organization_size TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMP,
  deletion_scheduled_for TIMESTAMP,
  settings JSONB DEFAULT '{}',
  compliance_settings JSONB DEFAULT '{}',
  billing_settings JSONB DEFAULT '{}'
);
```

**vaults** - Secure document collections
```sql
CREATE TABLE vaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  access_level TEXT DEFAULT 'private',
  vault_settings JSONB DEFAULT '{}'
);
```

**assets** - File metadata and processing status
```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id UUID REFERENCES vaults(id),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  processing_status TEXT DEFAULT 'pending',
  ai_summary TEXT,
  ai_insights JSONB DEFAULT '{}',
  access_level TEXT DEFAULT 'private'
);
```

**audit_logs** - Comprehensive activity tracking
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  event_type TEXT NOT NULL, -- authentication, authorization, data_access, etc.
  event_category TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  event_description TEXT NOT NULL,
  outcome TEXT CHECK (outcome IN ('success', 'failure', 'error', 'blocked')),
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  ip_address INET,
  user_agent TEXT,
  session_id UUID,
  endpoint TEXT,
  http_method TEXT,
  response_status INTEGER,
  response_time_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

**annotations** - PDF annotation system
```sql
CREATE TABLE annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES assets(id),
  created_by UUID REFERENCES users(id),
  page_number INTEGER NOT NULL,
  annotation_type TEXT NOT NULL,
  content TEXT NOT NULL,
  position JSONB NOT NULL,
  style JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP
);
```

**otp_codes** - One-time password authentication
```sql
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  code TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Indexes & Performance
```sql
-- Performance indexes
CREATE INDEX idx_audit_logs_user_timestamp ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_assets_vault_id ON assets(vault_id);
CREATE INDEX idx_annotations_asset_id ON annotations(asset_id);
CREATE INDEX idx_otp_codes_user_expires ON otp_codes(user_id, expires_at);
```

#### Row Level Security (RLS)
```sql
-- Users can only access their own data
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Organization-based access control
CREATE POLICY "Users can access organization assets" ON assets
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );
```

---

## File Storage Architecture

### Supabase Storage Structure
```
boardguru-assets/
├── organizations/
│   └── [org-id]/
│       ├── vaults/
│       │   └── [vault-id]/
│       │       ├── documents/
│       │       ├── images/
│       │       └── processed/
│       ├── logos/
│       └── exports/
└── user-exports/
    └── [user-id]/
        ├── activity-logs/
        └── data-exports/
```

### File Processing Pipeline
1. **Upload**: Client-side validation → Supabase Storage
2. **Processing**: Metadata extraction → AI analysis → Summary generation
3. **Indexing**: Full-text search indexing → Content categorization
4. **Security**: Access control enforcement → Audit logging

---

## Authentication & Security

### Authentication Flow

#### Standard Login
```
1. User enters email/password
2. Supabase Auth validates credentials
3. JWT tokens generated (access + refresh)
4. User session established
5. Dashboard access granted
```

#### OTP-Based First Login
```
1. User enters email (no password set)
2. System detects first-time login
3. OTP generated and emailed
4. User enters OTP for verification
5. Temporary session for password setup
6. Full session after password creation
```

### Security Layers

#### 1. Application Security
- Input validation with Zod schemas
- SQL injection prevention via parameterized queries
- XSS protection with content sanitization
- CSRF protection via Next.js built-in mechanisms

#### 2. Authentication Security
- JWT tokens with secure signing
- Refresh token rotation
- Session timeout and management
- Rate limiting on auth endpoints

#### 3. Authorization Security
- Role-based access control (RBAC)
- Resource-level permissions
- Row-level security in database
- API endpoint protection

#### 4. Data Security
- Encryption at rest (Supabase)
- Encryption in transit (HTTPS/TLS)
- Secure file upload validation
- Personal data isolation

---

## AI Integration Architecture

### AI Service Integration

#### OpenRouter Integration
```typescript
// AI Chat Implementation
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: selectedModel,
    messages: conversationHistory,
    temperature: 0.7,
    max_tokens: 2000
  })
});
```

#### Document Processing Pipeline
1. **Upload**: File validation and storage
2. **Text Extraction**: Content parsing and indexing
3. **AI Analysis**: Summary generation and insights
4. **Metadata Storage**: Processed data storage
5. **Search Indexing**: Full-text search preparation

### AI Features Architecture

#### 1. Enhanced AI Chat (`/dashboard/ai-chat`)
- **Scope Selection**: Document, Vault, or Organization context
- **Context Management**: Relevant document loading for AI
- **Conversation History**: Persistent chat sessions
- **Export Capabilities**: Chat history export

#### 2. Document Summarization
- **Real-time Processing**: Background AI processing
- **Multi-format Support**: PDF, Word, Excel analysis
- **Audio Generation**: Text-to-speech capabilities
- **Insight Extraction**: Key point identification

#### 3. Web Search Integration
- **Contextual Search**: AI-powered relevant search
- **Source Integration**: External data incorporation
- **Fact Verification**: Cross-reference capabilities

---

## Real-time Features

### Annotation Synchronization
```typescript
// Real-time annotation sync using Supabase subscriptions
const subscription = supabase
  .channel(`annotations:${assetId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'annotations',
    filter: `asset_id=eq.${assetId}`
  }, handleAnnotationChange)
  .subscribe();
```

### Live Collaboration
- **WebSocket Connections**: Real-time annotation updates
- **Conflict Resolution**: Last-write-wins with user attribution
- **Presence Indicators**: Online user status
- **Change Broadcasting**: Real-time UI updates

---

## Performance Architecture

### Frontend Optimizations

#### Code Splitting
```typescript
// Dynamic imports for route-based splitting
const LazyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false
});
```

#### Image Optimization
```typescript
// Next.js Image component with optimization
<Image
  src={imageUrl}
  alt="Description"
  width={800}
  height={600}
  priority={true}
  placeholder="blur"
/>
```

### Backend Optimizations

#### Database Query Optimization
```sql
-- Composite indexes for common queries
CREATE INDEX idx_audit_logs_composite ON audit_logs(user_id, event_type, created_at DESC);

-- Partial indexes for active records
CREATE INDEX idx_active_organizations ON organizations(created_at) WHERE is_active = true;
```

#### Caching Strategy
- **Static Assets**: Next.js automatic static optimization
- **API Responses**: React Query caching with TTL
- **Database**: Supabase connection pooling
- **CDN**: Vercel Edge Network for global distribution

---

## Deployment Architecture

### Production Environment (Vercel)

#### Build Process
```json
{
  "scripts": {
    "build": "next build",
    "start": "next start",
    "type-check": "tsc --noEmit",
    "lint": "next lint"
  }
}
```

#### Environment Configuration
```bash
# Production Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=https://boardguru.vercel.app

# Server-side Configuration
SUPABASE_SERVICE_ROLE_KEY=your-service-key
OPENROUTER_API_KEY=your-openrouter-key
SMTP_HOST=smtp.gmail.com
SMTP_USER=notifications@boardguru.ai
SMTP_PASS=app-specific-password
ADMIN_EMAIL=hirendra.vikram@boardguru.ai
```

#### Deployment Pipeline
1. **Code Push**: GitHub repository update
2. **Build Trigger**: Vercel automatic deployment
3. **Type Check**: TypeScript compilation
4. **Build Process**: Next.js optimization
5. **Deployment**: Edge network distribution
6. **Health Check**: Automatic verification

### Database Deployment (Supabase)

#### Migration System
```bash
# Database migration commands
npm run db:migrate        # Run pending migrations
npm run db:rollback       # Rollback last migration
npm run db:status         # Check migration status
npm run db:create         # Create new migration
```

#### Backup Strategy
- **Automated Backups**: Daily Supabase backups
- **Point-in-time Recovery**: 7-day recovery window
- **Export Capabilities**: Manual data exports
- **Disaster Recovery**: Multi-region backup strategy

---

## Monitoring & Observability

### Application Monitoring

#### Performance Metrics
- **Core Web Vitals**: LCP, FID, CLS tracking
- **API Response Times**: Endpoint performance monitoring
- **Error Rates**: Client and server error tracking
- **User Sessions**: Session duration and engagement

#### Health Checks
```typescript
// API health endpoint
export async function GET() {
  const dbStatus = await checkDatabaseConnection();
  const authStatus = await checkAuthService();
  
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: { database: dbStatus, auth: authStatus }
  });
}
```

### Security Monitoring

#### Audit Log Analysis
- **Failed Authentication**: Brute force detection
- **Suspicious Activity**: Unusual access patterns
- **Rate Limit Violations**: API abuse monitoring
- **Data Access Tracking**: Sensitive data access logs

#### Security Alerts
- **Real-time Notifications**: Critical security events
- **Daily Reports**: Security status summaries
- **Compliance Reports**: Audit trail exports

---

## Scalability Considerations

### Horizontal Scaling
- **Serverless Functions**: Vercel Functions auto-scaling
- **Database Scaling**: Supabase automatic scaling
- **CDN Distribution**: Global edge network
- **Load Balancing**: Automatic traffic distribution

### Vertical Scaling
- **Database Optimization**: Query optimization and indexing
- **Memory Management**: Efficient data structures
- **CPU Optimization**: Async processing and batching
- **Storage Optimization**: File compression and optimization

### Future Scaling Plans
- **Microservices**: Service decomposition for large scale
- **Caching Layer**: Redis integration for high-traffic
- **Event Streaming**: Real-time event processing
- **Analytics Pipeline**: Big data processing capabilities

---

## Development Workflow

### Code Quality
```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "lint": "next lint",
    "test": "playwright test",
    "test:debug": "playwright test --debug"
  }
}
```

### Testing Strategy
- **Unit Tests**: Component and utility testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full user flow testing with Playwright
- **Security Tests**: Authentication and authorization testing

### CI/CD Pipeline
1. **Pre-commit**: Type checking and linting
2. **Build**: Next.js compilation and optimization
3. **Test**: Automated test suite execution
4. **Deploy**: Automatic deployment to Vercel
5. **Monitor**: Post-deployment health checks

---

## Error Handling & Resilience

### Frontend Error Boundaries
```typescript
// Global error boundary for graceful failure
export function GlobalErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={<ErrorFallback />}
      onError={logErrorToService}
    >
      {children}
    </ErrorBoundary>
  );
}
```

### API Error Handling
```typescript
// Standardized error responses
export function createErrorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message, timestamp: new Date().toISOString() },
    { status }
  );
}
```

### Resilience Patterns
- **Retry Logic**: Automatic retries with exponential backoff
- **Circuit Breakers**: Service failure protection
- **Graceful Degradation**: Feature fallbacks
- **Timeout Management**: Request timeout handling

---

*This technical architecture documentation provides a comprehensive overview of BoardGuru's implementation as of version 1.0.2*