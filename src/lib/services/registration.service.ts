/**
 * Registration Service
 * Agent: BIZ-03 (Business Logic Master)
 * Purpose: Business logic for user registration requests
 */

import { RegistrationRepository, CreateRegistrationData, RegistrationRequest } from '../repositories/registration.repository';
import { Result } from '../repositories/result';
import { EventEmitter } from 'events';
import nodemailer from 'nodemailer';
import { env, getSmtpConfig, getAppUrl } from '@/config/environment';
import { generateApprovalUrls } from '@/utils/url';
import { createUserForApprovedRegistration, generatePasswordSetupMagicLink, supabaseAdmin } from '@/lib/supabase-admin';
import { createOtpCode } from '@/lib/otp';
import crypto from 'crypto';

export interface RegistrationSubmissionResult {
  registrationId: string;
  email: string;
  status: 'submitted' | 'resubmitted';
  message: string;
}

export interface RegistrationApprovalResult {
  email: string;
  status: 'approved' | 'rejected';
  userId?: string;
  message: string;
}

export class RegistrationService extends EventEmitter {
  private registrationRepo: RegistrationRepository;
  private emailTransporter: nodemailer.Transporter | null = null;

  constructor() {
    super();
    // Initialize repository with Supabase admin client for service role access
    this.registrationRepo = new RegistrationRepository(supabaseAdmin);
    this.initializeEmailTransporter();
  }

  /**
   * Initialize email transporter
   */
  private async initializeEmailTransporter() {
    try {
      this.emailTransporter = nodemailer.createTransport(getSmtpConfig());
      
      // Verify connection in development
      if (env.NODE_ENV === 'development') {
        await this.emailTransporter.verify();
        console.log('✅ Email service initialized successfully');
      }
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
      this.emailTransporter = null;
    }
  }

