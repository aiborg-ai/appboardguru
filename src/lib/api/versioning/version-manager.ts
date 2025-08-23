/**
 * Version Manager - Advanced API Versioning Strategy
 * Provides comprehensive version management, migration tools, and deprecation handling
 */

import { NextRequest, NextResponse } from 'next/server'
import { Result, Ok, Err } from '../../result'

export interface APIVersion {
  version: string
  releaseDate: Date
  status: 'active' | 'deprecated' | 'sunset'
  deprecationDate?: Date
  sunsetDate?: Date
  changes: VersionChange[]
  compatibilityLevel: 'breaking' | 'backward_compatible' | 'forward_compatible'
  migrationGuide?: string
}

export interface VersionChange {
  type: 'added' | 'modified' | 'deprecated' | 'removed'
  component: 'endpoint' | 'field' | 'parameter' | 'header' | 'response'
  path: string
  description: string
  migrationInstructions?: string
}

export interface VersionedEndpoint {
  path: string
  method: string
  versions: {
    [version: string]: {
      handler: string
      deprecated?: boolean
      removedIn?: string
      schema?: any
      transformRequest?: boolean
      transformResponse?: boolean
    }
  }
}

export interface VersionMigration {
  fromVersion: string
  toVersion: string
  requestTransforms: Array<{
    path: string
    transform: (data: any) => any
  }>
  responseTransforms: Array<{
    path: string
    transform: (data: any) => any
  }>
}

export class VersionManager {
  private versions: Map<string, APIVersion> = new Map()
  private endpoints: Map<string, VersionedEndpoint> = new Map()
  private migrations: Map<string, VersionMigration> = new Map()
  private defaultVersion: string
  private supportedVersions: string[]
  private versionMetrics: Map<string, { requests: number; errors: number; lastUsed: number }> = new Map()

  constructor(supportedVersions: string[], defaultVersion: string) {
    this.supportedVersions = supportedVersions
    this.defaultVersion = defaultVersion
    this.initializeVersions()
    this.initializeEndpoints()
    this.initializeMigrations()
  }

