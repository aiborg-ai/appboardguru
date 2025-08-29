import { NextRequest, NextResponse } from 'next/server'

/**
 * Minimal test route to debug parameter passing
 */
export async function GET(request: NextRequest) {
  // Get the full URL
  const fullUrl = request.url
  
  // Parse it
  const url = new URL(fullUrl)
  
  // Get parameters
  const id = url.searchParams.get('id')
  const token = url.searchParams.get('token')
  
  // Return everything as JSON for debugging
  return NextResponse.json({
    success: true,
    fullUrl,
    pathname: url.pathname,
    search: url.search,
    params: {
      id: id || 'NOT_FOUND',
      token: token || 'NOT_FOUND'
    },
    allSearchParams: Array.from(url.searchParams.entries()),
    headers: {
      host: request.headers.get('host'),
      'x-forwarded-host': request.headers.get('x-forwarded-host'),
      'x-forwarded-proto': request.headers.get('x-forwarded-proto')
    }
  })
}