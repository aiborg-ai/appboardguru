/**
 * Storage Service Implementation
 * Handles file storage operations using Supabase Storage
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Result } from '../../01-shared/types/core.types';
import { ResultUtils } from '../../01-shared/lib/result';
import { IStorageService } from '../../application/use-cases/assets/upload-asset.use-case';
import type { Database } from '../../types/database';

export class StorageServiceImpl implements IStorageService {
  constructor(
    private readonly supabase: SupabaseClient<Database>
  ) {}

  async uploadFile(params: {
    bucket: string;
    path: string;
    content: Buffer;
    mimeType: string;
    metadata?: Record<string, string>;
  }): Promise<Result<{ path: string; url: string }>> {
    try {
      console.log('[StorageService] Uploading file:', {
        bucket: params.bucket,
        path: params.path,
        size: params.content.length,
        mimeType: params.mimeType
      });

      // Ensure bucket exists (this is idempotent in Supabase)
      const { error: bucketError } = await this.supabase.storage.createBucket(params.bucket, {
        public: false,
        allowedMimeTypes: undefined, // Allow all mime types
        fileSizeLimit: 52428800 // 50MB
      });

      // Ignore error if bucket already exists
      if (bucketError && !bucketError.message.includes('already exists')) {
        console.error('[StorageService] Failed to create bucket:', bucketError);
        return ResultUtils.fail(new Error(`Failed to create storage bucket: ${bucketError.message}`));
      }

      // Upload the file
      const { data, error } = await this.supabase.storage
        .from(params.bucket)
        .upload(params.path, params.content, {
          contentType: params.mimeType,
          upsert: false, // Don't overwrite existing files
          cacheControl: '3600'
        });

      if (error) {
        console.error('[StorageService] Upload failed:', error);
        
        // Handle specific error cases
        if (error.message.includes('already exists')) {
          // Generate a unique path if file already exists
          const uniquePath = this.generateUniquePath(params.path);
          return this.uploadFile({ ...params, path: uniquePath });
        }
        
        return ResultUtils.fail(new Error(`Failed to upload file: ${error.message}`));
      }

      // Get the public URL (or signed URL if bucket is private)
      const { data: urlData } = this.supabase.storage
        .from(params.bucket)
        .getPublicUrl(data.path);

      console.log('[StorageService] Upload successful:', {
        path: data.path,
        url: urlData.publicUrl
      });

      return ResultUtils.ok({
        path: data.path,
        url: urlData.publicUrl
      });
    } catch (error) {
      console.error('[StorageService] Unexpected error during upload:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to upload file')
      );
    }
  }

  async generateThumbnail(params: {
    bucket: string;
    filePath: string;
    mimeType: string;
  }): Promise<Result<string>> {
    try {
      // For images, we can use Supabase's image transformation
      if (params.mimeType.startsWith('image/')) {
        const thumbnailPath = `thumbnails/${params.filePath}`;
        
        // Get the original file
        const { data: originalData, error: downloadError } = await this.supabase.storage
          .from(params.bucket)
          .download(params.filePath);

        if (downloadError) {
          console.error('[StorageService] Failed to download original for thumbnail:', downloadError);
          return ResultUtils.fail(new Error(`Failed to generate thumbnail: ${downloadError.message}`));
        }

        // For now, we'll just copy the file to thumbnails folder
        // In production, you'd use an image processing library like sharp
        const { error: uploadError } = await this.supabase.storage
          .from(params.bucket)
          .upload(thumbnailPath, originalData, {
            contentType: params.mimeType,
            upsert: true
          });

        if (uploadError) {
          console.error('[StorageService] Failed to upload thumbnail:', uploadError);
          return ResultUtils.fail(new Error(`Failed to upload thumbnail: ${uploadError.message}`));
        }

        // Get the thumbnail URL with transformation parameters
        const { data: urlData } = this.supabase.storage
          .from(params.bucket)
          .getPublicUrl(thumbnailPath, {
            transform: {
              width: 200,
              height: 200,
              resize: 'contain'
            }
          });

        return ResultUtils.ok(urlData.publicUrl);
      }

      // For PDFs, we'd need a PDF thumbnail generator
      // For now, return a placeholder or skip
      if (params.mimeType === 'application/pdf') {
        // In production, use a service like pdf-thumbnail or puppeteer
        return ResultUtils.ok('/images/pdf-placeholder.png');
      }

      // For other files, return a generic icon based on type
      return ResultUtils.ok(this.getGenericThumbnail(params.mimeType));
    } catch (error) {
      console.error('[StorageService] Failed to generate thumbnail:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to generate thumbnail')
      );
    }
  }

  async deleteFile(params: {
    bucket: string;
    path: string;
  }): Promise<Result<void>> {
    try {
      const { error } = await this.supabase.storage
        .from(params.bucket)
        .remove([params.path]);

      if (error) {
        return ResultUtils.fail(new Error(`Failed to delete file: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to delete file')
      );
    }
  }

  async getSignedUrl(params: {
    bucket: string;
    path: string;
    expiresIn: number;
  }): Promise<Result<string>> {
    try {
      const { data, error } = await this.supabase.storage
        .from(params.bucket)
        .createSignedUrl(params.path, params.expiresIn);

      if (error) {
        return ResultUtils.fail(new Error(`Failed to create signed URL: ${error.message}`));
      }

      return ResultUtils.ok(data.signedUrl);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to create signed URL')
      );
    }
  }

  async moveFile(params: {
    bucket: string;
    fromPath: string;
    toPath: string;
  }): Promise<Result<void>> {
    try {
      const { error: moveError } = await this.supabase.storage
        .from(params.bucket)
        .move(params.fromPath, params.toPath);

      if (moveError) {
        return ResultUtils.fail(new Error(`Failed to move file: ${moveError.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to move file')
      );
    }
  }

  async copyFile(params: {
    bucket: string;
    fromPath: string;
    toPath: string;
  }): Promise<Result<void>> {
    try {
      const { error } = await this.supabase.storage
        .from(params.bucket)
        .copy(params.fromPath, params.toPath);

      if (error) {
        return ResultUtils.fail(new Error(`Failed to copy file: ${error.message}`));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to copy file')
      );
    }
  }

  async listFiles(params: {
    bucket: string;
    path?: string;
    limit?: number;
    offset?: number;
  }): Promise<Result<Array<{
    name: string;
    id: string;
    updated_at: string;
    created_at: string;
    size: number;
  }>>> {
    try {
      const { data, error } = await this.supabase.storage
        .from(params.bucket)
        .list(params.path, {
          limit: params.limit || 100,
          offset: params.offset || 0
        });

      if (error) {
        return ResultUtils.fail(new Error(`Failed to list files: ${error.message}`));
      }

      return ResultUtils.ok(data || []);
    } catch (error) {
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to list files')
      );
    }
  }

  // Helper methods
  private generateUniquePath(originalPath: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    
    // Split path into directory and filename
    const lastSlashIndex = originalPath.lastIndexOf('/');
    const directory = originalPath.substring(0, lastSlashIndex);
    const filename = originalPath.substring(lastSlashIndex + 1);
    
    // Split filename into name and extension
    const lastDotIndex = filename.lastIndexOf('.');
    const name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
    const extension = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';
    
    // Generate unique filename
    const uniqueFilename = `${name}_${timestamp}_${random}${extension}`;
    
    return directory ? `${directory}/${uniqueFilename}` : uniqueFilename;
  }

  private getGenericThumbnail(mimeType: string): string {
    // Return generic thumbnails based on file type
    if (mimeType.startsWith('text/')) {
      return '/images/text-file-icon.png';
    }
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
      return '/images/excel-file-icon.png';
    }
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      return '/images/ppt-file-icon.png';
    }
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return '/images/word-file-icon.png';
    }
    if (mimeType.includes('zip') || mimeType.includes('compress')) {
      return '/images/archive-file-icon.png';
    }
    
    return '/images/generic-file-icon.png';
  }
}