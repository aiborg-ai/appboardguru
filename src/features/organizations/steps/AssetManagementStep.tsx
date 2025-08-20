'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Input } from '@/features/shared/ui/input';
import { Label } from '@/features/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/shared/ui/select';
import { Badge } from '@/features/shared/ui/badge';
import { Switch } from '@/features/shared/ui/switch';
import { Slider } from '@/features/shared/ui/slider';
import { Textarea } from '@/features/shared/ui/textarea';
import { 
  Settings, 
  FileText, 
  Shield,
  Zap,
  HardDrive,
  Clock,
  Bot,
  Lock,
  Eye,
  Plus,
  X,
  Check,
  Info,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  OrganizationWizardData, 
  DEFAULT_ASSET_CATEGORIES,
  COMPLIANCE_STANDARDS
} from '../types';

interface AssetManagementStepProps {
  data: OrganizationWizardData;
  onUpdate: (updates: Partial<OrganizationWizardData>) => void;
}

const STORAGE_OPTIONS = [
  { value: 50, label: '50 GB', price: 'Starter' },
  { value: 100, label: '100 GB', price: 'Professional' },
  { value: 250, label: '250 GB', price: 'Business' },
  { value: 500, label: '500 GB', price: 'Enterprise' },
  { value: 1000, label: '1 TB', price: 'Enterprise+' },
];

const RETENTION_OPTIONS = [
  { value: 365, label: '1 Year' },
  { value: 1095, label: '3 Years' },
  { value: 1825, label: '5 Years' },
  { value: 2555, label: '7 Years' },
  { value: 3650, label: '10 Years' },
  { value: -1, label: 'Indefinite' },
];

