/**
 * API Versioning Middleware
 * Handles API version detection, validation, and routing
 */

import { NextRequest, NextResponse } from 'next/server'
import { MiddlewareContext } from './types'

export interface ApiVersion {
  major: number
  minor: number
  patch?: number
  prerelease?: string
}

export interface VersionConfig {
  version: string
  supported: boolean
  deprecated: boolean
  deprecationDate?: Date
  sunsetDate?: Date
  compatibilityMode?: 'strict' | 'loose'
  features?: string[]
  breaking_changes?: string[]
}

// Supported API versions configuration
export const API_VERSIONS: Record<string, VersionConfig> = {
  'v1': {
    version: '1.0.0',
    supported: true,
    deprecated: false,
    compatibilityMode: 'loose',
    features: [
      'basic_auth', 'asset_management', 'notifications',
      'organizations', 'vaults', 'boardmates'
    ]
  },
  'v1.1': {
    version: '1.1.0',
    supported: true,
    deprecated: false,
    compatibilityMode: 'loose',
    features: [
      'basic_auth', 'asset_management', 'notifications',
      'organizations', 'vaults', 'boardmates', 'enhanced_search'
    ]
  },
  'v2': {
    version: '2.0.0',
    supported: true,
    deprecated: false,
    compatibilityMode: 'strict',
    features: [
      'enhanced_auth', 'advanced_asset_management', 'smart_notifications',
      'organization_hierarchies', 'secure_vaults', 'ai_boardmates',
      'calendar_integration', 'voice_assistant', 'compliance_workflows'
    ],
    breaking_changes: [
      'authentication_flow_changed',
      'asset_response_format_updated',
      'notification_types_restructured'
    ]
  },
  'v2.1': {
    version: '2.1.0',
    supported: true,
    deprecated: false,
    compatibilityMode: 'strict',
    features: [
      'enhanced_auth', 'advanced_asset_management', 'smart_notifications',
      'organization_hierarchies', 'secure_vaults', 'ai_boardmates',
      'calendar_integration', 'voice_assistant', 'compliance_workflows',
      'real_time_collaboration', 'advanced_analytics'
    ]
  }
}

// Default version if none specified
export const DEFAULT_VERSION = 'v1'

// Latest version
export const LATEST_VERSION = 'v2.1'

/**
 * Parse version from various sources
 */
export function parseApiVersion(request: NextRequest): string {
  // 1. Check URL path first (/api/v2/...)
  const pathMatch = request.nextUrl.pathname.match(/^\/api\/(v\d+(?:\.\d+)?)\//i)
  if (pathMatch) {
    return pathMatch[1].toLowerCase()
  }

  // 2. Check Accept header (Accept: application/vnd.appboardguru.v2+json)
  const acceptHeader = request.headers.get('accept')
  if (acceptHeader) {
    const acceptMatch = acceptHeader.match(/application\/vnd\.appboardguru\.(v\d+(?:\.\d+)?)\+json/i)
    if (acceptMatch) {
      return acceptMatch[1].toLowerCase()
    }
  }

  // 3. Check custom version header
  const versionHeader = request.headers.get('api-version') || request.headers.get('x-api-version')
  if (versionHeader) {
    return versionHeader.toLowerCase()
  }

  // 4. Check query parameter
  const versionParam = request.nextUrl.searchParams.get('version')
  if (versionParam) {
    return versionParam.toLowerCase()
  }

  return DEFAULT_VERSION
}

/**
 * Validate if version is supported
 */
export function isVersionSupported(version: string): boolean {
  const config = API_VERSIONS[version]
  return config?.supported ?? false
}

/**
 * Get version configuration
 */
export function getVersionConfig(version: string): VersionConfig | null {
  return API_VERSIONS[version] || null
}

/**
 * Compare two versions
 */
export function compareVersions(v1: string, v2: string): number {
  const parseVersion = (v: string): ApiVersion => {
    const match = v.match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-(.+))?$/i)
    if (!match) throw new Error(`Invalid version format: ${v}`)
    
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2] || '0', 10),
      patch: parseInt(match[3] || '0', 10),
      prerelease: match[4]
    }
  }

  const version1 = parseVersion(v1)
  const version2 = parseVersion(v2)

  if (version1.major !== version2.major) {
    return version1.major - version2.major
  }
  
  if (version1.minor !== version2.minor) {
    return version1.minor - version2.minor
  }
  
  if (version1.patch !== version2.patch) {
    return (version1.patch || 0) - (version2.patch || 0)
  }

  // Handle prerelease versions
  if (version1.prerelease && !version2.prerelease) return -1
  if (!version1.prerelease && version2.prerelease) return 1
  if (version1.prerelease && version2.prerelease) {
    return version1.prerelease.localeCompare(version2.prerelease)
  }

  return 0
}

