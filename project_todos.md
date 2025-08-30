# Project TODOs - AppBoardGuru

## 🔴 Critical Issues (High Priority)

### 1. Transaction Atomicity - User Creation Not Atomic ⚠️
**Issue**: User creation involves multiple steps that aren't wrapped in a transaction:
- Database save happens first
- Event publishing happens second (could fail)
- Email sending happens third (could fail)
- If steps 2 or 3 fail, user exists but system state is inconsistent

**Current Code Problem** (`src/application/use-cases/user/create-user.use-case.ts:65-76`):
```typescript
// Save to repository - Step 1
const saveResult = await this.userRepository.save(user);

// Publish domain events - Step 2 (could fail after save!)
await user.publishDomainEvents();

// Send welcome email - Step 3 (could fail after save!)
if (input.sendWelcomeEmail) {
  await this.sendWelcomeEmail(user);
}
```

**Solution**: Implement Saga pattern with Event Outbox
- [ ] Create Event Outbox table for atomic event persistence
- [ ] Implement User Creation Saga with compensation
- [ ] Add `saveWithEvents` method to repository
- [ ] Use existing `SagaOrchestrator` from `transaction-manager.ts`
- [ ] Ensure all-or-nothing execution

### 2. Race Condition in Event Publishing 🏁
**Issue**: Events are cleared before publishing completes
**Location**: `src/domain/core/aggregate-root.ts:40-46`
```typescript
async publishDomainEvents(): Promise<void> {
  const events = this.getDomainEvents();
  this.clearDomainEvents(); // CLEARED BEFORE PUBLISHING!
  
  for (const event of events) {
    await eventBus.publish(event); // If this fails, events are lost!
  }
}
```

**Solution**:
- [ ] Clear events only after successful publishing
- [ ] Add try-catch with event restoration on failure
- [ ] Consider batch publishing for performance

### 3. Weak UUID Generation 🔑
**Issue**: Fallback to `Date.now()` can cause ID collisions
**Locations**: Multiple files using `crypto.randomUUID ? crypto.randomUUID() : Date.now()`

**Solution**:
- [ ] Install nanoid or uuid library
- [ ] Create centralized ID generation utility
- [ ] Replace all weak ID generation patterns
- [ ] Ensure cryptographically secure IDs

### 4. Missing Optimistic Locking 🔒
**Issue**: No version checking on updates, concurrent updates overwrite each other
**Location**: `src/infrastructure/repositories/user.repository.ts:346-367`

**Solution**:
- [ ] Add version checking in save/update operations
- [ ] Implement `WHERE version = ?` clause
- [ ] Return conflict error on version mismatch
- [ ] Add retry logic with fresh data fetch

### 5. Hardcoded Credentials 🚨
**Issue**: Fallback URLs and keys hardcoded in code
**Location**: `src/lib/supabase-client.ts:5-6,12-13`

**Solution**:
- [ ] Remove all hardcoded fallback values
- [ ] Throw error if environment variables missing
- [ ] Add environment variable validation on startup
- [ ] Document required environment variables

## 🟡 Medium Priority Issues

### 6. Sequential Event Publishing Bottleneck
**Issue**: Events published one-by-one instead of parallel
**Location**: `src/domain/core/aggregate-root.ts:44-46`

**Solution**:
- [ ] Use `Promise.allSettled()` for parallel publishing
- [ ] Handle partial failures gracefully
- [ ] Add event publishing metrics

### 7. Weak ID Generation Strategy
**Issue**: Using `Date.now()` + `Math.random()` for IDs
**Location**: `src/application/use-cases/user/create-user.use-case.ts:95-98`

**Solution**:
- [ ] Replace with nanoid or uuid v4
- [ ] Ensure all ID generation uses secure methods
- [ ] Add ID generation service

### 8. Silent Error Swallowing
**Issue**: Critical errors (like email failures) logged but not tracked
**Location**: `src/application/use-cases/user/create-user.use-case.ts:119-121`

