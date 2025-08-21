'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Input } from '@/features/shared/ui/input';
import { Label } from '@/features/shared/ui/label';
import { Textarea } from '@/features/shared/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/shared/ui/select';
import { Badge } from '@/features/shared/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/features/shared/ui/avatar';
import { 
  Building2, 
  Globe, 
  Users,
  Upload,
  Check,
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  OrganizationWizardData, 
  INDUSTRIES, 
  ORGANIZATION_SIZES,
  OrganizationSize
} from '../types';
import { useDropdownOptions } from '@/hooks/useDropdownOptions';

interface OrganizationSetupStepProps {
  data: OrganizationWizardData;
  onUpdate: (updates: Partial<OrganizationWizardData>) => void;
}

export default function OrganizationSetupStep({ data, onUpdate }: OrganizationSetupStepProps) {
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  // Fetch dynamic dropdown options
  const { options: industryOptions, loading: industriesLoading } = useDropdownOptions('industry');
  const { options: sizeOptions, loading: sizesLoading } = useDropdownOptions('organization_size');

  // Check slug availability when it changes
  useEffect(() => {
    const checkSlugAvailability = async () => {
      if (!data.organizationDetails.slug || data.organizationDetails.slug.length < 3) {
        setSlugAvailable(null);
        return;
      }

      setIsCheckingSlug(true);
      try {
        const response = await fetch(`/api/organizations/check-slug?slug=${data.organizationDetails.slug}`);
        const result = await response.json();
        setSlugAvailable(result.available);
      } catch (error) {
        console.error('Failed to check slug availability:', error);
        setSlugAvailable(null);
      } finally {
        setIsCheckingSlug(false);
      }
    };

    const timeoutId = setTimeout(checkSlugAvailability, 500);
    return () => clearTimeout(timeoutId);
  }, [data.organizationDetails.slug]);

  // Handle form field changes
  const handleFieldChange = (field: keyof typeof data.organizationDetails, value: string) => {
    onUpdate({
      organizationDetails: {
        ...data.organizationDetails,
        [field]: value,
      },
    });
  };

  // Handle logo upload
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setLogoPreview(result);
        handleFieldChange('logoUrl', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const isFormValid = 
    data.organizationDetails.name.trim().length > 0 &&
    data.organizationDetails.industry.length > 0 &&
    data.organizationDetails.organizationSize.length > 0 &&
    (slugAvailable === true || slugAvailable === null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Organization Setup
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Let's start by setting up your organization's basic information and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <span>Basic Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization Name *</Label>
                  <Input
                    id="org-name"
                    placeholder="Enter organization name"
                    value={data.organizationDetails.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-slug">
                    URL Slug *
                    <span className="text-xs text-gray-500 ml-1">(auto-generated)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="org-slug"
                      placeholder="organization-slug"
                      value={data.organizationDetails.slug}
                      onChange={(e) => handleFieldChange('slug', e.target.value)}
                      className={cn(
                        "bg-white pr-10",
                        slugAvailable === false && "border-red-500",
                        slugAvailable === true && "border-green-500"
                      )}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {isCheckingSlug ? (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                      ) : slugAvailable === true ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : slugAvailable === false ? (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      ) : null}
                    </div>
                  </div>
                  {slugAvailable === false && (
                    <p className="text-xs text-red-600">This URL slug is already taken</p>
                  )}
                  {slugAvailable === true && (
                    <p className="text-xs text-green-600">URL slug is available</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Your organization will be accessible at: boardguru.ai/{data.organizationDetails.slug}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="org-description">Description</Label>
                <Textarea
                  id="org-description"
                  placeholder="Brief description of your organization and its mission"
                  value={data.organizationDetails.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  className="bg-white"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-website">Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="org-website"
                    type="url"
                    placeholder="https://example.com"
                    value={data.organizationDetails.website}
                    onChange={(e) => handleFieldChange('website', e.target.value)}
                    className="bg-white pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Industry & Size */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5" />
                <span>Organization Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="org-industry">Industry *</Label>
                  <Select 
                    value={data.organizationDetails.industry} 
                    onValueChange={(value) => {
                      console.log('Industry selected:', value)
                      handleFieldChange('industry', value)
                    }}
                    disabled={industriesLoading}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder={industriesLoading ? "Loading industries..." : "Select industry"} />
                    </SelectTrigger>
                    <SelectContent>
                      {industriesLoading ? (
                        <SelectItem value="" disabled>Loading...</SelectItem>
                      ) : industryOptions.length > 0 ? (
                        industryOptions.map(industry => (
                          <SelectItem key={industry.value} value={industry.value}>
                            {industry.label}
                          </SelectItem>
                        ))
                      ) : (
                        INDUSTRIES.map(industry => (
                          <SelectItem key={industry} value={industry.toLowerCase().replace(/ & /g, '_and_').replace(/ /g, '_')}>
                            {industry}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="org-size">Organization Size *</Label>
                  <Select 
                    value={data.organizationDetails.organizationSize} 
                    onValueChange={(value) => handleFieldChange('organizationSize', value)}
                    disabled={sizesLoading}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder={sizesLoading ? "Loading sizes..." : "Select size"} />
                    </SelectTrigger>
                    <SelectContent>
                      {sizesLoading ? (
                        <SelectItem value="" disabled>Loading...</SelectItem>
                      ) : sizeOptions.length > 0 ? (
                        sizeOptions.map(size => (
                          <SelectItem key={size.value} value={size.value}>
                            <div className="flex flex-col">
                              <span>{size.label}</span>
                              <span className="text-xs text-gray-500">{size.description}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        ORGANIZATION_SIZES.map(size => (
                          <SelectItem key={size.value} value={size.value}>
                            <div className="flex flex-col">
                              <span>{size.label}</span>
                              <span className="text-xs text-gray-500">{size.description}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logo Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="w-5 h-5" />
                <span>Organization Logo</span>
                <Badge variant="secondary">Optional</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={logoPreview || data.organizationDetails.logoUrl} />
                  <AvatarFallback>
                    {data.organizationDetails.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Label 
                    htmlFor="logo-upload"
                    className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Logo</span>
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG up to 2MB. Recommended size: 256x256px
                  </p>
                </div>
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
              {/* Organization Card Preview */}
              <div className="border rounded-lg p-4 bg-gradient-to-br from-green-50 to-emerald-50">
                <div className="flex items-start space-x-3">
                  <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                    <AvatarImage src={logoPreview || data.organizationDetails.logoUrl} />
                    <AvatarFallback className="bg-green-500 text-white">
                      {data.organizationDetails.name.charAt(0).toUpperCase() || 'O'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {data.organizationDetails.name || 'Your Organization'}
                    </h4>
                    {data.organizationDetails.industry && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {industryOptions.find(i => i.value === data.organizationDetails.industry)?.label || 
                         INDUSTRIES.find(i => i.toLowerCase().replace(/ & /g, '_and_').replace(/ /g, '_') === data.organizationDetails.industry) || 
                         data.organizationDetails.industry}
                      </Badge>
                    )}
                    {data.organizationDetails.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {data.organizationDetails.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  {data.organizationDetails.website && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Globe className="w-4 h-4" />
                      <span className="truncate">
                        {data.organizationDetails.website.replace(/^https?:\/\//, '')}
                      </span>
                    </div>
                  )}
                  
                  {data.organizationDetails.organizationSize && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>
                        {sizeOptions.find(s => s.value === data.organizationDetails.organizationSize)?.label ||
                         ORGANIZATION_SIZES.find(s => s.value === data.organizationDetails.organizationSize)?.label}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* URL Preview */}
              {data.organizationDetails.slug && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-800 mb-1">Your Organization URL</p>
                  <p className="text-sm text-blue-600 font-mono break-all">
                    boardguru.ai/{data.organizationDetails.slug}
                  </p>
                </div>
              )}

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
                    {!data.organizationDetails.name && <li>• Organization name is required</li>}
                    {!data.organizationDetails.industry && <li>• Industry selection is required</li>}
                    {!data.organizationDetails.organizationSize && <li>• Organization size is required</li>}
                    {slugAvailable === false && <li>• URL slug must be unique</li>}
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