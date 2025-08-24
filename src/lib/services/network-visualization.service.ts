'use client'

/**
 * 3D Network Visualization Service for Board Relationships
 * Enterprise-grade network analysis and visualization for $500K/seat application
 */

import { EnhancedBoardMate, NetworkRelationship, InfluenceMetrics, CollaborationPattern } from '@/types/boardmates'

export interface NetworkNode {
  id: string
  name: string
  position: { x: number; y: number; z: number }
  size: number
  color: string
  influence_score: number
  centrality: number
  connections: string[]
  metadata: {
    role: string
    experience: number
    expertise: string[]
    performance_score: number
    risk_level: number
  }
}

export interface NetworkEdge {
  id: string
  source: string
  target: string
  strength: number
  type: 'collaboration' | 'mentorship' | 'conflict' | 'reporting' | 'expertise'
  weight: number
  metadata: {
    interaction_frequency: number
    shared_projects: number
    communication_score: number
    last_interaction: Date
  }
}

export interface Network3DData {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  clusters: NetworkCluster[]
  metrics: NetworkMetrics
}

export interface NetworkCluster {
  id: string
  name: string
  members: string[]
  center: { x: number; y: number; z: number }
  radius: number
  color: string
  influence_level: 'low' | 'medium' | 'high' | 'critical'
}

export interface NetworkMetrics {
  density: number
  clustering_coefficient: number
  average_path_length: number
  centralization: number
  modularity: number
  influence_distribution: {
    concentrated: number
    distributed: number
    balanced: number
  }
}

export interface VisualizationConfig {
  layout: 'force-directed' | 'circular' | 'hierarchical' | 'cluster'
  physics: {
    attraction: number
    repulsion: number
    damping: number
    spring_length: number
  }
  rendering: {
    node_size_factor: number
    edge_width_factor: number
    animation_speed: number
    quality: 'low' | 'medium' | 'high' | 'ultra'
  }
  interaction: {
    zoom_enabled: boolean
    rotation_enabled: boolean
    selection_enabled: boolean
    hover_effects: boolean
  }
}

export interface NetworkAnalysisResult {
  key_influencers: NetworkNode[]
  isolated_members: NetworkNode[]
  communication_bridges: NetworkNode[]
  potential_conflicts: NetworkEdge[]
  collaboration_opportunities: { source: string; target: string; potential: number }[]
  risk_patterns: {
    type: 'single_point_failure' | 'echo_chamber' | 'isolation' | 'over_dependence'
    description: string
    affected_members: string[]
    risk_level: number
    recommendations: string[]
  }[]
}

export class NetworkVisualizationService {
  private networkData: Network3DData | null = null
  private config: VisualizationConfig
  private analysisCache: Map<string, NetworkAnalysisResult> = new Map()

  constructor() {
    this.config = this.getDefaultConfig()
  }

  /**
   * Generate 3D network data from board members
   */
  async generateNetworkData(
    boardMembers: EnhancedBoardMate[],
    relationships?: NetworkRelationship[]
  ): Promise<Network3DData> {
    const nodes = await this.createNetworkNodes(boardMembers)
    const edges = await this.createNetworkEdges(boardMembers, relationships)
    const clusters = await this.identifyNetworkClusters(nodes, edges)
    const metrics = await this.calculateNetworkMetrics(nodes, edges)

    this.networkData = {
      nodes,
      edges,
      clusters,
      metrics
    }

    return this.networkData
  }

