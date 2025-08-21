# Domain-Driven Architecture

This directory contains the domain modules organized by business capability. Each domain is self-contained and follows a consistent structure.

## Domain Structure

```
src/domains/
├── [domain-name]/
│   ├── api/                 # API route handlers
│   │   ├── handlers.ts      # Route handler implementations
│   │   └── validation.ts    # Request/response schemas
│   ├── components/          # React components
│   │   ├── List.tsx
│   │   ├── Detail.tsx
│   │   ├── Form.tsx
│   │   └── Card.tsx
│   ├── hooks/               # React hooks
│   │   ├── useList.ts
│   │   ├── useDetail.ts
│   │   ├── useCreate.ts
│   │   ├── useUpdate.ts
│   │   └── useDelete.ts
│   ├── services/            # Business logic
│   │   └── [domain].service.ts
│   ├── repository/          # Data access
│   │   └── [domain].repository.ts
│   ├── types/               # TypeScript types
│   │   ├── entity.types.ts
│   │   ├── dto.types.ts
│   │   └── api.types.ts
│   ├── utils/               # Domain-specific utilities
│   │   └── [domain].utils.ts
│   ├── __tests__/           # Domain tests
│   │   ├── service.test.ts
│   │   ├── repository.test.ts
│   │   └── api.test.ts
│   └── index.ts             # Domain module exports
└── shared/                  # Shared utilities and types
    ├── components/
    ├── hooks/
    ├── types/
    └── utils/
```

## Creating a New Domain

1. Copy the `template/` directory
2. Rename it to your domain name
3. Update the types in `types/`
4. Implement the repository in `repository/`
5. Implement the service in `services/`
6. Create API handlers in `api/`
7. Build React components in `components/`
8. Create custom hooks in `hooks/`
9. Write tests in `__tests__/`
10. Export everything from `index.ts`

## Conventions

- Use PascalCase for components and types
- Use camelCase for functions and variables
- Use kebab-case for file and directory names
- All API handlers should use the unified API handler factory
- All database queries should go through repositories
- All business logic should be in services
- All React state management should use custom hooks

## Dependencies

- Each domain can depend on `shared/`
- Domains should not depend on each other directly
- Cross-domain communication should go through events or shared services