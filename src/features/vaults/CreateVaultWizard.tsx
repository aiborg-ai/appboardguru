'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Building2, 
  Users, 
  FileText,
  Rocket,
  Plus,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import step components
import OrganizationStep from './steps/OrganizationStep';
import AssetsStep from './steps/AssetsStep';
import BoardMatesStep from './steps/BoardMatesStep';
import ReviewStep from './steps/ReviewStep';

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
  organizationCreatedInWizard: boolean; // Track if org was created during wizard

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
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wizardData, setWizardData] = useState<VaultWizardData>({
    selectedOrganization: null,
    createNewOrganization: null,
    organizationCreatedInWizard: false,
    selectedAssets: [],
    selectedBoardMates: [],
    newBoardMates: [],
    vaultName: '',
    vaultDescription: '',
    accessLevel: 'organization',
    vaultType: 'board_pack',
  });

  const currentStepData = STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === STEPS.length - 1;
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleStepClick = useCallback((index: number) => {
    setCurrentStep(index);
  }, []);

  const updateWizardData = useCallback((updates: Partial<VaultWizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  }, []);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onComplete(wizardData);
      onClose();
    } catch (error) {
      console.error('Error creating vault:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className={cn("w-full max-w-4xl max-h-[90vh] overflow-hidden", className)}>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Create New Vault</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Follow the steps to set up your secure vault
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Progress bar */}
          <div className="mt-6">
            <Progress value={progress} className="h-2" />
          </div>

          {/* Steps indicator */}
          <div className="flex items-center justify-between mt-4">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(index)}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                    isActive && "bg-blue-50 text-blue-600",
                    isCompleted && "text-green-600 hover:bg-green-50",
                    !isActive && !isCompleted && "text-gray-400 hover:bg-gray-50"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    isActive && "bg-blue-600 text-white",
                    isCompleted && "bg-green-600 text-white",
                    !isActive && !isCompleted && "bg-gray-200"
                  )}>
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <StepIcon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs opacity-75">{step.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 250px)' }}>
          {/* Step content */}
          <div className="min-h-[400px]">
            {currentStep === 0 && (
              <OrganizationStep
                data={wizardData}
                onUpdate={updateWizardData}
              />
            )}
            {currentStep === 1 && (
              <AssetsStep
                data={wizardData}
                onUpdate={updateWizardData}
              />
            )}
            {currentStep === 2 && (
              <BoardMatesStep
                data={wizardData}
                onUpdate={updateWizardData}
              />
            )}
            {currentStep === 3 && (
              <ReviewStep
                data={wizardData}
                onUpdate={updateWizardData}
              />
            )}
          </div>
        </CardContent>

        {/* Footer with navigation */}
        <div className="border-t p-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isFirstStep}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </Button>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              
              {isLastStep ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center space-x-2"
                >
                  <Rocket className="h-4 w-4" />
                  <span>{isSubmitting ? 'Creating...' : 'Create Vault'}</span>
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  className="flex items-center space-x-2"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}