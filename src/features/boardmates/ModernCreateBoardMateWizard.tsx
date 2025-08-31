'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  User,
  Building2,
  MapPin,
  Shield,
  Send,
  X,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Linkedin,
  Globe,
  Briefcase,
  Users,
  Check,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateBoardMateRequest } from './types';

// Step definitions
const STEPS = [
  {
    id: 'personal',
    title: 'Personal Information',
    subtitle: 'Basic contact and professional details',
    icon: User,
  },
  {
    id: 'organization',
    title: 'Organization & Role',
    subtitle: 'Board position and responsibilities',
    icon: Building2,
  },
  {
    id: 'contact',
    title: 'Contact Details',
    subtitle: 'Additional contact information',
    icon: MapPin,
  },
  {
    id: 'access',
    title: 'Access & Permissions',
    subtitle: 'Configure board access levels',
    icon: Shield,
  },
  {
    id: 'review',
    title: 'Review & Send',
    subtitle: 'Confirm details and send invitation',
    icon: Send,
  },
] as const;

type WizardStep = typeof STEPS[number]['id'];

interface WizardData {
  // Personal
  fullName: string;
  email: string;
  phone: string;
  linkedin: string;
  
  // Organization
  company: string;
  designation: string;
  department: string;
  boardRole: string;
  bio: string;
  
  // Contact
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  website: string;
  
  // Access
  committees: string[];
  vaultAccess: string[];
  accessLevel: 'viewer' | 'member' | 'admin';
  sendInvitation: boolean;
  customMessage: string;
  
  // Settings
  emailNotifications: boolean;
  termsAccepted: boolean;
}

interface ModernCreateBoardMateWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: any) => Promise<void>;
  organizationId?: string;
}

