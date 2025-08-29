/**
 * Registration Repository
 * Agent: REPO-02 (Repository Guardian)
 * Purpose: Data access layer for registration requests
 */

import { BaseRepository } from './base.repository';
import { Result } from './result';
import { RepositoryError } from './document-errors';
import type { Database } from '@/types/database';
import { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// Define the registration request type based on the database schema
export interface RegistrationRequest {
  id?: string;
  email: string;
  full_name: string;
  company: string;
  position: string;
  message?: string | null;
  status?: 'pending' | 'approved' | 'rejected';
  approval_token?: string | null;
  token_expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
  approved_at?: string | null;
  rejected_at?: string | null;
  approved_by?: string | null;
  rejected_by?: string | null;
  rejection_reason?: string | null;
}

export interface CreateRegistrationData {
  email: string;
  full_name: string;
  company: string;
  position: string;
  message?: string | null;
}

export interface UpdateRegistrationStatus {
  status: 'approved' | 'rejected';
  updated_by: string;
  reason?: string;
}

export class RegistrationRepository extends BaseRepository {
  protected tableName = 'registration_requests';

  constructor(supabase: SupabaseClient<Database>) {
    super(supabase);
  }

  /**
   * Create a new registration request
   */
  async createRequest(data: CreateRegistrationData): Promise<Result<RegistrationRequest>> {
    try {
      // Check for existing registration with the same email
      const existingCheck = await this.findByEmail(data.email);
      
      if (existingCheck.success && existingCheck.data) {
        const existing = existingCheck.data;
        
        // Check the status of existing registration
        if (existing.status === 'pending') {
          return {
            success: false,
            error: new RepositoryError(
              'A registration request for this email is already pending review',
              'DUPLICATE_PENDING',
              { email: data.email }
            )
          };
        } else if (existing.status === 'approved') {
          return {
            success: false,
            error: new RepositoryError(
              'This email has already been approved. Please sign in or request a password reset.',
              'ALREADY_APPROVED',
              { email: data.email }
            )
          };
        }
        // If rejected, allow resubmission by updating the existing record
        const { data: updated, error: updateError } = await this.supabase
          .from(this.tableName)
          .update({
            full_name: data.full_name,
            company: data.company,
            position: data.position,
            message: data.message || null,
            status: 'pending',
            rejection_reason: null,
            rejected_at: null,
            rejected_by: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) {
          return {
            success: false,
            error: new RepositoryError(
              'Failed to resubmit registration request',
              'UPDATE_ERROR',
              { error: updateError.message }
            )
          };
        }

        return { success: true, data: updated };
      }

      // Create new registration request
      const { data: inserted, error: insertError } = await this.supabase
        .from(this.tableName)
        .insert({
          email: data.email,
          full_name: data.full_name,
          company: data.company,
          position: data.position,
          message: data.message || null,
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) {
        // Handle unique constraint violation
        if (insertError.code === '23505') {
          return {
            success: false,
            error: new RepositoryError(
              'A registration request for this email already exists',
              'DUPLICATE_EMAIL',
              { email: data.email, error: insertError.message }
            )
          };
        }

        return {
          success: false,
          error: new RepositoryError(
            'Failed to create registration request',
            'INSERT_ERROR',
            { error: insertError.message }
          )
        };
      }

      return { success: true, data: inserted };
    } catch (error) {
      return {
        success: false,
        error: new RepositoryError(
          'Unexpected error creating registration request',
          'INTERNAL_ERROR',
          { error }
        )
      };
    }
  }

  /**
   * Find registration request by email
   */
  async findByEmail(email: string): Promise<Result<RegistrationRequest | null>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        // No matching record is not an error, return null
        if (error.code === 'PGRST116') {
          return { success: true, data: null };
        }

        return {
          success: false,
          error: new RepositoryError(
            'Failed to find registration by email',
            'QUERY_ERROR',
            { email, error: error.message }
          )
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: new RepositoryError(
          'Unexpected error finding registration',
          'INTERNAL_ERROR',
          { email, error }
        )
      };
    }
  }

  /**
   * Find registration request by ID
   */
  async findById(id: string): Promise<Result<RegistrationRequest | null>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, data: null };
        }

        return {
          success: false,
          error: new RepositoryError(
            'Failed to find registration by ID',
            'QUERY_ERROR',
            { id, error: error.message }
          )
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: new RepositoryError(
          'Unexpected error finding registration',
          'INTERNAL_ERROR',
          { id, error }
        )
      };
    }
  }

  /**
   * Update registration with approval token
   */
  async setApprovalToken(id: string, token: string, expiresAt: string): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .update({
          approval_token: token,
          token_expires_at: expiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        return {
          success: false,
          error: new RepositoryError(
            'Failed to set approval token',
            'UPDATE_ERROR',
            { id, error: error.message }
          )
        };
      }

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: new RepositoryError(
          'Unexpected error setting approval token',
          'INTERNAL_ERROR',
          { id, error }
        )
      };
    }
  }

  /**
   * Update registration status (approve or reject)
   */
  async updateStatus(
    id: string,
    status: UpdateRegistrationStatus
  ): Promise<Result<RegistrationRequest>> {
    try {
      const updateData: any = {
        status: status.status,
        updated_at: new Date().toISOString()
      };

      if (status.status === 'approved') {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = status.updated_by;
      } else if (status.status === 'rejected') {
        updateData.rejected_at = new Date().toISOString();
        updateData.rejected_by = status.updated_by;
        updateData.rejection_reason = status.reason || null;
      }

      const { data, error } = await this.supabase
        .from(this.tableName)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: new RepositoryError(
            `Failed to ${status.status} registration`,
            'UPDATE_ERROR',
            { id, status: status.status, error: error.message }
          )
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: new RepositoryError(
          'Unexpected error updating registration status',
          'INTERNAL_ERROR',
          { id, status, error }
        )
      };
    }
  }

  /**
   * Get all pending registration requests (for admin)
   */
  async getPendingRequests(): Promise<Result<RegistrationRequest[]>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: new RepositoryError(
            'Failed to fetch pending registrations',
            'QUERY_ERROR',
            { error: error.message }
          )
        };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return {
        success: false,
        error: new RepositoryError(
          'Unexpected error fetching pending registrations',
          'INTERNAL_ERROR',
          { error }
        )
      };
    }
  }

  /**
   * Verify approval token
   */
  async verifyApprovalToken(id: string, token: string): Promise<Result<RegistrationRequest | null>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .eq('approval_token', token)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, data: null };
        }

        return {
          success: false,
          error: new RepositoryError(
            'Failed to verify approval token',
            'QUERY_ERROR',
            { id, error: error.message }
          )
        };
      }

      // Check if token has expired
      if (data && data.token_expires_at) {
        const expiresAt = new Date(data.token_expires_at);
        if (expiresAt < new Date()) {
          return {
            success: false,
            error: new RepositoryError(
              'Approval token has expired',
              'TOKEN_EXPIRED',
              { id, expiresAt: data.token_expires_at }
            )
          };
        }
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: new RepositoryError(
          'Unexpected error verifying token',
          'INTERNAL_ERROR',
          { id, error }
        )
      };
    }
  }

  // Abstract methods implementation
  protected getEntityName(): string {
    return 'RegistrationRequest';
  }

  protected getSearchFields(): string[] {
    return ['email', 'full_name', 'company', 'position'];
  }

  protected getTableName(): string {
    return this.tableName;
  }
}