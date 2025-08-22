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
  Target, 
  FileText,
  BarChart3,
  Share2,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Step definitions
const STEPS = [
  {
    id: 'goal',
    title: 'Select Goal',
    description: 'Choose your analysis objective',
    icon: Target,
  },
  {
    id: 'assets',
    title: 'Select Assets',
    description: 'Choose documents to analyze',
    icon: FileText,
  },
  {
    id: 'dashboard',
    title: 'Analysis Dashboard',
    description: 'AI-powered insights and results',
    icon: BarChart3,
  },
  {
    id: 'actions',
    title: 'Save & Share',
    description: 'Save results and share insights',
    icon: Share2,
  },
] as const;

export type InstrumentPlayStep = typeof STEPS[number]['id'];

// Wizard data structure
export interface InstrumentPlayWizardData {
  // Step 1: Goal Selection
  selectedGoal: {
    id: string;
    title: string;
    description: string;
    parameters?: Record<string, any>;
  } | null;

  // Step 2: Asset Selection
  selectedAssets: Array<{
    id: string;
    name: string;
    file_type: string;
    file_size: number;
    created_at: string;
  }>;

  // Step 3: Dashboard Results
  analysisResults: {
    insights: Array<{
      id: string;
      title: string;
      description: string;
      type: 'positive' | 'negative' | 'neutral' | 'warning';
      confidence: number;
      details?: any;
    }>;
    charts: Array<{
      id: string;
      type: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap';
      title: string;
      data: any;
      config?: any;
    }>;
    recommendations: Array<{
      id: string;
      title: string;
      description: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      actionItems?: string[];
    }>;
    metadata: {
      processingTime: number;
      documentsProcessed: number;
      confidence: number;
      timestamp: string;
    };
  } | null;

  // Step 4: Action Selection
  saveOptions: {
    saveToVault: {
      enabled: boolean;
      vaultId?: string;
      createNewVault?: boolean;
      vaultName?: string;
    };
    saveAsAsset: {
      enabled: boolean;
      assetName?: string;
      includeCharts?: boolean;
      includeRawData?: boolean;
    };
    shareOptions: {
      enabled: boolean;
      shareWithBoardMates?: boolean;
      generatePublicLink?: boolean;
      emailRecipients?: string[];
    };
    exportOptions: {
      pdf?: boolean;
      excel?: boolean;
      powerpoint?: boolean;
    };
  };

  // Instrument configuration
  instrumentId: string;
  instrumentConfig: InstrumentConfig;
}

export interface InstrumentConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  goals: GoalOption[];
  assetFilters?: {
    supportedTypes?: string[];
    minFiles?: number;
    maxFiles?: number;
    requiresSpecificContent?: boolean;
  };
  dashboardComponents: {
    chartTypes: Array<'line' | 'bar' | 'pie' | 'scatter' | 'heatmap' | 'table'>;
    insightCategories: string[];
    customComponents?: React.ComponentType<any>[];
  };
  processingConfig: {
    estimatedTime: string;
    requiresML?: boolean;
    batchSize?: number;
  };
}

export interface GoalOption {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  parameters?: Array<{
    key: string;
    label: string;
    type: 'select' | 'range' | 'boolean' | 'text';
    options?: Array<{ value: string; label: string }>;
    defaultValue?: any;
    required?: boolean;
  }>;
  requiredAssetTypes?: string[];
  minimumAssets?: number;
}

interface InstrumentPlayWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: InstrumentPlayWizardData) => Promise<void>;
  instrumentConfig: InstrumentConfig;
  className?: string;
}