export default function ModernCreateBoardMateWizard({
  isOpen,
  onClose,
  onComplete,
  organizationId,
}: ModernCreateBoardMateWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('personal');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof WizardData, string>>>({});
  
  const [data, setData] = useState<WizardData>({
    fullName: '',
    email: '',
    phone: '',
    linkedin: '',
    company: '',
    designation: '',
    department: '',
    boardRole: 'member',
    bio: '',
    address: '',
    city: '',
    state: '',
    country: 'United States',
    postalCode: '',
    website: '',
    committees: [],
    vaultAccess: [],
    accessLevel: 'member',
    sendInvitation: true,
    customMessage: '',
    emailNotifications: true,
    termsAccepted: false,
  });

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
  const currentStepData = STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const updateData = useCallback((updates: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...updates }));
    // Clear errors for updated fields
    const errorKeys = Object.keys(updates) as Array<keyof WizardData>;
    setErrors(prev => {
      const newErrors = { ...prev };
      errorKeys.forEach(key => delete newErrors[key]);
      return newErrors;
    });
  }, []);

  const validateStep = useCallback((step: WizardStep): boolean => {
    const newErrors: Partial<Record<keyof WizardData, string>> = {};

    switch (step) {
      case 'personal':
        if (!data.fullName.trim()) newErrors.fullName = 'Full name is required';
        if (!data.email.trim()) newErrors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          newErrors.email = 'Invalid email format';
        }
        break;
      
      case 'organization':
        if (!data.company.trim()) newErrors.company = 'Company is required';
        if (!data.designation.trim()) newErrors.designation = 'Designation is required';
        if (!data.boardRole) newErrors.boardRole = 'Board role is required';
        break;
      
      case 'review':
        if (!data.termsAccepted) newErrors.termsAccepted = 'You must accept the terms';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [data]);

  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < STEPS.length) {
        setCurrentStep(STEPS[nextIndex].id);
      }
    }
  }, [currentStep, currentStepIndex, validateStep]);

  const handlePrevious = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  }, [currentStepIndex]);

  const handleSubmit = useCallback(async () => {
    if (!validateStep('review')) return;

    setIsLoading(true);
    try {
      await onComplete(data);
      onClose();
    } catch (error) {
      console.error('Failed to create board mate:', error);
    } finally {
      setIsLoading(false);
    }
  }, [data, onComplete, onClose, validateStep]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Add New BoardMate</h2>
              <p className="text-sm text-gray-500 mt-1">
                Follow the steps to add a new member to your board
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-between mt-6">
            {STEPS.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = index < currentStepIndex;
              const Icon = step.icon;

              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className={cn(
                    "flex-1 group relative",
                    index < STEPS.length - 1 && "after:content-[''] after:absolute after:top-5 after:left-[60%] after:w-[80%] after:h-[2px]",
                    isCompleted ? "after:bg-blue-600" : "after:bg-gray-200"
                  )}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all relative z-10",
                        isActive ? "bg-blue-600 text-white" : 
                        isCompleted ? "bg-blue-600 text-white" : 
                        "bg-gray-100 text-gray-400"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <span className={cn(
                      "text-xs mt-2 font-medium hidden sm:block",
                      isActive ? "text-blue-600" : 
                      isCompleted ? "text-gray-700" : 
                      "text-gray-400"
                    )}>
                      {step.title}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 240px)' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Personal Information Step */}
              {currentStep === 'personal' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={data.fullName}
                        onChange={(e) => updateData({ fullName: e.target.value })}
                        placeholder="John Smith"
                        className={errors.fullName ? 'border-red-500' : ''}
                      />
                      {errors.fullName && (
                        <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          value={data.email}
                          onChange={(e) => updateData({ email: e.target.value })}
                          placeholder="john@company.com"
                          className={cn("pl-10", errors.email ? 'border-red-500' : '')}
                        />
                      </div>
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          id="phone"
                          value={data.phone}
                          onChange={(e) => updateData({ phone: e.target.value })}
                          placeholder="+1 (555) 123-4567"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="linkedin">LinkedIn Profile</Label>
                      <div className="relative">
                        <Linkedin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          id="linkedin"
                          value={data.linkedin}
                          onChange={(e) => updateData({ linkedin: e.target.value })}
                          placeholder="https://linkedin.com/in/username"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Organization & Role Step */}
              {currentStep === 'organization' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="company">Company/Organization *</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          id="company"
                          value={data.company}
                          onChange={(e) => updateData({ company: e.target.value })}
                          placeholder="Acme Corporation"
                          className={cn("pl-10", errors.company ? 'border-red-500' : '')}
                        />
                      </div>
                      {errors.company && (
                        <p className="text-red-500 text-sm mt-1">{errors.company}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="designation">Professional Title *</Label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          id="designation"
                          value={data.designation}
                          onChange={(e) => updateData({ designation: e.target.value })}
                          placeholder="Chief Executive Officer"
                          className={cn("pl-10", errors.designation ? 'border-red-500' : '')}
                        />
                      </div>
                      {errors.designation && (
                        <p className="text-red-500 text-sm mt-1">{errors.designation}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        value={data.department}
                        onChange={(e) => updateData({ department: e.target.value })}
                        placeholder="Executive Management"
                      />
                    </div>

                    <div>
                      <Label htmlFor="boardRole">Board Role *</Label>
                      <Select
                        value={data.boardRole}
                        onValueChange={(value) => updateData({ boardRole: value })}
                      >
                        <SelectTrigger className={errors.boardRole ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select board role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="chairman">Chairman</SelectItem>
                          <SelectItem value="vice_chairman">Vice Chairman</SelectItem>
                          <SelectItem value="ceo">CEO</SelectItem>
                          <SelectItem value="cfo">CFO</SelectItem>
                          <SelectItem value="independent_director">Independent Director</SelectItem>
                          <SelectItem value="executive_director">Executive Director</SelectItem>
                          <SelectItem value="non_executive_director">Non-Executive Director</SelectItem>
                          <SelectItem value="board_member">Board Member</SelectItem>
                          <SelectItem value="board_observer">Board Observer</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.boardRole && (
                        <p className="text-red-500 text-sm mt-1">{errors.boardRole}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bio">Professional Bio</Label>
                    <Textarea
                      id="bio"
                      value={data.bio}
                      onChange={(e) => updateData({ bio: e.target.value })}
                      placeholder="Brief professional background and expertise..."
                      rows={4}
                    />
                  </div>
                </div>
              )}

              {/* Contact Details Step */}
              {currentStep === 'contact' && (
                <div className="space-y-6">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      Contact details are optional but help maintain comprehensive board member records.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      value={data.address}
                      onChange={(e) => updateData({ address: e.target.value })}
                      placeholder="123 Main Street, Suite 100"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={data.city}
                        onChange={(e) => updateData({ city: e.target.value })}
                        placeholder="San Francisco"
                      />
                    </div>

                    <div>
                      <Label htmlFor="state">State/Province</Label>
                      <Input
                        id="state"
                        value={data.state}
                        onChange={(e) => updateData({ state: e.target.value })}
                        placeholder="CA"
                      />
                    </div>

                    <div>
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input
                        id="postalCode"
                        value={data.postalCode}
                        onChange={(e) => updateData({ postalCode: e.target.value })}
                        placeholder="94105"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Select
                        value={data.country}
                        onValueChange={(value) => updateData({ country: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="United States">United States</SelectItem>
                          <SelectItem value="Canada">Canada</SelectItem>
                          <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                          <SelectItem value="Australia">Australia</SelectItem>
                          <SelectItem value="Germany">Germany</SelectItem>
                          <SelectItem value="France">France</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="website">Website</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          id="website"
                          value={data.website}
                          onChange={(e) => updateData({ website: e.target.value })}
                          placeholder="https://example.com"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Access & Permissions Step */}
              {currentStep === 'access' && (
                <div className="space-y-6">
                  <div>
                    <Label>Access Level</Label>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      {[
                        { value: 'viewer', label: 'Viewer', desc: 'Can view documents only' },
                        { value: 'member', label: 'Member', desc: 'Can view and contribute' },
                        { value: 'admin', label: 'Admin', desc: 'Full access and management' },
                      ].map((level) => (
                        <button
                          key={level.value}
                          onClick={() => updateData({ accessLevel: level.value as any })}
                          className={cn(
                            "p-4 rounded-lg border-2 text-left transition-all",
                            data.accessLevel === level.value
                              ? "border-blue-600 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                        >
                          <div className="font-medium">{level.label}</div>
                          <div className="text-sm text-gray-500 mt-1">{level.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label className="text-base">Send Invitation Email</Label>
                        <p className="text-sm text-gray-500 mt-1">
                          Send an email invitation to join the board
                        </p>
                      </div>
                      <Switch
                        checked={data.sendInvitation}
                        onCheckedChange={(checked) => updateData({ sendInvitation: checked })}
                      />
                    </div>

                    {data.sendInvitation && (
                      <div>
                        <Label htmlFor="customMessage">Custom Message (Optional)</Label>
                        <Textarea
                          id="customMessage"
                          value={data.customMessage}
                          onChange={(e) => updateData({ customMessage: e.target.value })}
                          placeholder="Add a personal message to the invitation..."
                          rows={3}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label className="text-base">Email Notifications</Label>
                        <p className="text-sm text-gray-500 mt-1">
                          Receive updates about board activities
                        </p>
                      </div>
                      <Switch
                        checked={data.emailNotifications}
                        onCheckedChange={(checked) => updateData({ emailNotifications: checked })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Review Step */}
              {currentStep === 'review' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-semibold mb-4">Review BoardMate Details</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <User className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium">{data.fullName}</p>
                          <p className="text-sm text-gray-500">{data.designation} at {data.company}</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm">{data.email}</p>
                          {data.phone && <p className="text-sm text-gray-500">{data.phone}</p>}
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Shield className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm">
                            <span className="font-medium">Board Role:</span> {data.boardRole}
                          </p>
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">Access Level:</span> {data.accessLevel}
                          </p>
                        </div>
                      </div>

                      {data.sendInvitation && (
                        <div className="flex items-start space-x-3">
                          <Send className="w-5 h-5 text-gray-400 mt-0.5" />
                          <p className="text-sm">
                            Invitation email will be sent upon creation
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="terms"
                        checked={data.termsAccepted}
                        onCheckedChange={(checked) => updateData({ termsAccepted: checked as boolean })}
                      />
                      <div>
                        <Label htmlFor="terms" className="text-sm font-normal cursor-pointer">
                          I confirm that I have the authority to add this person as a board member and that all information provided is accurate.
                        </Label>
                        {errors.termsAccepted && (
                          <p className="text-red-500 text-sm mt-1">{errors.termsAccepted}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={isFirstStep}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              
              {isLastStep ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading || !data.termsAccepted}
                  className="gap-2"
                >
                  {isLoading ? (
                    <>Loading...</>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Create BoardMate
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={handleNext} className="gap-2">
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}