  /**
   * Extract version from request
   */
  extractVersion(request: NextRequest): string {
    const url = new URL(request.url)
    
    // 1. Check URL path version (e.g., /api/v2/users)
    const pathVersionMatch = url.pathname.match(/\/api\/v(\d+(?:\.\d+)?)\//i)
    if (pathVersionMatch) {
      const version = `v${pathVersionMatch[1]}`
      if (this.supportedVersions.includes(version)) {
        return version
      }
    }
    
    // 2. Check Accept header version (e.g., Accept: application/vnd.api.v2+json)
    const acceptHeader = request.headers.get('accept')
    if (acceptHeader) {
      const acceptVersionMatch = acceptHeader.match(/vnd\.api\.v(\d+(?:\.\d+)?)/i)
      if (acceptVersionMatch) {
        const version = `v${acceptVersionMatch[1]}`
        if (this.supportedVersions.includes(version)) {
          return version
        }
      }
    }
    
    // 3. Check custom API-Version header
    const versionHeader = request.headers.get('api-version') || request.headers.get('x-api-version')
    if (versionHeader && this.supportedVersions.includes(versionHeader)) {
      return versionHeader
    }
    
    // 4. Check query parameter version
    const queryVersion = url.searchParams.get('version') || url.searchParams.get('api_version')
    if (queryVersion && this.supportedVersions.includes(queryVersion)) {
      return queryVersion
    }
    
    // 5. Return default version
    return this.defaultVersion
  }

  /**
   * Validate if version is supported
   */
  isVersionSupported(version: string): boolean {
    return this.supportedVersions.includes(version)
  }

  /**
   * Check if version is deprecated
   */
  isVersionDeprecated(version: string): boolean {
    const versionInfo = this.versions.get(version)
    return versionInfo?.status === 'deprecated' || versionInfo?.status === 'sunset'
  }

  /**
   * Get version information
   */
  getVersionInfo(version: string): APIVersion | null {
    return this.versions.get(version) || null
  }

  /**
   * Get deprecation headers for response
   */
  getDeprecationHeaders(version: string): Record<string, string> {
    const versionInfo = this.versions.get(version)
    if (!versionInfo) return {}
    
    const headers: Record<string, string> = {}
    
    if (versionInfo.status === 'deprecated') {
      headers['Deprecation'] = 'true'
      if (versionInfo.deprecationDate) {
        headers['Deprecation-Date'] = versionInfo.deprecationDate.toISOString()
      }
      if (versionInfo.sunsetDate) {
        headers['Sunset'] = versionInfo.sunsetDate.toISOString()
      }
      
      // Add link to newer version
      const newerVersion = this.getNewerVersion(version)
      if (newerVersion) {
        const currentUrl = new URL('http://example.com')
        const newUrl = currentUrl.pathname.replace(`/${version}/`, `/${newerVersion}/`)
        headers['Link'] = `<${newUrl}>; rel="successor-version"`
      }
    }
    
    return headers
  }

  /**
   * Transform request between versions
   */
  async transformRequest(
    request: NextRequest,
    fromVersion: string,
    toVersion: string
  ): Promise<Result<NextRequest, Error>> {
    if (fromVersion === toVersion) {
      return Ok(request)
    }
    
    const migrationKey = `${fromVersion}->${toVersion}`
    const migration = this.migrations.get(migrationKey)
    
    if (!migration) {
      // Try to find a migration path through intermediate versions
      const migrationPath = this.findMigrationPath(fromVersion, toVersion)
      if (migrationPath.length === 0) {
        return Err(new Error(`No migration path from ${fromVersion} to ${toVersion}`))
      }
      
      // Apply multiple transformations
      let currentRequest = request
      for (let i = 0; i < migrationPath.length - 1; i++) {
        const stepKey = `${migrationPath[i]}->${migrationPath[i + 1]}`
        const stepMigration = this.migrations.get(stepKey)
        if (stepMigration) {
          const result = await this.applySingleRequestTransform(currentRequest, stepMigration)
          if (!result.success) return result
          currentRequest = result.value!
        }
      }
      return Ok(currentRequest)
    }
    
    return this.applySingleRequestTransform(request, migration)
  }

  /**
   * Transform response between versions
   */
  async transformResponse(
    response: NextResponse,
    fromVersion: string,
    toVersion: string
  ): Promise<Result<NextResponse, Error>> {
    if (fromVersion === toVersion) {
      return Ok(response)
    }
    
    const migrationKey = `${fromVersion}->${toVersion}`
    const migration = this.migrations.get(migrationKey)
    
    if (!migration) {
      return Err(new Error(`No migration available from ${fromVersion} to ${toVersion}`))
    }
    
    return this.applySingleResponseTransform(response, migration)
  }

  /**
   * Get version usage statistics
   */
  getVersionStats(): {
    versions: Array<{
      version: string
      status: string
      requests: number
      errors: number
      lastUsed: Date | null
      marketShare: number
    }>
    totalRequests: number
    deprecatedUsage: number
  } {
    const stats = Array.from(this.versions.entries()).map(([version, info]) => {
      const metrics = this.versionMetrics.get(version) || { requests: 0, errors: 0, lastUsed: 0 }
      return {
        version,
        status: info.status,
        requests: metrics.requests,
        errors: metrics.errors,
        lastUsed: metrics.lastUsed ? new Date(metrics.lastUsed) : null
      }
    })
    
    const totalRequests = stats.reduce((sum, s) => sum + s.requests, 0)
    const deprecatedUsage = stats
      .filter(s => s.status === 'deprecated' || s.status === 'sunset')
      .reduce((sum, s) => sum + s.requests, 0)
    
    return {
      versions: stats.map(s => ({
        ...s,
        marketShare: totalRequests > 0 ? (s.requests / totalRequests) * 100 : 0
      })),
      totalRequests,
      deprecatedUsage
    }
  }

  /**
   * Record version usage
   */
  recordVersionUsage(version: string, success: boolean = true): void {
    const metrics = this.versionMetrics.get(version) || { requests: 0, errors: 0, lastUsed: 0 }
    
    metrics.requests++
    if (!success) {
      metrics.errors++
    }
    metrics.lastUsed = Date.now()
    
    this.versionMetrics.set(version, metrics)
  }

  /**
   * Add new version
   */
  addVersion(versionInfo: APIVersion): Result<void, Error> {
    try {
      if (this.versions.has(versionInfo.version)) {
        return Err(new Error(`Version ${versionInfo.version} already exists`))
      }
      
      this.versions.set(versionInfo.version, versionInfo)
      
      if (!this.supportedVersions.includes(versionInfo.version)) {
        this.supportedVersions.push(versionInfo.version)
        this.supportedVersions.sort(this.versionComparator)
      }
      
      console.log(`Added API version ${versionInfo.version}`)
      return Ok(undefined)
      
    } catch (error) {
      return Err(new Error(`Failed to add version: ${error instanceof Error ? error.message : 'Unknown error'}`))
    }
  }

  /**
   * Deprecate version
   */
  deprecateVersion(version: string, sunsetDate?: Date): Result<void, Error> {
    const versionInfo = this.versions.get(version)
    if (!versionInfo) {
      return Err(new Error(`Version ${version} not found`))
    }
    
    versionInfo.status = 'deprecated'
    versionInfo.deprecationDate = new Date()
    if (sunsetDate) {
      versionInfo.sunsetDate = sunsetDate
    }
    
    console.log(`Deprecated API version ${version}`)
    return Ok(undefined)
  }

  /**
   * Sunset version (mark for removal)
   */
  sunsetVersion(version: string): Result<void, Error> {
    const versionInfo = this.versions.get(version)
    if (!versionInfo) {
      return Err(new Error(`Version ${version} not found`))
    }
    
    versionInfo.status = 'sunset'
    
    // Remove from supported versions
    const index = this.supportedVersions.indexOf(version)
    if (index > -1) {
      this.supportedVersions.splice(index, 1)
    }
    
    console.log(`Sunset API version ${version}`)
    return Ok(undefined)
  }

  /**
   * Get migration recommendations
   */
  getMigrationRecommendations(currentVersion: string): {
    recommended: string | null
    reasons: string[]
    migrationSteps: string[]
    timeline: string
  } {
    const current = this.versions.get(currentVersion)
    if (!current) {
      return {
        recommended: null,
        reasons: ['Version not found'],
        migrationSteps: [],
        timeline: 'Unknown'
      }
    }
    
    const reasons: string[] = []
    let recommended: string | null = null
    
    if (current.status === 'deprecated' || current.status === 'sunset') {
      reasons.push('Current version is deprecated')
      recommended = this.getNewerVersion(currentVersion)
    }
    
    if (current.sunsetDate && current.sunsetDate < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)) {
      reasons.push('Current version will be sunset within 90 days')
      recommended = recommended || this.getNewerVersion(currentVersion)
    }
    
    const newerVersion = this.getNewerVersion(currentVersion)
    if (newerVersion) {
      const newer = this.versions.get(newerVersion)
      if (newer && newer.compatibilityLevel === 'backward_compatible') {
        reasons.push('Newer backward-compatible version available')
        recommended = recommended || newerVersion
      }
    }
    
    const migrationSteps: string[] = []
    let timeline = 'No migration needed'
    
    if (recommended) {
      const migration = this.migrations.get(`${currentVersion}->${recommended}`)
      if (migration) {
        migrationSteps.push('Review API changes and breaking modifications')
        migrationSteps.push('Update client code to handle new request/response formats')
        migrationSteps.push('Test thoroughly in staging environment')
        migrationSteps.push('Deploy with gradual rollout strategy')
      }
      
      timeline = current.sunsetDate 
        ? `Complete by ${current.sunsetDate.toDateString()}`
        : 'Recommended within 30 days'
    }
    
    return {
      recommended,
      reasons,
      migrationSteps,
      timeline
    }
  }