export default function InstrumentPlayWizard({ 
  isOpen, 
  onClose, 
  onComplete,
  instrumentConfig,
  className 
}: InstrumentPlayWizardProps) {
  const [currentStep, setCurrentStep] = useState<InstrumentPlayStep>('goal');
  const [wizardData, setWizardData] = useState<InstrumentPlayWizardData>({
    selectedGoal: null,
    selectedAssets: [],
    analysisResults: null,
    saveOptions: {
      saveToVault: { enabled: false },
      saveAsAsset: { enabled: true, assetName: '', includeCharts: true, includeRawData: false },
      shareOptions: { enabled: false },
      exportOptions: { pdf: true }
    },
    instrumentId: instrumentConfig.id,
    instrumentConfig
  });
  const [isLoading, setIsLoading] = useState(false);

  // Get current step index
  const currentStepIndex = STEPS.findIndex(step => step.id === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  // Update wizard data
  const updateWizardData = useCallback((updates: Partial<InstrumentPlayWizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  }, []);

  // Navigation handlers
  const goToNextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]?.id || STEPS[0]?.id || 'goal');
    }
  }, [currentStepIndex]);

  const goToPreviousStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]?.id || STEPS[0]?.id || 'goal');
    }
  }, [currentStepIndex]);

  // Submit handler
  const handleComplete = useCallback(async () => {
    setIsLoading(true);
    try {
      await onComplete(wizardData);
      onClose();
    } catch (error) {
      console.error('Failed to complete instrument analysis:', error);
    } finally {
      setIsLoading(false);
    }
  }, [wizardData, onComplete, onClose]);

  // Validation for each step
  const isStepValid = useCallback((step: InstrumentPlayStep) => {
    switch (step) {
      case 'goal':
        return wizardData.selectedGoal !== null;
      case 'assets':
        return wizardData.selectedAssets.length >= (wizardData.selectedGoal?.minimumAssets || 1);
      case 'dashboard':
        return wizardData.analysisResults !== null;
      case 'actions':
        return wizardData.saveOptions.saveAsAsset.enabled || 
               wizardData.saveOptions.saveToVault.enabled ||
               wizardData.saveOptions.shareOptions.enabled;
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
          "bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden",
          className
        )}
      >
        {/* Header */}
        <div className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <instrumentConfig.icon className="w-8 h-8 text-blue-600" />
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  {instrumentConfig.name}
                </h2>
                <p className="text-sm text-gray-600">{instrumentConfig.description}</p>
              </div>
            </div>
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
              <StepContent 
                step={currentStep}
                data={wizardData}
                onUpdate={updateWizardData}
                onProcessAnalysis={async () => {
                  // This will be handled by the step component
                  setIsLoading(true);
                  try {
                    // Simulate processing
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    // In real implementation, this would call the AI service
                  } finally {
                    setIsLoading(false);
                  }
                }}
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
                  disabled={!canProceed || isLoading}
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
                    <Check className="w-4 h-4" />
                  )}
                  <span>{isLoading ? 'Processing...' : 'Complete Analysis'}</span>
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
import GoalSelectionStep from './steps/GoalSelectionStep';
import InstrumentAssetsStep from './steps/InstrumentAssetsStep';
import DashboardStep from './steps/DashboardStep';
import ActionsStep from './steps/ActionsStep';

// Step content component
function StepContent({ 
  step, 
  data, 
  onUpdate,
  onProcessAnalysis 
}: { 
  step: InstrumentPlayStep; 
  data: InstrumentPlayWizardData; 
  onUpdate: (updates: Partial<InstrumentPlayWizardData>) => void;
  onProcessAnalysis: () => Promise<void>;
}) {
  switch (step) {
    case 'goal':
      return <GoalSelectionStep data={data} onUpdate={onUpdate} />;
    case 'assets':
      return <InstrumentAssetsStep data={data} onUpdate={onUpdate} />;
    case 'dashboard':
      return <DashboardStep data={data} onUpdate={onUpdate} onProcessAnalysis={onProcessAnalysis} />;
    case 'actions':
      return <ActionsStep data={data} onUpdate={onUpdate} />;
    default:
      return <div>Step not implemented</div>;
  }
}