'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Badge } from '@/features/shared/ui/badge';
import { Progress } from '@/features/shared/ui/progress';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Calendar,
  FileText,
  Users,
  Send,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Step definitions
const STEPS = [
  {
    id: 'type',
    title: 'Meeting Type',
    description: 'Choose the type of meeting',
    icon: Settings,
  },
  {
    id: 'agenda',
    title: 'Agenda & Documents',
    description: 'Set agenda and attach documents',
    icon: FileText,
  },
  {
    id: 'calendar',
    title: 'Schedule',
    description: 'Set date, time and location',
    icon: Calendar,
  },
  {
    id: 'invitees',
    title: 'Invitees & Roles',
    description: 'Select attendees and assign roles',
    icon: Users,
  },
  {
    id: 'review',
    title: 'Review & Broadcast',
    description: 'Review meeting and send invitations',
    icon: Send,
  },
] as const;

export type MeetingWizardStep = typeof STEPS[number]['id'];

// Meeting types
export type MeetingType = 'agm' | 'board' | 'committee' | 'other';
export type AttendeeRole = 'board_member' | 'guest' | 'presenter' | 'observer' | 'secretary' | 'facilitator';

// Wizard data structure
export interface MeetingWizardData {
  // Step 1: Meeting Type
  meetingType: MeetingType;
  title: string;
  description: string;

  // Step 2: Agenda & Documents
  agendaItems: Array<{
    id: string;
    title: string;
    description?: string;
    type: 'presentation' | 'discussion' | 'decision' | 'information' | 'break';
    estimatedDuration: number;
    presenter?: string;
    order: number;
  }>;
  documents: Array<{
    id: string;
    name: string;
    file: File;
    category: 'agenda' | 'supporting' | 'presentation' | 'report' | 'reference';
    isConfidential: boolean;
  }>;

  // Step 3: Calendar
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  location?: string;
  virtualMeetingUrl?: string;
  isRecurring: boolean;
  recurrenceType?: 'weekly' | 'monthly' | 'yearly';
  recurrenceInterval?: number;
  recurrenceEndDate?: string;

  // Step 4: Invitees
  invitees: Array<{
    userId?: string;
    email: string;
    fullName: string;
    role: AttendeeRole;
    isRequired: boolean;
    isOrganizer: boolean;
  }>;

  // Step 5: Review & Broadcast
  organizationId: string;
  settings: {
    allowVirtualAttendance: boolean;
    requireRSVP: boolean;
    sendReminders: boolean;
    reminderIntervals: number[];
    allowAgendaSuggestions: boolean;
    autoRecord: boolean;
  };
  broadcastMessage?: string;
}

interface CreateMeetingWizardProps {
  isOpen?: boolean;
  onClose: () => void;
  onComplete: (data: MeetingWizardData) => Promise<void>;
  organizationId: string;
  className?: string;
  isFullPage?: boolean;
}

