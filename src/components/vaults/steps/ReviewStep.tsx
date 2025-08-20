'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Rocket, 
  Building2, 
  FileText, 
  Users,
  Check,
  Settings,
  Lock,
  Globe,
  Eye,
  Mail,
  Edit3
} from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';
import { VaultWizardData } from '../CreateVaultWizard';

interface ReviewStepProps {
  data: VaultWizardData;
  onUpdate: (updates: Partial<VaultWizardData>) => void;
}

const VAULT_TYPES = {
  board_pack: {
    label: 'Board Pack',
    description: 'Complete board meeting materials',
    icon: '📋'
  },
  document_set: {
    label: 'Document Set',
    description: 'Collection of related documents',
    icon: '📄'
  },
  project: {
    label: 'Project',
    description: 'Project-specific files and resources',
    icon: '🚀'
  },
  compliance: {
    label: 'Compliance',
    description: 'Regulatory and compliance documents',
    icon: '⚖️'
  }
};

const ACCESS_LEVELS = {
  organization: {
    label: 'Organization',
    description: 'All organization members can access',
    icon: Globe,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  restricted: {
    label: 'Restricted',
    description: 'Only invited members can access',
    icon: Lock,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  private: {
    label: 'Private',
    description: 'Only you and specific invitees',
    icon: Eye,
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  }
};

export default function ReviewStep({ data, onUpdate }: ReviewStepProps) {
  const handleVaultDetailsChange = (field: string, value: string) => {
    onUpdate({ [field]: value });
  };

  const selectedOrg = data.selectedOrganization;
  const newOrg = data.createNewOrganization;
  const totalAssets = data.selectedAssets.length;
  const totalSize = data.selectedAssets.reduce((sum, asset) => sum + asset.file_size, 0);
  const totalBoardMates = data.selectedBoardMates.length + data.newBoardMates.length;
  const accessConfig = ACCESS_LEVELS[data.accessLevel];
  const AccessIcon = accessConfig.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Rocket className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Review & Create Vault
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Review your vault settings and provide final details
        </p>
      </div>

      {/* Vault Details Form */}
      <Card className="border-2 border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Vault Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vault-name">Vault Name *</Label>
              <Input
                id="vault-name"
                placeholder="Enter vault name"
                value={data.vaultName}
                onChange={(e) => handleVaultDetailsChange('vaultName', e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vault-type">Vault Type</Label>
              <Select 
                value={data.vaultType} 
                onValueChange={(value) => handleVaultDetailsChange('vaultType', value)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(VAULT_TYPES).map(([key, type]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center space-x-2">
                        <span>{type.icon}</span>
                        <div>
                          <div>{type.label}</div>
                          <div className="text-xs text-gray-500">{type.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="vault-description">Description</Label>
            <Textarea
              id="vault-description"
              placeholder="Brief description of your vault"
              value={data.vaultDescription}
              onChange={(e) => handleVaultDetailsChange('vaultDescription', e.target.value)}
              className="bg-white"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="access-level">Access Level</Label>
            <Select 
              value={data.accessLevel} 
              onValueChange={(value) => handleVaultDetailsChange('accessLevel', value)}
            >
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACCESS_LEVELS).map(([key, level]) => {
                  const LevelIcon = level.icon;
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center space-x-2">
                        <LevelIcon className={cn("w-4 h-4", level.color)} />
                        <div>
                          <div>{level.label}</div>
                          <div className="text-xs text-gray-500">{level.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Review Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organization Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span>Organization</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedOrg ? (
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{selectedOrg.name}</h4>
                  <p className="text-sm text-gray-500">Existing organization</p>
                </div>
              </div>
            ) : newOrg ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{newOrg.name}</h4>
                    <p className="text-sm text-gray-500">Will be created</p>
                  </div>
                </div>
                <div className="pl-15 space-y-1 text-sm">
                  <p><span className="text-gray-500">Industry:</span> {newOrg.industry}</p>
                  {newOrg.description && (
                    <p><span className="text-gray-500">Description:</span> {newOrg.description}</p>
                  )}
                  {newOrg.website && (
                    <p><span className="text-gray-500">Website:</span> {newOrg.website}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No organization selected</p>
            )}
          </CardContent>
        </Card>

        {/* Access Level Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AccessIcon className={cn("w-5 h-5", accessConfig.color)} />
              <span>Access & Security</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className={cn(
                "flex items-center space-x-3 p-3 rounded-lg",
                accessConfig.bgColor
              )}>
                <AccessIcon className={cn("w-5 h-5", accessConfig.color)} />
                <div>
                  <h4 className={cn("font-medium", accessConfig.color)}>{accessConfig.label}</h4>
                  <p className="text-sm text-gray-600">{accessConfig.description}</p>
                </div>
              </div>
              <div className="text-sm space-y-1">
                <p><span className="text-gray-500">Vault Type:</span> {VAULT_TYPES[data.vaultType].label}</p>
                <p><span className="text-gray-500">Members:</span> {totalBoardMates} board mates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assets Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-green-600" />
              <span>Assets ({totalAssets})</span>
            </div>
            <Badge variant="secondary">
              {formatBytes(totalSize)} total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalAssets > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.selectedAssets.map((asset) => (
                <div 
                  key={asset.id}
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {asset.name}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <Badge variant="outline" className="uppercase">
                        {asset.file_type}
                      </Badge>
                      <span>{formatBytes(asset.file_size)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No assets selected</p>
          )}
        </CardContent>
      </Card>

      {/* BoardMates Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-purple-600" />
              <span>BoardMates ({totalBoardMates})</span>
            </div>
            {data.newBoardMates.length > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {data.newBoardMates.length} invitations
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalBoardMates > 0 ? (
            <div className="space-y-4">
              {/* Existing BoardMates */}
              {data.selectedBoardMates.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                    Existing Members ({data.selectedBoardMates.length})
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.selectedBoardMates.map((mate) => (
                      <div 
                        key={mate.id}
                        className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border"
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>{mate.full_name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {mate.full_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{mate.email}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {mate.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Invitations */}
              {data.newBoardMates.length > 0 && (
                <div>
                  {data.selectedBoardMates.length > 0 && <Separator />}
                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                    New Invitations ({data.newBoardMates.length})
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.newBoardMates.map((mate, index) => (
                      <div 
                        key={`${mate.email}-${index}`}
                        className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200"
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Mail className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {mate.full_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{mate.email}</p>
                        </div>
                        <Badge variant="outline" className="text-xs border-blue-300">
                          {mate.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No board mates selected</p>
          )}
        </CardContent>
      </Card>

      {/* Final Checks */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <Check className="w-6 h-6 text-green-600 mt-1" />
            <div>
              <h4 className="font-medium text-green-800 mb-2">Ready to Create</h4>
              <div className="text-sm text-green-700 space-y-1">
                {data.vaultName ? (
                  <p>✓ Vault "{data.vaultName}" will be created</p>
                ) : (
                  <p className="text-orange-600">⚠ Please enter a vault name above</p>
                )}
                <p>✓ {totalAssets} assets will be added</p>
                <p>✓ {totalBoardMates} board mates will have access</p>
                {data.newBoardMates.length > 0 && (
                  <p>✓ {data.newBoardMates.length} invitation emails will be sent</p>
                )}
                {newOrg && (
                  <p>✓ Organization "{newOrg.name}" will be created</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}