  /**
   * Create network nodes from board members
   */
  private async createNetworkNodes(boardMembers: EnhancedBoardMate[]): Promise<NetworkNode[]> {
    return boardMembers.map((member, index) => {
      const angle = (index / boardMembers.length) * 2 * Math.PI
      const radius = 50 + (member.network_position?.influence_score || 0.5) * 30
      const height = (member.performance_metrics?.overall_score || 0.7) * 20 - 10

      return {
        id: member.id,
        name: member.full_name,
        position: {
          x: Math.cos(angle) * radius,
          y: height,
          z: Math.sin(angle) * radius
        },
        size: 5 + (member.network_position?.influence_score || 0.5) * 10,
        color: this.getNodeColor(member),
        influence_score: member.network_position?.influence_score || 0.5,
        centrality: member.network_position?.centrality_measure || 0.5,
        connections: this.getNodeConnections(member, boardMembers),
        metadata: {
          role: member.role,
          experience: member.expertise_profile?.years_experience || 0,
          expertise: member.expertise_profile?.core_competencies || [],
          performance_score: member.performance_metrics?.overall_score || 0.7,
          risk_level: member.risk_assessment?.overall_risk_level || 0.2
        }
      }
    })
  }

  /**
   * Create network edges representing relationships
   */
  private async createNetworkEdges(
    boardMembers: EnhancedBoardMate[],
    relationships?: NetworkRelationship[]
  ): Promise<NetworkEdge[]> {
    const edges: NetworkEdge[] = []

    // Generate edges based on relationships or infer from member data
    for (let i = 0; i < boardMembers.length; i++) {
      for (let j = i + 1; j < boardMembers.length; j++) {
        const memberA = boardMembers[i]
        const memberB = boardMembers[j]

        const relationship = this.analyzeRelationship(memberA, memberB)
        
        if (relationship.strength > 0.3) { // Only create edges for meaningful relationships
          edges.push({
            id: `edge-${memberA.id}-${memberB.id}`,
            source: memberA.id,
            target: memberB.id,
            strength: relationship.strength,
            type: relationship.type,
            weight: relationship.weight,
            metadata: {
              interaction_frequency: relationship.interaction_frequency,
              shared_projects: relationship.shared_projects,
              communication_score: relationship.communication_score,
              last_interaction: new Date()
            }
          })
        }
      }
    }

    return edges
  }

  /**
   * Analyze relationship between two board members
   */
  private analyzeRelationship(memberA: EnhancedBoardMate, memberB: EnhancedBoardMate) {
    // Skill similarity
    const skillsA = memberA.expertise_profile?.core_competencies || []
    const skillsB = memberB.expertise_profile?.core_competencies || []
    const skillOverlap = skillsA.filter(skill => skillsB.includes(skill)).length
    const skillSimilarity = skillOverlap / Math.max(skillsA.length, skillsB.length, 1)

    // Role compatibility
    const roleHierarchy = { owner: 4, admin: 3, member: 2, viewer: 1 }
    const roleDistance = Math.abs(roleHierarchy[memberA.role] - roleHierarchy[memberB.role]) / 3

    // Experience compatibility
    const experienceA = memberA.expertise_profile?.years_experience || 0
    const experienceB = memberB.expertise_profile?.years_experience || 0
    const experienceCompatibility = 1 - Math.abs(experienceA - experienceB) / 30

    // Performance correlation
    const performanceA = memberA.performance_metrics?.overall_score || 0.7
    const performanceB = memberB.performance_metrics?.overall_score || 0.7
    const performanceAlignment = 1 - Math.abs(performanceA - performanceB)

    // Calculate overall relationship strength
    const strength = (skillSimilarity * 0.3 + 
                     (1 - roleDistance) * 0.2 + 
                     experienceCompatibility * 0.2 + 
                     performanceAlignment * 0.3)

    // Determine relationship type
    let type: NetworkEdge['type'] = 'collaboration'
    if (skillSimilarity > 0.7) type = 'expertise'
    else if (roleDistance > 0.5) type = 'mentorship'
    else if (performanceAlignment < 0.3) type = 'conflict'

    return {
      strength: Math.max(0, Math.min(1, strength)),
      type,
      weight: strength * 10,
      interaction_frequency: strength * 100,
      shared_projects: Math.floor(strength * 5),
      communication_score: strength * 0.9 + 0.1
    }
  }

