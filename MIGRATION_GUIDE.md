# 📋 Migration Guide: Moving to Hexagonal Architecture

## Overview

This guide provides step-by-step instructions for migrating existing BoardGuru code to the new hexagonal architecture. Follow these patterns to ensure consistency and maintain quality.

## 🎯 Migration Priorities

### Priority 1: Core Business Features
1. User Management
2. Board Management
3. Document/Asset Management
4. Meeting Scheduling
5. Notifications

### Priority 2: Supporting Features
1. Search functionality
2. Calendar integration
3. Reporting/Analytics
4. Compliance workflows

### Priority 3: Enhancement Features
1. AI Chat integration
2. Voice features
3. Advanced visualizations

## 📝 Migration Checklist

For each feature being migrated:

- [ ] Identify domain entities
- [ ] Create value objects
- [ ] Define repository interfaces
- [ ] Implement use cases
- [ ] Create commands/queries
- [ ] Update UI components
- [ ] Write tests
- [ ] Update documentation

## 🔄 Migration Patterns

### 1. Migrating a Service to Use Case

#### Before (Old Pattern):
```typescript
// src/lib/services/user.service.ts
export class UserService {
  async createUser(data: any) {
    const supabase = createSupabaseBrowserClient();
    
    // Direct database call
    const { data: user, error } = await supabase
      .from('users')
      .insert(data)
      .single();
      
    if (error) throw error;
    
    // Send email directly
    await sendEmail(user.email, 'Welcome!');
    
    return user;
  }
}
```

#### After (New Pattern):
```typescript
// src/domain/entities/user.entity.ts
export class User extends AggregateRoot {
  static create(/* params */): Result<User> {
    // Domain validation
    // Business rules
    // Return Result type
  }
}

// src/application/use-cases/user/create-user.use-case.ts
export class CreateUserUseCase implements UseCase<CreateUserInput, CreateUserOutput> {
  constructor(
    private userRepository: IUserRepository,
    private emailService: IEmailService
  ) {}
  
  async execute(input: CreateUserInput): Promise<Result<CreateUserOutput>> {
    // Create domain entity
    const userResult = User.create(/* ... */);
    if (!userResult.success) return userResult;
    
    // Save via repository
    const saveResult = await this.userRepository.save(userResult.data);
    if (!saveResult.success) return saveResult;
    
    // Publish events
    await userResult.data.publishDomainEvents();
    
    // Send welcome email
    await this.emailService.sendWelcomeEmail(/* ... */);
    
    return ResultUtils.ok(/* ... */);
  }
}
```

### 2. Migrating Direct Database Calls

#### Before:
```typescript
// Scattered throughout components
const { data, error } = await supabase
  .from('boards')
  .select('*')
  .eq('organization_id', orgId);
```

#### After:
```typescript
// src/infrastructure/repositories/board.repository.ts
export class BoardRepository implements IBoardRepository {
  async findByOrganization(orgId: string): Promise<Result<Board[]>> {
    try {
      const { data, error } = await this.supabase
        .from('boards')
        .select('*')
        .eq('organization_id', orgId);
        
      if (error) return ResultUtils.fail(new Error(error.message));
      
      const boards = data.map(dto => this.mapToDomain(dto));
      return ResultUtils.ok(boards);
    } catch (error) {
      return ResultUtils.fail(error);
    }
  }
}

// In use case or query handler
const boardsResult = await this.boardRepository.findByOrganization(orgId);
if (!boardsResult.success) {
  return boardsResult;
}
```

### 3. Migrating API Routes

#### Before:
```typescript
// app/api/users/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  
  // Direct service call
  const userService = new UserService();
  const user = await userService.createUser(body);
  
  return NextResponse.json(user);
}
```

#### After:
```typescript
// app/api/users/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  
  // Create command
  const command = new CreateUserCommand(body);
  
  // Execute via command bus
  const result = await commandBus.executeCommand<CreateUserCommand, CreateUserOutput>(command);
  
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.message },
      { status: 400 }
    );
  }
  
  return NextResponse.json(result.data);
}
```

