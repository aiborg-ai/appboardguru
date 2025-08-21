/**
 * API Documentation Endpoint
 * Serves OpenAPI specification and Swagger UI
 */

import { openAPIRegistry } from '@/lib/openapi/registry'
import { initializeEndpointRegistry } from '@/lib/openapi/endpoints'

// Initialize endpoint registry on first load
initializeEndpointRegistry()

/**
 * GET /api/docs
 * Returns the OpenAPI specification as JSON
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'json'
    const stats = url.searchParams.get('stats') === 'true'

    // Return stats if requested
    if (stats) {
      return Response.json(openAPIRegistry.getStats(), {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      })
    }

    // Generate OpenAPI spec from registry
    if (format === 'yaml') {
      return new Response(
        openAPIRegistry.generateYAMLSpec(),
        {
          headers: {
            'Content-Type': 'application/x-yaml',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      )
    }

    const spec = openAPIRegistry.generateSpec()
    return Response.json(JSON.parse(spec), {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })
  } catch (error) {
    console.error('Failed to generate OpenAPI spec:', error)
    return Response.json(
      { error: 'Failed to generate API documentation' },
      { status: 500 }
    )
  }
}