# AppBoardGuru - Development Guide

## Overview

AppBoardGuru is an enterprise-grade board governance platform that has undergone comprehensive refactoring to implement Domain-Driven Design (DDD) architecture with advanced TypeScript patterns for scalability and maintainability.

## Architecture Overview

### Core Principles
- **Domain-Driven Design (DDD)**: Business logic organized around domain concepts
- **Repository Pattern**: Complete database abstraction layer
- **Service Layer Architecture**: Separation of concerns with dependency injection
- **Result Pattern**: Functional error handling throughout the application
- **Type Safety**: Strict TypeScript with branded types and discriminated unions

### Technology Stack
- **Framework**: Next.js 15 with App Router
- **Database**: PostgreSQL with Supabase
- **Authentication**: Supabase Auth
- **State Management**: Zustand with persistence
- **Styling**: Tailwind CSS with Shadcn/UI components
- **Testing**: Jest, React Testing Library, Playwright
- **Monitoring**: OpenTelemetry (optional)
- **Type Safety**: TypeScript with strict configuration

## Project Structure

```
src/
├── app/                        # Next.js App Router pages and API routes
│   ├── api/                   # API endpoints (thin controllers)
│   ├── dashboard/             # Protected dashboard pages
│   └── (auth)/               # Authentication pages
├── components/                # React components (Atomic Design)
│   ├── ui/                   # Base UI components (atoms)
│   ├── atoms/                # Simple reusable components
│   ├── molecules/            # Component compositions
│   ├── organisms/            # Complex component structures
│   └── templates/            # Page-level layouts
├── lib/                      # Core business logic and utilities
│   ├── repositories/         # Data access layer
│   ├── services/             # Business logic layer
│   ├── stores/              # State management (Zustand)
│   ├── api/                 # API client and controllers
│   ├── telemetry/           # Monitoring and observability
│   ├── monitoring/          # Application monitoring
│   └── utils/               # Utility functions
├── hooks/                   # Custom React hooks
├── types/                   # TypeScript type definitions
└── testing/                # Test utilities and generators
```

## Architecture Layers

### 1. Repository Layer (`src/lib/repositories/`)

**Purpose**: Complete abstraction of database operations

**Key Files**:
- `base.repository.ts` - Base repository with CRUD, transactions, audit logging
- `user.repository.ts` - User management and authentication  
- `organization.repository.ts` - Organization and membership management
- `asset.repository.enhanced.ts` - File and asset management
- `vault.repository.enhanced.ts` - Vault and permission management
- `notification.repository.ts` - Notification system
- `calendar.repository.ts` - Events and scheduling
- `compliance.repository.ts` - Compliance workflows
- `activity.repository.ts` - Logging and analytics

**Benefits**:
- Eliminated 258 direct Supabase calls throughout the codebase
- Consistent error handling and logging
- Transactional support
- Audit trail for all operations
- Easy to mock for testing

### 2. Service Layer (`src/lib/services/`)

**Purpose**: Business logic and domain operations

**Key Files**:
- `user.service.ts` - User business operations
- `organization.service.ts` - Organization management
- `asset.service.ts` - File processing and management
- `vault.service.ts` - Secure document vaults
- `notification.service.ts` - Notification dispatch
- `calendar.service.ts` - Event management
- `compliance.service.ts` - Compliance workflows
- `search.service.ts` - Search functionality

### 3. API Layer (`src/lib/api/controllers/`)

**Purpose**: Consolidated API endpoints with proper error handling

**Key Files**:
- `voice.controller.ts` - 20 voice endpoints consolidated
- `assets.controller.ts` - 10 asset endpoints consolidated  
- `vaults.controller.ts` - 6 vault endpoints consolidated
- `boardmates.controller.ts` - 4 boardmate endpoints consolidated
- `notifications.controller.ts` - 7 notification endpoints
- `calendar.controller.ts` - 7 calendar endpoints
- `compliance.controller.ts` - 7 compliance endpoints
- `organization.controller.ts` - 4 organization endpoints
- `activity.controller.ts` - 6 activity endpoints
- `user.controller.ts` - 3 user endpoints
- `chat.controller.ts` - 2 chat endpoints

