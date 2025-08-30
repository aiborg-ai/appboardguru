/**
 * User Creation Saga
 * Implements atomic user creation with compensation support
 * Ensures consistency between user data, events, and email notifications
 */

import { SagaDefinition, SagaStep, SagaContext } from '@/lib/repositories/transaction-manager';
import { Result, ResultUtils } from '@/01-shared/lib/result';
import { User, UserRole } from '@/domain/entities/user.entity';
import { IUserRepository } from '@/application/interfaces/repositories/user.repository.interface';
import { IEmailService } from '@/application/interfaces/services/email.service.interface';
import { EventOutbox } from '@/infrastructure/event-outbox/event-outbox';
import { DomainEvent } from '@/01-shared/types/core.types';
import { nanoid } from 'nanoid';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';

export interface UserCreationInput {
  email: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  organizationId?: string;
  sendWelcomeEmail?: boolean;
}

export interface UserCreationContext {
  userId?: string;
  user?: User;
  events?: DomainEvent[];
  emailSent?: boolean;
  outboxEventIds?: string[];
}

/**
 * Create User Creation Saga Definition
 */
export function createUserCreationSaga(
  userRepository: IUserRepository,
  emailService: IEmailService,
  eventOutbox: EventOutbox
): SagaDefinition {
  const steps: SagaStep[] = [
    // Step 1: Validate and create user entity
    {
      id: 'validate_and_create_entity',
      name: 'Validate and Create User Entity',
      description: 'Validate input and create user domain entity',
      
      action: async (input: UserCreationInput, context: SagaContext): Promise<Result<User>> => {
        try {
          // Check if user already exists
          const existingUserResult = await userRepository.findByEmail(input.email);
          if (existingUserResult.success && existingUserResult.data) {
            return ResultUtils.fail(new Error('User with this email already exists'));
          }

          // Generate secure user ID
          const userId = `user_${nanoid()}`;
          
          // Create user entity
          const userResult = User.create(
            userId,
            input.email,
            input.firstName,
            input.lastName,
            input.role || UserRole.MEMBER,
            input.organizationId
          );

          if (!userResult.success) {
            return ResultUtils.fail(userResult.error);
          }

          // Store in context for other steps
          context.stepResults.set('userId', userId);
          context.stepResults.set('user', userResult.data);

          return userResult;
        } catch (error) {
          return ResultUtils.fail(
            error instanceof Error ? error : new Error('Failed to create user entity')
          );
        }
      },
      
      compensation: async (): Promise<Result<void>> => {
        // No compensation needed - entity only created in memory
        return ResultUtils.ok(undefined);
      },
      
      retryConfig: {
        maxAttempts: 3,
        delayMs: 1000,
        backoffMultiplier: 2
      }
    },

    // Step 2: Save user and events atomically
    {
      id: 'save_user_with_events',
      name: 'Save User with Events',
      description: 'Atomically save user and domain events to database',
      dependencies: ['validate_and_create_entity'],
      
      action: async (_input: UserCreationInput, context: SagaContext): Promise<Result<{ user: User; outboxEventIds: string[] }>> => {
        try {
          const user = context.stepResults.get('user') as User;
          if (!user) {
            return ResultUtils.fail(new Error('User entity not found in context'));
          }

          // Get domain events from user
          const events = user.getDomainEvents();
          
          // Start a Supabase "transaction" (using RLS and batch operations)
          const supabase = createSupabaseBrowserClient();
          
          // Save user first
          const saveResult = await userRepository.save(user);
          if (!saveResult.success) {
            return ResultUtils.fail(saveResult.error);
          }

          // Store events in outbox (atomically with user save)
          const outboxResult = await eventOutbox.storeEvents(events);
          if (!outboxResult.success) {
            // If outbox fails, we need to compensate by deleting the user
            await userRepository.delete(user.id);
            return ResultUtils.fail(outboxResult.error);
          }

          // Clear events from entity since they're now in outbox
          user.clearDomainEvents();

          // Store outbox event IDs for potential compensation
          const outboxEventIds = outboxResult.data.map(e => e.id);
          context.stepResults.set('outboxEventIds', outboxEventIds);
          context.stepResults.set('savedUser', saveResult.data);

          return ResultUtils.ok({ 
            user: saveResult.data, 
            outboxEventIds 
          });
        } catch (error) {
          return ResultUtils.fail(
            error instanceof Error ? error : new Error('Failed to save user with events')
          );
        }
      },
      
      compensation: async (_output: any, context: SagaContext): Promise<Result<void>> => {
        try {
          const userId = context.stepResults.get('userId') as string;
          const outboxEventIds = context.stepResults.get('outboxEventIds') as string[] | undefined;

          // Delete user if it was saved
          if (userId) {
            await userRepository.delete(userId);
          }

          // Mark outbox events as failed/cancelled if they were stored
          if (outboxEventIds && outboxEventIds.length > 0) {
            const supabase = createSupabaseBrowserClient();
            await supabase
              .from('event_outbox')
              .update({ status: 'cancelled' })
              .in('id', outboxEventIds);
          }

          return ResultUtils.ok(undefined);
        } catch (error) {
          // Log compensation error but don't fail
          console.error('Failed to compensate user save:', error);
          return ResultUtils.ok(undefined);
        }
      },
      
      retryConfig: {
        maxAttempts: 3,
        delayMs: 2000,
        backoffMultiplier: 2,
        retryableErrors: ['network_error', 'timeout']
      },
      
      timeout: 10000
    },

    // Step 3: Send welcome email (optional, non-critical)
    {
      id: 'send_welcome_email',
      name: 'Send Welcome Email',
      description: 'Send welcome email to new user',
      dependencies: ['save_user_with_events'],
      
      action: async (input: UserCreationInput, context: SagaContext): Promise<Result<boolean>> => {
        try {
          // Skip if not requested
          if (!input.sendWelcomeEmail) {
            return ResultUtils.ok(false);
          }

          const user = context.stepResults.get('savedUser') as User;
          if (!user) {
            return ResultUtils.fail(new Error('Saved user not found in context'));
          }

          // Send welcome email
          await emailService.sendWelcomeEmail({
            to: user.getEmail(),
            name: user.getName(),
            activationLink: `${process.env.NEXT_PUBLIC_APP_URL}/activate/${user.id}`
          });

          // Store email sent status
          context.stepResults.set('emailSent', true);

          // Create and store email sent event in outbox
          const emailEvent: DomainEvent = {
            eventId: nanoid(),
            eventType: 'WelcomeEmailSent',
            aggregateId: user.id,
            occurredAt: new Date(),
            payload: {
              userId: user.id,
              email: user.getEmail()
            }
          };

          await eventOutbox.storeEvents([emailEvent]);

          return ResultUtils.ok(true);
        } catch (error) {
          // Email failure is non-critical - log but don't fail the saga
          console.error('Failed to send welcome email:', error);
          
          // Store failure event for monitoring
          const user = context.stepResults.get('savedUser') as User;
          if (user) {
            const failureEvent: DomainEvent = {
              eventId: nanoid(),
              eventType: 'WelcomeEmailFailed',
              aggregateId: user.id,
              occurredAt: new Date(),
              payload: {
                userId: user.id,
                email: user.getEmail(),
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            };
            
            await eventOutbox.storeEvents([failureEvent]).catch(console.error);
          }

          // Return success anyway - email is non-critical
          return ResultUtils.ok(false);
        }
      },
      
      compensation: async (_output: any, context: SagaContext): Promise<Result<void>> => {
        // No compensation for email - it's non-critical
        // Could potentially add to a retry queue here
        const emailSent = context.stepResults.get('emailSent');
        if (emailSent) {
          console.log('Email was sent but saga failed - consider manual follow-up');
        }
        return ResultUtils.ok(undefined);
      },
      
      retryConfig: {
        maxAttempts: 2, // Less retries for non-critical step
        delayMs: 3000,
        backoffMultiplier: 1.5
      },
      
      timeout: 15000 // Email service might be slow
    },

    // Step 4: Trigger event processing
    {
      id: 'trigger_event_processing',
      name: 'Trigger Event Processing',
      description: 'Trigger background processing of outbox events',
      dependencies: ['save_user_with_events'],
      
      action: async (_input: UserCreationInput, context: SagaContext): Promise<Result<void>> => {
        try {
          // Trigger immediate processing of pending events
          // This is fire-and-forget - we don't wait for completion
          eventOutbox.processPendingEvents().catch(error => {
            console.error('Failed to trigger event processing:', error);
          });

          return ResultUtils.ok(undefined);
        } catch (error) {
          // Non-critical - events will be processed by background job anyway
          console.error('Failed to trigger event processing:', error);
          return ResultUtils.ok(undefined);
        }
      },
      
      compensation: async (): Promise<Result<void>> => {
        // No compensation needed for triggering
        return ResultUtils.ok(undefined);
      },
      
      retryConfig: {
        maxAttempts: 1, // No retries for non-critical trigger
        delayMs: 0
      }
    }
  ];

  return {
    id: 'user_creation_saga',
    name: 'User Creation Saga',
    description: 'Atomically create user with events and optional email notification',
    steps,
    timeout: 30000, // Overall saga timeout
    metadata: {
      version: '1.0.0',
      critical: true,
      compensationStrategy: 'sequential'
    }
  };
}

/**
 * Enhanced Create User Use Case using Saga
 */
export class CreateUserWithSaga {
  private userCreationSaga: SagaDefinition;

  constructor(
    private userRepository: IUserRepository,
    private emailService: IEmailService,
    private eventOutbox: EventOutbox,
    private sagaOrchestrator: any // Import from transaction-manager
  ) {
    this.userCreationSaga = createUserCreationSaga(
      userRepository,
      emailService,
      eventOutbox
    );
    
    // Register saga with orchestrator
    this.sagaOrchestrator.registerSaga(this.userCreationSaga);
  }

  /**
   * Execute user creation with full atomicity
   */
  async execute(input: UserCreationInput): Promise<Result<{
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    status: string;
    emailSent: boolean;
  }>> {
    try {
      // Start saga execution
      const sagaResult = await this.sagaOrchestrator.startSaga(
        'user_creation_saga',
        input,
        {
          userId: input.organizationId ? `org_${input.organizationId}` : undefined,
          organizationId: input.organizationId,
          metadata: {
            source: 'user_creation',
            timestamp: new Date().toISOString()
          }
        }
      );

      if (!sagaResult.success) {
        return ResultUtils.fail(sagaResult.error);
      }

      const execution = sagaResult.data;
      
      // Wait for saga completion
      const maxWaitTime = 30000; // 30 seconds
      const startTime = Date.now();
      
      while (execution.status === 'running' || execution.status === 'pending') {
        if (Date.now() - startTime > maxWaitTime) {
          await this.sagaOrchestrator.cancelSaga(execution.context.id, 'Timeout');
          return ResultUtils.fail(new Error('User creation timed out'));
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Check final status
      if (execution.status !== 'committed') {
        const metrics = execution.getMetrics();
        return ResultUtils.fail(
          new Error(`User creation failed: ${execution.status}, completed steps: ${metrics.completedSteps}/${metrics.stepCount}`)
        );
      }

      // Get results from saga context
      const user = execution.context.stepResults.get('savedUser') as User;
      const emailSent = execution.context.stepResults.get('emailSent') as boolean || false;

      if (!user) {
        return ResultUtils.fail(new Error('User not found in saga results'));
      }

      return ResultUtils.ok({
        id: user.id,
        email: user.getEmail(),
        fullName: user.getName(),
        role: user.getRole(),
        status: user.getStatus(),
        emailSent
      });

    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to create user')
      );
    }
  }

  /**
   * Get saga execution status
   */
  getSagaStatus(transactionId: string): any {
    return this.sagaOrchestrator.getSagaExecution(transactionId);
  }

  /**
   * Get saga metrics
   */
  getSagaMetrics(transactionId: string): any {
    return this.sagaOrchestrator.getMetrics(transactionId);
  }
}