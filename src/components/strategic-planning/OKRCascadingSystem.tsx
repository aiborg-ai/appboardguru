/**
 * OKR Cascading System Component
 * 
 * Provides comprehensive OKR management with:
 * - Board-level objective setting
 * - Multi-level cascading visualization
 * - Alignment gap analysis
 * - Progress tracking and updates
 * - Performance correlation analysis
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { AlertTriangle, Target, TrendingUp, TrendingDown, 
         Users, Building, ChevronRight, ChevronDown, Plus, 
         Edit, BarChart3, AlertCircle, CheckCircle } from 'lucide-react'
import { useStrategicPlanning } from '../../hooks/useStrategicPlanning'
import { OKR, KeyResult, AlignmentGap } from '../../types/strategic-planning'

interface OKRCascadingSystemProps {
  organizationId: string
  userId: string
  userRole: 'board' | 'executive' | 'manager' | 'member'
  period?: { start: Date; end: Date }
  onOKRUpdate?: (okr: OKR) => void
  onCreateOKR?: () => void
}

interface OKRTreeNode extends OKR {
  children: OKRTreeNode[]
  level_depth: number
  cascade_path: string[]
}

export const OKRCascadingSystem: React.FC<OKRCascadingSystemProps> = ({
  organizationId,
  userId,
  userRole,
  period,
  onOKRUpdate,
  onCreateOKR
}) => {
  const [selectedOKR, setSelectedOKR] = useState<OKR | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState('hierarchy')
  const [showAlignmentGaps, setShowAlignmentGaps] = useState(false)

  const {
    okrHierarchy,
    isLoading,
    error,
    updateKeyResult,
    createOKR,
    refreshOKRData
  } = useStrategicPlanning(organizationId)

  // Memoized OKR tree with enhanced hierarchy structure
  const okrTree = useMemo(() => {
    if (!okrHierarchy?.okr_tree) return []
    
    const buildEnhancedTree = (okrs: OKR[], parentPath: string[] = [], depth = 0): OKRTreeNode[] => {
      return okrs.map(okr => {
        const currentPath = [...parentPath, okr.id]
        const children = okr.children || []
        
        return {
          ...okr,
          children: buildEnhancedTree(children, currentPath, depth + 1),
          level_depth: depth,
          cascade_path: currentPath
        }
      })
    }

    return buildEnhancedTree(okrHierarchy.okr_tree)
  }, [okrHierarchy])

  // Performance summary calculations
  const performanceSummary = useMemo(() => {
    if (!okrHierarchy?.performance_summary) {
      return { on_track: 0, at_risk: 0, off_track: 0, average_progress: 0 }
    }
    return okrHierarchy.performance_summary
  }, [okrHierarchy])

  // Alignment analysis
  const alignmentAnalysis = useMemo(() => {
    return okrHierarchy?.alignment_analysis || {
      overall_alignment_score: 0,
      gaps: [],
      cascade_effectiveness: 0,
      orphaned_okrs: []
    }
  }, [okrHierarchy])

  const toggleNodeExpansion = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }, [])

  const handleKeyResultUpdate = useCallback(async (
    okrId: string,
    keyResultId: string,
    value: number,
    confidence?: number,
    notes?: string
  ) => {
    try {
      const result = await updateKeyResult(okrId, keyResultId, {
        current_value: value,
        confidence,
        notes
      })
      
      if (result.success && onOKRUpdate) {
        onOKRUpdate(result.data)
      }
    } catch (error) {
      console.error('Failed to update key result:', error)
    }
  }, [updateKeyResult, onOKRUpdate])

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'bg-green-500'
      case 'at_risk': return 'bg-yellow-500'
      case 'off_track': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'on_track': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'at_risk': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'off_track': return <AlertCircle className="h-4 w-4 text-red-600" />
      default: return <Target className="h-4 w-4 text-gray-600" />
    }
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'board': return <Building className="h-4 w-4" />
      case 'executive': return <Users className="h-4 w-4" />
      case 'department': return <Target className="h-4 w-4" />
      case 'team': return <Users className="h-4 w-4 opacity-75" />
      case 'individual': return <Target className="h-4 w-4 opacity-50" />
      default: return <Target className="h-4 w-4" />
    }
  }

  const renderOKRNode = (node: OKRTreeNode) => {
    const isExpanded = expandedNodes.has(node.id)
    const hasChildren = node.children.length > 0
    const indentation = node.level_depth * 24

    return (
      <div key={node.id} className="mb-2">
        <Card 
          className={`p-4 transition-all hover:shadow-md cursor-pointer border-l-4 ${
            selectedOKR?.id === node.id ? 'border-l-blue-500 bg-blue-50' : 'border-l-gray-300'
          }`}
          style={{ marginLeft: `${indentation}px` }}
          onClick={() => setSelectedOKR(node)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleNodeExpansion(node.id)
                    }}
                    className="p-1 h-auto"
                  >
                    {isExpanded ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                  </Button>
                )}
                {getLevelIcon(node.level)}
                <Badge variant="outline" className="text-xs">
                  {node.level.toUpperCase()}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {node.objective_category.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>

              <h3 className="font-semibold text-gray-900 mb-1">{node.objective}</h3>
              {node.objective_description && (
                <p className="text-sm text-gray-600 mb-3">{node.objective_description}</p>
              )}

              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-2">
                  {getHealthStatusIcon(node.health_status)}
                  <span className="text-sm font-medium">{node.health_status.replace('_', ' ')}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-24">
                    <Progress 
                      value={node.overall_progress} 
                      className="h-2"
                    />
                  </div>
                  <span className="text-sm font-medium">{Math.round(node.overall_progress)}%</span>
                </div>

                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <BarChart3 className="h-4 w-4" />
                  <span>Confidence: {node.confidence_level}/10</span>
                </div>
              </div>

              {node.key_results && node.key_results.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Key Results:</h4>
                  {node.key_results.slice(0, isExpanded ? undefined : 2).map((kr, index) => (
                    <KeyResultCard 
                      key={kr.id}
                      keyResult={kr}
                      okrId={node.id}
                      onUpdate={handleKeyResultUpdate}
                      isCompact={!isExpanded}
                    />
                  ))}
                  {!isExpanded && node.key_results.length > 2 && (
                    <button 
                      className="text-xs text-blue-600 hover:text-blue-800"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleNodeExpansion(node.id)
                      }}
                    >
                      +{node.key_results.length - 2} more key results
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              <Badge 
                variant="outline" 
                className={`${getHealthStatusColor(node.health_status)} text-white border-0`}
              >
                {Math.round(node.cascade_alignment_score)}/10
              </Badge>
              
              {userRole === 'board' || userRole === 'executive' || node.owner_id === userId ? (
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        </Card>

        {isExpanded && hasChildren && (
          <div className="mt-2">
            {node.children.map(child => renderOKRNode(child))}
          </div>
        )}
      </div>
    )
  }

  const renderAlignmentAnalysis = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Overall Alignment</p>
              <p className="text-2xl font-bold text-gray-900">
                {alignmentAnalysis.overall_alignment_score.toFixed(1)}/10
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Cascade Effectiveness</p>
              <p className="text-2xl font-bold text-gray-900">
                {alignmentAnalysis.cascade_effectiveness.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Alignment Gaps</p>
              <p className="text-2xl font-bold text-gray-900">
                {alignmentAnalysis.gaps.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {alignmentAnalysis.gaps.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Alignment Gaps
          </h3>
          <div className="space-y-4">
            {alignmentAnalysis.gaps.map((gap: AlignmentGap, index) => (
              <div key={index} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={`
                        ${gap.severity === 'high' ? 'border-red-500 text-red-700' : 
                          gap.severity === 'medium' ? 'border-yellow-500 text-yellow-700' : 
                          'border-blue-500 text-blue-700'}
                      `}>
                        {gap.severity.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-gray-600">{gap.gap_type.replace('_', ' ')}</span>
                    </div>
                    <p className="text-gray-900 mb-2">{gap.description}</p>
                    <p className="text-sm text-gray-600">
                      <strong>Recommendation:</strong> {gap.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {alignmentAnalysis.orphaned_okrs.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Orphaned OKRs
          </h3>
          <p className="text-gray-600 mb-4">
            The following OKRs are not properly connected to the cascade hierarchy:
          </p>
          <div className="grid gap-2">
            {alignmentAnalysis.orphaned_okrs.map((okrId, index) => {
              const orphanedOKR = okrTree.find(findOKRById(okrId))
              return orphanedOKR ? (
                <div key={okrId} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <p className="font-medium text-red-900">{orphanedOKR.objective}</p>
                    <p className="text-sm text-red-600">Level: {orphanedOKR.level}</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-red-600 border-red-300">
                    Connect to Parent
                  </Button>
                </div>
              ) : null
            })}
          </div>
        </Card>
      )}
    </div>
  )

  const findOKRById = (id: string) => (node: OKRTreeNode): boolean => {
    if (node.id === id) return true
    return node.children.some(findOKRById(id))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading OKRs</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={refreshOKRData}>
          Try Again
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600">On Track</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{performanceSummary.on_track}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span className="text-sm font-medium text-gray-600">At Risk</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{performanceSummary.at_risk}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-gray-600">Off Track</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{performanceSummary.off_track}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Avg Progress</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {Math.round(performanceSummary.average_progress)}%
          </p>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="hierarchy">OKR Hierarchy</TabsTrigger>
            <TabsTrigger value="alignment">Alignment Analysis</TabsTrigger>
            <TabsTrigger value="performance">Performance Dashboard</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAlignmentGaps(!showAlignmentGaps)}
              className={showAlignmentGaps ? 'bg-yellow-50 border-yellow-300' : ''}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Show Gaps
            </Button>
            
            {(userRole === 'board' || userRole === 'executive') && (
              <Button onClick={onCreateOKR}>
                <Plus className="h-4 w-4 mr-1" />
                Create OKR
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="hierarchy" className="space-y-4">
          <div className="space-y-2">
            {okrTree.map(node => renderOKRNode(node))}
          </div>
        </TabsContent>

        <TabsContent value="alignment">
          {renderAlignmentAnalysis()}
        </TabsContent>

        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance charts and analytics would go here */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Progress Trend</h3>
              {/* Chart component would go here */}
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Progress trend chart</p>
              </div>
            </Card>
            
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Confidence Levels</h3>
              {/* Chart component would go here */}
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Confidence levels chart</p>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Key Result Card Component
 */