**Benefits**:
- Reduced from 122 individual API routes to ~20 controllers
- Consistent error handling and validation
- OpenTelemetry integration for monitoring
- Proper HTTP status codes and responses

### 4. State Management (`src/lib/stores/`)

**Purpose**: Centralized application state using Zustand

**Key Files**:
- `auth-store.ts` - Authentication state and user session
- `organization-store.ts` - Organization context and members
- `asset-store.ts` - File upload/download state  
- `vault-store.ts` - Vault access and permissions
- `notification-store.ts` - Real-time notifications
- `ui-store.ts` - UI state (modals, loading, etc.)

**Features**:
- Persistent storage with IndexedDB
- WebSocket integration for real-time updates
- Optimistic updates for better UX
- Type-safe store slices

## TypeScript Architecture

### Advanced Type Patterns

**Branded Types** for ID safety:
```typescript
type UserId = string & { readonly __brand: unique symbol }
type OrganizationId = string & { readonly __brand: unique symbol }
type VaultId = string & { readonly __brand: unique symbol }
```

**Discriminated Unions** for state management:
```typescript
type LoadingState = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string }
```

**Result Pattern** for error handling:
```typescript
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E }
```

### Type Safety Improvements

- **Before Refactoring**: 66.8% type safety, 1,100+ explicit `any` types
- **After Refactoring**: 95%+ type safety target achieved
- **Strict TypeScript Configuration**: All strict flags enabled
- **Template Literal Types**: Type-safe API routes and event names

## Component Architecture (Atomic Design)

### Atoms (`src/components/ui/`)
Base UI components from Shadcn/UI:
- `button.tsx`, `card.tsx`, `input.tsx`, `dialog.tsx`, etc.

### Molecules (`src/components/molecules/`)
Component compositions:
- `SearchBar.tsx`, `FileUpload.tsx`, `NotificationItem.tsx`

### Organisms (`src/components/organisms/`)
Complex business components:
- `VaultExplorer.tsx`, `BoardChatPanel.tsx`, `ComplianceWorkflow.tsx`

### Templates (`src/components/templates/`)
Page-level layouts:
- `DashboardLayout.tsx`, `AuthLayout.tsx`, `SettingsLayout.tsx`

## Key Features and Systems

### 1. Authentication & Authorization
- **Supabase Auth** integration
- **Row-Level Security (RLS)** policies
- **Organization-based** access control
- **Role-based permissions** (owner, admin, member, viewer)

### 2. File Management System
- **Secure file uploads** with virus scanning
- **Version control** for documents
- **Permission-based access** control
- **Digital signatures** and timestamps
- **Audit trails** for all file operations

### 3. Board Communication
- **BoardChat** system for secure messaging
- **Voice notes** with transcription
- **Real-time notifications** via WebSocket
- **Message encryption** for sensitive communications

### 4. Compliance & Governance
- **Workflow automation** for board processes
- **Document templates** and forms
- **Meeting management** with minutes
- **Action item tracking** with deadlines
- **Regulatory compliance** reporting

### 5. Calendar & Scheduling  
- **Board meeting scheduling** with conflicts detection
- **Calendar integration** with external systems
- **Automatic reminders** and notifications
- **Meeting room booking** and resource management

## Development Guidelines

### Adding New Features

1. **Define Domain Models** in `src/types/`
2. **Create Repository Methods** in appropriate repository
3. **Implement Service Layer** logic in `src/lib/services/`
4. **Add API Controller** methods in `src/lib/api/controllers/`
5. **Create Components** following Atomic Design principles
6. **Add State Management** in appropriate Zustand store
7. **Write Tests** for all layers

### Code Quality Standards

- **100% TypeScript** - no JavaScript files allowed
- **Strict type checking** - all strict flags enabled
- **Error boundaries** for all major components  
- **Loading states** and error handling in all async operations
- **Accessibility (a11y)** compliance for all UI components
- **Performance optimization** with React.memo and useMemo where appropriate

### Testing Strategy

- **Unit Tests**: Repository and service layer methods
- **Integration Tests**: API endpoints and database operations
- **Component Tests**: React components with React Testing Library
- **E2E Tests**: Critical user journeys with Playwright

### Performance Optimizations