  private initializeVersions(): void {
    // Initialize version information
    const versions: APIVersion[] = [
      {
        version: 'v1',
        releaseDate: new Date('2024-01-01'),
        status: 'deprecated',
        deprecationDate: new Date('2024-06-01'),
        sunsetDate: new Date('2024-12-01'),
        changes: [],
        compatibilityLevel: 'breaking',
        migrationGuide: '/docs/migration/v1-to-v2'
      },
      {
        version: 'v2',
        releaseDate: new Date('2024-06-01'),
        status: 'active',
        changes: [
          {
            type: 'added',
            component: 'endpoint',
            path: '/api/v2/assets/bulk',
            description: 'Added bulk asset operations'
          },
          {
            type: 'modified',
            component: 'response',
            path: '/api/v2/users',
            description: 'Enhanced user response with profile information'
          }
        ],
        compatibilityLevel: 'backward_compatible'
      },
      {
        version: 'v3',
        releaseDate: new Date('2024-10-01'),
        status: 'active',
        changes: [
          {
            type: 'added',
            component: 'endpoint',
            path: '/api/v3/graphql',
            description: 'Added GraphQL endpoint'
          },
          {
            type: 'deprecated',
            component: 'parameter',
            path: '/api/v3/assets',
            description: 'Deprecated legacy filter parameters'
          }
        ],
        compatibilityLevel: 'forward_compatible'
      }
    ]
    
    versions.forEach(version => {
      this.versions.set(version.version, version)
    })
  }

  private initializeEndpoints(): void {
    // Initialize versioned endpoints
    const endpoints: VersionedEndpoint[] = [
      {
        path: '/api/{version}/assets',
        method: 'GET',
        versions: {
          'v1': { handler: 'legacy-assets', deprecated: true, removedIn: 'v3' },
          'v2': { handler: 'assets-v2', transformResponse: true },
          'v3': { handler: 'assets-v3' }
        }
      },
      {
        path: '/api/{version}/users',
        method: 'GET',
        versions: {
          'v1': { handler: 'users-v1', deprecated: true },
          'v2': { handler: 'users-v2', transformResponse: true },
          'v3': { handler: 'users-v3' }
        }
      }
    ]
    
    endpoints.forEach(endpoint => {
      const key = `${endpoint.method}:${endpoint.path}`
      this.endpoints.set(key, endpoint)
    })
  }

