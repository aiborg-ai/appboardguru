/**
 * Storage Service Implementation
 * Handles file storage operations using Supabase Storage
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { IStorageService } from '@/application/interfaces/services/storage.service.interface';
import { Result, ResultUtils } from '@/01-shared/lib/result';

export class StorageServiceImpl implements IStorageService {
  private readonly bucketName = 'assets';

  constructor(private readonly supabase: SupabaseClient) {}

  async uploadFile(
    file: File,
    path: string,
    options?: { 
      contentType?: string;
      upsert?: boolean;
    }
  ): Promise<Result<{ url: string; path: string }>> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(path, file, {
          contentType: options?.contentType || file.type,
          upsert: options?.upsert || false
        });

      if (error) {
        console.error('[StorageService] Upload error:', error);
        return ResultUtils.fail(new Error(error.message));
      }

      // Get public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(data.path);

      return ResultUtils.ok({
        url: publicUrl,
        path: data.path
      });
    } catch (error) {
      console.error('[StorageService] Unexpected upload error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to upload file')
      );
    }
  }

  async deleteFile(path: string): Promise<Result<void>> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([path]);

      if (error) {
        console.error('[StorageService] Delete error:', error);
        return ResultUtils.fail(new Error(error.message));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[StorageService] Unexpected delete error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to delete file')
      );
    }
  }

  async getFileUrl(path: string): Promise<Result<string>> {
    try {
      const { data } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(path);

      return ResultUtils.ok(data.publicUrl);
    } catch (error) {
      console.error('[StorageService] Unexpected getUrl error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get file URL')
      );
    }
  }

  async moveFile(oldPath: string, newPath: string): Promise<Result<void>> {
    try {
      const { error: moveError } = await this.supabase.storage
        .from(this.bucketName)
        .move(oldPath, newPath);

      if (moveError) {
        console.error('[StorageService] Move error:', moveError);
        return ResultUtils.fail(new Error(moveError.message));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[StorageService] Unexpected move error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to move file')
      );
    }
  }

  async copyFile(sourcePath: string, destinationPath: string): Promise<Result<void>> {
    try {
      const { error: copyError } = await this.supabase.storage
        .from(this.bucketName)
        .copy(sourcePath, destinationPath);

      if (copyError) {
        console.error('[StorageService] Copy error:', copyError);
        return ResultUtils.fail(new Error(copyError.message));
      }

      return ResultUtils.ok(undefined);
    } catch (error) {
      console.error('[StorageService] Unexpected copy error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to copy file')
      );
    }
  }

  async listFiles(
    path: string,
    options?: {
      limit?: number;
      offset?: number;
      sortBy?: { column: string; order: 'asc' | 'desc' };
    }
  ): Promise<Result<{ name: string; size: number; updatedAt: Date }[]>> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list(path, {
          limit: options?.limit || 100,
          offset: options?.offset || 0,
          sortBy: options?.sortBy
        });

      if (error) {
        console.error('[StorageService] List error:', error);
        return ResultUtils.fail(new Error(error.message));
      }

      const files = (data || []).map(file => ({
        name: file.name,
        size: file.metadata?.size || 0,
        updatedAt: new Date(file.updated_at || file.created_at)
      }));

      return ResultUtils.ok(files);
    } catch (error) {
      console.error('[StorageService] Unexpected list error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to list files')
      );
    }
  }

  async getFileMetadata(path: string): Promise<Result<{
    size: number;
    contentType: string;
    lastModified: Date;
  }>> {
    try {
      // Supabase doesn't provide direct metadata access, so we'll use list
      const pathParts = path.split('/');
      const fileName = pathParts.pop();
      const folderPath = pathParts.join('/');

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list(folderPath, {
          limit: 1000
        });

      if (error) {
        console.error('[StorageService] Metadata error:', error);
        return ResultUtils.fail(new Error(error.message));
      }

      const file = data?.find(f => f.name === fileName);
      if (!file) {
        return ResultUtils.fail(new Error('File not found'));
      }

      return ResultUtils.ok({
        size: file.metadata?.size || 0,
        contentType: file.metadata?.mimetype || 'application/octet-stream',
        lastModified: new Date(file.updated_at || file.created_at)
      });
    } catch (error) {
      console.error('[StorageService] Unexpected metadata error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to get file metadata')
      );
    }
  }

  async createSignedUrl(
    path: string,
    expiresIn: number = 3600
  ): Promise<Result<string>> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .createSignedUrl(path, expiresIn);

      if (error) {
        console.error('[StorageService] Signed URL error:', error);
        return ResultUtils.fail(new Error(error.message));
      }

      if (!data?.signedUrl) {
        return ResultUtils.fail(new Error('Failed to create signed URL'));
      }

      return ResultUtils.ok(data.signedUrl);
    } catch (error) {
      console.error('[StorageService] Unexpected signed URL error:', error);
      return ResultUtils.fail(
        error instanceof Error ? error : new Error('Failed to create signed URL')
      );
    }
  }
}