'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { 
  FolderOpen, 
  Save, 
  Loader2, 
  Plus, 
  X, 
  HardDrive,
  Shield,
  Zap,
  Droplets,
  Clock,
  Tag
} from 'lucide-react'

interface AssetSettings {
  categories: string[]
  storageLimit: number
  approvalWorkflow: boolean
  aiProcessing: boolean
  defaultPermissions: 'organization' | 'restricted' | 'private'
  watermarking: boolean
  retentionDays: number
  autoClassification: boolean
}

interface AssetSettingsTabProps {
  settings: AssetSettings
  canEdit: boolean
  onUpdate: (settings: { assetSettings: AssetSettings }) => Promise<void>
}

const DEFAULT_CATEGORIES = [
  'Board Documents',
  'Financial Reports',
  'Strategic Plans',
  'Legal Documents',
  'Compliance Reports',
  'Meeting Minutes',
  'Presentations',
  'Policies & Procedures',
  'Contracts',
  'Other'
]

export function AssetSettingsTab({ settings, canEdit, onUpdate }: AssetSettingsTabProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [localSettings, setLocalSettings] = React.useState<AssetSettings>(settings)
  const [newCategory, setNewCategory] = React.useState('')
  const [isDirty, setIsDirty] = React.useState(false)

  React.useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onUpdate({ assetSettings: localSettings })
      setIsDirty(false)
      toast({
        title: 'Asset settings updated',
        description: 'Your asset management settings have been saved successfully.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update asset settings. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateSetting = (key: keyof AssetSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  const addCategory = () => {
    if (newCategory.trim() && !localSettings.categories.includes(newCategory.trim())) {
      updateSetting('categories', [...localSettings.categories, newCategory.trim()])
      setNewCategory('')
    }
  }

  const removeCategory = (category: string) => {
    updateSetting('categories', localSettings.categories.filter(c => c !== category))
  }

  const formatStorageSize = (gb: number) => {
    if (gb >= 1000) {
      return `${(gb / 1000).toFixed(1)} TB`
    }
    return `${gb} GB`
  }

  const formatRetentionDays = (days: number) => {
    if (days === -1) return 'Forever'
    if (days === 0) return 'No retention'
    if (days < 30) return `${days} days`
    if (days < 365) return `${Math.floor(days / 30)} months`
    return `${Math.floor(days / 365)} years`
  }

  return (
    <div className="space-y-6">
      {/* Storage Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage Settings
          </CardTitle>
          <CardDescription>
            Configure storage limits and data management policies.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span>Storage Limit</span>
              <span className="text-sm font-normal text-muted-foreground">
                {formatStorageSize(localSettings.storageLimit)}
              </span>
            </Label>
            <Slider
              value={[localSettings.storageLimit]}
              onValueChange={([value]) => updateSetting('storageLimit', value)}
              min={10}
              max={5000}
              step={10}
              disabled={!canEdit}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10 GB</span>
              <span>5 TB</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Data Retention Period
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {formatRetentionDays(localSettings.retentionDays)}
              </span>
            </Label>
            <Select
              value={String(localSettings.retentionDays)}
              onValueChange={(value) => updateSetting('retentionDays', parseInt(value))}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No retention</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">6 months</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
                <SelectItem value="730">2 years</SelectItem>
                <SelectItem value="1825">5 years</SelectItem>
                <SelectItem value="2555">7 years</SelectItem>
                <SelectItem value="3650">10 years</SelectItem>
                <SelectItem value="-1">Forever</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Document Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Document Categories
          </CardTitle>
          <CardDescription>
            Define categories for organizing and classifying documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {localSettings.categories.map((category) => (
              <Badge key={category} variant="secondary" className="px-3 py-1.5">
                {category}
                {canEdit && (
                  <button
                    onClick={() => removeCategory(category)}
                    className="ml-2 hover:text-red-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
          
          {canEdit && (
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                placeholder="Add new category..."
                className="max-w-xs"
              />
              <Button
                onClick={addCategory}
                variant="outline"
                size="sm"
                disabled={!newCategory.trim()}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Processing & Security
          </CardTitle>
          <CardDescription>
            Configure document processing and security features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>AI Processing</Label>
              <p className="text-sm text-muted-foreground">
                Automatically analyze and extract insights from documents
              </p>
            </div>
            <Switch
              checked={localSettings.aiProcessing}
              onCheckedChange={(checked) => updateSetting('aiProcessing', checked)}
              disabled={!canEdit}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Droplets className="h-4 w-4" />
                Watermarking
              </Label>
              <p className="text-sm text-muted-foreground">
                Add watermarks to downloaded documents
              </p>
            </div>
            <Switch
              checked={localSettings.watermarking}
              onCheckedChange={(checked) => updateSetting('watermarking', checked)}
              disabled={!canEdit}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Classification</Label>
              <p className="text-sm text-muted-foreground">
                Automatically categorize uploaded documents
              </p>
            </div>
            <Switch
              checked={localSettings.autoClassification}
              onCheckedChange={(checked) => updateSetting('autoClassification', checked)}
              disabled={!canEdit}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Approval Workflow</Label>
              <p className="text-sm text-muted-foreground">
                Require approval before documents are published
              </p>
            </div>
            <Switch
              checked={localSettings.approvalWorkflow}
              onCheckedChange={(checked) => updateSetting('approvalWorkflow', checked)}
              disabled={!canEdit}
            />
          </div>
        </CardContent>
      </Card>

      {/* Default Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Default Permissions
          </CardTitle>
          <CardDescription>
            Set default access permissions for new documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={localSettings.defaultPermissions}
            onValueChange={(value: 'organization' | 'restricted' | 'private') => 
              updateSetting('defaultPermissions', value)
            }
            disabled={!canEdit}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="organization">
                <div>
                  <div className="font-medium">Organization</div>
                  <div className="text-xs text-muted-foreground">
                    All organization members can access
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="restricted">
                <div>
                  <div className="font-medium">Restricted</div>
                  <div className="text-xs text-muted-foreground">
                    Only specific members or teams can access
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="private">
                <div>
                  <div className="font-medium">Private</div>
                  <div className="text-xs text-muted-foreground">
                    Only the uploader can access by default
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Save Button */}
      {canEdit && isDirty && (
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="min-w-[150px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Asset Settings
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}