  /**
   * Submit a new registration request
   */
  async submitRegistration(data: CreateRegistrationData): Promise<Result<RegistrationSubmissionResult>> {
    try {
      // Validate input data
      if (!this.validateRegistrationData(data)) {
        return {
          success: false,
          error: new Error('Invalid registration data provided')
        };
      }

      // Create or update registration request in database
      const createResult = await this.registrationRepo.createRequest(data);

      if (!createResult.success) {
        // Check if it's a duplicate that we're allowing to resubmit
        if (createResult.error?.code === 'DUPLICATE_PENDING') {
          return {
            success: false,
            error: new Error('A registration request for this email is already pending review')
          };
        } else if (createResult.error?.code === 'ALREADY_APPROVED') {
          return {
            success: false,
            error: new Error('This email has already been approved. Please sign in.')
          };
        }

        return {
          success: false,
          error: createResult.error || new Error('Failed to create registration request')
        };
      }

      const registration = createResult.data;
      const isResubmission = registration.updated_at !== registration.created_at;

      // Generate secure approval token
      const approvalToken = this.generateSecureToken();
      const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update registration with token
      const tokenResult = await this.registrationRepo.setApprovalToken(
        registration.id!,
        approvalToken,
        tokenExpiresAt.toISOString()
      );

      if (!tokenResult.success) {
        console.error('Failed to set approval token:', tokenResult.error);
        // Continue anyway - emails can still be sent without approval links
      }

      // Send notification emails
      const emailResult = await this.sendRegistrationEmails(registration, approvalToken);
      
      if (!emailResult.success) {
        console.error('Failed to send registration emails:', emailResult.error);
        // Don't fail the registration if email sending fails
      }

      // Emit event for monitoring/analytics
      this.emit('registration:submitted', {
        registrationId: registration.id,
        email: registration.email,
        company: registration.company,
        isResubmission
      });

      return {
        success: true,
        data: {
          registrationId: registration.id!,
          email: registration.email,
          status: isResubmission ? 'resubmitted' : 'submitted',
          message: isResubmission 
            ? 'Your registration request has been resubmitted successfully'
            : 'Your registration request has been submitted successfully'
        }
      };
    } catch (error) {
      console.error('Registration submission error:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to submit registration')
      };
    }
  }

  /**
   * Approve a registration request with full user creation workflow
   * This is the complete approval process that creates user accounts and sends credentials
   */
  async approveRegistrationWithUserCreation(
    registrationId: string,
    approvedBy: string,
    token?: string
  ): Promise<Result<RegistrationApprovalResult>> {
    try {
      // Verify token if provided
      if (token) {
        const verifyResult = await this.registrationRepo.verifyApprovalToken(registrationId, token);
        if (!verifyResult.success || !verifyResult.data) {
          return {
            success: false,
            error: new Error('Invalid or expired approval token')
          };
        }
      }

      // Get registration details
      const registrationResult = await this.registrationRepo.findById(registrationId);
      if (!registrationResult.success || !registrationResult.data) {
        return {
          success: false,
          error: new Error('Registration request not found')
        };
      }

      const registration = registrationResult.data;

      // Check if already processed
      if (registration.status !== 'pending') {
        return {
          success: false,
          error: new Error(`Registration has already been ${registration.status}`)
        };
      }

      // Update status to approved (with reviewed_at timestamp)
      const updateResult = await this.registrationRepo.updateStatus(registrationId, {
        status: 'approved',
        updated_by: approvedBy
      });

      if (!updateResult.success) {
        return {
          success: false,
          error: updateResult.error || new Error('Failed to approve registration')
        };
      }

      // Create user account in Supabase Auth
      let userId: string | undefined;
      let otpCode: string | null = null;
      let magicLink: string | null = null;

      try {
        // Create auth user without password
        const { success: userCreateSuccess, error: userCreateError, userRecord } = await createUserForApprovedRegistration(
          registration.email,
          registration.full_name
        );

        if (!userCreateSuccess) {
          console.error('Failed to create user account:', userCreateError);
          // User creation is critical - roll back approval if it fails
          await this.registrationRepo.updateStatus(registrationId, {
            status: 'pending',
            updated_by: approvedBy
          });
          return {
            success: false,
            error: new Error(`Failed to create user account: ${userCreateError}`)
          };
        }

        userId = userRecord?.id;

        // Generate OTP code for first-time login (24-hour expiry)
        const { success: otpSuccess, otpCode: generatedOtpCode, error: otpError } = await createOtpCode(
          registration.email,
          'first_login',
          24 // 24 hours
        );

        if (otpSuccess && generatedOtpCode) {
          otpCode = generatedOtpCode;
          console.log(`✅ OTP code generated for ${registration.email}`);
        } else {
          console.error('Failed to generate OTP code:', otpError);
        }

        // Generate magic link as fallback
        const { magicLink: generatedMagicLink, success: linkSuccess, error: linkError } = await generatePasswordSetupMagicLink(
          registration.email
        );

        if (linkSuccess && generatedMagicLink) {
          magicLink = generatedMagicLink;
          console.log(`✅ Magic link generated for ${registration.email}`);
        } else {
          console.error('Failed to generate magic link:', linkError);
        }

        // Send approval email with credentials
        await this.sendApprovalEmailWithCredentials(registration, otpCode, magicLink);

      } catch (authError) {
        console.error('Auth user creation error:', authError);
        // Roll back approval if user creation fails
        await this.registrationRepo.updateStatus(registrationId, {
          status: 'pending',
          updated_by: approvedBy
        });
        return {
          success: false,
          error: authError instanceof Error ? authError : new Error('Failed to create user account')
        };
      }

      // Emit event
      this.emit('registration:approved', {
        registrationId,
        email: registration.email,
        approvedBy,
        userId
      });

      return {
        success: true,
        data: {
          email: registration.email,
          status: 'approved',
          userId,
          message: 'Registration approved and user account created successfully'
        }
      };
    } catch (error) {
      console.error('Registration approval error:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to approve registration')
      };
    }
  }

  /**
   * Approve a registration request (simplified version without user creation)
   * @deprecated Use approveRegistrationWithUserCreation for complete workflow
   */
  async approveRegistration(
    registrationId: string,
    approvedBy: string,
    token?: string
  ): Promise<Result<RegistrationApprovalResult>> {
    try {
      // Verify token if provided
      if (token) {
        const verifyResult = await this.registrationRepo.verifyApprovalToken(registrationId, token);
        if (!verifyResult.success || !verifyResult.data) {
          return {
            success: false,
            error: new Error('Invalid or expired approval token')
          };
        }
      }

      // Get registration details
      const registrationResult = await this.registrationRepo.findById(registrationId);
      if (!registrationResult.success || !registrationResult.data) {
        return {
          success: false,
          error: new Error('Registration request not found')
        };
      }

      const registration = registrationResult.data;

      // Check if already processed
      if (registration.status !== 'pending') {
        return {
          success: false,
          error: new Error(`Registration has already been ${registration.status}`)
        };
      }

      // Update status to approved
      const updateResult = await this.registrationRepo.updateStatus(registrationId, {
        status: 'approved',
        updated_by: approvedBy
      });

      if (!updateResult.success) {
        return {
          success: false,
          error: updateResult.error || new Error('Failed to approve registration')
        };
      }

      // TODO: Create user account here (requires UserRepository)
      // const userResult = await this.createUserFromRegistration(registration);

      // Send approval email
      await this.sendApprovalEmail(registration);

      // Emit event
      this.emit('registration:approved', {
        registrationId,
        email: registration.email,
        approvedBy
      });

      return {
        success: true,
        data: {
          email: registration.email,
          status: 'approved',
          message: 'Registration approved successfully'
        }
      };
    } catch (error) {
      console.error('Registration approval error:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to approve registration')
      };
    }
  }

  /**
   * Reject a registration request
   */
  async rejectRegistration(
    registrationId: string,
    rejectedBy: string,
    reason?: string,
    token?: string
  ): Promise<Result<RegistrationApprovalResult>> {
    try {
      // Verify token if provided
      if (token) {
        const verifyResult = await this.registrationRepo.verifyApprovalToken(registrationId, token);
        if (!verifyResult.success || !verifyResult.data) {
          return {
            success: false,
            error: new Error('Invalid or expired approval token')
          };
        }
      }

      // Get registration details
      const registrationResult = await this.registrationRepo.findById(registrationId);
      if (!registrationResult.success || !registrationResult.data) {
        return {
          success: false,
          error: new Error('Registration request not found')
        };
      }

      const registration = registrationResult.data;

      // Check if already processed
      if (registration.status !== 'pending') {
        return {
          success: false,
          error: new Error(`Registration has already been ${registration.status}`)
        };
      }

      // Update status to rejected
      const updateResult = await this.registrationRepo.updateStatus(registrationId, {
        status: 'rejected',
        updated_by: rejectedBy,
        reason
      });

      if (!updateResult.success) {
        return {
          success: false,
          error: updateResult.error || new Error('Failed to reject registration')
        };
      }

      // Send rejection email
      await this.sendRejectionEmail(registration, reason);

      // Emit event
      this.emit('registration:rejected', {
        registrationId,
        email: registration.email,
        rejectedBy,
        reason
      });

      return {
        success: true,
        data: {
          email: registration.email,
          status: 'rejected',
          message: 'Registration rejected'
        }
      };
    } catch (error) {
      console.error('Registration rejection error:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to reject registration')
      };
    }
  }

  /**
   * Get all pending registrations (for admin dashboard)
   */
  async getPendingRegistrations(): Promise<Result<RegistrationRequest[]>> {
    return this.registrationRepo.getPendingRequests();
  }

  /**
   * Validate registration data
   */
  private validateRegistrationData(data: CreateRegistrationData): boolean {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return false;
    }

    // Required fields
    if (!data.full_name || !data.company || !data.position) {
      return false;
    }

    // Length validation
    if (data.full_name.length < 2 || data.full_name.length > 100) {
      return false;
    }

    if (data.company.length < 2 || data.company.length > 100) {
      return false;
    }

    if (data.position.length < 2 || data.position.length > 100) {
      return false;
    }

    if (data.message && data.message.length > 500) {
      return false;
    }

    return true;
  }

  /**
   * Generate secure token for approval links
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Send registration notification emails
   */
  private async sendRegistrationEmails(
    registration: RegistrationRequest,
    approvalToken: string
  ): Promise<Result<void>> {
    try {
      if (!this.emailTransporter) {
        return {
          success: false,
          error: new Error('Email service not available')
        };
      }

      const { approveUrl, rejectUrl } = generateApprovalUrls(registration.id!, approvalToken);

      // Send admin notification
      await this.emailTransporter.sendMail({
        from: `"BoardGuru Platform" <${env.SMTP_USER}>`,
        to: env.ADMIN_EMAIL,
        subject: `🔔 New Registration Request - ${registration.full_name}`,
        html: this.generateAdminEmailHTML(registration, approveUrl, rejectUrl)
      });

      // Send user confirmation
      await this.emailTransporter.sendMail({
        from: `"BoardGuru Platform" <${env.SMTP_USER}>`,
        to: registration.email,
        subject: '✅ BoardGuru Registration Request Received',
        html: this.generateUserConfirmationHTML(registration)
      });

      return { success: true, data: undefined };
    } catch (error) {
      console.error('Email sending error:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to send emails')
      };
    }
  }

  /**
   * Send approval email with login credentials (OTP and/or magic link)
   */
  private async sendApprovalEmailWithCredentials(
    registration: RegistrationRequest,
    otpCode: string | null,
    magicLink: string | null
  ): Promise<void> {
    if (!this.emailTransporter) return;

    try {
      const emailHTML = this.generateApprovalEmailWithCredentialsHTML(registration, otpCode, magicLink);
      await this.emailTransporter.sendMail({
        from: `"BoardGuru Platform" <${env.SMTP_USER}>`,
        to: registration.email,
        subject: '🎉 BoardGuru Registration Approved - Welcome!',
        html: emailHTML
      });
      console.log(`✅ Approval email with credentials sent to ${registration.email}`);
    } catch (error) {
      console.error('Failed to send approval email with credentials:', error);
    }
  }

  /**
   * Send approval email to user (simplified version)
   * @deprecated Use sendApprovalEmailWithCredentials for complete workflow
   */
  private async sendApprovalEmail(registration: RegistrationRequest): Promise<void> {
    if (!this.emailTransporter) return;

    try {
      await this.emailTransporter.sendMail({
        from: `"BoardGuru Platform" <${env.SMTP_USER}>`,
        to: registration.email,
        subject: '🎉 Your BoardGuru Registration Has Been Approved!',
        html: this.generateApprovalEmailHTML(registration)
      });
    } catch (error) {
      console.error('Failed to send approval email:', error);
    }
  }

  /**
   * Send rejection email to user
   */
  private async sendRejectionEmail(registration: RegistrationRequest, reason?: string): Promise<void> {
    if (!this.emailTransporter) return;

    try {
      await this.emailTransporter.sendMail({
        from: `"BoardGuru Platform" <${env.SMTP_USER}>`,
        to: registration.email,
        subject: 'BoardGuru Registration Update',
        html: this.generateRejectionEmailHTML(registration, reason)
      });
    } catch (error) {
      console.error('Failed to send rejection email:', error);
    }
  }

  /**
   * Generate admin notification email HTML
   */
  private generateAdminEmailHTML(registration: RegistrationRequest, approveUrl: string, rejectUrl: string): string {
    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Registration Request</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0;"><strong>Name:</strong></td><td>${registration.full_name}</td></tr>
          <tr><td style="padding: 8px 0;"><strong>Email:</strong></td><td>${registration.email}</td></tr>
          <tr><td style="padding: 8px 0;"><strong>Company:</strong></td><td>${registration.company}</td></tr>
          <tr><td style="padding: 8px 0;"><strong>Position:</strong></td><td>${registration.position}</td></tr>
          ${registration.message ? `<tr><td style="padding: 8px 0;"><strong>Message:</strong></td><td>${registration.message}</td></tr>` : ''}
        </table>
        <div style="margin-top: 30px;">
          <a href="${approveUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">Approve</a>
          <a href="${rejectUrl}" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reject</a>
        </div>
      </div>
    `;
  }

  /**
   * Generate user confirmation email HTML
   */
  private generateUserConfirmationHTML(registration: RegistrationRequest): string {
    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Thank you for your interest in BoardGuru!</h2>
        <p>Dear ${registration.full_name},</p>
        <p>We have received your registration request. Our team will review it and get back to you within 1-2 business days.</p>
        <p>Your registration details:</p>
        <ul>
          <li>Email: ${registration.email}</li>
          <li>Company: ${registration.company}</li>
          <li>Position: ${registration.position}</li>
        </ul>
        <p>Best regards,<br>The BoardGuru Team</p>
      </div>
    `;
  }

  /**
   * Generate approval email HTML with credentials (OTP and/or magic link)
   */
  private generateApprovalEmailWithCredentialsHTML(
    registration: RegistrationRequest,
    otpCode: string | null,
    magicLink: string | null
  ): string {
    const appUrl = getAppUrl();
    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🎉 Registration Approved!</h1>
          <p style="color: #bbf7d0; margin: 10px 0 0 0; font-size: 16px;">Welcome to BoardGuru</p>
        </div>
        
        <div style="padding: 40px; background: white; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #1f2937; margin-bottom: 24px; font-size: 24px;">Welcome to BoardGuru!</h2>
          
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 24px; font-size: 16px;">
            Dear ${registration.full_name},
          </p>
          
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 24px; font-size: 16px;">
            Congratulations! Your registration request for BoardGuru has been approved. 
            You can now access our enterprise board management platform.
          </p>
          
          ${otpCode ? `
            <!-- OTP Code Section (Primary Method) -->
            <div style="background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
              <h3 style="color: #1e40af; margin: 0 0 16px 0; font-size: 20px; font-weight: 700;">🔐 Your Sign-In Code</h3>
              <div style="background: #ffffff; border: 2px dashed #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="color: #374151; font-size: 16px; margin: 0 0 12px 0;">Enter this code when signing in:</p>
                <div style="font-size: 36px; font-weight: 900; color: #1e40af; font-family: 'Courier New', monospace; letter-spacing: 8px; margin: 12px 0;">${otpCode}</div>
                <p style="color: #6b7280; font-size: 14px; margin: 12px 0 0 0;">Valid for 24 hours</p>
              </div>
              <div style="background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <h4 style="color: #065f46; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Easy Sign-In Steps:</h4>
                <ol style="color: #065f46; margin: 0; padding-left: 20px; line-height: 1.6; font-size: 14px; text-align: left;">
                  <li>Visit: <a href="${appUrl}/auth/signin" style="color: #059669; text-decoration: none; font-weight: 600;">BoardGuru Sign In</a></li>
                  <li>Enter your email: <strong>${registration.email}</strong></li>
                  <li>Enter your 6-digit code above</li>
                  <li>Set up your permanent password</li>
                  <li>Start using BoardGuru!</li>
                </ol>
              </div>
            </div>
          ` : `
            <!-- Fallback to Magic Link or manual sign-in -->
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 24px; margin: 30px 0;">
              <h3 style="color: #0c4a6e; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Next Steps:</h3>
              <ol style="color: #0c4a6e; margin: 0; padding-left: 24px; line-height: 1.6;">
                ${magicLink ? `
                  <li><strong>Click the secure access link below to set up your password</strong></li>
                  <li>Create your secure password during first login</li>
                  <li>Complete your profile setup</li>
                ` : `
                  <li>Visit the BoardGuru platform: <a href="${appUrl}/auth/signin" style="color: #059669; text-decoration: none; font-weight: 600;">Sign In Here</a></li>
                  <li>Use your registered email: <strong>${registration.email}</strong></li>
                  <li>Request a password setup link during first login</li>
                  <li>Complete your profile setup</li>
                `}
              </ol>
            </div>
          `}
          
          <div style="text-align: center; margin: 30px 0;">
            ${otpCode ? `
              <!-- Primary CTA for OTP Login -->
              <a href="${appUrl}/auth/signin" 
                 style="background: #059669; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-bottom: 12px;">
                🚀 Sign In with Your Code
              </a>
              <p style="color: #6b7280; font-size: 12px; margin: 0;">Use the 6-digit code above to sign in</p>
              ${magicLink ? `
                <div style="margin-top: 20px; padding: 16px; background: #f9fafb; border-radius: 8px;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0 0 12px 0;">Prefer a direct setup link?</p>
                  <a href="${magicLink}" 
                     style="color: #059669; text-decoration: none; font-weight: 600; font-size: 14px;">
                    🔐 Use Magic Link (expires in 1 hour)
                  </a>
                </div>
              ` : ''}
            ` : magicLink ? `
              <!-- Fallback to Magic Link -->
              <a href="${magicLink}" 
                 style="background: #059669; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-bottom: 12px;">
                🔐 Set Up Your Password
              </a>
              <p style="color: #6b7280; font-size: 12px; margin: 0;">This secure link expires in 1 hour for your security</p>
            ` : `
              <!-- No OTP or Magic Link Available -->
              <a href="${appUrl}/auth/signin" 
                 style="background: #059669; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                Sign In Now
              </a>
            `}
          </div>
          
          <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
            Best regards,<br>
            <strong style="color: #374151;">The BoardGuru Team</strong>
          </p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px;">
          This email was sent automatically from BoardGuru registration system.
        </div>
      </div>
    `;
  }

  /**
   * Generate approval email HTML (simplified version)
   * @deprecated Use generateApprovalEmailWithCredentialsHTML for complete workflow
   */
  private generateApprovalEmailHTML(registration: RegistrationRequest): string {
    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to BoardGuru!</h2>
        <p>Dear ${registration.full_name},</p>
        <p>Great news! Your registration has been approved.</p>
        <p>You can now sign in to BoardGuru using your email address. If you haven't set a password yet, please use the "Forgot Password" option on the sign-in page.</p>
        <p>Best regards,<br>The BoardGuru Team</p>
      </div>
    `;
  }

  /**
   * Generate rejection email HTML
   */
  private generateRejectionEmailHTML(registration: RegistrationRequest, reason?: string): string {
    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Registration Update</h2>
        <p>Dear ${registration.full_name},</p>
        <p>Thank you for your interest in BoardGuru. After reviewing your registration request, we are unable to approve it at this time.</p>
        ${reason ? `<p>Reason: ${reason}</p>` : ''}
        <p>If you believe this is an error or would like to discuss this further, please contact our support team.</p>
        <p>Best regards,<br>The BoardGuru Team</p>
      </div>
    `;
  }
}