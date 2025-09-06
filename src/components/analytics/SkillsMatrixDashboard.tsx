'use client'

/**
 * Skills Matrix Dashboard
 * 
 * Comprehensive skills matrix management system with competency mapping,
 * gap analysis, succession planning, and diversity insights.
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Progress } from '../ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { 
  Brain, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  BookOpen,
  Award,
  Lightbulb,
  Zap,
  Shield,
  Code,
  Building,
  UserCheck,
  Plus,
  Edit,
  Eye,
  Download,
  RefreshCw,
  Filter,
  Search,
  Star,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
  PieChart,
  Pie,
  HeatmapChart,
  TreemapChart,
  ScatterChart,
  Scatter
} from 'recharts'

import type { 
  SkillsMatrixAnalysis,
  CurrentSkillsMapping,
  SkillGap,
  SkillOverlap,
  SkillRecommendation,
  SuccessionPlanning,
  DiversityAnalysis
} from '../../lib/services/board-analytics.service'

interface SkillsMatrixDashboardProps {
  organizationId: string
  onExport?: (format: 'csv' | 'pdf' | 'xlsx') => void
  onRefresh?: () => void
}

interface SkillCategory {
  name: string
  color: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

interface MemberSkill {
  memberId: string
  memberName: string
  skillId: string
  skillName: string
  category: string
  level: number
  verified: boolean
  lastUpdated: string
}

interface SkillInsight {
  type: 'gap' | 'overlap' | 'strength' | 'development'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  affectedMembers: number
  actionRequired: string
}

const SKILL_CATEGORIES: Record<string, SkillCategory> = {
  technical: {
    name: 'Technical',
    color: '#3B82F6',
    icon: Code,
    description: 'Technology and digital expertise'
  },
  business: {
    name: 'Business',
    color: '#10B981',
    icon: Building,
    description: 'Business acumen and commercial knowledge'
  },
  leadership: {
    name: 'Leadership',
    color: '#8B5CF6',
    icon: Users,
    description: 'Leadership and management capabilities'
  },
  governance: {
    name: 'Governance',
    color: '#F59E0B',
    icon: Shield,
    description: 'Governance, compliance and risk management'
  },
  domain: {
    name: 'Domain',
    color: '#EF4444',
    icon: Brain,
    description: 'Industry-specific domain expertise'
  }
}

const SKILL_LEVEL_LABELS = {
  1: 'Beginner',
  2: 'Beginner',
  3: 'Basic',
  4: 'Basic',
  5: 'Intermediate',
  6: 'Intermediate',
  7: 'Advanced',
  8: 'Advanced',
  9: 'Expert',
  10: 'Expert'
}

const SKILL_LEVEL_COLORS = {
  1: '#EF4444', 2: '#EF4444',
  3: '#F59E0B', 4: '#F59E0B',
  5: '#3B82F6', 6: '#3B82F6',
  7: '#10B981', 8: '#10B981',
  9: '#8B5CF6', 10: '#8B5CF6'
}

export default function SkillsMatrixDashboard({
  organizationId,
  onExport,
  onRefresh
}: SkillsMatrixDashboardProps) {
  const [skillsData, setSkillsData] = useState<SkillsMatrixAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedMember, setSelectedMember] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'matrix' | 'gaps' | 'succession' | 'diversity'>('matrix')
  const [showAddSkillDialog, setShowAddSkillDialog] = useState(false)
  const [showDevelopmentDialog, setShowDevelopmentDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Load skills data
  useEffect(() => {
    loadSkillsData()
  }, [organizationId])

  const loadSkillsData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/analytics/skills-matrix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          metrics: ['skills_summary', 'gap_analysis', 'succession_planning', 'diversity_analysis']
        })
      })

      if (!response.ok) throw new Error('Failed to load skills matrix data')

      const data = await response.json()
      setSkillsData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Transform skills data for visualization
  const skillsMatrix = useMemo(() => {
    if (!skillsData) return []

    const matrix: any[] = []
    Object.entries(skillsData.current_skills).forEach(([category, skills]) => {
      Object.entries(skills).forEach(([skillName, members]) => {
        members.forEach(member => {
          matrix.push({
            category,
            skillName,
            memberName: member.member_name,
            memberId: member.member_id,
            level: member.level,
            verified: member.verified,
            lastUpdated: member.last_updated
          })
        })
      })
    })

    return matrix
  }, [skillsData])

  // Calculate insights
  const skillInsights = useMemo(() => {
    if (!skillsData) return []

    const insights: SkillInsight[] = []

    // Critical skill gaps
    const criticalGaps = skillsData.skill_gaps?.filter(gap => gap.gap_severity === 'critical') || []
    criticalGaps.forEach(gap => {
      insights.push({
        type: 'gap',
        title: `Critical Gap: ${gap.skill_name}`,
        description: `No member has adequate expertise in ${gap.skill_name} (max level: ${gap.current_max_level}/10)`,
        priority: 'high',
        affectedMembers: 0,
        actionRequired: 'Immediate hiring or training required'
      })
    })

    // Skill overlaps
    const excessiveOverlaps = skillsData.skill_overlaps?.filter(overlap => overlap.redundancy_level === 'excessive') || []
    excessiveOverlaps.forEach(overlap => {
      insights.push({
        type: 'overlap',
        title: `Excessive Overlap: ${overlap.skill_name}`,
        description: `${overlap.member_count} members have this skill - consider diversification`,
        priority: 'medium',
        affectedMembers: overlap.member_count,
        actionRequired: 'Diversify skill portfolio'
      })
    })

    // Succession risks
    const criticalRoles = skillsData.succession_planning?.critical_roles?.filter(role => 
      role.succession_risk === 'critical'
    ) || []
    
    criticalRoles.forEach(role => {
      insights.push({
        type: 'development',
        title: `Succession Risk: ${role.role_name}`,
        description: `${role.current_member} has no ready successor`,
        priority: 'high',
        affectedMembers: 1,
        actionRequired: 'Develop succession candidates'
      })
    })

    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }, [skillsData])

  // Filter skills matrix
  const filteredMatrix = useMemo(() => {
    let filtered = skillsMatrix

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory)
    }

    if (selectedMember !== 'all') {
      filtered = filtered.filter(item => item.memberId === selectedMember)
    }

    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.skillName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.memberName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered
  }, [skillsMatrix, selectedCategory, selectedMember, searchTerm])

  // Prepare chart data
  const skillDistributionData = useMemo(() => {
    if (!skillsData) return []

    return Object.entries(SKILL_CATEGORIES).map(([key, category]) => {
      const categorySkills = skillsData.current_skills[key] || {}
      const totalMembers = Object.values(categorySkills).reduce((sum, members) => sum + members.length, 0)
      
      return {
        category: category.name,
        count: totalMembers,
        fill: category.color
      }
    })
  }, [skillsData])

  const skillLevelDistribution = useMemo(() => {
    const distribution: Record<number, number> = {}
    for (let i = 1; i <= 10; i++) {
      distribution[i] = 0
    }

    skillsMatrix.forEach(item => {
      distribution[item.level]++
    })

    return Object.entries(distribution).map(([level, count]) => ({
      level: parseInt(level),
      count,
      fill: SKILL_LEVEL_COLORS[parseInt(level) as keyof typeof SKILL_LEVEL_COLORS]
    }))
  }, [skillsMatrix])

  const gapAnalysisData = useMemo(() => {
    if (!skillsData?.skill_gaps) return []

    return skillsData.skill_gaps.map(gap => ({
      skill: gap.skill_name.substring(0, 15) + (gap.skill_name.length > 15 ? '...' : ''),
      currentMax: gap.current_max_level,
      required: gap.required_level,
      gap: gap.required_level - gap.current_max_level,
      severity: gap.gap_severity
    }))
  }, [skillsData])

  // Get unique members for filter
  const uniqueMembers = useMemo(() => {
    const members = new Set<string>()
    const memberNames = new Map<string, string>()
    
    skillsMatrix.forEach(item => {
      members.add(item.memberId)
      memberNames.set(item.memberId, item.memberName)
    })

    return Array.from(members).map(id => ({
      id,
      name: memberNames.get(id) || ''
    }))
  }, [skillsMatrix])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadSkillsData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!skillsData) return null

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Skills Matrix Dashboard</h1>
            <p className="text-gray-600">Analyze board competencies, identify gaps, and plan development</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAddSkillDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Skill
            </Button>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {onExport && (
              <Select onValueChange={(format: any) => onExport(format)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Export" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="xlsx">Excel</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Object.entries(SKILL_CATEGORIES).map(([key, category]) => {
            const categoryData = skillsData.current_skills[key] || {}
            const skillCount = Object.keys(categoryData).length
            const memberCount = Object.values(categoryData).reduce((sum, members) => sum + members.length, 0)
            
            return (
              <Card key={key}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{category.name}</p>
                      <p className="text-2xl font-bold">{skillCount}</p>
                      <p className="text-xs text-gray-500">{memberCount} assignments</p>
                    </div>
                    <category.icon className="h-8 w-8" style={{ color: category.color }} />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Key Insights */}
        {skillInsights.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Key Insights</CardTitle>
              <CardDescription>
                Critical areas requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {skillInsights.slice(0, 6).map((insight, index) => (
                  <div key={index} className={`p-4 rounded-lg border-l-4 ${
                    insight.priority === 'high' ? 'border-red-500 bg-red-50' :
                    insight.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                    'border-blue-500 bg-blue-50'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-sm">{insight.title}</h3>
                        <p className="text-xs text-gray-600 mt-1">{insight.description}</p>
                        <p className="text-xs font-medium mt-2 text-gray-800">{insight.actionRequired}</p>
                      </div>
                      <Badge variant={insight.priority === 'high' ? 'destructive' : 
                                   insight.priority === 'medium' ? 'default' : 'secondary'}>
                        {insight.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="matrix">Skills Matrix</TabsTrigger>
            <TabsTrigger value="gaps">Gap Analysis</TabsTrigger>
            <TabsTrigger value="succession">Succession Planning</TabsTrigger>
            <TabsTrigger value="diversity">Diversity & Development</TabsTrigger>
          </TabsList>

          <TabsContent value="matrix" className="space-y-6">
            {/* Filters */}
            <div className="flex gap-4 items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search skills or members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(SKILL_CATEGORIES).map(([key, category]) => (
                    <SelectItem key={key} value={key}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {uniqueMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Skills Matrix Visualization */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Skill Distribution by Category</CardTitle>
                  <CardDescription>
                    Number of skill assignments per category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={skillDistributionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="count" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Skill Level Distribution</CardTitle>
                  <CardDescription>
                    Distribution of expertise levels across all skills
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={skillLevelDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="level" />
                      <YAxis />
                      <RechartsTooltip 
                        formatter={(value: any, name: any) => [
                          value, 
                          `Level ${value} (${SKILL_LEVEL_LABELS[value as keyof typeof SKILL_LEVEL_LABELS]})`
                        ]}
                      />
                      <Bar dataKey="count" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Skills Matrix Table */}
            <Card>
              <CardHeader>
                <CardTitle>Skills Matrix</CardTitle>
                <CardDescription>
                  Detailed view of member skills and competency levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(SKILL_CATEGORIES)
                    .filter(([key]) => selectedCategory === 'all' || selectedCategory === key)
                    .map(([categoryKey, category]) => {
                      const categorySkills = filteredMatrix.filter(item => item.category === categoryKey)
                      if (categorySkills.length === 0) return null

                      return (
                        <div key={categoryKey} className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-4">
                            <category.icon className="h-5 w-5" style={{ color: category.color }} />
                            <h3 className="font-semibold text-lg">{category.name}</h3>
                            <Badge variant="outline">{categorySkills.length} skills</Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Group by skill name */}
                            {Object.entries(
                              categorySkills.reduce((acc, skill) => {
                                if (!acc[skill.skillName]) acc[skill.skillName] = []
                                acc[skill.skillName].push(skill)
                                return acc
                              }, {} as Record<string, typeof categorySkills>)
                            ).map(([skillName, skillMembers]) => (
                              <Card key={skillName} className="bg-gray-50">
                                <CardContent className="p-4">
                                  <h4 className="font-medium mb-3">{skillName}</h4>
                                  <div className="space-y-2">
                                    {skillMembers.map(member => (
                                      <div key={`${member.memberId}-${skillName}`} 
                                           className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <Avatar className="h-6 w-6">
                                            <AvatarImage src="" alt={member.memberName} />
                                            <AvatarFallback className="text-xs">
                                              {member.memberName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="text-sm">{member.memberName}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Badge 
                                                variant="outline"
                                                style={{ 
                                                  backgroundColor: SKILL_LEVEL_COLORS[member.level as keyof typeof SKILL_LEVEL_COLORS] + '20',
                                                  borderColor: SKILL_LEVEL_COLORS[member.level as keyof typeof SKILL_LEVEL_COLORS],
                                                  color: SKILL_LEVEL_COLORS[member.level as keyof typeof SKILL_LEVEL_COLORS]
                                                }}
                                              >
                                                {member.level}
                                              </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>Level {member.level} - {SKILL_LEVEL_LABELS[member.level as keyof typeof SKILL_LEVEL_LABELS]}</p>
                                              {member.verified && <p>✓ Verified</p>}
                                              <p className="text-xs">Updated: {new Date(member.lastUpdated).toLocaleDateString()}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                          {member.verified && (
                                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gaps" className="space-y-6">
            {/* Gap Analysis Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Skill Gaps Analysis</CardTitle>
                  <CardDescription>
                    Current skill levels vs requirements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={gapAnalysisData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 10]} />
                      <YAxis dataKey="skill" type="category" width={100} />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="currentMax" fill="#3B82F6" name="Current Max Level" />
                      <Bar dataKey="required" fill="#10B981" name="Required Level" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Gap Severity Distribution</CardTitle>
                  <CardDescription>
                    Breakdown of skill gaps by severity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={skillsData.skill_gaps?.reduce((acc, gap) => {
                          const existing = acc.find(item => item.severity === gap.gap_severity)
                          if (existing) {
                            existing.count++
                          } else {
                            acc.push({ 
                              severity: gap.gap_severity, 
                              count: 1,
                              fill: gap.gap_severity === 'critical' ? '#EF4444' :
                                    gap.gap_severity === 'high' ? '#F59E0B' :
                                    gap.gap_severity === 'medium' ? '#3B82F6' : '#10B981'
                            })
                          }
                          return acc
                        }, [] as any[]) || []}
                        cx="50%"
                        cy="50%"
                        outerRadius={150}
                        dataKey="count"
                        label={({ severity, count }) => `${severity}: ${count}`}
                      >
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Gap Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Skill Gaps</CardTitle>
                <CardDescription>
                  Specific gaps requiring immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {skillsData.skill_gaps?.map((gap, index) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 ${
                      gap.gap_severity === 'critical' ? 'border-red-500 bg-red-50' :
                      gap.gap_severity === 'high' ? 'border-orange-500 bg-orange-50' :
                      gap.gap_severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                      'border-green-500 bg-green-50'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{gap.skill_name}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Required Level: {gap.required_level} | Current Max: {gap.current_max_level} | 
                            Gap: {gap.required_level - gap.current_max_level} levels
                          </p>
                          <div className="mt-2">
                            <p className="text-sm font-medium">Impact Areas:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {gap.impact_areas.map((area, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {area}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="mt-2">
                            <p className="text-sm font-medium">Recommended Actions:</p>
                            <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                              {gap.recommended_actions.map((action, idx) => (
                                <li key={idx}>{action}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <Badge variant={
                          gap.gap_severity === 'critical' ? 'destructive' :
                          gap.gap_severity === 'high' ? 'default' :
                          gap.gap_severity === 'medium' ? 'secondary' : 'outline'
                        }>
                          {gap.gap_severity}
                        </Badge>
                      </div>
                    </div>
                  )) || []}
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Skill Development Recommendations</CardTitle>
                <CardDescription>
                  Prioritized recommendations for addressing skill gaps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {skillsData.recommendations?.map((rec, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            {rec.type === 'hire' && <Users className="h-4 w-4 text-blue-500" />}
                            {rec.type === 'develop' && <TrendingUp className="h-4 w-4 text-green-500" />}
                            {rec.type === 'redistribute' && <Target className="h-4 w-4 text-purple-500" />}
                            {rec.type === 'external_advisor' && <UserCheck className="h-4 w-4 text-orange-500" />}
                            <h3 className="font-semibold capitalize">{rec.type.replace('_', ' ')}</h3>
                            <Badge variant="outline">Priority {rec.priority}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{rec.rationale}</p>
                          <p className="text-sm font-medium mb-2">Skills Required:</p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {rec.skill_requirements.map((skill, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-sm text-gray-600">
                            <strong>Expected Impact:</strong> {rec.expected_impact}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Timeline:</strong> {rec.implementation_timeline}
                          </p>
                        </div>
                      </div>
                    </div>
                  )) || []}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="succession" className="space-y-6">
            {/* Succession Planning Overview */}
            {skillsData.succession_planning && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Succession Risk Overview</CardTitle>
                    <CardDescription>
                      Critical roles and succession readiness
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {['critical', 'high', 'medium', 'low'].map(risk => {
                        const count = skillsData.succession_planning?.critical_roles?.filter(
                          role => role.succession_risk === risk
                        ).length || 0
                        
                        return (
                          <div key={risk} className="text-center">
                            <p className={`text-3xl font-bold ${
                              risk === 'critical' ? 'text-red-600' :
                              risk === 'high' ? 'text-orange-600' :
                              risk === 'medium' ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {count}
                            </p>
                            <p className="text-sm text-gray-600 capitalize">{risk} Risk</p>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Critical Roles */}
                <Card>
                  <CardHeader>
                    <CardTitle>Critical Roles Analysis</CardTitle>
                    <CardDescription>
                      Roles requiring immediate succession planning attention
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {skillsData.succession_planning.critical_roles?.map((role, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="font-semibold text-lg">{role.role_name}</h3>
                              <p className="text-sm text-gray-600">
                                Current: {role.current_member} | 
                                Criticality: {role.criticality_score}/10
                              </p>
                            </div>
                            <Badge variant={
                              role.succession_risk === 'critical' ? 'destructive' :
                              role.succession_risk === 'high' ? 'default' :
                              role.succession_risk === 'medium' ? 'secondary' : 'outline'
                            }>
                              {role.succession_risk} risk
                            </Badge>
                          </div>

                          {role.backup_candidates.length > 0 ? (
                            <div>
                              <h4 className="font-medium mb-2">Backup Candidates</h4>
                              <div className="space-y-2">
                                {role.backup_candidates.map((candidate, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                    <span className="font-medium">Candidate {idx + 1}</span>
                                    <div className="flex items-center gap-4 text-sm">
                                      <span>Readiness: {candidate.readiness_score}%</span>
                                      <span>Time to Ready: {candidate.time_to_readiness_months}mo</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 bg-red-50 border border-red-200 rounded">
                              <p className="text-red-800 font-medium">No backup candidates identified</p>
                              <p className="text-red-600 text-sm">Immediate action required to identify and develop successors</p>
                            </div>
                          )}
                        </div>
                      )) || []}
                    </div>
                  </CardContent>
                </Card>

                {/* Development Plans */}
                <Card>
                  <CardHeader>
                    <CardTitle>Development Plans</CardTitle>
                    <CardDescription>
                      Structured development plans for succession candidates
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {skillsData.succession_planning.development_plans?.map((plan, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="font-semibold">Member Development Plan</h3>
                              <p className="text-sm text-gray-600">
                                Timeline: {plan.timeline_months} months
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="font-medium mb-2">Target Roles</h4>
                              <div className="space-y-1">
                                {plan.target_roles.map((role, idx) => (
                                  <Badge key={idx} variant="outline">{role}</Badge>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h4 className="font-medium mb-2">Development Areas</h4>
                              <div className="space-y-1">
                                {plan.skill_development_areas.map((area, idx) => (
                                  <Badge key={idx} variant="secondary">{area}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4">
                            <h4 className="font-medium mb-2">Recommended Training</h4>
                            <div className="space-y-2">
                              {plan.recommended_training.map((training, idx) => (
                                <div key={idx} className="p-2 bg-gray-50 rounded">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-medium text-sm">{training.title}</p>
                                      <p className="text-xs text-gray-600">
                                        {training.provider} | {training.duration} | 
                                        ${training.cost_estimate?.toLocaleString() || 'TBD'}
                                      </p>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {training.training_type}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {training.expected_outcome}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )) || []}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="diversity" className="space-y-6">
            {/* Diversity Analysis */}
            {skillsData.diversity_analysis && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Board Diversity Overview</CardTitle>
                    <CardDescription>
                      Current diversity metrics vs targets
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-4">Current Diversity Metrics</h4>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Gender Balance</span>
                              <span>{Math.round(skillsData.diversity_analysis.current_diversity.gender_balance * 100)}%</span>
                            </div>
                            <Progress value={skillsData.diversity_analysis.current_diversity.gender_balance * 100} />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Ethnic Diversity</span>
                              <span>{Math.round(skillsData.diversity_analysis.current_diversity.ethnic_diversity * 100)}%</span>
                            </div>
                            <Progress value={skillsData.diversity_analysis.current_diversity.ethnic_diversity * 100} />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Geographic Spread</span>
                              <span>{Math.round(skillsData.diversity_analysis.current_diversity.geographic_spread * 100)}%</span>
                            </div>
                            <Progress value={skillsData.diversity_analysis.current_diversity.geographic_spread * 100} />
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-4">Age Distribution</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={Object.entries(skillsData.diversity_analysis.current_diversity.age_distribution).map(([age, count]) => ({
                            age_group: age,
                            count: count
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="age_group" />
                            <YAxis />
                            <RechartsTooltip />
                            <Bar dataKey="count" fill="#3B82F6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Diversity Gaps */}
                <Card>
                  <CardHeader>
                    <CardTitle>Diversity Gaps & Strategies</CardTitle>
                    <CardDescription>
                      Areas for improvement and recommended strategies
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-4">Identified Gaps</h4>
                        <div className="space-y-3">
                          {skillsData.diversity_analysis.gaps?.map((gap, index) => (
                            <div key={index} className={`p-3 rounded border-l-4 ${
                              gap.priority === 'critical' ? 'border-red-500 bg-red-50' :
                              gap.priority === 'high' ? 'border-orange-500 bg-orange-50' :
                              gap.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                              'border-green-500 bg-green-50'
                            }`}>
                              <div className="flex items-center justify-between">
                                <h5 className="font-medium">{gap.dimension}</h5>
                                <Badge variant={gap.priority === 'critical' ? 'destructive' : 'default'}>
                                  {gap.priority}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                Current: {Math.round(gap.current_value * 100)}% | 
                                Target: {Math.round(gap.target_value * 100)}% | 
                                Gap: {Math.round(gap.gap_size * 100)}%
                              </p>
                            </div>
                          )) || []}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-4">Improvement Strategies</h4>
                        <div className="space-y-3">
                          {skillsData.diversity_analysis.improvement_strategies?.map((strategy, index) => (
                            <div key={index} className="p-3 border rounded">
                              <h5 className="font-medium">{strategy.dimension}</h5>
                              <p className="text-sm text-gray-600 mt-1">{strategy.strategy}</p>
                              <div className="mt-2">
                                <p className="text-xs font-medium">Implementation Steps:</p>
                                <ul className="text-xs text-gray-600 list-disc list-inside mt-1">
                                  {strategy.implementation_steps.map((step, idx) => (
                                    <li key={idx}>{step}</li>
                                  ))}
                                </ul>
                              </div>
                              <p className="text-xs text-gray-600 mt-2">
                                Timeline: {strategy.timeline}
                              </p>
                            </div>
                          )) || []}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}