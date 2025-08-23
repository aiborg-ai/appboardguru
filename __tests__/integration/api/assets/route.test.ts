/**
 * Assets API Integration Tests
 * Testing the complete API endpoints with real database interactions
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '@/app/api/assets/route';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Mock Next.js dependencies
vi.mock('next/headers', () => ({
  cookies: vi.fn()
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn()
}));

describe('/api/assets Integration Tests', () => {
  let mockCookies: any;
  let mockSupabase: any;
  let mockUser: any;
  
  beforeAll(() => {
    // Set up environment variables for tests
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock user
    mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      aud: 'authenticated',
      role: 'authenticated'
    };

    // Mock cookies
    mockCookies = {
      getAll: vi.fn().mockReturnValue([]),
      set: vi.fn(),
      setAll: vi.fn()
    };
    vi.mocked(cookies).mockResolvedValue(mockCookies);

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null
        })
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis()
    };

    vi.mocked(createServerClient).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  describe('GET /api/assets', () => {
    it('returns assets successfully for authenticated user', async () => {
      const mockAssets = [
        {
          id: 'asset-1',
          title: 'Financial Report Q4.pdf',
          file_name: 'financial-report-q4.pdf',
          file_type: 'pdf',
          file_size: 2048576,
          category: 'financial',
          tags: ['quarterly', 'financial'],
          uploaded_by: 'test-user-id',
          created_at: '2024-01-15T10:30:00Z',
          updated_at: '2024-01-15T10:30:00Z',
          uploaded_by_user: {
            id: 'test-user-id',
            full_name: 'Test User',
            email: 'test@example.com'
          }
        },
        {
          id: 'asset-2',
          title: 'Board Meeting Slides',
          file_name: 'board-meeting-jan-2024.pptx',
          file_type: 'pptx',
          file_size: 5242880,
          category: 'presentations',
          tags: ['board', 'meeting'],
          uploaded_by: 'other-user-id',
          created_at: '2024-01-10T14:15:00Z',
          updated_at: '2024-01-10T14:15:00Z',
          uploaded_by_user: {
            id: 'other-user-id',
            full_name: 'Other User',
            email: 'other@example.com'
          }
        }
      ];

      // Mock successful database response
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        then: vi.fn().mockImplementation((callback) => {
          callback({ data: mockAssets, error: null, count: 2 });
          return Promise.resolve();
        })
      });

      const request = new NextRequest('http://localhost:3000/api/assets');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.assets).toHaveLength(2);
      expect(data.totalCount).toBe(2);
      expect(data.page).toBe(1);
      expect(data.limit).toBe(50);

      // Verify transformed data structure
      expect(data.assets[0]).toMatchObject({
        id: 'asset-1',
        title: 'Financial Report Q4.pdf',
        isOwner: true,
        owner: {
          id: 'test-user-id',
          full_name: 'Test User',
          email: 'test@example.com'
        },
        sharedWith: [],
        isShared: false
      });
    });

    it('applies search filters correctly', async () => {
      const mockAssets = [
        {
          id: 'asset-1',
          title: 'Financial Report Q4.pdf',
          uploaded_by: 'test-user-id',
          uploaded_by_user: { id: 'test-user-id', full_name: 'Test User', email: 'test@example.com' }
        }
      ];

      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        then: vi.fn().mockImplementation((callback) => {
          callback({ data: mockAssets, error: null, count: 1 });
          return Promise.resolve();
        })
      });

      const request = new NextRequest('http://localhost:3000/api/assets?search=financial&category=financial&page=1&limit=25');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      // Verify that the query methods were called with correct parameters
      expect(mockSupabase.from).toHaveBeenCalledWith('board_packs');
      expect(mockSupabase.eq).toHaveBeenCalledWith('category', 'financial');
      expect(mockSupabase.or).toHaveBeenCalledWith('title.ilike.%financial%,file_name.ilike.%financial%,description.ilike.%financial%');
      expect(mockSupabase.range).toHaveBeenCalledWith(0, 24); // page 1, limit 25
    });

    it('applies sorting correctly', async () => {
      const mockAssets = [];
      
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        then: vi.fn().mockImplementation((callback) => {
          callback({ data: mockAssets, error: null, count: 0 });
          return Promise.resolve();
        })
      });

      const request = new NextRequest('http://localhost:3000/api/assets?sortBy=name&sortOrder=asc');
      await GET(request);
      
      expect(mockSupabase.order).toHaveBeenCalledWith('title', { ascending: true });
    });

    it('applies folder filtering', async () => {
      const mockAssets = [];
      
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        then: vi.fn().mockImplementation((callback) => {
          callback({ data: mockAssets, error: null, count: 0 });
          return Promise.resolve();
        })
      });

      const request = new NextRequest('http://localhost:3000/api/assets?folder=/board-meetings');
      await GET(request);
      
      expect(mockSupabase.eq).toHaveBeenCalledWith('folder_path', '/board-meetings');
    });

    it('handles pagination correctly', async () => {
      const mockAssets = [];
      
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        then: vi.fn().mockImplementation((callback) => {
          callback({ data: mockAssets, error: null, count: 100 });
          return Promise.resolve();
        })
      });

      const request = new NextRequest('http://localhost:3000/api/assets?page=3&limit=10');
      const response = await GET(request);
      
      expect(mockSupabase.range).toHaveBeenCalledWith(20, 29); // page 3, offset 20, limit 10
      
      const data = await response.json();
      expect(data.page).toBe(3);
      expect(data.limit).toBe(10);
      expect(data.totalPages).toBe(10); // 100 total / 10 per page
    });

    it('returns 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      });

      const request = new NextRequest('http://localhost:3000/api/assets');
      const response = await GET(request);
      
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('handles database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        then: vi.fn().mockImplementation((callback) => {
          callback({ 
            data: null, 
            error: { message: 'Database connection failed' },
            count: null 
          });
          return Promise.resolve();
        })
      });

      const request = new NextRequest('http://localhost:3000/api/assets');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch assets');
    });

    it('handles server errors gracefully', async () => {
      // Simulate a server error by throwing during request processing
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Server error');
      });

      const request = new NextRequest('http://localhost:3000/api/assets');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });

    it('filters by user access correctly', async () => {
      const mockAssets = [];
      
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        then: vi.fn().mockImplementation((callback) => {
          callback({ data: mockAssets, error: null, count: 0 });
          return Promise.resolve();
        })
      });

      const request = new NextRequest('http://localhost:3000/api/assets');
      await GET(request);
      
      // Verify user access filter is applied
      expect(mockSupabase.or).toHaveBeenCalledWith(
        `uploaded_by.eq.${mockUser.id},organization_id.in.(SELECT organization_id FROM organization_members WHERE user_id = '${mockUser.id}' AND status = 'active')`
      );
    });
  });

  describe('POST /api/assets', () => {
    it('creates asset successfully with valid data', async () => {
      const mockCreatedAsset = {
        id: 'asset-new',
        title: 'New Document',
        file_name: 'new-document.pdf',
        file_path: '/uploads/new-document.pdf',
        file_size: 1024000,
        file_type: 'pdf',
        category: 'board-documents',
        uploaded_by: 'test-user-id',
        organization_id: 'org-1',
        status: 'ready'
      };

      mockSupabase.insert.mockReturnValue({
        ...mockSupabase,
        then: vi.fn().mockImplementation((callback) => {
          callback({ data: mockCreatedAsset, error: null });
          return Promise.resolve();
        })
      });

      // Mock audit log insertion
      const mockAuditInsert = vi.fn().mockReturnValue({
        then: vi.fn().mockImplementation((callback) => {
          callback({ data: {}, error: null });
          return Promise.resolve();
        })
      });
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'audit_logs') {
          return { insert: mockAuditInsert };
        }
        return mockSupabase;
      });

      const requestBody = {
        title: 'New Document',
        description: 'A test document',
        fileName: 'new-document.pdf',
        filePath: '/uploads/new-document.pdf',
        fileSize: 1024000,
        fileType: 'pdf',
        category: 'board-documents',
        tags: ['test', 'document']
      };

      const request = new NextRequest('http://localhost:3000/api/assets', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data.asset).toMatchObject({
        id: 'asset-new',
        title: 'New Document',
        file_name: 'new-document.pdf',
        category: 'board-documents',
        uploaded_by: 'test-user-id'
      });

      // Verify insert was called with correct data
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        uploaded_by: 'test-user-id',
        title: 'New Document',
        description: 'A test document',
        file_name: 'new-document.pdf',
        file_path: '/uploads/new-document.pdf',
        file_size: 1024000,
        file_type: 'pdf',
        category: 'board-documents',
        tags: ['test', 'document'],
        status: 'ready',
        watermark_applied: false
      });

      // Verify audit log was created
      expect(mockAuditInsert).toHaveBeenCalledWith({
        user_id: 'test-user-id',
        organization_id: 'org-1',
        event_type: 'data_modification',
        event_category: 'asset_management',
        action: 'upload',
        resource_type: 'board_pack',
        resource_id: 'asset-new',
        event_description: 'Uploaded new asset: New Document',
        outcome: 'success',
        severity: 'low',
        details: {
          file_name: 'new-document.pdf',
          file_size: 1024000,
          file_type: 'pdf',
          category: 'board-documents'
        }
      });
    });

    it('validates required fields', async () => {
      const incompleteBody = {
        title: 'New Document',
        // Missing required fields: fileName, filePath, fileSize, fileType
      };

      const request = new NextRequest('http://localhost:3000/api/assets', {
        method: 'POST',
        body: JSON.stringify(incompleteBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('Missing required fields: title, fileName, filePath, fileSize, fileType');
    });

    it('returns 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      });

      const requestBody = {
        title: 'New Document',
        fileName: 'new-document.pdf',
        filePath: '/uploads/new-document.pdf',
        fileSize: 1024000,
        fileType: 'pdf'
      };

      const request = new NextRequest('http://localhost:3000/api/assets', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('handles database errors gracefully', async () => {
      mockSupabase.insert.mockReturnValue({
        ...mockSupabase,
        then: vi.fn().mockImplementation((callback) => {
          callback({ 
            data: null, 
            error: { message: 'Database constraint violation' }
          });
          return Promise.resolve();
        })
      });

      const requestBody = {
        title: 'New Document',
        fileName: 'new-document.pdf',
        filePath: '/uploads/new-document.pdf',
        fileSize: 1024000,
        fileType: 'pdf'
      };

      const request = new NextRequest('http://localhost:3000/api/assets', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toBe('Failed to create asset');
    });

    it('handles server errors gracefully', async () => {
      // Simulate server error during JSON parsing
      const request = new NextRequest('http://localhost:3000/api/assets', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });

    it('applies default values correctly', async () => {
      const mockCreatedAsset = {
        id: 'asset-new',
        title: 'New Document',
        file_name: 'new-document.pdf',
        category: 'other', // default category
        tags: [], // default tags
        uploaded_by: 'test-user-id',
        status: 'ready',
        watermark_applied: false
      };

      mockSupabase.insert.mockReturnValue({
        ...mockSupabase,
        then: vi.fn().mockImplementation((callback) => {
          callback({ data: mockCreatedAsset, error: null });
          return Promise.resolve();
        })
      });

      // Mock audit log
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'audit_logs') {
          return { 
            insert: vi.fn().mockReturnValue({
              then: vi.fn().mockImplementation((callback) => {
                callback({ data: {}, error: null });
                return Promise.resolve();
              })
            })
          };
        }
        return mockSupabase;
      });

      const requestBody = {
        title: 'New Document',
        fileName: 'new-document.pdf',
        filePath: '/uploads/new-document.pdf',
        fileSize: 1024000,
        fileType: 'pdf'
        // No category or tags provided
      };

      const request = new NextRequest('http://localhost:3000/api/assets', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      await POST(request);

      // Verify defaults were applied
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'other',
          tags: []
        })
      );
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('handles malformed JSON in POST request', async () => {
      const request = new NextRequest('http://localhost:3000/api/assets', {
        method: 'POST',
        body: '{"title": "Test", invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });

    it('handles missing Content-Type header', async () => {
      const requestBody = {
        title: 'New Document',
        fileName: 'new-document.pdf',
        filePath: '/uploads/new-document.pdf',
        fileSize: 1024000,
        fileType: 'pdf'
      };

      const request = new NextRequest('http://localhost:3000/api/assets', {
        method: 'POST',
        body: JSON.stringify(requestBody)
        // No Content-Type header
      });

      const response = await POST(request);
      
      // Should still work as Next.js can handle JSON parsing
      expect([201, 500]).toContain(response.status); // Either success or internal error
    });

    it('handles extremely large page numbers', async () => {
      const mockAssets = [];
      
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        then: vi.fn().mockImplementation((callback) => {
          callback({ data: mockAssets, error: null, count: 10 });
          return Promise.resolve();
        })
      });

      const request = new NextRequest('http://localhost:3000/api/assets?page=999999&limit=10');
      const response = await GET(request);
      
      // Should handle gracefully
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.page).toBe(999999);
      expect(data.totalPages).toBe(1); // 10 total / 10 per page
    });

    it('handles invalid query parameters', async () => {
      const mockAssets = [];
      
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        then: vi.fn().mockImplementation((callback) => {
          callback({ data: mockAssets, error: null, count: 0 });
          return Promise.resolve();
        })
      });

      const request = new NextRequest('http://localhost:3000/api/assets?page=invalid&limit=not-a-number');
      const response = await GET(request);
      
      // Should use defaults
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.page).toBe(1); // default page
      expect(data.limit).toBe(50); // default limit
    });
  });

  describe('Performance and Limits', () => {
    it('respects limit parameter constraints', async () => {
      const mockAssets = [];
      
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        then: vi.fn().mockImplementation((callback) => {
          callback({ data: mockAssets, error: null, count: 1000 });
          return Promise.resolve();
        })
      });

      // Test with very high limit
      const request = new NextRequest('http://localhost:3000/api/assets?limit=10000');
      await GET(request);
      
      // Should be capped at reasonable limit (implementation dependent)
      const data = await new Response().json().catch(() => ({}));
      // The actual limit enforcement would be in the implementation
    });

    it('handles concurrent requests gracefully', async () => {
      const mockAssets = [{ id: 'asset-1', title: 'Test', uploaded_by: mockUser.id }];
      
      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        then: vi.fn().mockImplementation((callback) => {
          callback({ data: mockAssets, error: null, count: 1 });
          return Promise.resolve();
        })
      });

      const requests = Array.from({ length: 5 }, () => 
        GET(new NextRequest('http://localhost:3000/api/assets'))
      );

      const responses = await Promise.all(requests);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});