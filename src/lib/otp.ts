/**
 * OTP (One-Time Password) utility functions
 * Handles generation, validation, and management of OTP codes
 */

import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Database } from '@/types/database'

type OtpRow = Database['public']['Tables']['otp_codes']['Row']
type OtpInsert = Database['public']['Tables']['otp_codes']['Insert']
type OtpPurpose = 'first_login' | 'password_reset'

export interface OtpResult {
  success: boolean
  otpCode?: string
  id?: string
  error?: string
}

export interface OtpValidationResult {
  success: boolean
  isValid?: boolean
  isExpired?: boolean
  isUsed?: boolean
  otpRecord?: OtpRow
  error?: string
}

/**
 * Generate a secure 6-digit OTP code
 */
export function generateOtpCode(): string {
  // Generate cryptographically secure random 6-digit number
  const randomBytes = crypto.randomBytes(4)
  const randomNumber = randomBytes.readUInt32BE(0)
  const otpCode = String(randomNumber % 1000000).padStart(6, '0')
  return otpCode
}

/**
 * Create and store a new OTP code
 */
export async function createOtpCode(
  email: string, 
  purpose: OtpPurpose = 'first_login',
  expiryHours: number = 24
): Promise<OtpResult> {
  try {
    // Invalidate any existing OTP codes for this email and purpose
    await invalidateExistingOtpCodes(email, purpose)

    // Generate new OTP code
    const otpCode = generateOtpCode()
    const expiresAt = new Date(Date.now() + (expiryHours * 60 * 60 * 1000)).toISOString()

    const otpData: OtpInsert = {
      email,
      otp_code: otpCode,
      purpose,
      expires_at: expiresAt,
      used: false
    }

    const { data, error } = await supabaseAdmin
      .from('otp_codes')
      .insert(otpData)
      .select()
      .single()

    if (error) {
      console.error('Error creating OTP code:', error)
      return { success: false, error: 'Failed to create OTP code' }
    }

    console.log(`✅ OTP code created for ${email} (purpose: ${purpose}, expires: ${expiresAt})`)
    
    return { 
      success: true, 
      otpCode, 
      id: data.id 
    }

  } catch (error) {
    console.error('OTP creation error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Validate an OTP code
 */
export async function validateOtpCode(
  email: string,
  otpCode: string,
  purpose: OtpPurpose = 'first_login'
): Promise<OtpValidationResult> {
  try {
    // Find the OTP record
    const { data: otpRecord, error } = await supabaseAdmin
      .from('otp_codes')
      .select('*')
      .eq('email', email)
      .eq('otp_code', otpCode)
      .eq('purpose', purpose)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !otpRecord) {
      console.log(`❌ OTP validation failed: Invalid code for ${email}`)
      return { 
        success: true, 
        isValid: false,
        error: 'Invalid OTP code'
      }
    }

    // Check if expired
    const now = new Date()
    const expiresAt = new Date(otpRecord.expires_at)
    if (now > expiresAt) {
      console.log(`❌ OTP validation failed: Expired code for ${email}`)
      return { 
        success: true, 
        isValid: false,
        isExpired: true,
        otpRecord,
        error: 'OTP code has expired' 
      }
    }

    // Check if already used
    if (otpRecord.used) {
      console.log(`❌ OTP validation failed: Already used code for ${email}`)
      return { 
        success: true, 
        isValid: false,
        isUsed: true,
        otpRecord,
        error: 'OTP code has already been used' 
      }
    }

    console.log(`✅ OTP validation successful for ${email}`)
    return { 
      success: true, 
      isValid: true,
      otpRecord 
    }

  } catch (error) {
    console.error('OTP validation error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Mark an OTP code as used
 */
export async function markOtpAsUsed(otpId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('otp_codes')
      .update({ 
        used: true, 
        used_at: new Date().toISOString() 
      })
      .eq('id', otpId)

    if (error) {
      console.error('Error marking OTP as used:', error)
      return { success: false, error: 'Failed to mark OTP as used' }
    }

    console.log(`✅ OTP marked as used: ${otpId}`)
    return { success: true }

  } catch (error) {
    console.error('Mark OTP as used error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Invalidate all existing OTP codes for an email and purpose
 */
async function invalidateExistingOtpCodes(
  email: string, 
  purpose: OtpPurpose
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('otp_codes')
      .update({ 
        used: true, 
        used_at: new Date().toISOString() 
      })
      .eq('email', email)
      .eq('purpose', purpose)
      .eq('used', false)

    if (error) {
      console.error('Error invalidating existing OTP codes:', error)
      return { success: false, error: 'Failed to invalidate existing OTP codes' }
    }

    return { success: true }

  } catch (error) {
    console.error('Invalidate OTP codes error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Get active OTP for user (for debugging/admin purposes)
 */
export async function getActiveOtpForUser(
  email: string,
  purpose: OtpPurpose = 'first_login'
): Promise<{ success: boolean; otp?: OtpRow; error?: string }> {
  try {
    const { data: otpRecord, error } = await supabaseAdmin
      .from('otp_codes')
      .select('*')
      .eq('email', email)
      .eq('purpose', purpose)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error getting active OTP:', error)
      return { success: false, error: 'Failed to get active OTP' }
    }

    return { success: true, otp: otpRecord || undefined }

  } catch (error) {
    console.error('Get active OTP error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Clean up expired OTP codes (can be called periodically)
 */
export async function cleanupExpiredOtpCodes(): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  try {
    const { count, error } = await supabaseAdmin
      .from('otp_codes')
      .delete({ count: 'exact' })
      .lt('expires_at', new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString()) // 7 days ago

    if (error) {
      console.error('Error cleaning up expired OTP codes:', error)
      return { success: false, error: 'Failed to cleanup expired OTP codes' }
    }

    console.log(`🧹 Cleaned up ${count || 0} expired OTP codes`)
    return { success: true, deletedCount: count || 0 }

  } catch (error) {
    console.error('Cleanup expired OTP codes error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Rate limiting for OTP operations
 */
export class OtpRateLimiter {
  private attempts = new Map<string, { count: number; resetTime: number }>()
  
  constructor(
    private maxAttempts: number = 5,
    private windowMinutes: number = 15
  ) {}

  isAllowed(email: string): boolean {
    const now = Date.now()
    const key = email.toLowerCase()
    const record = this.attempts.get(key)

    // No previous attempts or window expired
    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + (this.windowMinutes * 60 * 1000) })
      return true
    }

    // Check if within limits
    if (record.count >= this.maxAttempts) {
      return false
    }

    // Increment attempt count
    record.count++
    return true
  }

  getRemainingAttempts(email: string): number {
    const record = this.attempts.get(email.toLowerCase())
    if (!record || Date.now() > record.resetTime) {
      return this.maxAttempts
    }
    return Math.max(0, this.maxAttempts - record.count)
  }

  getResetTime(email: string): number {
    const record = this.attempts.get(email.toLowerCase())
    return record?.resetTime || 0
  }
}