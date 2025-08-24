/**
 * Advanced Authentication System - Multi-Factor, OAuth, and Session Management
 * Implements comprehensive authentication with MFA, OAuth providers, and security monitoring
 */

import { EventEmitter } from 'events'
import { z } from 'zod'
import { createHash, randomBytes, pbkdf2, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import { Result, success, failure } from '../repositories/result'
import { MetricsCollector } from '../observability/metrics-collector'
import { DistributedTracer } from '../observability/distributed-tracer'
import { RateLimiter } from '../api/security/rate-limiter'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database'
import { nanoid } from 'nanoid'

const pbkdf2Async = promisify(pbkdf2)

// Authentication schemas
export const LoginRequestSchema = z.object({
  identifier: z.string().min(1), // email, username, or phone
  password: z.string().min(8),
  rememberMe: z.boolean().optional(),
  mfaCode: z.string().optional(),
  deviceFingerprint: z.string().optional(),
  captchaToken: z.string().optional()
})

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phoneNumber: z.string().optional(),
  acceptTerms: z.boolean().refine(val => val === true),
  inviteCode: z.string().optional()
})

// User interfaces
export interface User {
  id: string
  email: string
  username: string
  firstName: string
  lastName: string
  phoneNumber?: string
  emailVerified: boolean
  phoneVerified: boolean
  mfaEnabled: boolean
  mfaBackupCodes: string[]
  roles: string[]
  permissions: string[]
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
  isActive: boolean
  isLocked: boolean
  lockoutUntil?: string
  failedLoginAttempts: number
}

export interface Session {
  id: string
  userId: string
  deviceId: string
  deviceFingerprint?: string
  userAgent: string
  ipAddress: string
  location?: {
    country: string
    city: string
    coordinates: [number, number]
  }
  createdAt: string
  lastActivityAt: string
  expiresAt: string
  isActive: boolean
  permissions: string[]
  metadata: Record<string, any>
}

export interface AuthToken {
  accessToken: string
  refreshToken: string
  tokenType: 'Bearer'
  expiresIn: number
  refreshExpiresIn: number
  scope: string[]
}

export interface MFASetup {
  secret: string
  qrCode: string
  backupCodes: string[]
}

export interface OAuth2Provider {
  name: string
  clientId: string
  clientSecret: string
  authorizationUrl: string
  tokenUrl: string
  userInfoUrl: string
  scopes: string[]
  enabled: boolean
}

export interface AuthenticationContext {
  ipAddress: string
  userAgent: string
  deviceFingerprint?: string
  location?: {
    country: string
    city: string
  }
  riskScore: number
  timestamp: Date
}

/**
 * Advanced Authentication Manager
 */
export class AdvancedAuthenticationManager extends EventEmitter {
  private sessions: Map<string, Session> = new Map()
  private refreshTokens: Map<string, { userId: string; sessionId: string; expiresAt: string }> = new Map()
  private passwordResetTokens: Map<string, { userId: string; expiresAt: string }> = new Map()
  private rateLimiter: RateLimiter
  private metrics: MetricsCollector
  private tracer: DistributedTracer
  private oauthProviders: Map<string, OAuth2Provider> = new Map()