### 4. Migrating UI Components

#### Before:
```typescript
// components/UserList.tsx
export function UserList() {
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('users').select('*');
      setUsers(data);
    };
    fetchUsers();
  }, []);
  
  return <div>{/* render users */}</div>;
}
```

#### After:
```typescript
// presentation/03-features/users/components/UserList.tsx
export function UserList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const query = new GetUsersQuery({ organizationId });
      const result = await commandBus.executeQuery(query);
      
      if (!result.success) {
        throw new Error(result.error.message);
      }
      
      return result.data;
    }
  });
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <div>{/* render users */}</div>;
}
```

## 🏗️ Step-by-Step Migration Process

### Step 1: Identify the Feature
Choose a feature to migrate (e.g., User Management)

### Step 2: Create Domain Entities
```typescript
// src/domain/entities/user.entity.ts
export class User extends AggregateRoot {
  // Properties
  private email: Email;
  private name: UserName;
  
  // Business methods
  activate(): Result<void> { }
  suspend(): Result<void> { }
  changeRole(): Result<void> { }
}
```

### Step 3: Define Repository Interface
```typescript
// src/application/interfaces/repositories/user.repository.interface.ts
export interface IUserRepository {
  findById(id: string): Promise<Result<User | null>>;
  findByEmail(email: string): Promise<Result<User | null>>;
  save(user: User): Promise<Result<User>>;
  delete(id: string): Promise<Result<void>>;
}
```

### Step 4: Implement Repository
```typescript
// src/infrastructure/repositories/user.repository.ts
export class UserRepository implements IUserRepository {
  // Implementation using Supabase
}
```

### Step 5: Create Use Cases
```typescript
// src/application/use-cases/user/create-user.use-case.ts
export class CreateUserUseCase implements UseCase<Input, Output> {
  // Business logic orchestration
}
```

### Step 6: Setup Commands/Queries
```typescript
// src/application/cqrs/commands/create-user.command.ts
export class CreateUserCommand implements Command<CreateUserInput> {
  // Command definition
}

export class CreateUserCommandHandler implements CommandHandler<CreateUserCommand> {
  // Command handling
}
```

### Step 7: Update API Routes
```typescript
// app/api/users/route.ts
export async function POST(request: Request) {
  // Use command bus instead of direct service calls
}
```

### Step 8: Migrate UI Components
```typescript
// Move to presentation/03-features/users/
// Update to use command bus and queries
```

### Step 9: Write Tests
```typescript
// tests/unit/domain/user.entity.test.ts
// tests/integration/use-cases/create-user.test.ts
// tests/e2e/user-management.test.ts
```

## 🔧 Common Migration Scenarios

### Scenario 1: Migrating Zustand Store

#### Before:
```typescript
// stores/userStore.ts
export const useUserStore = create((set) => ({
  users: [],
  fetchUsers: async () => {
    const { data } = await supabase.from('users').select('*');
    set({ users: data });
  }
}));
```

#### After:
```typescript
// presentation/06-app/stores/userStore.ts
export const useUserStore = create((set) => ({
  users: [],
  fetchUsers: async () => {
    const query = new GetUsersQuery({});
    const result = await commandBus.executeQuery(query);
    
    if (result.success) {
      set({ users: result.data.items });
    }
  }
}));
```

### Scenario 2: Migrating Form Submissions

#### Before:
```typescript
const handleSubmit = async (data) => {
  const { error } = await supabase
    .from('boards')
    .insert(data);
    
  if (error) {
    toast.error(error.message);
  }
};
```

#### After:
```typescript
const handleSubmit = async (data) => {
  const command = new CreateBoardCommand(data);
  const result = await commandBus.executeCommand(command);
  
  if (!result.success) {
    toast.error(result.error.message);
    return;
  }
  
  toast.success('Board created successfully');
  router.push(`/boards/${result.data.id}`);
};
```

### Scenario 3: Migrating Complex Queries

