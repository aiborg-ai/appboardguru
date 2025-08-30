import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getAppUrl } from '@/config/environment'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') ?? '/auth/set-password'

  if (token_hash && type) {
    const supabase = await createSupabaseServerClient()
    
    // Verify the token
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    })

    if (!error) {
      // Redirect to the next page after successful verification
      return NextResponse.redirect(new URL(next, getAppUrl()))
    }
  }

  // Redirect to sign in with error if verification fails
  return NextResponse.redirect(
    new URL('/auth/signin?error=invalid-link', getAppUrl())
  )
}