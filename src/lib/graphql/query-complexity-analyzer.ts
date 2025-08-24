/**
 * GraphQL Query Complexity Analyzer for Mobile Optimization
 * Prevents overly complex queries that could overwhelm mobile devices
 */

import { ValidationRule, ValidationContext, FieldNode } from 'graphql';

interface ComplexityConfig {
  maximumComplexity: number;
  scalarCost: number;
  objectCost: number;
  listFactor: number;
  introspection: boolean;
}

interface FieldComplexity {
  [fieldName: string]: number | ((args: any) => number);
}

interface TypeComplexity {
  [typeName: string]: FieldComplexity;
}

export class MobileQueryComplexityAnalyzer {
  private config: ComplexityConfig;
  private typeComplexities: TypeComplexity;

  constructor(config?: Partial<ComplexityConfig>) {
    this.config = {
      maximumComplexity: 100, // Lower limit for mobile
      scalarCost: 1,
      objectCost: 2,
      listFactor: 10,
      introspection: false,
      ...config,
    };

    this.typeComplexities = {
      Query: {
        assets: (args: any) => {
          let complexity = 10;
          const limit = args.connection?.first || 20;
          complexity += Math.ceil(limit / 10) * 5;
          
          if (args.filter?.types?.length > 3) complexity += 10;
          if (args.networkOptimized === false) complexity += 20;
          
          return complexity;
        },
        asset: 20,
        organizations: (args: any) => {
          let complexity = 15;
          if (args.includeOfflineData) complexity += 10;
          return complexity;
        },
        me: 10,
        syncStatus: 5,
        offlineQueue: 15,
        dataUsageStats: 10,
        networkStatus: 5,
        batchAssets: (args: any) => Math.min(args.ids?.length || 0, 50) * 2,
        batchOrganizations: (args: any) => Math.min(args.ids?.length || 0, 50) * 3,
      },
      MobileAsset: {
        id: 1,
        title: 1,
        type: 1,
        size: 1,
        thumbnail: 2,
        previewUrl: 10, // Higher cost as it's lazy loaded
        downloadUrl: 15, // Even higher as it generates signed URLs
        metadata: 5,
        createdAt: 1,
        updatedAt: 1,
        organization: 8, // Nested query cost
        creator: 6,
        permissions: 5,
        syncStatus: 1,
        lastSyncedAt: 1,
        compressionRatio: 1,
        networkRequirement: 1,
      },
      MobileOrganization: {
        id: 1,
        name: 1,
        slug: 1,
        logoUrl: 2,
        settings: 10, // Complex nested object
        memberCount: 3,
        syncStatus: 1,
        offlineCapabilities: 5,
        dataUsageEstimate: 5,
      },
      MobileUser: {
        id: 1,
        email: 1,
        firstName: 1,
        lastName: 1,
        avatarUrl: 2,
        role: 1,
        lastActiveAt: 1,
        deviceInfo: 8, // Complex device information
        preferences: 10, // Complex preferences object
        syncStatus: 1,
      },
      MobileAssetConnection: {
        edges: (args: any, complexity: number) => complexity * 2,
        pageInfo: 5,
        totalCount: 3,
        filters: 2,
      },
      Mutation: {
        uploadAsset: 30,
        updateAsset: 20,
        deleteAsset: 10,
        requestSync: 15,
        cancelSync: 5,
        queueOfflineOperation: 10,
        updateMobilePreferences: 10,
        batchUpdateAssets: (args: any) => Math.min(args.inputs?.length || 0, 20) * 10,
      },
      Subscription: {
        assetSyncUpdates: 10,
        offlineQueueUpdates: 5,
        networkStatusChanges: 5,
        dataUsageAlerts: 5,
      },
    };
  }

  /**
   * Calculate complexity for a specific query
   */
  calculateComplexity(operationName: string, args: any): number {
    const baseComplexity = this.typeComplexities.Query?.[operationName];
    
    if (typeof baseComplexity === 'function') {
      return baseComplexity(args);
    }
    
    return baseComplexity || this.config.objectCost;
  }