/**
 * Get breaking changes between versions
 */
export function getBreakingChanges(fromVersion: string, toVersion: string): string[] {
  const changes: string[] = []
  
  for (const [version, config] of Object.entries(API_VERSIONS)) {
    if (compareVersions(version, fromVersion) > 0 && 
        compareVersions(version, toVersion) <= 0) {
      if (config.breaking_changes) {
        changes.push(...config.breaking_changes)
      }
    }
  }
  
  return [...new Set(changes)] // Remove duplicates
}

/**
 * API Versioning Middleware
 */
export function versioningMiddleware() {
  return async (context: MiddlewareContext, next: () => Promise<void>) => {
    const { request } = context
    
    // Parse version from request
    const requestedVersion = parseApiVersion(request)
    const versionConfig = getVersionConfig(requestedVersion)
    
    // Validate version
    if (!versionConfig) {
      context.response = NextResponse.json({
        success: false,
        error: `Unsupported API version: ${requestedVersion}`,
        code: 'UNSUPPORTED_VERSION',
        supportedVersions: Object.keys(API_VERSIONS).filter(v => API_VERSIONS[v].supported),
        latestVersion: LATEST_VERSION
      }, { status: 400 })
      return
    }

    if (!versionConfig.supported) {
      context.response = NextResponse.json({
        success: false,
        error: `API version ${requestedVersion} is no longer supported`,
        code: 'VERSION_NOT_SUPPORTED',
        supportedVersions: Object.keys(API_VERSIONS).filter(v => API_VERSIONS[v].supported),
        latestVersion: LATEST_VERSION
      }, { status: 400 })
      return
    }

    // Set version context
    context.apiVersion = requestedVersion
    context.versionConfig = versionConfig
    
    // Add version info to response headers
    const response = context.response || new NextResponse()
    response.headers.set('API-Version', versionConfig.version)
    response.headers.set('API-Version-Name', requestedVersion)
    
    // Add deprecation warning if needed
    if (versionConfig.deprecated) {
      response.headers.set('Deprecation', 'true')
      if (versionConfig.deprecationDate) {
        response.headers.set('Deprecation-Date', versionConfig.deprecationDate.toISOString())
      }
      if (versionConfig.sunsetDate) {
        response.headers.set('Sunset', versionConfig.sunsetDate.toISOString())
      }
      response.headers.set('Link', `</api/${LATEST_VERSION}>; rel="successor-version"`)
      
      // Add deprecation warning to response body for JSON responses
      const warning = {
        deprecated: true,
        message: `API version ${requestedVersion} is deprecated. Please migrate to ${LATEST_VERSION}.`,
        deprecationDate: versionConfig.deprecationDate?.toISOString(),
        sunsetDate: versionConfig.sunsetDate?.toISOString(),
        latestVersion: LATEST_VERSION
      }
      
      context.deprecationWarning = warning
    }

    // Continue to next middleware
    await next()

    // Add version info to final response if not already set
    if (context.response && !context.response.headers.get('API-Version')) {
      context.response.headers.set('API-Version', versionConfig.version)
      context.response.headers.set('API-Version-Name', requestedVersion)
    }
  }
}

