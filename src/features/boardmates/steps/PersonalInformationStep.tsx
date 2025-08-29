'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building,
  Briefcase,
  Globe,
  Users,
  Info,
  AlertCircle,
  Check,
  Linkedin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  BoardMatesWizardData, 
  BOARD_ROLES,
  COUNTRIES,
  PersonalInformation
} from '../types';

interface PersonalInformationStepProps {
  data: BoardMatesWizardData;
  onUpdate: (updates: Partial<BoardMatesWizardData>) => void;
}

export default function PersonalInformationStep({ data, onUpdate }: PersonalInformationStepProps) {
  const [selectedRoleCategory, setSelectedRoleCategory] = useState<string>('');

  // Handle form field changes
  const handleFieldChange = <K extends keyof PersonalInformation>(
    field: K,
    value: PersonalInformation[K]
  ) => {
    onUpdate({
      personalInfo: {
        ...data.personalInfo,
        [field]: value,
      },
    });
  };

  // Handle address field changes
  const handleAddressChange = (field: keyof PersonalInformation['address'], value: string) => {
    onUpdate({
      personalInfo: {
        ...data.personalInfo,
        address: {
          ...data.personalInfo.address,
          [field]: value,
        },
      },
    });
  };

  // Validation checks
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.personalInfo.email);
  const isPhoneValid = data.personalInfo.phoneNumber.length === 0 || /^[\+]?[1-9][\d]{0,15}$/.test(data.personalInfo.phoneNumber.replace(/[\s\-\(\)]/g, ''));
  
  const isFormValid = 
    data.personalInfo.fullName.trim().length > 0 &&
    data.personalInfo.email.trim().length > 0 &&
    isEmailValid &&
    data.personalInfo.organization.trim().length > 0 &&
    isPhoneValid;

  // Get role categories for grouping
  const roleCategories = Array.from(new Set(BOARD_ROLES.map(role => role.category)));
  const selectedRole = BOARD_ROLES.find(role => role.value === data.personalInfo.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Personal Information
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Enter the BoardMate's contact details and professional information
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Basic Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="Enter full name"
                    value={data.personalInfo.fullName}
                    onChange={(e) => handleFieldChange('fullName', e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Professional Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Senior Director"
                    value={data.personalInfo.title || ''}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@company.com"
                      value={data.personalInfo.email}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      className={cn(
                        "bg-white pl-10",
                        data.personalInfo.email && !isEmailValid && "border-red-500"
                      )}
                    />
                  </div>
                  {data.personalInfo.email && !isEmailValid && (
                    <p className="text-xs text-red-600">Please enter a valid email address</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={data.personalInfo.phoneNumber}
                      onChange={(e) => handleFieldChange('phoneNumber', e.target.value)}
                      className={cn(
                        "bg-white pl-10",
                        data.personalInfo.phoneNumber && !isPhoneValid && "border-red-500"
                      )}
                    />
                  </div>
                  {data.personalInfo.phoneNumber && !isPhoneValid && (
                    <p className="text-xs text-red-600">Please enter a valid phone number</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn Profile</Label>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="linkedin"
                    placeholder="https://linkedin.com/in/username"
                    value={data.personalInfo.linkedinProfile || ''}
                    onChange={(e) => handleFieldChange('linkedinProfile', e.target.value)}
                    className="bg-white pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Organization & Role */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Briefcase className="w-5 h-5" />
                <span>Organization & Role</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="organization">Organization *</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="organization"
                      placeholder="Company name"
                      value={data.personalInfo.organization}
                      onChange={(e) => handleFieldChange('organization', e.target.value)}
                      className="bg-white pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    placeholder="e.g., Finance, Legal"
                    value={data.personalInfo.department || ''}
                    onChange={(e) => handleFieldChange('department', e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Board Role *</Label>
                <Select 
                  value={data.personalInfo.role} 
                  onValueChange={(value) => handleFieldChange('role', value as any)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select board role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleCategories.map(category => (
                      <div key={category}>
                        <div className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-50">
                          {category}
                        </div>
                        {BOARD_ROLES.filter(role => role.category === category).map(role => (
                          <SelectItem key={role.value} value={role.value}>
                            <div className="flex flex-col">
                              <span>{role.label}</span>
                              <span className="text-xs text-gray-500">{role.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
                {selectedRole && (
                  <p className="text-xs text-gray-600">
                    {selectedRole.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Address Information</span>
                <Badge variant="secondary">Optional</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="street">Street Address</Label>
                <Input
                  id="street"
                  placeholder="123 Main Street"
                  value={data.personalInfo.address.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  className="bg-white"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="City"
                    value={data.personalInfo.address.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    placeholder="State"
                    value={data.personalInfo.address.state}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    placeholder="12345"
                    value={data.personalInfo.address.postalCode}
                    onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select 
                  value={data.personalInfo.address.country} 
                  onValueChange={(value) => handleAddressChange('country', value)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(country => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Bio */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Professional Bio</span>
                <Badge variant="secondary">Optional</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="bio">Biography</Label>
                <Textarea
                  id="bio"
                  placeholder="Brief professional background and expertise..."
                  value={data.personalInfo.bio || ''}
                  onChange={(e) => handleFieldChange('bio', e.target.value)}
                  className="bg-white"
                  rows={4}
                />
                <p className="text-xs text-gray-500">
                  This will be visible to other board members and helps with introductions.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Info className="w-5 h-5" />
                <span>Preview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Contact Card Preview */}
              <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
                <div className="flex items-start space-x-3">
                  <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-blue-500 text-white">
                      {data.personalInfo.fullName.split(' ').map(n => n[0]).join('').toUpperCase() || 'BM'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900">
                      {data.personalInfo.fullName || 'Full Name'}
                    </h4>
                    {data.personalInfo.title && (
                      <p className="text-sm text-gray-600">{data.personalInfo.title}</p>
                    )}
                    {selectedRole && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {selectedRole.label}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  {data.personalInfo.organization && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Building className="w-4 h-4" />
                      <span>{data.personalInfo.organization}</span>
                    </div>
                  )}
                  
                  {data.personalInfo.email && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{data.personalInfo.email}</span>
                    </div>
                  )}
                  
                  {data.personalInfo.phoneNumber && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{data.personalInfo.phoneNumber}</span>
                    </div>
                  )}

                  {data.personalInfo.address.city && data.personalInfo.address.country && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {data.personalInfo.address.city}, {data.personalInfo.address.country}
                      </span>
                    </div>
                  )}

                  {data.personalInfo.linkedinProfile && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Linkedin className="w-4 h-4" />
                      <a 
                        href={data.personalInfo.linkedinProfile} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate"
                      >
                        LinkedIn Profile
                      </a>
                    </div>
                  )}
                </div>

                {data.personalInfo.bio && (
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {data.personalInfo.bio}
                    </p>
                  </div>
                )}
              </div>

              {/* Form Validation Status */}
              <div className={cn(
                "p-3 rounded-lg border",
                isFormValid ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
              )}>
                <div className="flex items-center space-x-2">
                  {isFormValid ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  )}
                  <p className={cn(
                    "text-sm font-medium",
                    isFormValid ? "text-green-800" : "text-amber-800"
                  )}>
                    {isFormValid ? "Ready to proceed" : "Required fields missing"}
                  </p>
                </div>
                {!isFormValid && (
                  <ul className="text-sm text-amber-700 mt-2 space-y-1">
                    {!data.personalInfo.fullName && <li>• Full name is required</li>}
                    {!data.personalInfo.email && <li>• Email address is required</li>}
                    {data.personalInfo.email && !isEmailValid && <li>• Valid email address required</li>}
                    {!data.personalInfo.organization && <li>• Organization is required</li>}
                    {data.personalInfo.phoneNumber && !isPhoneValid && <li>• Valid phone number required</li>}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}