- **Bundle splitting** by feature area
- **Lazy loading** for non-critical components  
- **Image optimization** with Next.js Image component
- **Database query optimization** with proper indexing
- **Caching strategies** for frequently accessed data
- **OpenTelemetry monitoring** for performance insights

## Telemetry & Monitoring

### OpenTelemetry Integration (Optional)

**Architecture**:
- `src/lib/telemetry/server.ts` - Server-side telemetry with full OpenTelemetry
- `src/lib/telemetry/client.ts` - Browser-compatible stub implementation  
- `src/lib/telemetry/index.ts` - Unified interface with environment detection

**Features**:
- **Distributed tracing** across services
- **Metrics collection** for API calls, database queries, component renders
- **Error tracking** with context and stack traces
- **Performance monitoring** with custom business metrics
- **Real-time dashboards** for system health

**Note**: OpenTelemetry packages are optional dependencies. The system gracefully degrades to console logging if packages are not installed.

## Database Schema

### Core Tables
- `users` - User profiles and authentication
- `organizations` - Board organizations  
- `organization_members` - Membership relationships
- `vaults` - Secure document containers
- `assets` - File metadata and versions
- `notifications` - System and user notifications
- `calendar_events` - Board meetings and events
- `compliance_workflows` - Governance processes
- `activity_logs` - Audit trail for all operations

### Security Features
- **Row-Level Security (RLS)** on all tables
- **Encrypted sensitive fields** 
- **Audit logging** for compliance
- **Data retention policies** for GDPR compliance

## Environment Configuration

### Required Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application Configuration  
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Optional: OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
NEXT_PUBLIC_METRICS_TOKEN=your-metrics-token
```

### Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Production build
npm run start           # Start production server

# Code Quality
npm run lint            # ESLint checking
npm run typecheck       # TypeScript checking
npm run type-check      # Alternative typecheck command

# Testing
npm run test            # Run Jest unit tests
npm run test:e2e        # Run Playwright E2E tests
npm run test:coverage   # Generate test coverage report

# Database
npm run db:generate     # Generate Supabase types
npm run db:push         # Push schema changes
npm run db:reset        # Reset local database
```

## Deployment

### Vercel Configuration
The application is configured for Vercel deployment with:
- **Optimized Next.js build** settings
- **Environment variable** management
- **Server-side telemetry** that doesn't affect browser bundles
- **Edge runtime** compatibility where appropriate

### Security Headers
Production deployment includes security headers:
- Content Security Policy (CSP)
- Strict Transport Security (HSTS)
- X-Frame-Options, X-Content-Type-Options
- Referrer Policy

## Troubleshooting

### Common Issues

1. **OpenTelemetry Build Warnings**: These are expected when OpenTelemetry packages are not installed. The application will work with stub implementations.

2. **TypeScript Strict Errors**: Use bracket notation for index signatures: `process.env['VARIABLE_NAME']`

3. **Supabase Connection Issues**: Ensure environment variables are correctly set and RLS policies allow access.

4. **State Persistence Issues**: Check IndexedDB storage and clear if corrupted.

## Contributing

### Pull Request Process
1. Create feature branch from `main`
2. Implement changes following architecture patterns
3. Add comprehensive tests for new functionality
4. Update documentation as needed
5. Ensure all builds and tests pass
6. Request review from senior developers

### Code Review Checklist
- [ ] Follows DDD architecture patterns
- [ ] Proper TypeScript typing without `any`
- [ ] Repository pattern used for database access
- [ ] Service layer implements business logic
- [ ] Components follow Atomic Design principles  
- [ ] Error handling with Result pattern
- [ ] Tests cover new functionality
- [ ] Documentation updated

## Future Roadmap

### Planned Features
- Advanced analytics and reporting
- Mobile application support
- Third-party integrations (calendar systems, document providers)
- Advanced workflow automation
- Multi-language support
- Enhanced compliance reporting

### Technical Improvements
- GraphQL API layer for flexible data fetching  
- Advanced caching strategies with Redis
- Microservices architecture for high-scale deployments
- Advanced monitoring with custom metrics
- Performance optimization with React 18 features

## Style Guide

### Code Style Standards

#### File and Directory Naming
- **Files**: Use kebab-case for file names: `user-service.ts`, `board-chat-panel.tsx`
- **Directories**: Use kebab-case: `board-chat/`, `compliance-workflows/`
- **Components**: Use PascalCase for React components: `BoardChatPanel.tsx`
- **Types**: Use kebab-case for type definition files: `board-types.ts`

