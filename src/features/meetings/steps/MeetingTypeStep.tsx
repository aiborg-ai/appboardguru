'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Input } from '@/features/shared/ui/input';
import { Textarea } from '@/features/shared/ui/textarea';
import { Label } from '@/features/shared/ui/label';
import { Badge } from '@/features/shared/ui/badge';
import { 
  Users, 
  Building2, 
  FileText,
  Settings,
  Crown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MeetingWizardData, MeetingType } from '../CreateMeetingWizard';

interface MeetingTypeStepProps {
  data: MeetingWizardData;
  onUpdate: (_updates: Partial<MeetingWizardData>) => void;
}

const MEETING_TYPES = [
  {
    value: 'agm' as MeetingType,
    label: 'Annual General Meeting (AGM)',
    description: 'Formal annual meeting with shareholders and stakeholders',
    icon: Crown,
    color: 'bg-purple-500',
    features: ['Voting', 'Annual Reports', 'Director Elections', 'Shareholder Proposals'],
    estimatedDuration: 180, // 3 hours
  },
  {
    value: 'board' as MeetingType,
    label: 'Board Meeting',
    description: 'Regular board of directors meeting for governance and strategy',
    icon: Building2,
    color: 'bg-blue-500',
    features: ['Strategic Decisions', 'Financial Review', 'Risk Assessment', 'Performance Monitoring'],
    estimatedDuration: 120, // 2 hours
  },
  {
    value: 'committee' as MeetingType,
    label: 'Committee Meeting',
    description: 'Specialized committee meeting for focused discussions',
    icon: Users,
    color: 'bg-green-500',
    features: ['Focused Topics', 'Expert Analysis', 'Recommendations', 'Action Items'],
    estimatedDuration: 90, // 1.5 hours
  },
  {
    value: 'other' as MeetingType,
    label: 'Other Meeting',
    description: 'Custom meeting type for special purposes',
    icon: Settings,
    color: 'bg-gray-500',
    features: ['Custom Agenda', 'Flexible Format', 'Tailored to Needs', 'Variable Duration'],
    estimatedDuration: 60, // 1 hour
  },
];

export default function MeetingTypeStep({ data, onUpdate }: MeetingTypeStepProps) {
  const selectedType = MEETING_TYPES.find(type => type.value === data.meetingType);

  const handleTypeSelect = (meetingType: MeetingType) => {
    const selectedMeetingType = MEETING_TYPES.find(type => type.value === meetingType);
    
    // Auto-populate title based on type if empty
    let title = data.title;
    if (!title && selectedMeetingType) {
      const today = new Date();
      const month = today.toLocaleDateString('en-US', { month: 'long' });
      const year = today.getFullYear();
      
      switch (meetingType) {
        case 'agm':
          title = `${year} Annual General Meeting`;
          break;
        case 'board':
          title = `Board Meeting - ${month} ${year}`;
          break;
        case 'committee':
          title = `Committee Meeting - ${month} ${year}`;
          break;
        default:
          title = `Meeting - ${month} ${year}`;
      }
    }

    onUpdate({ 
      meetingType,
      title,
      // Set estimated end time based on duration
      ...(selectedMeetingType && data.scheduledStart && {
        scheduledEnd: new Date(
          new Date(data.scheduledStart).getTime() + 
          selectedMeetingType.estimatedDuration * 60 * 1000
        ).toISOString()
      })
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          What type of meeting are you organizing?
        </h3>
        <p className="text-gray-600">
          Choose the meeting type to get started with the appropriate template and settings.
        </p>
      </div>

      {/* Meeting Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MEETING_TYPES.map((type) => {
          const isSelected = data.meetingType === type.value;
          const Icon = type.icon;
          
          return (
            <Card 
              key={type.value}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-md",
                isSelected 
                  ? "ring-2 ring-blue-500 border-blue-200 bg-blue-50" 
                  : "hover:border-gray-300"
              )}
              onClick={() => handleTypeSelect(type.value)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start space-x-3">
                  <div className={cn(
                    "p-2 rounded-lg text-white",
                    type.color
                  )}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold">
                      {type.label}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {type.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="text-blue-500">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Estimated Duration:</span>
                    <span className="font-medium">
                      {Math.floor(type.estimatedDuration / 60)}h {type.estimatedDuration % 60}m
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-sm text-gray-500 block mb-2">Common Features:</span>
                    <div className="flex flex-wrap gap-1">
                      {type.features.map((feature) => (
                        <Badge 
                          key={feature} 
                          variant="outline" 
                          className="text-xs"
                        >
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Meeting Details Form */}
      {selectedType && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Meeting Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="meeting-title">Meeting Title *</Label>
              <Input
                id="meeting-title"
                placeholder="Enter meeting title"
                value={data.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="meeting-description">Description</Label>
              <Textarea
                id="meeting-description"
                placeholder="Provide a brief description of the meeting purpose and key topics"
                value={data.description}
                onChange={(e) => onUpdate({ description: e.target.value })}
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Meeting Type Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className={cn("p-2 rounded-lg text-white", selectedType.color)}>
                  <selectedType.icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium">{selectedType.label}</h4>
                  <p className="text-sm text-gray-600">{selectedType.description}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Expected Duration:</span>
                  <div className="font-medium">
                    {Math.floor(selectedType.estimatedDuration / 60)}h {selectedType.estimatedDuration % 60}m
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Agenda Template:</span>
                  <div className="font-medium">
                    {selectedType.features.length} default items
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}