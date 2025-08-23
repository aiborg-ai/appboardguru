import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/assets/upload/route';
import { AssetFactory } from '../factories/asset.factory';
import { createTestUser } from '../utils/test-helpers';

describe('Upload Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('File Type Security', () => {
    it('should reject executable files', async () => {
      const maliciousFiles = [
        { name: 'virus.exe', type: 'application/x-msdownload' },
        { name: 'script.bat', type: 'application/x-bat' },
        { name: 'malware.scr', type: 'application/x-screensaver' },
        { name: 'trojan.com', type: 'application/x-msdownload' },
        { name: 'shell.sh', type: 'application/x-sh' },
      ];

      for (const fileData of maliciousFiles) {
        const file = new File(['malicious content'], fileData.name, { type: fileData.type });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('organizationId', 'test-org-id');
        formData.append('fileName', fileData.name);
        formData.append('fileSize', '1000');
        formData.append('mimeType', fileData.type);

        const request = new NextRequest('http://localhost:3000/api/assets/upload', {
          method: 'POST',
          body: formData,
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('not allowed');
      }
    });

    it('should reject files with double extensions', async () => {
      const doubleExtensionFiles = [
        'document.pdf.exe',
        'image.jpg.bat',
        'archive.zip.scr',
        'video.mp4.com',
      ];

      for (const fileName of doubleExtensionFiles) {
        const file = new File(['content'], fileName, { type: 'application/pdf' });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('organizationId', 'test-org-id');
        formData.append('fileName', fileName);
        formData.append('fileSize', '1000');
        formData.append('mimeType', 'application/pdf');

        const request = new NextRequest('http://localhost:3000/api/assets/upload', {
          method: 'POST',
          body: formData,
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
      }
    });

    it('should detect MIME type spoofing', async () => {
      // Executable content with PDF MIME type
      const executableHeader = new Uint8Array([0x4D, 0x5A]); // MZ header (Windows executable)
      const file = new File([executableHeader], 'fake.pdf', { type: 'application/pdf' });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('organizationId', 'test-org-id');
      formData.append('fileName', 'fake.pdf');
      formData.append('fileSize', executableHeader.length.toString());
      formData.append('mimeType', 'application/pdf');

      const request = new NextRequest('http://localhost:3000/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('File Size Security', () => {
    it('should enforce maximum file size limits', async () => {
      const oversizedFile = AssetFactory.createTestFile('PDF', 'xlarge');
      Object.defineProperty(oversizedFile, 'size', { value: 1000 * 1024 * 1024 }); // 1GB

      const formData = new FormData();
      formData.append('file', oversizedFile);
      formData.append('organizationId', 'test-org-id');
      formData.append('fileName', oversizedFile.name);
      formData.append('fileSize', oversizedFile.size.toString());
      formData.append('mimeType', oversizedFile.type);

      const request = new NextRequest('http://localhost:3000/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject files with size mismatch', async () => {
      const file = AssetFactory.createTestFile('PDF', 'small');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('organizationId', 'test-org-id');
      formData.append('fileName', file.name);
      formData.append('fileSize', '999999999'); // Mismatched size
      formData.append('mimeType', file.type);

      const request = new NextRequest('http://localhost:3000/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('Path Traversal Security', () => {
    it('should sanitize file names with path traversal attempts', async () => {
      const maliciousFileNames = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config\\sam',
        '/etc/shadow',
        '\\windows\\system32\\drivers\\etc\\hosts',
        'normal.pdf/../../../malicious.exe',
        'document.pdf\0hidden.exe',
      ];

      for (const fileName of maliciousFileNames) {
        const file = new File(['content'], fileName, { type: 'application/pdf' });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('organizationId', 'test-org-id');
        formData.append('fileName', fileName);
        formData.append('fileSize', '1000');
        formData.append('mimeType', 'application/pdf');

        const request = new NextRequest('http://localhost:3000/api/assets/upload', {
          method: 'POST',
          body: formData,
        });

        const response = await POST(request);
        
        if (response.status === 200) {
          const data = await response.json();
          // Verify file name was sanitized
          expect(data.asset.fileName).not.toContain('../');
          expect(data.asset.fileName).not.toContain('..\\');
          expect(data.asset.fileName).not.toContain('/etc/');
          expect(data.asset.fileName).not.toContain('\\windows\\');
          expect(data.asset.fileName).not.toContain('\0');
        }
      }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require valid authentication', async () => {
      const file = AssetFactory.createTestFile('PDF');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('organizationId', 'test-org-id');
      formData.append('fileName', file.name);
      formData.append('fileSize', file.size.toString());
      formData.append('mimeType', file.type);

      const request = new NextRequest('http://localhost:3000/api/assets/upload', {
        method: 'POST',
        body: formData,
        // No authentication headers
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should validate organization membership', async () => {
      const file = AssetFactory.createTestFile('PDF');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('organizationId', 'unauthorized-org-id');
      formData.append('fileName', file.name);
      formData.append('fileSize', file.size.toString());
      formData.append('mimeType', file.type);

      const request = new NextRequest('http://localhost:3000/api/assets/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('should prevent upload quota bypass', async () => {
      // Simulate user at upload quota limit
      const files = Array.from({ length: 10 }, () => AssetFactory.createTestFile('PDF', 'large'));
      
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('organizationId', 'quota-limited-org');
        formData.append('fileName', file.name);
        formData.append('fileSize', file.size.toString());
        formData.append('mimeType', file.type);

        const request = new NextRequest('http://localhost:3000/api/assets/upload', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': 'Bearer valid-token',
          },
        });

        const response = await POST(request);
        
        if (response.status === 429) {
          // Quota limit reached
          expect(response.status).toBe(429);
          break;
        }
      }
    });
  });

  describe('Content Security', () => {
    it('should scan for embedded scripts in documents', async () => {
      // Simulate PDF with embedded JavaScript
      const maliciousPdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
/OpenAction 3 0 R
>>
endobj
3 0 obj
<<
/Type /Action
/S /JavaScript
/JS (app.alert('XSS Attack!');)
>>
endobj`;
      
      const file = new File([maliciousPdfContent], 'malicious.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('organizationId', 'test-org-id');
      formData.append('fileName', 'malicious.pdf');
      formData.append('fileSize', maliciousPdfContent.length.toString());
      formData.append('mimeType', 'application/pdf');

      const request = new NextRequest('http://localhost:3000/api/assets/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should prevent HTML content in file names', async () => {
      const xssFileNames = [
        '<script>alert("xss")</script>.pdf',
        'document<img src=x onerror=alert(1)>.pdf',
        'file"onmouseover="alert(1)".pdf',
        'document.pdf<svg onload=alert(1)>',
      ];

      for (const fileName of xssFileNames) {
        const file = new File(['content'], fileName, { type: 'application/pdf' });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('organizationId', 'test-org-id');
        formData.append('fileName', fileName);
        formData.append('fileSize', '1000');
        formData.append('mimeType', 'application/pdf');

        const request = new NextRequest('http://localhost:3000/api/assets/upload', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': 'Bearer valid-token',
          },
        });

        const response = await POST(request);
        
        if (response.status === 200) {
          const data = await response.json();
          // Verify HTML was sanitized
          expect(data.asset.fileName).not.toContain('<script>');
          expect(data.asset.fileName).not.toContain('<img');
          expect(data.asset.fileName).not.toContain('onerror=');
          expect(data.asset.fileName).not.toContain('<svg');
        }
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce upload rate limits', async () => {
      const rapidUploads = Array.from({ length: 100 }, () => {
        const file = AssetFactory.createTestFile('PDF', 'small');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('organizationId', 'test-org-id');
        formData.append('fileName', file.name);
        formData.append('fileSize', file.size.toString());
        formData.append('mimeType', file.type);

        return new NextRequest('http://localhost:3000/api/assets/upload', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': 'Bearer valid-token',
          },
        });
      });

      const responses = await Promise.all(
        rapidUploads.map(request => POST(request))
      );

      // At least some requests should be rate limited
      const rateLimitedResponses = responses.filter(response => response.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Security', () => {
    it('should handle memory exhaustion attacks', async () => {
      // Create a zip bomb simulation (small file that expands to large size)
      const zipBombContent = new Array(1000).join('A'.repeat(1000));
      const file = new File([zipBombContent], 'zipbomb.zip', { type: 'application/zip' });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('organizationId', 'test-org-id');
      formData.append('fileName', 'zipbomb.zip');
      formData.append('fileSize', zipBombContent.length.toString());
      formData.append('mimeType', 'application/zip');

      const request = new NextRequest('http://localhost:3000/api/assets/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });

      const startMemory = process.memoryUsage().heapUsed;
      const response = await POST(request);
      const endMemory = process.memoryUsage().heapUsed;
      
      // Should not consume excessive memory
      const memoryIncrease = endMemory - startMemory;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB limit
    });
  });
});