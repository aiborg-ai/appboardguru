/**
 * Storage Service Interface
 * Defines the contract for file storage operations
 */

import { Result } from '@/01-shared/types/core.types';

export interface IStorageService {
  /**
   * Upload a file to storage
   */
  uploadFile(
    file: File,
    path: string,
    options?: {
      contentType?: string;
      upsert?: boolean;
    }
  ): Promise<Result<{ url: string; path: string }>>;

  /**
   * Delete a file from storage
   */
  deleteFile(path: string): Promise<Result<void>>;

  /**
   * Get public URL for a file
   */
  getFileUrl(path: string): Promise<Result<string>>;

  /**
   * Move a file to a new location
   */
  moveFile(oldPath: string, newPath: string): Promise<Result<void>>;

  /**
   * Copy a file to a new location
   */
  copyFile(sourcePath: string, destinationPath: string): Promise<Result<void>>;

  /**
   * List files in a directory
   */
  listFiles(
    path: string,
    options?: {
      limit?: number;
      offset?: number;
      sortBy?: { column: string; order: 'asc' | 'desc' };
    }
  ): Promise<Result<{ name: string; size: number; updatedAt: Date }[]>>;

  /**
   * Get file metadata
   */
  getFileMetadata(path: string): Promise<Result<{
    size: number;
    contentType: string;
    lastModified: Date;
  }>>;

  /**
   * Create a signed URL for temporary access
   */
  createSignedUrl(
    path: string,
    expiresIn?: number
  ): Promise<Result<string>>;
}