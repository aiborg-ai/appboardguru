# Development Workflow - AppBoardGuru DDD Architecture

## 🚀 **Step-by-Step Feature Development Process**

Based on the established DDD architecture in CLAUDE.md, follow this systematic approach for all new features:

### **Phase 1: Domain Design (30 minutes)**

1. **Define Business Requirements**
   - Write user stories and acceptance criteria
   - Identify domain concepts and entities
   - Define business rules and constraints

2. **Create Domain Models**
   ```bash
   # Location: src/types/[feature-name].ts
   - Define branded types for IDs
   - Create core domain interfaces
   - Add validation schemas with Zod
   - Define request/response types
   ```

3. **Design Domain Events**
   ```typescript
   // Examples:
   - FeatureCreatedEvent
   - FeatureUpdatedEvent  
   - FeatureDeletedEvent
   ```

### **Phase 2: Data Layer (45 minutes)**

4. **Create Repository**
   ```bash
   # Location: src/lib/repositories/[feature-name].repository.ts
   - Extend BaseRepository<Entity>
   - Add business-specific query methods
   - Implement Result pattern for all methods
   - Add audit logging for sensitive operations
   ```

5. **Database Schema** (if needed)
   ```bash
   # Add migration if new tables needed
   npm run db:migrate:create [migration-name]
   ```

### **Phase 3: Business Logic Layer (60 minutes)**

6. **Implement Service Layer**
   ```bash
   # Location: src/lib/services/[feature-name].service.ts
   - Define service with dependency injection
   - Implement business operations
   - Add permission checking
   - Publish domain events
   - Handle Result pattern consistently
   ```

7. **Register Service**
   ```bash
   # Update: src/lib/services/index.ts
   - Add to ServiceFactory
   - Configure dependencies
   ```

### **Phase 4: API Layer (30 minutes)**

8. **Create API Controller**
   ```bash
   # Location: src/app/api/[feature-name]/route.ts
   - Implement CRUD endpoints
   - Add request validation with Zod
   - Handle Result pattern responses
   - Add OpenAPI documentation
   ```

9. **Update API Documentation**
   ```bash
   npm run docs:generate  # Auto-generate from OpenAPI comments
   ```

### **Phase 5: Frontend Layer (90 minutes)**

10. **Create Zustand Store**
    ```bash
    # Location: src/lib/stores/[feature-name]-store.ts
    - Define state interface
    - Implement async actions with Result pattern
    - Add persistence if needed
    ```

11. **Build Components (Atomic Design)**
    ```bash
    # Atoms: src/components/atoms/
    # Molecules: src/components/molecules/
    # Organisms: src/components/organisms/
    - Use React.memo for all components
    - Implement useCallback for event handlers
    - Add useMemo for expensive calculations
    - Follow performance optimization patterns
    ```

12. **Create Page/Route**
    ```bash
    # Location: src/app/dashboard/[feature-name]/page.tsx
    - Integrate store with components
    - Handle loading/error states
    - Add proper TypeScript types
    ```

### **Phase 6: Testing (60 minutes)**

13. **Unit Tests**
    ```bash
    # Repository tests: __tests__/repositories/
    # Service tests: __tests__/services/
    # Component tests: __tests__/components/
    - Aim for 80% coverage minimum
    - Test error scenarios
    - Mock dependencies properly
    ```

14. **Integration Tests**
    ```bash
    # API tests: __tests__/api/
    - Test full request/response cycle
    - Test validation and error handling
    ```

15. **E2E Tests**
    ```bash
    # E2E tests: __tests__/e2e/
    - Test critical user workflows
    - Test cross-browser compatibility
    - Add accessibility testing
    ```

### **Phase 7: Documentation & Deployment (30 minutes)**

16. **Documentation**
    ```bash
    - Update README if needed
    - Add feature documentation
    - Update API docs
    ```

17. **Quality Checks**
    ```bash
    npm run type-safety:check  # TypeScript + ESLint
    npm run test:coverage     # Test coverage
    npm run e2e              # E2E tests
    ```

18. **Performance Validation**
    ```bash
    npm run test:performance  # Performance benchmarks
    # Check bundle size impact
    # Verify virtual scrolling works for large datasets
    ```

---

## ⚡ **Quick Development Commands**

```bash
# Generate new feature scaffold
npm run generate:feature [feature-name]

# Run full development cycle
npm run dev                    # Start dev server
npm run type-check            # Check TypeScript
npm run lint                  # Check code style
npm run test                  # Run unit tests
npm run e2e                   # Run E2E tests

# Quality assurance
npm run type-safety:check     # Full type safety check
npm run test:coverage         # Coverage report
npm run docs:generate         # Update API docs

# Database operations
npm run db:migrate           # Run migrations
npm run db:generate         # Generate types
```

---

## 🎯 **Quality Gates**

Each phase must pass these quality gates:

### **Code Quality**
- [ ] 100% TypeScript (no `any` types)
- [ ] Branded types used for all IDs
- [ ] Repository pattern (no direct Supabase calls)
- [ ] Result pattern for error handling
- [ ] React.memo optimization for components

### **Architecture Compliance** 
- [ ] DDD principles followed
- [ ] Clean separation of concerns
- [ ] Dependency injection used
- [ ] Event-driven architecture where applicable

### **Performance Standards**
- [ ] Components render under 16ms
- [ ] API responses under 200ms (cached)
- [ ] Virtual scrolling for large datasets
- [ ] Bundle size impact acceptable

### **Testing Requirements**
- [ ] 80% minimum test coverage
- [ ] Unit tests for repositories/services
- [ ] Integration tests for APIs
- [ ] E2E tests for critical workflows
- [ ] Accessibility testing passes

### **Security Standards**
- [ ] Input validation with Zod schemas
- [ ] Permission checking in services
- [ ] Audit logging for sensitive operations
- [ ] No secrets in code/commits

---

## 🔄 **Iteration Cycle**

For ongoing feature development:

1. **Daily** - Run type-check and unit tests
2. **Before PR** - Full quality gate checks
3. **Weekly** - Performance benchmarking
4. **Monthly** - Architecture review and refactoring opportunities

---

## 🛠️ **Development Environment Setup**

```bash
# Initial setup
npm install
cp .env.local.example .env.local
# Configure environment variables

# Development database setup
npm run db:migrate
npm run db:generate

# Start development
npm run dev

# Run in parallel during development
npm run type-check --watch    # Terminal 1
npm run test --watch          # Terminal 2  
npm run dev                   # Terminal 3
```

---

## 📋 **Pull Request Checklist**

- [ ] Feature follows DDD architecture patterns
- [ ] All quality gates pass
- [ ] Tests cover new functionality (80%+ coverage)
- [ ] Documentation updated
- [ ] Performance impact assessed
- [ ] Accessibility requirements met
- [ ] Security considerations addressed
- [ ] Code review from senior developer

---

## 🎯 **Success Metrics**

Track these metrics to ensure architecture effectiveness:

- **Type Safety**: 95%+ (target achieved)
- **Test Coverage**: 80%+ (target achieved)  
- **Performance**: Sub-200ms API responses
- **Developer Velocity**: Features delivered per sprint
- **Bug Reduction**: < 5% post-release bugs
- **Architecture Compliance**: 100% of new code follows patterns

This workflow ensures every new feature maintains the high standards established by the comprehensive refactoring documented in CLAUDE.md.