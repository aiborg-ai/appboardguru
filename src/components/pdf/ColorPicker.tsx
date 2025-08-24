/**
 * ColorPicker Component
 * Color selection for PDF annotations
 */

'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/atoms/Button'
import { Popover, PopoverContent, PopoverTrigger } from '@/features/shared/ui/popover'
import { Palette, Check } from 'lucide-react'

interface Color {
  name: string
  value: string
  bg: string
  text?: string
  border?: string
}

const predefinedColors: Color[] = [
  { name: 'Yellow', value: '#FFFF00', bg: 'bg-yellow-300', border: 'border-yellow-400' },
  { name: 'Green', value: '#10B981', bg: 'bg-green-300', border: 'border-green-400' },
  { name: 'Blue', value: '#3B82F6', bg: 'bg-blue-300', border: 'border-blue-400' },
  { name: 'Purple', value: '#8B5CF6', bg: 'bg-purple-300', border: 'border-purple-400' },
  { name: 'Pink', value: '#EC4899', bg: 'bg-pink-300', border: 'border-pink-400' },
  { name: 'Red', value: '#EF4444', bg: 'bg-red-300', border: 'border-red-400' },
  { name: 'Orange', value: '#F97316', bg: 'bg-orange-300', border: 'border-orange-400' },
  { name: 'Teal', value: '#14B8A6', bg: 'bg-teal-300', border: 'border-teal-400' },
  { name: 'Indigo', value: '#6366F1', bg: 'bg-indigo-300', border: 'border-indigo-400' },
  { name: 'Gray', value: '#6B7280', bg: 'bg-gray-300', border: 'border-gray-400' }
]

interface ColorPickerProps {
  selectedColor: string
  onColorChange: (color: string) => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const ColorPicker = React.memo<ColorPickerProps>(function ColorPicker({
  selectedColor,
  onColorChange,
  className,
  size = 'md'
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [customColor, setCustomColor] = useState(selectedColor)

  const selectedColorInfo = predefinedColors.find(c => c.value === selectedColor) || 
    { name: 'Custom', value: selectedColor, bg: '', border: '' }

  const handleColorSelect = (color: string) => {
    onColorChange(color)
    setIsOpen(false)
  }

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value
    setCustomColor(color)
    onColorChange(color)
  }

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'relative',
            sizeClasses[size],
            className
          )}
        >
          {/* Color preview */}
          <div 
            className="absolute inset-1 rounded border"
            style={{ backgroundColor: selectedColor }}
          />
          
          {/* Palette icon for fallback */}
          {!selectedColor && <Palette className="h-3 w-3" />}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-64 p-4" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-3">Color</h4>
            
            {/* Predefined colors grid */}
            <div className="grid grid-cols-5 gap-2">
              {predefinedColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleColorSelect(color.value)}
                  className={cn(
                    'w-8 h-8 rounded border-2 transition-all relative',
                    color.bg,
                    color.border,
                    selectedColor === color.value 
                      ? 'ring-2 ring-blue-500 ring-offset-1' 
                      : 'hover:ring-1 hover:ring-gray-300'
                  )}
                  title={color.name}
                >
                  {selectedColor === color.value && (
                    <Check className="h-4 w-4 absolute inset-0 m-auto text-white drop-shadow-sm" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom color input */}
          <div>
            <label className="text-sm font-medium mb-2 block">Custom Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value)
                  if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                    onColorChange(e.target.value)
                  }
                }}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                placeholder="#FFFFFF"
              />
            </div>
          </div>

          {/* Opacity slider */}
          <div>
            <label className="text-sm font-medium mb-2 block">Preview</label>
            <div className="relative">
              <div 
                className="w-full h-8 rounded border border-gray-300"
                style={{
                  background: `linear-gradient(45deg, 
                    ${selectedColor}40 25%, transparent 25%, transparent 75%, 
                    ${selectedColor}40 75%, ${selectedColor}40), 
                    linear-gradient(45deg, 
                    ${selectedColor}40 25%, transparent 25%, transparent 75%, 
                    ${selectedColor}40 75%, ${selectedColor}40)`,
                  backgroundSize: '8px 8px',
                  backgroundPosition: '0 0, 4px 4px'
                }}
              >
                <div 
                  className="w-full h-full rounded"
                  style={{ backgroundColor: selectedColor + '80' }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1 text-center">
                {selectedColorInfo.name} ({selectedColor})
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
})

ColorPicker.displayName = 'ColorPicker'