export default function CreateMeetingWizard({ 
  isOpen = true, 
  onClose, 
  onComplete,
  organizationId,
  className,
  isFullPage = false
}: CreateMeetingWizardProps) {
  const [currentStep, setCurrentStep] = useState<MeetingWizardStep>('type');
  const [wizardData, setWizardData] = useState<MeetingWizardData>({
    meetingType: 'board',
    title: '',
    description: '',
    agendaItems: [],
    documents: [],
    scheduledStart: '',
    scheduledEnd: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    isRecurring: false,
    invitees: [],
    organizationId,
    settings: {
      allowVirtualAttendance: true,
      requireRSVP: true,
      sendReminders: true,
      reminderIntervals: [7, 1, 1], // 1 week, 1 day, 1 hour
      allowAgendaSuggestions: true,
      autoRecord: false,
    },
  });
  const [isLoading, setIsLoading] = useState(false);

  // Get current step index
  const currentStepIndex = STEPS.findIndex(step => step.id === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  // Update wizard data
  const updateWizardData = useCallback((updates: Partial<MeetingWizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  }, []);

  // Navigation handlers
  const goToNextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    }
  }, [currentStepIndex]);

  const goToPreviousStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  }, [currentStepIndex]);

  // Submit handler
  const handleComplete = useCallback(async () => {
    setIsLoading(true);
    try {
      await onComplete(wizardData);
      onClose();
    } catch (error) {
      console.error('Failed to create meeting:', error);
    } finally {
      setIsLoading(false);
    }
  }, [wizardData, onComplete, onClose]);

  // Validation for each step
  const isStepValid = useCallback((step: MeetingWizardStep) => {
    switch (step) {
      case 'type':
        return wizardData.title.trim().length > 0;
      case 'agenda':
        return wizardData.agendaItems.length > 0;
      case 'calendar':
        return wizardData.scheduledStart && wizardData.scheduledEnd;
      case 'invitees':
        return wizardData.invitees.length > 0;
      case 'review':
        return true; // Always valid if we got this far
      default:
        return false;
    }
  }, [wizardData]);

  const canProceed = isStepValid(currentStep);
  const isLastStep = currentStepIndex === STEPS.length - 1;

  if (!isOpen) return null;

  return (
    <div className={cn(
      isFullPage 
        ? "min-h-screen bg-gray-50" 
        : "fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
    )}>
      <motion.div
        initial={{ opacity: 0, scale: isFullPage ? 1 : 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: isFullPage ? 1 : 0.95 }}
        className={cn(
          isFullPage 
            ? "w-full max-w-6xl mx-auto p-6" 
            : "bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden",
          className
        )}
      >
        {isFullPage && (
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Create New Meeting</h1>
            <p className="text-gray-600 mt-2">Set up your board meeting, AGM, or committee session with our step-by-step wizard.</p>
          </div>
        )}
        
        <div className={cn(
          isFullPage ? "bg-white rounded-xl shadow-lg overflow-hidden" : "",
          "flex flex-col h-full"
        )}>
          {/* Header */}
          <div className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            {!isFullPage && (
              <h2 className="text-2xl font-semibold text-gray-900">
                Create New Meeting
              </h2>
            )}
            {isFullPage && (
              <h2 className="text-xl font-semibold text-gray-900">
                Meeting Setup Wizard
              </h2>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              {isFullPage ? '← Back to Meetings' : '✕'}
            </Button>
          </div>
          
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Step {currentStepIndex + 1} of {STEPS.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* Step indicators */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = index < currentStepIndex;
              const StepIcon = step.icon;
              
              return (
                <div 
                  key={step.id}
                  className={cn(
                    "flex items-center space-x-2",
                    index < STEPS.length - 1 && "flex-1"
                  )}
                >
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200",
                      isActive && "border-blue-500 bg-blue-500 text-white",
                      isCompleted && "border-green-500 bg-green-500 text-white",
                      !isActive && !isCompleted && "border-gray-300 bg-white text-gray-400"
                    )}>
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <StepIcon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <div className={cn(
                        "text-sm font-medium",
                        isActive && "text-blue-600",
                        isCompleted && "text-green-600",
                        !isActive && !isCompleted && "text-gray-500"
                      )}>
                        {step.title}
                      </div>
                      <div className="text-xs text-gray-400 max-w-24 leading-tight">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  
                  {/* Connector line */}
                  {index < STEPS.length - 1 && (
                    <div className={cn(
                      "flex-1 h-px mx-4 transition-colors duration-200",
                      index < currentStepIndex ? "bg-green-500" : "bg-gray-300"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
              <StepContent 
                step={currentStep}
                data={wizardData}
                onUpdate={updateWizardData}
              />
            </motion.div>
          </AnimatePresence>
        </div>

          {/* Footer */}
          <div className="border-t bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={goToPreviousStep}
              disabled={currentStepIndex === 0}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </Button>

            <div className="flex items-center space-x-2">
              {!isLastStep ? (
                <Button
                  onClick={goToNextStep}
                  disabled={!canProceed}
                  className="flex items-center space-x-2"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={!canProceed || isLoading}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{isLoading ? 'Creating...' : 'Create & Broadcast'}</span>
                </Button>
              )}
            </div>
          </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Import step components
import MeetingTypeStep from './steps/MeetingTypeStep';
import AgendaStep from './steps/AgendaStep';
import CalendarStep from './steps/CalendarStep';
import InviteesStep from './steps/InviteesStep';
import ReviewStep from './steps/ReviewStep';

// Step content component
function StepContent({ 
  step, 
  data, 
  onUpdate 
}: { 
  step: MeetingWizardStep; 
  data: MeetingWizardData; 
  onUpdate: (updates: Partial<MeetingWizardData>) => void;
}) {
  switch (step) {
    case 'type':
      return <MeetingTypeStep data={data} onUpdate={onUpdate} />;
    case 'agenda':
      return <AgendaStep data={data} onUpdate={onUpdate} />;
    case 'calendar':
      return <CalendarStep data={data} onUpdate={onUpdate} />;
    case 'invitees':
      return <InviteesStep data={data} onUpdate={onUpdate} />;
    case 'review':
      return <ReviewStep data={data} onUpdate={onUpdate} />;
    default:
      return <div>Step not implemented</div>;
  }
}