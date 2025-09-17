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

## 🔧 Known Issues & Solutions

### Authentication Session Persistence (FIXED - Aug 30, 2025)
**Problem**: Users were being redirected back to login page after successful authentication.

**Root Cause**: Sign-in page used localStorage while dashboard used cookies for session storage, making sessions invisible between pages.

**Solution**: Unified all Supabase clients to use cookie-based storage with proper implementation:
- All clients now use `createBrowserClient` from `@supabase/ssr`
- Implemented proper cookie parsing, setting, and removal functions
- Fixed cookie chunking support for large auth tokens
- Singleton pattern ensures consistent session management

**Files Modified**:
- `/src/lib/supabase-client.ts` - Complete rewrite for cookie-based storage
- `/src/contexts/AuthContext.tsx` - Added centralized auth state management

### Document Upload Issue (FIXED - Sep 17, 2025)
**Problem**: Users unable to upload documents in the Documents page.

**Root Causes**:
1. API response structure mismatch between upload route and DocumentUploader component
2. Storage bucket configuration needed verification

**Solution**:
- Fixed API response handling to support both `result.asset` and `result.data.asset` formats
- Verified Supabase storage bucket 'assets' exists with proper RLS policies
- Created diagnostic endpoint at `/api/assets/diagnose` for troubleshooting

**Files Modified**:
- `/src/components/documents/DocumentUploader.tsx` - Fixed response structure handling
- `/src/app/api/assets/diagnose/route.ts` - Added diagnostic endpoint
- `/scripts/test-upload.js` - Created test script for upload verification

## 🚀 Deployment Information

### GitHub Repository
- **Primary**: https://github.com/aiborg-ai/appboardguru
- **Alternative**: https://github.com/BoardGuruHV/appboardguru

### Vercel Deployment
- **Project URL**: https://vercel.com/h-viks-projects/app-boardguru
- **Deployments**: https://vercel.com/h-viks-projects/app-boardguru/deployments
- **Production URL**: https://appboardguru.vercel.app

### Deployment Configuration
- **Auto-deploy**: Enabled via GitHub integration (triggers on push to main branch)
- **Build Command**: `rm -rf .next && SKIP_ENV_VALIDATION=true npm run build`
- **Install Command**: `npm cache clean --force && npm install --force`
- **Framework**: Next.js
- **Node Version**: 18.x
- **Environment Variables**: Configured in Vercel dashboard

### Latest Deployment (Sep 17, 2025)
- **Commit**: `78d1b3cf` - Fixed document upload functionality
- **Status**: Auto-deployed via GitHub integration
- **Changes**: Document upload fixes, API response structure improvements

### Supabase Configuration
- **Storage Buckets**: 
  - `assets` - Main document storage (private, 50MB limit)
  - `email-assets` - Email attachment storage
- **RLS Policies**: Configured for authenticated users (INSERT, SELECT, UPDATE, DELETE)

## Important Notes

- **Test User**: `test.director@appboardguru.com` / Password: `TestDirector123!`
- **Architecture Docs**: See `ARCHITECTURE.md` for full details
- **Migration Guide**: See `MIGRATION_GUIDE.md` for step-by-step instructions
- **Refactor Plan**: See `REFACTOR_PLAN.md` for 12-week roadmap
- **AI Features**: See `AI_INVESTMENT_FEATURES.md` for implementation tracking

---

*Last Updated: September 17, 2025*
*Architecture: Hexagonal (DDD) + CQRS + Event-Driven*
*Status: Production Ready for 500+ Features*