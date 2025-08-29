import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Simplified approval route for debugging
 */
export async function GET(request: NextRequest) {
  console.log('🎯 SIMPLE APPROVAL - RAW REQUEST URL:', request.url)
  
  // Parse URL manually
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  const token = url.searchParams.get('token')
  
  console.log('🎯 SIMPLE APPROVAL - PARSED:', {
    fullUrl: request.url,
    pathname: url.pathname,
    search: url.search,
    id: id || 'MISSING',
    tokenFound: !!token,
    tokenLength: token?.length || 0
  })
  
  // If no parameters, return JSON instead of redirect
  if (!id || !token) {
    return NextResponse.json({
      error: 'Missing parameters',
      received: {
        id: id || null,
        token: token ? 'PROVIDED' : null
      },
      url: request.url,
      search: url.search,
      allParams: Object.fromEntries(url.searchParams.entries())
    }, { status: 400 })
  }
  
  try {
    // Try to fetch the registration
    const { data, error } = await supabaseAdmin
      .from('registration_requests')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      return NextResponse.json({
        error: 'Database error',
        details: error.message,
        code: error.code,
        id
      }, { status: 400 })
    }
    
    if (!data) {
      return NextResponse.json({
        error: 'Registration not found',
        id
      }, { status: 404 })
    }
    
    // Check token
    if (data.approval_token !== token) {
      return NextResponse.json({
        error: 'Token mismatch',
        status: data.status,
        hasToken: !!data.approval_token
      }, { status: 401 })
    }
    
    // Check status
    if (data.status !== 'pending') {
      return NextResponse.json({
        error: 'Already processed',
        status: data.status
      }, { status: 400 })
    }
    
    // Approve it
    const { error: updateError } = await supabaseAdmin
      .from('registration_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        approval_token: null
      })
      .eq('id', id)
    
    if (updateError) {
      return NextResponse.json({
        error: 'Update failed',
        details: updateError.message
      }, { status: 500 })
    }
    
    // Success!
    return NextResponse.json({
      success: true,
      message: 'Registration approved successfully',
      email: data.email,
      name: data.full_name
    })
    
  } catch (e) {
    return NextResponse.json({
      error: 'Unexpected error',
      details: String(e)
    }, { status: 500 })
  }
}