'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Tag,
  X,
  Save,
  Loader2
} from 'lucide-react'

interface GeneralSettingsTabProps {
  vault: {
    id: string
    name: string
    description?: string
    meetingDate?: string
    location?: string
    status: string
    priority: string
    category?: string
    tags?: string[]
  }
  canEdit: boolean
  onUpdate: (updates: any) => Promise<void>
  isSaving: boolean
  onChangeDetected: () => void
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
]

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'archived', label: 'Archived', color: 'bg-blue-100 text-blue-800' },
  { value: 'expired', label: 'Expired', color: 'bg-red-100 text-red-800' }
]

const CATEGORY_OPTIONS = [
  'Board Meetings',
  'Annual Reports',
  'Financial Documents',
  'Legal Documents',
  'Strategic Planning',
  'Compliance',
  'Policies',
  'Other'
]

export function GeneralSettingsTab({
  vault,
  canEdit,
  onUpdate,
  isSaving,
  onChangeDetected
}: GeneralSettingsTabProps) {
  const [formData, setFormData] = useState({
    name: vault.name || '',
    description: vault.description || '',
    meetingDate: vault.meetingDate ? new Date(vault.meetingDate) : undefined,
    location: vault.location || '',
    status: vault.status || 'active',
    priority: vault.priority || 'medium',
    category: vault.category || '',
    tags: vault.tags || []
  })
  const [tagInput, setTagInput] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  // Detect changes
  useEffect(() => {
    const changed = 
      formData.name !== vault.name ||
      formData.description !== (vault.description || '') ||
      formData.location !== (vault.location || '') ||
      formData.status !== vault.status ||
      formData.priority !== vault.priority ||
      formData.category !== (vault.category || '') ||
      JSON.stringify(formData.tags) !== JSON.stringify(vault.tags || []) ||
      (formData.meetingDate?.toISOString() !== vault.meetingDate && 
       !(formData.meetingDate === undefined && !vault.meetingDate))
    
    if (changed && !hasChanges) {
      setHasChanges(true)
      onChangeDetected()
    }
  }, [formData, vault, hasChanges, onChangeDetected])

  const handleInputChange = (field: string, value: any) => {
    if (!canEdit) return
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddTag = () => {
    if (!canEdit || !tagInput.trim()) return
    
    const newTag = tagInput.trim().toLowerCase()
    if (!formData.tags.includes(newTag)) {
      handleInputChange('tags', [...formData.tags, newTag])
    }
    setTagInput('')
  }

  const handleRemoveTag = (tagToRemove: string) => {
    if (!canEdit) return
    handleInputChange('tags', formData.tags.filter(tag => tag !== tagToRemove))
  }

  const handleSave = async () => {
    if (!canEdit || !hasChanges) return

    const updates: any = {}
    
    if (formData.name !== vault.name) updates.name = formData.name
    if (formData.description !== vault.description) updates.description = formData.description
    if (formData.location !== vault.location) updates.location = formData.location
    if (formData.status !== vault.status) updates.status = formData.status
    if (formData.priority !== vault.priority) updates.priority = formData.priority
    if (formData.category !== vault.category) updates.category = formData.category
    if (JSON.stringify(formData.tags) !== JSON.stringify(vault.tags)) updates.tags = formData.tags
    if (formData.meetingDate?.toISOString() !== vault.meetingDate) {
      updates.meetingDate = formData.meetingDate?.toISOString()
    }

    await onUpdate(updates)
    setHasChanges(false)
  }

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>
        
        <div className="space-y-2">
          <Label htmlFor="vault-name">Vault Name</Label>
          <Input
            id="vault-name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            disabled={!canEdit}
            placeholder="Enter vault name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="vault-description">Description</Label>
          <Textarea
            id="vault-description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            disabled={!canEdit}
            placeholder="Enter vault description"
            rows={4}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Meeting Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.meetingDate && "text-muted-foreground"
                  )}
                  disabled={!canEdit}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.meetingDate ? format(formData.meetingDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              {canEdit && (
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.meetingDate}
                    onSelect={(date) => handleInputChange('meetingDate', date)}
                    initialFocus
                  />
                </PopoverContent>
              )}
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vault-location">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="vault-location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                disabled={!canEdit}
                placeholder="Enter location"
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status and Priority */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Status & Priority</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange('status', value)}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-xs", option.color)}>
                        {option.label}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => handleInputChange('priority', value)}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-xs", option.color)}>
                        {option.label}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Category and Tags */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Organization</h3>
        
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => handleInputChange('category', value)}
            disabled={!canEdit}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              disabled={!canEdit}
              placeholder="Add a tag..."
              className="flex-1"
            />
            <Button
              type="button"
              onClick={handleAddTag}
              disabled={!canEdit || !tagInput.trim()}
              size="icon"
            >
              <Tag className="h-4 w-4" />
            </Button>
          </div>
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  {canEdit && (
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-red-500"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  )}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      {canEdit && hasChanges && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}