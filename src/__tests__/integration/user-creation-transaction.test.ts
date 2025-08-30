/**
 * User Creation Transaction Tests
 * Tests atomic user creation with event outbox and saga pattern
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CreateUserWithSaga } from '@/application/sagas/user-creation.saga';
import { EnhancedUserRepository } from '@/infrastructure/repositories/user.repository.enhanced';
import { EventOutbox } from '@/infrastructure/event-outbox/event-outbox';
import { SagaOrchestrator } from '@/lib/repositories/transaction-manager';
import { User, UserRole, UserStatus } from '@/domain/entities/user.entity';
import { IdGenerator } from '@/01-shared/lib/id-generator';
import { eventBus } from '@/01-shared/lib/event-bus';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';

// Mock Supabase client
jest.mock('@/lib/supabase-client');

// Mock email service
const mockEmailService = {
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined)
};

describe('User Creation Transaction Tests', () => {
  let userRepository: EnhancedUserRepository;
  let eventOutbox: EventOutbox;
  let sagaOrchestrator: SagaOrchestrator;
  let createUserWithSaga: CreateUserWithSaga;
  let mockSupabase: any;

  beforeEach(() => {
    // Setup mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis()
    };

    (createSupabaseBrowserClient as jest.Mock).mockReturnValue(mockSupabase);

    // Initialize components
    eventOutbox = new EventOutbox(mockSupabase);
    userRepository = new EnhancedUserRepository(eventOutbox);
    sagaOrchestrator = new SagaOrchestrator(mockSupabase);
    
    createUserWithSaga = new CreateUserWithSaga(
      userRepository,
      mockEmailService,
      eventOutbox,
      sagaOrchestrator
    );

    // Clear event bus subscriptions
    (eventBus as any).handlers.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Atomic User Creation', () => {
    it('should create user atomically with events in outbox', async () => {
      const userInput = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.MEMBER,
        sendWelcomeEmail: true
      };

      // Mock successful user save
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'usr_test123',
          email: userInput.email,
          first_name: userInput.firstName,
          last_name: userInput.lastName,
          role: userInput.role,
          status: UserStatus.PENDING,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });

      // Mock event outbox storage
      mockSupabase.select.mockResolvedValueOnce({
        data: [{
          id: 'evt_123',
          event_id: 'evt_456',
          event_type: 'UserCreated',
          aggregate_id: 'usr_test123',
          status: 'pending',
          attempts: 0
        }]
      });

      const result = await createUserWithSaga.execute(userInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe(userInput.email);
        expect(result.data.emailSent).toBe(true);
      }

      // Verify user was saved
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.upsert).toHaveBeenCalled();

      // Verify events were stored in outbox
      expect(mockSupabase.from).toHaveBeenCalledWith('event_outbox');
      expect(mockSupabase.insert).toHaveBeenCalled();

      // Verify email was sent
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalled();
    });

    it('should rollback user creation if event storage fails', async () => {
      const userInput = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };

      // Mock successful user save
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'usr_test123',
          email: userInput.email,
          first_name: userInput.firstName,
          last_name: userInput.lastName,
          status: UserStatus.PENDING,
          version: 1
        }
      });

      // Mock event outbox storage failure
      mockSupabase.insert.mockRejectedValueOnce(new Error('Outbox storage failed'));

      // Mock user deletion for rollback
      mockSupabase.delete.mockResolvedValueOnce({ error: null });

      const result = await createUserWithSaga.execute(userInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Outbox storage failed');
      }

      // Verify rollback was attempted
      expect(mockSupabase.delete).toHaveBeenCalled();
    });

    it('should handle email failure gracefully without failing the transaction', async () => {
      const userInput = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        sendWelcomeEmail: true
      };

      // Mock successful user save
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'usr_test123',
          email: userInput.email,
          first_name: userInput.firstName,
          last_name: userInput.lastName,
          status: UserStatus.PENDING,
          version: 1
        }
      });

      // Mock successful event storage
      mockSupabase.select.mockResolvedValueOnce({
        data: [{ id: 'evt_123' }]
      });

      // Mock email service failure
      mockEmailService.sendWelcomeEmail.mockRejectedValueOnce(
        new Error('Email service unavailable')
      );

      const result = await createUserWithSaga.execute(userInput);

      // Transaction should still succeed despite email failure
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.emailSent).toBe(false);
      }
    });
  });

  describe('Optimistic Locking', () => {
    it('should detect version conflicts and retry', async () => {
      const user = User.create(
        'usr_test123',
        'test@example.com',
        'John',
        'Doe'
      );

      if (!user.success) {
        throw new Error('Failed to create test user');
      }

      // Mock version conflict on first attempt
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { version: 2 } // Current version is 2
        })
        .mockResolvedValueOnce({
          data: { version: 2 } // Fresh fetch shows version 2
        })
        .mockResolvedValueOnce({
          data: {
            id: 'usr_test123',
            version: 3, // Successfully saved with version 3
            email: 'test@example.com'
          }
        });

      const result = await userRepository.saveWithEvents(user.data, {
        checkVersion: true,
        retryOnConflict: true,
        maxRetries: 3
      });

      expect(result.success).toBe(true);
      
      // Should have fetched version twice (initial check + retry)
      expect(mockSupabase.select).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries on persistent version conflicts', async () => {
      const user = User.create(
        'usr_test123',
        'test@example.com',
        'John',
        'Doe'
      );

      if (!user.success) {
        throw new Error('Failed to create test user');
      }

      // Mock persistent version conflicts
      mockSupabase.single.mockResolvedValue({
        data: { version: 99 } // Always return a different version
      });

      const result = await userRepository.saveWithEvents(user.data, {
        checkVersion: true,
        retryOnConflict: true,
        maxRetries: 2
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Version conflict');
      }
    });
  });

  describe('Event Outbox Processing', () => {
    it('should process pending events from outbox', async () => {
      // Mock pending events
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          {
            id: 'evt_1',
            event_id: 'evt_123',
            event_type: 'UserCreated',
            aggregate_id: 'usr_123',
            payload: { userId: 'usr_123' },
            status: 'pending',
            attempts: 0,
            created_at: new Date().toISOString()
          }
        ]
      });

      // Mock status update
      mockSupabase.update.mockResolvedValueOnce({ error: null });

      // Subscribe to event bus to verify publishing
      const receivedEvents: any[] = [];
      eventBus.subscribe('UserCreated', (event) => {
        receivedEvents.push(event);
      });

      const result = await eventOutbox.processPendingEvents();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(1); // One event processed
      }

      // Verify event was published
      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].eventType).toBe('UserCreated');

      // Verify status was updated
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'published'
        })
      );
    });

    it('should retry failed events with exponential backoff', async () => {
      // Mock failed event
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          {
            id: 'evt_1',
            event_id: 'evt_123',
            event_type: 'UserCreated',
            aggregate_id: 'usr_123',
            status: 'failed',
            attempts: 2,
            max_attempts: 5
          }
        ]
      });

      // Mock event bus failure then success
      let callCount = 0;
      jest.spyOn(eventBus, 'publish').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Temporary failure');
        }
      });

      const result = await eventOutbox.processPendingEvents();

      // Event should be marked as failed but with incremented attempts
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: expect.stringMatching(/failed|dead_letter/),
          attempts: expect.any(Number)
        })
      );
    });

    it('should move events to dead letter after max attempts', async () => {
      // Mock event at max attempts
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          {
            id: 'evt_1',
            event_id: 'evt_123',
            event_type: 'UserCreated',
            aggregate_id: 'usr_123',
            status: 'failed',
            attempts: 4,
            max_attempts: 5
          }
        ]
      });

      // Mock publishing failure
      jest.spyOn(eventBus, 'publish').mockRejectedValueOnce(
        new Error('Permanent failure')
      );

      await eventOutbox.processPendingEvents();

      // Should mark as dead letter
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'dead_letter'
        })
      );
    });
  });

  describe('ID Generation', () => {
    it('should generate secure unique IDs', () => {
      const ids = new Set<string>();
      
      // Generate many IDs to test uniqueness
      for (let i = 0; i < 1000; i++) {
        const id = IdGenerator.generate('usr');
        expect(id).toMatch(/^usr_[A-Za-z0-9]{21}$/);
        expect(ids.has(id)).toBe(false);
        ids.add(id);
      }
    });

    it('should generate appropriate IDs for different entity types', () => {
      const userId = IdGenerator.forEntity('user');
      expect(userId).toMatch(/^usr_/);

      const boardId = IdGenerator.forEntity('board');
      expect(boardId).toMatch(/^brd_/);

      const eventId = IdGenerator.forEntity('event');
      expect(eventId).toMatch(/^evt_/);

      const transactionId = IdGenerator.forEntity('transaction');
      expect(transactionId).toMatch(/^txn_/);
    });

    it('should validate ID formats correctly', () => {
      const validId = 'usr_abc123XYZ';
      expect(IdGenerator.isValid(validId, 'usr')).toBe(true);

      const invalidId = 'usr_abc!@#';
      expect(IdGenerator.isValid(invalidId, 'usr')).toBe(false);

      const wrongPrefix = 'brd_abc123';
      expect(IdGenerator.isValid(wrongPrefix, 'usr')).toBe(false);
    });
  });

  describe('Saga Compensation', () => {
    it('should compensate completed steps on failure', async () => {
      const userInput = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };

      // Mock user creation success
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'usr_test123',
          email: userInput.email
        }
      });

      // Mock deliberate failure in later step
      mockSupabase.insert.mockRejectedValueOnce(
        new Error('Deliberate failure for testing compensation')
      );

      // Track compensation calls
      const compensationCalls: string[] = [];
      jest.spyOn(console, 'log').mockImplementation((message) => {
        if (message.includes('compensation')) {
          compensationCalls.push(message);
        }
      });

      const result = await createUserWithSaga.execute(userInput);

      expect(result.success).toBe(false);
      
      // Verify compensation was triggered
      expect(mockSupabase.delete).toHaveBeenCalled(); // User deletion
    });
  });
});

describe('Event Publishing Race Condition Fix', () => {
  it('should only clear events after successful publishing', async () => {
    const user = User.create(
      'usr_test123',
      'test@example.com',
      'John',
      'Doe'
    );

    if (!user.success) {
      throw new Error('Failed to create test user');
    }

    const testUser = user.data;
    
    // Add test event
    (testUser as any).addDomainEvent('TestEvent', { test: true });
    
    // Mock event bus to fail
    jest.spyOn(eventBus, 'publish').mockRejectedValueOnce(
      new Error('Publishing failed')
    );

    // Attempt to publish events
    await expect(testUser.publishDomainEvents()).rejects.toThrow('Publishing failed');

    // Events should NOT be cleared after failure
    expect(testUser.getDomainEvents()).toHaveLength(1);
  });

  it('should clear events after successful publishing', async () => {
    const user = User.create(
      'usr_test123',
      'test@example.com',
      'John',
      'Doe'
    );

    if (!user.success) {
      throw new Error('Failed to create test user');
    }

    const testUser = user.data;
    
    // Add test event
    (testUser as any).addDomainEvent('TestEvent', { test: true });
    
    // Mock successful publishing
    jest.spyOn(eventBus, 'publish').mockResolvedValueOnce(undefined);

    // Publish events
    await testUser.publishDomainEvents();

    // Events should be cleared after success
    expect(testUser.getDomainEvents()).toHaveLength(0);
  });
});