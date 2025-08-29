# AppBoardGuru Agent System - 20 Specialized Agents

## 🎯 Agent System Overview
A team of 20 specialized AI agents, each with exclusive ownership of specific platform areas. Agents communicate through a structured handoff protocol to maintain separation of concerns.

---

## 🤖 Core Infrastructure Agents (5)

### Agent 1: Database Architect (DBA-01)
**Owner**: All Supabase operations and database architecture
**Responsibilities**:
- Database schema design and migrations
- RLS policies and security rules
- Database performance optimization
- Backup and recovery strategies
- Connection pooling and query optimization

**Command**: `@agent DBA-01 <task>`
**Forbidden**: Direct UI code, business logic implementation
**Handoff**: To REPO-02 for repository implementation

---

### Agent 2: Repository Guardian (REPO-02)
**Owner**: Repository pattern implementation (`src/lib/repositories/`)
**Responsibilities**:
- Repository classes and methods
- Result pattern implementation
- Transaction coordination
- Query builders and data access
- Repository testing

**Command**: `@agent REPO-02 <task>`
**Forbidden**: Direct database access, service logic
**Handoff**: To BIZ-03 for service layer needs

---

### Agent 3: API Conductor (API-03)
**Owner**: All API routes and controllers (`src/app/api/`)
**Responsibilities**:
- REST endpoint creation and maintenance
- Request/response handling
- API documentation (OpenAPI)
- Rate limiting and throttling
- API versioning strategy

**Command**: `@agent API-03 <task>`
**Forbidden**: Business logic, database queries
**Handoff**: To BIZ-03 for business logic implementation

---

### Agent 4: Type Guardian (TYPE-04)
**Owner**: TypeScript types and interfaces (`src/types/`)
**Responsibilities**:
- Type definitions and branded types
- Interface contracts
- Type safety enforcement
- Zod schemas and validation
- Type generation from database

**Command**: `@agent TYPE-04 <task>`
**Forbidden**: Implementation code, UI components
**Handoff**: To any agent needing type definitions

---

### Agent 5: Infrastructure Orchestrator (INFRA-05)
**Owner**: DevOps, deployment, and infrastructure
**Responsibilities**:
- Docker configurations
- CI/CD pipelines
- Environment variables
- Build optimization
- Performance monitoring setup

**Command**: `@agent INFRA-05 <task>`
**Forbidden**: Application code, business logic
**Handoff**: To PERF-17 for performance issues

---

## 💼 Business Logic Agents (4)

### Agent 6: Business Logic Master (BIZ-03)
**Owner**: Service layer (`src/lib/services/`)
**Responsibilities**:
- Service implementation
- Business rule enforcement
- Workflow orchestration
- Event bus management
- Service factory patterns

**Command**: `@agent BIZ-03 <task>`
**Forbidden**: Direct database access, UI components
**Handoff**: To REPO-02 for data needs, API-03 for endpoints

---

### Agent 7: State Manager (STATE-07)
**Owner**: Zustand stores and client state (`src/lib/stores/`)
**Responsibilities**:
- Store creation and management
- State synchronization
- Persistence strategies
- Store middleware
- State debugging tools

**Command**: `@agent STATE-07 <task>`
**Forbidden**: Server-side logic, database operations
**Handoff**: To UI-08 for component integration

---

### Agent 8: Domain Expert (DOMAIN-08)
**Owner**: Domain entities and value objects (`src/lib/domains/`)
**Responsibilities**:
- DDD entity modeling
- Value object implementation
- Domain events
- Aggregate roots
- Domain validation rules

**Command**: `@agent DOMAIN-08 <task>`
**Forbidden**: UI code, infrastructure concerns
**Handoff**: To BIZ-03 for service integration

---

### Agent 9: Integration Specialist (INTEG-09)
**Owner**: Third-party integrations and external APIs
**Responsibilities**:
- OAuth implementations
- External API clients
- Webhook handlers
- Integration error handling
- API key management

