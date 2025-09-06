'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2, 
  FileText, 
  Users, 
  Lock,
  Globe,
  Shield,
  FolderOpen,
  CheckCircle
} from 'lucide-react';
import { VaultWizardData } from '../CreateVaultWizard';
import { cn } from '@/lib/utils';

interface ReviewStepProps {
  data: VaultWizardData;
  onUpdate: (updates: Partial<VaultWizardData>) => void;
}

export default function ReviewStep({ data, onUpdate }: ReviewStepProps) {
  const getAccessIcon = (accessLevel: string) => {
    switch (accessLevel) {
      case 'private': return <Lock className="h-4 w-4" />;
      case 'restricted': return <Shield className="h-4 w-4" />;
      case 'organization': return <Globe className="h-4 w-4" />;
      default: return <Lock className="h-4 w-4" />;
    }
  };

  const getVaultTypeIcon = (vaultType: string) => {
    switch (vaultType) {
      case 'board_pack': return <FolderOpen className="h-4 w-4" />;
      case 'document_set': return <FileText className="h-4 w-4" />;
      case 'project': return <Building2 className="h-4 w-4" />;
      case 'compliance': return <Shield className="h-4 w-4" />;
      default: return <FolderOpen className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Review & Create
        </h3>
        <p className="text-sm text-gray-600">
          Review your vault settings and provide final details
        </p>
      </div>

      {/* Vault Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vault Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="vault-name">Vault Name *</Label>
            <Input
              id="vault-name"
              placeholder="Enter vault name"
              value={data.vaultName}
              onChange={(e) => onUpdate({ vaultName: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="vault-description">Description</Label>
            <Textarea
              id="vault-description"
              placeholder="Brief description of this vault"
              value={data.vaultDescription}
              onChange={(e) => onUpdate({ vaultDescription: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vault-type">Vault Type</Label>
              <Select
                value={data.vaultType}
                onValueChange={(value: VaultWizardData['vaultType']) => 
                  onUpdate({ vaultType: value })
                }
              >
                <SelectTrigger id="vault-type">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="board_pack">
                    <div className="flex items-center space-x-2">
                      <FolderOpen className="h-4 w-4" />
                      <span>Board Pack</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="document_set">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span>Document Set</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="project">
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4" />
                      <span>Project</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="compliance">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4" />
                      <span>Compliance</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="access-level">Access Level</Label>
              <Select
                value={data.accessLevel}
                onValueChange={(value: VaultWizardData['accessLevel']) => 
                  onUpdate({ accessLevel: value })
                }
              >
                <SelectTrigger id="access-level">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">
                    <div className="flex items-center space-x-2">
                      <Lock className="h-4 w-4" />
                      <span>Private</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="restricted">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4" />
                      <span>Restricted</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="organization">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4" />
                      <span>Organization</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Organization Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span>Organization</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.selectedOrganization ? (
              <div>
                <p className="font-medium text-gray-900">
                  {data.selectedOrganization.name}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Existing organization
                </p>
              </div>
            ) : data.createNewOrganization ? (
              <div>
                <p className="font-medium text-gray-900">
                  {data.createNewOrganization.name}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Will be created
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Not selected</p>
            )}
          </CardContent>
        </Card>

        {/* Assets Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <FileText className="h-4 w-4 text-green-600" />
              <span>Assets</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.selectedAssets.length > 0 ? (
              <div>
                <p className="font-medium text-gray-900">
                  {data.selectedAssets.length} files selected
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {data.selectedAssets.slice(0, 3).map(asset => (
                    <Badge key={asset.id} variant="secondary" className="text-xs">
                      {asset.file_name || 'Untitled'}
                    </Badge>
                  ))}
                  {data.selectedAssets.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{data.selectedAssets.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No assets selected</p>
            )}
          </CardContent>
        </Card>

        {/* BoardMates Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Users className="h-4 w-4 text-purple-600" />
              <span>BoardMates</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.selectedBoardMates.length > 0 || data.newBoardMates.length > 0 ? (
              <div>
                <p className="font-medium text-gray-900">
                  {data.selectedBoardMates.length + data.newBoardMates.length} members
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {data.selectedBoardMates.length > 0 && `${data.selectedBoardMates.length} existing`}
                  {data.selectedBoardMates.length > 0 && data.newBoardMates.length > 0 && ', '}
                  {data.newBoardMates.length > 0 && `${data.newBoardMates.length} new`}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No members added</p>
            )}
          </CardContent>
        </Card>

        {/* Settings Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Shield className="h-4 w-4 text-orange-600" />
              <span>Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {getVaultTypeIcon(data.vaultType)}
                <span className="text-sm text-gray-900 capitalize">
                  {data.vaultType.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {getAccessIcon(data.accessLevel)}
                <span className="text-sm text-gray-900 capitalize">
                  {data.accessLevel} access
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Validation Messages */}
      <div className="space-y-2">
        {!data.vaultName && (
          <div className="flex items-center space-x-2 text-amber-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Vault name is required</span>
          </div>
        )}
        {!data.selectedOrganization && !data.createNewOrganization && (
          <div className="flex items-center space-x-2 text-amber-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Please select or create an organization</span>
          </div>
        )}
        {data.vaultName && (data.selectedOrganization || data.createNewOrganization) && (
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Ready to create vault</span>
          </div>
        )}
      </div>
    </div>
  );
}