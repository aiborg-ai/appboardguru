import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { UserRepository } from '@/lib/repositories/user.repository'
import type { Database } from '@/types'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  })),
  auth: {
    getUser: vi.fn(),
  },
} as any

describe('UserRepository', () => {
  let userRepository: UserRepository

  beforeEach(() => {
    vi.clearAllMocks()
    userRepository = new UserRepository(mockSupabaseClient)
  })

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'director',
        status: 'approved',
      }

      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUser,
        error: null,
      })

      const result = await userRepository.findById('123')
      
      expect(result).toEqual(mockUser)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users')
    })

    it('should return null when user not found', async () => {
      mockSupabaseClient.from().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })

      const result = await userRepository.findById('123')
      
      expect(result).toBeNull()
    })

    it('should throw error on database error', async () => {
      mockSupabaseClient.from().single.mockResolvedValue({
        data: null,
        error: { code: 'OTHER', message: 'Database error' },
      })

      await expect(userRepository.findById('123')).rejects.toThrow()
    })
  })

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        full_name: 'Test User',
      }

      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUser,
        error: null,
      })

      const result = await userRepository.findByEmail('test@example.com')
      
      expect(result).toEqual(mockUser)
      expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('email', 'test@example.com')
    })
  })

  describe('create', () => {
    it('should create user successfully', async () => {
      const newUser = {
        id: '123',
        email: 'new@example.com',
        full_name: 'New User',
      }

      const mockCreatedUser = {
        ...newUser,
        role: 'pending',
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
      }

      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockCreatedUser,
        error: null,
      })

      const result = await userRepository.create(newUser)
      
      expect(result).toEqual(mockCreatedUser)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users')
    })

    it('should handle creation errors', async () => {
      mockSupabaseClient.from().single.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'Duplicate key' },
      })

      await expect(userRepository.create({
        id: '123',
        email: 'test@example.com',
        full_name: 'Test User',
      })).rejects.toThrow()
    })
  })

  describe('update', () => {
    it('should update user successfully', async () => {
      const updates = {
        full_name: 'Updated Name',
      }

      const mockUpdatedUser = {
        id: '123',
        email: 'test@example.com',
        full_name: 'Updated Name',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockUpdatedUser,
        error: null,
      })

      const result = await userRepository.update('123', updates)
      
      expect(result).toEqual(mockUpdatedUser)
      expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('id', '123')
    })
  })

  describe('delete', () => {
    it('should delete user successfully', async () => {
      mockSupabaseClient.from().delete.mockResolvedValue({
        error: null,
      })

      await expect(userRepository.delete('123')).resolves.not.toThrow()
      expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('id', '123')
    })
  })

  describe('findByOrganization', () => {
    it('should return users in organization', async () => {
      const mockUsers = [
        { id: '1', email: 'user1@example.com', organization_members: [{ role: 'admin' }] },
        { id: '2', email: 'user2@example.com', organization_members: [{ role: 'member' }] },
      ]

      mockSupabaseClient.from().eq.mockReturnThis()
      mockSupabaseClient.from().select.mockResolvedValue({
        data: mockUsers,
        error: null,
      })

      const result = await userRepository.findByOrganization('org-123')
      
      expect(result).toEqual(mockUsers)
      expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('organization_members.organization_id', 'org-123')
    })
  })
})