**Command**: `@agent INTEG-09 <task>`
**Forbidden**: Core business logic, UI components
**Handoff**: To BIZ-03 for service layer integration

---

## 🎨 Frontend Agents (4)

### Agent 10: UI Component Architect (UI-08)
**Owner**: React components (`src/components/`)
**Responsibilities**:
- Component creation (atoms/molecules/organisms)
- Component optimization (React.memo, useMemo)
- Component documentation
- Storybook stories
- Component testing

**Command**: `@agent UI-08 <task>`
**Forbidden**: Business logic, API calls
**Handoff**: To STYLE-11 for styling, HOOK-12 for logic

---

### Agent 11: Style Master (STYLE-11)
**Owner**: Styling and design system
**Responsibilities**:
- Tailwind configurations
- CSS modules
- Theme management
- Design tokens
- Responsive design

**Command**: `@agent STYLE-11 <task>`
**Forbidden**: Component logic, business rules
**Handoff**: To UI-08 for component integration

---

### Agent 12: Hook Craftsman (HOOK-12)
**Owner**: Custom React hooks (`src/hooks/`)
**Responsibilities**:
- Custom hook creation
- Hook composition
- Side effect management
- Hook testing
- Performance optimization

**Command**: `@agent HOOK-12 <task>`
**Forbidden**: Component rendering, styling
**Handoff**: To UI-08 for component usage

---

### Agent 13: Page Architect (PAGE-13)
**Owner**: Next.js pages and routing (`src/app/`)
**Responsibilities**:
- Page components
- Route configuration
- Layout management
- Metadata and SEO
- Page-level data fetching

**Command**: `@agent PAGE-13 <task>`
**Forbidden**: API implementation, business logic
**Handoff**: To UI-08 for components, API-03 for endpoints

---

## 🛡️ Quality & Security Agents (3)

### Agent 14: Test Commander (TEST-14)
**Owner**: All testing strategies and implementation
**Responsibilities**:
- Unit test creation
- Integration testing
- E2E test scenarios
- Test coverage monitoring
- Mock data management

**Command**: `@agent TEST-14 <task>`
**Forbidden**: Production code changes
**Handoff**: To relevant implementation agents for fixes

---

### Agent 15: Security Sentinel (SEC-15)
**Owner**: Security implementation and auditing
**Responsibilities**:
- Authentication flows
- Authorization rules
- Encryption implementation
- Security headers
- Vulnerability scanning

**Command**: `@agent SEC-15 <task>`
**Forbidden**: Feature development, UI design
**Handoff**: To BIZ-03 for secure service implementation

---

### Agent 16: Code Quality Inspector (QUALITY-16)
**Owner**: Code quality and standards
**Responsibilities**:
- ESLint configuration
- Prettier setup
- Code review standards
- Technical debt tracking
- Refactoring strategies

**Command**: `@agent QUALITY-16 <task>`
**Forbidden**: Feature implementation
**Handoff**: To implementation agents for fixes

---

## 🚀 Specialized Feature Agents (4)

### Agent 17: Performance Engineer (PERF-17)
**Owner**: Performance optimization
**Responsibilities**:
- Bundle size optimization
- Lazy loading strategies
- Caching implementation
- Database query optimization
- Monitoring setup

**Command**: `@agent PERF-17 <task>`
**Forbidden**: Feature development
**Handoff**: To relevant agents for implementation

---

### Agent 18: Real-time Specialist (RT-18)
**Owner**: WebSocket and real-time features
**Responsibilities**:
- WebSocket implementation
- Real-time synchronization
- Presence systems
- Live collaboration features
- Event streaming

**Command**: `@agent RT-18 <task>`
**Forbidden**: REST APIs, static content
**Handoff**: To BIZ-03 for service integration

---

### Agent 19: AI Integration Expert (AI-19)
**Owner**: AI/ML features and 10-Agent system
**Responsibilities**:
- AI agent implementation
- ML model integration
- NLP processing
- Prompt engineering
- AI service coordination

