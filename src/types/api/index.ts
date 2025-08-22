/**
 * API Contract Types
 * Type-safe definitions for all API requests and responses
 */

import type { z } from 'zod'
import type {
  UserId,
  OrganizationId,
  AssetId,
  VaultId,
  AnnotationId,
  BoardMateId,
  APIResponse,
  PaginatedResponse,
  PaginationParams,
  SortParams,
  FilterParams,
  ISODateString
} from '../core'

// Base API types
export interface APIRequest<TBody = unknown, TQuery = unknown> {
  readonly body?: TBody
  readonly query?: TQuery
  readonly params?: Record<string, string>
  readonly headers?: Record<string, string>
}

export interface AuthenticatedRequest<TBody = unknown, TQuery = unknown> extends APIRequest<TBody, TQuery> {
  readonly user: {
    readonly id: UserId
    readonly email: string
    readonly full_name?: string
    readonly organization_id?: OrganizationId
  }
}

// Zod schema inference helper
export type InferZodType<T> = T extends z.ZodType<infer U> ? U : never

// Organization API Types
export namespace OrganizationAPI {
  export interface CreateRequest {
    readonly name: string
    readonly slug: string
    readonly description?: string
    readonly logo_url?: string
    readonly website?: string
    readonly industry?: string
    readonly organization_size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
  }

  export interface UpdateRequest extends Partial<CreateRequest> {
    readonly id: OrganizationId
  }

  export interface ListQuery extends PaginationParams, FilterParams {
    readonly search?: string
    readonly status?: 'active' | 'inactive'
    readonly created_by?: UserId
    readonly sort_by?: 'name' | 'created_at' | 'updated_at'
    readonly sort_order?: 'asc' | 'desc'
  }

  export interface Organization {
    readonly id: OrganizationId
    readonly name: string
    readonly slug: string
    readonly description: string | null
    readonly logo_url: string | null
    readonly website: string | null
    readonly industry: string | null
    readonly organization_size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise' | null
    readonly created_by: UserId
    readonly created_at: ISODateString
    readonly updated_at: ISODateString
    readonly is_active: boolean
    readonly member_count?: number
  }

  export type CreateResponse = APIResponse<Organization>
  export type GetResponse = APIResponse<Organization>
  export type UpdateResponse = APIResponse<Organization>
  export type ListResponse = APIResponse<PaginatedResponse<Organization>>
  export type DeleteResponse = APIResponse<{ message: string }>
}

// Asset API Types
export namespace AssetAPI {
  export interface UploadRequest {
    readonly file: File
    readonly vault_id: VaultId
    readonly title?: string
    readonly description?: string
    readonly category?: string
    readonly tags?: readonly string[]
  }

  export interface UpdateRequest {
    readonly id: AssetId
    readonly title?: string
    readonly description?: string
    readonly category?: string
    readonly tags?: readonly string[]
  }

  export interface ListQuery extends PaginationParams, FilterParams {
    readonly vault_id?: VaultId
    readonly category?: string
    readonly search?: string
    readonly tags?: readonly string[]
    readonly file_type?: string
    readonly sort_by?: 'title' | 'created_at' | 'updated_at' | 'file_size'
    readonly sort_order?: 'asc' | 'desc'
  }

  export interface Asset {
    readonly id: AssetId
    readonly title: string
    readonly description: string | null
    readonly file_name: string
    readonly file_type: string
    readonly file_size: number
    readonly file_url: string
    readonly thumbnail_url: string | null
    readonly category: string | null
    readonly tags: readonly string[]
    readonly vault_id: VaultId
    readonly uploaded_by: UserId
    readonly created_at: ISODateString
    readonly updated_at: ISODateString
    readonly processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  }

  export type UploadResponse = APIResponse<Asset>
  export type GetResponse = APIResponse<Asset>
  export type UpdateResponse = APIResponse<Asset>
  export type ListResponse = APIResponse<PaginatedResponse<Asset>>
  export type DeleteResponse = APIResponse<{ message: string }>
}

// Vault API Types
export namespace VaultAPI {
  export interface CreateRequest {
    readonly name: string
    readonly description?: string
    readonly organization_id: OrganizationId
    readonly is_public: boolean
    readonly permissions?: Record<UserId, 'read' | 'write' | 'admin'>
  }

  export interface UpdateRequest extends Partial<CreateRequest> {
    readonly id: VaultId
  }

  export interface ListQuery extends PaginationParams, FilterParams {
    readonly organization_id?: OrganizationId
    readonly is_public?: boolean
    readonly search?: string
    readonly sort_by?: 'name' | 'created_at' | 'updated_at'
    readonly sort_order?: 'asc' | 'desc'
  }

  export interface Vault {
    readonly id: VaultId
    readonly name: string
    readonly description: string | null
    readonly organization_id: OrganizationId
    readonly is_public: boolean
    readonly created_by: UserId
    readonly created_at: ISODateString
    readonly updated_at: ISODateString
    readonly asset_count?: number
  }

  export type CreateResponse = APIResponse<Vault>
  export type GetResponse = APIResponse<Vault>
  export type UpdateResponse = APIResponse<Vault>
  export type ListResponse = APIResponse<PaginatedResponse<Vault>>
  export type DeleteResponse = APIResponse<{ message: string }>
}

// Annotation API Types
export namespace AnnotationAPI {
  export interface CreateRequest {
    readonly asset_id: AssetId
    readonly content: string
    readonly annotation_type: 'text' | 'highlight' | 'comment' | 'note'
    readonly position?: {
      readonly x: number
      readonly y: number
      readonly width?: number
      readonly height?: number
      readonly page?: number
    }
    readonly parent_id?: AnnotationId
  }

