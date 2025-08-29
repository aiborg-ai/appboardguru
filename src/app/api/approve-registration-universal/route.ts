import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAppUrl } from '@/config/environment'

/**
 * Universal Approval Handler
 * This endpoint can handle approval requests regardless of the original URL
 * It bypasses URL validation and focuses on ID and token validation only
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const token = searchParams.get('token')
  
  // Get the current app URL for redirects
  const currentAppUrl = getAppUrl()
  
  console.log('🔍 Universal Approval Request:', {
    id,
    tokenReceived: !!token,
    requestUrl: request.url,
    currentAppUrl,
    timestamp: new Date().toISOString()
  })
  
  if (!id || !token) {
    const errorUrl = `${currentAppUrl}/approval-result?type=error&title=Invalid Request&message=Missing registration ID or security token`
    return NextResponse.redirect(errorUrl, 302)
  }
  
  try {
    // Fetch the registration request
    const { data: registrationRequest, error: fetchError } = await supabaseAdmin
      .from('registration_requests')
      .select('*')
      .eq('id', id)
      .single()
    
    if (fetchError || !registrationRequest) {
      console.error('Registration not found:', { id, error: fetchError })
      const errorUrl = `${currentAppUrl}/approval-result?type=error&title=Request Not Found&message=Registration request not found`
      return NextResponse.redirect(errorUrl, 302)
    }
    
    // Verify token
    if (!registrationRequest.approval_token || registrationRequest.approval_token !== token) {
      const errorUrl = `${currentAppUrl}/approval-result?type=error&title=Security Error&message=Invalid security token`
      return NextResponse.redirect(errorUrl, 302)
    }
    
    // Check status
    if (registrationRequest.status !== 'pending') {
      const warningUrl = `${currentAppUrl}/approval-result?type=warning&title=Already Processed&message=This registration has already been ${registrationRequest.status}`
      return NextResponse.redirect(warningUrl, 302)
    }
    
    // Approve the registration
    const { error: updateError } = await supabaseAdmin
      .from('registration_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        approval_token: null,
        token_expires_at: null
      })
      .eq('id', id)
    
    if (updateError) {
      console.error('Update error:', updateError)
      const errorUrl = `${currentAppUrl}/approval-result?type=error&title=Database Error&message=Failed to update registration`
      return NextResponse.redirect(errorUrl, 302)
    }
    
    // Redirect to main approval route for user creation
    // This allows us to reuse the existing user creation logic
    const mainApprovalUrl = `${currentAppUrl}/api/approve-registration?id=${id}&token=${token}&bypass=true`
    return NextResponse.redirect(mainApprovalUrl, 302)
    
  } catch (error) {
    console.error('Universal approval error:', error)
    const errorUrl = `${currentAppUrl}/approval-result?type=error&title=System Error&message=An unexpected error occurred`
    return NextResponse.redirect(errorUrl, 302)
  }
}