  /**
   * Identify network clusters
   */
  private async identifyNetworkClusters(
    nodes: NetworkNode[], 
    edges: NetworkEdge[]
  ): Promise<NetworkCluster[]> {
    const clusters: NetworkCluster[] = []
    const visited = new Set<string>()
    
    // Group by expertise
    const expertiseClusters = new Map<string, NetworkNode[]>()
    
    nodes.forEach(node => {
      node.metadata.expertise.forEach(expertise => {
        if (!expertiseClusters.has(expertise)) {
          expertiseClusters.set(expertise, [])
        }
        expertiseClusters.get(expertise)!.push(node)
      })
    })

    // Create clusters from expertise groups
    expertiseClusters.forEach((clusterNodes, expertise) => {
      if (clusterNodes.length >= 2) {
        const center = this.calculateClusterCenter(clusterNodes)
        const radius = this.calculateClusterRadius(clusterNodes, center)
        const influenceLevel = this.calculateClusterInfluence(clusterNodes)

        clusters.push({
          id: `cluster-${expertise}`,
          name: `${expertise} Expertise`,
          members: clusterNodes.map(n => n.id),
          center,
          radius,
          color: this.getClusterColor(expertise),
          influence_level: influenceLevel
        })
      }
    })

    // Add role-based clusters
    const roleClusters = this.groupByRole(nodes)
    roleClusters.forEach((roleNodes, role) => {
      if (roleNodes.length >= 2) {
        const center = this.calculateClusterCenter(roleNodes)
        const radius = this.calculateClusterRadius(roleNodes, center)
        const influenceLevel = this.calculateClusterInfluence(roleNodes)

        clusters.push({
          id: `cluster-role-${role}`,
          name: `${role} Role Cluster`,
          members: roleNodes.map(n => n.id),
          center,
          radius,
          color: this.getRoleClusterColor(role),
          influence_level: influenceLevel
        })
      }
    })

    return clusters
  }

  /**
   * Calculate network metrics
   */
  private async calculateNetworkMetrics(
    nodes: NetworkNode[], 
    edges: NetworkEdge[]
  ): Promise<NetworkMetrics> {
    const totalPossibleEdges = (nodes.length * (nodes.length - 1)) / 2
    const density = edges.length / totalPossibleEdges

    // Calculate clustering coefficient
    const clusteringCoefficient = this.calculateClusteringCoefficient(nodes, edges)

    // Calculate average path length
    const averagePathLength = this.calculateAveragePathLength(nodes, edges)

    // Calculate centralization
    const centralization = this.calculateCentralization(nodes)

    // Calculate modularity (simplified)
    const modularity = this.calculateModularity(nodes, edges)

    // Calculate influence distribution
    const influenceDistribution = this.calculateInfluenceDistribution(nodes)

    return {
      density,
      clustering_coefficient: clusteringCoefficient,
      average_path_length: averagePathLength,
      centralization,
      modularity,
      influence_distribution: influenceDistribution
    }
  }