  export interface UpdateRequest {
    readonly id: AnnotationId
    readonly content?: string
    readonly position?: {
      readonly x: number
      readonly y: number
      readonly width?: number
      readonly height?: number
      readonly page?: number
    }
  }

  export interface ListQuery extends PaginationParams {
    readonly asset_id: AssetId
    readonly annotation_type?: 'text' | 'highlight' | 'comment' | 'note'
    readonly user_id?: UserId
    readonly parent_id?: AnnotationId
  }

  export interface Annotation {
    readonly id: AnnotationId
    readonly asset_id: AssetId
    readonly content: string
    readonly annotation_type: 'text' | 'highlight' | 'comment' | 'note'
    readonly position: {
      readonly x: number
      readonly y: number
      readonly width?: number
      readonly height?: number
      readonly page?: number
    } | null
    readonly parent_id: AnnotationId | null
    readonly created_by: UserId
    readonly created_at: ISODateString
    readonly updated_at: ISODateString
    readonly replies?: readonly Annotation[]
  }

  export type CreateResponse = APIResponse<Annotation>
  export type GetResponse = APIResponse<Annotation>
  export type UpdateResponse = APIResponse<Annotation>
  export type ListResponse = APIResponse<PaginatedResponse<Annotation>>
  export type DeleteResponse = APIResponse<{ message: string }>
}

// BoardMate API Types
export namespace BoardMateAPI {
  export interface CreateRequest {
    readonly organization_id: OrganizationId
    readonly email: string
    readonly full_name: string
    readonly role: 'guest' | 'member' | 'moderator' | 'admin' | 'owner'
    readonly departments?: readonly string[]
    readonly phone?: string
    readonly bio?: string
  }

  export interface UpdateRequest {
    readonly id: BoardMateId
    readonly full_name?: string
    readonly role?: 'guest' | 'member' | 'moderator' | 'admin' | 'owner'
    readonly departments?: readonly string[]
    readonly phone?: string
    readonly bio?: string
    readonly status?: 'active' | 'inactive' | 'pending'
  }

  export interface ListQuery extends PaginationParams, FilterParams {
    readonly organization_id?: OrganizationId
    readonly role?: 'guest' | 'member' | 'moderator' | 'admin' | 'owner'
    readonly status?: 'active' | 'inactive' | 'pending'
    readonly department?: string
    readonly search?: string
    readonly sort_by?: 'full_name' | 'email' | 'created_at' | 'last_activity'
    readonly sort_order?: 'asc' | 'desc'
  }

  export interface BoardMate {
    readonly id: BoardMateId
    readonly user_id: UserId
    readonly organization_id: OrganizationId
    readonly email: string
    readonly full_name: string
    readonly role: 'guest' | 'member' | 'moderator' | 'admin' | 'owner'
    readonly departments: readonly string[]
    readonly phone: string | null
    readonly bio: string | null
    readonly avatar_url: string | null
    readonly status: 'active' | 'inactive' | 'pending'
    readonly last_activity: ISODateString | null
    readonly created_at: ISODateString
    readonly updated_at: ISODateString
  }

  export type CreateResponse = APIResponse<BoardMate>
  export type GetResponse = APIResponse<BoardMate>
  export type UpdateResponse = APIResponse<BoardMate>
  export type ListResponse = APIResponse<PaginatedResponse<BoardMate>>
  export type DeleteResponse = APIResponse<{ message: string }>
}

// Authentication API Types
export namespace AuthAPI {
  export interface LoginRequest {
    readonly email: string
    readonly password: string
  }

  export interface RegisterRequest {
    readonly email: string
    readonly password: string
    readonly full_name: string
    readonly organization_name?: string
  }

  export interface User {
    readonly id: UserId
    readonly email: string
    readonly full_name: string | null
    readonly avatar_url: string | null
    readonly created_at: ISODateString
    readonly updated_at: ISODateString
    readonly email_verified: boolean
  }

  export interface Session {
    readonly access_token: string
    readonly refresh_token: string
    readonly expires_at: ISODateString
    readonly user: User
  }

  export type LoginResponse = APIResponse<Session>
  export type RegisterResponse = APIResponse<Session>
  export type LogoutResponse = APIResponse<{ message: string }>
  export type RefreshResponse = APIResponse<Session>
}

// WebSocket Message Types
export namespace WebSocketAPI {
  export interface BaseMessage {
    readonly id: string
    readonly type: string
    readonly timestamp: ISODateString
  }

  export interface AnnotationMessage extends BaseMessage {
    readonly type: 'annotation:created' | 'annotation:updated' | 'annotation:deleted'
    readonly data: {
      readonly annotation: AnnotationAPI.Annotation
      readonly asset_id: AssetId
    }
  }

  export interface AssetMessage extends BaseMessage {
    readonly type: 'asset:uploaded' | 'asset:processing' | 'asset:ready'
    readonly data: {
      readonly asset: AssetAPI.Asset
      readonly vault_id: VaultId
    }
  }

  export type WebSocketMessage = AnnotationMessage | AssetMessage

  export interface WebSocketError {
    readonly code: string
    readonly message: string
    readonly timestamp: ISODateString
  }
}

// Re-export core types that are used in this module
export type { APIResponse, PaginatedResponse, PaginationParams, SortParams, FilterParams, ISODateString } from '../core'