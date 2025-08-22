/**
 * Swagger UI Page
 * Interactive API documentation viewer
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import Head from 'next/head'

// Swagger UI component - this would typically be loaded from CDN
declare global {
  interface Window {
    SwaggerUIBundle: any
  }
}

// API Statistics Component
function ApiStats() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/docs?stats=true')
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error('Failed to fetch API stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-500">Total Endpoints</h3>
              <p className="text-2xl font-semibold text-gray-900">{stats?.total || 0}</p>
            </div>
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">API</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-500">Organizations</h3>
              <p className="text-2xl font-semibold text-gray-900">{stats?.byTag?.Organizations || 0}</p>
            </div>
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">ORG</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-500">Authenticated</h3>
              <p className="text-2xl font-semibold text-gray-900">{stats?.authenticated || 0}</p>
            </div>
            <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">🔐</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-500">Methods</h3>
              <p className="text-2xl font-semibold text-gray-900">
                {Object.keys(stats?.byMethod || {}).length}
              </p>
            </div>
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">⚡</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Method breakdown */}
      {stats?.byMethod && Object.keys(stats.byMethod).length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Endpoints by Method</h3>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <div className="grid grid-cols-2 gap-4 text-sm font-medium text-gray-500">
                <div>HTTP Method</div>
                <div>Count</div>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {Object.entries(stats.byMethod).map(([method, count]) => (
                <div key={method} className="px-6 py-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="font-mono font-medium">
                      <span className={`px-2 py-1 rounded text-xs font-bold text-white ${
                        method === 'GET' ? 'bg-blue-500' :
                        method === 'POST' ? 'bg-green-500' :
                        method === 'PUT' ? 'bg-yellow-500' :
                        method === 'DELETE' ? 'bg-red-500' :
                        'bg-gray-500'
                      }`}>
                        {method}
                      </span>
                    </div>
                    <div className="text-gray-900">{String(count)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ApiDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load Swagger UI from CDN if not already loaded
    const loadSwaggerUI = async () => {
      if (typeof window !== 'undefined' && !window.SwaggerUIBundle) {
        // Dynamically load Swagger UI CSS and JS
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui.css'
        document.head.appendChild(link)

        const script = document.createElement('script')
        script.src = 'https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-bundle.js'
        script.onload = () => initSwaggerUI()
        document.head.appendChild(script)
      } else if (window.SwaggerUIBundle) {
        initSwaggerUI()
      }
    }

    const initSwaggerUI = () => {
      if (containerRef.current && window.SwaggerUIBundle) {
        window.SwaggerUIBundle({
          url: '/api/docs',
          dom_id: '#swagger-ui-container',
          deepLinking: true,
          presets: [
            window.SwaggerUIBundle.presets.apis,
            window.SwaggerUIBundle.presets.standalone
          ],
          plugins: [
            window.SwaggerUIBundle.plugins.DownloadUrl
          ],
          layout: 'StandaloneLayout',
          tryItOutEnabled: true,
          requestInterceptor: (request: any) => {
            // Add authentication header if needed
            const token = localStorage.getItem('auth_token')
            if (token) {
              request.headers.Authorization = `Bearer ${token}`
            }
            return request
          },
          responseInterceptor: (response: Record<string, unknown>) => {
            return response
          },
          onComplete: () => {
            console.log('Swagger UI loaded successfully')
          },
          onFailure: (error: any) => {
            console.error('Failed to load Swagger UI:', error)
          }
        })
      }
    }

    loadSwaggerUI()
  }, [])

  return (
    <>
      <Head>
        <title>API Documentation - AppBoardGuru</title>
        <meta name="description" content="Interactive API documentation for AppBoardGuru" />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  AppBoardGuru API Documentation
                </h1>
                <p className="mt-2 text-gray-600">
                  Interactive API documentation with live testing capabilities
                </p>
              </div>
              <div className="flex space-x-4">
                <a
                  href="/api/docs?format=json"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Download JSON
                </a>
                <a
                  href="/api/docs?format=yaml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Download YAML
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* API Stats */}
        <ApiStats />

        {/* Swagger UI Container */}
        <div className="max-w-7xl mx-auto px-4 pb-8">
          <div className="bg-white rounded-lg shadow">
            <div 
              id="swagger-ui-container" 
              ref={containerRef}
              className="swagger-ui-container"
            >
              {/* Loading state */}
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading API documentation...</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-white border-t mt-12">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div>
                <p>Generated automatically from API handlers using OpenAPI 3.0.3</p>
              </div>
              <div>
                <p>Last updated: {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Custom styles for Swagger UI */}
      <style jsx global>{`
        .swagger-ui .topbar {
          display: none;
        }
        .swagger-ui .info {
          margin: 20px 0;
        }
        .swagger-ui .info .title {
          color: #1f2937;
        }
        .swagger-ui .scheme-container {
          background: #f9fafb;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .swagger-ui .btn.authorize {
          background-color: #3b82f6;
          border-color: #3b82f6;
        }
        .swagger-ui .btn.authorize:hover {
          background-color: #2563eb;
          border-color: #2563eb;
        }
      `}</style>
    </>
  )
}