  /**
   * Create a validation rule for GraphQL query complexity
   */
  createComplexityLimitRule(): ValidationRule {
    return (context: ValidationContext) => {
      let complexity = 0;
      const operationName = context.getDocument().definitions[0]?.kind === 'OperationDefinition' 
        ? context.getDocument().definitions[0].name?.value 
        : 'anonymous';

      return {
        Field: (node: FieldNode) => {
          const fieldName = node.name.value;
          const parentType = context.getParentType();
          const fieldDef = context.getFieldDef();
          
          if (!parentType || !fieldDef) return;
          
          const typeName = parentType.name;
          const fieldComplexity = this.typeComplexities[typeName]?.[fieldName];
          
          let fieldCost = this.config.objectCost;
          
          if (typeof fieldComplexity === 'number') {
            fieldCost = fieldComplexity;
          } else if (typeof fieldComplexity === 'function') {
            // Extract arguments for function-based complexity
            const args = this.extractArguments(node);
            fieldCost = fieldComplexity(args);
          }
          
          // Apply list factor if field returns a list
          if (fieldDef.type.toString().includes('[') || fieldDef.type.toString().includes('Connection')) {
            fieldCost *= this.config.listFactor;
          }
          
          complexity += fieldCost;
          
          // Check mobile-specific limits
          if (complexity > this.config.maximumComplexity) {
            context.reportError(
              new Error(
                `Query complexity ${complexity} exceeds maximum allowed complexity ${this.config.maximumComplexity} for mobile devices. ` +
                `Consider reducing the query scope, using pagination, or enabling network optimization.`
              )
            );
          }
        },
      };
    };
  }

  /**
   * Analyze query complexity and provide optimization suggestions
   */
  analyzeAndSuggestOptimizations(query: string, variables: any = {}): {
    complexity: number;
    suggestions: string[];
    isOptimized: boolean;
  } {
    const suggestions: string[] = [];
    let complexity = 0;
    
    // Simple query parsing for analysis
    const hasLargePageSize = variables.first > 20 || variables.last > 20;
    const hasNestedQueries = query.includes('organization {') && query.includes('creator {');
    const hasLazyFields = query.includes('previewUrl') || query.includes('downloadUrl');
    const lacksCaching = !query.includes('networkOptimized: true');
    
    if (hasLargePageSize) {
      complexity += 30;
      suggestions.push('Reduce page size to 20 or less for better mobile performance');
    }
    
    if (hasNestedQueries) {
      complexity += 25;
      suggestions.push('Consider using separate queries for nested data to enable better caching');
    }
    
    if (hasLazyFields) {
      complexity += 20;
      suggestions.push('Avoid requesting previewUrl and downloadUrl unless immediately needed');
    }
    
    if (lacksCaching) {
      complexity += 15;
      suggestions.push('Enable networkOptimized: true for better caching and reduced data usage');
    }
    
    // Check for mobile-specific optimizations
    if (!query.includes('dataUsageMode') && !variables.filter?.networkTier) {
      suggestions.push('Consider using mobile-specific filters for network-aware queries');
    }
    
    if (!query.includes('compressionLevel')) {
      suggestions.push('Enable compression for large data transfers');
    }
    
    const isOptimized = complexity <= this.config.maximumComplexity && suggestions.length <= 2;
    
    return {
      complexity,
      suggestions,
      isOptimized,
    };
  }