#### TypeScript Conventions

**Interface and Type Naming**:
```typescript
// Interfaces: Use PascalCase with 'I' prefix for complex interfaces
interface IUserRepository {
  findById(id: UserId): Promise<User | null>
}

// Types: Use PascalCase
type LoadingState = 'idle' | 'loading' | 'success' | 'error'

// Generic Types: Use descriptive single letters
type Result<TData, TError = Error> = 
  | { success: true; data: TData }
  | { success: false; error: TError }
```

**Variable and Function Naming**:
```typescript
// Variables: Use camelCase
const currentUser = await userService.getCurrentUser()
const isAuthenticated = user !== null

// Functions: Use camelCase with descriptive verbs
const validateUserPermissions = (userId: UserId, action: string) => { }
const transformAssetMetadata = (asset: Asset) => { }

// Constants: Use UPPER_SNAKE_CASE
const MAX_FILE_SIZE_MB = 100
const DEFAULT_PAGE_SIZE = 20
const API_ENDPOINTS = {
  USERS: '/api/users',
  ASSETS: '/api/assets'
} as const
```

**Class Naming**:
```typescript
// Classes: Use PascalCase with descriptive suffixes
class UserRepository extends BaseRepository { }
class AssetUploadService { }
class NotificationController { }
class BoardChatWebSocketHandler { }
```

#### React Component Conventions

**Component Structure**:
```typescript
/**
 * ComponentName - Brief description
 * 
 * @param prop1 - Description of prop1
 * @param prop2 - Description of prop2
 */
interface ComponentNameProps {
  prop1: string
  prop2?: number
  onAction?: (data: SomeType) => void
}

export function ComponentName({ 
  prop1, 
  prop2 = defaultValue,
  onAction 
}: ComponentNameProps) {
  // Hooks at the top
  const [state, setState] = useState<StateType>(initialState)
  const { data, loading, error } = useQuery()
  
  // Event handlers
  const handleClick = useCallback((event: MouseEvent) => {
    // Handle click logic
    onAction?.(data)
  }, [data, onAction])
  
  // Effects
  useEffect(() => {
    // Effect logic
  }, [dependencies])
  
  // Early returns
  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  
  // Main render
  return (
    <div className="component-container">
      <h2 className="component-title">{prop1}</h2>
      <button onClick={handleClick}>
        Action
      </button>
    </div>
  )
}
```

**Component Export Patterns**:
```typescript
// Default export for main component
export default function BoardDashboard() { }

// Named exports for utilities and types
export { type BoardDashboardProps, useBoardData }

// Re-exports from index files
export { BoardDashboard } from './board-dashboard'
export type { BoardDashboardProps } from './board-dashboard'
```

#### CSS and Styling Conventions

**Tailwind CSS Classes**:
```typescript
// Group classes logically: layout, spacing, colors, typography, states
const buttonClasses = cn(
  // Layout
  'flex items-center justify-center',
  // Spacing
  'px-4 py-2 gap-2',
  // Appearance
  'bg-blue-600 text-white rounded-lg shadow-sm',
  // Typography
  'text-sm font-medium',
  // States
  'hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  // Responsive
  'sm:px-6 sm:py-3 sm:text-base'
)
```

**Component Class Naming**:
```typescript
// Use semantic class names for custom components
<div className="board-chat-panel">
  <div className="chat-header">
    <h2 className="chat-title">Board Discussion</h2>
  </div>
  <div className="chat-messages">
    {messages.map(message => (
      <div key={message.id} className="chat-message">
        <span className="message-author">{message.author}</span>
        <p className="message-content">{message.content}</p>
      </div>
    ))}
  </div>
</div>
```

#### Error Handling Patterns

**Result Pattern Usage**:
```typescript
// Service layer methods should return Result types
async function createUser(userData: CreateUserRequest): Promise<Result<User>> {
  try {
    const user = await userRepository.create(userData)
    return { success: true, data: user }
  } catch (error) {
    return { 
      success: false, 
      error: new Error(`Failed to create user: ${error.message}`) 
    }
  }
}

// API routes should handle Results gracefully
export async function POST(request: Request) {
  const result = await userService.createUser(userData)
  
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.message },
      { status: 400 }
    )
  }
  
  return NextResponse.json(result.data)
}
```

