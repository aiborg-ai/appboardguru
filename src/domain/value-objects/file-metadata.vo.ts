/**
 * FileMetadata Value Object
 * Immutable object representing file metadata with validation rules
 */

import { Result } from '../../01-shared/types/core.types';
import { ResultUtils } from '../../01-shared/lib/result';

export interface FileMetadataProps {
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileType: string;
  filePath?: string;
  thumbnailUrl?: string;
  checksum?: string;
  originalFileName?: string;
  storageBucket?: string;
}

export class FileMetadata {
  private readonly props: Readonly<FileMetadataProps>;

  // File size limits
  private static readonly MIN_FILE_SIZE = 1; // 1 byte
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  // Allowed MIME types
  private static readonly ALLOWED_MIME_TYPES = new Set([
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/rtf',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
    
    // Text
    'text/plain',
    'text/csv',
    'text/html',
    'text/markdown',
    
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    
    // Archives (for document packages)
    'application/zip',
    'application/x-rar-compressed'
  ]);

  private constructor(props: FileMetadataProps) {
    this.props = Object.freeze(props);
  }

  static create(props: FileMetadataProps): Result<FileMetadata> {
    // Validate file name
    const fileNameValidation = this.validateFileName(props.fileName);
    if (!fileNameValidation.success) {
      return fileNameValidation;
    }

    // Validate file size
    const fileSizeValidation = this.validateFileSize(props.fileSize);
    if (!fileSizeValidation.success) {
      return fileSizeValidation;
    }

    // Validate MIME type
    const mimeTypeValidation = this.validateMimeType(props.mimeType);
    if (!mimeTypeValidation.success) {
      return mimeTypeValidation;
    }

    // Extract file type from file name if not provided
    let fileType = props.fileType;
    if (!fileType) {
      const lastDotIndex = props.fileName.lastIndexOf('.');
      fileType = lastDotIndex > 0 
        ? props.fileName.substring(lastDotIndex + 1).toLowerCase()
        : 'unknown';
    }

    // Sanitize file path
    const sanitizedFilePath = props.filePath 
      ? this.sanitizeFilePath(props.filePath)
      : undefined;

    const metadata = new FileMetadata({
      ...props,
      fileName: this.sanitizeFileName(props.fileName),
      fileType,
      filePath: sanitizedFilePath,
      originalFileName: props.originalFileName || props.fileName
    });

    return ResultUtils.ok(metadata);
  }

  private static validateFileName(fileName: string): Result<void> {
    if (!fileName || fileName.trim().length === 0) {
      return ResultUtils.fail(new Error('File name is required'));
    }

    if (fileName.length > 255) {
      return ResultUtils.fail(new Error('File name must be less than 255 characters'));
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /\.\./,  // Directory traversal
      /^\./, // Hidden files
      /[\0]/, // Null bytes
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(fileName)) {
        return ResultUtils.fail(new Error('File name contains invalid characters'));
      }
    }

    return ResultUtils.ok(undefined);
  }

  private static validateFileSize(fileSize: number): Result<void> {
    if (!Number.isInteger(fileSize)) {
      return ResultUtils.fail(new Error('File size must be an integer'));
    }

    if (fileSize < this.MIN_FILE_SIZE) {
      return ResultUtils.fail(new Error('File size must be greater than 0'));
    }

    if (fileSize > this.MAX_FILE_SIZE) {
      return ResultUtils.fail(new Error(`File size exceeds maximum limit of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`));
    }

    return ResultUtils.ok(undefined);
  }

  private static validateMimeType(mimeType: string): Result<void> {
    if (!mimeType || mimeType.trim().length === 0) {
      return ResultUtils.fail(new Error('MIME type is required'));
    }

    const normalizedMimeType = mimeType.toLowerCase().trim();
    
    if (!this.ALLOWED_MIME_TYPES.has(normalizedMimeType)) {
      return ResultUtils.fail(new Error(`File type '${mimeType}' is not allowed`));
    }

    return ResultUtils.ok(undefined);
  }

  private static sanitizeFileName(fileName: string): string {
    // Remove or replace dangerous characters
    return fileName
      .trim()
      .replace(/[<>:"|?*\\\/]/g, '_') // Replace filesystem-unsafe characters
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\s+/g, '_'); // Replace spaces with underscores
  }

  private static sanitizeFilePath(filePath: string): string {
    // Remove leading/trailing slashes and normalize
    return filePath
      .replace(/^\/+|\/+$/g, '')
      .replace(/\/+/g, '/')
      .replace(/\.\./g, '') // Remove directory traversal attempts
      .replace(/[<>"|?*\\]/g, '_'); // Replace unsafe characters
  }

  // Getters
  get fileName(): string {
    return this.props.fileName;
  }

  get fileSize(): number {
    return this.props.fileSize;
  }

  get mimeType(): string {
    return this.props.mimeType;
  }

  get fileType(): string {
    return this.props.fileType;
  }

  get filePath(): string | undefined {
    return this.props.filePath;
  }

  get thumbnailUrl(): string | undefined {
    return this.props.thumbnailUrl;
  }

  get checksum(): string | undefined {
    return this.props.checksum;
  }

  get originalFileName(): string | undefined {
    return this.props.originalFileName;
  }

  get storageBucket(): string | undefined {
    return this.props.storageBucket;
  }

  // Utility methods
  get fileSizeInKB(): number {
    return Math.round(this.props.fileSize / 1024);
  }

  get fileSizeInMB(): number {
    return Math.round(this.props.fileSize / (1024 * 1024) * 100) / 100;
  }

  get formattedFileSize(): string {
    const size = this.props.fileSize;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${this.fileSizeInKB} KB`;
    return `${this.fileSizeInMB} MB`;
  }

  get isImage(): boolean {
    return this.props.mimeType.startsWith('image/');
  }

  get isPDF(): boolean {
    return this.props.mimeType === 'application/pdf';
  }

  get isDocument(): boolean {
    return this.props.mimeType.startsWith('application/') || 
           this.props.mimeType.startsWith('text/');
  }

  // Equality check
  equals(other: FileMetadata): boolean {
    return this.props.fileName === other.fileName &&
           this.props.fileSize === other.fileSize &&
           this.props.mimeType === other.mimeType &&
           this.props.checksum === other.checksum;
  }

  // Create a copy with updates
  withUpdates(updates: Partial<FileMetadataProps>): Result<FileMetadata> {
    return FileMetadata.create({
      ...this.props,
      ...updates
    });
  }

  // Serialization
  toJSON(): FileMetadataProps {
    return { ...this.props };
  }
}