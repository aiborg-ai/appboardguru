'use client'

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber'
import { OrbitControls, Text, Html, PerspectiveCamera, Environment } from '@react-three/drei'
import { Vector3, Color, BufferGeometry, BufferAttribute, LineBasicMaterial, Line, Group, Mesh } from 'three'
import { Badge } from '@/features/shared/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/shared/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs'
import { 
  Users, 
  Network, 
  Brain, 
  Search, 
  Mic,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Download,
  Share2,
  Settings,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Star
} from 'lucide-react'
import { networkVisualizationService } from '@/lib/services/network-visualization.service'
import { voiceCommandService } from '@/lib/services/voice-command.service'
import type { 
  Network3DData, 
  NetworkNode3D, 
  NetworkLink3D, 
  LayoutType,
  NetworkAnalytics,
  NetworkCluster,
  EnhancedBoardMate
} from '@/types/boardmates'

extend({ Line })

interface NetworkVisualization3DProps {
  boardMembers: EnhancedBoardMate[]
  onMemberSelect?: (member: EnhancedBoardMate) => void
  onRelationshipCreate?: (source: string, target: string) => void
  className?: string
}

// Node component for 3D rendering
function NetworkNode({ 
  node, 
  onClick, 
  isSelected, 
  isHovered,
  onHover 
}: {
  node: NetworkNode3D
  onClick: (node: NetworkNode3D) => void
  isSelected: boolean
  isHovered: boolean
  onHover: (node: NetworkNode3D | null) => void
}) {
  const meshRef = useRef<Mesh>(null)
  const [scale, setScale] = useState(1)

  // Animate node on hover/selection
  useFrame((state, delta) => {
    if (meshRef.current) {
      const targetScale = isHovered ? 1.3 : isSelected ? 1.2 : 1
      setScale(prev => prev + (targetScale - prev) * delta * 5)
      meshRef.current.scale.setScalar(scale)
      
      // Gentle floating animation
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 2 + node.id.length) * 0.001
    }
  })

  // Color based on node type and influence
  const nodeColor = useMemo(() => {
    const colors = {
      owner: '#8B5CF6',     // Purple
      admin: '#3B82F6',     // Blue  
      member: '#10B981',    // Green
      viewer: '#6B7280',    // Gray
      expert: '#F59E0B',    // Amber
      influencer: '#EF4444' // Red
    }
    return colors[node.role as keyof typeof colors] || colors.member
  }, [node.role])

  return (
    <group position={[node.x, node.y, node.z]}>
      <mesh
        ref={meshRef}
        onClick={() => onClick(node)}
        onPointerOver={() => onHover(node)}
        onPointerOut={() => onHover(null)}
      >
        <sphereGeometry args={[node.size, 32, 32]} />
        <meshStandardMaterial 
          color={nodeColor}
          roughness={0.3}
          metalness={0.1}
          emissive={isSelected ? nodeColor : '#000000'}
          emissiveIntensity={isSelected ? 0.2 : 0}
        />
      </mesh>
      
      {/* Node label */}
      <Text
        position={[0, node.size + 0.3, 0]}
        fontSize={0.2}
        color={nodeColor}
        anchorX="center"
        anchorY="middle"
        outlineColor="#000000"
        outlineWidth={0.02}
      >
        {node.label}
      </Text>
      
      {/* Influence indicator */}
      {node.influence && node.influence > 0.7 && (
        <mesh position={[node.size + 0.2, node.size + 0.2, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial 
            color="#FFD700" 
            emissive="#FFD700"
            emissiveIntensity={0.5}
          />
        </mesh>
      )}

      {/* Tooltip on hover */}
      {isHovered && (
        <Html distanceFactor={10} position={[0, node.size + 0.8, 0]}>
          <div className="bg-black/80 backdrop-blur-sm text-white p-2 rounded-lg text-xs whitespace-nowrap pointer-events-none">
            <div className="font-semibold">{node.label}</div>
            <div className="text-gray-300">{node.role}</div>
            <div className="text-gray-400">Influence: {(node.influence * 100).toFixed(0)}%</div>
            {node.skills.length > 0 && (
              <div className="text-gray-400">
                Skills: {node.skills.slice(0, 2).join(', ')}
                {node.skills.length > 2 && '...'}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  )
}

// Connection lines between nodes
function NetworkConnections({ links, nodes }: { links: NetworkLink3D[], nodes: NetworkNode3D[] }) {
  const linesRef = useRef<Group>(null)

  const connectionGeometry = useMemo(() => {
    const positions: number[] = []
    const colors: number[] = []
    
    links.forEach(link => {
      const sourceNode = nodes.find(n => n.id === link.source)
      const targetNode = nodes.find(n => n.id === link.target)
      
      if (sourceNode && targetNode) {
        // Line positions
        positions.push(sourceNode.x, sourceNode.y, sourceNode.z)
        positions.push(targetNode.x, targetNode.y, targetNode.z)
        
        // Line colors based on strength
        const color = new Color()
        if (link.strength > 0.8) {
          color.setHex(0xff4444) // Strong - Red
        } else if (link.strength > 0.6) {
          color.setHex(0xf59e0b) // Medium - Amber
        } else {
          color.setHex(0x6b7280) // Weak - Gray
        }
        
        colors.push(color.r, color.g, color.b)
        colors.push(color.r, color.g, color.b)
      }
    })

    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
    geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
    
    return geometry
  }, [links, nodes])

  return (
    <group ref={linesRef}>
      <line geometry={connectionGeometry}>
        <lineBasicMaterial vertexColors opacity={0.6} transparent />
      </line>
    </group>
  )
}

// Cluster visualization
function ClusterVisualization({ clusters }: { clusters: NetworkCluster[] }) {
  return (
    <>
      {clusters.map((cluster, index) => (
        <group key={cluster.id}>
          {/* Cluster boundary sphere */}
          <mesh position={[cluster.center.x, cluster.center.y, cluster.center.z]}>
            <sphereGeometry args={[cluster.radius, 32, 32]} />
            <meshStandardMaterial 
              color={cluster.color}
              transparent
              opacity={0.1}
              wireframe
            />
          </mesh>
          
          {/* Cluster label */}
          <Text
            position={[cluster.center.x, cluster.center.y + cluster.radius + 0.5, cluster.center.z]}
            fontSize={0.3}
            color={cluster.color}
            anchorX="center"
            anchorY="middle"
          >
            {cluster.name}
          </Text>
        </group>
      ))}
    </>
  )
}

// Main 3D Scene Component
function NetworkScene({ 
  networkData, 
  selectedNode, 
  onNodeClick,
  hoveredNode,
  onNodeHover,
  showClusters 
}: {
  networkData: Network3DData
  selectedNode: NetworkNode3D | null
  onNodeClick: (node: NetworkNode3D) => void
  hoveredNode: NetworkNode3D | null
  onNodeHover: (node: NetworkNode3D | null) => void
  showClusters: boolean
}) {
  return (
    <>
      {/* Environment lighting */}
      <Environment preset="city" />
      
      {/* Ambient and directional lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.6} />
      <pointLight position={[-10, -10, -5]} intensity={0.3} color="#4f46e5" />
      
      {/* Network nodes */}
      {networkData.nodes.map(node => (
        <NetworkNode
          key={node.id}
          node={node}
          onClick={onNodeClick}
          isSelected={selectedNode?.id === node.id}
          isHovered={hoveredNode?.id === node.id}
          onHover={onNodeHover}
        />
      ))}
      
      {/* Network connections */}
      <NetworkConnections links={networkData.links} nodes={networkData.nodes} />
      
      {/* Cluster visualization */}
      {showClusters && networkData.clusters && (
        <ClusterVisualization clusters={networkData.clusters} />
      )}
      
      {/* Camera controls */}
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        maxDistance={50}
        minDistance={5}
      />
    </>
  )
}

// Main component
export const NetworkVisualization3D = React.memo(function NetworkVisualization3D({
  boardMembers,
  onMemberSelect,
  onRelationshipCreate,
  className = ""
}: NetworkVisualization3DProps) {
  const [networkData, setNetworkData] = useState<Network3DData | null>(null)
  const [analytics, setAnalytics] = useState<NetworkAnalytics | null>(null)
  const [selectedNode, setSelectedNode] = useState<NetworkNode3D | null>(null)
  const [hoveredNode, setHoveredNode] = useState<NetworkNode3D | null>(null)
  const [layoutType, setLayoutType] = useState<LayoutType>('force-directed')
  const [showClusters, setShowClusters] = useState(true)
  const [loading, setLoading] = useState(false)
  const [voiceQuery, setVoiceQuery] = useState('')
  const [isListening, setIsListening] = useState(false)

  // Generate network data
  const generateNetwork = useCallback(async () => {
    setLoading(true)
    try {
      const data = await networkVisualizationService.generateNetworkData(boardMembers)
      setNetworkData(data)
      
      const networkAnalytics = await networkVisualizationService.calculateNetworkAnalytics(data)
      setAnalytics(networkAnalytics)
    } catch (error) {
      console.error('Failed to generate network:', error)
    } finally {
      setLoading(false)
    }
  }, [boardMembers])

  // Apply layout
  const applyLayout = useCallback(async (layout: LayoutType) => {
    if (!networkData) return
    
    setLoading(true)
    try {
      const updatedData = await networkVisualizationService.applyLayout(networkData, layout)
      setNetworkData(updatedData)
      setLayoutType(layout)
    } catch (error) {
      console.error('Failed to apply layout:', error)
    } finally {
      setLoading(false)
    }
  }, [networkData])

  // Voice query processing
  const handleVoiceQuery = useCallback(async (query: string) => {
    if (!networkData) return
    
    try {
      const result = await networkVisualizationService.processVoiceQuery(query, networkData)
      
      if (result.highlightedNodes.length > 0) {
        // Highlight first node from results
        const firstNode = networkData.nodes.find(n => n.id === result.highlightedNodes[0])
        if (firstNode) {
          setSelectedNode(firstNode)
        }
      }
      
      // Display voice response
      if (result.response) {
        // You could show this in a toast or modal
        console.log('Voice response:', result.response)
      }
    } catch (error) {
      console.error('Failed to process voice query:', error)
    }
  }, [networkData])

  // Start voice recognition
  const startVoiceRecognition = useCallback(async () => {
    try {
      setIsListening(true)
      await voiceCommandService.startListening('user-id') // TODO: Use actual user ID
      
      // Listen for voice commands
      window.addEventListener('voiceCommandAnalytics', ((event: CustomEvent) => {
        handleVoiceQuery(event.detail.query)
      }) as EventListener)
      
    } catch (error) {
      console.error('Failed to start voice recognition:', error)
    } finally {
      setIsListening(false)
    }
  }, [handleVoiceQuery])

  // Node click handler
  const handleNodeClick = useCallback((node: NetworkNode3D) => {
    setSelectedNode(node)
    
    // Find the board member and trigger callback
    const member = boardMembers.find(m => m.id === node.id)
    if (member && onMemberSelect) {
      onMemberSelect(member)
    }
  }, [boardMembers, onMemberSelect])

  // Export network data
  const exportNetwork = useCallback(async () => {
    if (!networkData || !analytics) return
    
    const exportData = {
      networkData,
      analytics,
      timestamp: new Date().toISOString(),
      boardMembersCount: boardMembers.length
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `board-network-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [networkData, analytics, boardMembers])

  // Initialize network on mount
  useEffect(() => {
    if (boardMembers.length > 0) {
      generateNetwork()
    }
  }, [boardMembers, generateNetwork])

  if (loading && !networkData) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-gray-600">Generating 3D network visualization...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Control Panel */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Network className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Board Network 3D</h3>
            </div>
            
            {analytics && (
              <Badge variant="outline" className="text-xs">
                {analytics.totalNodes} members • {analytics.totalConnections} connections
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Layout selector */}
            <Select value={layoutType} onValueChange={(value: LayoutType) => applyLayout(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Layout" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="force-directed">Force Directed</SelectItem>
                <SelectItem value="circular">Circular</SelectItem>
                <SelectItem value="hierarchical">Hierarchical</SelectItem>
                <SelectItem value="cluster">Clustered</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Voice query */}
            <div className="flex items-center space-x-1">
              <Input
                placeholder="Ask about the network..."
                value={voiceQuery}
                onChange={(e) => setVoiceQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleVoiceQuery(voiceQuery)}
                className="w-48"
              />
              <Button
                size="sm"
                variant={isListening ? "destructive" : "outline"}
                onClick={startVoiceRecognition}
              >
                <Mic className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Controls */}
            <Button size="sm" variant="outline" onClick={exportNetwork}>
              <Download className="w-4 h-4" />
            </Button>
            
            <Button size="sm" variant="outline" onClick={() => setShowClusters(!showClusters)}>
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Voice feedback */}
        {isListening && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            🎤 Listening for network queries... Try saying "Show me the key influencers" or "Find isolated members"
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 3D Visualization */}
        <div className="flex-1 relative">
          {networkData && (
            <Canvas className="w-full h-full">
              <NetworkScene
                networkData={networkData}
                selectedNode={selectedNode}
                onNodeClick={handleNodeClick}
                hoveredNode={hoveredNode}
                onNodeHover={setHoveredNode}
                showClusters={showClusters}
              />
            </Canvas>
          )}
          
          {loading && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <div className="bg-white p-4 rounded-lg shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                  <span className="text-sm text-gray-600">Updating layout...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col">
          <Tabs defaultValue="analytics" className="flex-1">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="selected">Selected</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <TabsContent value="analytics" className="space-y-4">
                {analytics && (
                  <>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center">
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Network Metrics
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Density:</span>
                          <span className="font-medium">{(analytics.density * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg. Connections:</span>
                          <span className="font-medium">{analytics.averageDegree.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Clustering:</span>
                          <span className="font-medium">{(analytics.clusteringCoefficient * 100).toFixed(1)}%</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center">
                          <Star className="w-4 h-4 mr-2" />
                          Key Influencers
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {analytics.keyInfluencers.slice(0, 5).map((nodeId, index) => {
                          const node = networkData?.nodes.find(n => n.id === nodeId)
                          return node ? (
                            <div key={nodeId} className="flex items-center justify-between text-sm">
                              <span className="truncate">{node.label}</span>
                              <Badge variant="secondary" className="text-xs">
                                #{index + 1}
                              </Badge>
                            </div>
                          ) : null
                        })}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Isolated Members
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {analytics.isolatedNodes.slice(0, 3).map(nodeId => {
                          const node = networkData?.nodes.find(n => n.id === nodeId)
                          return node ? (
                            <div key={nodeId} className="text-sm text-orange-600">
                              {node.label}
                            </div>
                          ) : null
                        })}
                        {analytics.isolatedNodes.length === 0 && (
                          <div className="text-sm text-green-600 flex items-center">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            No isolated members
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>
              
              <TabsContent value="selected" className="space-y-4">
                {selectedNode ? (
                  <>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{selectedNode.label}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Role</div>
                          <Badge variant="outline">{selectedNode.role}</Badge>
                        </div>
                        
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Influence Score</div>
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${selectedNode.influence * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">
                              {(selectedNode.influence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Connections</div>
                          <div className="text-sm font-medium">
                            {networkData?.links.filter(l => 
                              l.source === selectedNode.id || l.target === selectedNode.id
                            ).length || 0}
                          </div>
                        </div>
                        
                        {selectedNode.skills.length > 0 && (
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Skills</div>
                            <div className="flex flex-wrap gap-1">
                              {selectedNode.skills.slice(0, 4).map(skill => (
                                <Badge key={skill} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {selectedNode.skills.length > 4 && (
                                <Badge variant="outline" className="text-xs">
                                  +{selectedNode.skills.length - 4}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <div className="text-center text-gray-500 text-sm py-8">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Select a member to view details
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="insights" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <Brain className="w-4 h-4 mr-2" />
                      AI Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="font-medium text-blue-900 mb-1">Network Health</div>
                      <div className="text-blue-700">
                        Your board network shows good connectivity with {analytics?.density ? (analytics.density * 100).toFixed(0) : '0'}% density.
                      </div>
                    </div>
                    
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="font-medium text-amber-900 mb-1">Recommendations</div>
                      <div className="text-amber-700">
                        Consider strengthening connections between isolated members to improve collaboration.
                      </div>
                    </div>
                    
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="font-medium text-green-900 mb-1">Strengths</div>
                      <div className="text-green-700">
                        Well-distributed influence across key stakeholders promotes balanced decision-making.
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
})

export default NetworkVisualization3D