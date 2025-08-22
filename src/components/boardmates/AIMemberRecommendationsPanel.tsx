/**
 * AI Member Recommendations Panel - Enterprise Premium Feature
 * Sophisticated AI-powered board member recommendations with team intelligence
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/features/shared/ui/card'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/features/shared/ui/avatar'
import { Progress } from '@/features/shared/ui/progress'
import { Separator } from '@/features/shared/ui/separator'
import { 
  Brain, 
  TrendingUp, 
  Shield, 
  Users, 
  Target,
  AlertTriangle,
  CheckCircle2,
  Zap,
  BarChart3,
  Eye,
  Sparkles,
  Network,
  Award,
  Lightbulb,
  MessageSquare,
  Clock,
  Star,
  ArrowRight,
  RefreshCw,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { aiMemberRecommendationService } from '@/lib/services/ai-member-recommendations.service'
import type { 
  MemberRecommendation, 
  TeamIntelligence, 
  EnhancedBoardMate,
  AIRecommendationScore
} from '@/types/boardmates'
import type { VaultId, OrganizationId } from '@/types/branded'

interface AIMemberRecommendationsPanelProps {
  vaultId: VaultId
  organizationId: OrganizationId
  currentMembers: EnhancedBoardMate[]
  onMemberSelect: (member: EnhancedBoardMate) => void
  onTeamAnalysis: (analysis: TeamIntelligence) => void
  className?: string
  isVisible?: boolean
}

interface RecommendationFilter {
  scoreThreshold: number
  maxRecommendations: number
  focusArea: 'diversity' | 'expertise' | 'performance' | 'risk_mitigation' | 'all'
  riskTolerance: 'conservative' | 'balanced' | 'aggressive'
}

export default function AIMemberRecommendationsPanel({
  vaultId,
  organizationId,
  currentMembers,
  onMemberSelect,
  onTeamAnalysis,
  className,
  isVisible = true
}: AIMemberRecommendationsPanelProps) {
  const [recommendations, setRecommendations] = useState<MemberRecommendation[]>([])
  const [teamIntelligence, setTeamIntelligence] = useState<TeamIntelligence | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null)
  
  const [filters, setFilters] = useState<RecommendationFilter>({
    scoreThreshold: 70,
    maxRecommendations: 5,
    focusArea: 'all',
    riskTolerance: 'balanced'
  })

  // Load AI recommendations
  const loadRecommendations = useCallback(async () => {
    if (!isVisible || currentMembers.length === 0) return

    setIsLoading(true)
    setError(null)

    try {
      const [recommendationsResult, intelligenceResult] = await Promise.all([
        aiMemberRecommendationService.getRecommendations(
          vaultId,
          organizationId,
          currentMembers,
          {
            maxRecommendations: filters.maxRecommendations,
            requiredSkills: filters.focusArea !== 'all' ? [filters.focusArea] : undefined
          }
        ),
        aiMemberRecommendationService.getBoardIntelligence(
          vaultId,
          organizationId,
          currentMembers
        )
      ])

      setRecommendations(recommendationsResult)
      setTeamIntelligence(intelligenceResult.compositionAnalysis)
      onTeamAnalysis(intelligenceResult.compositionAnalysis)

    } catch (err) {
      console.error('Error loading AI recommendations:', err)
      setError('Failed to load AI recommendations')
    } finally {
      setIsLoading(false)
    }
  }, [vaultId, organizationId, currentMembers, filters, isVisible, onTeamAnalysis])

  // Auto-load recommendations when dependencies change
  useEffect(() => {
    loadRecommendations()
  }, [loadRecommendations])

  // Handle recommendation selection
  const handleRecommendationSelect = useCallback((recommendation: MemberRecommendation) => {
    setSelectedRecommendation(recommendation.member.id)
    onMemberSelect(recommendation.member)
  }, [onMemberSelect])

  // Analyze team composition
  const analyzeTeamComposition = useCallback(async () => {
    setIsAnalyzing(true)
    try {
      const analysis = await aiMemberRecommendationService.analyzeTeamComposition(currentMembers)
      setTeamIntelligence(analysis)
      onTeamAnalysis(analysis)
    } catch (err) {
      console.error('Error analyzing team:', err)
    } finally {
      setIsAnalyzing(false)
    }
  }, [currentMembers, onTeamAnalysis])

  // Get recommendation score color
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 bg-emerald-100'
    if (score >= 80) return 'text-blue-600 bg-blue-100'
    if (score >= 70) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  // Get risk level color
  const getRiskColor = (riskFactors: string[]) => {
    if (riskFactors.length === 0) return 'text-green-600'
    if (riskFactors.length <= 2) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn('space-y-6', className)}
    >
      {/* Header */}
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">AI Board Intelligence</h3>
              <p className="text-sm text-gray-600">Powered by advanced machine learning</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadRecommendations}
              disabled={isLoading}
              className="ml-auto"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Team Intelligence Overview */}
      {teamIntelligence && (
        <Card className="border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <span>Team Composition Analysis</span>
              <Badge variant="secondary" className="ml-auto">
                Score: {teamIntelligence.overallScore}/100
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {teamIntelligence.diversityScore}%
                </div>
                <div className="text-sm text-gray-600">Diversity Index</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {teamIntelligence.predictedPerformance.decisionQuality}%
                </div>
                <div className="text-sm text-gray-600">Decision Quality</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {teamIntelligence.predictedPerformance.consensusLikelihood}%
                </div>
                <div className="text-sm text-gray-600">Consensus Likelihood</div>
              </div>
            </div>

            {teamIntelligence.expertiseGaps.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <Target className="w-4 h-4 mr-2 text-orange-500" />
                  Expertise Gaps Identified
                </h4>
                <div className="flex flex-wrap gap-2">
                  {teamIntelligence.expertiseGaps.map((gap, index) => (
                    <Badge key={index} variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      {gap}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="outline"
              onClick={analyzeTeamComposition}
              disabled={isAnalyzing}
              className="w-full"
            >
              <Lightbulb className={cn("w-4 h-4 mr-2", isAnalyzing && "animate-pulse")} />
              {isAnalyzing ? 'Analyzing...' : 'Deep Analysis'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span>AI-Powered Recommendations</span>
            </div>
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Star className="w-3 h-3" />
              <span>{recommendations.length} Candidates</span>
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-600 font-medium">{error}</p>
              <Button
                variant="outline"
                onClick={loadRecommendations}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No recommendations available</p>
              <p className="text-sm text-gray-500 mt-2">
                Add more members to get AI-powered suggestions
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.map((recommendation, index) => (
                <motion.div
                  key={recommendation.member.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:shadow-lg border-2",
                      selectedRecommendation === recommendation.member.id 
                        ? "border-purple-500 bg-purple-50" 
                        : "border-gray-200 hover:border-purple-300"
                    )}
                    onClick={() => handleRecommendationSelect(recommendation)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        <Avatar className="w-12 h-12 ring-2 ring-purple-100">
                          <AvatarImage src={recommendation.member.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-semibold">
                            {recommendation.member.full_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 truncate">
                              {recommendation.member.full_name}
                            </h4>
                            <Badge className={cn("text-xs font-medium", getScoreColor(recommendation.score))}>
                              {Math.round(recommendation.score)}% Match
                            </Badge>
                          </div>

                          <p className="text-sm text-gray-600 mb-3">{recommendation.member.email}</p>

                          {/* Fit Analysis */}
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-600">Skill Match</span>
                                <span className="font-medium">{Math.round(recommendation.fitAnalysis.skillMatch)}%</span>
                              </div>
                              <Progress 
                                value={recommendation.fitAnalysis.skillMatch} 
                                className="h-1.5"
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-600">Cultural Fit</span>
                                <span className="font-medium">{Math.round(recommendation.fitAnalysis.culturalFit)}%</span>
                              </div>
                              <Progress 
                                value={recommendation.fitAnalysis.culturalFit} 
                                className="h-1.5"
                              />
                            </div>
                          </div>

                          {/* Key Reasons */}
                          <div className="space-y-2">
                            <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                              Why Recommended
                            </h5>
                            <div className="flex flex-wrap gap-1">
                              {recommendation.reasons.slice(0, 3).map((reason, idx) => (
                                <Badge 
                                  key={idx} 
                                  variant="outline" 
                                  className="text-xs bg-green-50 text-green-700 border-green-200"
                                >
                                  {reason}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Risk Factors */}
                          {recommendation.riskFactors.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide flex items-center">
                                <Shield className="w-3 h-3 mr-1" />
                                Risk Assessment
                              </h5>
                              <div className="flex flex-wrap gap-1">
                                {recommendation.riskFactors.slice(0, 2).map((risk, idx) => (
                                  <Badge 
                                    key={idx} 
                                    variant="outline" 
                                    className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200"
                                  >
                                    {risk}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Expected Impact */}
                          <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                            <span className="flex items-center">
                              <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
                              Team Effectiveness: +{Math.round(recommendation.expectedImpact.teamEffectiveness)}%
                            </span>
                            <span className="flex items-center">
                              <Zap className="w-3 h-3 mr-1 text-blue-500" />
                              Decision Quality: +{Math.round(recommendation.expectedImpact.decisionQuality)}%
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-center space-y-2">
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                          
                          {recommendation.member.ai_score && (
                            <div className="text-center">
                              <div className="text-xs text-gray-500">AI Confidence</div>
                              <div className="text-sm font-bold text-purple-600">
                                {Math.round(recommendation.member.ai_score.confidence)}%
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span>Voice Command</span>
              </Button>
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <Network className="w-4 h-4" />
                <span>Network View</span>
              </Button>
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Filters</span>
              </Button>
            </div>
            
            <div className="flex items-center text-xs text-gray-500">
              <Clock className="w-3 h-3 mr-1" />
              <span>Updated 2 minutes ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}