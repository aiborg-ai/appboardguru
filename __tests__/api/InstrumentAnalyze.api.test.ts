/**
 * Comprehensive API Tests for Instrument Analysis Endpoint
 * Tests request handling, validation, response format, and error scenarios
 */

import { createMocks } from 'node-mocks-http';
import { POST, GET } from '@/app/api/instruments/analyze/route';

// Mock the auth system
jest.mock('@/lib/supabase-typed', () => ({
  createTypedSupabaseClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => ({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null
      }))
    }
  })),
  getAuthenticatedUser: jest.fn(() => ({
    id: 'user-123',
    email: 'test@example.com'
  }))
}));

describe('/api/instruments/analyze', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST Request Handling', () => {
    test('processes valid analysis request successfully', async () => {
      const validRequest = {
        instrumentId: 'board-pack-ai',
        goal: {
          id: 'comprehensive-analysis',
          title: 'Comprehensive Analysis',
          parameters: { 'analysis-depth': 'deep' }
        },
        assets: [
          {
            id: '1',
            name: 'board-pack.pdf',
            type: 'pdf',
            size: 1024000
          }
        ],
        saveOptions: {
          saveToVault: { enabled: true, vaultId: 'vault-123' },
          saveAsAsset: { enabled: false },
          shareOptions: { enabled: false },
          exportOptions: { pdf: true, excel: false }
        },
        results: {
          insights: [
            {
              id: 'insight-1',
              type: 'summary',
              title: 'Executive Summary',
              content: 'Strong performance metrics'
            }
          ],
          charts: [
            {
              id: 'chart-1',
              type: 'bar',
              title: 'Revenue Growth',
              data: { labels: ['Q1'], datasets: [{ data: [100] }] }
            }
          ],
          recommendations: [
            {
              id: 'rec-1',
              title: 'Continue Growth Strategy',
              description: 'Maintain current approach'
            }
          ],
          metadata: {
            processingTime: 5000,
            confidence: 0.87,
            documentsProcessed: 1
          }
        }
      };

      const { req } = createMocks({
        method: 'POST',
        body: validRequest,
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(req as any);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        success: true,
        analysisId: expect.stringMatching(/^analysis_\d+_[a-z0-9]+$/),
        instrumentId: 'board-pack-ai',
        goal: 'Comprehensive Analysis',
        assetsProcessed: 1,
        timestamp: expect.any(String),
        saveResults: {
          vault: {
            id: 'vault-123',
            name: expect.any(String),
            saved: true
          },
          exports: [
            {
              format: 'pdf',
              downloadUrl: expect.stringMatching(/^\/api\/exports\/analysis_.+\.pdf$/),
              status: 'ready'
            }
          ]
        },
        insights: validRequest.results.insights,
        charts: validRequest.results.charts,
        recommendations: validRequest.results.recommendations,
        metadata: expect.objectContaining({
          processingTime: 5000,
          confidence: 0.87,
          documentsProcessed: 1
        })
      });
    });

    test('validates required fields', async () => {
      const invalidRequests = [
        // Missing instrumentId
        {
          goal: { id: 'test', title: 'Test' },
          assets: [{ id: '1', name: 'test.pdf' }]
        },
        // Missing goal
        {
          instrumentId: 'board-pack-ai',
          assets: [{ id: '1', name: 'test.pdf' }]
        },
        // Missing assets
        {
          instrumentId: 'board-pack-ai',
          goal: { id: 'test', title: 'Test' }
        },
        // Empty assets array
        {
          instrumentId: 'board-pack-ai',
          goal: { id: 'test', title: 'Test' },
          assets: []
        }
      ];

      for (const invalidRequest of invalidRequests) {
        const { req } = createMocks({
          method: 'POST',
          body: invalidRequest,
          headers: { 'content-type': 'application/json' },
        });

        const response = await POST(req as any);
        const responseData = await response.json();

        expect(response.status).toBe(400);
        expect(responseData.error).toContain('Missing required fields');
      }
    });

    test('handles different save option combinations', async () => {
      const testCases = [
        // Save to vault only
        {
          saveOptions: {
            saveToVault: { enabled: true, vaultId: 'vault-123', vaultName: 'Test Vault' },
            saveAsAsset: { enabled: false },
            shareOptions: { enabled: false },
            exportOptions: {}
          },
          expectedSaveResults: {
            vault: { id: 'vault-123', name: 'Test Vault', saved: true }
          }
        },
        // Save as asset only
        {
          saveOptions: {
            saveToVault: { enabled: false },
            saveAsAsset: { enabled: true, assetName: 'Analysis Results' },
            shareOptions: { enabled: false },
            exportOptions: {}
          },
          expectedSaveResults: {
            asset: {
              id: expect.stringMatching(/^asset_\d+$/),
              name: 'Analysis Results',
              type: 'analysis_report',
              saved: true
            }
          }
        },
        // Share options enabled
        {
          saveOptions: {
            saveToVault: { enabled: false },
            saveAsAsset: { enabled: false },
            shareOptions: {
              enabled: true,
              shareWithBoardMates: true,
              generatePublicLink: true,
              emailRecipients: ['test1@example.com', 'test2@example.com']
            },
            exportOptions: {}
          },
          expectedSaveResults: {
            sharing: {
              boardMatesNotified: true,
              publicLink: expect.stringMatching(/^https:\/\/app\.boardguru\.com\/shared\/analysis_/),
              emailsSent: 2
            }
          }
        },
        // Multiple export formats
        {
          saveOptions: {
            saveToVault: { enabled: false },
            saveAsAsset: { enabled: false },
            shareOptions: { enabled: false },
            exportOptions: { pdf: true, excel: true, powerpoint: true }
          },
          expectedSaveResults: {
            exports: [
              { format: 'pdf', downloadUrl: expect.any(String), status: 'ready' },
              { format: 'excel', downloadUrl: expect.any(String), status: 'ready' },
              { format: 'powerpoint', downloadUrl: expect.any(String), status: 'ready' }
            ]
          }
        }
      ];

      for (const testCase of testCases) {
        const request = {
          instrumentId: 'board-pack-ai',
          goal: { id: 'test', title: 'Test Goal' },
          assets: [{ id: '1', name: 'test.pdf', type: 'pdf' }],
          saveOptions: testCase.saveOptions
        };

        const { req } = createMocks({
          method: 'POST',
          body: request,
          headers: { 'content-type': 'application/json' },
        });

        const response = await POST(req as any);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.saveResults).toEqual(
          expect.objectContaining(testCase.expectedSaveResults)
        );
      }
    });

    test('handles analysis results with varying complexity', async () => {
      const complexResults = {
        insights: Array.from({ length: 10 }, (_, i) => ({
          id: `insight-${i}`,
          type: ['summary', 'risks', 'opportunities'][i % 3],
          title: `Insight ${i + 1}`,
          content: `Content for insight ${i + 1}`,
          confidence: 0.5 + (i * 0.05),
          sources: ['doc1.pdf', 'doc2.xlsx']
        })),
        charts: Array.from({ length: 5 }, (_, i) => ({
          id: `chart-${i}`,
          type: ['bar', 'line', 'pie', 'area', 'scatter'][i],
          title: `Chart ${i + 1}`,
          data: {
            labels: [`Label ${i}A`, `Label ${i}B`],
            datasets: [{ data: [i * 10, (i + 1) * 10] }]
          }
        })),
        recommendations: Array.from({ length: 3 }, (_, i) => ({
          id: `rec-${i}`,
          title: `Recommendation ${i + 1}`,
          description: `Description for recommendation ${i + 1}`,
          priority: ['high', 'medium', 'low'][i],
          actionItems: [`Action ${i}1`, `Action ${i}2`]
        }))
      };

      const request = {
        instrumentId: 'board-pack-ai',
        goal: { id: 'comprehensive', title: 'Comprehensive Analysis' },
        assets: [{ id: '1', name: 'test.pdf', type: 'pdf' }],
        saveOptions: { saveToVault: { enabled: false } },
        results: complexResults
      };

      const { req } = createMocks({
        method: 'POST',
        body: request,
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(req as any);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.insights).toHaveLength(10);
      expect(responseData.charts).toHaveLength(5);
      expect(responseData.recommendations).toHaveLength(3);

      // Verify structure is preserved
      expect(responseData.insights[0]).toEqual(
        expect.objectContaining({
          id: 'insight-0',
          type: 'summary',
          confidence: 0.5
        })
      );
    });

    test('handles malformed JSON gracefully', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: 'invalid-json{',
        headers: { 'content-type': 'application/json' },
      });

      // Override the json() method to simulate malformed JSON
      req.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'));

      const response = await POST(req as any);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toContain('Failed to process analysis');
    });

    test('handles large payload sizes', async () => {
      const largeRequest = {
        instrumentId: 'board-pack-ai',
        goal: { id: 'comprehensive', title: 'Comprehensive Analysis' },
        assets: Array.from({ length: 100 }, (_, i) => ({
          id: i.toString(),
          name: `document-${i}.pdf`,
          type: 'pdf',
          size: 1024000 + i
        })),
        saveOptions: { saveToVault: { enabled: false } },
        results: {
          insights: Array.from({ length: 1000 }, (_, i) => ({
            id: `insight-${i}`,
            type: 'summary',
            title: `Insight ${i}`,
            content: 'x'.repeat(1000) // Large content
          }))
        }
      };

      const { req } = createMocks({
        method: 'POST',
        body: largeRequest,
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(req as any);
      
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.assetsProcessed).toBe(100);
      expect(responseData.insights).toHaveLength(1000);
    });

    test('includes proper timestamps and metadata', async () => {
      const startTime = Date.now();

      const request = {
        instrumentId: 'board-pack-ai',
        goal: { id: 'test', title: 'Test' },
        assets: [{ id: '1', name: 'test.pdf' }],
        saveOptions: { exportOptions: { pdf: true } }
      };

      const { req } = createMocks({
        method: 'POST',
        body: request,
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(req as any);
      const responseData = await response.json();
      const endTime = Date.now();

      expect(response.status).toBe(200);
      
      // Verify timestamp is recent
      const responseTime = new Date(responseData.timestamp).getTime();
      expect(responseTime).toBeGreaterThanOrEqual(startTime);
      expect(responseTime).toBeLessThanOrEqual(endTime);

      // Verify analysis ID format
      expect(responseData.analysisId).toMatch(/^analysis_\d+_[a-z0-9]+$/);
      
      // Verify metadata structure
      expect(responseData.metadata).toEqual(
        expect.objectContaining({
          processingTime: expect.any(Number),
          confidence: expect.any(Number),
          documentsProcessed: 1
        })
      );
    });
  });

  describe('GET Request Handling', () => {
    test('returns analysis status for valid analysis ID', async () => {
      const { req } = createMocks({
        method: 'GET',
        query: { analysisId: 'analysis_123_abc' }
      });

      const response = await GET(req as any);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        analysisId: 'analysis_123_abc',
        status: 'completed',
        progress: 100,
        timestamp: expect.any(String)
      });
    });

    test('returns 400 for missing analysis ID', async () => {
      const { req } = createMocks({
        method: 'GET',
        query: {}
      });

      const response = await GET(req as any);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Analysis ID required');
    });

    test('handles various analysis ID formats', async () => {
      const validIds = [
        'analysis_1234567890_abcdef123',
        'analysis_999_xyz789',
        'analysis_0_a'
      ];

      for (const analysisId of validIds) {
        const { req } = createMocks({
          method: 'GET',
          query: { analysisId }
        });

        const response = await GET(req as any);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.analysisId).toBe(analysisId);
        expect(responseData.status).toBe('completed');
      }
    });
  });

  describe('Error Handling', () => {
    test('handles authentication failures', async () => {
      // Mock authentication failure
      const mockAuth = require('@/lib/supabase-typed');
      mockAuth.getAuthenticatedUser.mockImplementationOnce(() => {
        throw new Error('Unauthorized');
      });

      const request = {
        instrumentId: 'board-pack-ai',
        goal: { id: 'test', title: 'Test' },
        assets: [{ id: '1', name: 'test.pdf' }]
      };

      const { req } = createMocks({
        method: 'POST',
        body: request,
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(req as any);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toContain('Failed to process analysis');
    });

    test('handles database connection errors', async () => {
      // Mock database error
      const mockSupabase = require('@/lib/supabase-typed');
      mockSupabase.createTypedSupabaseClient.mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      const request = {
        instrumentId: 'board-pack-ai',
        goal: { id: 'test', title: 'Test' },
        assets: [{ id: '1', name: 'test.pdf' }]
      };

      const { req } = createMocks({
        method: 'POST',
        body: request,
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(req as any);
      
      expect(response.status).toBe(500);
    });

    test('handles unexpected server errors', async () => {
      // Mock unexpected error in processing
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const request = {
        instrumentId: 'board-pack-ai',
        goal: { id: 'test', title: 'Test' },
        assets: [{ id: '1', name: 'test.pdf' }],
        saveOptions: {
          // Malformed save options that might cause processing error
          saveToVault: { enabled: true, vaultId: null }
        }
      };

      const { req } = createMocks({
        method: 'POST',
        body: request,
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(req as any);
      
      expect(response.status).toBe(500);
      
      console.error = originalConsoleError;
    });
  });

  describe('Response Format Validation', () => {
    test('returns consistent response structure', async () => {
      const request = {
        instrumentId: 'board-pack-ai',
        goal: { id: 'test', title: 'Test Goal' },
        assets: [{ id: '1', name: 'test.pdf', type: 'pdf' }],
        saveOptions: {
          saveToVault: { enabled: true, vaultId: 'vault-123' },
          exportOptions: { pdf: true }
        },
        results: {
          insights: [{ id: '1', type: 'summary', title: 'Test', content: 'Content' }],
          charts: [{ id: '1', type: 'bar', title: 'Chart', data: {} }],
          recommendations: [{ id: '1', title: 'Rec', description: 'Desc' }]
        }
      };

      const { req } = createMocks({
        method: 'POST',
        body: request,
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(req as any);
      const responseData = await response.json();

      // Verify all expected fields are present
      const expectedFields = [
        'success',
        'analysisId', 
        'instrumentId',
        'goal',
        'assetsProcessed',
        'timestamp',
        'saveResults',
        'insights',
        'charts',
        'recommendations',
        'metadata'
      ];

      expectedFields.forEach(field => {
        expect(responseData).toHaveProperty(field);
      });

      // Verify data types
      expect(typeof responseData.success).toBe('boolean');
      expect(typeof responseData.analysisId).toBe('string');
      expect(typeof responseData.instrumentId).toBe('string');
      expect(typeof responseData.goal).toBe('string');
      expect(typeof responseData.assetsProcessed).toBe('number');
      expect(typeof responseData.timestamp).toBe('string');
      expect(Array.isArray(responseData.insights)).toBe(true);
      expect(Array.isArray(responseData.charts)).toBe(true);
      expect(Array.isArray(responseData.recommendations)).toBe(true);
      expect(typeof responseData.metadata).toBe('object');
    });

    test('handles missing optional fields gracefully', async () => {
      const minimalRequest = {
        instrumentId: 'board-pack-ai',
        goal: { id: 'test', title: 'Test' },
        assets: [{ id: '1', name: 'test.pdf' }],
        saveOptions: {}
      };

      const { req } = createMocks({
        method: 'POST',
        body: minimalRequest,
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(req as any);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.insights).toEqual([]);
      expect(responseData.charts).toEqual([]);
      expect(responseData.recommendations).toEqual([]);
      expect(responseData.saveResults.exports).toEqual([]);
    });
  });

  describe('Performance and Scalability', () => {
    test('handles concurrent requests', async () => {
      const request = {
        instrumentId: 'board-pack-ai',
        goal: { id: 'test', title: 'Test' },
        assets: [{ id: '1', name: 'test.pdf' }],
        saveOptions: { exportOptions: { pdf: true } }
      };

      const requests = Array.from({ length: 10 }, () => {
        const { req } = createMocks({
          method: 'POST',
          body: request,
          headers: { 'content-type': 'application/json' },
        });
        return POST(req as any);
      });

      const responses = await Promise.all(requests);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Each should have unique analysis ID
      const responseData = await Promise.all(
        responses.map(r => r.json())
      );
      
      const analysisIds = responseData.map(d => d.analysisId);
      const uniqueIds = new Set(analysisIds);
      
      expect(uniqueIds.size).toBe(analysisIds.length);
    });

    test('processes requests within reasonable time', async () => {
      const request = {
        instrumentId: 'board-pack-ai',
        goal: { id: 'test', title: 'Test' },
        assets: [{ id: '1', name: 'test.pdf' }],
        saveOptions: { exportOptions: { pdf: true } }
      };

      const { req } = createMocks({
        method: 'POST',
        body: request,
        headers: { 'content-type': 'application/json' },
      });

      const startTime = performance.now();
      const response = await POST(req as any);
      const endTime = performance.now();
      
      const processingTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});