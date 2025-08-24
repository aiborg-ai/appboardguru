/**
 * AnnotationForm - Molecule Component
 * Form for creating new annotations following Atomic Design principles
 */

'use client'

import React, { useState } from 'react'
import { Card } from '@/components/molecules/cards/card'
import { Button } from '@/components/atoms/Button'
import { Textarea } from '@/components/atoms/form/textarea'
import { Badge } from '@/components/atoms/display/badge'
import { Label } from '@/features/shared/ui/label'
import { Checkbox } from '@/components/atoms/form/checkbox'
import { 
  MessageSquare, 
  Edit3, 
  Palette,
  Lock,
  X
} from 'lucide-react'

interface AnnotationFormProps {
  mode: 'highlight' | 'comment' | 'drawing' | 'select'
  currentPage: number
  onSubmit: (data: {
    content: string
    color?: string
    opacity?: number
    isPrivate?: boolean
  }) => Promise<any>
  onCancel: () => void
  isSubmitting: boolean
}

const colorOptions = [
  { name: 'Yellow', value: '#FFFF00', bg: 'bg-yellow-300' },
  { name: 'Blue', value: '#3B82F6', bg: 'bg-blue-300' },
  { name: 'Green', value: '#10B981', bg: 'bg-green-300' },
  { name: 'Red', value: '#EF4444', bg: 'bg-red-300' },
  { name: 'Purple', value: '#8B5CF6', bg: 'bg-purple-300' },
  { name: 'Orange', value: '#F97316', bg: 'bg-orange-300' }
]

export function AnnotationForm({
  mode,
  currentPage,
  onSubmit,
  onCancel,
  isSubmitting
}: AnnotationFormProps) {
  const [content, setContent] = useState('')
  const [selectedColor, setSelectedColor] = useState('#FFFF00')
  const [opacity, setOpacity] = useState(0.3)
  const [isPrivate, setIsPrivate] = useState(false)

  const getModeIcon = () => {
    switch (mode) {
      case 'comment': return <MessageSquare className="h-4 w-4" />
      case 'drawing': return <Edit3 className="h-4 w-4" />
      case 'highlight': return <Palette className="h-4 w-4" />
      default: return <Edit3 className="h-4 w-4" />
    }
  }

  const getModeLabel = () => {
    switch (mode) {
      case 'comment': return 'Add Comment'
      case 'drawing': return 'Add Drawing Note'
      case 'highlight': return 'Add Highlight'
      default: return 'Add Note'
    }
  }

  const getPlaceholder = () => {
    switch (mode) {
      case 'comment': return 'Write your comment here...'
      case 'drawing': return 'Describe your drawing or add notes...'
      case 'highlight': return 'Add notes about this highlight...'
      default: return 'Write your annotation...'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) return

    try {
      await onSubmit({
        content: content.trim(),
        color: selectedColor,
        opacity,
        isPrivate
      })
      
      // Reset form
      setContent('')
      setSelectedColor('#FFFF00')
      setOpacity(0.3)
      setIsPrivate(false)
    } catch (error) {
      console.error('Error creating annotation:', error)
    }
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getModeIcon()}
            <h4 className="text-sm font-medium text-gray-900">
              {getModeLabel()}
            </h4>
            <Badge variant="outline" className="text-xs">
              Page {currentPage}
            </Badge>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content input */}
        <div className="space-y-2">
          <Label htmlFor="annotation-content" className="text-sm font-medium">
            Content
          </Label>
          <Textarea
            id="annotation-content"
            placeholder={getPlaceholder()}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[80px] resize-none"
            disabled={isSubmitting}
          />
        </div>

        {/* Color selection */}
        {(mode === 'highlight' || mode === 'drawing') && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Color</Label>
            <div className="flex items-center space-x-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-6 h-6 rounded-full ${color.bg} border-2 transition-all ${
                    selectedColor === color.value 
                      ? 'border-gray-800 scale-110' 
                      : 'border-gray-300 hover:border-gray-500'
                  }`}
                  title={color.name}
                  disabled={isSubmitting}
                />
              ))}
            </div>
          </div>
        )}

        {/* Opacity slider */}
        {mode === 'highlight' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Opacity: {Math.round(opacity * 100)}%
            </Label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              disabled={isSubmitting}
            />
          </div>
        )}

        {/* Privacy option */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="annotation-private"
            checked={isPrivate}
            onCheckedChange={(checked) => setIsPrivate(checked as boolean)}
            disabled={isSubmitting}
          />
          <Label
            htmlFor="annotation-private"
            className="text-sm font-medium flex items-center space-x-1"
          >
            <Lock className="h-3 w-3" />
            <span>Private annotation</span>
          </Label>
        </div>

        {/* Form actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-gray-600">
            {content.length}/2000 characters
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!content.trim() || isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Annotation'}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  )
}