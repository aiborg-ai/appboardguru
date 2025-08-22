/**
 * @jest-environment node
 */
import { TransactionCoordinator } from '@/lib/repositories/transaction-coordinator'
import { TransactionUtils } from '@/lib/repositories/transaction-manager'
import { RepositoryError, success, failure } from '@/lib/repositories/result'
import { createSupabaseAdminClient } from '@/config/database.config'
import { testDb } from '../utils/test-database'
import { UserFactory, OrganizationFactory, VaultFactory, AssetFactory } from '../factories'

// Mock Supabase client for transaction testing
jest.mock('@/config/database.config')

describe('Transaction System Tests', () => {
  let transactionCoordinator: TransactionCoordinator
  let mockSupabase: any
  let testUser: any
  let testOrganization: any

  beforeAll(async () => {
    await testDb.setup()
    
    testUser = await testDb.createUser({
      email: 'test@example.com',
      role: 'director',
    })
    
    testOrganization = await testDb.createOrganization({
      created_by: testUser.id,
      name: 'Test Organization',
    })
  })

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      rpc: jest.fn(),
    }
    
    ;(createSupabaseAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    transactionCoordinator = new TransactionCoordinator(mockSupabase)
  })

  afterAll(async () => {
    await testDb.cleanup()
  })

  describe('Single Domain Transactions', () => {
    it('should execute simple transaction successfully', async () => {
      const operations = [
        async () => {
          mockSupabase.single.mockResolvedValueOnce({ data: { id: 'user1' }, error: null })
          return success({ id: 'user1', name: 'Test User' })
        },
        async () => {
          mockSupabase.single.mockResolvedValueOnce({ data: { id: 'vault1' }, error: null })
          return success({ id: 'vault1', name: 'Test Vault' })
        }
      ]

      mockSupabase.rpc.mockResolvedValue({ data: 'tx_123', error: null })

      const result = await transactionCoordinator.executeTransaction(operations, {
        mode: 'SINGLE_DOMAIN',
        timeout: 30000,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
        expect(result.data[0]).toEqual({ id: 'user1', name: 'Test User' })
        expect(result.data[1]).toEqual({ id: 'vault1', name: 'Test Vault' })
      }
    })

    it('should rollback transaction on operation failure', async () => {
      const operations = [
        async () => success({ id: 'user1', name: 'Test User' }),
        async () => failure(RepositoryError.validation('Invalid data')),
        async () => success({ id: 'vault1', name: 'Test Vault' })
      ]

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: 'tx_123', error: null }) // begin
        .mockResolvedValueOnce({ data: 'rolled_back', error: null }) // rollback

      const result = await transactionCoordinator.executeTransaction(operations, {
        mode: 'SINGLE_DOMAIN',
      })

      expect(result.success).toBe(false)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('rollback_transaction', { transaction_id: 'tx_123' })
    })

    it('should handle timeout scenarios', async () => {
      const slowOperations = [
        async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return success({ id: 'user1' })
        },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 200))
          return success({ id: 'vault1' })
        }
      ]

      mockSupabase.rpc.mockResolvedValue({ data: 'tx_123', error: null })

      const result = await transactionCoordinator.executeTransaction(slowOperations, {
        mode: 'SINGLE_DOMAIN',
        timeout: 50, // Very short timeout
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('TIMEOUT')
      }
    })
  })

  describe('Cross-Domain Transactions', () => {
    it('should coordinate transactions across multiple domains', async () => {
      const userOperation = async () => {
        mockSupabase.single.mockResolvedValueOnce({ data: { id: 'user1' }, error: null })
        return success({ id: 'user1', email: 'test@example.com' })
      }

      const organizationOperation = async () => {
        mockSupabase.single.mockResolvedValueOnce({ data: { id: 'org1' }, error: null })
        return success({ id: 'org1', name: 'Test Org' })
      }

      const vaultOperation = async () => {
        mockSupabase.single.mockResolvedValueOnce({ data: { id: 'vault1' }, error: null })
        return success({ id: 'vault1', organization_id: 'org1' })
      }

      mockSupabase.rpc.mockResolvedValue({ data: 'tx_cross_123', error: null })

      const result = await transactionCoordinator.executeCrossDomainTransaction([
        { domain: 'users', operation: userOperation },
        { domain: 'organizations', operation: organizationOperation },
        { domain: 'vaults', operation: vaultOperation },
      ], {
        coordinationType: 'TWO_PHASE_COMMIT',
        timeout: 60000,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(3)
      }
    })

    it('should handle partial failures in cross-domain transactions', async () => {
      const operations = [
        {
          domain: 'users',
          operation: async () => success({ id: 'user1' }),
        },
        {
          domain: 'organizations',
          operation: async () => failure(RepositoryError.database('Org creation failed')),
        },
        {
          domain: 'vaults',
          operation: async () => success({ id: 'vault1' }),
        },
      ]

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: 'tx_123', error: null }) // begin
        .mockResolvedValueOnce({ data: 'prepared', error: null }) // prepare users
        .mockResolvedValueOnce({ data: 'failed', error: null }) // prepare orgs (fails)
        .mockResolvedValueOnce({ data: 'aborted', error: null }) // abort all

      const result = await transactionCoordinator.executeCrossDomainTransaction(operations, {
        coordinationType: 'TWO_PHASE_COMMIT',
      })

      expect(result.success).toBe(false)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('abort_transaction', expect.any(Object))
    })
  })

  describe('Saga Pattern Transactions', () => {
    it('should execute saga with compensation', async () => {
      let userCreated = false
      let orgCreated = false
      let vaultCreated = false

      const sagaSteps = [
        {
          execute: async () => {
            userCreated = true
            return success({ id: 'user1', email: 'test@example.com' })
          },
          compensate: async () => {
            userCreated = false
            return success(undefined)
          },
          description: 'Create user',
        },
        {
          execute: async () => {
            orgCreated = true
            return success({ id: 'org1', name: 'Test Org' })
          },
          compensate: async () => {
            orgCreated = false
            return success(undefined)
          },
          description: 'Create organization',
        },
        {
          execute: async () => {
            // This step fails, triggering compensation
            vaultCreated = true
            return failure(RepositoryError.validation('Vault creation failed'))
          },
          compensate: async () => {
            vaultCreated = false
            return success(undefined)
          },
          description: 'Create vault',
        },
      ]

      const result = await transactionCoordinator.executeSaga(sagaSteps)

      expect(result.success).toBe(false)
      // Compensation should have been executed
      expect(userCreated).toBe(false) // Compensated
      expect(orgCreated).toBe(false) // Compensated
      expect(vaultCreated).toBe(false) // Failed and compensated
    })

    it('should handle compensation failures gracefully', async () => {
      const sagaSteps = [
        {
          execute: async () => success({ id: 'user1' }),
          compensate: async () => failure(RepositoryError.internal('Compensation failed')),
          description: 'Create user',
        },
        {
          execute: async () => failure(RepositoryError.validation('Org creation failed')),
          compensate: async () => success(undefined),
          description: 'Create organization',
        },
      ]

      const result = await transactionCoordinator.executeSaga(sagaSteps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('compensation failures')
      }
    })
  })

  describe('Optimistic Locking', () => {
    it('should handle optimistic lock success', async () => {
      const entity = { id: 'asset1', version: 1, name: 'Test Asset' }
      
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: 'tx_123', error: null }) // begin
        .mockResolvedValueOnce({ data: { lock_id: 'lock_123' }, error: null }) // acquire lock
        .mockResolvedValueOnce({ data: 'committed', error: null }) // commit

      const updateOperation = async (lock: any) => {
        expect(lock.lock_id).toBe('lock_123')
        return success({ ...entity, version: 2, name: 'Updated Asset' })
      }

      const beginResult = await transactionCoordinator.begin({
        mode: 'SINGLE_DOMAIN',
        enableOptimisticLocking: true,
      })

      expect(beginResult.success).toBe(true)
      
      if (beginResult.success) {
        const lockResult = await transactionCoordinator.acquireOptimisticLock(
          beginResult.data.id,
          'assets',
          entity.id,
          entity.version
        )
        
        expect(lockResult.success).toBe(true)
        
        if (lockResult.success) {
          const updateResult = await updateOperation(lockResult.data)
          expect(updateResult.success).toBe(true)
          
          const commitResult = await transactionCoordinator.commit(beginResult.data.id)
          expect(commitResult.success).toBe(true)
        }
      }
    })

    it('should handle optimistic lock conflicts', async () => {
      const entity = { id: 'asset1', version: 1, name: 'Test Asset' }
      
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: 'tx_123', error: null }) // begin
        .mockResolvedValueOnce({ 
          data: null, 
          error: { code: 'OPTIMISTIC_LOCK_CONFLICT', message: 'Version mismatch' }
        }) // lock conflict
        .mockResolvedValueOnce({ data: 'rolled_back', error: null }) // rollback

      const beginResult = await transactionCoordinator.begin({
        mode: 'SINGLE_DOMAIN',
        enableOptimisticLocking: true,
      })

      if (beginResult.success) {
        const lockResult = await transactionCoordinator.acquireOptimisticLock(
          beginResult.data.id,
          'assets',
          entity.id,
          entity.version
        )
        
        expect(lockResult.success).toBe(false)
        if (!lockResult.success) {
          expect(lockResult.error.code).toBe('OPTIMISTIC_LOCK_CONFLICT')
        }
        
        // Transaction should be rolled back
        await transactionCoordinator.rollback(beginResult.data.id, 'Lock conflict')
      }
    })
  })

  describe('Distributed Transaction Recovery', () => {
    it('should recover from coordinator failure', async () => {
      // Simulate a transaction that was interrupted
      const interruptedTransactionId = 'tx_interrupted_123'
      
      mockSupabase.rpc.mockImplementation((procedure) => {
        switch (procedure) {
          case 'recover_transaction':
            return Promise.resolve({
              data: {
                id: interruptedTransactionId,
                status: 'PREPARING',
                domains: ['users', 'organizations'],
                started_at: new Date(Date.now() - 60000).toISOString() // 1 minute ago
              },
              error: null
            })
          case 'abort_transaction':
            return Promise.resolve({ data: 'recovered', error: null })
          default:
            return Promise.resolve({ data: null, error: new Error('Unknown procedure') })
        }
      })

      const recoveryResult = await transactionCoordinator.recoverTransaction(interruptedTransactionId)
      
      expect(recoveryResult.success).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('recover_transaction', {
        transaction_id: interruptedTransactionId
      })
    })

    it('should handle recovery timeout scenarios', async () => {
      const stalledTransactionId = 'tx_stalled_123'
      
      mockSupabase.rpc.mockImplementation((procedure) => {
        switch (procedure) {
          case 'recover_transaction':
            return Promise.resolve({
              data: {
                id: stalledTransactionId,
                status: 'PREPARING',
                domains: ['users'],
                started_at: new Date(Date.now() - 300000).toISOString() // 5 minutes ago (stale)
              },
              error: null
            })
          case 'force_abort_transaction':
            return Promise.resolve({ data: 'force_aborted', error: null })
          default:
            return Promise.resolve({ data: null, error: new Error('Unknown procedure') })
        }
      })

      const recoveryResult = await transactionCoordinator.recoverTransaction(stalledTransactionId, {
        maxAge: 60000, // 1 minute max age
        forceAbort: true,
      })
      
      expect(recoveryResult.success).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('force_abort_transaction', {
        transaction_id: stalledTransactionId
      })
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle database connection failures during transactions', async () => {
      const operations = [
        async () => success({ id: 'user1' }),
        async () => {
          // Simulate connection failure
          throw new Error('Connection lost')
        },
      ]

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: 'tx_123', error: null }) // begin
        .mockRejectedValueOnce(new Error('Connection timeout')) // operation fails
        .mockResolvedValueOnce({ data: 'rolled_back', error: null }) // rollback

      const result = await transactionCoordinator.executeTransaction(operations, {
        mode: 'SINGLE_DOMAIN',
        retryAttempts: 2,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Connection')
      }
    })

    it('should implement circuit breaker for failed transactions', async () => {
      // Simulate multiple consecutive failures
      const failingOperations = [
        async () => failure(RepositoryError.database('DB Error 1')),
      ]

      mockSupabase.rpc.mockResolvedValue({ data: 'tx_123', error: null })

      // Execute multiple failing transactions
      const results = await Promise.all([
        transactionCoordinator.executeTransaction(failingOperations),
        transactionCoordinator.executeTransaction(failingOperations),
        transactionCoordinator.executeTransaction(failingOperations),
        transactionCoordinator.executeTransaction(failingOperations),
        transactionCoordinator.executeTransaction(failingOperations),
      ])

      // All should fail
      results.forEach(result => {
        expect(result.success).toBe(false)
      })

      // Next transaction should be circuit-broken (fast fail)
      const startTime = Date.now()
      const circuitBreakerResult = await transactionCoordinator.executeTransaction(failingOperations)
      const executionTime = Date.now() - startTime

      expect(circuitBreakerResult.success).toBe(false)
      expect(executionTime).toBeLessThan(100) // Should fail quickly due to circuit breaker
    })

    it('should handle partial network partitions', async () => {
      const operations = [
        {
          domain: 'users',
          operation: async () => success({ id: 'user1' }),
        },
        {
          domain: 'organizations', 
          operation: async () => {
            // Simulate network partition - operation hangs
            return new Promise((resolve) => {
              setTimeout(() => resolve(failure(RepositoryError.network('Network partition'))), 30000)
            })
          },
        },
      ]

      mockSupabase.rpc.mockResolvedValue({ data: 'tx_123', error: null })

      const result = await transactionCoordinator.executeCrossDomainTransaction(operations, {
        coordinationType: 'TWO_PHASE_COMMIT',
        timeout: 5000, // 5 second timeout
        networkPartitionHandling: 'ABORT',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('TIMEOUT')
      }
    })
  })

  describe('Performance and Concurrency', () => {
    it('should handle high concurrency transaction load', async () => {
      const concurrentTransactions = Array.from({ length: 50 }, (_, i) => {
        const operations = [
          async () => success({ id: `user${i}`, name: `User ${i}` }),
          async () => success({ id: `org${i}`, name: `Org ${i}` }),
        ]
        
        return transactionCoordinator.executeTransaction(operations)
      })

      mockSupabase.rpc.mockImplementation(() => 
        Promise.resolve({ data: `tx_${Math.random()}`, error: null })
      )

      const startTime = Date.now()
      const results = await Promise.all(concurrentTransactions)
      const executionTime = Date.now() - startTime

      // All transactions should succeed
      results.forEach(result => {
        expect(result.success).toBe(true)
      })

      // Should complete in reasonable time even with high concurrency
      expect(executionTime).toBeLessThan(5000) // Under 5 seconds
    })

    it('should prevent deadlock scenarios', async () => {
      // Simulate potential deadlock: two transactions trying to acquire locks in different orders
      const transaction1Operations = [
        async () => {
          // Lock resource A, then B
          return success({ locked: ['A', 'B'] })
        },
      ]

      const transaction2Operations = [
        async () => {
          // Lock resource B, then A
          return success({ locked: ['B', 'A'] })
        },
      ]

      mockSupabase.rpc.mockImplementation((procedure, params) => {
        if (procedure === 'acquire_locks') {
          // Simulate deadlock detection
          if (params?.resources && params.resources.length > 1) {
            return Promise.resolve({ 
              data: null, 
              error: { code: 'DEADLOCK_DETECTED', message: 'Deadlock detected' }
            })
          }
        }
        return Promise.resolve({ data: 'tx_123', error: null })
      })

      const [result1, result2] = await Promise.all([
        transactionCoordinator.executeTransaction(transaction1Operations, {
          deadlockDetection: true,
        }),
        transactionCoordinator.executeTransaction(transaction2Operations, {
          deadlockDetection: true,
        }),
      ])

      // At least one should fail due to deadlock prevention
      const failedCount = [result1, result2].filter(r => !r.success).length
      expect(failedCount).toBeGreaterThan(0)
    })
  })

  describe('Transaction Monitoring and Metrics', () => {
    it('should provide transaction metrics', async () => {
      const operations = [
        async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return success({ id: 'user1' })
        },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 50))
          return success({ id: 'org1' })
        },
      ]

      mockSupabase.rpc.mockResolvedValue({ data: 'tx_123', error: null })

      const result = await transactionCoordinator.executeTransaction(operations, {
        mode: 'SINGLE_DOMAIN',
        enableMetrics: true,
      })

      expect(result.success).toBe(true)
      if (result.success && result.metadata) {
        expect(result.metadata.metrics).toEqual(expect.objectContaining({
          duration: expect.any(Number),
          operationCount: 2,
          retryCount: expect.any(Number),
        }))
      }
    })
  })
})