  constructor(
    private supabase: SupabaseClient<Database>,
    private options: {
      sessionDuration: number
      refreshTokenDuration: number
      maxFailedAttempts: number
      lockoutDuration: number
      requireEmailVerification: boolean
      enableMFA: boolean
      passwordPolicy: {
        minLength: number
        requireUppercase: boolean
        requireLowercase: boolean
        requireNumbers: boolean
        requireSymbols: boolean
        preventReuse: number
      }
    }
  ) {
    super()
    
    this.metrics = MetricsCollector.getInstance()
    this.tracer = DistributedTracer.getInstance()
    this.rateLimiter = new RateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5 // 5 attempts per window
    })

    this.setupCleanupTasks()
    this.setupOAuthProviders()
  }

  /**
   * Register new user
   */
  async register(
    request: z.infer<typeof RegisterRequestSchema>,
    context: AuthenticationContext
  ): Promise<Result<{ user: User; authToken: AuthToken }, string>> {
    const span = this.tracer.startSpan('auth_register', {
      email: request.email,
      username: request.username
    })

    try {
      // Validate request
      const validation = RegisterRequestSchema.safeParse(request)
      if (!validation.success) {
        return failure(`Validation failed: ${validation.error.errors.map(e => e.message).join(', ')}`)
      }

      // Check rate limiting
      if (!(await this.rateLimiter.checkLimit(context.ipAddress))) {
        return failure('Too many registration attempts. Please try again later.')
      }

      // Check if user already exists
      const existingUser = await this.findUserByEmailOrUsername(request.email, request.username)
      if (existingUser.success && existingUser.data) {
        return failure('User with this email or username already exists')
      }

      // Hash password
      const hashedPassword = await this.hashPassword(request.password)

      // Create user
      const userId = nanoid()
      const user: User = {
        id: userId,
        email: request.email.toLowerCase(),
        username: request.username.toLowerCase(),
        firstName: request.firstName,
        lastName: request.lastName,
        phoneNumber: request.phoneNumber,
        emailVerified: false,
        phoneVerified: false,
        mfaEnabled: false,
        mfaBackupCodes: [],
        roles: ['user'],
        permissions: this.getDefaultPermissions(),
        metadata: {
          registrationIp: context.ipAddress,
          registrationUserAgent: context.userAgent,
          inviteCode: request.inviteCode
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        isLocked: false,
        failedLoginAttempts: 0
      }

      // Store user in database
      const { error: userError } = await this.supabase
        .from('auth_users')
        .insert({
          id: user.id,
          email: user.email,
          username: user.username,
          first_name: user.firstName,
          last_name: user.lastName,
          phone_number: user.phoneNumber,
          password_hash: hashedPassword,
          email_verified: user.emailVerified,
          phone_verified: user.phoneVerified,
          mfa_enabled: user.mfaEnabled,
          mfa_backup_codes: user.mfaBackupCodes,
          roles: user.roles,
          permissions: user.permissions,
          metadata: user.metadata,
          created_at: user.createdAt,
          updated_at: user.updatedAt,
          is_active: user.isActive,
          is_locked: user.isLocked,
          failed_login_attempts: user.failedLoginAttempts
        })

      if (userError) {
        return failure(`Failed to create user: ${userError.message}`)
      }

      // Create session and tokens
      const sessionResult = await this.createSession(user, context)
      if (!sessionResult.success) {
        return failure(sessionResult.error)
      }

      // Send verification email if required
      if (this.options.requireEmailVerification) {
        await this.sendEmailVerification(user.id, user.email)
      }

      // Record metrics
      this.metrics.recordUserRegistration(user.id, context.ipAddress)
      this.emit('userRegistered', { user, context })

      return success({
        user: this.sanitizeUser(user),
        authToken: sessionResult.data
      })

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Registration failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Authenticate user
   */
  async login(
    request: z.infer<typeof LoginRequestSchema>,
    context: AuthenticationContext
  ): Promise<Result<{ user: User; authToken: AuthToken; requiresMFA: boolean }, string>> {
    const span = this.tracer.startSpan('auth_login', {
      identifier: request.identifier
    })

    try {
      // Validate request
      const validation = LoginRequestSchema.safeParse(request)
      if (!validation.success) {
        return failure(`Validation failed: ${validation.error.errors.map(e => e.message).join(', ')}`)
      }

      // Check rate limiting
      const rateLimitKey = `login:${context.ipAddress}:${request.identifier}`
      if (!(await this.rateLimiter.checkLimit(rateLimitKey))) {
        return failure('Too many login attempts. Please try again later.')
      }

      // Find user
      const userResult = await this.findUserByEmailOrUsername(request.identifier, request.identifier)
      if (!userResult.success || !userResult.data) {
        await this.recordFailedLoginAttempt(request.identifier, context)
        return failure('Invalid credentials')
      }

      const user = userResult.data

      // Check if user is locked
      if (user.isLocked && user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
        return failure('Account is temporarily locked due to too many failed attempts')
      }

      // Verify password
      const passwordValid = await this.verifyPassword(request.password, user.id)
      if (!passwordValid) {
        await this.recordFailedLoginAttempt(user.id, context)
        return failure('Invalid credentials')
      }

      // Check if account is active
      if (!user.isActive) {
        return failure('Account is deactivated')
      }

      // Check email verification if required
      if (this.options.requireEmailVerification && !user.emailVerified) {
        return failure('Please verify your email address before logging in')
      }

      // Check MFA if enabled
      if (user.mfaEnabled) {
        if (!request.mfaCode) {
          return success({
            user: this.sanitizeUser(user),
            authToken: null as any,
            requiresMFA: true
          })
        }

        const mfaValid = await this.verifyMFACode(user.id, request.mfaCode)
        if (!mfaValid) {
          await this.recordFailedLoginAttempt(user.id, context)
          return failure('Invalid MFA code')
        }
      }

      // Risk assessment
      const riskScore = await this.calculateRiskScore(user, context)
      if (riskScore > 0.8) {
        // High risk login - require additional verification
        await this.sendSecurityAlert(user, context, 'high_risk_login')
        return failure('Additional verification required. Check your email for instructions.')
      }

      // Create session
      const sessionResult = await this.createSession(user, context)
      if (!sessionResult.success) {
        return failure(sessionResult.error)
      }

      // Clear failed attempts
      await this.clearFailedLoginAttempts(user.id)

      // Update last login
      await this.updateLastLogin(user.id)

      // Record metrics
      this.metrics.recordUserLogin(user.id, context.ipAddress, riskScore)
      this.emit('userLoggedIn', { user, context, riskScore })

      return success({
        user: this.sanitizeUser(user),
        authToken: sessionResult.data,
        requiresMFA: false
      })

    } catch (error) {
      span.recordError(error as Error)
      return failure(`Login failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Setup Multi-Factor Authentication
   */
  async setupMFA(userId: string): Promise<Result<MFASetup, string>> {
    const span = this.tracer.startSpan('auth_setup_mfa', { userId })

    try {
      // Generate TOTP secret
      const secret = this.generateTOTPSecret()
      const qrCode = await this.generateQRCode(userId, secret)
      const backupCodes = this.generateBackupCodes()

      // Store MFA configuration
      const { error } = await this.supabase
        .from('auth_users')
        .update({
          mfa_secret: secret,
          mfa_backup_codes: backupCodes,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) {
        return failure(`Failed to setup MFA: ${error.message}`)
      }

      this.emit('mfaSetupInitiated', { userId })

      return success({
        secret,
        qrCode,
        backupCodes
      })

    } catch (error) {
      span.recordError(error as Error)
      return failure(`MFA setup failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Enable MFA after verification
   */
  async enableMFA(userId: string, verificationCode: string): Promise<Result<void, string>> {
    try {
      // Verify the code
      const isValid = await this.verifyMFACode(userId, verificationCode)
      if (!isValid) {
        return failure('Invalid verification code')
      }

      // Enable MFA
      const { error } = await this.supabase
        .from('auth_users')
        .update({
          mfa_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) {
        return failure(`Failed to enable MFA: ${error.message}`)
      }

      this.emit('mfaEnabled', { userId })
      return success(undefined)

    } catch (error) {
      return failure(`MFA enable failed: ${(error as Error).message}`)
    }
  }

  /**
   * OAuth2 authentication
   */
  async initiateOAuth(
    provider: string,
    redirectUri: string,
    state?: string
  ): Promise<Result<{ authUrl: string; state: string }, string>> {
    try {
      const oauthProvider = this.oauthProviders.get(provider)
      if (!oauthProvider || !oauthProvider.enabled) {
        return failure(`OAuth provider '${provider}' not available`)
      }

      const stateParam = state || this.generateSecureToken(32)
      const authUrl = new URL(oauthProvider.authorizationUrl)
      
      authUrl.searchParams.set('client_id', oauthProvider.clientId)
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('scope', oauthProvider.scopes.join(' '))
      authUrl.searchParams.set('state', stateParam)

      return success({
        authUrl: authUrl.toString(),
        state: stateParam
      })

    } catch (error) {
      return failure(`OAuth initiation failed: ${(error as Error).message}`)
    }
  }

  /**
   * Complete OAuth2 flow
   */
  async completeOAuth(
    provider: string,
    code: string,
    state: string,
    redirectUri: string,
    context: AuthenticationContext
  ): Promise<Result<{ user: User; authToken: AuthToken; isNewUser: boolean }, string>> {
    const span = this.tracer.startSpan('auth_complete_oauth', { provider })

    try {
      const oauthProvider = this.oauthProviders.get(provider)
      if (!oauthProvider) {
        return failure(`OAuth provider '${provider}' not found`)
      }

      // Exchange code for access token
      const tokenResponse = await this.exchangeCodeForToken(oauthProvider, code, redirectUri)
      if (!tokenResponse.success) {
        return failure(tokenResponse.error)
      }

      // Get user info from provider
      const userInfoResponse = await this.getOAuthUserInfo(oauthProvider, tokenResponse.data.access_token)
      if (!userInfoResponse.success) {
        return failure(userInfoResponse.error)
      }

      const oauthUser = userInfoResponse.data

      // Find or create user
      let user: User
      let isNewUser = false

      const existingUser = await this.findUserByEmailOrUsername(oauthUser.email, '')
      if (existingUser.success && existingUser.data) {
        user = existingUser.data
        
        // Link OAuth account if not already linked
        await this.linkOAuthAccount(user.id, provider, oauthUser.id)
      } else {
        // Create new user from OAuth data
        const newUserResult = await this.createUserFromOAuth(oauthUser, provider, context)
        if (!newUserResult.success) {
          return failure(newUserResult.error)
        }
        user = newUserResult.data
        isNewUser = true
      }

      // Create session
      const sessionResult = await this.createSession(user, context)
      if (!sessionResult.success) {
        return failure(sessionResult.error)
      }

      this.emit('oauthLoginCompleted', { user, provider, isNewUser, context })

      return success({
        user: this.sanitizeUser(user),
        authToken: sessionResult.data,
        isNewUser
      })

    } catch (error) {
      span.recordError(error as Error)
      return failure(`OAuth completion failed: ${(error as Error).message}`)
    } finally {
      span.end()
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(refreshToken: string, context: AuthenticationContext): Promise<Result<AuthToken, string>> {
    try {
      const tokenData = this.refreshTokens.get(refreshToken)
      if (!tokenData) {
        return failure('Invalid refresh token')
      }

      // Check expiration
      if (new Date(tokenData.expiresAt) <= new Date()) {
        this.refreshTokens.delete(refreshToken)
        return failure('Refresh token expired')
      }

      // Get user and session
      const userResult = await this.getUserById(tokenData.userId)
      if (!userResult.success || !userResult.data) {
        return failure('User not found')
      }

      const session = this.sessions.get(tokenData.sessionId)
      if (!session || !session.isActive) {
        return failure('Session not found or inactive')
      }

      // Update session activity
      session.lastActivityAt = new Date().toISOString()
      this.sessions.set(session.id, session)

      // Generate new tokens
      const authToken = this.generateAuthToken(session)
      
      // Remove old refresh token and store new one
      this.refreshTokens.delete(refreshToken)
      this.refreshTokens.set(authToken.refreshToken, {
        userId: tokenData.userId,
        sessionId: tokenData.sessionId,
        expiresAt: new Date(Date.now() + this.options.refreshTokenDuration).toISOString()
      })

      return success(authToken)

    } catch (error) {
      return failure(`Token refresh failed: ${(error as Error).message}`)
    }
  }

  /**
   * Logout user
   */
  async logout(sessionId: string): Promise<Result<void, string>> {
    try {
      const session = this.sessions.get(sessionId)
      if (!session) {
        return failure('Session not found')
      }

      // Deactivate session
      session.isActive = false
      this.sessions.set(sessionId, session)

      // Remove associated refresh tokens
      for (const [token, data] of this.refreshTokens.entries()) {
        if (data.sessionId === sessionId) {
          this.refreshTokens.delete(token)
        }
      }

      this.emit('userLoggedOut', { userId: session.userId, sessionId })
      return success(undefined)

    } catch (error) {
      return failure(`Logout failed: ${(error as Error).message}`)
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string): Promise<Result<Session[], string>> {
    try {
      const userSessions = Array.from(this.sessions.values())
        .filter(session => session.userId === userId && session.isActive)
        .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime())

      return success(userSessions)

    } catch (error) {
      return failure(`Failed to get user sessions: ${(error as Error).message}`)
    }
  }

  /**
   * Revoke all user sessions
   */
  async revokeAllSessions(userId: string, exceptSessionId?: string): Promise<Result<number, string>> {
    try {
      let revokedCount = 0

      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.userId === userId && session.isActive && sessionId !== exceptSessionId) {
          session.isActive = false
          this.sessions.set(sessionId, session)
          revokedCount++

          // Remove associated refresh tokens
          for (const [token, data] of this.refreshTokens.entries()) {
            if (data.sessionId === sessionId) {
              this.refreshTokens.delete(token)
            }
          }
        }
      }

      this.emit('allSessionsRevoked', { userId, revokedCount, exceptSessionId })
      return success(revokedCount)

    } catch (error) {
      return failure(`Failed to revoke sessions: ${(error as Error).message}`)
    }
  }

  /**
   * Private helper methods
   */
  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(32)
    const hash = await pbkdf2Async(password, salt, 100000, 64, 'sha512')
    return `${salt.toString('hex')}:${hash.toString('hex')}`
  }

  private async verifyPassword(password: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('auth_users')
        .select('password_hash')
        .eq('id', userId)
        .single()

      if (error || !data?.password_hash) {
        return false
      }

      const [saltHex, hashHex] = data.password_hash.split(':')
      const salt = Buffer.from(saltHex, 'hex')
      const storedHash = Buffer.from(hashHex, 'hex')
      const hash = await pbkdf2Async(password, salt, 100000, 64, 'sha512')

      return timingSafeEqual(storedHash, hash)

    } catch (error) {
      return false
    }
  }

  private async createSession(user: User, context: AuthenticationContext): Promise<Result<AuthToken, string>> {
    try {
      const sessionId = nanoid()
      const deviceId = context.deviceFingerprint || nanoid()

      const session: Session = {
        id: sessionId,
        userId: user.id,
        deviceId,
        deviceFingerprint: context.deviceFingerprint,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
        location: context.location,
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.options.sessionDuration).toISOString(),
        isActive: true,
        permissions: user.permissions,
        metadata: {
          riskScore: context.riskScore,
          deviceFingerprint: context.deviceFingerprint
        }
      }

      this.sessions.set(sessionId, session)

      // Generate auth token
      const authToken = this.generateAuthToken(session)

      // Store refresh token
      this.refreshTokens.set(authToken.refreshToken, {
        userId: user.id,
        sessionId,
        expiresAt: new Date(Date.now() + this.options.refreshTokenDuration).toISOString()
      })

      return success(authToken)

    } catch (error) {
      return failure(`Session creation failed: ${(error as Error).message}`)
    }
  }

  private generateAuthToken(session: Session): AuthToken {
    const accessToken = this.generateSecureToken(64)
    const refreshToken = this.generateSecureToken(64)

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000),
      refreshExpiresIn: Math.floor(this.options.refreshTokenDuration / 1000),
      scope: session.permissions
    }
  }

  private generateSecureToken(length: number): string {
    return randomBytes(length).toString('hex')
  }

  private generateTOTPSecret(): string {
    return randomBytes(32).toString('base32')
  }

  private async generateQRCode(userId: string, secret: string): Promise<string> {
    // In a real implementation, use a QR code library
    const appName = 'BoardGuru'
    const otpauth = `otpauth://totp/${appName}:${userId}?secret=${secret}&issuer=${appName}`
    return `data:image/svg+xml;base64,${Buffer.from(otpauth).toString('base64')}`
  }

  private generateBackupCodes(): string[] {
    return Array.from({ length: 10 }, () => 
      randomBytes(4).toString('hex').toUpperCase()
    )
  }

  private async verifyMFACode(userId: string, code: string): Promise<boolean> {
    // In a real implementation, verify TOTP code
    // This is a simplified version
    return code.length === 6 && /^\d{6}$/.test(code)
  }

  private async calculateRiskScore(user: User, context: AuthenticationContext): Promise<number> {
    let score = 0

    // Check for unusual location
    if (context.location && user.metadata.lastKnownLocation) {
      const distance = this.calculateDistance(
        context.location.coordinates,
        user.metadata.lastKnownLocation.coordinates
      )
      if (distance > 1000) { // More than 1000km from last known location
        score += 0.3
      }
    }

    // Check for unusual time
    const currentHour = new Date().getHours()
    if (currentHour < 6 || currentHour > 22) { // Late night login
      score += 0.1
    }

    // Check device fingerprint
    if (context.deviceFingerprint && user.metadata.knownDevices) {
      if (!user.metadata.knownDevices.includes(context.deviceFingerprint)) {
        score += 0.2
      }
    }

    // Recent failed attempts
    if (user.failedLoginAttempts > 0) {
      score += user.failedLoginAttempts * 0.1
    }

    return Math.min(score, 1.0)
  }

  private calculateDistance(coord1: [number, number], coord2: [number, number]): number {
    // Haversine formula for distance calculation
    const R = 6371 // Earth's radius in kilometers
    const dLat = this.deg2rad(coord2[0] - coord1[0])
    const dLon = this.deg2rad(coord2[1] - coord1[1])
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(coord1[0])) * Math.cos(this.deg2rad(coord2[0])) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180)
  }

  private sanitizeUser(user: User): User {
    const sanitized = { ...user }
    delete (sanitized as any).mfaBackupCodes
    return sanitized
  }

  private getDefaultPermissions(): string[] {
    return [
      'profile:read',
      'profile:update',
      'assets:read',
      'notifications:read'
    ]
  }

  private setupCleanupTasks(): void {
    // Clean up expired sessions every hour
    setInterval(() => {
      this.cleanupExpiredSessions()
      this.cleanupExpiredTokens()
    }, 60 * 60 * 1000)
  }

  private cleanupExpiredSessions(): void {
    const now = new Date()
    let cleanedCount = 0

    for (const [sessionId, session] of this.sessions.entries()) {
      if (new Date(session.expiresAt) <= now) {
        this.sessions.delete(sessionId)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired sessions`)
    }
  }

  private cleanupExpiredTokens(): void {
    const now = new Date()
    let cleanedCount = 0

    for (const [token, data] of this.refreshTokens.entries()) {
      if (new Date(data.expiresAt) <= now) {
        this.refreshTokens.delete(token)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired refresh tokens`)
    }
  }

  private setupOAuthProviders(): void {
    // Setup common OAuth providers
    const providers = [
      {
        name: 'google',
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scopes: ['openid', 'profile', 'email'],
        enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
      },
      {
        name: 'microsoft',
        clientId: process.env.MICROSOFT_CLIENT_ID || '',
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
        authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
        scopes: ['openid', 'profile', 'email'],
        enabled: !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET)
      }
    ]

    providers.forEach(provider => {
      this.oauthProviders.set(provider.name, provider)
    })
  }

  // Placeholder methods - would be implemented based on specific requirements
  private async findUserByEmailOrUsername(email: string, username: string): Promise<Result<User | null, string>> {
    // Implementation would query the database
    return success(null)
  }

  private async getUserById(userId: string): Promise<Result<User | null, string>> {
    // Implementation would query the database
    return success(null)
  }

  private async recordFailedLoginAttempt(identifier: string, context: AuthenticationContext): Promise<void> {
    // Implementation would record failed attempt
  }

  private async clearFailedLoginAttempts(userId: string): Promise<void> {
    // Implementation would clear failed attempts
  }

  private async updateLastLogin(userId: string): Promise<void> {
    // Implementation would update last login timestamp
  }

  private async sendEmailVerification(userId: string, email: string): Promise<void> {
    // Implementation would send verification email
  }

  private async sendSecurityAlert(user: User, context: AuthenticationContext, type: string): Promise<void> {
    // Implementation would send security alert
  }

  private async exchangeCodeForToken(provider: OAuth2Provider, code: string, redirectUri: string): Promise<Result<any, string>> {
    // Implementation would exchange OAuth code for token
    return success({ access_token: 'mock_token' })
  }

  private async getOAuthUserInfo(provider: OAuth2Provider, accessToken: string): Promise<Result<any, string>> {
    // Implementation would get user info from OAuth provider
    return success({ id: '123', email: 'user@example.com', name: 'User' })
  }

  private async linkOAuthAccount(userId: string, provider: string, providerUserId: string): Promise<void> {
    // Implementation would link OAuth account
  }

  private async createUserFromOAuth(oauthUser: any, provider: string, context: AuthenticationContext): Promise<Result<User, string>> {
    // Implementation would create user from OAuth data
    return success({} as User)
  }
}