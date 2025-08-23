/**
 * Crisis Incidents API Route Tests
 * Test suite for crisis incident management API endpoints
 */

import { GET, POST, PUT } from '../route';
import { NextRequest } from 'next/server';

// Mock the service dependencies
jest.mock('@/lib/services/crisis-management.service');
jest.mock('@supabase/auth-helpers-nextjs');
jest.mock('next/headers');

const mockCrisisService = {
  getIncidents: jest.fn(),
  createIncident: jest.fn(),
  updateIncident: jest.fn(),
  getIncidentById: jest.fn(),
  getDashboardSummary: jest.fn(),
  getCrisisAnalytics: jest.fn()
};

const mockSupabaseClient = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn()
  }
};

// Mock the imports
jest.doMock('@/lib/services/crisis-management.service', () => ({
  CrisisManagementService: jest.fn().mockImplementation(() => mockCrisisService)
}));

jest.doMock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: jest.fn(() => mockSupabaseClient)
}));

jest.doMock('next/headers', () => ({
  cookies: jest.fn()
}));

describe('/api/crisis/incidents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authenticated user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null
    });
  });

  describe('GET /api/crisis/incidents', () => {
    it('should return incidents list successfully', async () => {
      const mockIncidents = [
        {
          id: 'incident-1',
          title: 'Trading System Outage',
          status: 'active',
          severity_level: 'high',
          created_at: '2024-01-15T10:30:00Z'
        },
        {
          id: 'incident-2',
          title: 'Data Security Alert',
          status: 'resolved',
          severity_level: 'medium',
          created_at: '2024-01-14T15:20:00Z'
        }
      ];

      mockCrisisService.getIncidents.mockResolvedValue({
        success: true,
        data: mockIncidents
      });

      const request = new NextRequest('https://example.com/api/crisis/incidents');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveLength(2);
      expect(responseData.data[0].title).toBe('Trading System Outage');
    });

    it('should handle query parameters for filtering', async () => {
      mockCrisisService.getIncidents.mockResolvedValue({
        success: true,
        data: []
      });

      const request = new NextRequest('https://example.com/api/crisis/incidents?status=active&severity_level=high&limit=10');
      await GET(request);
      
      expect(mockCrisisService.getIncidents).toHaveBeenCalledWith({
        status: 'active',
        severity_level: 'high',
        limit: 10
      });
    });

    it('should handle service errors', async () => {
      mockCrisisService.getIncidents.mockResolvedValue({
        success: false,
        error: { message: 'Database connection failed', statusCode: 500 }
      });

      const request = new NextRequest('https://example.com/api/crisis/incidents');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
      
      const responseData = await response.json();
      expect(responseData.error).toBe('Database connection failed');
    });

    it('should handle unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const request = new NextRequest('https://example.com/api/crisis/incidents');
      const response = await GET(request);
      
      expect(response.status).toBe(401);
      
      const responseData = await response.json();
      expect(responseData.error).toBe('Authentication required');
    });
  });

  describe('POST /api/crisis/incidents', () => {
    const mockIncidentData = {
      title: 'New Crisis Incident',
      description: 'Test incident for API testing',
      category: 'operational',
      severity_level: 'high',
      affected_systems: ['trading', 'settlement'],
      reported_by: 'user-123'
    };

    it('should create incident successfully', async () => {
      const createdIncident = {
        id: 'incident-123',
        ...mockIncidentData,
        status: 'active',
        created_at: new Date().toISOString()
      };

      mockCrisisService.createIncident.mockResolvedValue({
        success: true,
        data: createdIncident
      });

      const request = new NextRequest('https://example.com/api/crisis/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockIncidentData)
      });

      const response = await POST(request);
      
      expect(response.status).toBe(201);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data.id).toBe('incident-123');
      expect(responseData.data.title).toBe('New Crisis Incident');
    });

    it('should validate request body', async () => {
      const invalidData = {
        title: '', // Invalid empty title
        description: 'Test',
        category: 'invalid_category',
        severity_level: 'invalid_severity'
      };

      const request = new NextRequest('https://example.com/api/crisis/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.error).toBe('Validation error');
      expect(responseData.details).toBeDefined();
    });

    it('should handle service creation errors', async () => {
      mockCrisisService.createIncident.mockResolvedValue({
        success: false,
        error: { message: 'Failed to create incident', statusCode: 400 }
      });

      const request = new NextRequest('https://example.com/api/crisis/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockIncidentData)
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.error).toBe('Failed to create incident');
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('https://example.com/api/crisis/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.error).toBe('Invalid JSON in request body');
    });
  });

  describe('PUT /api/crisis/incidents', () => {
    const mockUpdateData = {
      incident_id: 'incident-123',
      status: 'resolved',
      resolution_summary: 'Issue resolved successfully',
      resolved_at: new Date().toISOString()
    };

    it('should update incident successfully', async () => {
      const updatedIncident = {
        id: 'incident-123',
        title: 'Trading System Outage',
        ...mockUpdateData,
        updated_at: new Date().toISOString()
      };

      mockCrisisService.updateIncident.mockResolvedValue({
        success: true,
        data: updatedIncident
      });

      const request = new NextRequest('https://example.com/api/crisis/incidents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockUpdateData)
      });

      const response = await PUT(request);
      
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data.status).toBe('resolved');
      expect(mockCrisisService.updateIncident).toHaveBeenCalledWith(
        'incident-123',
        expect.objectContaining({
          status: 'resolved',
          resolution_summary: 'Issue resolved successfully'
        })
      );
    });

    it('should validate incident_id is provided', async () => {
      const invalidUpdateData = {
        status: 'resolved',
        // Missing incident_id
      };

      const request = new NextRequest('https://example.com/api/crisis/incidents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidUpdateData)
      });

      const response = await PUT(request);
      
      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.error).toBe('Validation error');
    });

    it('should handle incident not found', async () => {
      mockCrisisService.updateIncident.mockResolvedValue({
        success: false,
        error: { message: 'Incident not found', statusCode: 404 }
      });

      const request = new NextRequest('https://example.com/api/crisis/incidents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockUpdateData)
      });

      const response = await PUT(request);
      
      expect(response.status).toBe(404);
      
      const responseData = await response.json();
      expect(responseData.error).toBe('Incident not found');
    });
  });

  describe('Dashboard and Analytics Endpoints', () => {
    it('should return dashboard summary', async () => {
      const mockDashboardData = {
        active_incidents: 3,
        pending_communications: 2,
        upcoming_meetings: 1,
        active_alerts: 5,
        recent_activity: [
          {
            type: 'incident_created',
            title: 'New security alert',
            timestamp: '2024-01-15T10:30:00Z'
          }
        ]
      };

      mockCrisisService.getDashboardSummary.mockResolvedValue({
        success: true,
        data: mockDashboardData
      });

      const request = new NextRequest('https://example.com/api/crisis/incidents?type=dashboard');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data.active_incidents).toBe(3);
      expect(responseData.data.recent_activity).toHaveLength(1);
    });

    it('should return crisis analytics', async () => {
      const mockAnalytics = {
        total_incidents: 25,
        resolved_incidents: 20,
        active_incidents: 5,
        avg_resolution_time_hours: 18.5,
        incidents_by_category: {
          operational: 10,
          financial: 8,
          regulatory: 4,
          reputational: 3
        }
      };

      mockCrisisService.getCrisisAnalytics.mockResolvedValue({
        success: true,
        data: mockAnalytics
      });

      const request = new NextRequest('https://example.com/api/crisis/incidents?type=analytics&start_date=2024-01-01&end_date=2024-01-31');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data.total_incidents).toBe(25);
      expect(mockCrisisService.getCrisisAnalytics).toHaveBeenCalledWith({
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors', async () => {
      mockCrisisService.getIncidents.mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest('https://example.com/api/crisis/incidents');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
      
      const responseData = await response.json();
      expect(responseData.error).toBe('Internal server error');
    });

    it('should handle Supabase authentication errors', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT token' }
      });

      const request = new NextRequest('https://example.com/api/crisis/incidents');
      const response = await GET(request);
      
      expect(response.status).toBe(401);
    });

    it('should handle rate limiting', async () => {
      // Mock rate limiting scenario
      mockCrisisService.getIncidents.mockResolvedValue({
        success: false,
        error: { message: 'Rate limit exceeded', statusCode: 429 }
      });

      const request = new NextRequest('https://example.com/api/crisis/incidents');
      const response = await GET(request);
      
      expect(response.status).toBe(429);
      
      const responseData = await response.json();
      expect(responseData.error).toBe('Rate limit exceeded');
    });

    it('should validate Content-Type for POST requests', async () => {
      const request = new NextRequest('https://example.com/api/crisis/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' }, // Invalid content type
        body: 'plain text body'
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      
      const responseData = await response.json();
      expect(responseData.error).toContain('Content-Type');
    });
  });

  describe('Performance and Caching', () => {
    it('should handle large dataset requests', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `incident-${i}`,
        title: `Incident ${i}`,
        status: 'resolved',
        created_at: new Date().toISOString()
      }));

      mockCrisisService.getIncidents.mockResolvedValue({
        success: true,
        data: largeDataset,
        pagination: {
          total: 1000,
          page: 1,
          limit: 1000,
          has_more: false
        }
      });

      const request = new NextRequest('https://example.com/api/crisis/incidents?limit=1000');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.data).toHaveLength(1000);
      expect(responseData.pagination.total).toBe(1000);
    });

    it('should set appropriate cache headers for dashboard data', async () => {
      mockCrisisService.getDashboardSummary.mockResolvedValue({
        success: true,
        data: { active_incidents: 3 }
      });

      const request = new NextRequest('https://example.com/api/crisis/incidents?type=dashboard');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
    });
  });

  describe('Security', () => {
    it('should verify user permissions for sensitive operations', async () => {
      // Mock user without sufficient permissions
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'user-123', 
            email: 'limited@example.com',
            app_metadata: { role: 'viewer' }
          } 
        },
        error: null
      });

      const request = new NextRequest('https://example.com/api/crisis/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Incident',
          description: 'Test',
          category: 'operational',
          severity_level: 'high'
        })
      });

      const response = await POST(request);
      
      expect(response.status).toBe(403);
      
      const responseData = await response.json();
      expect(responseData.error).toBe('Insufficient permissions');
    });

    it('should sanitize input data', async () => {
      const maliciousData = {
        title: '<script>alert("xss")</script>',
        description: 'SELECT * FROM users; --',
        category: 'operational',
        severity_level: 'high'
      };

      mockCrisisService.createIncident.mockResolvedValue({
        success: true,
        data: { id: 'incident-123', title: 'alert("xss")' } // Sanitized
      });

      const request = new NextRequest('https://example.com/api/crisis/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousData)
      });

      const response = await POST(request);
      
      expect(response.status).toBe(201);
      
      // Verify that the service received sanitized data
      expect(mockCrisisService.createIncident).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.not.stringContaining('<script>')
        })
      );
    });
  });
});