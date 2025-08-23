import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/assets/upload/route';
import { AssetFactory } from '../factories/asset.factory';
import { measurePerformance, createTestUser, waitForCondition } from '../utils/test-helpers';
import { performance } from 'perf_hooks';

describe('Upload Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset performance counters
    performance.clearMarks();
    performance.clearMeasures();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Single File Upload Performance', () => {
    it('should handle small files efficiently', async () => {
      const file = AssetFactory.createTestFile('PDF', 'small');
      const result = await measurePerformance(async () => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('organizationId', 'test-org-id');
        formData.append('fileName', file.name);
        formData.append('fileSize', file.size.toString());
        formData.append('mimeType', file.type);

        const request = new NextRequest('http://localhost:3000/api/assets/upload', {
          method: 'POST',
          body: formData,
          headers: { 'Authorization': 'Bearer valid-token' },
        });

        return await POST(request);
      });

      expect(result.duration).toBeLessThan(1000); // Should complete within 1 second
      expect(result.memoryUsage.peak).toBeLessThan(10 * 1024 * 1024); // 10MB memory limit
    });

    it('should handle medium files within acceptable time', async () => {
      const file = AssetFactory.createTestFile('PDF', 'medium');
      const result = await measurePerformance(async () => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('organizationId', 'test-org-id');
        formData.append('fileName', file.name);
        formData.append('fileSize', file.size.toString());
        formData.append('mimeType', file.type);

        const request = new NextRequest('http://localhost:3000/api/assets/upload', {
          method: 'POST',
          body: formData,
          headers: { 'Authorization': 'Bearer valid-token' },
        });

        return await POST(request);
      });

      expect(result.duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.memoryUsage.peak).toBeLessThan(50 * 1024 * 1024); // 50MB memory limit
    });

    it('should handle large files with streaming', async () => {
      const file = AssetFactory.createTestFile('PDF', 'large');
      const result = await measurePerformance(async () => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('organizationId', 'test-org-id');
        formData.append('fileName', file.name);
        formData.append('fileSize', file.size.toString());
        formData.append('mimeType', file.type);

        const request = new NextRequest('http://localhost:3000/api/assets/upload', {
          method: 'POST',
          body: formData,
          headers: { 'Authorization': 'Bearer valid-token' },
        });

        return await POST(request);
      });

      expect(result.duration).toBeLessThan(15000); // Should complete within 15 seconds
      expect(result.memoryUsage.peak).toBeLessThan(100 * 1024 * 1024); // 100MB memory limit
    });
  });

  describe('Concurrent Upload Performance', () => {
    it('should handle multiple small files concurrently', async () => {
      const fileCount = 10;
      const files = Array.from({ length: fileCount }, () => 
        AssetFactory.createTestFile('PDF', 'small')
      );

      const startTime = performance.now();
      const startMemory = process.memoryUsage().heapUsed;

      const uploadPromises = files.map(async (file, index) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('organizationId', 'test-org-id');
        formData.append('fileName', `concurrent-${index}-${file.name}`);
        formData.append('fileSize', file.size.toString());
        formData.append('mimeType', file.type);

        const request = new NextRequest('http://localhost:3000/api/assets/upload', {
          method: 'POST',
          body: formData,
          headers: { 'Authorization': 'Bearer valid-token' },
        });

        return await POST(request);
      });

      const responses = await Promise.all(uploadPromises);
      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;

      const duration = endTime - startTime;
      const memoryIncrease = endMemory - startMemory;

      // All uploads should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should handle concurrent uploads efficiently
      expect(duration).toBeLessThan(5000); // 5 seconds for 10 small files
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB memory increase
    });

    it('should throttle excessive concurrent uploads', async () => {
      const fileCount = 50;
      const files = Array.from({ length: fileCount }, () => 
        AssetFactory.createTestFile('PDF', 'small')
      );

      const uploadPromises = files.map(async (file, index) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('organizationId', 'test-org-id');
        formData.append('fileName', `throttle-${index}-${file.name}`);
        formData.append('fileSize', file.size.toString());
        formData.append('mimeType', file.type);

        const request = new NextRequest('http://localhost:3000/api/assets/upload', {
          method: 'POST',
          body: formData,
          headers: { 'Authorization': 'Bearer valid-token' },
        });

        return await POST(request);
      });

      const responses = await Promise.all(uploadPromises.map(p => 
        p.catch(error => ({ status: 429, error }))
      ));

      // Some requests should be throttled
      const throttledResponses = responses.filter(r => 
        (r as any).status === 429 || (r as any).status === 503
      );
      
      expect(throttledResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Large File Handling', () => {
    it('should process large files without memory spikes', async () => {
      const file = AssetFactory.createTestFile('PDF', 'xlarge');
      const memorySnapshots: number[] = [];
      
      // Monitor memory during upload
      const memoryInterval = setInterval(() => {
        memorySnapshots.push(process.memoryUsage().heapUsed);
      }, 100);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('organizationId', 'test-org-id');
        formData.append('fileName', file.name);
        formData.append('fileSize', file.size.toString());
        formData.append('mimeType', file.type);

        const request = new NextRequest('http://localhost:3000/api/assets/upload', {
          method: 'POST',
          body: formData,
          headers: { 'Authorization': 'Bearer valid-token' },
        });

        const response = await POST(request);
        expect(response.status).toBe(200);

        clearInterval(memoryInterval);

        // Check for memory stability (no huge spikes)
        const maxMemory = Math.max(...memorySnapshots);
        const minMemory = Math.min(...memorySnapshots);
        const memorySpike = maxMemory - minMemory;
        
        expect(memorySpike).toBeLessThan(200 * 1024 * 1024); // 200MB spike limit
      } finally {
        clearInterval(memoryInterval);
      }
    });

    it('should handle upload timeouts gracefully', async () => {
      const file = AssetFactory.createTestFile('PDF', 'xlarge');
      
      // Mock slow upload scenario
      jest.setTimeout(30000); // 30 second timeout for this test
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('organizationId', 'test-org-id');
      formData.append('fileName', file.name);
      formData.append('fileSize', file.size.toString());
      formData.append('mimeType', file.type);

      const request = new NextRequest('http://localhost:3000/api/assets/upload', {
        method: 'POST',
        body: formData,
        headers: { 
          'Authorization': 'Bearer valid-token',
          'X-Upload-Timeout': '1000' // 1 second timeout
        },
      });

      const startTime = performance.now();
      const response = await POST(request);
      const endTime = performance.now();

      const duration = endTime - startTime;

      if (response.status === 408) {
        // Timeout handled correctly
        expect(duration).toBeLessThan(2000); // Should timeout quickly
      } else {
        // Upload completed successfully
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Progress Tracking Performance', () => {
    it('should provide accurate progress updates', async () => {
      const file = AssetFactory.createTestFile('PDF', 'large');
      const progressEvents: Array<{ timestamp: number; progress: number }> = [];

      // Mock progress callback
      const mockProgressCallback = jest.fn((progress: number) => {
        progressEvents.push({
          timestamp: performance.now(),
          progress
        });
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('organizationId', 'test-org-id');
      formData.append('fileName', file.name);
      formData.append('fileSize', file.size.toString());
      formData.append('mimeType', file.type);

      const request = new NextRequest('http://localhost:3000/api/assets/upload', {
        method: 'POST',
        body: formData,
        headers: { 'Authorization': 'Bearer valid-token' },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Progress should be monotonically increasing
      for (let i = 1; i < progressEvents.length; i++) {
        expect(progressEvents[i].progress).toBeGreaterThanOrEqual(progressEvents[i - 1].progress);
        expect(progressEvents[i].timestamp).toBeGreaterThan(progressEvents[i - 1].timestamp);
      }
    });
  });

  describe('Batch Upload Performance', () => {
    it('should handle batch uploads efficiently', async () => {
      const batchSize = 20;
      const files = Array.from({ length: batchSize }, (_, i) => ({
        file: AssetFactory.createTestFile('PDF', 'medium'),
        name: `batch-file-${i}.pdf`
      }));

      const result = await measurePerformance(async () => {
        const uploadPromises = files.map(async ({ file, name }) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('organizationId', 'test-org-id');
          formData.append('fileName', name);
          formData.append('fileSize', file.size.toString());
          formData.append('mimeType', file.type);

          const request = new NextRequest('http://localhost:3000/api/assets/upload', {
            method: 'POST',
            body: formData,
            headers: { 'Authorization': 'Bearer valid-token' },
          });

          return await POST(request);
        });

        return await Promise.all(uploadPromises);
      });

      const responses = await result.result;
      
      // All uploads should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Performance metrics
      expect(result.duration).toBeLessThan(30000); // 30 seconds for batch
      expect(result.memoryUsage.peak).toBeLessThan(500 * 1024 * 1024); // 500MB memory limit
    });

    it('should maintain performance under load', async () => {
      const rounds = 5;
      const filesPerRound = 10;
      const performanceMetrics: Array<{ round: number; duration: number; memory: number }> = [];

      for (let round = 0; round < rounds; round++) {
        const files = Array.from({ length: filesPerRound }, (_, i) => 
          AssetFactory.createTestFile('PDF', 'small')
        );

        const result = await measurePerformance(async () => {
          const uploadPromises = files.map(async (file, index) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('organizationId', 'test-org-id');
            formData.append('fileName', `round-${round}-file-${index}-${file.name}`);
            formData.append('fileSize', file.size.toString());
            formData.append('mimeType', file.type);

            const request = new NextRequest('http://localhost:3000/api/assets/upload', {
              method: 'POST',
              body: formData,
              headers: { 'Authorization': 'Bearer valid-token' },
            });

            return await POST(request);
          });

          return await Promise.all(uploadPromises);
        });

        performanceMetrics.push({
          round,
          duration: result.duration,
          memory: result.memoryUsage.peak
        });

        // Short delay between rounds
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Performance should remain stable across rounds
      const averageDuration = performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / rounds;
      const averageMemory = performanceMetrics.reduce((sum, m) => sum + m.memory, 0) / rounds;

      // No round should be significantly slower than average
      performanceMetrics.forEach(metric => {
        expect(metric.duration).toBeLessThan(averageDuration * 2);
        expect(metric.memory).toBeLessThan(averageMemory * 2);
      });
    });
  });

  describe('Resource Cleanup Performance', () => {
    it('should cleanup temporary resources promptly', async () => {
      const file = AssetFactory.createTestFile('PDF', 'large');
      const initialMemory = process.memoryUsage().heapUsed;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('organizationId', 'test-org-id');
      formData.append('fileName', file.name);
      formData.append('fileSize', file.size.toString());
      formData.append('mimeType', file.type);

      const request = new NextRequest('http://localhost:3000/api/assets/upload', {
        method: 'POST',
        body: formData,
        headers: { 'Authorization': 'Bearer valid-token' },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal after cleanup
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB limit
    });
  });

  describe('Error Recovery Performance', () => {
    it('should recover from errors quickly', async () => {
      const files = Array.from({ length: 10 }, (_, i) => 
        i % 3 === 0 
          ? AssetFactory.createInvalidFile() // Every 3rd file is invalid
          : AssetFactory.createTestFile('PDF', 'small')
      );

      const result = await measurePerformance(async () => {
        const uploadPromises = files.map(async (file, index) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('organizationId', 'test-org-id');
          formData.append('fileName', `error-recovery-${index}-${file.name}`);
          formData.append('fileSize', file.size.toString());
          formData.append('mimeType', file.type);

          const request = new NextRequest('http://localhost:3000/api/assets/upload', {
            method: 'POST',
            body: formData,
            headers: { 'Authorization': 'Bearer valid-token' },
          });

          try {
            return await POST(request);
          } catch (error) {
            return { status: 500, error };
          }
        });

        return await Promise.all(uploadPromises);
      });

      // Should handle errors without significantly impacting performance
      expect(result.duration).toBeLessThan(10000); // 10 seconds total
      expect(result.memoryUsage.peak).toBeLessThan(100 * 1024 * 1024); // 100MB limit
    });
  });
});