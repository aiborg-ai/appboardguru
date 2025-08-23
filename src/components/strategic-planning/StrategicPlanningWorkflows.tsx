/**
 * Strategic Planning Workflows Component
 * 
 * Annual planning cycle management with:
 * - Board review and approval processes
 * - Stakeholder input collection
 * - Plan communication and rollout
 * - Quarterly business review automation
 * - Milestone tracking and notifications
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { 
  Calendar, Clock, Users, CheckCircle, AlertCircle, 
  ArrowRight, Play, Pause, RotateCcw, FileText, 
  MessageSquare, Vote, Eye, Send, Bell, Target,
  Workflow, GitBranch, UserCheck, ClipboardList,
  TrendingUp, Award, Zap, Flag, ChevronRight
} from 'lucide-react'
import { PlanningCycle, PlanningPhase, PlanningStakeholder } from '../../types/strategic-planning'

interface StrategicPlanningWorkflowsProps {
  organizationId: string
  userId: string
  userRole: 'board' | 'executive' | 'manager' | 'member'
  onWorkflowUpdated?: (cycle: PlanningCycle) => void
}

interface WorkflowFormData {
  name: string
  cycle_type: 'annual' | 'quarterly' | 'monthly'
  planning_start: Date
  planning_end: Date
  execution_start: Date
  execution_end: Date
  strategic_themes: string[]
  stakeholders: PlanningStakeholder[]
}

export const StrategicPlanningWorkflows: React.FC<StrategicPlanningWorkflowsProps> = ({
  organizationId,
  userId,
  userRole,
  onWorkflowUpdated
}) => {
  const [activeCycles, setActiveCycles] = useState<PlanningCycle[]>([])
  const [selectedCycle, setSelectedCycle] = useState<PlanningCycle | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [currentPhase, setCurrentPhase] = useState<PlanningPhase | null>(null)

  // Mock data - in real implementation this would come from the service
  const mockPlanningCycles: PlanningCycle[] = [
    {
      id: '1',
      organization_id: organizationId,
      cycle_type: 'annual',
      name: 'Strategic Plan 2024-2025',
      status: 'active',
      planning_start: new Date('2024-10-01'),
      planning_end: new Date('2024-12-15'),
      execution_start: new Date('2025-01-01'),
      execution_end: new Date('2025-12-31'),
      phases: [
        {
          id: 'p1',
          name: 'Environmental Analysis',
          description: 'Market research, competitive analysis, and SWOT assessment',
          start_date: new Date('2024-10-01'),
          end_date: new Date('2024-10-15'),
          status: 'completed',
          required_inputs: ['Market Research', 'Financial Data', 'Competitor Analysis'],
          deliverables: ['Environmental Assessment Report', 'SWOT Matrix'],
          responsible_parties: ['strategy_team', 'research_team']
        },
        {
          id: 'p2',
          name: 'Strategic Visioning',
          description: 'Define vision, mission, and strategic objectives',
          start_date: new Date('2024-10-16'),
          end_date: new Date('2024-11-01'),
          status: 'active',
          required_inputs: ['Environmental Assessment', 'Stakeholder Feedback'],
          deliverables: ['Vision Statement', 'Strategic Objectives'],
          responsible_parties: ['board', 'executive_team']
        },
        {
          id: 'p3',
          name: 'Initiative Planning',
          description: 'Develop detailed strategic initiatives and resource plans',
          start_date: new Date('2024-11-02'),
          end_date: new Date('2024-11-20'),
          status: 'pending',
          required_inputs: ['Strategic Objectives', 'Budget Guidelines'],
          deliverables: ['Initiative Plans', 'Resource Allocation'],
          responsible_parties: ['department_heads', 'project_managers']
        }
      ],
      stakeholders: [
        {
          user_id: 'board-1',
          role: 'sponsor',
          permissions: ['approve', 'review', 'comment'],
          notification_preferences: {
            phase_changes: true,
            milestone_updates: true,
            approval_requests: true
          }
        },
        {
          user_id: 'exec-1',
          role: 'owner',
          permissions: ['edit', 'approve', 'review', 'comment'],
          notification_preferences: {
            phase_changes: true,
            milestone_updates: true,
            approval_requests: true
          }
        }
      ],
      strategic_themes: ['Digital Transformation', 'Market Expansion', 'Operational Excellence'],
      objectives: ['Increase market share by 25%', 'Launch 3 new products', 'Improve efficiency by 20%'],
      success_metrics: ['Revenue Growth', 'Customer Acquisition', 'Cost Reduction'],
      created_by: userId,
      created_at: new Date('2024-09-15'),
      updated_at: new Date('2024-10-20')
    }
  ]

  useEffect(() => {
    // Load planning cycles
    setActiveCycles(mockPlanningCycles)
    if (mockPlanningCycles.length > 0) {
      setSelectedCycle(mockPlanningCycles[0])
      const activePhase = mockPlanningCycles[0].phases.find(p => p.status === 'active')
      if (activePhase) {
        setCurrentPhase(activePhase)
      }
    }
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500 text-white'
      case 'active': return 'bg-blue-500 text-white'
      case 'pending': return 'bg-gray-400 text-white'
      case 'planning': return 'bg-yellow-500 text-white'
      case 'review': return 'bg-purple-500 text-white'
      default: return 'bg-gray-400 text-white'
    }
  }

  const getPhaseProgress = (phase: PlanningPhase) => {
    const now = new Date()
    const start = new Date(phase.start_date)
    const end = new Date(phase.end_date)
    
    if (now < start) return 0
    if (now > end) return 100
    
    const totalDuration = end.getTime() - start.getTime()
    const elapsed = now.getTime() - start.getTime()
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
  }

  const getCycleProgress = (cycle: PlanningCycle) => {
    const completedPhases = cycle.phases.filter(p => p.status === 'completed').length
    return (completedPhases / cycle.phases.length) * 100
  }

  const renderWorkflowOverview = () => {
    if (!selectedCycle) {
      return (
        <Card className="p-6 text-center">
          <Workflow className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Planning Cycle Active</h3>
          <p className="text-gray-600">Start a new planning cycle to manage your strategic planning process</p>
        </Card>
      )
    }

    return (
      <div className="space-y-6">
        {/* Cycle Header */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedCycle.name}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {selectedCycle.cycle_type.charAt(0).toUpperCase() + selectedCycle.cycle_type.slice(1)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {new Date(selectedCycle.execution_start).toLocaleDateString()} - {new Date(selectedCycle.execution_end).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {selectedCycle.stakeholders.length} stakeholders
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(selectedCycle.status)}>
                {selectedCycle.status.toUpperCase()}
              </Badge>
              
              <div className="text-right">
                <p className="text-sm text-gray-600">Progress</p>
                <p className="text-xl font-bold">{getCycleProgress(selectedCycle).toFixed(0)}%</p>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <Progress value={getCycleProgress(selectedCycle)} className="h-3" />
          </div>

          {/* Strategic Themes */}
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 mb-2">Strategic Themes</h3>
            <div className="flex flex-wrap gap-2">
              {selectedCycle.strategic_themes.map((theme, index) => (
                <Badge key={index} variant="outline" className="bg-blue-50">
                  <Target className="h-3 w-3 mr-1" />
                  {theme}
                </Badge>
              ))}
            </div>
          </div>

          {/* Current Phase Alert */}
          {currentPhase && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-1 bg-blue-500 rounded">
                  <Play className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-blue-900">Current Phase: {currentPhase.name}</p>
                  <p className="text-sm text-blue-700">{currentPhase.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-600">
                    Due: {new Date(currentPhase.end_date).toLocaleDateString()}
                  </p>
                  <Progress value={getPhaseProgress(currentPhase)} className="w-24 h-2" />
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Phase Timeline */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Planning Phases
          </h3>
          
          <div className="space-y-4">
            {selectedCycle.phases.map((phase, index) => {
              const isActive = phase.status === 'active'
              const isCompleted = phase.status === 'completed'
              const progress = getPhaseProgress(phase)

              return (
                <div key={phase.id} className="relative">
                  {index < selectedCycle.phases.length - 1 && (
                    <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200" />
                  )}
                  
                  <div className={`flex items-start gap-4 p-4 rounded-lg border ${
                    isActive ? 'bg-blue-50 border-blue-200' : 
                    isCompleted ? 'bg-green-50 border-green-200' : 
                    'bg-gray-50 border-gray-200'
                  }`}>
                    <div className={`p-2 rounded-full ${
                      isCompleted ? 'bg-green-500' : 
                      isActive ? 'bg-blue-500' : 
                      'bg-gray-400'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="h-4 w-4 text-white" />
                      ) : isActive ? (
                        <Play className="h-4 w-4 text-white" />
                      ) : (
                        <Clock className="h-4 w-4 text-white" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{phase.name}</h4>
                        <Badge className={getStatusColor(phase.status)}>
                          {phase.status.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{phase.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-700">Timeline</p>
                          <p className="text-gray-600">
                            {new Date(phase.start_date).toLocaleDateString()} - {new Date(phase.end_date).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div>
                          <p className="font-medium text-gray-700">Required Inputs</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {phase.required_inputs.slice(0, 2).map((input, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {input}
                              </Badge>
                            ))}
                            {phase.required_inputs.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{phase.required_inputs.length - 2} more
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <p className="font-medium text-gray-700">Deliverables</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {phase.deliverables.slice(0, 2).map((deliverable, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {deliverable}
                              </Badge>
                            ))}
                            {phase.deliverables.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{phase.deliverables.length - 2} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {isActive && (
                        <div className="mt-3">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>{progress.toFixed(0)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {isActive && userRole === 'executive' && (
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Key Stakeholders */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Key Stakeholders
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedCycle.stakeholders.map((stakeholder, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Stakeholder {index + 1}</span>
                  </div>
                  <Badge variant="outline">
                    {stakeholder.role}
                  </Badge>
                </div>
                
                <div className="text-sm space-y-1">
                  <div>
                    <span className="font-medium">Permissions:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {stakeholder.permissions.map(perm => (
                        <Badge key={perm} variant="secondary" className="text-xs">
                          {perm}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-2 text-xs text-gray-600">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={stakeholder.notification_preferences.phase_changes}
                          readOnly
                          className="rounded"
                        />
                        Phase changes
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={stakeholder.notification_preferences.milestone_updates}
                          readOnly
                          className="rounded"
                        />
                        Milestones
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Action Items */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Pending Actions
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div className="flex-1">
                <p className="font-medium text-yellow-900">Review Strategic Objectives</p>
                <p className="text-sm text-yellow-700">Board approval required for Q4 objectives</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-yellow-600">Due: Oct 25</span>
                <Button size="sm" variant="outline">
                  Review
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <p className="font-medium text-blue-900">Collect Stakeholder Feedback</p>
                <p className="text-sm text-blue-700">Department heads input needed for initiative planning</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-600">Due: Nov 1</span>
                <Button size="sm" variant="outline">
                  Send Survey
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <Vote className="h-5 w-5 text-purple-600" />
              <div className="flex-1">
                <p className="font-medium text-purple-900">Budget Allocation Approval</p>
                <p className="text-sm text-purple-700">Final budget approval needed from board</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-purple-600">Due: Nov 15</span>
                <Button size="sm" variant="outline">
                  Schedule Vote
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const renderPhaseDetails = () => {
    if (!selectedCycle || !currentPhase) {
      return (
        <Card className="p-6 text-center">
          <Flag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Phase</h3>
          <p className="text-gray-600">No active planning phase found</p>
        </Card>
      )
    }

    return (
      <div className="space-y-6">
        {/* Phase Header */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{currentPhase.name}</h2>
              <p className="text-gray-600 mt-1">{currentPhase.description}</p>
            </div>
            
            <div className="text-right">
              <Badge className={getStatusColor(currentPhase.status)}>
                {currentPhase.status.toUpperCase()}
              </Badge>
              <p className="text-sm text-gray-600 mt-1">
                {Math.ceil((new Date(currentPhase.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Timeline</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Start: {new Date(currentPhase.start_date).toLocaleDateString()}</p>
                <p>End: {new Date(currentPhase.end_date).toLocaleDateString()}</p>
                <p>Duration: {Math.ceil((new Date(currentPhase.end_date).getTime() - new Date(currentPhase.start_date).getTime()) / (1000 * 60 * 60 * 24))} days</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Required Inputs</h3>
              <div className="space-y-1">
                {currentPhase.required_inputs.map((input, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>{input}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Deliverables</h3>
              <div className="space-y-1">
                {currentPhase.deliverables.map((deliverable, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span>{deliverable}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Phase Progress</span>
              <span>{getPhaseProgress(currentPhase).toFixed(0)}%</span>
            </div>
            <Progress value={getPhaseProgress(currentPhase)} className="h-3" />
          </div>
        </Card>

        {/* Phase Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Quick Actions
            </h3>
            
            <div className="space-y-3">
              <Button className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Upload Documents
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="h-4 w-4 mr-2" />
                Request Feedback
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Send className="h-4 w-4 mr-2" />
                Send Update
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Bell className="h-4 w-4 mr-2" />
                Set Reminder
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Award className="h-5 w-5" />
              Progress Tracking
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Research Completed</span>
                  <span>85%</span>
                </div>
                <Progress value={85} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Stakeholder Input</span>
                  <span>60%</span>
                </div>
                <Progress value={60} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Document Preparation</span>
                  <span>40%</span>
                </div>
                <Progress value={40} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Review Process</span>
                  <span>10%</span>
                </div>
                <Progress value={10} className="h-2" />
              </div>
            </div>
          </Card>
        </div>

        {/* Comments and Updates */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Recent Updates
          </h3>
          
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">Strategy Team</span>
                <span className="text-sm text-gray-500">2 hours ago</span>
              </div>
              <p className="text-gray-700">Completed market research analysis. Key findings uploaded to shared drive.</p>
            </div>
            
            <div className="border-l-4 border-green-500 pl-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">John Smith (Executive)</span>
                <span className="text-sm text-gray-500">1 day ago</span>
              </div>
              <p className="text-gray-700">Approved budget guidelines for next phase. Ready to proceed with initiative planning.</p>
            </div>
            
            <div className="border-l-4 border-yellow-500 pl-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">Board Review Committee</span>
                <span className="text-sm text-gray-500">3 days ago</span>
              </div>
              <p className="text-gray-700">Requested additional competitive analysis data. Extended deadline by 3 days.</p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <Textarea
              placeholder="Add your update or comment..."
              className="mb-2"
              rows={2}
            />
            <div className="flex justify-end">
              <Button size="sm">
                <Send className="h-4 w-4 mr-1" />
                Post Update
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const renderWorkflowLibrary = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Planning Cycles</h3>
        <Button onClick={() => setShowCreateModal(true)}>
          <Calendar className="h-4 w-4 mr-1" />
          New Cycle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activeCycles.map(cycle => (
          <Card
            key={cycle.id}
            className={`p-6 cursor-pointer hover:shadow-md transition-shadow ${
              selectedCycle?.id === cycle.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedCycle(cycle)}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-semibold text-lg">{cycle.name}</h4>
                <p className="text-sm text-gray-600">{cycle.cycle_type} planning cycle</p>
              </div>
              <Badge className={getStatusColor(cycle.status)}>
                {cycle.status}
              </Badge>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{getCycleProgress(cycle).toFixed(0)}%</span>
              </div>
              <Progress value={getCycleProgress(cycle)} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Phases</p>
                <p className="font-semibold">{cycle.phases.length}</p>
              </div>
              <div>
                <p className="text-gray-600">Stakeholders</p>
                <p className="font-semibold">{cycle.stakeholders.length}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Created: {new Date(cycle.created_at).toLocaleDateString()}</span>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>{cycle.phases.filter(p => p.status === 'completed').length}/{cycle.phases.length} complete</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {activeCycles.length === 0 && (
        <Card className="p-8 text-center">
          <Workflow className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Planning Cycles</h3>
          <p className="text-gray-600 mb-4">Create your first strategic planning cycle to get started</p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Calendar className="h-4 w-4 mr-1" />
            Create Planning Cycle
          </Button>
        </Card>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Strategic Planning Workflows</h2>
          <p className="text-gray-600">
            Manage annual planning cycles, stakeholder collaboration, and milestone tracking
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="current-phase">Current Phase</TabsTrigger>
          <TabsTrigger value="stakeholders">Stakeholders</TabsTrigger>
          <TabsTrigger value="library">Planning Cycles</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {renderWorkflowOverview()}
        </TabsContent>

        <TabsContent value="current-phase">
          {renderPhaseDetails()}
        </TabsContent>

        <TabsContent value="stakeholders">
          <Card className="p-6 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Stakeholder Management</h3>
            <p className="text-gray-600">Advanced stakeholder collaboration features coming soon</p>
          </Card>
        </TabsContent>

        <TabsContent value="library">
          {renderWorkflowLibrary()}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default StrategicPlanningWorkflows