  /**
   * Perform comprehensive network analysis
   */
  async analyzeNetwork(networkData: Network3DData): Promise<NetworkAnalysisResult> {
    const cacheKey = this.generateCacheKey(networkData)
    
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey)!
    }

    const analysis: NetworkAnalysisResult = {
      key_influencers: this.identifyKeyInfluencers(networkData.nodes),
      isolated_members: this.identifyIsolatedMembers(networkData.nodes, networkData.edges),
      communication_bridges: this.identifyCommunicationBridges(networkData.nodes, networkData.edges),
      potential_conflicts: this.identifyPotentialConflicts(networkData.edges),
      collaboration_opportunities: this.identifyCollaborationOpportunities(networkData),
      risk_patterns: this.identifyRiskPatterns(networkData)
    }

    this.analysisCache.set(cacheKey, analysis)
    return analysis
  }

  /**
   * Get optimal layout for visualization
   */
  async calculateOptimalLayout(
    networkData: Network3DData,
    layoutType: VisualizationConfig['layout'] = 'force-directed'
  ): Promise<NetworkNode[]> {
    switch (layoutType) {
      case 'force-directed':
        return this.applyForceDirectedLayout(networkData)
      case 'circular':
        return this.applyCircularLayout(networkData.nodes)
      case 'hierarchical':
        return this.applyHierarchicalLayout(networkData)
      case 'cluster':
        return this.applyClusterLayout(networkData)
      default:
        return networkData.nodes
    }
  }

  /**
   * Apply force-directed layout algorithm
   */
  private async applyForceDirectedLayout(networkData: Network3DData): Promise<NetworkNode[]> {
    const nodes = [...networkData.nodes]
    const edges = networkData.edges
    const iterations = 100
    const k = 50 // Optimal distance between nodes

    for (let iter = 0; iter < iterations; iter++) {
      const forces = new Map<string, { x: number; y: number; z: number }>()

      // Initialize forces
      nodes.forEach(node => {
        forces.set(node.id, { x: 0, y: 0, z: 0 })
      })

      // Calculate repulsive forces
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeA = nodes[i]
          const nodeB = nodes[j]
          const force = forces.get(nodeA.id)!
          const forceB = forces.get(nodeB.id)!

          const dx = nodeA.position.x - nodeB.position.x
          const dy = nodeA.position.y - nodeB.position.y
          const dz = nodeA.position.z - nodeB.position.z
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.1

          const repulsion = (k * k) / distance
          const unitX = dx / distance
          const unitY = dy / distance
          const unitZ = dz / distance

          force.x += repulsion * unitX
          force.y += repulsion * unitY
          force.z += repulsion * unitZ

          forceB.x -= repulsion * unitX
          forceB.y -= repulsion * unitY
          forceB.z -= repulsion * unitZ
        }
      }

      // Calculate attractive forces from edges
      edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source)
        const targetNode = nodes.find(n => n.id === edge.target)

        if (sourceNode && targetNode) {
          const force = forces.get(sourceNode.id)!
          const forceTarget = forces.get(targetNode.id)!

          const dx = targetNode.position.x - sourceNode.position.x
          const dy = targetNode.position.y - sourceNode.position.y
          const dz = targetNode.position.z - sourceNode.position.z
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.1

          const attraction = (distance * distance) / k * edge.strength
          const unitX = dx / distance
          const unitY = dy / distance
          const unitZ = dz / distance

          force.x += attraction * unitX
          force.y += attraction * unitY
          force.z += attraction * unitZ

          forceTarget.x -= attraction * unitX
          forceTarget.y -= attraction * unitY
          forceTarget.z -= attraction * unitZ
        }
      })

      // Apply forces with damping
      const damping = 0.9
      const maxDisplacement = 10

      nodes.forEach(node => {
        const force = forces.get(node.id)!
        const displacement = Math.sqrt(force.x * force.x + force.y * force.y + force.z * force.z)

        if (displacement > 0) {
          const limitedDisplacement = Math.min(displacement, maxDisplacement)
          const scale = limitedDisplacement / displacement

          node.position.x += force.x * scale * damping
          node.position.y += force.y * scale * damping
          node.position.z += force.z * scale * damping
        }
      })
    }

    return nodes
  }

  /**
   * Generate voice-enabled network analysis
   */
  async processNetworkVoiceQuery(
    query: string,
    networkData: Network3DData
  ): Promise<{
    result: any
    visualization_focus?: { nodes: string[]; edges: string[] }
    natural_language_response: string
  }> {
    const normalizedQuery = query.toLowerCase()

    if (normalizedQuery.includes('influencer') || normalizedQuery.includes('leader')) {
      const influencers = this.identifyKeyInfluencers(networkData.nodes)
      return {
        result: influencers,
        visualization_focus: { nodes: influencers.map(n => n.id), edges: [] },
        natural_language_response: `I found ${influencers.length} key influencers in the board network. ${influencers[0]?.name} has the highest influence score.`
      }
    }

    if (normalizedQuery.includes('isolated') || normalizedQuery.includes('disconnected')) {
      const isolated = this.identifyIsolatedMembers(networkData.nodes, networkData.edges)
      return {
        result: isolated,
        visualization_focus: { nodes: isolated.map(n => n.id), edges: [] },
        natural_language_response: `I identified ${isolated.length} isolated members who may benefit from stronger network connections.`
      }
    }

    if (normalizedQuery.includes('cluster') || normalizedQuery.includes('group')) {
      return {
        result: networkData.clusters,
        natural_language_response: `The board network contains ${networkData.clusters.length} distinct clusters based on expertise and collaboration patterns.`
      }
    }

    if (normalizedQuery.includes('risk') || normalizedQuery.includes('problem')) {
      const risks = this.identifyRiskPatterns(networkData)
      return {
        result: risks,
        natural_language_response: `I detected ${risks.length} potential risk patterns in the network that may need attention.`
      }
    }

    // Default analysis
    const analysis = await this.analyzeNetwork(networkData)
    return {
      result: analysis,
      natural_language_response: `Here's a comprehensive analysis of the board network including key influencers, collaboration patterns, and potential improvements.`
    }
  }

  // Helper methods
  private getNodeColor(member: EnhancedBoardMate): string {
    const roleColors = {
      owner: '#8B5CF6',    // Purple
      admin: '#EF4444',    // Red
      member: '#3B82F6',   // Blue
      viewer: '#10B981'    // Green
    }
    return roleColors[member.role] || '#6B7280'
  }

  private getNodeConnections(member: EnhancedBoardMate, allMembers: EnhancedBoardMate[]): string[] {
    // Simulate connections based on expertise and roles
    return allMembers
      .filter(m => m.id !== member.id)
      .filter(m => {
        const sharedSkills = (member.expertise_profile?.core_competencies || [])
          .filter(skill => (m.expertise_profile?.core_competencies || []).includes(skill))
        return sharedSkills.length > 0 || Math.random() > 0.7
      })
      .slice(0, 4) // Limit connections
      .map(m => m.id)
  }

  private getDefaultConfig(): VisualizationConfig {
    return {
      layout: 'force-directed',
      physics: {
        attraction: 0.5,
        repulsion: 1.0,
        damping: 0.9,
        spring_length: 50
      },
      rendering: {
        node_size_factor: 1.0,
        edge_width_factor: 1.0,
        animation_speed: 1.0,
        quality: 'high'
      },
      interaction: {
        zoom_enabled: true,
        rotation_enabled: true,
        selection_enabled: true,
        hover_effects: true
      }
    }
  }

  private calculateClusterCenter(nodes: NetworkNode[]) {
    const sum = nodes.reduce(
      (acc, node) => ({
        x: acc.x + node.position.x,
        y: acc.y + node.position.y,
        z: acc.z + node.position.z
      }),
      { x: 0, y: 0, z: 0 }
    )

    return {
      x: sum.x / nodes.length,
      y: sum.y / nodes.length,
      z: sum.z / nodes.length
    }
  }

  private calculateClusterRadius(nodes: NetworkNode[], center: { x: number; y: number; z: number }): number {
    const maxDistance = nodes.reduce((max, node) => {
      const distance = Math.sqrt(
        Math.pow(node.position.x - center.x, 2) +
        Math.pow(node.position.y - center.y, 2) +
        Math.pow(node.position.z - center.z, 2)
      )
      return Math.max(max, distance)
    }, 0)

    return maxDistance + 10 // Add padding
  }

  private calculateClusterInfluence(nodes: NetworkNode[]): NetworkCluster['influence_level'] {
    const avgInfluence = nodes.reduce((sum, node) => sum + node.influence_score, 0) / nodes.length

    if (avgInfluence > 0.8) return 'critical'
    if (avgInfluence > 0.6) return 'high'
    if (avgInfluence > 0.4) return 'medium'
    return 'low'
  }

  private getClusterColor(expertise: string): string {
    const colors: Record<string, string> = {
      'Leadership': '#8B5CF6',
      'Finance': '#10B981',
      'Technology': '#3B82F6',
      'Strategy': '#F59E0B',
      'Operations': '#EF4444',
      'Marketing': '#EC4899',
      'Legal': '#6B7280'
    }
    return colors[expertise] || '#9CA3AF'
  }

  private getRoleClusterColor(role: string): string {
    const colors: Record<string, string> = {
      'owner': '#7C3AED',
      'admin': '#DC2626',
      'member': '#2563EB',
      'viewer': '#059669'
    }
    return colors[role] || '#6B7280'
  }

  private groupByRole(nodes: NetworkNode[]): Map<string, NetworkNode[]> {
    const groups = new Map<string, NetworkNode[]>()
    
    nodes.forEach(node => {
      const role = node.metadata.role
      if (!groups.has(role)) {
        groups.set(role, [])
      }
      groups.get(role)!.push(node)
    })

    return groups
  }

  private calculateClusteringCoefficient(nodes: NetworkNode[], edges: NetworkEdge[]): number {
    // Simplified clustering coefficient calculation
    return 0.6 + Math.random() * 0.3 // Placeholder
  }

  private calculateAveragePathLength(nodes: NetworkNode[], edges: NetworkEdge[]): number {
    // Simplified average path length calculation
    return 2.5 + Math.random() * 1.0 // Placeholder
  }

  private calculateCentralization(nodes: NetworkNode[]): number {
    const maxInfluence = Math.max(...nodes.map(n => n.influence_score))
    const avgInfluence = nodes.reduce((sum, n) => sum + n.influence_score, 0) / nodes.length
    return (maxInfluence - avgInfluence) / maxInfluence
  }

  private calculateModularity(nodes: NetworkNode[], edges: NetworkEdge[]): number {
    // Simplified modularity calculation
    return 0.3 + Math.random() * 0.4 // Placeholder
  }

  private calculateInfluenceDistribution(nodes: NetworkNode[]) {
    const influences = nodes.map(n => n.influence_score).sort((a, b) => b - a)
    const total = influences.reduce((sum, inf) => sum + inf, 0)
    
    const top20Percent = Math.ceil(influences.length * 0.2)
    const concentrated = influences.slice(0, top20Percent).reduce((sum, inf) => sum + inf, 0) / total

    return {
      concentrated: concentrated,
      distributed: 1 - concentrated,
      balanced: 1 - Math.abs(0.5 - concentrated) * 2
    }
  }

  private identifyKeyInfluencers(nodes: NetworkNode[]): NetworkNode[] {
    return nodes
      .filter(node => node.influence_score > 0.7)
      .sort((a, b) => b.influence_score - a.influence_score)
      .slice(0, 5)
  }

  private identifyIsolatedMembers(nodes: NetworkNode[], edges: NetworkEdge[]): NetworkNode[] {
    const connectedNodes = new Set<string>()
    edges.forEach(edge => {
      connectedNodes.add(edge.source)
      connectedNodes.add(edge.target)
    })

    return nodes.filter(node => {
      const connections = edges.filter(e => e.source === node.id || e.target === node.id)
      return connections.length <= 1
    })
  }

  private identifyCommunicationBridges(nodes: NetworkNode[], edges: NetworkEdge[]): NetworkNode[] {
    // Identify nodes that connect different clusters
    return nodes.filter(node => {
      const connections = edges.filter(e => e.source === node.id || e.target === node.id)
      return connections.length >= 3 && node.centrality > 0.6
    })
  }

  private identifyPotentialConflicts(edges: NetworkEdge[]): NetworkEdge[] {
    return edges.filter(edge => edge.type === 'conflict' || edge.strength < 0.3)
  }

  private identifyCollaborationOpportunities(networkData: Network3DData) {
    const opportunities: { source: string; target: string; potential: number }[] = []
    const nodes = networkData.nodes
    const edges = networkData.edges

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i]
        const nodeB = nodes[j]
        
        // Check if they're not already connected
        const existingEdge = edges.find(e => 
          (e.source === nodeA.id && e.target === nodeB.id) ||
          (e.source === nodeB.id && e.target === nodeA.id)
        )

        if (!existingEdge) {
          // Calculate collaboration potential
          const skillOverlap = nodeA.metadata.expertise.filter(skill => 
            nodeB.metadata.expertise.includes(skill)
          ).length

          const potential = skillOverlap * 0.3 + 
                          (nodeA.influence_score + nodeB.influence_score) * 0.35 +
                          Math.random() * 0.35

          if (potential > 0.6) {
            opportunities.push({
              source: nodeA.id,
              target: nodeB.id,
              potential
            })
          }
        }
      }
    }

    return opportunities.sort((a, b) => b.potential - a.potential).slice(0, 10)
  }

  private identifyRiskPatterns(networkData: Network3DData) {
    const risks: NetworkAnalysisResult['risk_patterns'] = []

    // Single point of failure
    const criticalNodes = networkData.nodes.filter(n => n.influence_score > 0.8)
    if (criticalNodes.length === 1) {
      risks.push({
        type: 'single_point_failure',
        description: 'Board depends heavily on a single influential member',
        affected_members: criticalNodes.map(n => n.id),
        risk_level: 0.8,
        recommendations: [
          'Develop succession planning',
          'Distribute leadership responsibilities',
          'Identify backup influencers'
        ]
      })
    }

    // Isolated members
    const isolated = this.identifyIsolatedMembers(networkData.nodes, networkData.edges)
    if (isolated.length > 0) {
      risks.push({
        type: 'isolation',
        description: 'Some members are poorly connected to the network',
        affected_members: isolated.map(n => n.id),
        risk_level: 0.6,
        recommendations: [
          'Facilitate introductions',
          'Create cross-functional projects',
          'Improve onboarding process'
        ]
      })
    }

    return risks
  }

  private applyCircularLayout(nodes: NetworkNode[]): NetworkNode[] {
    return nodes.map((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI
      const radius = 60
      
      return {
        ...node,
        position: {
          x: Math.cos(angle) * radius,
          y: 0,
          z: Math.sin(angle) * radius
        }
      }
    })
  }

  private applyHierarchicalLayout(networkData: Network3DData): NetworkNode[] {
    // Sort by role hierarchy and influence
    const hierarchy = { owner: 3, admin: 2, member: 1, viewer: 0 }
    const sortedNodes = [...networkData.nodes].sort((a, b) => {
      const roleA = hierarchy[a.metadata.role as keyof typeof hierarchy] || 0
      const roleB = hierarchy[b.metadata.role as keyof typeof hierarchy] || 0
      
      if (roleA !== roleB) return roleB - roleA
      return b.influence_score - a.influence_score
    })

    return sortedNodes.map((node, index) => {
      const level = hierarchy[node.metadata.role as keyof typeof hierarchy] || 0
      const nodesAtLevel = sortedNodes.filter(n => 
        hierarchy[n.metadata.role as keyof typeof hierarchy] === level
      )
      const positionInLevel = nodesAtLevel.indexOf(node)
      
      const angle = (positionInLevel / nodesAtLevel.length) * 2 * Math.PI
      const radius = 30 + level * 25
      
      return {
        ...node,
        position: {
          x: Math.cos(angle) * radius,
          y: level * 30,
          z: Math.sin(angle) * radius
        }
      }
    })
  }

  private applyClusterLayout(networkData: Network3DData): NetworkNode[] {
    const nodes = [...networkData.nodes]
    
    networkData.clusters.forEach((cluster, clusterIndex) => {
      const clusterAngle = (clusterIndex / networkData.clusters.length) * 2 * Math.PI
      const clusterRadius = 80
      
      cluster.members.forEach((memberId, memberIndex) => {
        const node = nodes.find(n => n.id === memberId)
        if (node) {
          const memberAngle = (memberIndex / cluster.members.length) * 2 * Math.PI
          const memberRadius = 15
          
          node.position = {
            x: Math.cos(clusterAngle) * clusterRadius + Math.cos(memberAngle) * memberRadius,
            y: 0,
            z: Math.sin(clusterAngle) * clusterRadius + Math.sin(memberAngle) * memberRadius
          }
        }
      })
    })

    return nodes
  }

  private generateCacheKey(networkData: Network3DData): string {
    return `network-${networkData.nodes.length}-${networkData.edges.length}-${Date.now()}`
  }
}

// Export singleton instance
export const networkVisualizationService = new NetworkVisualizationService()