**Solution**:
- [ ] Implement circuit breaker for email service
- [ ] Add retry queue for failed emails
- [ ] Create admin dashboard for failed operations
- [ ] Add alerting for critical failures

### 9. SQL Injection Risk in Search
**Issue**: Direct string interpolation in queries
**Location**: `src/infrastructure/repositories/user.repository.ts:293-299`

**Solution**:
- [ ] Use parameterized queries
- [ ] Add input sanitization layer
- [ ] Implement query builder with escaping
- [ ] Add SQL injection tests

### 10. Missing Error Recovery in Command Bus
**Issue**: Middleware errors can crash entire command
**Location**: `src/application/cqrs/command-bus.ts:102-113`

**Solution**:
- [ ] Add try-catch around middleware execution
- [ ] Implement fallback behavior
- [ ] Add middleware error metrics
- [ ] Create middleware health checks

## 🟢 Enhancements (Nice to Have)

### 11. Event Sourcing Implementation
- [ ] Create event store table
- [ ] Implement event replay functionality
- [ ] Add snapshot support
- [ ] Create projection rebuilding

### 12. Distributed Tracing
- [ ] Add correlation IDs to all operations
- [ ] Implement OpenTelemetry integration
- [ ] Add trace visualization
- [ ] Create performance dashboards

### 13. Rate Limiting & Throttling
- [ ] Implement API rate limiting
- [ ] Add user-based throttling
- [ ] Create rate limit headers
- [ ] Add rate limit dashboard

## 📋 Implementation Plan

### Phase 1: Critical Security & Data Integrity (Week 1)
1. **Day 1-2**: Implement Event Outbox Pattern
   - Create database tables
   - Build EventOutbox class
   - Add background processor
   
2. **Day 3-4**: Create User Creation Saga
   - Define saga steps
   - Implement compensations
   - Integrate with existing code
   
3. **Day 5**: Fix UUID Generation & Credentials
   - Install nanoid library
   - Replace all weak ID generation
   - Remove hardcoded credentials

### Phase 2: Consistency & Reliability (Week 2)
1. **Day 1-2**: Add Optimistic Locking
   - Update database schema
   - Modify repositories
   - Add version checking
   
2. **Day 3-4**: Fix Event Publishing Race Condition
   - Update AggregateRoot
   - Add error recovery
   - Implement parallel publishing
   
3. **Day 5**: Error Handling Improvements
   - Add circuit breakers
   - Implement retry queues
   - Create monitoring dashboard

### Phase 3: Testing & Documentation (Week 3)
1. **Day 1-2**: Comprehensive Testing
   - Unit tests for transactions
   - Integration tests for sagas
   - E2E tests for user flows
   
2. **Day 3-4**: Performance Testing
   - Load testing for concurrent updates
   - Stress testing for event processing
   - Benchmark transaction throughput
   
3. **Day 5**: Documentation
   - Update architecture docs
   - Create runbooks
   - Document monitoring procedures

## 📊 Success Metrics

- **Zero** data inconsistency incidents
- **100%** atomic transaction success rate
- **< 1%** event publishing failure rate
- **< 100ms** average transaction time
- **Zero** security vulnerabilities in OWASP Top 10

## 🔗 Related Files

- Architecture: `ARCHITECTURE.md`
- Migration Guide: `MIGRATION_GUIDE.md`
- Test Report: `tests/TEST_REPORT.md`
- Transaction Manager: `src/lib/repositories/transaction-manager.ts`
- Event Bus: `src/01-shared/lib/event-bus.ts`
- User Use Case: `src/application/use-cases/user/create-user.use-case.ts`

## 📝 Notes

- All changes must maintain backward compatibility
- Consider feature flags for gradual rollout
- Monitor performance impact of transaction overhead
- Document all breaking changes in CHANGELOG
- Ensure proper database backups before migrations

---

*Last Updated: August 30, 2025*
*Priority: CRITICAL - Data consistency issues must be resolved immediately*