export default function AssetManagementStep({ data, onUpdate }: AssetManagementStepProps) {
  const [newCategory, setNewCategory] = useState('');
  const [selectedCompliance, setSelectedCompliance] = useState<string[]>(
    data.complianceSettings.complianceStandards
  );

  // Handle asset settings changes
  const handleAssetSettingChange = <K extends keyof typeof data.assetSettings>(
    field: K,
    value: typeof data.assetSettings[K]
  ) => {
    onUpdate({
      assetSettings: {
        ...data.assetSettings,
        [field]: value,
      },
    });
  };

  // Handle compliance settings changes
  const handleComplianceChange = <K extends keyof typeof data.complianceSettings>(
    field: K,
    value: typeof data.complianceSettings[K]
  ) => {
    onUpdate({
      complianceSettings: {
        ...data.complianceSettings,
        [field]: value,
      },
    });
  };

  // Add custom category
  const handleAddCategory = () => {
    if (newCategory.trim() && !data.assetSettings.categories.includes(newCategory.trim())) {
      handleAssetSettingChange('categories', [...data.assetSettings.categories, newCategory.trim()]);
      setNewCategory('');
    }
  };

  // Remove category
  const handleRemoveCategory = (category: string) => {
    handleAssetSettingChange(
      'categories',
      data.assetSettings.categories.filter(c => c !== category)
    );
  };

  // Toggle compliance standard
  const handleComplianceToggle = (standard: string) => {
    const updated = selectedCompliance.includes(standard)
      ? selectedCompliance.filter(s => s !== standard)
      : [...selectedCompliance, standard];
    
    setSelectedCompliance(updated);
    handleComplianceChange('complianceStandards', updated);
  };

  const storageOption = STORAGE_OPTIONS.find(opt => opt.value === data.assetSettings.storageLimit);
  const retentionOption = RETENTION_OPTIONS.find(opt => opt.value === data.assetSettings.retentionDays);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Settings className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Asset Management
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Configure how your organization will manage documents and digital assets
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Storage & Limits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <HardDrive className="w-5 h-5" />
                <span>Storage & Limits</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Storage Limit</Label>
                <Select 
                  value={data.assetSettings.storageLimit.toString()} 
                  onValueChange={(value) => handleAssetSettingChange('storageLimit', parseInt(value))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select storage limit" />
                  </SelectTrigger>
                  <SelectContent>
                    {STORAGE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        <div className="flex items-center justify-between w-full">
                          <span>{option.label}</span>
                          <Badge variant="secondary" className="ml-2">{option.price}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data Retention Period</Label>
                <Select 
                  value={data.assetSettings.retentionDays.toString()} 
                  onValueChange={(value) => handleAssetSettingChange('retentionDays', parseInt(value))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select retention period" />
                  </SelectTrigger>
                  <SelectContent>
                    {RETENTION_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  How long to keep documents before automatic archival
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Document Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Document Categories</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {data.assetSettings.categories.map((category) => (
                  <Badge 
                    key={category} 
                    variant="secondary" 
                    className="flex items-center space-x-1 px-3 py-1"
                  >
                    <span>{category}</span>
                    {!DEFAULT_ASSET_CATEGORIES.includes(category) && (
                      <button
                        onClick={() => handleRemoveCategory(category)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
              
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Add custom category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                  className="bg-white"
                />
                <Button
                  onClick={handleAddCategory}
                  size="sm"
                  disabled={!newCategory.trim()}
                  className="whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Processing & AI */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bot className="w-5 h-5" />
                <span>AI & Processing</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>AI Document Processing</Label>
                  <p className="text-sm text-gray-500">
                    Enable automatic document analysis and summarization
                  </p>
                </div>
                <Switch
                  checked={data.assetSettings.aiProcessing}
                  onCheckedChange={(checked: boolean) => handleAssetSettingChange('aiProcessing', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Auto Classification</Label>
                  <p className="text-sm text-gray-500">
                    Automatically categorize documents using AI
                  </p>
                </div>
                <Switch
                  checked={data.assetSettings.autoClassification}
                  onCheckedChange={(checked: boolean) => handleAssetSettingChange('autoClassification', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security & Access */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Security & Access</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default Asset Permissions</Label>
                <Select 
                  value={data.assetSettings.defaultPermissions} 
                  onValueChange={(value: 'organization' | 'restricted' | 'private') => 
                    handleAssetSettingChange('defaultPermissions', value)
                  }
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select default permissions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="organization">
                      <div className="flex flex-col">
                        <span>Organization</span>
                        <span className="text-xs text-gray-500">All members can view</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="restricted">
                      <div className="flex flex-col">
                        <span>Restricted</span>
                        <span className="text-xs text-gray-500">Specific permissions required</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex flex-col">
                        <span>Private</span>
                        <span className="text-xs text-gray-500">Uploader and admins only</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Document Watermarking</Label>
                  <p className="text-sm text-gray-500">
                    Add watermarks to downloaded documents
                  </p>
                </div>
                <Switch
                  checked={data.assetSettings.watermarking}
                  onCheckedChange={(checked: boolean) => handleAssetSettingChange('watermarking', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Approval Workflow</Label>
                  <p className="text-sm text-gray-500">
                    Require approval before documents are published
                  </p>
                </div>
                <Switch
                  checked={data.assetSettings.approvalWorkflow}
                  onCheckedChange={(checked: boolean) => handleAssetSettingChange('approvalWorkflow', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Compliance Standards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="w-5 h-5" />
                <span>Compliance Standards</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {COMPLIANCE_STANDARDS.map((standard) => (
                  <div
                    key={standard}
                    className={cn(
                      "flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedCompliance.includes(standard)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                    onClick={() => handleComplianceToggle(standard)}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center",
                      selectedCompliance.includes(standard)
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-300"
                    )}>
                      {selectedCompliance.includes(standard) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="text-sm font-medium">{standard}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Info className="w-5 h-5" />
                <span>Configuration Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Storage Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Storage</span>
                  <Badge variant="outline">{storageOption?.label}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Retention</span>
                  <Badge variant="outline">{retentionOption?.label}</Badge>
                </div>
              </div>

              {/* Categories Count */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Categories</span>
                <Badge variant="outline">{data.assetSettings.categories.length}</Badge>
              </div>

              {/* Features Summary */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Enabled Features</h4>
                <div className="space-y-1">
                  {data.assetSettings.aiProcessing && (
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                      <Check className="w-3 h-3" />
                      <span>AI Processing</span>
                    </div>
                  )}
                  {data.assetSettings.autoClassification && (
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                      <Check className="w-3 h-3" />
                      <span>Auto Classification</span>
                    </div>
                  )}
                  {data.assetSettings.watermarking && (
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                      <Check className="w-3 h-3" />
                      <span>Watermarking</span>
                    </div>
                  )}
                  {data.assetSettings.approvalWorkflow && (
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                      <Check className="w-3 h-3" />
                      <span>Approval Workflow</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Compliance Summary */}
              {selectedCompliance.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">Compliance</h4>
                  <div className="space-y-1">
                    {selectedCompliance.map(standard => (
                      <div key={standard} className="flex items-center space-x-2 text-sm text-blue-600">
                        <Check className="w-3 h-3" />
                        <span className="text-xs">{standard}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security Level */}
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    {data.assetSettings.watermarking && data.assetSettings.approvalWorkflow
                      ? 'High Security'
                      : data.assetSettings.watermarking || data.assetSettings.approvalWorkflow
                      ? 'Medium Security'
                      : 'Standard Security'
                    }
                  </span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  Configuration meets recommended security standards
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}