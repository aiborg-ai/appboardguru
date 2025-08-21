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
  UserPlus, 
  User,
  Send,
  Rocket,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  BoardMatesWizardStep, 
  BoardMatesWizardData,
  CreateBoardMateRequest,
  DEFAULT_PERSONAL_INFO,
  DEFAULT_INVITE_SETTINGS
} from './types';

// Step definitions
const STEPS = [
  {
    id: 'personal' as const,
    title: 'Personal Information',
    description: 'Basic contact and professional details',
    icon: User,
  },
  {
    id: 'invite' as const,
    title: 'Invite to BoardUser',
    description: 'Configure access and invitation settings',
    icon: UserPlus,
  },
  {
    id: 'review' as const,
    title: 'Review & Broadcast',
    description: 'Review details and send invitation',
    icon: Send,
  },
] as const;

interface CreateBoardMatesWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: CreateBoardMateRequest) => Promise<void>;
  organizationId?: string;
  className?: string;
}

export default function CreateBoardMatesWizard({ 
  isOpen, 
  onClose, 
  onComplete,
  organizationId,
  className 
}: CreateBoardMatesWizardProps) {
  const [currentStep, setCurrentStep] = useState<BoardMatesWizardStep>('personal');
  const [wizardData, setWizardData] = useState<BoardMatesWizardData>({
    personalInfo: { ...DEFAULT_PERSONAL_INFO },
    inviteSettings: { ...DEFAULT_INVITE_SETTINGS },
    termsAccepted: false,
    notificationPreferences: {
      emailUpdates: true,
      smsNotifications: false,
      meetingReminders: true,
      documentAlerts: true,
    },
  });
  const [isLoading, setIsLoading] = useState(false);

  // Get current step index
  const currentStepIndex = STEPS.findIndex(step => step.id === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  // Update wizard data
  const updateWizardData = useCallback((updates: Partial<BoardMatesWizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  }, []);

  // Navigation handlers
  const goToNextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length && STEPS[nextIndex]) {
      setCurrentStep(STEPS[nextIndex]!.id);
    }
  }, [currentStepIndex]);

  const goToPreviousStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0 && STEPS[prevIndex]) {
      setCurrentStep(STEPS[prevIndex]!.id);
    }
  }, [currentStepIndex]);

  // Submit handler
  const handleComplete = useCallback(async () => {
    setIsLoading(true);
    try {
      const requestData: CreateBoardMateRequest = {
        personalInfo: wizardData.personalInfo,
        inviteSettings: wizardData.inviteSettings,
        organizationId: organizationId || 'default-org', // TODO: Get from context
        createdBy: 'current-user-id', // TODO: Get from auth context
        notificationPreferences: wizardData.notificationPreferences,
      };

      await onComplete(requestData);
      onClose();
    } catch (error) {
      console.error('Failed to create BoardMate:', error);
    } finally {
      setIsLoading(false);
    }
  }, [wizardData, onComplete, onClose, organizationId]);

  // Validation for each step
  const isStepValid = useCallback((step: BoardMatesWizardStep) => {
    switch (step) {
      case 'personal':
        return (
          wizardData.personalInfo.fullName.trim().length > 0 &&
          wizardData.personalInfo.email.trim().length > 0 &&
          wizardData.personalInfo.organization.trim().length > 0 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(wizardData.personalInfo.email)
        );
      case 'invite':
        return true; // Invite step is always valid (toggle can be on/off)
      case 'review':
        return wizardData.termsAccepted;
      default:
        return false;
    }
  }, [wizardData]);

  const canProceed = isStepValid(currentStep);
  const isLastStep = currentStepIndex === STEPS.length - 1;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          "bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden",
          className
        )}
      >
        {/* Header */}
        <div className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center space-x-2">
              <Users className="w-6 h-6 text-blue-600" />
              <span>Add New BoardMate</span>
            </h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
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
                      isCompleted && "border-blue-500 bg-blue-500 text-white",
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
                        isCompleted && "text-blue-600",
                        !isActive && !isCompleted && "text-gray-500"
                      )}>
                        {step.title}
                      </div>
                      <div className="text-xs text-gray-400 max-w-28 leading-tight">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  
                  {/* Connector line */}
                  {index < STEPS.length - 1 && (
                    <div className={cn(
                      "flex-1 h-px mx-4 transition-colors duration-200",
                      index < currentStepIndex ? "bg-blue-500" : "bg-gray-300"
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
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={!canProceed || isLoading}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Rocket className="w-4 h-4" />
                  )}
                  <span>{isLoading ? 'Creating...' : 'Create & Broadcast'}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Import step components
import PersonalInformationStep from './steps/PersonalInformationStep';
import InviteToBoardUserStep from './steps/InviteToBoardUserStep';
import ReviewCreateBroadcastStep from './steps/ReviewCreateBroadcastStep';

// Step content component
function StepContent({ 
  step, 
  data, 
  onUpdate 
}: { 
  step: BoardMatesWizardStep; 
  data: BoardMatesWizardData; 
  onUpdate: (updates: Partial<BoardMatesWizardData>) => void;
}) {
  switch (step) {
    case 'personal':
      return <PersonalInformationStep data={data} onUpdate={onUpdate} />;
    case 'invite':
      return <InviteToBoardUserStep data={data} onUpdate={onUpdate} />;
    case 'review':
      return <ReviewCreateBroadcastStep data={data} onUpdate={onUpdate} />;
    default:
      return <div>Step not implemented</div>;
  }
}