#### Before:
```typescript
// Complex query with joins
const { data } = await supabase
  .from('boards')
  .select(`
    *,
    members!inner(
      user_id,
      role,
      users(email, name)
    )
  `)
  .eq('organization_id', orgId);
```

#### After:
```typescript
// Create specific query handler
export class GetBoardWithMembersQueryHandler {
  async handle(query: GetBoardWithMembersQuery): Promise<Result<BoardWithMembers>> {
    // Implement optimized query
    // Map to domain models
    // Return typed result
  }
}
```

## 🚫 Anti-Patterns to Avoid

### ❌ Don't Mix Layers
```typescript
// BAD: Domain entity with database logic
class User {
  async save() {
    await supabase.from('users').insert(this);
  }
}
```

### ❌ Don't Skip Result Types
```typescript
// BAD: Throwing exceptions
async findUser(id: string): Promise<User> {
  const user = await this.repository.findById(id);
  if (!user) throw new Error('User not found');
  return user;
}

// GOOD: Using Result type
async findUser(id: string): Promise<Result<User>> {
  return await this.repository.findById(id);
}
```

### ❌ Don't Access Database from UI
```typescript
// BAD: Direct database call in component
export function UserProfile() {
  const [user, setUser] = useState();
  
  useEffect(() => {
    supabase.from('users').select('*').then(/* ... */);
  }, []);
}
```

### ❌ Don't Bypass the Command Bus
```typescript
// BAD: Direct use case instantiation
const useCase = new CreateUserUseCase(repo, emailService);
const result = await useCase.execute(data);

// GOOD: Via command bus
const command = new CreateUserCommand(data);
const result = await commandBus.executeCommand(command);
```

## 📊 Migration Tracking

### Phase 1: Core Features (Week 1-2)
- [ ] User management
- [ ] Authentication
- [ ] Organization management
- [ ] Basic CRUD operations

### Phase 2: Business Features (Week 3-4)
- [ ] Board management
- [ ] Meeting scheduling
- [ ] Document management
- [ ] Notifications

### Phase 3: Advanced Features (Week 5-6)
- [ ] Search functionality
- [ ] Analytics
- [ ] AI features
- [ ] Real-time updates

## 🧪 Testing During Migration

### For Each Migrated Feature:

1. **Unit Tests**
   - Domain entities
   - Value objects
   - Use cases

2. **Integration Tests**
   - Repository implementations
   - API endpoints
   - Service integrations

3. **E2E Tests**
   - User workflows
   - Critical paths
   - Performance

## 📚 Resources

### Documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture overview
- [REFACTOR_PLAN.md](./REFACTOR_PLAN.md) - Refactoring roadmap
- [Domain Modeling Guide](./docs/domain-modeling.md)
- [Testing Strategy](./docs/testing-strategy.md)

### Examples
- User Management: `src/domain/entities/user.entity.ts`
- Board Management: `src/domain/entities/board.entity.ts`
- Create User Use Case: `src/application/use-cases/user/create-user.use-case.ts`
- User Repository: `src/infrastructure/repositories/user.repository.ts`

### Tools
- TypeScript Compiler: `npm run type-check`
- Linter: `npm run lint`
- Tests: `npm test`
- Development: `npm run dev`

## ❓ FAQ

### Q: How long will the migration take?
A: Full migration is estimated at 6-8 weeks with a dedicated team.

### Q: Can we migrate incrementally?
A: Yes! The architecture supports gradual migration. Start with one feature at a time.

### Q: What about existing APIs?
A: Maintain backward compatibility during migration. Deprecate old endpoints gradually.

### Q: How do we handle database migrations?
A: No database schema changes required initially. Map existing tables to domain entities.

### Q: What about performance?
A: The new architecture typically improves performance through better caching and optimization opportunities.

---

## 📞 Support

- **Architecture Team:** architecture@boardguru.com
- **Slack Channel:** #migration-support
- **Office Hours:** Daily 2-3 PM
- **Wiki:** [Internal Documentation]

---

*Last Updated: August 2025*
*Version: 1.0.0*