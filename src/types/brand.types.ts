/**
 * Branded Types for Better Type Safety
 * Using nominal typing to prevent mixing of different ID types
 */

// Base brand utility type
declare const __brand: unique symbol;
type Brand<B> = { readonly [__brand]: B };

// Branded ID types
export type UserId = string & Brand<'UserId'>;
export type OrganizationId = string & Brand<'OrganizationId'>;
export type VaultId = string & Brand<'VaultId'>;
export type AssetId = string & Brand<'AssetId'>;
export type BoardId = string & Brand<'BoardId'>;
export type NotificationId = string & Brand<'NotificationId'>;
export type SessionId = string & Brand<'SessionId'>;
export type InvitationId = string & Brand<'InvitationId'>;
export type AnnotationId = string & Brand<'AnnotationId'>;

// Branded utility types
export type Email = string & Brand<'Email'>;
export type Slug = string & Brand<'Slug'>;
export type Url = string & Brand<'Url'>;
export type FilePath = string & Brand<'FilePath'>;
export type MimeType = string & Brand<'MimeType'>;
export type JsonString = string & Brand<'JsonString'>;
export type ISODateString = string & Brand<'ISODateString'>;
export type JWT = string & Brand<'JWT'>;
export type ApiKey = string & Brand<'ApiKey'>;

// Branded number types
export type Percentage = number & Brand<'Percentage'>;
export type FileSize = number & Brand<'FileSize'>;
export type Timestamp = number & Brand<'Timestamp'>;
export type Port = number & Brand<'Port'>;
export type Version = number & Brand<'Version'>;

// Type guards and constructors
export const createUserId = (id: string): UserId => {
  if (!isValidUUID(id)) throw new Error('Invalid UUID format for UserId');
  return id as UserId;
};

export const createOrganizationId = (id: string): OrganizationId => {
  if (!isValidUUID(id)) throw new Error('Invalid UUID format for OrganizationId');
  return id as OrganizationId;
};

export const createVaultId = (id: string): VaultId => {
  if (!isValidUUID(id)) throw new Error('Invalid UUID format for VaultId');
  return id as VaultId;
};

export const createAssetId = (id: string): AssetId => {
  if (!isValidUUID(id)) throw new Error('Invalid UUID format for AssetId');
  return id as AssetId;
};

export const createEmail = (email: string): Email => {
  if (!isValidEmail(email)) throw new Error('Invalid email format');
  return email as Email;
};

export const createSlug = (slug: string): Slug => {
  if (!isValidSlug(slug)) throw new Error('Invalid slug format');
  return slug as Slug;
};

export const createUrl = (url: string): Url => {
  try {
    new URL(url);
    return url as Url;
  } catch {
    throw new Error('Invalid URL format');
  }
};

export const createPercentage = (value: number): Percentage => {
  if (value < 0 || value > 100) throw new Error('Percentage must be between 0 and 100');
  return value as Percentage;
};

export const createFileSize = (size: number): FileSize => {
  if (size < 0) throw new Error('File size cannot be negative');
  return size as FileSize;
};

export const createISODateString = (date: string | Date): ISODateString => {
  const dateString = typeof date === 'string' ? date : date.toISOString();
  if (!isValidISODate(dateString)) throw new Error('Invalid ISO date string');
  return dateString as ISODateString;
};

// Validation utilities
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

function isValidISODate(date: string): boolean {
  return !isNaN(Date.parse(date)) && date.includes('T') && date.includes('Z');
}

// Type predicate helpers
export const isUserId = (id: string): id is UserId => isValidUUID(id);
export const isOrganizationId = (id: string): id is OrganizationId => isValidUUID(id);
export const isVaultId = (id: string): id is VaultId => isValidUUID(id);
export const isAssetId = (id: string): id is AssetId => isValidUUID(id);
export const isEmail = (email: string): email is Email => isValidEmail(email);
export const isSlug = (slug: string): slug is Slug => isValidSlug(slug);
export const isUrl = (url: string): url is Url => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Utility types for working with branded types
export type ExtractBrand<T> = T extends string & Brand<infer B> ? B : never;
export type UnBrand<T> = T extends string & Brand<unknown> ? string : T;