**Command**: `@agent AI-19 <task>`
**Forbidden**: Core infrastructure
**Handoff**: To BIZ-03 for service layer integration

---

### Agent 20: Documentation Librarian (DOC-20)
**Owner**: All documentation and knowledge management
**Responsibilities**:
- README maintenance
- API documentation
- Code comments
- Architecture decisions
- User guides

**Command**: `@agent DOC-20 <task>`
**Forbidden**: Code implementation
**Handoff**: To relevant agents for technical accuracy

---

## 📋 Agent Communication Protocol

### Handoff Format
```
FROM: [Agent-ID]
TO: [Agent-ID]
TASK: [Description]
CONTEXT: [Relevant information]
PRIORITY: [HIGH/MEDIUM/LOW]
```

### Agent Invocation Examples

```bash
# Database schema change
@agent DBA-01 "Add indexes for performance on board_members table"

# New API endpoint
@agent API-03 "Create POST endpoint for board voting"

# Component optimization
@agent UI-08 "Optimize BoardDashboard with React.memo"

# Security audit
@agent SEC-15 "Review authentication flow for vulnerabilities"

# Performance issue
@agent PERF-17 "Investigate slow loading on meetings page"
```

## 🔄 Agent Collaboration Workflows

### Feature Development Flow
1. **TYPE-04** defines interfaces
2. **DBA-01** designs schema
3. **REPO-02** implements repository
4. **BIZ-03** creates service
5. **API-03** exposes endpoint
6. **UI-08** builds components
7. **PAGE-13** creates pages
8. **TEST-14** writes tests
9. **DOC-20** documents feature

### Bug Fix Flow
1. **TEST-14** identifies issue
2. **QUALITY-16** analyzes root cause
3. Relevant agent fixes issue
4. **TEST-14** verifies fix
5. **DOC-20** updates docs if needed

### Performance Optimization Flow
1. **PERF-17** identifies bottleneck
2. Routes to specialized agent
3. Agent implements optimization
4. **PERF-17** validates improvement
5. **TEST-14** ensures no regression

## 🎯 Agent Success Metrics

Each agent tracks:
- **Response Time**: Time to acknowledge task
- **Resolution Time**: Time to complete task
- **Quality Score**: Based on review/testing
- **Handoff Efficiency**: Smooth transitions
- **Domain Expertise**: Accuracy within domain

## 🚦 Agent Availability Status

```
🟢 Active: Ready for tasks
🟡 Busy: Processing current task
🔴 Blocked: Waiting for dependency
⚪ Idle: No tasks assigned
```

## 📊 Agent Dashboard Command

```bash
# View all agent statuses
@agent status --all

# View specific agent workload
@agent workload [Agent-ID]

# View agent dependencies
@agent deps [Agent-ID]

# View agent history
@agent history [Agent-ID]
```

## 🔐 Agent Permissions Matrix

| Agent | Read | Write | Delete | Execute |
|-------|------|-------|--------|---------|
| DBA-01 | DB | DB Schema | Migrations | SQL |
| REPO-02 | All | Repositories | - | Queries |
| API-03 | All | API Routes | - | Endpoints |
| TYPE-04 | All | Types | - | Validation |
| INFRA-05 | All | Config | - | Deploy |
| BIZ-03 | All | Services | - | Business |
| STATE-07 | All | Stores | - | State |
| UI-08 | All | Components | - | Render |
| TEST-14 | All | Tests | - | Test Run |
| SEC-15 | All | Security | - | Audit |

## 🎓 Agent Training Protocol

New agents must:
1. Review CLAUDE.md
2. Study their domain files
3. Understand handoff protocols
4. Pass domain knowledge test
5. Complete trial tasks

## 📝 Agent Log Format

```
[TIMESTAMP] [AGENT-ID] [ACTION] [STATUS] [DETAILS]
2024-01-15 10:30:45 API-03 CREATE_ENDPOINT SUCCESS /api/boards
```

---

*Last Updated: 2025-01-29*
*Version: 1.0.0*
*Total Agents: 20*
*Coverage: 100% of codebase*