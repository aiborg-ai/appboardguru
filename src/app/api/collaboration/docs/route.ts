import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import yaml from 'js-yaml'

/**
 * GET /api/collaboration/docs
 * Serve OpenAPI documentation for the collaboration API
 * 
 * Supports both YAML and JSON formats based on Accept header or format query parameter
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format')
    const acceptHeader = request.headers.get('accept') || ''

    // Determine response format
    const wantsJson = format === 'json' || 
                     acceptHeader.includes('application/json') ||
                     (!format && !acceptHeader.includes('yaml') && !acceptHeader.includes('yml'))

    // Read the OpenAPI specification file
    const specPath = join(process.cwd(), 'src/app/api/collaboration/openapi.yaml')
    const specContent = readFileSync(specPath, 'utf8')

    if (wantsJson) {
      // Convert YAML to JSON
      const specObj = yaml.load(specContent)
      
      return NextResponse.json(specObj, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Accept'
        }
      })
    } else {
      // Return YAML format
      return new NextResponse(specContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/x-yaml',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Accept'
        }
      })
    }

  } catch (error) {
    console.error('Error serving API documentation:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to load API documentation',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/collaboration/docs
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Max-Age': '86400' // 24 hours
    }
  })
}