**Error Boundary Usage**:
```typescript
// Wrap major application sections with error boundaries
<ErrorBoundary fallback={<BoardDashboardError />}>
  <BoardDashboard />
</ErrorBoundary>
```

#### API Design Conventions

**Controller Method Structure**:
```typescript
export class UserController {
  constructor(private userService: UserService) {}
  
  @WithTelemetry('user.create')
  async createUser(request: CreateUserRequest): Promise<ApiResponse<User>> {
    // Validate input
    const validation = validateCreateUserRequest(request)
    if (!validation.valid) {
      return ApiResponse.badRequest(validation.errors)
    }
    
    // Execute business logic
    const result = await this.userService.createUser(request)
    
    // Handle result
    if (!result.success) {
      return ApiResponse.error(result.error.message)
    }
    
    return ApiResponse.success(result.data)
  }
}
```

**API Response Format**:
```typescript
// Consistent API response structure
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  metadata?: {
    timestamp: string
    requestId: string
    pagination?: PaginationInfo
  }
}
```

#### Database and Repository Patterns

**Repository Method Naming**:
```typescript
class UserRepository extends BaseRepository {
  // CRUD operations
  async findById(id: UserId): Promise<User | null> { }
  async findMany(criteria: UserCriteria): Promise<User[]> { }
  async create(data: CreateUserData): Promise<User> { }
  async update(id: UserId, data: UpdateUserData): Promise<User> { }
  async delete(id: UserId): Promise<void> { }
  
  // Business-specific queries
  async findByEmail(email: string): Promise<User | null> { }
  async findByOrganization(orgId: OrganizationId): Promise<User[]> { }
  async findActiveUsers(): Promise<User[]> { }
}
```

**Query Building**:
```typescript
// Use the repository query builder for complex queries
const users = await this.queryBuilder()
  .from('users')
  .select('*')
  .innerJoin('organization_members', 'users.id', 'organization_members.user_id')
  .where('organization_members.organization_id', orgId)
  .where('organization_members.status', 'active')
  .orderBy('users.created_at', 'desc')
  .execute()
```

#### State Management Conventions

**Zustand Store Structure**:
```typescript
interface UserStoreState {
  // State properties
  currentUser: User | null
  loading: boolean
  error: string | null
  
  // Actions
  setUser: (user: User) => void
  clearUser: () => void
  updateUser: (updates: Partial<User>) => void
  
  // Async actions
  loadCurrentUser: () => Promise<void>
  updateProfile: (data: UpdateProfileData) => Promise<void>
}

export const useUserStore = create<UserStoreState>()((set, get) => ({
  // Initial state
  currentUser: null,
  loading: false,
  error: null,
  
  // Sync actions
  setUser: (user) => set({ currentUser: user, error: null }),
  clearUser: () => set({ currentUser: null }),
  updateUser: (updates) => set((state) => ({
    currentUser: state.currentUser ? { ...state.currentUser, ...updates } : null
  })),
  
  // Async actions
  loadCurrentUser: async () => {
    set({ loading: true, error: null })
    try {
      const result = await userService.getCurrentUser()
      if (result.success) {
        set({ currentUser: result.data, loading: false })
      } else {
        set({ error: result.error.message, loading: false })
      }
    } catch (error) {
      set({ error: 'Failed to load user', loading: false })
    }
  }
}))
```

#### Testing Conventions

**Test File Organization**:
```
src/
├── components/
│   ├── BoardChat.tsx
│   └── BoardChat.test.tsx
├── services/
│   ├── user.service.ts
│   └── user.service.test.ts
└── __tests__/
    ├── integration/
    │   └── user-flow.test.ts
    └── e2e/
        └── board-management.spec.ts
```

**Test Naming and Structure**:
```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      // Arrange
      const userData = { email: 'test@example.com', name: 'Test User' }
      
      // Act
      const result = await userService.createUser(userData)
      
      // Assert
      expect(result.success).toBe(true)
      expect(result.data.email).toBe(userData.email)
    })
    
    it('should return error for invalid email format', async () => {
      // Arrange
      const userData = { email: 'invalid-email', name: 'Test User' }
      
      // Act
      const result = await userService.createUser(userData)
      
      // Assert
      expect(result.success).toBe(false)
      expect(result.error.message).toContain('Invalid email format')
    })
  })
})
```

