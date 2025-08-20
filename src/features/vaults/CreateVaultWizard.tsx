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
  Building2, 
  Users, 
  FileText,
  Rocket,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Step definitions
const STEPS = [
  {
    id: 'organization',
    title: 'Select Organization',
    description: 'Choose or create an organization for your vault',
    icon: Building2,
  },
  {
    id: 'assets',
    title: 'Include Assets',
    description: 'Add documents and files to your vault',
    icon: FileText,
  },
  {
    id: 'boardmates',
    title: 'Invite BoardMates',
    description: 'Add team members who can access this vault',
    icon: Users,
  },
  {
    id: 'review',
    title: 'Review & Create',
    description: 'Review your vault settings and create',
    icon: Rocket,
  },
] as const;

export type VaultWizardStep = typeof STEPS[number]['id'];

// Wizard data structure
export interface VaultWizardData {
  // Step 1: Organization
  selectedOrganization: {
    id: string;
    name: string;
    slug: string;
  } | null;
  createNewOrganization: {
    name: string;
    description: string;
    industry: string;
    website: string;
  } | null;

  // Step 2: Assets
  selectedAssets: Array<{
    id: string;
    name: string;
    file_type: string;
    file_size: number;
    created_at: string;
  }>;

  // Step 3: BoardMates
  selectedBoardMates: Array<{
    id: string;
    email: string;
    full_name: string;
    role: string;
  }>;
  newBoardMates: Array<{
    email: string;
    full_name: string;
    role: 'viewer' | 'member' | 'admin';
  }>;

  // Vault settings
  vaultName: string;
  vaultDescription: string;
  accessLevel: 'organization' | 'restricted' | 'private';
  vaultType: 'board_pack' | 'document_set' | 'project' | 'compliance';
}

interface CreateVaultWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: VaultWizardData) => Promise<void>;
  className?: string;
}

export default function CreateVaultWizard({ 
  isOpen, 
  onClose, 
  onComplete,
  className 
}: CreateVaultWizardProps) {
  const [currentStep, setCurrentStep] = useState<VaultWizardStep>('organization');
  const [wizardData, setWizardData] = useState<VaultWizardData>({
    selectedOrganization: null,
    createNewOrganization: null,
    selectedAssets: [],
    selectedBoardMates: [],
    newBoardMates: [],
    vaultName: '',
    vaultDescription: '',
    accessLevel: 'organization',
    vaultType: 'board_pack',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Get current step index
  const currentStepIndex = STEPS.findIndex(step => step.id === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  // Update wizard data
  const updateWizardData = useCallback((updates: Partial<VaultWizardData>) => {
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
      console.error('Failed to create vault:', error);
    } finally {
      setIsLoading(false);
    }
  }, [wizardData, onComplete, onClose]);

  // Validation for each step
  const isStepValid = useCallback((step: VaultWizardStep) => {
    switch (step) {
      case 'organization':
        return wizardData.selectedOrganization || 
               (wizardData.createNewOrganization?.name && wizardData.createNewOrganization?.industry);
      case 'assets':
        return wizardData.selectedAssets.length > 0;
      case 'boardmates':
        return wizardData.selectedBoardMates.length > 0 || wizardData.newBoardMates.length > 0;
      case 'review':
        return wizardData.vaultName.trim().length > 0;
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
          "bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden",
          className
        )}
      >
        {/* Header */}
        <div className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">
              Create New Vault
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
              {/* Step content will be rendered here */}
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
                    <Rocket className="w-4 h-4" />
                  )}
                  <span>{isLoading ? 'Creating...' : 'Create Vault'}</span>
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
import OrganizationStep from './steps/OrganizationStep';
import AssetsStep from './steps/AssetsStep';
import BoardMatesStep from './steps/BoardMatesStep';
import ReviewStep from './steps/ReviewStep';

// Step content component
function StepContent({ 
  step, 
  data, 
  onUpdate 
}: { 
  step: VaultWizardStep; 
  data: VaultWizardData; 
  onUpdate: (updates: Partial<VaultWizardData>) => void;
}) {
  switch (step) {
    case 'organization':
      return <OrganizationStep data={data} onUpdate={onUpdate} />;
    case 'assets':
      return <AssetsStep data={data} onUpdate={onUpdate} />;
    case 'boardmates':
      return <BoardMatesStep data={data} onUpdate={onUpdate} />;
    case 'review':
      return <ReviewStep data={data} onUpdate={onUpdate} />;
    default:
      return <div>Step not implemented</div>;
  }
}