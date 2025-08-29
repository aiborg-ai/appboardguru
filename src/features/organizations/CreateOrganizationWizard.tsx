'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Building2, 
  Users, 
  Settings,
  Rocket,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  OrganizationWizardStep, 
  OrganizationWizardData,
  CreateOrganizationRequest,
  DEFAULT_ASSET_CATEGORIES
} from './types';

// Step definitions
const STEPS = [
  {
    id: 'setup' as const,
    title: 'Organization Setup',
    description: 'Basic organization information and settings',
    icon: Building2,
  },
  {
    id: 'assets' as const,
    title: 'Asset Management',
    description: 'Configure document management and processing',
    icon: Settings,
  },
  {
    id: 'members' as const,
    title: 'Invite BoardMates',
    description: 'Add team members and assign roles',
    icon: Users,
  },
  {
    id: 'review' as const,
    title: 'Review & Create',
    description: 'Review settings and create your organization',
    icon: Rocket,
  },
] as const;

interface CreateOrganizationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (_data: CreateOrganizationRequest) => Promise<void>;
  className?: string;
}

export default function CreateOrganizationWizard({ 
  isOpen, 
  onClose, 
  onComplete,
  className 
}: CreateOrganizationWizardProps) {
  const [currentStep, setCurrentStep] = useState<OrganizationWizardStep>('setup');
  const [wizardData, setWizardData] = useState<OrganizationWizardData>({
    organizationDetails: {
      name: '',
      slug: '',
      description: '',
      industry: '',
      organizationSize: 'startup',
      website: '',
      logoUrl: undefined,
    },
    assetSettings: {
      categories: DEFAULT_ASSET_CATEGORIES,
      storageLimit: 100, // 100GB default
      approvalWorkflow: false,
      aiProcessing: true,
      defaultPermissions: 'organization',
      watermarking: true,
      retentionDays: 2555, // 7 years default
      autoClassification: true,
    },
    selectedMembers: [],
    newInvitations: [],
    complianceSettings: {
      auditLogging: true,
      twoFactorRequired: false,
      dataEncryption: true,
      accessLogging: true,
      complianceStandards: [],
    },
    termsAccepted: false,
    notificationSettings: {
      emailUpdates: true,
      securityAlerts: true,
      weeklyReports: false,
    },
  });
  const [isLoading, setIsLoading] = useState(false);

  // Get current step index
  const currentStepIndex = STEPS.findIndex(step => step.id === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  // Auto-generate slug from organization name
  const generateSlug = useCallback((name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }, []);

  // Update wizard data
  const updateWizardData = useCallback((updates: Partial<OrganizationWizardData>) => {
    setWizardData(prev => {
      const newData = { ...prev, ...updates };
      
      // Auto-generate slug when name changes
      if (updates.organizationDetails?.name && updates.organizationDetails.name !== prev.organizationDetails.name) {
        newData.organizationDetails.slug = generateSlug(updates.organizationDetails.name);
      }
      
      return newData;
    });
  }, [generateSlug]);

  // Navigation handlers
  const goToNextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]!.id);
    }
  }, [currentStepIndex]);

  const goToPreviousStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]!.id);
    }
  }, [currentStepIndex]);

  // Submit handler
  const handleComplete = useCallback(async () => {
    setIsLoading(true);
    try {
      const requestData: CreateOrganizationRequest = {
        organizationDetails: wizardData.organizationDetails,
        assetSettings: wizardData.assetSettings,
        members: {
          existing: wizardData.selectedMembers,
          invitations: wizardData.newInvitations,
        },
        complianceSettings: wizardData.complianceSettings,
        notificationSettings: wizardData.notificationSettings,
      };

      await onComplete(requestData);
      onClose();
    } catch (error) {
      console.error('Failed to create organization:', error);
    } finally {
      setIsLoading(false);
    }
  }, [wizardData, onComplete, onClose]);

  // Validation for each step
  const isStepValid = useCallback((step: OrganizationWizardStep) => {
    switch (step) {
      case 'setup':
        return (
          wizardData.organizationDetails.name.trim().length > 0 &&
          wizardData.organizationDetails.industry.length > 0 &&
          wizardData.organizationDetails.organizationSize.length > 0
        );
      case 'assets':
        return (
          wizardData.assetSettings.categories.length > 0 &&
          wizardData.assetSettings.storageLimit > 0
        );
      case 'members':
        return (
          wizardData.selectedMembers.length > 0 || 
          wizardData.newInvitations.length > 0
        );
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
        <div className="border-b bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">
              Create Your Organization
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
                      isActive && "border-green-500 bg-green-500 text-white",
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
                        isActive && "text-green-600",
                        isCompleted && "text-green-600",
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
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
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
                  <span>{isLoading ? 'Creating...' : 'Create Organization'}</span>
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
import OrganizationSetupStep from './steps/OrganizationSetupStep';
import AssetManagementStep from './steps/AssetManagementStep';
import MembersStep from './steps/MembersStep';
import ReviewCreateStep from './steps/ReviewCreateStep';

// Step content component
function StepContent({ 
  step, 
  data, 
  onUpdate 
}: { 
  step: OrganizationWizardStep; 
  data: OrganizationWizardData; 
  onUpdate: (_updates: Partial<OrganizationWizardData>) => void;
}) {
  switch (step) {
    case 'setup':
      return <OrganizationSetupStep data={data} onUpdate={onUpdate} />;
    case 'assets':
      return <AssetManagementStep data={data} onUpdate={onUpdate} />;
    case 'members':
      return <MembersStep data={data} onUpdate={onUpdate} />;
    case 'review':
      return <ReviewCreateStep data={data} onUpdate={onUpdate} />;
    default:
      return <div>Step not implemented</div>;
  }
}