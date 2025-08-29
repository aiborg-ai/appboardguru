'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { ProgressUpdateProps } from '../types'
import { ProgressBar } from '../atoms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Save, 
  Edit, 
  X, 
  Plus, 
  Minus,
  RotateCcw,
  CheckCircle
} from 'lucide-react'

/**
 * ProgressUpdate - Molecular component for updating actionable progress
 * 
 * Features:
 * - Interactive progress bar with manual input
 * - Quick increment/decrement buttons
 * - Optional notes and comments
 * - Validation and error handling
 * - Accessible form controls
 */
export const ProgressUpdate: React.FC<ProgressUpdateProps> = ({
  value,
  max = 100,
  editable = true,
  onUpdate,
  status,
  showControls = true,
  notes = '',
  onNotesChange,
  className,
  'data-testid': testId,
  ...props
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState(value)
  const [tempNotes, setTempNotes] = useState(notes)
  const [isSaving, setIsSaving] = useState(false)
  
  const handleStartEdit = () => {
    setTempValue(value)
    setTempNotes(notes)
    setIsEditing(true)
  }
  
  const handleCancel = () => {
    setTempValue(value)
    setTempNotes(notes)
    setIsEditing(false)
  }
  
  const handleSave = async () => {
    if (!onUpdate) return
    
    setIsSaving(true)
    try {
      await onUpdate(tempValue)
      if (onNotesChange && tempNotes !== notes) {
        onNotesChange(tempNotes)
      }
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update progress:', error)
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleQuickUpdate = async (increment: number) => {
    const newValue = Math.min(Math.max(value + increment, 0), max)
    if (onUpdate && newValue !== value) {
      try {
        await onUpdate(newValue)
      } catch (error) {
        console.error('Failed to update progress:', error)
      }
    }
  }
  
  const handleValueChange = (newValue: string) => {
    const numericValue = parseInt(newValue, 10)
    if (!isNaN(numericValue)) {
      setTempValue(Math.min(Math.max(numericValue, 0), max))
    }
  }
  
  const percentage = (value / max) * 100
  
  if (!editable || !showControls) {
    return (
      <div
        className={cn('space-y-2', className)}
        data-testid={testId || 'progress-update-readonly'}
        {...props}
      >
        <ProgressBar
          value={value}
          max={max}
          status={status}
          showLabel
          animated
        />
        {notes && (
          <div className="p-2 bg-gray-50 rounded text-sm text-gray-600">
            {notes}
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div
      className={cn('space-y-4', className)}
      data-testid={testId || 'progress-update'}
      {...props}
    >
      {/* Progress bar */}
      <div className="space-y-2">
        <ProgressBar
          value={isEditing ? tempValue : value}
          max={max}
          status={status}
          showLabel
          animated={!isEditing}
        />
        
        {/* Current status */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Progress: {Math.round(percentage)}%</span>
          {value === max && (
            <div className="flex items-center space-x-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Complete</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Edit mode */}
      {isEditing ? (
        <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Progress Value
            </label>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                min={0}
                max={max}
                value={tempValue}
                onChange={(e) => handleValueChange(e.target.value)}
                className="w-20"
                aria-label="Progress value"
              />
              <span className="text-sm text-gray-500">/ {max}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTempValue(max)}
                disabled={tempValue === max}
                aria-label="Set to complete"
              >
                Complete
              </Button>
            </div>
          </div>
          
          {onNotesChange && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Progress Notes
              </label>
              <Textarea
                value={tempNotes}
                onChange={(e) => setTempNotes(e.target.value)}
                placeholder="Add notes about your progress..."
                rows={3}
                className="resize-none"
                aria-label="Progress notes"
              />
            </div>
          )}
          
          <div className="flex items-center justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
              aria-label="Cancel progress update"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              size="sm"
              disabled={isSaving || tempValue === value}
              aria-label="Save progress update"
            >
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      ) : (
        /* View mode with quick controls */
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Quick increment/decrement */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickUpdate(-10)}
              disabled={value <= 0}
              aria-label="Decrease progress by 10%"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickUpdate(10)}
              disabled={value >= max}
              aria-label="Increase progress by 10%"
            >
              <Plus className="h-4 w-4" />
            </Button>
            
            {value > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickUpdate(-value)}
                aria-label="Reset progress to 0%"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartEdit}
            aria-label="Edit progress details"
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>
      )}
      
      {/* Display notes when not editing */}
      {!isEditing && notes && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 font-medium mb-1">Latest Update:</p>
          <p className="text-sm text-gray-700">{notes}</p>
        </div>
      )}
    </div>
  )
}

ProgressUpdate.displayName = 'ProgressUpdate'