  /**
   * Generate mobile-optimized query alternatives
   */
  generateMobileOptimizedQuery(originalQuery: string, context: any): {
    optimizedQuery: string;
    optimizations: string[];
  } {
    const optimizations: string[] = [];
    let optimizedQuery = originalQuery;
    
    // Add mobile-specific directives
    if (!optimizedQuery.includes('@mobileOptimized')) {
      optimizedQuery = optimizedQuery.replace(
        /query\s+(\w+)\s*\{/,
        'query $1 @mobileOptimized(maxComplexity: 50) {'
      );
      optimizations.push('Added mobile complexity limits');
    }
    
    // Enable network optimization
    if (!optimizedQuery.includes('networkOptimized')) {
      optimizedQuery = optimizedQuery.replace(
        /assets\s*\(/,
        'assets(networkOptimized: true, '
      );
      optimizations.push('Enabled network optimization');
    }
    
    // Add pagination limits
    if (optimizedQuery.includes('first:') && !optimizedQuery.includes('first: 20')) {
      optimizedQuery = optimizedQuery.replace(/first:\s*\d+/, 'first: 20');
      optimizations.push('Reduced page size for mobile');
    }
    
    // Remove heavy fields for cellular connections
    if (context.networkType === 'cellular') {
      optimizedQuery = optimizedQuery.replace(/previewUrl\s*\n?/g, '');
      optimizedQuery = optimizedQuery.replace(/downloadUrl\s*\n?/g, '');
      optimizedQuery = optimizedQuery.replace(/metadata\s*\n?/g, '');
      optimizations.push('Removed heavy fields for cellular connection');
    }
    
    // Add compression directives
    if (optimizedQuery.includes('thumbnail') && !optimizedQuery.includes('@compress')) {
      optimizedQuery = optimizedQuery.replace(/thumbnail/, 'thumbnail @compress');
      optimizations.push('Added compression for images');
    }
    
    return {
      optimizedQuery,
      optimizations,
    };
  }

  /**
   * Get complexity limits based on device capabilities
   */
  getMobileComplexityLimits(deviceInfo?: any): ComplexityConfig {
    const baseConfig = { ...this.config };
    
    if (!deviceInfo) return baseConfig;
    
    // Adjust limits based on device capabilities
    if (deviceInfo.ram && deviceInfo.ram < 4) {
      // Low RAM devices get stricter limits
      baseConfig.maximumComplexity = 50;
      baseConfig.listFactor = 5;
    }
    
    if (deviceInfo.networkType === 'cellular') {
      // Cellular connections get more conservative limits
      baseConfig.maximumComplexity = Math.floor(baseConfig.maximumComplexity * 0.7);
    }
    
    if (deviceInfo.batteryLevel && deviceInfo.batteryLevel < 0.2) {
      // Low battery gets very strict limits
      baseConfig.maximumComplexity = Math.floor(baseConfig.maximumComplexity * 0.5);
    }
    
    return baseConfig;
  }

  /**
   * Extract arguments from a GraphQL field node
   */
  private extractArguments(node: FieldNode): any {
    const args: any = {};
    
    if (node.arguments) {
      for (const arg of node.arguments) {
        const argName = arg.name.value;
        
        if (arg.value.kind === 'IntValue') {
          args[argName] = parseInt(arg.value.value);
        } else if (arg.value.kind === 'StringValue') {
          args[argName] = arg.value.value;
        } else if (arg.value.kind === 'BooleanValue') {
          args[argName] = arg.value.value;
        } else if (arg.value.kind === 'Variable') {
          // Handle variables - in a real implementation, you'd resolve these
          args[argName] = `$${arg.value.name.value}`;
        }
      }
    }
    
    return args;
  }

  /**
   * Monitor query performance and adjust complexity limits
   */
  monitorAndAdjustLimits(queryPerformanceData: {
    queryName: string;
    complexity: number;
    executionTime: number;
    deviceInfo: any;
  }[]): void {
    // Analyze performance patterns
    const avgComplexityByDevice = new Map();
    const avgExecutionTimeByComplexity = new Map();
    
    for (const data of queryPerformanceData) {
      const deviceKey = `${data.deviceInfo.platform}-${data.deviceInfo.ram}`;
      
      if (!avgComplexityByDevice.has(deviceKey)) {
        avgComplexityByDevice.set(deviceKey, []);
      }
      avgComplexityByDevice.get(deviceKey).push({
        complexity: data.complexity,
        executionTime: data.executionTime,
      });
    }
    
    // Adjust limits based on performance data
    for (const [deviceKey, measurements] of avgComplexityByDevice) {
      const avgExecutionTime = measurements.reduce((sum: number, m: any) => sum + m.executionTime, 0) / measurements.length;
      const avgComplexity = measurements.reduce((sum: number, m: any) => sum + m.complexity, 0) / measurements.length;
      
      // If average execution time is too high, reduce complexity limits
      if (avgExecutionTime > 2000 && avgComplexity > 50) {
        console.warn(`Reducing complexity limits for ${deviceKey} due to poor performance`);
        // In a real implementation, you'd update the limits
      }
    }
  }
}

export default MobileQueryComplexityAnalyzer;