/**
 * Version compatibility check middleware
 */
export function versionCompatibilityMiddleware() {
  return async (context: MiddlewareContext, next: () => Promise<void>) => {
    const { apiVersion, versionConfig } = context
    
    if (!apiVersion || !versionConfig) {
      await next()
      return
    }

    // Apply version-specific request/response transformations
    if (versionConfig.compatibilityMode === 'loose') {
      // Apply backward compatibility transformations
      context.transformRequest = (req: any) => {
        return applyBackwardCompatibilityTransforms(req, apiVersion)
      }
      
      context.transformResponse = (res: any) => {
        return applyResponseCompatibilityTransforms(res, apiVersion)
      }
    }

    await next()
  }
}

/**
 * Apply backward compatibility transformations to requests
 */
function applyBackwardCompatibilityTransforms(request: any, version: string): any {
  const transforms: Record<string, (req: any) => any> = {
    'v1': (req) => {
      // v1 specific transformations
      if (req.body) {
        // Convert v2 field names to v1 format if needed
        if (req.body.organization_id) {
          req.body.organizationId = req.body.organization_id
        }
      }
      return req
    },
    'v2': (req) => {
      // v2 specific transformations
      return req
    }
  }

  const transform = transforms[version]
  return transform ? transform(request) : request
}

/**
 * Apply response compatibility transformations
 */
function applyResponseCompatibilityTransforms(response: any, version: string): any {
  const transforms: Record<string, (res: any) => any> = {
    'v1': (res) => {
      // v1 response format
      if (res.data && typeof res.data === 'object') {
        // Convert snake_case to camelCase for v1 compatibility
        return {
          ...res,
          data: convertToCamelCase(res.data)
        }
      }
      return res
    },
    'v2': (res) => {
      // v2 uses snake_case consistently
      return res
    }
  }

  const transform = transforms[version]
  return transform ? transform(response) : response
}

/**
 * Convert object keys to camelCase
 */
function convertToCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(convertToCamelCase)
  }
  
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      acc[camelKey] = convertToCamelCase(obj[key])
      return acc
    }, {} as any)
  }
  
  return obj
}

/**
 * Version negotiation utility
 */
export class VersionNegotiator {
  static getBestMatch(clientVersions: string[], serverVersions: string[]): string | null {
    const supportedVersions = serverVersions.filter(v => isVersionSupported(v))
    
    // Find exact matches first
    for (const clientVersion of clientVersions) {
      if (supportedVersions.includes(clientVersion)) {
        return clientVersion
      }
    }

    // Find compatible versions (same major version)
    for (const clientVersion of clientVersions) {
      const clientMajor = clientVersion.match(/v(\d+)/)?.[1]
      if (clientMajor) {
        const compatibleVersions = supportedVersions.filter(v => 
          v.match(/v(\d+)/)?.[1] === clientMajor
        )
        if (compatibleVersions.length > 0) {
          // Return the highest compatible version
          return compatibleVersions.sort((a, b) => compareVersions(b, a))[0]
        }
      }
    }

    return null
  }

  static parseAcceptHeader(acceptHeader: string): string[] {
    const versions: string[] = []
    
    // Parse Accept: application/vnd.appboardguru.v2+json, application/vnd.appboardguru.v1+json;q=0.8
    const parts = acceptHeader.split(',')
    for (const part of parts) {
      const match = part.match(/application\/vnd\.appboardguru\.(v\d+(?:\.\d+)?)\+json/i)
      if (match) {
        versions.push(match[1].toLowerCase())
      }
    }
    
    return versions
  }
}

/**
 * Export version utilities
 */
export const VersionUtils = {
  parseApiVersion,
  isVersionSupported,
  getVersionConfig,
  compareVersions,
  getBreakingChanges,
  VersionNegotiator
}