  private initializeMigrations(): void {
    // Initialize version migrations
    const migrations: VersionMigration[] = [
      {
        fromVersion: 'v1',
        toVersion: 'v2',
        requestTransforms: [
          {
            path: '/assets',
            transform: (data: any) => ({
              ...data,
              metadata: data.meta || {}
            })
          }
        ],
        responseTransforms: [
          {
            path: '/users',
            transform: (data: any) => ({
              ...data,
              profile: data.userProfile || null
            })
          }
        ]
      },
      {
        fromVersion: 'v2',
        toVersion: 'v3',
        requestTransforms: [
          {
            path: '/assets',
            transform: (data: any) => ({
              ...data,
              filters: this.modernizeFilters(data.filter)
            })
          }
        ],
        responseTransforms: [
          {
            path: '/assets',
            transform: (data: any) => ({
              ...data,
              links: this.generateHATEOASLinks(data)
            })
          }
        ]
      }
    ]
    
    migrations.forEach(migration => {
      const key = `${migration.fromVersion}->${migration.toVersion}`
      this.migrations.set(key, migration)
    })
  }

  private async applySingleRequestTransform(
    request: NextRequest,
    migration: VersionMigration
  ): Promise<Result<NextRequest, Error>> {
    try {
      const url = new URL(request.url)
      const body = request.method !== 'GET' ? await request.json() : null
      
      let transformedBody = body
      
      // Apply request transforms
      for (const transform of migration.requestTransforms) {
        if (url.pathname.includes(transform.path)) {
          transformedBody = transform.transform(transformedBody)
        }
      }
      
      const transformedRequest = new NextRequest(request.url, {
        method: request.method,
        headers: request.headers,
        body: transformedBody ? JSON.stringify(transformedBody) : undefined
      })
      
      return Ok(transformedRequest)
      
    } catch (error) {
      return Err(new Error(`Request transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`))
    }
  }

  private async applySingleResponseTransform(
    response: NextResponse,
    migration: VersionMigration
  ): Promise<Result<NextResponse, Error>> {
    try {
      const data = await response.json()
      let transformedData = data
      
      // Apply response transforms
      for (const transform of migration.responseTransforms) {
        // Simple path matching - in production, this would be more sophisticated
        transformedData = transform.transform(transformedData)
      }
      
      const transformedResponse = NextResponse.json(transformedData, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      })
      
      return Ok(transformedResponse)
      
    } catch (error) {
      return Err(new Error(`Response transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`))
    }
  }

  private findMigrationPath(fromVersion: string, toVersion: string): string[] {
    // Simple linear migration path - in production, you might want graph traversal
    const fromIndex = this.supportedVersions.indexOf(fromVersion)
    const toIndex = this.supportedVersions.indexOf(toVersion)
    
    if (fromIndex === -1 || toIndex === -1) return []
    
    if (fromIndex < toIndex) {
      return this.supportedVersions.slice(fromIndex, toIndex + 1)
    } else {
      return this.supportedVersions.slice(toIndex, fromIndex + 1).reverse()
    }
  }

  private getNewerVersion(version: string): string | null {
    const currentIndex = this.supportedVersions.indexOf(version)
    if (currentIndex === -1 || currentIndex === this.supportedVersions.length - 1) {
      return null
    }
    
    return this.supportedVersions[currentIndex + 1]
  }

  private versionComparator(a: string, b: string): number {
    const aNum = parseFloat(a.replace('v', ''))
    const bNum = parseFloat(b.replace('v', ''))
    return aNum - bNum
  }

  private modernizeFilters(oldFilter: any): any {
    if (!oldFilter) return {}
    
    // Example transformation of legacy filter format
    return {
      where: oldFilter.conditions || {},
      sort: oldFilter.orderBy || 'created_at',
      limit: oldFilter.pageSize || 50,
      offset: (oldFilter.page || 1 - 1) * (oldFilter.pageSize || 50)
    }
  }

  private generateHATEOASLinks(data: any): any {
    // Example HATEOAS link generation
    if (data.id) {
      return {
        self: `/api/v3/assets/${data.id}`,
        edit: `/api/v3/assets/${data.id}`,
        delete: `/api/v3/assets/${data.id}`,
        related: `/api/v3/assets/${data.id}/related`
      }
    }
    return {}
  }
}