interface KeyResultCardProps {
  keyResult: KeyResult
  okrId: string
  onUpdate: (okrId: string, keyResultId: string, value: number, confidence?: number, notes?: string) => void
  isCompact?: boolean
}

const KeyResultCard: React.FC<KeyResultCardProps> = ({
  keyResult,
  okrId,
  onUpdate,
  isCompact = false
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(keyResult.current_value.toString())
  const [editConfidence, setEditConfidence] = useState(5)
  const [editNotes, setEditNotes] = useState('')

  const progressPercentage = keyResult.target_value !== 0 
    ? Math.min(100, Math.max(0, (keyResult.current_value / keyResult.target_value) * 100))
    : 0

  const handleSave = () => {
    const numericValue = parseFloat(editValue)
    if (!isNaN(numericValue)) {
      onUpdate(okrId, keyResult.id, numericValue, editConfidence, editNotes)
      setIsEditing(false)
    }
  }

  const getTrendIcon = () => {
    if (keyResult.progress_updates && keyResult.progress_updates.length >= 2) {
      const recent = keyResult.progress_updates[keyResult.progress_updates.length - 1]
      const previous = keyResult.progress_updates[keyResult.progress_updates.length - 2]
      
      if (recent.value > previous.value) {
        return <TrendingUp className="h-4 w-4 text-green-600" />
      } else if (recent.value < previous.value) {
        return <TrendingDown className="h-4 w-4 text-red-600" />
      }
    }
    return null
  }

  if (isCompact) {
    return (
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
        <span className="flex-1 truncate">{keyResult.description}</span>
        <div className="flex items-center gap-2">
          <div className="w-16">
            <Progress value={progressPercentage} className="h-1" />
          </div>
          <span className="text-xs font-medium w-12">
            {Math.round(progressPercentage)}%
          </span>
          {getTrendIcon()}
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 bg-gray-50 rounded-lg border">
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-medium text-gray-900 flex-1">
          {keyResult.description}
        </p>
        {getTrendIcon()}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
        <span>Baseline: {keyResult.baseline_value} {keyResult.unit}</span>
        <span>Target: {keyResult.target_value} {keyResult.unit}</span>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1">
          <Progress value={progressPercentage} className="h-2" />
        </div>
        <span className="text-sm font-medium">
          {Math.round(progressPercentage)}%
        </span>
      </div>

      {isEditing ? (
        <div className="space-y-2 p-2 bg-white rounded border">
          <div className="flex gap-2">
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-2 py-1 border rounded text-sm"
              placeholder="Current value"
            />
            <input
              type="range"
              min="1"
              max="10"
              value={editConfidence}
              onChange={(e) => setEditConfidence(parseInt(e.target.value))}
              className="w-20"
            />
            <span className="text-xs self-center">Conf: {editConfidence}</span>
          </div>
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            className="w-full px-2 py-1 border rounded text-sm"
            placeholder="Notes (optional)"
            rows={2}
          />
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>Current: {keyResult.current_value} {keyResult.unit}</span>
            {keyResult.progress_updates && keyResult.progress_updates.length > 0 && (
              <span>
                (Last updated: {new Date(keyResult.progress_updates[keyResult.progress_updates.length - 1].date).toLocaleDateString()})
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="text-xs"
          >
            Update
          </Button>
        </div>
      )}
    </div>
  )
}

export default OKRCascadingSystem