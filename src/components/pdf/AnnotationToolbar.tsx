/**
 * AnnotationToolbar Component
 * Floating toolbar for PDF annotation tools
 */

'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/atoms/Button'
import { Separator } from '@/components/atoms/display/separator'
import { 
  MousePointer,
  Highlighter,
  MessageSquare,
  Edit3,
  Square,
  Circle,
  ArrowRight,
  Type,
  Palette,
  Eraser,
  Undo2,
  Redo2,
  Mic,
  Scan
} from 'lucide-react'
import { AnnotationType } from '@/types/annotation-types'

interface AnnotationToolbarProps {
  currentMode: AnnotationType | 'select'
  onModeChange: (mode: AnnotationType | 'select') => void
  onUndo?: () => void
  onRedo?: () => void
  onClearAll?: () => void
  onOCRExtract?: () => void
  canUndo?: boolean
  canRedo?: boolean
  className?: string
  isVisible?: boolean
}

const annotationTools = [
  {
    id: 'select' as const,
    label: 'Select',
    icon: MousePointer,
    shortcut: 'V'
  },
  {
    id: 'highlight' as const,
    label: 'Highlight',
    icon: Highlighter,
    shortcut: 'H'
  },
  {
    id: 'textbox' as const,
    label: 'Text Note',
    icon: MessageSquare,
    shortcut: 'T'
  },
  {
    id: 'drawing' as const,
    label: 'Drawing',
    icon: Edit3,
    shortcut: 'D'
  },
  {
    id: 'area' as const,
    label: 'Area',
    icon: Square,
    shortcut: 'A'
  },
  {
    id: 'stamp' as const,
    label: 'Stamp',
    icon: Circle,
    shortcut: 'S'
  },
  {
    id: 'voice' as const,
    label: 'Voice Note',
    icon: Mic,
    shortcut: 'M'
  }
]

export const AnnotationToolbar = React.memo<AnnotationToolbarProps>(function AnnotationToolbar({
  currentMode,
  onModeChange,
  onUndo,
  onRedo,
  onClearAll,
  onOCRExtract,
  canUndo = false,
  canRedo = false,
  className,
  isVisible = true
}) {
  if (!isVisible) return null

  const handleModeChange = (mode: AnnotationType | 'select') => {
    onModeChange(mode)
  }

  return (
    <div 
      className={cn(
        'fixed top-1/2 left-4 transform -translate-y-1/2 z-50',
        'bg-white rounded-lg shadow-lg border border-gray-200 p-2',
        'flex flex-col space-y-1',
        'animate-in fade-in-0 slide-in-from-left-2',
        className
      )}
    >
      {/* Main annotation tools */}
      <div className="flex flex-col space-y-1">
        {annotationTools.map((tool) => {
          const Icon = tool.icon
          const isActive = currentMode === tool.id
          
          return (
            <Button
              key={tool.id}
              size="sm"
              variant={isActive ? 'default' : 'ghost'}
              onClick={() => handleModeChange(tool.id)}
              className={cn(
                'w-10 h-10 p-0 relative group',
                isActive && 'bg-blue-600 text-white hover:bg-blue-700'
              )}
              title={`${tool.label} (${tool.shortcut})`}
            >
              <Icon className="h-4 w-4" />
              
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {tool.label}
                <kbd className="ml-2 px-1 py-0.5 bg-gray-700 rounded text-xs">
                  {tool.shortcut}
                </kbd>
              </div>
            </Button>
          )
        })}
      </div>

      <Separator className="my-2" />

      {/* Action tools */}
      <div className="flex flex-col space-y-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={onUndo}
          disabled={!canUndo}
          className="w-10 h-10 p-0 relative group"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
          
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            Undo
            <kbd className="ml-2 px-1 py-0.5 bg-gray-700 rounded text-xs">
              Ctrl+Z
            </kbd>
          </div>
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={onRedo}
          disabled={!canRedo}
          className="w-10 h-10 p-0 relative group"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="h-4 w-4" />
          
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            Redo
            <kbd className="ml-2 px-1 py-0.5 bg-gray-700 rounded text-xs">
              Ctrl+Y
            </kbd>
          </div>
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={onClearAll}
          className="w-10 h-10 p-0 relative group text-red-500 hover:text-red-700"
          title="Clear All Annotations"
        >
          <Eraser className="h-4 w-4" />
          
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            Clear All
          </div>
        </Button>
      </div>

      <Separator className="my-2" />

      {/* Advanced tools */}
      <div className="flex flex-col space-y-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={onOCRExtract}
          className="w-10 h-10 p-0 relative group text-purple-600 hover:text-purple-800"
          title="OCR Text Extract"
        >
          <Scan className="h-4 w-4" />
          
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            OCR Extract
            <kbd className="ml-2 px-1 py-0.5 bg-gray-700 rounded text-xs">
              O
            </kbd>
          </div>
        </Button>
      </div>
    </div>
  )
})

AnnotationToolbar.displayName = 'AnnotationToolbar'