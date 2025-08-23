'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  BookOpen, 
  Users, 
  Target,
  Calendar,
  Trophy,
  ArrowRight
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  step_type: string;
  estimated_duration_hours: number;
  is_required: boolean;
  progress?: {
    status: string;
    completed_at: string | null;
    time_spent_minutes: number | null;
  };
}

interface OnboardingInstance {
  id: string;
  status: string;
  progress_percentage: number;
  start_date: string | null;
  target_completion_date: string | null;
  template: {
    name: string;
    role_type: string;
    estimated_duration_days: number;
  };
  steps: OnboardingStep[];
  mentor?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface OnboardingDashboardProps {
  userId: string;
}

export default function OnboardingDashboard({ userId }: OnboardingDashboardProps) {
  const [onboardingData, setOnboardingData] = useState<OnboardingInstance | null>(null);
  const [nextSteps, setNextSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOnboardingData();
  }, [userId]);

  const fetchOnboardingData = async () => {
    try {
      setLoading(true);
      
      // Get user's active onboarding
      const response = await fetch(`/api/onboarding/instances?user_id=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch onboarding data');
      
      const result = await response.json();
      const activeOnboarding = result.data.find((o: any) => 
        ['not_started', 'in_progress'].includes(o.status)
      );
      
      if (activeOnboarding) {
        // Get detailed onboarding with progress
        const detailResponse = await fetch(`/api/onboarding/instances/${activeOnboarding.id}`);
        if (!detailResponse.ok) throw new Error('Failed to fetch onboarding details');
        
        const detailResult = await detailResponse.json();
        setOnboardingData(detailResult.data);
        
        // Get recommended next steps
        const nextStepsResponse = await fetch(`/api/onboarding/instances/${activeOnboarding.id}/recommendations`);
        if (nextStepsResponse.ok) {
          const nextStepsResult = await nextStepsResponse.json();
          setNextSteps(nextStepsResult.data.next_steps || []);
        }
      }
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleStartStep = async (stepId: string) => {
    if (!onboardingData) return;
    
    try {
      const response = await fetch(`/api/onboarding/instances/${onboardingData.id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step_id: stepId,
          action: 'start'
        })
      });
      
      if (response.ok) {
        await fetchOnboardingData(); // Refresh data
      }
    } catch (err) {
      console.error('Failed to start step:', err);
    }
  };

  const handleCompleteStep = async (stepId: string, feedback?: string) => {
    if (!onboardingData) return;
    
    try {
      const response = await fetch(`/api/onboarding/instances/${onboardingData.id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step_id: stepId,
          action: 'complete',
          feedback
        })
      });
      
      if (response.ok) {
        await fetchOnboardingData(); // Refresh data
      }
    } catch (err) {
      console.error('Failed to complete step:', err);
    }
  };

  const getStepIcon = (stepType: string, status?: string) => {
    if (status === 'completed') return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (status === 'in_progress') return <Clock className="w-5 h-5 text-blue-600" />;
    
    switch (stepType) {
      case 'training_module': return <BookOpen className="w-5 h-5 text-purple-600" />;
      case 'meeting': return <Users className="w-5 h-5 text-orange-600" />;
      case 'milestone': return <Trophy className="w-5 h-5 text-yellow-600" />;
      case 'assessment': return <Target className="w-5 h-5 text-red-600" />;
      default: return <BookOpen className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'not_started':
        return <Badge variant="secondary">Not Started</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading your onboarding progress...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Onboarding</h3>
            <p className="text-red-700">{error}</p>
            <Button onClick={fetchOnboardingData} className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!onboardingData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Onboarding</h3>
            <p className="text-gray-600">You don't have any active onboarding programs at the moment.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const completedSteps = onboardingData.steps.filter(step => step.progress?.status === 'completed').length;
  const totalSteps = onboardingData.steps.length;

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{onboardingData.template.name}</CardTitle>
              <CardDescription>
                {onboardingData.template.role_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} • 
                Estimated {onboardingData.template.estimated_duration_days} days
              </CardDescription>
            </div>
            {getStatusBadge(onboardingData.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-gray-600">{completedSteps} of {totalSteps} steps completed</span>
              </div>
              <Progress value={onboardingData.progress_percentage} className="w-full" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{Math.round(onboardingData.progress_percentage)}%</div>
                <div className="text-sm text-gray-600">Complete</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{completedSteps}</div>
                <div className="text-sm text-gray-600">Steps Done</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{totalSteps - completedSteps}</div>
                <div className="text-sm text-gray-600">Remaining</div>
              </div>
            </div>

            {onboardingData.mentor && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Your Mentor</p>
                  <p className="text-sm text-gray-600">
                    {onboardingData.mentor.first_name} {onboardingData.mentor.last_name}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="next-steps" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="next-steps">Next Steps</TabsTrigger>
          <TabsTrigger value="all-steps">All Steps</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="next-steps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5" />
                Recommended Next Steps
              </CardTitle>
              <CardDescription>
                Focus on these steps to keep your onboarding on track
              </CardDescription>
            </CardHeader>
            <CardContent>
              {nextSteps.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-900 mb-2">Great Progress!</h3>
                  <p className="text-green-700">You're all caught up with your onboarding steps.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {nextSteps.map((step) => (
                    <div key={step.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      {getStepIcon(step.step_type, step.progress?.status)}
                      <div className="flex-1">
                        <h4 className="font-semibold">{step.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            ~{step.estimated_duration_hours}h
                          </span>
                          {step.is_required && (
                            <Badge variant="outline" className="text-xs">Required</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {step.progress?.status === 'not_started' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleStartStep(step.id)}
                          >
                            Start
                          </Button>
                        )}
                        {step.progress?.status === 'in_progress' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleCompleteStep(step.id)}
                          >
                            Mark Complete
                          </Button>
                        )}
                        {step.progress?.status === 'completed' && (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Done
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all-steps">
          <Card>
            <CardHeader>
              <CardTitle>All Onboarding Steps</CardTitle>
              <CardDescription>
                Complete overview of your onboarding journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {onboardingData.steps.map((step, index) => (
                  <div key={step.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      {getStepIcon(step.step_type, step.progress?.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{step.title}</h4>
                        {getStatusBadge(step.progress?.status || 'not_started')}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ~{step.estimated_duration_hours}h
                        </span>
                        {step.progress?.time_spent_minutes && (
                          <span>
                            Spent: {Math.round(step.progress.time_spent_minutes / 60)}h
                          </span>
                        )}
                        {step.is_required && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Onboarding Timeline
              </CardTitle>
              <CardDescription>
                Track your progress over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {onboardingData.start_date && (
                  <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Started Onboarding</p>
                      <p className="text-sm text-gray-600">
                        {new Date(onboardingData.start_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
                
                {onboardingData.target_completion_date && (
                  <div className="flex items-center gap-4 p-3 bg-orange-50 rounded-lg">
                    <Target className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="font-medium">Target Completion</p>
                      <p className="text-sm text-gray-600">
                        {new Date(onboardingData.target_completion_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {onboardingData.steps
                    .filter(step => step.progress?.completed_at)
                    .sort((a, b) => 
                      new Date(b.progress!.completed_at!).getTime() - 
                      new Date(a.progress!.completed_at!).getTime()
                    )
                    .map((step) => (
                      <div key={step.id} className="flex items-center gap-4 p-3 bg-green-50 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div className="flex-1">
                          <p className="font-medium">{step.title}</p>
                          <p className="text-sm text-gray-600">
                            Completed on {new Date(step.progress!.completed_at!).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}