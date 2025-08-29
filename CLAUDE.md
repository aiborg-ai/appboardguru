# AppBoardGuru - Development Guide

## Overview

Enterprise board governance platform with **Hexagonal Architecture (DDD)**, **CQRS**, and **Event-Driven Architecture**. Ready for 500+ features with maximum scalability.

## 🏗️ New Architecture (August 2025)

### Core Architecture
- **Hexagonal Architecture**: Clean separation with Domain, Application, Infrastructure, and Presentation layers
- **Domain-Driven Design**: Business logic at the center with entities, value objects, and aggregates
- **CQRS Pattern**: Command/Query separation with dedicated handlers
- **Event-Driven**: Loose coupling via central event bus
- **Result Pattern**: Functional error handling without exceptions
- **Feature-Sliced Design**: Scalable UI organization

### Architecture Layers
```
src/
├── 01-shared/          # Shared kernel (Result, EventBus, core types)
├── domain/             # Business entities (User, Board, Meeting)
├── application/        # Use cases and CQRS handlers
├── infrastructure/     # Repositories and external services
└── presentation/       # Feature-Sliced UI components
```

### Key Files
- **Architecture Docs**: `ARCHITECTURE.md`, `MIGRATION_GUIDE.md`
- **Domain Entities**: `src/domain/entities/user.entity.ts`, `board.entity.ts`
- **Use Cases**: `src/application/use-cases/`
- **Command Bus**: `src/application/cqrs/command-bus.ts`
- **Event Bus**: `src/01-shared/lib/event-bus.ts`
- **Repositories**: `src/infrastructure/repositories/`

## Technology Stack
- **Framework**: Next.js 14.2 with App Router
- **Database**: PostgreSQL with Supabase
- **State**: Zustand stores
- **Styling**: Tailwind CSS + Shadcn/UI
- **Testing**: Jest, React Testing Library, Playwright
- **Type Safety**: TypeScript strict mode

## Quick Start

```bash
# Development
npm run dev              # Start development server
npm run build           # Production build
npm run type-check      # TypeScript checking
npm run lint            # ESLint checking

# Testing
npm run test            # Run tests
npm run e2e             # Playwright E2E tests

# Database
npm run db:generate     # Generate Supabase types
npm run db:push         # Push schema changes
```

## Migration Guide

To migrate existing features to the new architecture:

1. **Identify domain entities** → Create in `src/domain/entities/`
2. **Define repository interfaces** → Add to `src/application/interfaces/`
3. **Implement repositories** → Create in `src/infrastructure/repositories/`
4. **Create use cases** → Add to `src/application/use-cases/`
5. **Setup CQRS handlers** → Add commands/queries in `src/application/cqrs/`
6. **Update UI components** → Use command bus instead of direct calls

See `MIGRATION_GUIDE.md` for detailed instructions.

## Key Patterns

### Result Pattern
```typescript
const result = await userRepository.findById(id);
if (!result.success) {
  return handleError(result.error);
}
const user = result.data;
```

### CQRS Usage
```typescript
// Command (Write)
const command = new CreateUserCommand(userData);
const result = await commandBus.executeCommand(command);

// Query (Read)
const query = new GetUserByIdQuery({ userId });
const user = await commandBus.executeQuery(query);
```

### Event Publishing
```typescript
user.addDomainEvent('UserCreated', { userId, email });
await user.publishDomainEvents();
```

## Important Notes

- **Test User**: `test.director@appboardguru.com`
- **Architecture Docs**: See `ARCHITECTURE.md` for full details
- **Migration Guide**: See `MIGRATION_GUIDE.md` for step-by-step instructions
- **Refactor Plan**: See `REFACTOR_PLAN.md` for 12-week roadmap

---

*Last Updated: August 2025*
*Architecture: Hexagonal (DDD) + CQRS + Event-Driven*
*Status: Production Ready for 500+ Features*