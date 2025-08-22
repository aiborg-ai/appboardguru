'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Input } from '@/features/shared/ui/input';
import { Label } from '@/features/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/shared/ui/select';
import { Badge } from '@/features/shared/ui/badge';
import { Switch } from '@/features/shared/ui/switch';
import { Slider } from '@/features/shared/ui/slider';
import { 
  Target, 
  Search, 
  Filter,
  Info,
  CheckCircle2,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InstrumentPlayWizardData, GoalOption } from '../InstrumentPlayWizard';

interface GoalSelectionStepProps {
  data: InstrumentPlayWizardData;
  onUpdate: (updates: Partial<InstrumentPlayWizardData>) => void;
}

export default function GoalSelectionStep({ data, onUpdate }: GoalSelectionStepProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [goalParameters, setGoalParameters] = useState<Record<string, any>>({});

  const availableGoals = data.instrumentConfig.goals;
  const categories = ['all', ...Array.from(new Set(availableGoals.map(goal => goal.category)))];

  // Filter goals based on search and category
  const filteredGoals = availableGoals.filter(goal => {
    const matchesSearch = goal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         goal.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || goal.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Handle goal selection
  const handleGoalSelect = useCallback((goal: GoalOption) => {
    const selectedGoal = {
      id: goal.id,
      title: goal.title,
      description: goal.description,
      parameters: goalParameters
    };
    
    onUpdate({ selectedGoal });
  }, [goalParameters, onUpdate]);

  // Handle parameter change
  const handleParameterChange = useCallback((key: string, value: any) => {
    setGoalParameters(prev => ({ ...prev, [key]: value }));
    
    // If a goal is already selected, update it with new parameters
    if (data.selectedGoal) {
      onUpdate({ 
        selectedGoal: { 
          ...data.selectedGoal, 
          parameters: { ...goalParameters, [key]: value }
        }
      });
    }
  }, [data.selectedGoal, goalParameters, onUpdate]);

  const selectedGoal = data.selectedGoal;
  const selectedGoalConfig = availableGoals.find(g => g.id === selectedGoal?.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Target className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Select Your Analysis Goal
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Choose what you want to accomplish with {data.instrumentConfig.name}
        </p>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search goals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGoals.map((goal) => {
          const isSelected = selectedGoal?.id === goal.id;
          const GoalIcon = goal.icon;
          
          return (
            <motion.div
              key={goal.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <Card 
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-md relative",
                  isSelected && "ring-2 ring-blue-500 bg-blue-50"
                )}
                onClick={() => handleGoalSelect(goal)}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}

                <CardContent className="p-6">
                  {/* Icon and Category */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center",
                      isSelected ? "bg-blue-100" : "bg-gray-100"
                    )}>
                      <GoalIcon className={cn(
                        "w-6 h-6",
                        isSelected ? "text-blue-600" : "text-gray-500"
                      )} />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {goal.category}
                    </Badge>
                  </div>

                  {/* Goal Info */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-gray-900">
                      {goal.title}
                    </h4>
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {goal.description}
                    </p>
                  </div>

                  {/* Requirements */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        Min. {goal.minimumAssets || 1} asset{(goal.minimumAssets || 1) > 1 ? 's' : ''}
                      </span>
                      {goal.requiredAssetTypes && (
                        <span className="flex items-center space-x-1">
                          <Info className="w-3 h-3" />
                          <span>
                            {goal.requiredAssetTypes.slice(0, 2).join(', ')}
                            {goal.requiredAssetTypes.length > 2 && '...'}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* No results */}
      {filteredGoals.length === 0 && (
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-600 mb-2">
            No Goals Found
          </h4>
          <p className="text-gray-500">
            {searchTerm 
              ? `No goals match "${searchTerm}" in the ${selectedCategory === 'all' ? 'selected' : selectedCategory} category`
              : `No goals available in the ${selectedCategory} category`
            }
          </p>
        </div>
      )}

      {/* Goal Parameters Configuration */}
      {selectedGoal && selectedGoalConfig?.parameters && selectedGoalConfig.parameters.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-blue-600" />
                <span className="text-blue-900">Configure Analysis Parameters</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedGoalConfig.parameters.map((param) => (
                <div key={param.key} className="space-y-2">
                  <Label htmlFor={param.key} className="text-sm font-medium text-blue-900">
                    {param.label}
                    {param.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  
                  {param.type === 'select' && (
                    <Select 
                      value={goalParameters[param.key] || param.defaultValue} 
                      onValueChange={(value) => handleParameterChange(param.key, value)}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder={`Select ${param.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {param.options?.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {param.type === 'boolean' && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={param.key}
                        checked={goalParameters[param.key] ?? param.defaultValue ?? false}
                        onCheckedChange={(checked) => handleParameterChange(param.key, checked)}
                      />
                      <Label htmlFor={param.key} className="text-sm text-gray-600">
                        Enable this option
                      </Label>
                    </div>
                  )}
                  
                  {param.type === 'range' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Low</span>
                        <span className="font-medium">
                          {goalParameters[param.key] ?? param.defaultValue ?? 50}
                        </span>
                        <span>High</span>
                      </div>
                      <Slider
                        value={[goalParameters[param.key] ?? param.defaultValue ?? 50]}
                        onValueChange={([value]) => handleParameterChange(param.key, value)}
                        max={100}
                        min={0}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  )}
                  
                  {param.type === 'text' && (
                    <Input
                      id={param.key}
                      placeholder={`Enter ${param.label.toLowerCase()}`}
                      value={goalParameters[param.key] || param.defaultValue || ''}
                      onChange={(e) => handleParameterChange(param.key, e.target.value)}
                      className="bg-white"
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Selected Goal Summary */}
      {selectedGoal && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg"
        >
          <div className="flex items-start space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              {selectedGoalConfig && <selectedGoalConfig.icon className="w-6 h-6 text-green-600" />}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 mb-1">
                {selectedGoal.title}
              </h4>
              <p className="text-sm text-green-700 mb-3">
                {selectedGoal.description}
              </p>
              
              {/* Requirements */}
              <div className="space-y-1 text-sm text-green-600">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Minimum {selectedGoalConfig?.minimumAssets || 1} assets required
                  </span>
                </div>
                {selectedGoalConfig?.requiredAssetTypes && (
                  <div className="flex items-center space-x-2">
                    <Info className="w-4 h-4" />
                    <span>
                      Supports: {selectedGoalConfig.requiredAssetTypes.join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Parameters Summary */}
              {selectedGoal.parameters && Object.keys(selectedGoal.parameters).length > 0 && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-xs font-medium text-green-800 mb-1">Configuration:</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(selectedGoal.parameters).map(([key, value]) => (
                      <Badge key={key} variant="outline" className="text-xs border-green-300">
                        {key}: {String(value)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}