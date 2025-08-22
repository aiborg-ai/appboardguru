'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Input } from '@/features/shared/ui/input';
import { Label } from '@/features/shared/ui/label';
import { Textarea } from '@/features/shared/ui/textarea';
import { Switch } from '@/features/shared/ui/switch';
import { Badge } from '@/features/shared/ui/badge';
import { Separator } from '@/features/shared/ui/separator';
import { 
  Share2, 
  Save,
  Vault,
  FileText,
  Mail,
  Link,
  Download,
  Check,
  Users,
  FolderOpen,
  Plus,
  Settings,
  Eye,
  Globe,
  Lock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InstrumentPlayWizardData } from '../InstrumentPlayWizard';

interface ActionsStepProps {
  data: InstrumentPlayWizardData;
  onUpdate: (updates: Partial<InstrumentPlayWizardData>) => void;
}

// Mock vault data - in real implementation, this would come from API
const MOCK_VAULTS = [
  { id: '1', name: 'Board Pack Q4 2024', description: 'Quarterly board materials' },
  { id: '2', name: 'Risk Assessment 2024', description: 'Annual risk analysis documents' },
  { id: '3', name: 'Compliance Reports', description: 'Regulatory compliance documentation' }
];

export default function ActionsStep({ data, onUpdate }: ActionsStepProps) {
  const [emailRecipients, setEmailRecipients] = useState<string>('');
  const [newVaultName, setNewVaultName] = useState('');
  const [customAssetName, setCustomAssetName] = useState('');
  const [selectedExistingVault, setSelectedExistingVault] = useState<string>('');

  const analysisResults = data.analysisResults;
  const saveOptions = data.saveOptions;

  // Handle save option updates
  const updateSaveOptions = useCallback((
    category: keyof typeof saveOptions,
    updates: Partial<typeof saveOptions[keyof typeof saveOptions]>
  ) => {
    const newSaveOptions = {
      ...saveOptions,
      [category]: {
        ...saveOptions[category],
        ...updates
      }
    };
    onUpdate({ saveOptions: newSaveOptions });
  }, [saveOptions, onUpdate]);

  // Handle vault selection
  const handleVaultSelection = useCallback((type: 'existing' | 'new', value: string) => {
    if (type === 'existing') {
      setSelectedExistingVault(value);
      updateSaveOptions('saveToVault', {
        enabled: true,
        vaultId: value,
        createNewVault: false
      });
    } else {
      setNewVaultName(value);
      updateSaveOptions('saveToVault', {
        enabled: true,
        createNewVault: true,
        vaultName: value
      });
    }
  }, [updateSaveOptions]);

  // Handle asset name change
  const handleAssetNameChange = useCallback((name: string) => {
    setCustomAssetName(name);
    updateSaveOptions('saveAsAsset', {
      assetName: name
    });
  }, [updateSaveOptions]);

  // Handle email recipients
  const handleEmailRecipientsChange = useCallback((emails: string) => {
    setEmailRecipients(emails);
    const emailList = emails.split(',').map(email => email.trim()).filter(Boolean);
    updateSaveOptions('shareOptions', {
      emailRecipients: emailList
    });
  }, [updateSaveOptions]);

  // Check if we have valid options selected
  const hasValidSaveOptions = saveOptions.saveAsAsset.enabled || 
                             saveOptions.saveToVault.enabled || 
                             saveOptions.shareOptions.enabled;

  const defaultAssetName = `${data.selectedGoal?.title || 'Analysis'} Results - ${new Date().toLocaleDateString()}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Share2 className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Save & Share Results
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Choose how to save and share your analysis insights
        </p>
      </div>

      {/* Analysis Summary */}
      {analysisResults && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-900">
              <CheckCircle2 className="w-5 h-5" />
              <span>Analysis Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-700">
                  {analysisResults.insights.length}
                </div>
                <div className="text-sm text-blue-600">Insights</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-700">
                  {analysisResults.charts.length}
                </div>
                <div className="text-sm text-blue-600">Charts</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-700">
                  {analysisResults.recommendations.length}
                </div>
                <div className="text-sm text-blue-600">Recommendations</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-700">
                  {Math.round((analysisResults.metadata.confidence || 0) * 100)}%
                </div>
                <div className="text-sm text-blue-600">Confidence</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Options */}
      <div className="space-y-4">
        {/* Save to Vault */}
        <Card className={cn(
          "transition-all duration-200",
          saveOptions.saveToVault.enabled && "ring-2 ring-green-500 bg-green-50"
        )}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Vault className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Save to Vault</CardTitle>
                  <p className="text-sm text-gray-600">Store results in a secure vault for team collaboration</p>
                </div>
              </div>
              <Switch
                checked={saveOptions.saveToVault.enabled}
                onCheckedChange={(enabled) => updateSaveOptions('saveToVault', { enabled })}
              />
            </div>
          </CardHeader>
          
          {saveOptions.saveToVault.enabled && (
            <CardContent className="pt-0">
              <div className="space-y-4">
                {/* Existing Vaults */}
                <div>
                  <Label className="text-sm font-medium">Select Existing Vault</Label>
                  <div className="mt-2 space-y-2">
                    {MOCK_VAULTS.map((vault) => (
                      <div 
                        key={vault.id}
                        className={cn(
                          "p-3 border rounded-lg cursor-pointer transition-colors",
                          selectedExistingVault === vault.id 
                            ? "border-green-500 bg-green-50" 
                            : "border-gray-200 hover:border-gray-300"
                        )}
                        onClick={() => handleVaultSelection('existing', vault.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{vault.name}</div>
                            <div className="text-sm text-gray-500">{vault.description}</div>
                          </div>
                          {selectedExistingVault === vault.id && (
                            <Check className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span>or</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Create New Vault */}
                <div>
                  <Label htmlFor="new-vault-name" className="text-sm font-medium">Create New Vault</Label>
                  <Input
                    id="new-vault-name"
                    placeholder="Enter vault name"
                    value={newVaultName}
                    onChange={(e) => handleVaultSelection('new', e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Save as Asset */}
        <Card className={cn(
          "transition-all duration-200",
          saveOptions.saveAsAsset.enabled && "ring-2 ring-blue-500 bg-blue-50"
        )}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Save as Asset</CardTitle>
                  <p className="text-sm text-gray-600">Add results to your personal asset library</p>
                </div>
              </div>
              <Switch
                checked={saveOptions.saveAsAsset.enabled}
                onCheckedChange={(enabled) => updateSaveOptions('saveAsAsset', { enabled })}
              />
            </div>
          </CardHeader>
          
          {saveOptions.saveAsAsset.enabled && (
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="asset-name" className="text-sm font-medium">Asset Name</Label>
                  <Input
                    id="asset-name"
                    placeholder={defaultAssetName}
                    value={customAssetName}
                    onChange={(e) => handleAssetNameChange(e.target.value)}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave blank to use default: "{defaultAssetName}"
                  </p>
                </div>

                {/* Asset Options */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Include Charts</Label>
                      <p className="text-xs text-gray-500">Export visualizations as images</p>
                    </div>
                    <Switch
                      checked={saveOptions.saveAsAsset.includeCharts ?? true}
                      onCheckedChange={(includeCharts) => updateSaveOptions('saveAsAsset', { includeCharts })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Include Raw Data</Label>
                      <p className="text-xs text-gray-500">Include underlying data tables</p>
                    </div>
                    <Switch
                      checked={saveOptions.saveAsAsset.includeRawData ?? false}
                      onCheckedChange={(includeRawData) => updateSaveOptions('saveAsAsset', { includeRawData })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Share Options */}
        <Card className={cn(
          "transition-all duration-200",
          saveOptions.shareOptions.enabled && "ring-2 ring-orange-500 bg-orange-50"
        )}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Share Results</CardTitle>
                  <p className="text-sm text-gray-600">Share insights with board mates or external stakeholders</p>
                </div>
              </div>
              <Switch
                checked={saveOptions.shareOptions.enabled}
                onCheckedChange={(enabled) => updateSaveOptions('shareOptions', { enabled })}
              />
            </div>
          </CardHeader>
          
          {saveOptions.shareOptions.enabled && (
            <CardContent className="pt-0">
              <div className="space-y-4">
                {/* Share with BoardMates */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Share with BoardMates</Label>
                    <p className="text-xs text-gray-500">Notify all members of your organization</p>
                  </div>
                  <Switch
                    checked={saveOptions.shareOptions.shareWithBoardMates ?? false}
                    onCheckedChange={(shareWithBoardMates) => 
                      updateSaveOptions('shareOptions', { shareWithBoardMates })
                    }
                  />
                </div>

                {/* Generate Public Link */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Generate Public Link</Label>
                    <p className="text-xs text-gray-500">Create a shareable link for external access</p>
                  </div>
                  <Switch
                    checked={saveOptions.shareOptions.generatePublicLink ?? false}
                    onCheckedChange={(generatePublicLink) => 
                      updateSaveOptions('shareOptions', { generatePublicLink })
                    }
                  />
                </div>

                {/* Custom Email Recipients */}
                <div>
                  <Label htmlFor="email-recipients" className="text-sm font-medium">Email Recipients</Label>
                  <Textarea
                    id="email-recipients"
                    placeholder="Enter email addresses separated by commas"
                    value={emailRecipients}
                    onChange={(e) => handleEmailRecipientsChange(e.target.value)}
                    className="mt-2"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {saveOptions.shareOptions.emailRecipients?.length || 0} recipients added
                  </p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="w-5 h-5 text-gray-600" />
            <span>Export Options</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <Switch
                id="export-pdf"
                checked={saveOptions.exportOptions.pdf ?? true}
                onCheckedChange={(pdf) => 
                  onUpdate({ 
                    saveOptions: { 
                      ...saveOptions, 
                      exportOptions: { ...saveOptions.exportOptions, pdf }
                    }
                  })
                }
              />
              <Label htmlFor="export-pdf" className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-red-500" />
                <span>PDF Report</span>
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <Switch
                id="export-excel"
                checked={saveOptions.exportOptions.excel ?? false}
                onCheckedChange={(excel) => 
                  onUpdate({ 
                    saveOptions: { 
                      ...saveOptions, 
                      exportOptions: { ...saveOptions.exportOptions, excel }
                    }
                  })
                }
              />
              <Label htmlFor="export-excel" className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-green-500" />
                <span>Excel Data</span>
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Switch
                id="export-ppt"
                checked={saveOptions.exportOptions.powerpoint ?? false}
                onCheckedChange={(powerpoint) => 
                  onUpdate({ 
                    saveOptions: { 
                      ...saveOptions, 
                      exportOptions: { ...saveOptions.exportOptions, powerpoint }
                    }
                  })
                }
              />
              <Label htmlFor="export-ppt" className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-orange-500" />
                <span>PowerPoint</span>
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className={cn(
        "border-2",
        hasValidSaveOptions ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"
      )}>
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            {hasValidSaveOptions ? (
              <CheckCircle2 className="w-6 h-6 text-green-600 mt-1" />
            ) : (
              <AlertCircle className="w-6 h-6 text-yellow-600 mt-1" />
            )}
            <div>
              <h4 className={cn(
                "font-medium mb-2",
                hasValidSaveOptions ? "text-green-800" : "text-yellow-800"
              )}>
                {hasValidSaveOptions ? "Ready to Save & Share" : "Please Select Save Options"}
              </h4>
              <div className={cn(
                "text-sm space-y-1",
                hasValidSaveOptions ? "text-green-700" : "text-yellow-700"
              )}>
                {saveOptions.saveToVault.enabled && (
                  <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4" />
                    <span>
                      Will save to {saveOptions.saveToVault.createNewVault ? 'new' : 'existing'} vault
                      {saveOptions.saveToVault.vaultName && `: "${saveOptions.saveToVault.vaultName}"`}
                    </span>
                  </div>
                )}
                {saveOptions.saveAsAsset.enabled && (
                  <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4" />
                    <span>
                      Will save as asset: "{customAssetName || defaultAssetName}"
                    </span>
                  </div>
                )}
                {saveOptions.shareOptions.enabled && (
                  <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4" />
                    <span>
                      Will share with {
                        (saveOptions.shareOptions.emailRecipients?.length || 0) +
                        (saveOptions.shareOptions.shareWithBoardMates ? 1 : 0) +
                        (saveOptions.shareOptions.generatePublicLink ? 1 : 0)
                      } target(s)
                    </span>
                  </div>
                )}
                {Object.values(saveOptions.exportOptions).some(Boolean) && (
                  <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4" />
                    <span>
                      Will export in {
                        Object.entries(saveOptions.exportOptions).filter(([_, enabled]) => enabled).length
                      } format(s)
                    </span>
                  </div>
                )}
                {!hasValidSaveOptions && (
                  <p>Please select at least one save or share option above to continue.</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}