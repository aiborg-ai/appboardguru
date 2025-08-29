import { NextRequest, NextResponse } from 'next/server'

/**
 * Simple test endpoint to verify query parameters are being received
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const searchParams = url.searchParams
  
  // Try different methods to get parameters
  const id = searchParams.get('id')
  const token = searchParams.get('token')
  
  // Also try getting all params
  const allParams: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    allParams[key] = value
  })
  
  const response = {
    timestamp: new Date().toISOString(),
    url: request.url,
    pathname: url.pathname,
    search: url.search,
    searchParamsString: url.searchParams.toString(),
    parsedParams: {
      id: id || 'NOT_FOUND',
      token: token ? token.substring(0, 8) + '...' : 'NOT_FOUND'
    },
    allParams,
    headers: {
      host: request.headers.get('host'),
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer')
    },
    method: request.method,
    nextUrl: request.nextUrl ? {
      pathname: request.nextUrl.pathname,
      search: request.nextUrl.search,
      searchParams: Object.fromEntries(request.nextUrl.searchParams.entries())
    } : null
  }
  
  return NextResponse.json(response, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  })
}