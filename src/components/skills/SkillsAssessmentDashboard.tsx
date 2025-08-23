'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Target, 
  AlertTriangle,
  CheckCircle,
  BarChart3,
  BookOpen,
  User,
  Calendar,
  Award,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  assessment?: {
    current_level: number;
    target_level?: number;
    assessment_date: string;
    self_assessment_score?: number;
  };
}

interface SkillGap {
  skill_id: string;
  skill_name: string;
  category: string;
  current_level: number;
  target_level: number;
  gap: number;
  priority: 'high' | 'medium' | 'low';
  recommended_actions: string[];
}

interface PerformanceMetrics {
  overall_skill_score: number;
  skill_category_scores: { [category: string]: number };
  improvement_rate: number;
  assessment_completion_rate: number;
  peer_feedback_score?: number;
  manager_feedback_score?: number;
}

interface SkillsAssessmentDashboardProps {
  userId: string;
}

export default function SkillsAssessmentDashboard({ userId }: SkillsAssessmentDashboardProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillGaps, setSkillGaps] = useState<SkillGap[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSkillsData();
  }, [userId]);

  const fetchSkillsData = async () => {
    try {
      setLoading(true);

      // Fetch skills with assessments
      const skillsResponse = await fetch(`/api/skills/frameworks/bb0e8400-e29b-41d4-a716-446655440001/skills?user_id=${userId}&include_assessments=true`);
      if (skillsResponse.ok) {
        const skillsResult = await skillsResponse.json();
        setSkills(skillsResult.data.flatMap((skill: any) => [skill, ...skill.children || []]));
      }

      // Fetch skill gaps
      const gapsResponse = await fetch(`/api/skills/gap-analysis?user_id=${userId}`);
      if (gapsResponse.ok) {
        const gapsResult = await gapsResponse.json();
        setSkillGaps(gapsResult.data.gaps || []);
      }

      // Fetch performance metrics
      const metricsResponse = await fetch(`/api/skills/performance-metrics?user_id=${userId}`);
      if (metricsResponse.ok) {
        const metricsResult = await metricsResponse.json();
        setPerformanceMetrics(metricsResult.data);
      }
    } catch (error) {
      console.error('Error fetching skills data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSkillLevelLabel = (level: number) => {
    const labels = ['', 'Beginner', 'Developing', 'Proficient', 'Advanced', 'Expert'];
    return labels[level] || 'Unknown';
  };

  const getSkillLevelColor = (level: number) => {
    if (level >= 4) return 'text-green-600';
    if (level >= 3) return 'text-blue-600';
    if (level >= 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (improvement: number) => {
    if (improvement > 0.2) return <ArrowUp className="w-4 h-4 text-green-600" />;
    if (improvement < -0.2) return <ArrowDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading your skills assessment...</p>
        </div>
      </div>
    );
  }

  const skillsByCategory = skills.reduce((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {} as { [category: string]: Skill[] });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Skills Assessment Dashboard</h1>
        <p className="text-gray-600">Track your competencies and development progress</p>
      </div>

      {/* Performance Overview */}
      {performanceMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overall Score</p>
                  <p className="text-2xl font-bold">{performanceMetrics.overall_skill_score.toFixed(1)}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Improvement Rate</p>
                  <div className="flex items-center gap-1">
                    <p className="text-2xl font-bold">{performanceMetrics.improvement_rate.toFixed(1)}</p>
                    {getTrendIcon(performanceMetrics.improvement_rate)}
                  </div>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Assessment Complete</p>
                  <p className="text-2xl font-bold">{Math.round(performanceMetrics.assessment_completion_rate)}%</p>
                </div>
                <CheckCircle className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Skill Gaps</p>
                  <p className="text-2xl font-bold">{skillGaps.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="gaps">Skill Gaps</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
          <TabsTrigger value="development">Development Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Category Performance */}
          {performanceMetrics && (
            <Card>
              <CardHeader>
                <CardTitle>Performance by Category</CardTitle>
                <CardDescription>
                  Your skill levels across different competency areas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(performanceMetrics.skill_category_scores).map(([category, score]) => (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{category}</span>
                        <span className="text-sm text-gray-600">{score.toFixed(1)}/5.0</span>
                      </div>
                      <Progress value={(score / 5) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Assessments */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Skill Assessments</CardTitle>
              <CardDescription>
                Your latest self-assessments and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {skills
                  .filter(skill => skill.assessment)
                  .sort((a, b) => new Date(b.assessment!.assessment_date).getTime() - new Date(a.assessment!.assessment_date).getTime())
                  .slice(0, 5)
                  .map((skill) => (
                    <div key={skill.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{skill.name}</h4>
                        <p className="text-sm text-gray-600">{skill.category}</p>
                        <p className="text-xs text-gray-500">
                          Assessed on {new Date(skill.assessment!.assessment_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${getSkillLevelColor(skill.assessment!.current_level)}`}>
                          Level {skill.assessment!.current_level}
                        </div>
                        <div className="text-xs text-gray-600">
                          {getSkillLevelLabel(skill.assessment!.current_level)}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gaps" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Priority Skill Gaps
              </CardTitle>
              <CardDescription>
                Skills that need attention to reach your target level
              </CardDescription>
            </CardHeader>
            <CardContent>
              {skillGaps.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-900 mb-2">No Skill Gaps Identified</h3>
                  <p className="text-green-700">You're meeting your target levels across all assessed skills!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {skillGaps.map((gap) => (
                    <Card key={gap.skill_id} className="border-l-4 border-l-orange-500">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{gap.skill_name}</CardTitle>
                            <CardDescription>{gap.category}</CardDescription>
                          </div>
                          <Badge className={getPriorityColor(gap.priority)}>
                            {gap.priority} priority
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Current Level</p>
                            <p className="font-medium text-lg">{gap.current_level}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Target Level</p>
                            <p className="font-medium text-lg">{gap.target_level}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Gap</p>
                            <p className="font-medium text-lg text-orange-600">+{gap.gap}</p>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-sm mb-2">Recommended Actions:</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {gap.recommended_actions.map((action, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="w-1 h-1 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle>{category}</CardTitle>
                <CardDescription>
                  {categorySkills.length} skills in this category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categorySkills.map((skill) => (
                    <div key={skill.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{skill.name}</h4>
                        {skill.assessment && (
                          <Badge variant="outline" className={getSkillLevelColor(skill.assessment.current_level)}>
                            L{skill.assessment.current_level}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{skill.description}</p>
                      
                      {skill.assessment ? (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Current: {getSkillLevelLabel(skill.assessment.current_level)}</span>
                            {skill.assessment.target_level && (
                              <span>Target: {getSkillLevelLabel(skill.assessment.target_level)}</span>
                            )}
                          </div>
                          <Progress 
                            value={(skill.assessment.current_level / 5) * 100} 
                            className="h-2" 
                          />
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <Button variant="outline" size="sm">
                            <User className="w-3 h-3 mr-1" />
                            Self Assess
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="development" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Development Plan Generator
              </CardTitle>
              <CardDescription>
                Create a personalized development plan based on your skill gaps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Award className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Generate Your Development Plan</h3>
                <p className="text-gray-600 mb-4">
                  Get personalized recommendations for courses, mentors, and learning paths based on your skill gaps.
                </p>
                <Button>
                  <Target className="w-4 h-4 mr-2" />
                  Create Development Plan
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}