/**
 * Registration Approval API Endpoint (Refactored)
 * Agent: API-03 (API Conductor)
 * Purpose: Handle registration approval using service pattern
 */

import { NextRequest, NextResponse } from 'next/server';
import { RegistrationService } from '@/lib/services/registration.service';
import { getAppUrl } from '@/config/environment';
import {
  addSecurityHeaders,
  validateRequestMethod
} from '@/lib/api-response';

// Service instance (singleton)
let registrationService: RegistrationService | null = null;

function getRegistrationService(): RegistrationService {
  if (!registrationService) {
    registrationService = new RegistrationService();
  }
  return registrationService;
}

async function handleApprovalRequest(request: NextRequest) {
  // Validate request method
  if (!validateRequestMethod(request, ['GET'])) {
    const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Method Not Allowed&message=Invalid request method&details=Please use the approval link from your email`;
    return NextResponse.redirect(errorUrl, 302);
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const token = searchParams.get('token');

  if (!id || !token) {
    const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Invalid Request&message=Missing registration ID or security token&details=The approval link appears to be malformed or incomplete`;
    return NextResponse.redirect(errorUrl, 302);
  }

  try {
    // Use registration service to handle approval with user creation
    const service = getRegistrationService();
    const result = await service.approveRegistrationWithUserCreation(
      id,
      'system', // System approval (could be enhanced to track admin ID)
      token
    );

    if (!result.success) {
      // Handle specific error cases
      const errorMessage = result.error?.message || 'Failed to approve registration';
      
      if (errorMessage.includes('Invalid or expired approval token')) {
        const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Security Error&message=Invalid or expired approval token&details=This link may have expired or been used already. Approval links are valid for 24 hours and can only be used once.`;
        return NextResponse.redirect(errorUrl, 302);
      }

      if (errorMessage.includes('Registration request not found')) {
        const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Request Not Found&message=Registration request not found&details=The request may have already been processed or deleted.`;
        return NextResponse.redirect(errorUrl, 302);
      }

      if (errorMessage.includes('already been')) {
        // Registration already processed - get the details for the warning message
        const service = getRegistrationService();
        const registrationRepo = (service as any).registrationRepo;
        const regResult = await registrationRepo.findById(id);
        
        if (regResult.success && regResult.data) {
          const reg = regResult.data;
          const warningUrl = `${getAppUrl()}/approval-result?type=warning&title=Already Processed&message=This registration request has already been ${reg.status}&details=No further action is needed&name=${encodeURIComponent(reg.full_name)}&email=${encodeURIComponent(reg.email)}`;
          return NextResponse.redirect(warningUrl, 302);
        }
      }

      if (errorMessage.includes('Failed to create user account')) {
        const errorUrl = `${getAppUrl()}/approval-result?type=error&title=User Account Creation Failed&message=Failed to create user account during approval process&details=System error occurred. Please try again or contact support.`;
        return NextResponse.redirect(errorUrl, 302);
      }

      // Generic error
      const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Approval Failed&message=${encodeURIComponent(errorMessage)}&details=Please try again or contact support if the problem persists`;
      return NextResponse.redirect(errorUrl, 302);
    }

    // Success - get registration details for the success page
    const service = getRegistrationService();
    const registrationRepo = (service as any).registrationRepo;
    const regResult = await registrationRepo.findById(id);
    
    let successUrl: string;
    if (regResult.success && regResult.data) {
      const reg = regResult.data;
      successUrl = `${getAppUrl()}/approval-result?type=success&title=Registration Approved&message=${encodeURIComponent(`${reg.full_name} has been successfully approved for access to BoardGuru`)}&details=An approval email with login instructions has been sent&name=${encodeURIComponent(reg.full_name)}&email=${encodeURIComponent(reg.email)}&company=${encodeURIComponent(reg.company)}&position=${encodeURIComponent(reg.position)}`;
    } else {
      // Fallback if we can't get registration details
      successUrl = `${getAppUrl()}/approval-result?type=success&title=Registration Approved&message=Registration has been successfully approved&details=An approval email with login instructions has been sent`;
    }

    console.log(`✅ Approval process completed successfully for registration ${id}`);
    
    const response = NextResponse.redirect(successUrl, 302);
    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Approval process error:', error);
    const errorUrl = `${getAppUrl()}/approval-result?type=error&title=Server Error&message=An error occurred while processing the approval&details=Please try again later or contact support if the problem persists`;
    return NextResponse.redirect(errorUrl, 302);
  }
}

export const GET = handleApprovalRequest;