/**
 * Type-Safe Event System Tests
 * Tests for strongly-typed event emitter and domain events
 */

import {
  TypedEventEmitter,
  InMemoryEventStore,
  globalEventEmitter,
  emitDomainEvent,
  onDomainEvent,
  onceDomainEvent,
  EventHandler,
  registerEventHandlers,
  type EventRegistry,
  type DomainEvent,
  type EventType,
  type UserCreatedEvent,
  type OrganizationCreatedEvent,
  type VaultCreatedEvent,
  type AssetUploadedEvent,
  type EventSubscription,
  type EventFilter
} from '../events'

import { 
  createUserId, 
  createOrganizationId, 
  createVaultId, 
  createAssetId,
  unsafeCreateUserId,
  unsafeCreateOrganizationId,
  unsafeCreateVaultId,
  unsafeCreateAssetId
} from '../branded'

describe('Type-Safe Event System', () => {
  let eventEmitter: TypedEventEmitter
  let eventStore: InMemoryEventStore
  const validUUID = '123e4567-e89b-12d3-a456-426614174000'
  const validUUID2 = '223e4567-e89b-12d3-a456-426614174001'

  beforeEach(() => {
    eventEmitter = new TypedEventEmitter()
    eventStore = new InMemoryEventStore()
  })

  describe('TypedEventEmitter', () => {
    describe('Basic Event Handling', () => {
      it('should emit and handle typed events', async () => {
        const userIdResult = createUserId(validUUID)
        expect(userIdResult.success).toBe(true)

        if (userIdResult.success && userIdResult.data) {
          let receivedEvent: UserCreatedEvent | null = null

          // Subscribe to user.created events
          eventEmitter.on('user.created', (event) => {
            receivedEvent = event
          })

          // Emit the event
          const result = await eventEmitter.emit('user.created', {
            source: 'user',
            userId: userIdResult.data,
            data: {
              email: 'test@example.com',
              fullName: 'Test User',
              role: 'member'
            }
          })

          expect(result.success).toBe(true)
          expect(receivedEvent).not.toBeNull()
          expect(receivedEvent?.type).toBe('user.created')
          expect(receivedEvent?.userId).toBe(userIdResult.data)
          expect(receivedEvent?.data.email).toBe('test@example.com')
        }
      })

      it('should handle multiple subscribers', async () => {
        const userIdResult = createUserId(validUUID)
        expect(userIdResult.success).toBe(true)

        if (userIdResult.success && userIdResult.data) {
          const receivedEvents: UserCreatedEvent[] = []

          // Subscribe multiple handlers
          eventEmitter.on('user.created', (event) => {
            receivedEvents.push(event)
          })

          eventEmitter.on('user.created', (event) => {
            receivedEvents.push(event)
          })

          // Emit the event
          await eventEmitter.emit('user.created', {
            source: 'user',
            userId: userIdResult.data,
            data: {
              email: 'test@example.com',
              fullName: 'Test User',
              role: 'member'
            }
          })

          expect(receivedEvents).toHaveLength(2)
        }
      })

      it('should validate event structure', async () => {
        const result = await eventEmitter.emit('user.created', {
          source: 'user',
          userId: 'invalid-user-id' as any, // Invalid branded type
          data: {
            email: 'test@example.com',
            fullName: 'Test User',
            role: 'member'
          }
        })

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.message).toContain('Invalid userId')
        }
      })
    })

    describe('Event Subscriptions', () => {
      it('should allow unsubscribing', async () => {
        const userIdResult = createUserId(validUUID)
        expect(userIdResult.success).toBe(true)

        if (userIdResult.success && userIdResult.data) {
          let callCount = 0

          const subscription = eventEmitter.on('user.created', () => {
            callCount++
          })

          // Emit first time
          await eventEmitter.emit('user.created', {
            source: 'user',
            userId: userIdResult.data,
            data: {
              email: 'test@example.com',
              fullName: 'Test User',
              role: 'member'
            }
          })

          expect(callCount).toBe(1)

          // Unsubscribe
          subscription.unsubscribe()

          // Emit again
          await eventEmitter.emit('user.created', {
            source: 'user',
            userId: userIdResult.data,
            data: {
              email: 'test@example.com',
              fullName: 'Test User',
              role: 'member'
            }
          })

          expect(callCount).toBe(1) // Should still be 1
        }
      })

      it('should handle once subscription', async () => {
        const userIdResult = createUserId(validUUID)
        expect(userIdResult.success).toBe(true)

        if (userIdResult.success && userIdResult.data) {
          let callCount = 0

          eventEmitter.once('user.created', () => {
            callCount++
          })

          // Emit twice
          await eventEmitter.emit('user.created', {
            source: 'user',
            userId: userIdResult.data,
            data: { email: 'test@example.com', fullName: 'Test User', role: 'member' }
          })

          await eventEmitter.emit('user.created', {
            source: 'user',
            userId: userIdResult.data,
            data: { email: 'test@example.com', fullName: 'Test User', role: 'member' }
          })

          expect(callCount).toBe(1)
        }
      })

      it('should handle filtered subscriptions', async () => {
        const userId1Result = createUserId(validUUID)
        const userId2Result = createUserId(validUUID2)
        expect(userId1Result.success && userId2Result.success).toBe(true)

        if (userId1Result.success && userId2Result.success && userId1Result.data && userId2Result.data) {
          let filteredCallCount = 0

          // Subscribe with filter for specific user
          eventEmitter.onFiltered(
            'user.created',
            (event) => event.userId === userId1Result.data,
            () => { filteredCallCount++ }
          )

          // Emit for user 1
          await eventEmitter.emit('user.created', {
            source: 'user',
            userId: userId1Result.data,
            data: { email: 'user1@example.com', fullName: 'User 1', role: 'member' }
          })

          // Emit for user 2
          await eventEmitter.emit('user.created', {
            source: 'user',
            userId: userId2Result.data,
            data: { email: 'user2@example.com', fullName: 'User 2', role: 'member' }
          })

          expect(filteredCallCount).toBe(1) // Only user 1 event should be handled
        }
      })
    })

    describe('Event Middleware', () => {
      it('should process events through middleware', async () => {
        const userIdResult = createUserId(validUUID)
        expect(userIdResult.success).toBe(true)

        if (userIdResult.success && userIdResult.data) {
          const middlewareCalls: string[] = []

          // Add middleware
          eventEmitter.use(async (event, next) => {
            middlewareCalls.push('middleware1-before')
            await next()
            middlewareCalls.push('middleware1-after')
          })

          eventEmitter.use(async (event, next) => {
            middlewareCalls.push('middleware2-before')
            await next()
            middlewareCalls.push('middleware2-after')
          })

          let handlerCalled = false
          eventEmitter.on('user.created', () => {
            handlerCalled = true
          })

          await eventEmitter.emit('user.created', {
            source: 'user',
            userId: userIdResult.data,
            data: { email: 'test@example.com', fullName: 'Test User', role: 'member' }
          })

          expect(handlerCalled).toBe(true)
          expect(middlewareCalls).toEqual([
            'middleware1-before',
            'middleware2-before',
            'middleware2-after',
            'middleware1-after'
          ])
        }
      })
    })

    describe('Global Filters', () => {
      it('should apply global filters', async () => {
        const userIdResult = createUserId(validUUID)
        const orgIdResult = createOrganizationId(validUUID2)
        expect(userIdResult.success && orgIdResult.success).toBe(true)

        if (userIdResult.success && orgIdResult.success && userIdResult.data && orgIdResult.data) {
          let userEventCount = 0
          let orgEventCount = 0

          // Add filter to only allow user events
          eventEmitter.filter({ source: 'user' })

          eventEmitter.on('user.created', () => { userEventCount++ })
          eventEmitter.on('organization.created', () => { orgEventCount++ })

          // Emit user event (should pass filter)
          await eventEmitter.emit('user.created', {
            source: 'user',
            userId: userIdResult.data,
            data: { email: 'test@example.com', fullName: 'Test User', role: 'member' }
          })

          // Emit org event (should be filtered out)
          await eventEmitter.emit('organization.created', {
            source: 'organization',
            organizationId: orgIdResult.data,
            data: { name: 'Test Org', slug: 'test-org', ownerId: userIdResult.data }
          })

          expect(userEventCount).toBe(1)
          expect(orgEventCount).toBe(0)
        }
      })
    })

    describe('Synchronous Emission', () => {
      it('should emit events synchronously', () => {
        const userIdResult = createUserId(validUUID)
        expect(userIdResult.success).toBe(true)

        if (userIdResult.success && userIdResult.data) {
          let receivedEvent: UserCreatedEvent | null = null

          eventEmitter.on('user.created', (event) => {
            receivedEvent = event
          })

          const result = eventEmitter.emitSync('user.created', {
            source: 'user',
            userId: userIdResult.data,
            data: { email: 'test@example.com', fullName: 'Test User', role: 'member' }
          })

          expect(result.success).toBe(true)
          expect(receivedEvent).not.toBeNull()
          expect(receivedEvent?.type).toBe('user.created')
        }
      })
    })
  })

  describe('InMemoryEventStore', () => {
    it('should store and retrieve events', async () => {
      const userIdResult = createUserId(validUUID)
      expect(userIdResult.success).toBe(true)

      if (userIdResult.success && userIdResult.data) {
        const event: UserCreatedEvent = {
          type: 'user.created',
          id: 'event-1',
          timestamp: new Date(),
          source: 'user',
          version: 1,
          userId: userIdResult.data,
          data: { email: 'test@example.com', fullName: 'Test User', role: 'member' }
        }

        // Store event
        const appendResult = await eventStore.append([event])
        expect(appendResult.success).toBe(true)

        // Retrieve events
        const streamId = `user-${userIdResult.data}`
        const eventsResult = await eventStore.getEvents(streamId)
        expect(eventsResult.success).toBe(true)

        if (eventsResult.success) {
          expect(eventsResult.data).toHaveLength(1)
          expect(eventsResult.data[0].type).toBe('user.created')
        }
      }
    })

    it('should retrieve all events', async () => {
      const userIdResult = createUserId(validUUID)
      const orgIdResult = createOrganizationId(validUUID2)
      expect(userIdResult.success && orgIdResult.success).toBe(true)

      if (userIdResult.success && orgIdResult.success && userIdResult.data && orgIdResult.data) {
        const events: DomainEvent[] = [
          {
            type: 'user.created',
            id: 'event-1',
            timestamp: new Date('2023-01-01'),
            source: 'user',
            version: 1,
            userId: userIdResult.data,
            data: { email: 'test@example.com', fullName: 'Test User', role: 'member' }
          },
          {
            type: 'organization.created',
            id: 'event-2',
            timestamp: new Date('2023-01-02'),
            source: 'organization',
            version: 1,
            organizationId: orgIdResult.data,
            data: { name: 'Test Org', slug: 'test-org', ownerId: userIdResult.data }
          }
        ]

        await eventStore.append(events)

        const allEventsResult = await eventStore.getAllEvents()
        expect(allEventsResult.success).toBe(true)

        if (allEventsResult.success) {
          expect(allEventsResult.data).toHaveLength(2)
          // Should be sorted by timestamp
          expect(allEventsResult.data[0].type).toBe('user.created')
          expect(allEventsResult.data[1].type).toBe('organization.created')
        }
      }
    })
  })

  describe('Global Event Functions', () => {
    it('should use global event emitter', async () => {
      const userIdResult = createUserId(validUUID)
      expect(userIdResult.success).toBe(true)

      if (userIdResult.success && userIdResult.data) {
        let receivedEvent: UserCreatedEvent | null = null

        const subscription = onDomainEvent('user.created', (event) => {
          receivedEvent = event
        })

        const result = await emitDomainEvent('user.created', {
          source: 'user',
          userId: userIdResult.data,
          data: { email: 'test@example.com', fullName: 'Test User', role: 'member' }
        })

        expect(result.success).toBe(true)
        expect(receivedEvent).not.toBeNull()

        subscription.unsubscribe()
      }
    })

    it('should handle once subscriptions', async () => {
      const userIdResult = createUserId(validUUID)
      expect(userIdResult.success).toBe(true)

      if (userIdResult.success && userIdResult.data) {
        let callCount = 0

        onceDomainEvent('user.created', () => {
          callCount++
        })

        // Emit twice
        await emitDomainEvent('user.created', {
          source: 'user',
          userId: userIdResult.data,
          data: { email: 'test1@example.com', fullName: 'Test User 1', role: 'member' }
        })

        await emitDomainEvent('user.created', {
          source: 'user',
          userId: userIdResult.data,
          data: { email: 'test2@example.com', fullName: 'Test User 2', role: 'member' }
        })

        expect(callCount).toBe(1)
      }
    })
  })

  describe('Event Handler Decorators', () => {
    it('should register event handlers using decorators', async () => {
      const userIdResult = createUserId(validUUID)
      expect(userIdResult.success).toBe(true)

      if (userIdResult.success && userIdResult.data) {
        class TestEventHandler {
          public receivedEvents: DomainEvent[] = []

          @EventHandler('user.created')
          handleUserCreated(event: UserCreatedEvent) {
            this.receivedEvents.push(event)
          }

          @EventHandler('organization.created')
          handleOrgCreated(event: OrganizationCreatedEvent) {
            this.receivedEvents.push(event)
          }
        }

        const handler = new TestEventHandler()
        const subscriptions = registerEventHandlers(handler)

        expect(subscriptions).toHaveLength(2)

        // Emit events
        await emitDomainEvent('user.created', {
          source: 'user',
          userId: userIdResult.data,
          data: { email: 'test@example.com', fullName: 'Test User', role: 'member' }
        })

        expect(handler.receivedEvents).toHaveLength(1)
        expect(handler.receivedEvents[0].type).toBe('user.created')

        // Cleanup
        subscriptions.forEach(sub => sub.unsubscribe())
      }
    })
  })

  describe('Complex Event Scenarios', () => {
    it('should handle cascading events', async () => {
      const userIdResult = createUserId(validUUID)
      const orgIdResult = createOrganizationId(validUUID2)
      expect(userIdResult.success && orgIdResult.success).toBe(true)

      if (userIdResult.success && orgIdResult.success && userIdResult.data && orgIdResult.data) {
        const eventLog: string[] = []

        // When organization is created, automatically create a default vault
        eventEmitter.on('organization.created', async (orgEvent) => {
          eventLog.push('Organization created')
          
          const vaultIdResult = createVaultId(validUUID)
          if (vaultIdResult.success && vaultIdResult.data) {
            await eventEmitter.emit('vault.created', {
              source: 'vault',
              vaultId: vaultIdResult.data,
              organizationId: orgEvent.organizationId,
              data: { name: 'Default Vault', visibility: 'private' }
            })
          }
        })

        eventEmitter.on('vault.created', (vaultEvent) => {
          eventLog.push('Vault created')
        })

        // Trigger the cascade
        await eventEmitter.emit('organization.created', {
          source: 'organization',
          organizationId: orgIdResult.data,
          data: { name: 'Test Org', slug: 'test-org', ownerId: userIdResult.data }
        })

        // Wait a bit for async events
        await new Promise(resolve => setTimeout(resolve, 10))

        expect(eventLog).toEqual(['Organization created', 'Vault created'])
      }
    })

    it('should handle error recovery in event handlers', async () => {
      const userIdResult = createUserId(validUUID)
      expect(userIdResult.success).toBe(true)

      if (userIdResult.success && userIdResult.data) {
        let successfulHandlerCalled = false
        let failingHandlerCalled = false

        // Handler that throws
        eventEmitter.on('user.created', () => {
          failingHandlerCalled = true
          throw new Error('Handler error')
        })

        // Handler that should still work
        eventEmitter.on('user.created', () => {
          successfulHandlerCalled = true
        })

        const result = await eventEmitter.emit('user.created', {
          source: 'user',
          userId: userIdResult.data,
          data: { email: 'test@example.com', fullName: 'Test User', role: 'member' }
        })

        // Event emission should succeed despite handler error
        expect(result.success).toBe(true)
        expect(failingHandlerCalled).toBe(true)
        expect(successfulHandlerCalled).toBe(true)
      }
    })
  })

  describe('Type Safety Tests', () => {
    it('should enforce correct event data structure', async () => {
      const userIdResult = createUserId(validUUID)
      expect(userIdResult.success).toBe(true)

      if (userIdResult.success && userIdResult.data) {
        // TypeScript should enforce these at compile time
        
        // This should work
        const validEventData: Parameters<typeof eventEmitter.emit<'user.created'>>[1] = {
          source: 'user',
          userId: userIdResult.data,
          data: {
            email: 'test@example.com',
            fullName: 'Test User',
            role: 'member'
          }
        }

        const result = await eventEmitter.emit('user.created', validEventData)
        expect(result.success).toBe(true)
      }
    })

    it('should provide type-safe event handlers', () => {
      // TypeScript should infer the correct event type
      const subscription = eventEmitter.on('user.created', (event) => {
        // These should be typed correctly
        expect(typeof event.userId).toBe('string')
        expect(typeof event.data.email).toBe('string')
        expect(typeof event.data.fullName).toBe('string')
        expect(typeof event.data.role).toBe('string')
      })

      subscription.unsubscribe()
    })
  })
})