#### Documentation Standards

**Code Comments**:
```typescript
/**
 * Processes uploaded board documents and extracts metadata
 * 
 * @param file - The uploaded file buffer
 * @param metadata - Additional file metadata from the client
 * @returns Promise<ProcessedDocument> - The processed document with extracted metadata
 * 
 * @throws {ValidationError} When file format is not supported
 * @throws {ProcessingError} When document processing fails
 * 
 * @example
 * ```typescript
 * const result = await processDocument(fileBuffer, { 
 *   originalName: 'board-minutes.pdf',
 *   uploadedBy: userId 
 * })
 * ```
 */
async function processDocument(
  file: Buffer, 
  metadata: UploadMetadata
): Promise<ProcessedDocument> {
  // Implementation
}
```

**README Standards**:
- Clear installation instructions
- Environment setup guide
- Development workflow
- API documentation links
- Troubleshooting section

#### Performance Guidelines

**React Performance**:
```typescript
// Use React.memo for expensive components
export const ExpensiveComponent = React.memo(function ExpensiveComponent({ 
  data, 
  onUpdate 
}: Props) {
  return <div>{/* Complex rendering logic */}</div>
}, (prevProps, nextProps) => {
  // Custom comparison logic if needed
  return prevProps.data.id === nextProps.data.id
})

// Use useMemo for expensive calculations
const processedData = useMemo(() => {
  return expensiveProcessing(rawData)
}, [rawData])

// Use useCallback for event handlers passed to children
const handleClick = useCallback((id: string) => {
  onItemClick(id)
}, [onItemClick])
```

**Bundle Optimization**:
```typescript
// Use dynamic imports for code splitting
const LazyComponent = lazy(() => import('./components/ExpensiveComponent'))

// Use next/dynamic for Next.js components
const DynamicComponent = dynamic(
  () => import('./components/ClientOnlyComponent'),
  { 
    loading: () => <ComponentSkeleton />,
    ssr: false 
  }
)
```

#### Security Guidelines

**Input Validation**:
```typescript
// Always validate input at API boundaries
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['owner', 'admin', 'member', 'viewer'])
})

export async function POST(request: Request) {
  const body = await request.json()
  const validation = createUserSchema.safeParse(body)
  
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: validation.error.errors },
      { status: 400 }
    )
  }
  
  // Process validated data
}
```

**Environment Variables**:
```typescript
// Use type-safe environment variable access
const env = {
  SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  SUPABASE_ANON_KEY: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
  SERVICE_ROLE_KEY: process.env['SUPABASE_SERVICE_ROLE_KEY']!,
} as const

// Validate required environment variables at startup
function validateEnvironment() {
  for (const [key, value] of Object.entries(env)) {
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`)
    }
  }
}
```

#### Git Conventions

**Commit Messages**:
```
type(scope): description

fix(auth): resolve session timeout issue
feat(board-chat): add real-time message notifications
docs(api): update user management endpoint documentation
refactor(repositories): consolidate database query methods
test(user-service): add comprehensive unit tests
chore(deps): update TypeScript to 5.2.2
```

**Branch Naming**:
- `feature/board-chat-improvements`
- `bugfix/authentication-session-timeout`
- `refactor/repository-layer-consolidation`
- `docs/api-documentation-update`

**Pull Request Template**:
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Refactoring

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Code Quality
- [ ] TypeScript strict mode compliance
- [ ] ESLint rules satisfied
- [ ] Code follows style guide
- [ ] Documentation updated
```

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Domain-Driven Design](https://domainlanguage.com/ddd/)
- [OpenTelemetry](https://opentelemetry.io/docs/)
- [Atomic Design Methodology](https://atomicdesign.bradfrost.com/)

---

*Last Updated: August 2025*
*Refactoring Completed: 169 files, 42,503+ lines of code transformed*
*Type Safety: 95%+ achieved (from 66.8%)*
*Architecture: DDD with Repository Pattern, Service Layer, Advanced TypeScript*